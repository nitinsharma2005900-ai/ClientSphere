// ClientSphere Lead Management Controller
// Full CRUD, Python Scoring Integration, and Atomic Lead Conversion
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { LeadStatus, LeadSource, ActivityType, OpportunityMemberRole, DealStage } from '@clientsphere/shared-types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { intelligence } from '../services/intelligence';
import { WorkflowEngine } from '../services/workflow/workflow.engine';
import { TriggerType } from '@clientsphere/shared-types';

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  source: z.nativeEnum(LeadSource).default(LeadSource.WEBSITE),
  score: z.number().int().min(0).max(100).default(35),
  priorityTier: z.enum(['HOT', 'WARM', 'COLD']).default('WARM'),
  ownerId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional().default({}),
});

const updateLeadSchema = createLeadSchema.partial();

const convertLeadSchema = z.object({
  dealTitle: z.string().min(1, 'Deal title is required for conversion'),
  dealValue: z.number().positive().default(10000),
  pipelineId: z.string().optional(),
  expectedCloseDays: z.number().int().positive().default(30),
});

export class LeadController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const status = req.query.status as LeadStatus;
      const source = req.query.source as LeadSource;
      const priorityTier = req.query.priorityTier as string;

      const where: any = { organizationId };

      if (status) where.status = status;
      if (source) where.source = source;
      if (priorityTier) where.priorityTier = priorityTier;
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { companyName: { contains: search } },
        ];
      }

      // Sales representatives only see their assigned leads unless manager/admin
      if (req.user!.role === 'SALES_REPRESENTATIVE') {
        where.ownerId = req.user!.id;
      }

      const [leads, total] = await Promise.all([
        db.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.lead.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lead = await db.lead.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!lead) {
        throw new NotFoundError('Lead', id);
      }

      // Check rep visibility
      if (req.user!.role === 'SALES_REPRESENTATIVE' && lead.ownerId && lead.ownerId !== req.user!.id) {
        throw new NotFoundError('Lead', id);
      }

      const activities = await db.activity.findMany({
        where: { leadId: id, organizationId: req.user!.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...lead,
          activities,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createLeadSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Lead input validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      // Calculate initial explainable scoring factors
      const calculatedScore = await intelligence('/leads/score', input);

      const lead = await db.lead.create({
        data: {
          ...input,
          score: calculatedScore.score,
          priorityTier: calculatedScore.priorityTier,
          scoreFactors: calculatedScore.factors,
          ownerId: input.ownerId || req.user!.id,
          organizationId,
        }
      });

      // Record activity
      await db.activity.create({
        data: {
          type: ActivityType.NOTE,
          subject: 'Lead Created',
          description: `Lead registered via source: ${input.source}. Initial score: ${calculatedScore.score} (${calculatedScore.priorityTier})`,
          leadId: lead.id,
          userId: req.user!.id,
          organizationId,
        }
      });

      await WorkflowEngine.evaluateAndTrigger({ organizationId, triggerEvent: TriggerType.LEAD_CREATED, entityType: 'LEAD', entityId: lead.id, entityData: lead, userId: req.user!.id });
      return res.status(201).json({
        success: true,
        data: lead,
        message: 'Lead created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateLeadSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid lead update data', validation.error.format());
      }

      const lead = await db.lead.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!lead) {
        throw new NotFoundError('Lead', id);
      }

      const updateData: any = { ...validation.data };
      if (updateData.jobTitle || updateData.companyName || updateData.status) {
        const reScore = await intelligence('/leads/score', { ...lead, ...updateData });
        updateData.score = reScore.score;
        updateData.priorityTier = reScore.priorityTier;
        updateData.scoreFactors = reScore.factors;
      }

      const updated = await db.lead.update({
        where: { id },
        data: updateData,
      });

      if (updated.score !== lead.score) await WorkflowEngine.evaluateAndTrigger({ organizationId: req.user!.organizationId, triggerEvent: TriggerType.LEAD_SCORE_CHANGED, entityType: 'LEAD', entityId: updated.id, entityData: updated, userId: req.user!.id });
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Lead updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lead = await db.lead.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!lead) {
        throw new NotFoundError('Lead', id);
      }

      await db.lead.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  // Mandatory Assessment 01/02/03 Feature: Atomic Lead Conversion
  public static async convert(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = convertLeadSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid conversion parameters', validation.error.format());
      }

      const organizationId = req.user!.organizationId;
      const lead = await db.lead.findFirst({
        where: { id, organizationId }
      });

      if (!lead) {
        throw new NotFoundError('Lead', id);
      }

      if (lead.status === LeadStatus.CONVERTED) {
        throw new ConflictError('This lead has already been converted into a Contact, Company, and Opportunity.');
      }

      const { dealTitle, dealValue, pipelineId, expectedCloseDays } = validation.data;

      // Execute atomic transaction for conversion
      const conversionResult = await db.$transaction(async (tx: any) => {
        await tx.$queryRaw`SELECT id FROM leads WHERE id = ${lead.id} FOR UPDATE`;
        const lockedLead = await tx.lead.findUnique({ where: { id: lead.id } });
        if (lockedLead.status === LeadStatus.CONVERTED) throw new ConflictError('This lead has already been converted.');
        // 1. Find or create company
        let companyId = lead.convertedCompanyId;
        if (!companyId && lead.companyName) {
          let company = await tx.company.findFirst({
            where: { name: lead.companyName, organizationId }
          });
          if (!company) {
            company = await tx.company.create({
              data: {
                name: lead.companyName,
                ownerId: lead.ownerId || req.user!.id,
                organizationId,
                tier: 'GROWTH',
              }
            });
          }
          companyId = company.id;
        }

        // 2. Create Contact
        let contact = await tx.contact.findFirst({
          where: { email: lead.email, organizationId }
        });

        if (!contact) {
          contact = await tx.contact.create({
            data: {
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email,
              phone: lead.phone,
              ownerId: lead.ownerId || req.user!.id,
              organizationId,
              consentSource: 'LEAD_CONVERSION',
              gdprConsent: Boolean((lead.customFields as any)?.consentGiven),
            }
          });
        }

        // 3. Link Contact to Company if both exist (ManyToMany)
        if (companyId && contact) {
          const existingRel = await tx.contactCompany.findFirst({
            where: { contactId: contact.id, companyId }
          });
          if (!existingRel) {
            await tx.contactCompany.create({
              data: {
                contactId: contact.id,
                companyId,
                jobTitle: lead.jobTitle || 'Business Contact',
                isPrimary: true,
              }
            });
          }
        }

        // 4. Resolve default pipeline & first stage
        let targetPipeline = pipelineId 
          ? await tx.pipeline.findFirst({ where: { id: pipelineId, organizationId } })
          : await tx.pipeline.findFirst({ where: { isDefault: true, organizationId } });

        if (!targetPipeline) {
          targetPipeline = await tx.pipeline.findFirst({ where: { organizationId } });
        }

        const stages = await tx.pipelineStage.findMany({
          where: { pipelineId: targetPipeline?.id || 'default' },
          orderBy: { order: 'asc' }
        });
        const initialStage = stages[0];
        if (!targetPipeline || !initialStage) throw new ValidationError('A configured pipeline with at least one stage is required.');

        // 5. Create Opportunity
        const expectedCloseDate = new Date();
        expectedCloseDate.setDate(expectedCloseDate.getDate() + expectedCloseDays);

        const opportunity = await tx.opportunity.create({
          data: {
            title: dealTitle,
            value: dealValue,
            currency: 'USD',
            stageId: initialStage?.id || 'stage-prospecting',
            pipelineId: targetPipeline?.id || 'default-pipeline',
            companyId: companyId || null,
            primaryContactId: contact.id,
            ownerId: lead.ownerId || req.user!.id,
            organizationId,
            probability: initialStage?.winProbability || 0.2,
            expectedCloseDate,
            status: 'OPEN',
          }
        });

        // 6. Add primary owner to Opportunity Team Member table
        await tx.opportunityMember.create({
          data: {
            opportunityId: opportunity.id,
            userId: lead.ownerId || req.user!.id,
            role: OpportunityMemberRole.PRIMARY_OWNER,
            canEdit: true,
            commissionShare: 1.0,
          }
        });

        // 7. Update Lead status to CONVERTED
        const updatedLead = await tx.lead.update({
          where: { id: lead.id },
          data: {
            status: LeadStatus.CONVERTED,
            convertedAt: new Date(),
            convertedCompanyId: companyId || null,
            convertedContactId: contact.id,
            convertedOpportunityId: opportunity.id,
          }
        });

        // 8. Log conversion activity
        await tx.activity.create({
          data: {
            type: ActivityType.STAGE_CHANGE,
            subject: 'Lead Converted to Qualified Deal',
            description: `Lead converted into Opportunity: ${dealTitle} ($${dealValue.toLocaleString()}). Contact: ${contact.firstName} ${contact.lastName}`,
            leadId: lead.id,
            contactId: contact.id,
            companyId: companyId || null,
            opportunityId: opportunity.id,
            userId: req.user!.id,
            organizationId,
          }
        });

        return {
          lead: updatedLead,
          contact,
          companyId,
          opportunity,
        };
      });

      return res.status(200).json({
        success: true,
        data: conversionResult,
        message: 'Lead successfully converted to Contact, Company, and Opportunity.'
      });
    } catch (err) {
      next(err);
    }
  }
}

