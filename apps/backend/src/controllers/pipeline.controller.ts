// ClientSphere Pipeline & Stage Management Controller
// Configurable Pipelines, Stage Win Probabilities, and Kanban Columns
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required'),
  isDefault: z.boolean().default(false),
  stages: z.array(z.object({
    name: z.string().min(1),
    order: z.number().int().min(0),
    winProbability: z.number().min(0).max(1),
    color: z.string().default('#7C3AED'),
  })).min(1, 'At least one stage is required'),
});

export class PipelineController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const pipelines = await db.pipeline.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      });

      const enriched = await Promise.all(
        pipelines.map(async (pipe: any) => {
          const stages = await db.pipelineStage.findMany({
            where: { pipelineId: pipe.id },
            orderBy: { order: 'asc' },
          });

          // Compute opportunity count and total value per stage
          const stagesWithMetrics = await Promise.all(
            stages.map(async (stage: any) => {
              const deals = await db.opportunity.findMany({
                where: { stageId: stage.id, organizationId }
              });
              const totalValue = deals.reduce((acc: number, d: any) => acc + (d.value || 0), 0);
              return {
                ...stage,
                dealCount: deals.length,
                totalValue,
              };
            })
          );

          return {
            ...pipe,
            stages: stagesWithMetrics,
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

      const pipeline = await db.pipeline.findFirst({
        where: { id, organizationId }
      });

      if (!pipeline) {
        throw new NotFoundError('Pipeline', id);
      }

      const stages = await db.pipelineStage.findMany({
        where: { pipelineId: id },
        orderBy: { order: 'asc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          ...pipeline,
          stages,
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createPipelineSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Pipeline validation failed', validation.error.format());
      }

      const { name, isDefault, stages } = validation.data;
      const organizationId = req.user!.organizationId;

      const pipeline = await db.$transaction(async tx => {
        if (isDefault) await tx.pipeline.updateMany({ where: { organizationId }, data: { isDefault: false } });
        return tx.pipeline.create({ data: { name, isDefault, organizationId, stages: { create: stages } }, include: { stages: true } });
      });
      const createdStages = pipeline.stages;

      return res.status(201).json({
        success: true,
        data: {
          ...pipeline,
          stages: createdStages,
        },
        message: 'Pipeline created successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}
