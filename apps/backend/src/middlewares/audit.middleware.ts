import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { logger } from '../utils/logger';

export const logAudit = (action: string, entityType: string, isSensitive: boolean = false) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture the original response json to capture created/modified entity IDs
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      const entityId = body?.data?.id || req.params.id || 'N/A';
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;

      if (organizationId && res.statusCode < 400) {
        db.auditLog.create({
          data: {
            userId: userId || null,
            action,
            entityType,
            entityId: String(entityId),
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
            userAgent: req.headers['user-agent'] || 'ClientSphere-API-Client',
            sensitiveFieldAccessed: isSensitive,
            organizationId,
            changes: req.method !== 'GET' ? (req.body ? sanitizeSensitiveData(req.body) : {}) : {},
          }
        }).catch((err: any) => {
          logger.warn(`Failed to write audit log asynchronously: ${err.message}`);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

const sanitizeSensitiveData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const clone = { ...data };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'ssn', 'creditCard'];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
};
