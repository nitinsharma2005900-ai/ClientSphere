import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:local_test_only@127.0.0.1:5432/clientsphere_test';
process.env.NODE_ENV = 'test';
process.env.WEBHOOK_SECRET ||= 'test-webhook-secret-with-at-least-32-characters';
if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Tests require a dedicated database ending in _test');
beforeAll(async () => {
  const { db } = await import('../src/db/client');
  await db.organization.deleteMany();
});
afterAll(async () => {
  const { db } = await import('../src/db/client');
  await db.$disconnect();
});
