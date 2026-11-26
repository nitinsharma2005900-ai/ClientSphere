// ClientSphere Audit Log Controller
// Compliance, Sensitive Field Access Audit & Entity Change History
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';

export class AuditController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        db.auditLog.findMany({
          where: { organizationId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.auditLog.count({ where: { organizationId } }),
      ]);

      const enriched = await Promise.all(
        logs.map(async (log: any) => {
          const user = log.userId ? await db.user.findUnique({ where: { id: log.userId } }) : null;
          return {
            ...log,
            userName: user ? `${user.firstName} ${user.lastName}` : 'System Agent',
            userRole: user?.role || 'SYSTEM',
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
}
