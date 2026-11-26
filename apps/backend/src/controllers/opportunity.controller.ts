// ClientSphere Opportunity (Deal) Management Controller
// Pipeline Kanban, Multi-Rep Collaboration, and Team Visibility Security
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { OpportunityMemberRole, OpportunityStatus, ActivityType } from '@clientsphere/shared-types';
import { z } from 'zod';
import { WorkflowEngine } from '../services/workflow/workflow.engine';
import { TriggerType } from '@clientsphere/shared-types';

const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Deal title is required'),
  value: z.number().min(0, 'Value must be positive'),
  currency: z.string().default('USD'),
  stageId: z.string().min(1, 'Stage ID is required'),
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  companyId: z.string().optional(),
  primaryContactId: z.string().optional(),
  probability: z.number().min(0).max(1).optional(),
  expectedCloseDate: z.string().refine(value => Number.isFinite(Date.parse(value)), 'Valid date required').optional(),
  customFields: z.record(z.string(), z.any()).optional().default({}),
});

const updateStageSchema = z.object({
  stageId: z.string().min(1, 'Stage ID is required'),
  winLossReason: z.string().optional(),
});

const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.nativeEnum(OpportunityMemberRole).default(OpportunityMemberRole.ACCOUNT_EXECUTIVE),
  canEdit: z.boolean().default(true),
  commissionShare: z.number().min(0).max(1).default(0.2),
});

