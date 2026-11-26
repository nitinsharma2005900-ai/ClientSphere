import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || 'req-unknown';

  const code = (err as any).code;
  if (code === 'P2002') return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'A record with this unique value already exists.' }, requestId });
  if (code === 'P2003' || code === 'P2025' || code === 'P2004') return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A referenced record is unavailable.' }, requestId });
  if (err.name === 'MulterError' || (err as any).type === 'entity.parse.failed') return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or oversized request payload.' }, requestId });
  if (err instanceof AppError) {
    logger.warn(`Handled application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      requestId,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
      requestId,
    });
  }

  // Unhandled / system errors: mask details in production
  logger.error(`Unhandled internal server error: ${err.message}`, {
    stack: err.stack,
    requestId,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected internal error occurred. Please contact support with the requestId.' 
        : err.message,
    },
    requestId,
  });
};
