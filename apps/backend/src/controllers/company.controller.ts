// ClientSphere Company / Account Management Controller
// Hierarchical Organizations, Associated Contacts, and Deal Summaries
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  tier: z.string().default('MID_MARKET'),
  parentId: z.string().optional(),
  ownerId: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional().default({}),
});

const updateCompanySchema = createCompanySchema.partial();

export class CompanyController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;
      const industry = req.query.industry as string;
      const tier = req.query.tier as string;

      const where: any = { organizationId };
      if (req.user!.role === 'SALES_REPRESENTATIVE') where.ownerId = req.user!.id;
      if (industry) where.industry = industry;
      if (tier) where.tier = tier;
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { domain: { contains: search } },
        ];
      }

      const [companies, total] = await Promise.all([
        db.company.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        db.company.count({ where }),
      ]);

      // Enrich with associated contact counts and open deal values
      const enriched = await Promise.all(
        companies.map(async (c: any) => {
          const [contactCount, opportunities] = await Promise.all([
            db.contactCompany.count({ where: { companyId: c.id } }),
            db.opportunity.findMany({ where: { companyId: c.id, organizationId } })
          ]);
          const totalPipelineValue = opportunities.reduce((acc: number, deal: any) => acc + (deal.value || 0), 0);
          return {
            ...c,
            contactCount,
            dealCount: opportunities.length,
            totalPipelineValue,
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: enriched,
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
      const organizationId = req.user!.organizationId;

      const company = await db.company.findFirst({
        where: { id, organizationId }
      });

      if (!company) {
        throw new NotFoundError('Company', id);
      }

      // Associated contacts through junction table
      const relations = await db.contactCompany.findMany({
        where: { companyId: id }
      });

      const contacts = await Promise.all(
        relations.map(async (rel: any) => {
          const contact = await db.contact.findUnique({ where: { id: rel.contactId } });
          return {
            id: contact?.id,
            firstName: contact?.firstName,
            lastName: contact?.lastName,
            email: contact?.email,
            phone: contact?.phone,
            jobTitle: rel.jobTitle,
            department: rel.department,
            isPrimary: rel.isPrimary,
          };
        })
      );

      const [opportunities, activities, subsidiaries] = await Promise.all([
        db.opportunity.findMany({ where: { companyId: id, organizationId } }),
        db.activity.findMany({ where: { companyId: id, organizationId }, orderBy: { createdAt: 'desc' } }),
        db.company.findMany({ where: { parentId: id, organizationId } }),
      ]);

      let parentCompany = null;
      if (company.parentId) {
        parentCompany = await db.company.findUnique({ where: { id: company.parentId } });
      }

      return res.status(200).json({
        success: true,
        data: {
          ...company,
          contacts,
          opportunities,
          activities,
          subsidiaries,
          parentCompany,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createCompanySchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Company validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const company = await db.company.create({
        data: {
          ...input,
          ownerId: input.ownerId || req.user!.id,
          organizationId,
        }
      });

      return res.status(201).json({
        success: true,
        data: company,
        message: 'Company created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateCompanySchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid update parameters', validation.error.format());
      }

      const company = await db.company.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!company) {
        throw new NotFoundError('Company', id);
      }

      const updated = await db.company.update({
        where: { id },
        data: validation.data,
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Company updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const company = await db.company.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!company) {
        throw new NotFoundError('Company', id);
      }

      await db.company.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Company deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}
