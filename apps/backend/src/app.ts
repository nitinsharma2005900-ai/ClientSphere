// ClientSphere Express Application Setup
// Developer: Nitin Sharma

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';

export const app = express();
app.set('trust proxy', 1);

// Security and utility middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || config.corsOrigin.includes(origin));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Assign unique X-Request-ID to every incoming request
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${uuidv4()}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// HTTP Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
}

// Swagger / OpenAPI UI Documentation (Assessment 13)
const swaggerPath = [path.resolve(process.cwd(), 'docs/openapi.json'), path.resolve(process.cwd(), '../../docs/openapi.json')].find(p => fs.existsSync(p)) || '';
let swaggerDocument = { openapi: '3.0.0', info: { title: 'ClientSphere Enterprise API', version: '1.0.0' }, paths: {} };
if (fs.existsSync(swaggerPath)) {
  try {
    swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));
  } catch {}
}
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1/auth', rateLimit({ windowMs: 60_000, limit: process.env.NODE_ENV === 'test' ? 1000 : 60, standardHeaders: 'draft-7', legacyHeaders: false }));

// Mount Core API routes
app.use(config.apiPrefix, apiRouter);

// Root Welcome Endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'ClientSphere – Enterprise CRM, Sales Pipeline & Workflow Automation Platform API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    healthCheck: '/api/v1/health',
    developer: 'Nitin Sharma',
  });
});

app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found' } }));

// Centralized error handling middleware
app.use(errorHandler);

// Vercel Express function entry point; Docker continues to use server.ts.
export default app;
