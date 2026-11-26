// ClientSphere Contact Management Controller
// Full CRUD, GDPR Consent Tracking, and Capstone Multi-Company Association
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { z } from 'zod';

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  mobilePhone: z.string().optional(),
  gdprConsent: z.boolean().default(true),
  consentSource: z.string().default('DIRECT_OPT_IN'),
  ownerId: z.string().optional(),
  companyId: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  customFields: z.record(z.string(), z.any()).optional().default({}),
});

const updateContactSchema = createContactSchema.partial();

const linkCompanySchema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  jobTitle: z.string().min(1, 'Job title for this company role is required'),
  department: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export class ContactController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '25', 10);
      const skip = (page - 1) * limit;
      const search = req.query.search as string;

      const where: any = { organizationId };
      if (req.user!.role === 'SALES_REPRESENTATIVE') where.ownerId = req.user!.id;

      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ];
      }

      const [contacts, total] = await Promise.all([
        db.contact.findMany({
          where,
          skip,
          take: limit,
          orderBy: { lastName: 'asc' },
        }),
        db.contact.count({ where }),
      ]);

      // Enrich contacts with primary company information
      const enriched = await Promise.all(
        contacts.map(async (c: any) => {
          const relations = await db.contactCompany.findMany({
            where: { contactId: c.id }
          });
          let primaryCompany: any = null;
          if (relations.length > 0) {
            const primaryRel = relations.find((r: any) => r.isPrimary) || relations[0];
            const comp = await db.company.findUnique({ where: { id: primaryRel.companyId } });
            if (comp) {
              primaryCompany = {
                id: comp.id,
                name: comp.name,
                jobTitle: primaryRel.jobTitle,
                department: primaryRel.department,
              };
            }
          }
          return {
            ...c,
            companyCount: relations.length,
            primaryCompany,
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

      const contact = await db.contact.findFirst({
        where: { id, organizationId }
      });

      if (!contact) {
        throw new NotFoundError('Contact', id);
      }

      // Capstone Challenge: Load all associated companies
      const companyRelations = await db.contactCompany.findMany({
        where: { contactId: id }
      });

      const companies = await Promise.all(
        companyRelations.map(async (rel: any) => {
          const comp = await db.company.findUnique({ where: { id: rel.companyId } });
          return {
            relationId: rel.id,
            companyId: rel.companyId,
            companyName: comp?.name || 'Unknown Company',
            domain: comp?.domain,
            industry: comp?.industry,
            jobTitle: rel.jobTitle,
            department: rel.department,
            isPrimary: rel.isPrimary,
            startDate: rel.startDate,
          };
        })
      );

      // Load activities and opportunities
      const [activities, opportunities] = await Promise.all([
        db.activity.findMany({
          where: { contactId: id, organizationId },
          orderBy: { createdAt: 'desc' },
        }),
        db.opportunity.findMany({
          where: { primaryContactId: id, organizationId },
        })
      ]);

      return res.status(200).json({
        success: true,
        data: {
          ...contact,
          companies,
          activities,
          opportunities,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createContactSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Contact validation failed', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      // Duplicate check within organization
      const existing = await db.contact.findFirst({
        where: { email: input.email.toLowerCase().trim(), organizationId }
      });

      if (existing) {
        throw new ConflictError(`Contact with email '${input.email}' already exists in your organization.`);
      }

      const contact = await db.contact.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email.toLowerCase().trim(),
          phone: input.phone || null,
          mobilePhone: input.mobilePhone || null,
          gdprConsent: input.gdprConsent,
          consentDate: new Date(),
          consentSource: input.consentSource,
          ownerId: input.ownerId || req.user!.id,
          organizationId,
          customFields: input.customFields,
        }
      });

      // If initial company provided, create the relation
      if (input.companyId) {
        await db.contactCompany.create({
          data: {
            contactId: contact.id,
            companyId: input.companyId,
            jobTitle: input.jobTitle || 'Team Member',
            department: input.department || null,
            isPrimary: true,
          }
        });
      }

      return res.status(201).json({
        success: true,
        data: contact,
        message: 'Contact created successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validation = updateContactSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid update data', validation.error.format());
      }

      const contact = await db.contact.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!contact) {
        throw new NotFoundError('Contact', id);
      }

      const updated = await db.contact.update({
        where: { id },
        data: (({ companyId, jobTitle, department, ...data }) => data)(validation.data),
      });

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Contact updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const contact = await db.contact.findFirst({
        where: { id, organizationId: req.user!.organizationId }
      });

      if (!contact) {
        throw new NotFoundError('Contact', id);
      }

      // Cascade remove relations
      await db.contactCompany.deleteMany({ where: { contactId: id } });
      await db.contact.delete({ where: { id } });

      return res.status(200).json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  // Capstone Challenge: Associate contact with an additional company
  public static async linkCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: contactId } = req.params;
      const validation = linkCompanySchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid company association payload', validation.error.format());
      }

      const organizationId = req.user!.organizationId;
      const contact = await db.contact.findFirst({ where: { id: contactId, organizationId } });
      if (!contact) throw new NotFoundError('Contact', contactId);

      const company = await db.company.findFirst({ where: { id: validation.data.companyId, organizationId } });
      if (!company) throw new NotFoundError('Company', validation.data.companyId);

      // Check if relation already exists
      const existing = await db.contactCompany.findFirst({
        where: { contactId, companyId: company.id }
      });

      if (existing) {
        throw new ConflictError(`Contact is already associated with company '${company.name}'.`);
      }

      // If set as primary, unmark previous primary relations
      if (validation.data.isPrimary) {
        const currentRels = await db.contactCompany.findMany({ where: { contactId } });
        for (const rel of currentRels) {
          if (rel.isPrimary) {
            await db.contactCompany.update({
              where: { id: rel.id },
              data: { isPrimary: false }
            });
          }
        }
      }

      const relation = await db.contactCompany.create({
        data: {
          contactId,
          companyId: company.id,
          jobTitle: validation.data.jobTitle,
          department: validation.data.department || null,
          isPrimary: validation.data.isPrimary,
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          ...relation,
          companyName: company.name,
        },
        message: `Successfully linked contact to ${company.name} as ${validation.data.jobTitle}.`
      });
    } catch (err) {
      next(err);
    }
  }

  // Capstone Challenge: Remove association between contact and company
  public static async unlinkCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: contactId, companyId } = req.params;
      const relation = await db.contactCompany.findFirst({
        where: { contactId, companyId }
      });

      if (!relation) {
        throw new NotFoundError('Contact Company Relationship');
      }

      await db.contactCompany.delete({ where: { id: relation.id } });

      return res.status(200).json({
        success: true,
        message: 'Company association removed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}