// Deterministic explainable lead scoring (Assessment 05 alignment)
export function calculateDeterministicScore(lead: any) {
  let score = 20; // Base baseline score
  const factors: any[] = [];

  // Job title evaluation
  const title = (lead.jobTitle || '').toLowerCase();
  if (/cxo|ceo|cto|cfo|cio|vp|president|founder|director/.test(title)) {
    score += 35;
    factors.push({
      factor: 'Executive Decision Maker Title',
      points: 35,
      category: 'DEMOGRAPHIC',
      explanation: `Title '${lead.jobTitle}' indicates high budget authorization capacity.`
    });
  } else if (/manager|lead|head|supervisor/.test(title)) {
    score += 20;
    factors.push({
      factor: 'Management Title',
      points: 20,
      category: 'DEMOGRAPHIC',
      explanation: `Title '${lead.jobTitle}' indicates mid-level team influence.`
    });
  }

  // Company presence
  if (lead.companyName && lead.companyName.trim().length > 1) {
    score += 15;
    factors.push({
      factor: 'Verified Enterprise Entity',
      points: 15,
      category: 'FIRMOGRAPHIC',
      explanation: `Company '${lead.companyName}' represents an established commercial entity.`
    });
  }

  // Contact richness
  if (lead.phone && lead.phone.length >= 7) {
    score += 15;
    factors.push({
      factor: 'Direct Phone Provided',
      points: 15,
      category: 'ENGAGEMENT',
      explanation: 'High outbound sales velocity capability through direct telephony.'
    });
  }

  // Acquisition source weighting
  if (lead.source === LeadSource.REFERRAL || lead.source === LeadSource.INBOUND_FORM) {
    score += 15;
    factors.push({
      factor: 'High-Intent Inbound Channel',
      points: 15,
      category: 'TIMING',
      explanation: `Acquisition via ${lead.source} exhibits superior conversion velocity.`
    });
  }

  score = Math.min(100, Math.max(0, score));
  const priorityTier = score >= 70 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD';

  return {
    score,
    priorityTier,
    factors,
  };
}
