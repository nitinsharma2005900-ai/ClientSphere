// ClientSphere Task Management Controller
// Follow-ups, Due Dates, and Prioritized Rep Actions
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('TODO'),
  dueDate: z.string().refine(value => Number.isFinite(Date.parse(value)), 'Valid date required').optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  opportunityId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

export class TaskController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { status, priority, assignedToId } = req.query;

      const where: any = { organizationId };
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (assignedToId) where.assignedToId = assignedToId;

      // Reps default to seeing their assigned tasks
      if (req.user!.role === 'SALES_REPRESENTATIVE' ) {
        where.assignedToId = req.user!.id;
      }

      const tasks = await db.task.findMany({
        where,
        orderBy: { dueDate: 'asc' },
      });

      const enriched = await Promise.all(
        tasks.map(async (t: any) => {
          const [assignee, lead, contact, deal] = await Promise.all([
            t.assignedToId ? db.user.findUnique({ where: { id: t.assignedToId } }) : null,
            t.leadId ? db.lead.findUnique({ where: { id: t.leadId } }) : null,
            t.contactId ? db.contact.findUnique({ where: { id: t.contactId } }) : null,
            t.opportunityId ? db.opportunity.findUnique({ where: { id: t.opportunityId } }) : null,
          ]);

          return {
            ...t,
            assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned',
            targetName: lead 
              ? `Lead: ${lead.firstName} ${lead.lastName}` 
              : contact 
              ? `Contact: ${contact.firstName} ${contact.lastName}` 
              : deal 
              ? `Deal: ${deal.title}` 
              : 'General Task',
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

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createTaskSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Task validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const task = await db.task.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          assignedToId: input.assignedToId || req.user!.id,
          organizationId,
        }
      });

      return res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateTaskSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid update parameters', validation.error.format());
      }

      const task = await db.task.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!task) {
        throw new NotFoundError('Task', id);
      }

      const updated = await db.task.update({
        where: { id },
        data: {
          ...validation.data,
          dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : task.dueDate,
        }
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Task updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const task = await db.task.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!task) {
        throw new NotFoundError('Task', id);
      }

      await db.task.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}
