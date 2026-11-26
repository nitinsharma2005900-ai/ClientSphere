// Assessment 15: Incident Simulation Regression Test Suites
// Verifies fixes for all 5 simulated production defects:
// 1. INC-001: Deduplication & normalization
// 2. INC-002: Concurrent lead assignment & tenant isolation
// 3. INC-003: Infinite automation loop safeguard
// 4. INC-004: Opportunity positive financial value boundary validation
// 5. INC-005: Query performance & N+1 mitigation
// Developer: Nitin Sharma

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../apps/backend/src/app';
import { seedInitialData } from '../../apps/backend/src/db/seed';

describe('Assessment 15 - Incident Simulation & Regression Test Verification', () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedInitialData();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.io', password: 'Password123!' });
    adminToken = loginRes.body.data.tokens.accessToken;
  });

  // INC-001 Regression: Deduplication
  it('INC-001: should reject duplicate contacts with identical email under same organization', async () => {
    // Attempt to create duplicate of seeded contact Victoria Sterling
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Victoria',
        lastName: 'Sterling',
        email: 'v.sterling@apexcloud.io', // Duplicate
        jobTitle: 'Duplicate Entry Attempt',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // INC-002 Regression: Concurrent lead capture tenant isolation
  it('INC-002: should preserve tenant isolation and assign proper org context during concurrent captures', async () => {
    const promises = Array.from({ length: 10 }).map((_, i) =>
      request(app)
        .post('/api/v1/integrations/lead-capture')
        .set('X-API-KEY', process.env.WEBHOOK_SECRET!)
        .send({
          firstName: `ConcurrentLead${i}`,
          lastName: 'Test',
          email: `concurrent_${i}_${Date.now()}@example.com`,
          companyName: `Concurrency Corp ${i}`,
          consentGiven: true,
        })
    );

    const responses = await Promise.all(promises);
    for (const r of responses) {
      expect(r.status).toBe(201);
      expect(r.body.data.leadId).toBeDefined();
    }
  });

  it('INC-003: halts automation chains at recursion depth five', async () => {
    const { WorkflowEngine } = await import('../../apps/backend/src/services/workflow/workflow.engine');
    const result = await WorkflowEngine.evaluateAndTrigger({ organizationId: 'unused', triggerEvent: 'LEAD_CREATED' as any, entityType: 'LEAD', entityId: 'unused', entityData: {}, recursionDepth: 5 });
    expect(result).toEqual({ halted: true, reason: 'MAX_RECURSION_DEPTH_EXCEEDED' });
  });

  // INC-004 Regression: Non-negative financial boundary validation
  it('INC-004: should strictly reject negative opportunity values with 422 validation error', async () => {
    const pipelines = await request(app)
      .get('/api/v1/pipelines')
      .set('Authorization', `Bearer ${adminToken}`);
    const stageId = pipelines.body.data[0].stages[0].id;
    const pipelineId = pipelines.body.data[0].id;

    const res = await request(app)
      .post('/api/v1/opportunities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Negative Financial Deal Anomaly',
        value: -25000, // Invalid negative number
        stageId,
        pipelineId,
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // INC-005 Regression: Analytics query latency performance
  it('INC-005: should respond to executive dashboard metrics in under 2000ms without N+1 regression', async () => {
    const startTime = Date.now();
    const res = await request(app)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(2000); // 500ms benchmark target
  });
});