export class OpportunityController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const pipelineId = req.query.pipelineId as string;
      const stageId = req.query.stageId as string;
      const status = req.query.status as OpportunityStatus;

      const where: any = { organizationId };
      if (pipelineId) where.pipelineId = pipelineId;
      if (stageId) where.stageId = stageId;
      if (status) where.status = status;

      // Capstone Challenge: Team visibility enforcement
      // If user is SALES_REPRESENTATIVE, they can only view opportunities where they are:
      // 1. The primary owner (ownerId === user.id) OR
      // 2. An assigned team member in opportunity_members
      if (req.user!.role === 'SALES_REPRESENTATIVE') {
        const memberships = await db.opportunityMember.findMany({
          where: { userId: req.user!.id }
        });
        const memberOpportunityIds = memberships.map((m: any) => m.opportunityId);

        where.OR = [
          { ownerId: req.user!.id },
          { id: { in: memberOpportunityIds } }
        ];
      }

      const opportunities = await db.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with company, primary contact, stage, and team member summaries
      const enriched = await Promise.all(
        opportunities.map(async (deal: any) => {
          const [company, contact, stage, members] = await Promise.all([
            deal.companyId ? db.company.findUnique({ where: { id: deal.companyId } }) : null,
            deal.primaryContactId ? db.contact.findUnique({ where: { id: deal.primaryContactId } }) : null,
            db.pipelineStage.findUnique({ where: { id: deal.stageId } }),
            db.opportunityMember.findMany({ where: { opportunityId: deal.id } })
          ]);

          const memberUsers = await Promise.all(
            members.map(async (m: any) => {
              const u = await db.user.findUnique({ where: { id: m.userId } });
              return {
                id: m.id,
                userId: m.userId,
                name: u ? `${u.firstName} ${u.lastName}` : 'Team Member',
                role: m.role,
                canEdit: m.canEdit,
                commissionShare: m.commissionShare,
              };
            })
          );

          return {
            ...deal,
            companyName: company?.name || 'Standalone Deal',
            contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
            stageName: stage?.name || 'Stage',
            stageColor: stage?.color || '#7C3AED',
            teamMembers: memberUsers,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: enriched,
        count: enriched.length,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const deal = await db.opportunity.findFirst({
        where: { id, organizationId }
      });

      if (!deal) {
        throw new NotFoundError('Opportunity', id);
      }

      // Check team visibility permission
      if (req.user!.role === 'SALES_REPRESENTATIVE' && deal.ownerId !== req.user!.id) {
        const isMember = await db.opportunityMember.findFirst({
          where: { opportunityId: id, userId: req.user!.id }
        });
        if (!isMember) {
          throw new ForbiddenError('You do not have permission to view this opportunity.');
        }
      }

      const [company, contact, stage, members, activities] = await Promise.all([
        deal.companyId ? db.company.findUnique({ where: { id: deal.companyId } }) : null,
        deal.primaryContactId ? db.contact.findUnique({ where: { id: deal.primaryContactId } }) : null,
        db.pipelineStage.findUnique({ where: { id: deal.stageId } }),
        db.opportunityMember.findMany({ where: { opportunityId: id } }),
        db.activity.findMany({ where: { opportunityId: id, organizationId }, orderBy: { createdAt: 'desc' } })
      ]);

      const memberDetails = await Promise.all(
        members.map(async (m: any) => {
          const u = await db.user.findUnique({ where: { id: m.userId } });
          return {
            id: m.id,
            userId: m.userId,
            fullName: u ? `${u.firstName} ${u.lastName}` : 'User',
            email: u?.email,
            role: m.role,
            canEdit: m.canEdit,
            commissionShare: m.commissionShare,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          ...deal,
          company,
          contact,
          stage,
          teamMembers: memberDetails,
          activities,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createOpportunitySchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Opportunity validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const stage = await db.pipelineStage.findFirst({
        where: { id: input.stageId }
      });

      const opportunity = await db.opportunity.create({
        data: {
          title: input.title,
          value: input.value,
          currency: input.currency,
          stageId: input.stageId,
          pipelineId: input.pipelineId,
          companyId: input.companyId || null,
          primaryContactId: input.primaryContactId || null,
          ownerId: req.user!.id,
          organizationId,
          probability: input.probability !== undefined ? input.probability : (stage?.winProbability || 0.2),
          expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
          status: OpportunityStatus.OPEN,
          customFields: input.customFields,
        }
      });

      // Automatically register the creator as PRIMARY_OWNER
      await db.opportunityMember.create({
        data: {
          opportunityId: opportunity.id,
          userId: req.user!.id,
          role: OpportunityMemberRole.PRIMARY_OWNER,
          canEdit: true,
          commissionShare: 1.0,
        }
      });

      // Log activity
      await db.activity.create({
        data: {
          type: ActivityType.STAGE_CHANGE,
          subject: 'Opportunity Created',
          description: `Deal '${opportunity.title}' initiated at stage: ${stage?.name || 'New'}. Initial value: $${opportunity.value.toLocaleString()}`,
          opportunityId: opportunity.id,
          companyId: input.companyId || null,
          contactId: input.primaryContactId || null,
          userId: req.user!.id,
          organizationId,
        }
      });

      return res.status(201).json({
        success: true,
        data: opportunity,
        message: 'Opportunity created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  // Kanban Stage Transition & Win/Loss Validation
  public static async updateStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateStageSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid stage transition parameters', validation.error.format());
      }

      const { stageId, winLossReason } = validation.data;
      const organizationId = req.user!.organizationId;

      const deal = await db.opportunity.findFirst({
        where: { id, organizationId }
      });

      if (!deal) {
        throw new NotFoundError('Opportunity', id);
      }

      const targetStage = await db.pipelineStage.findFirst({
        where: { id: stageId }
      });

      if (!targetStage) {
        throw new NotFoundError('Target Pipeline Stage', stageId);
      }

      let status = OpportunityStatus.OPEN;
      let actualCloseDate = null;

      const stageLower = targetStage.name.toLowerCase();
      if (stageLower.includes('won') || targetStage.winProbability >= 1.0) {
        status = OpportunityStatus.WON;
        actualCloseDate = new Date();
      } else if (stageLower.includes('lost')) {
        status = OpportunityStatus.LOST;
        actualCloseDate = new Date();
        if (!winLossReason) {
          throw new ValidationError('A win/loss reason is required when transitioning a deal to Closed Lost.');
        }
      }

      const updatedDeal = await db.opportunity.update({
        where: { id },
        data: {
          stageId: targetStage.id,
          probability: targetStage.winProbability,
          status,
          winLossReason: winLossReason || deal.winLossReason,
          actualCloseDate,
        }
      });

      // Record stage transition activity
      await db.activity.create({
        data: {
          type: ActivityType.STAGE_CHANGE,
          subject: `Stage Transition: ${targetStage.name}`,
          description: `Opportunity progressed to '${targetStage.name}' (Probability: ${(targetStage.winProbability * 100).toFixed(0)}%). Reason: ${winLossReason || 'Pipeline Progression'}`,
          opportunityId: deal.id,
          companyId: deal.companyId,
          contactId: deal.primaryContactId,
          userId: req.user!.id,
          organizationId,
        }
      });

      await WorkflowEngine.evaluateAndTrigger({ organizationId, triggerEvent: TriggerType.DEAL_STAGE_CHANGED, entityType: 'OPPORTUNITY', entityId: updatedDeal.id, entityData: { ...updatedDeal, stageName: targetStage.name }, userId: req.user!.id });
      return res.status(200).json({
        success: true,
        data: updatedDeal,
        message: `Deal moved to ${targetStage.name}`
      });
    } catch (err) {
      next(err);
    }
  }

  // Capstone Challenge: Multi-representative Collaboration Management
  public static async addTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: opportunityId } = req.params;
      const validation = addTeamMemberSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid team member payload', validation.error.format());
      }

      const organizationId = req.user!.organizationId;
      const deal = await db.opportunity.findFirst({ where: { id: opportunityId, organizationId } });
      if (!deal) throw new NotFoundError('Opportunity', opportunityId);

      const collaboratorId = String(validation.data.userId);
      const collaborator = await db.user.findFirst({ where: { id: collaboratorId, organizationId } });
      if (!collaborator) throw new NotFoundError('User', collaboratorId);

      const existing = await db.opportunityMember.findFirst({
        where: { opportunityId, userId: collaborator.id }
      });

      const commShare = validation.data.commissionShare;
      const member = await db.$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT id FROM opportunities WHERE id = ${opportunityId} FOR UPDATE`;
        const others = await tx.opportunityMember.findMany({ where: { opportunityId, userId: { notIn: [collaborator.id, deal.ownerId].filter(Boolean) } } });
        const allocated = others.reduce((sum: number, row: any) => sum + row.commissionShare, 0);
        if (allocated + commShare > 1 + 0.000001) throw new ValidationError('Total commission allocation cannot exceed 100%.');
        const isOwner = collaborator.id === deal.ownerId;
        const member = await tx.opportunityMember.upsert({ where: { opportunityId_userId: { opportunityId, userId: collaborator.id } }, update: { role: isOwner ? 'PRIMARY_OWNER' : validation.data.role, canEdit: isOwner || validation.data.canEdit, commissionShare: isOwner ? 1 - allocated : commShare }, create: { opportunityId, userId: collaborator.id, role: validation.data.role === 'PRIMARY_OWNER' ? 'ACCOUNT_EXECUTIVE' : validation.data.role, canEdit: validation.data.canEdit, commissionShare: commShare } });
        if (!isOwner && deal.ownerId) await tx.opportunityMember.updateMany({ where: { opportunityId, userId: deal.ownerId }, data: { commissionShare: Math.max(0, 1 - allocated - commShare) } });
        return member;
      });
      return res.status(existing ? 200 : 201).json({ success: true, data: member, message: 'Opportunity team and commission allocation updated.' });
    } catch (err) {
      next(err);
    }
  }

  public static async removeTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: opportunityId, userId } = req.params;
      const member = await db.opportunityMember.findFirst({
        where: { opportunityId, userId }
      });

      if (!member) {
        throw new NotFoundError('Opportunity Team Member');
      }

      if (member.role === OpportunityMemberRole.PRIMARY_OWNER) {
        throw new ForbiddenError('Cannot remove the primary owner from the opportunity team.');
      }

      await db.$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT id FROM opportunities WHERE id = ${opportunityId} FOR UPDATE`;
        await tx.opportunityMember.delete({ where: { id: member.id } });
        const owner = await tx.opportunityMember.findFirst({ where: { opportunityId, role: 'PRIMARY_OWNER' } });
        if (owner) await tx.opportunityMember.update({ where: { id: owner.id }, data: { commissionShare: owner.commissionShare + member.commissionShare } });
      });

      return res.status(200).json({
        success: true,
        message: 'Team member removed from deal collaboration.'
      });
    } catch (err) {
      next(err);
    }
  }
}
