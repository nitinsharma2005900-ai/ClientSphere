import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors';

const models: Record<string, string> = {
  leads: 'lead', contacts: 'contact', companies: 'company', opportunities: 'opportunity',
  tasks: 'task', activities: 'activity', pipelines: 'pipeline', workflows: 'workflow',
};

export async function checkRecord(req: Request, model: string, id: string, write = false) {
  const record = await (db as any)[model].findFirst({ where: { id, organizationId: req.user!.organizationId } });
  if (!record) throw new NotFoundError(model, id);
  if (req.user!.role === 'SALES_REPRESENTATIVE') {
    let allowed = true;
    if (['lead', 'contact', 'company'].includes(model)) {
      allowed = record.ownerId === req.user!.id;
      if (!allowed && !write && ['contact', 'company'].includes(model)) allowed = !!await db.opportunity.count({ where: { organizationId: req.user!.organizationId, ...(model === 'company' ? { companyId: id } : { primaryContactId: id }), OR: [{ ownerId: req.user!.id }, { teamMembers: { some: { userId: req.user!.id } } }] } });
    }
    if (model === 'task') allowed = record.assignedToId === req.user!.id;
    if (model === 'activity') allowed = record.userId === req.user!.id;
    if (model === 'opportunity' && record.ownerId !== req.user!.id) {
      const member = await db.opportunityMember.findUnique({ where: { opportunityId_userId: { opportunityId: id, userId: req.user!.id } } });
      allowed = !!member && (!write || member.canEdit);
    }
    if (!allowed) throw new ForbiddenError('This record is not shared with your account for this operation.');
  }
  return record;
}

export async function enforcePolicy(req: Request, res: Response, next: NextFunction) {
  try {
    const [resource, id, operation] = req.path.split('/').filter(Boolean);
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const role = req.user!.role;
    if (write) {
      if (role === 'SUPPORT_USER' && !['activities', 'tasks', 'integrations'].includes(resource)) throw new ForbiddenError('Support users can manage activities and tasks.');
      if (role === 'MARKETING_USER' && !['leads', 'contacts', 'companies', 'imports', 'integrations', 'activities', 'tasks'].includes(resource)) throw new ForbiddenError('Marketing users cannot modify sales configuration or deals.');
      if (['workflows', 'pipelines'].includes(resource) && !['ADMINISTRATOR', 'SALES_MANAGER'].includes(role)) throw new ForbiddenError('Manager access is required.');
      if (resource === 'opportunities' && operation === 'members' && role === 'SALES_REPRESENTATIVE') {
        const deal = await db.opportunity.findFirst({ where: { id, organizationId: req.user!.organizationId } });
        if (deal?.ownerId !== req.user!.id) throw new ForbiddenError('Only owners and managers can manage deal sharing.');
      }
    }
    if (id && models[resource] && id !== 'executions') await checkRecord(req, models[resource], id, write);
    const body = req.body || {};
    const refs: Record<string, string> = { ownerId: 'user', assignedToId: 'user', userId: 'user', companyId: 'company', parentId: 'company', contactId: 'contact', primaryContactId: 'contact', leadId: 'lead', opportunityId: 'opportunity', pipelineId: 'pipeline' };
    if (write) {
      for (const [key, model] of Object.entries(refs)) {
        if (body[key]) {
          if (typeof body[key] !== 'string') throw new ValidationError(`${key} must be a string`);
          await checkRecord(req, model, body[key]);
          if (role === 'SALES_REPRESENTATIVE' && ['ownerId', 'assignedToId'].includes(key) && body[key] !== req.user!.id) throw new ForbiddenError('Only managers can reassign ownership.');
        }
      }
      if (body.stageId) {
        const stage = await db.pipelineStage.findFirst({ where: { id: body.stageId, pipeline: { organizationId: req.user!.organizationId } } });
        if (!stage) throw new NotFoundError('Pipeline stage', body.stageId);
        const deal = resource === 'opportunities' && id ? await db.opportunity.findUnique({ where: { id } }) : null;
        if (stage.pipelineId !== (body.pipelineId || deal?.pipelineId)) throw new ValidationError('Stage must belong to the selected pipeline.');
      }
    }
    const enums: Record<string, Record<string, string[]>> = {
      leads: { status: ['NEW','CONTACTED','QUALIFIED','UNQUALIFIED','CONVERTED'], source: ['WEBSITE','REFERRAL','COLD_OUTREACH','INBOUND_FORM','TRADE_SHOW','PARTNER','CSV_IMPORT'], priorityTier: ['HOT','WARM','COLD'] },
      opportunities: { status: ['OPEN','WON','LOST'] }, tasks: { status: ['TODO','IN_PROGRESS','COMPLETED','CANCELLED'], priority: ['LOW','MEDIUM','HIGH','URGENT'] }, activities: { type: ['NOTE','CALL','EMAIL','MEETING','TASK','STAGE_CHANGE'] },
    };
    for (const [field, values] of Object.entries(enums[resource] || {})) if (req.query[field] && !values.includes(String(req.query[field]))) throw new ValidationError(`Invalid ${field} filter`);
    for (const field of ['page', 'limit']) {
      if (req.query[field] !== undefined && (!/^\d+$/.test(String(req.query[field])) || Number(req.query[field]) < 1 || Number(req.query[field]) > (field === 'limit' ? 100 : 100000))) throw new ValidationError(`Invalid ${field}`);
    }
    next();
  } catch (error) { next(error); }
}
