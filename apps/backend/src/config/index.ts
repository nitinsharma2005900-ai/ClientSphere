import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../..', '.env') });
import crypto from 'crypto';
function secret(name: string) {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 32)) throw new Error(`${name} must contain at least 32 characters in production`);
  return value || crypto.randomBytes(32).toString('hex');
}
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  apiPrefix: '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(x => x.trim()),
  jwt: { secret: secret('JWT_SECRET'), expiresIn: process.env.JWT_EXPIRES_IN || '15m', refreshSecret: secret('JWT_REFRESH_SECRET'), refreshExpiresIn: '7d' },
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',
  integrations: { webhookSecret: secret('WEBHOOK_SECRET') },
};
