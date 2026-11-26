// ClientSphere Workflow Controller
// Management of Automation Rules and Execution History
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { TriggerType, ActionType } from '@clientsphere/shared-types';
import { WorkflowEngine } from '../services/workflow/workflow.engine';
import { z } from 'zod';
import { checkRecord } from '../middlewares/policy.middleware';
import crypto from 'crypto';

const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.enum(['LEAD_CREATED', 'LEAD_SCORE_CHANGED', 'DEAL_STAGE_CHANGED']),
  triggerConfig: z.record(z.string(), z.any()).optional().default({}),
  conditions: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS']),
    value: z.any(),
  })).default([]),
  actions: z.array(z.object({
    type: z.enum(['CREATE_TASK', 'SEND_EMAIL', 'CREATE_ACTIVITY', 'UPDATE_FIELD', 'ASSIGN_OWNER']),
    params: z.record(z.string(), z.any()).default({}),
  })).min(1, 'At least one action is required'),
});

const updateWorkflowSchema = createWorkflowSchema.partial();

export class WorkflowController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const workflows = await db.workflow.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      const enriched = await Promise.all(
        workflows.map(async (wf: any) => {
          const executionCount = await db.workflowExecution.count({
            where: { workflowId: wf.id }
          });
          return {
            ...wf,
            executionCount,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: enriched,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const workflow = await db.workflow.findFirst({
        where: { id, organizationId }
      });

      if (!workflow) {
        throw new NotFoundError('Workflow', id);
      }

      const recentExecutions = await db.workflowExecution.findMany({
        where: { workflowId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return res.status(200).json({
        success: true,
        data: {
          ...workflow,
          recentExecutions,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createWorkflowSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Workflow validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const workflow = await db.workflow.create({
        data: {
          ...input,
          organizationId,
        }
      });

      return res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow rule created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateWorkflowSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid update parameters', validation.error.format());
      }

      const workflow = await db.workflow.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!workflow) {
        throw new NotFoundError('Workflow', id);
      }

      const updated = await db.workflow.update({
        where: { id },
        data: validation.data,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Workflow rule updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workflow = await db.workflow.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!workflow) {
        throw new NotFoundError('Workflow', id);
      }

      await db.workflow.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async testTrigger(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const workflow = await db.workflow.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!workflow) {
        throw new NotFoundError('Workflow', id);
      }

      const entityType = req.body.entityType || (workflow.triggerType.startsWith('DEAL_') ? 'OPPORTUNITY' : 'LEAD');
      const model = ({ LEAD: 'lead', OPPORTUNITY: 'opportunity', TASK: 'task', CONTACT: 'contact' } as any)[entityType];
      if (!model) throw new ValidationError('Unsupported workflow target type');
      const entity = req.body.entityId
        ? await checkRecord(req, model, req.body.entityId)
        : await (db as any)[model].findFirst({ where: { organizationId: req.user!.organizationId } });
      if (!entity) throw new ValidationError('Create a matching target record first.');
      const results = await WorkflowEngine.evaluateAndTrigger({
        organizationId: req.user!.organizationId, triggerEvent: workflow.triggerType,
        workflowId: workflow.id, entityType, entityId: entity.id, entityData: entity,
        eventId: crypto.randomUUID(), userId: req.user!.id,
      });

      return res.status(200).json({
        success: true,
        data: results,
        message: 'Workflow trigger tested and logged.'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listExecutions(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const executions = await db.workflowExecution.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return res.status(200).json({
        success: true,
        data: executions,
      });
    } catch (err) {
      next(err);
    }
  }
}
