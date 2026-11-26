import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from '../src/app';
import { db } from '../src/db/client';
import { seedInitialData } from '../src/db/seed';
import { AuthService } from '../src/services/auth.service';
import { WorkflowEngine } from '../src/services/workflow/workflow.engine';

describe('Production security, persistence and worker checks', () => {
  const tokens: Record<string, string> = {};
  let foreignCompany: any, foreignContact: any, managerLead: any, rep: any, admin: any, pipeline: any;
  let worker: ChildProcess;
  const api = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, role = 'admin') => request(app)[method](`/api/v1${endpoint}`).set('Authorization', `Bearer ${tokens[role]}`);
  beforeAll(async () => {
    await seedInitialData();
    for (const role of ['admin', 'manager', 'rep', 'marketing', 'support']) {
      const response = await request(app).post('/api/v1/auth/login').send({ email: `${role}@clientsphere.io`, password: 'Password123!' });
      tokens[role] = response.body.data.tokens.accessToken;
    }
    admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@clientsphere.io' } });
    rep = await db.user.findUniqueOrThrow({ where: { email: 'rep@clientsphere.io' } });
    pipeline = await db.pipeline.findFirstOrThrow({ include: { stages: { orderBy: { order: 'asc' } } } });
    const org = await db.organization.create({ data: { name: 'Isolation test tenant', domain: 'isolation.test' } });
    foreignCompany = await db.company.create({ data: { name: 'Hidden company', organizationId: org.id } });
    foreignContact = await db.contact.create({ data: { firstName: 'Hidden', lastName: 'Person', email: 'hidden@isolation.test', organizationId: org.id } });
    managerLead = await db.lead.create({ data: { firstName: 'Manager', lastName: 'Private', email: 'manager-private@example.com', ownerId: admin.id, organizationId: admin.organizationId } });
    worker = spawn(process.execPath, [path.resolve(__dirname, '../dist/worker.js')], { env: { ...process.env, PORT: '4002' }, stdio: 'ignore' });
  });
  afterAll(async () => { worker?.kill(); });

  it('rejects unauthenticated access', async () => expect((await request(app).get('/api/v1/leads')).status).toBe(401));
  it('never returns password hashes in the user directory', async () => {
    const response = await api('get', '/users');
    expect(response.status).toBe(200); expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
  it('rejects forged webhook keys containing the old accepted prefix', async () => expect((await request(app).post('/api/v1/integrations/lead-capture').set('X-API-Key', 'whsec_forged').send({})).status).toBe(401));
  it('does not grant CORS permission to an arbitrary website', async () => expect((await request(app).get('/api/v1/health').set('Origin', 'https://evil.example')).headers['access-control-allow-origin']).toBeUndefined());
  it('hides another organization records', async () => expect((await api('get', `/companies/${foreignCompany.id}`)).status).toBe(404));
  it('rejects foreign company associations on contact creation without partial writes', async () => {
    const result = await api('post', '/contacts').send({ firstName: 'Test', lastName: 'Person', email: 'foreign-association@example.com', companyId: foreignCompany.id });
    expect(result.status).toBe(404); expect(await db.contact.count({ where: { email: 'foreign-association@example.com' } })).toBe(0);
  });
  it('protects unlink operations from cross-tenant IDs', async () => expect((await api('delete', `/contacts/${foreignContact.id}/companies/${foreignCompany.id}`)).status).toBe(404));
  it('prevents a representative from editing another owner lead', async () => expect((await api('put', `/leads/${managerLead.id}`, 'rep').send({ jobTitle: 'Stolen' })).status).toBe(403));
  it('prevents support from creating leads', async () => expect((await api('post', '/leads', 'support').send({ firstName: 'X', lastName: 'Y', email: 'support@example.com' })).status).toBe(403));
  it('prevents marketing users from creating deals', async () => expect((await api('post', '/opportunities', 'marketing').send({})).status).toBe(403));
  it('restricts audit records to managers and administrators', async () => expect((await api('get', '/audit-logs', 'rep')).status).toBe(403));
  it('validates pagination and enum filters', async () => {
    expect((await api('get', '/leads?limit=-5')).status).toBe(422);
    expect((await api('get', '/leads?status=invalid')).status).toBe(422);
  });
  it('rejects invalid dates with a validation error', async () => expect((await api('post', '/tasks').send({ title: 'Invalid date', dueDate: 'nonsense' })).status).toBe(422));
  it('reads individual tasks and updates activity status with validated fields', async () => {
    const task = await api('post', '/tasks').send({ title: 'Task profile verification' });
    expect((await api('get', `/tasks/${task.body.data.id}`)).status).toBe(200);
    const activity = await api('post', '/activities').send({ subject: 'Activity edit verification', status: 'PLANNED' });
    const update = await api('put', `/activities/${activity.body.data.id}`).send({ subject: 'Updated activity', status: 'COMPLETED' });
    expect(update.status).toBe(200);
    expect(update.body.data.completedAt).toBeTruthy();
    expect((await api('get', `/activities/${activity.body.data.id}`)).body.data.subject).toBe('Updated activity');
    expect((await api('put', `/activities/${activity.body.data.id}`).send({ dueDate: 'invalid' })).status).toBe(422);
  });
  it('rejects a stage from another pipeline', async () => {
    const other = await db.pipeline.create({ data: { name: 'Other pipeline', organizationId: admin.organizationId, stages: { create: { name: 'Other', order: 0 } } }, include: { stages: true } });
    expect((await api('post', '/opportunities').send({ title: 'Wrong stage', value: 100, pipelineId: pipeline.id, stageId: other.stages[0].id })).status).toBe(422);
  });
  it('allows read-only collaborators to view but prevents editing', async () => {
    const deal = await db.opportunity.create({ data: { title: 'Read only', organizationId: admin.organizationId, ownerId: admin.id, pipelineId: pipeline.id, stageId: pipeline.stages[0].id, teamMembers: { create: { userId: rep.id, canEdit: false } } } });
    expect((await api('get', `/opportunities/${deal.id}`, 'rep')).status).toBe(200);
    expect((await api('patch', `/opportunities/${deal.id}/stage`, 'rep').send({ stageId: pipeline.stages[1].id })).status).toBe(403);
  });
  it('converts concurrent requests exactly once under a database row lock', async () => {
    const lead = await api('post', '/leads', 'rep').send({ firstName: 'Concurrent', lastName: 'Conversion', email: 'convert-once@example.com' });
    expect(lead.status).toBe(201);
    const responses = await Promise.all([1,2].map(() => api('post', `/leads/${lead.body.data.id}/convert`, 'rep').send({ dealTitle: 'Exactly once conversion', dealValue: 1000 })));
    expect(responses.map(response => response.status).sort()).toEqual([200,409]);
    expect(await db.opportunity.count({ where: { title: 'Exactly once conversion' } })).toBe(1);
  });
  it('imports quoted CSV fields, reports invalid rows, and is safe to retry', async () => {
    const csv = 'firstName,lastName,email,companyName,phone\nCSV,Person,csv@example.com,"Acme, Inc",(415) 555-0192\nCSV,Person,csv@example.com,"Acme, Inc",(415) 555-0192\nBad,Row,invalid,Acme,\n';
    const upload = () => api('post', '/imports/upload', 'marketing').attach('file', Buffer.from(csv), 'leads.csv');
    const first = await upload(); expect(first.status).toBe(200);
    expect(first.body.data.report).toMatchObject({ successCount: 1, duplicateCount: 1, errorCount: 1 });
    const lead = await db.lead.findFirstOrThrow({ where: { email: 'csv@example.com' } }); expect(lead.companyName).toBe('Acme, Inc'); expect(lead.phone).toBe('+14155550192');
    const retry = await upload(); expect(retry.body.data.report.successCount).toBe(0);
  });
  it('returns useful errors for a missing upload and malformed JSON', async () => {
    expect((await api('post', '/imports/upload').send({})).status).toBe(422);
    expect((await api('post', '/leads').set('Content-Type', 'application/json').send('{')).status).toBe(422);
  });
  it('produces a real PDF with database forecast content', async () => {
    const result = await api('get', '/analytics/forecast/pdf'); expect(result.status).toBe(200); expect(result.headers['content-type']).toContain('application/pdf'); expect(result.body.subarray(0,5).toString()).toBe('%PDF-');
  });
  it('revokes refresh tokens on logout', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'rep@clientsphere.io', password: 'Password123!' });
    const refreshToken = login.body.data.tokens.refreshToken;
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(200);
    await request(app).post('/api/v1/auth/logout').send({ refreshToken });
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken })).status).toBe(401);
  });
  it('executes a durable delayed workflow through the real Redis consumer exactly once', async () => {
    const workflow = await db.workflow.create({ data: { name: 'Queue verification', triggerType: 'LEAD_CREATED', triggerConfig: { delaySeconds: 1 }, conditions: [], actions: [{ type: 'CREATE_TASK', params: { title: 'Verified delayed automation' } }], organizationId: admin.organizationId } });
    const lead = await db.lead.findFirstOrThrow({ where: { organizationId: admin.organizationId } });
    const context = { organizationId: admin.organizationId, triggerEvent: 'LEAD_CREATED' as const, workflowId: workflow.id, entityType: 'LEAD' as const, entityId: lead.id, entityData: lead, userId: admin.id, eventId: 'stable-verification-event' };
    const [execution] = await WorkflowEngine.evaluateAndTrigger(context) as any[];
    await WorkflowEngine.evaluateAndTrigger(context);
    expect(await db.workflowExecution.count({ where: { workflowId: workflow.id } })).toBe(1);
    expect(await db.task.count({ where: { title: 'Verified delayed automation' } })).toBe(0);
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await db.workflowExecution.findUnique({ where: { id: execution.id } }))?.status === 'COMPLETED') break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    expect((await db.workflowExecution.findUnique({ where: { id: execution.id } }))?.status).toBe('COMPLETED');
    await WorkflowEngine.execute(execution.id);
    expect(await db.task.count({ where: { title: 'Verified delayed automation' } })).toBe(1);
  });
  it('fails unsafe workflow fields without changing tenant or creating partial tasks', async () => {
    const lead = await db.lead.findFirstOrThrow({ where: { organizationId: admin.organizationId } });
    const workflow = await db.workflow.create({ data: { name: 'Invalid field', triggerType: 'LEAD_CREATED', actions: [{ type: 'CREATE_TASK', params: { title: 'Must roll back' } }, { type: 'UPDATE_FIELD', params: { field: 'organizationId', value: foreignCompany.organizationId } }], organizationId: admin.organizationId } });
    const [execution] = await WorkflowEngine.evaluateAndTrigger({ organizationId: admin.organizationId, triggerEvent: 'LEAD_CREATED', entityType: 'LEAD', entityId: lead.id, entityData: lead, workflowId: workflow.id, userId: admin.id }) as any[];
    await expect(WorkflowEngine.execute(execution.id)).rejects.toThrow('not writable');
    expect(await db.task.count({ where: { title: 'Must roll back' } })).toBe(0);
    expect((await db.lead.findUnique({ where: { id: lead.id } }))?.organizationId).toBe(admin.organizationId);
  });
});
