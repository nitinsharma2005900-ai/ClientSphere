import { db } from '../../db/client';
import { TriggerType } from '@clientsphere/shared-types';
import crypto from 'crypto';

export interface WorkflowContext {
  organizationId: string; triggerEvent: `${TriggerType}`;
  entityType: 'LEAD' | 'OPPORTUNITY' | 'TASK' | 'CONTACT';
  entityId: string; entityData: Record<string, any>; userId?: string;
  recursionDepth?: number; eventId?: string; workflowId?: string;
}

export class WorkflowEngine {
  static async evaluateAndTrigger(context: WorkflowContext, client: any = db) {
    if ((context.recursionDepth || 0) >= 5) return { halted: true, reason: 'MAX_RECURSION_DEPTH_EXCEEDED' };
    const workflows = await client.workflow.findMany({ where: {
      organizationId: context.organizationId, triggerType: context.triggerEvent,
      isActive: true, ...(context.workflowId ? { id: context.workflowId } : {}),
    } });
    const results = [];
    for (const workflow of workflows) {
      if (!this.evaluateConditions(workflow.conditions, context.entityData)) continue;
      // A stable event identifier and a unique database key survive process restarts.
      const key = crypto.createHash('sha256').update(`${workflow.id}:${context.eventId || context.entityId + ':' + context.triggerEvent + ':' + (context.entityData.updatedAt || context.entityData.createdAt || '')}`).digest('hex');
      const delay = Math.min(604800, Math.max(0, Number(workflow.triggerConfig?.delaySeconds || 0)));
      const execution = await client.workflowExecution.upsert({ where: { idempotencyKey: key }, update: {}, create: {
        workflowId: workflow.id, triggerEvent: context.triggerEvent, entityType: context.entityType,
        entityId: context.entityId, organizationId: context.organizationId,
        context: JSON.parse(JSON.stringify(context)), status: 'QUEUED', idempotencyKey: key,
        availableAt: new Date(Date.now() + delay * 1000),
      } });
      results.push(execution);
    }
    return results;
  }

  static evaluateConditions(conditions: any, data: Record<string, any>): boolean {
    if (!Array.isArray(conditions)) return false;
    return conditions.every((condition: any) => {
      const value = data[condition.field];
      switch (condition.operator) {
        case 'EQUALS': return String(value).toLowerCase() === String(condition.value).toLowerCase();
        case 'NOT_EQUALS': return String(value).toLowerCase() !== String(condition.value).toLowerCase();
        case 'GREATER_THAN': return Number(value) > Number(condition.value);
        case 'LESS_THAN': return Number(value) < Number(condition.value);
        case 'CONTAINS': return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        default: return false;
      }
    });
  }

  static async execute(executionId: string) {
    const start = Date.now();
    return db.$transaction(async (tx: any) => {
      // Serialize delivery of the same job, including recovery after a worker crash.
      await tx.$queryRaw`SELECT id FROM workflow_executions WHERE id = ${executionId} FOR UPDATE`;
      const execution = await tx.workflowExecution.findUnique({ where: { id: executionId }, include: { workflow: true } });
      if (!execution || execution.status === 'COMPLETED') return;
      const context = execution.context as WorkflowContext;
      const model = ({ LEAD: 'lead', OPPORTUNITY: 'opportunity', TASK: 'task', CONTACT: 'contact' } as const)[context.entityType];
      const entity = await tx[model].findFirst({ where: { id: context.entityId, organizationId: context.organizationId } });
      if (!entity) throw new Error('Workflow target no longer exists in this organization');
      const actor = await tx.user.findFirst({ where: { organizationId: context.organizationId, ...(context.userId ? { id: context.userId } : { role: 'ADMINISTRATOR' }) } });
      if (!actor) throw new Error('Workflow actor is unavailable');
      const logs = [];
      for (const action of execution.workflow.actions as any[]) {
        const params = action.params || {};
        const refs = { leadId: model === 'lead' ? entity.id : null, opportunityId: model === 'opportunity' ? entity.id : null, contactId: model === 'contact' ? entity.id : null };
        if (action.type === 'CREATE_TASK') {
          const assignee = params.assignedToId || actor.id;
          if (!await tx.user.findFirst({ where: { id: assignee, organizationId: context.organizationId } })) throw new Error('Task assignee is outside this organization');
          await tx.task.create({ data: { ...refs, title: params.title || 'Automated follow-up', description: params.description, priority: params.priority || 'HIGH', organizationId: context.organizationId, assignedToId: assignee } });
        } else if (['SEND_EMAIL', 'CREATE_ACTIVITY'].includes(action.type)) {
          await tx.activity.create({ data: { ...refs, type: action.type === 'SEND_EMAIL' ? 'EMAIL' : 'NOTE', subject: params.subject || 'Automated follow-up', description: params.body || params.description || '', userId: actor.id, organizationId: context.organizationId, metadata: { sandbox: true, recipient: entity.email || null } } });
        } else if (action.type === 'ASSIGN_OWNER') {
          if (!['lead', 'contact', 'opportunity'].includes(model)) throw new Error('Ownership action unsupported for this entity');
          if (!await tx.user.findFirst({ where: { id: params.ownerId, organizationId: context.organizationId } })) throw new Error('Invalid workflow owner');
          await tx[model].update({ where: { id: entity.id }, data: { ownerId: params.ownerId } });
        } else if (action.type === 'UPDATE_FIELD') {
          const allowed: Record<string, string[]> = { lead: ['status', 'jobTitle', 'companyName'], opportunity: ['winLossReason'], task: ['priority', 'status'], contact: [] };
          if (!allowed[model].includes(params.field)) throw new Error('Workflow field is not writable');
          await tx[model].update({ where: { id: entity.id }, data: { [params.field]: params.value } });
        } else throw new Error('Unsupported workflow action');
        logs.push({ action: action.type, status: 'SUCCESS', timestamp: new Date().toISOString() });
      }
      return tx.workflowExecution.update({ where: { id: executionId }, data: { status: 'COMPLETED', stepLogs: logs, error: null, executionTimeMs: Date.now() - start } });
    }, { timeout: 15000 });
  }
}
