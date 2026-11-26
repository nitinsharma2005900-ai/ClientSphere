import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { ValidationError, ForbiddenError } from '../utils/errors';

export class RecordsController {
  static async updateOpportunity(req: Request, res: Response, next: NextFunction) {
    try {
      const schema = z.object({ title: z.string().trim().min(1).optional(), value: z.number().finite().min(0).optional(), currency: z.string().length(3).optional(), expectedCloseDate: z.string().refine(value => Number.isFinite(Date.parse(value))).optional(), probability: z.number().min(0).max(1).optional() });
      const result = schema.safeParse(req.body);
      if (!result.success) throw new ValidationError('Invalid opportunity update', result.error.format());
      if (result.data.probability !== undefined && req.user!.role === 'SALES_REPRESENTATIVE') throw new ForbiddenError('Only managers may override stage probability.');
      const data = { ...result.data, expectedCloseDate: result.data.expectedCloseDate ? new Date(result.data.expectedCloseDate) : undefined };
      res.json({ success: true, data: await db.opportunity.update({ where: { id: req.params.id }, data }) });
    } catch (error) { next(error); }
  }
  static async deleteOpportunity(req: Request, res: Response, next: NextFunction) {
    try { await db.opportunity.delete({ where: { id: req.params.id } }); res.json({ success: true, message: 'Opportunity deleted' }); }
    catch (error) { next(error); }
  }
  static async updatePipeline(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = z.object({ name: z.string().trim().min(1).optional(), isDefault: z.boolean().optional() }).safeParse(req.body);
      if (!parsed.success) throw new ValidationError('Invalid pipeline update');
      const result = await db.$transaction(async tx => {
        if (parsed.data.isDefault) await tx.pipeline.updateMany({ where: { organizationId: req.user!.organizationId }, data: { isDefault: false } });
        return tx.pipeline.update({ where: { id: req.params.id }, data: parsed.data });
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
  static async deletePipeline(req: Request, res: Response, next: NextFunction) {
    try {
      if (await db.opportunity.count({ where: { pipelineId: req.params.id } })) throw new ValidationError('Move or delete the pipeline opportunities first.');
      await db.pipeline.delete({ where: { id: req.params.id } }); res.json({ success: true });
    } catch (error) { next(error); }
  }
}
