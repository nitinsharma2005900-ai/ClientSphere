import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { db } from '../db/client';
import { ValidationError } from '../utils/errors';
import { intelligence } from '../services/intelligence';
import { WorkflowEngine } from '../services/workflow/workflow.engine';
import { TriggerType } from '@clientsphere/shared-types';

export class ImportController {
  static async uploadLeadsCsv(req: Request, res: Response, next: NextFunction) {
    let job: any;
    try {
      if (!req.file) throw new ValidationError('A CSV file is required.');
      const rows: any[] = [];
      const aliases: Record<string, string> = { firstname: 'firstName', fname: 'firstName', lastname: 'lastName', lname: 'lastName', company: 'companyName', companyname: 'companyName', jobtitle: 'jobTitle', title: 'jobTitle', mobile: 'phone' };
      const parser = Readable.from(req.file.buffer).pipe(csv({ strict: true, mapHeaders: ({ header }) => {
        const key = header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[ _-]/g, '');
        return aliases[key] || key;
      } }));
      try { for await (const row of parser) { rows.push(row); if (rows.length > 2000) throw new Error('CSV imports are limited to 2,000 rows.'); } }
      catch (error: any) { throw new ValidationError(error.message || 'Malformed CSV'); }
      if (!rows.length || !('email' in rows[0])) throw new ValidationError('CSV requires an email header and at least one row.');
      const organizationId = req.user!.organizationId;
      job = await db.leadImportJob.create({ data: { fileName: req.file.originalname, totalRows: rows.length, status: 'PROCESSING', organizationId, userId: req.user!.id } });
      const processed = await intelligence('/leads/process-batch', { leads: rows });
      const existing = await db.lead.findMany({ where: { organizationId }, select: { email: true } });
      const contacts = await db.contact.findMany({ where: { organizationId }, select: { email: true } });
      const emails = new Set([...existing, ...contacts].map(r => r.email.toLowerCase()));
      let imported = 0, duplicates = 0;
      const duplicateRows: any[] = [];
      for (const row of processed.leads) {
        if (row.duplicate || emails.has(row.email)) { duplicates++; duplicateRows.push({ email: row.email, reason: row.duplicate || 'EXACT_EMAIL' }); continue; }
        try {
          await db.$transaction(async (tx: any) => {
            const lead = await tx.lead.create({ data: { firstName: row.firstName, lastName: row.lastName, email: row.email, phone: row.phone || null, companyName: row.companyName || null, jobTitle: row.jobTitle || null, score: row.score, priorityTier: row.priorityTier, scoreFactors: row.factors, source: 'CSV_IMPORT', ownerId: req.user!.id, organizationId } });
            await WorkflowEngine.evaluateAndTrigger({ organizationId, triggerEvent: TriggerType.LEAD_CREATED, entityType: 'LEAD', entityId: lead.id, entityData: lead, userId: req.user!.id }, tx);
          });
          imported++; emails.add(row.email);
        } catch (error: any) { if (error.code === 'P2002') duplicates++; else throw error; }
      }
      const report = { totalProcessed: rows.length, successCount: imported, duplicateCount: duplicates, errorCount: processed.errors.length, duplicates: duplicateRows, errors: processed.errors, summary: `${imported} leads imported; ${duplicates} duplicates; ${processed.errors.length} invalid rows.` };
      await db.leadImportJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', importedRows: imported, duplicateRows: duplicates, errorRows: processed.errors.length, validationReport: report } });
      res.json({ success: true, data: { jobId: job.id, report } });
    } catch (error) {
      if (job) await db.leadImportJob.update({ where: { id: job.id }, data: { status: 'FAILED', validationReport: { error: 'Processing failed; retry safely to import remaining rows.' } } }).catch(() => {});
      next(error);
    }
  }
  static async listJobs(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await db.leadImportJob.findMany({ where: { organizationId: req.user!.organizationId }, orderBy: { createdAt: 'desc' }, take: 100 }) }); }
    catch (error) { next(error); }
  }
}
