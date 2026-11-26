// ClientSphere Activity Timeline Controller
// Notes, Calls, Emails, Meetings, Stage Changes
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { ActivityType, ActivityStatus } from '@clientsphere/shared-types';
import { z } from 'zod';

const createActivitySchema = z.object({
  type: z.nativeEnum(ActivityType).default(ActivityType.NOTE),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.COMPLETED),
  dueDate: z.string().refine(value => Number.isFinite(Date.parse(value)), 'Valid date required').optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  opportunityId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export class ActivityController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const { leadId, contactId, companyId, opportunityId, type } = req.query;

      const where: any = { organizationId };
      if (req.user!.role === 'SALES_REPRESENTATIVE') where.userId = req.user!.id;
      if (leadId) where.leadId = leadId;
      if (contactId) where.contactId = contactId;
      if (companyId) where.companyId = companyId;
      if (opportunityId) where.opportunityId = opportunityId;
      if (type) where.type = type;

      const activities = await db.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Enrich with user name
      const enriched = await Promise.all(
        activities.map(async (act: any) => {
          const user = await db.user.findUnique({ where: { id: act.userId } });
          return {
            ...act,
            userName: user ? `${user.firstName} ${user.lastName}` : 'CRM User',
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
      const validation = createActivitySchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Activity validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const activity = await db.activity.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate as string) : null,
          completedAt: input.status === ActivityStatus.COMPLETED ? new Date() : null,
          userId: req.user!.id,
          organizationId,
        }
      });

      return res.status(201).json({
        success: true,
        data: activity,
        message: 'Activity recorded successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const activity = await db.activity.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!activity) {
        throw new NotFoundError('Activity', id);
      }

      await db.activity.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Activity deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}
