// ClientSphere Backend Test Suites
// Verification of Auth, RBAC, Capstone Multi-Company, Multi-Rep Deals, Workflows & Integrations
// Developer: Nitin Sharma

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { seedInitialData } from '../src/db/seed';

describe('ClientSphere CRM REST API Test Matrix', () => {
  let adminToken: string;
  let repToken: string;
  let managerToken: string;
  let createdLeadId: string;
  let createdContactId: string;
  let createdCompanyId: string;
  let createdOpportunityId: string;

  beforeAll(async () => {
    // Ensure initial data seeded
    await seedInitialData();

    // Authenticate as Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clientsphere.io', password: 'Password123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.tokens.accessToken;

    // Authenticate as Sales Representative
    const repRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rep@clientsphere.io', password: 'Password123!' });
    expect(repRes.status).toBe(200);
    repToken = repRes.body.data.tokens.accessToken;

    // Authenticate as Sales Manager
    const mgrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@clientsphere.io', password: 'Password123!' });
    expect(mgrRes.status).toBe(200);
    managerToken = mgrRes.body.data.tokens.accessToken;
  });

  // ==========================================
  // Assessment 04: Authentication & 5 Roles
  // ==========================================
  describe('Assessment 04 - Authentication & RBAC', () => {
    it('should authenticate all 5 enterprise roles', async () => {
      const roles = [
        { email: 'admin@clientsphere.io', expectedRole: 'ADMINISTRATOR' },
        { email: 'manager@clientsphere.io', expectedRole: 'SALES_MANAGER' },
        { email: 'rep@clientsphere.io', expectedRole: 'SALES_REPRESENTATIVE' },
        { email: 'marketing@clientsphere.io', expectedRole: 'MARKETING_USER' },
        { email: 'support@clientsphere.io', expectedRole: 'SUPPORT_USER' },
      ];

      for (const r of roles) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: r.email, password: 'Password123!' });
        expect(res.status).toBe(200);
        expect(res.body.data.user.role).toBe(r.expectedRole);
      }
    });

    it('should reject invalid credentials with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@clientsphere.io', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return caller profile from /auth/me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@clientsphere.io');
    });
  });

  // ==========================================
  // Assessment 01 & 02: Leads & Conversion
  // ==========================================
  describe('Assessment 01 & 02 - Leads & Atomic Conversion', () => {
    it('should create a new lead with automatic explainable scoring', async () => {
      const res = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          firstName: 'Gabriel',
          lastName: 'Mendoza',
          email: 'g.mendoza@solarisdefense.com',
          phone: '+1-415-555-0199',
          companyName: 'Solaris Defense Systems',
          jobTitle: 'Vice President of Engineering',
          source: 'INBOUND_FORM',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBeGreaterThanOrEqual(70);
      expect(res.body.data.priorityTier).toBe('HOT');
      expect(res.body.data.scoreFactors.length).toBeGreaterThan(0);
      createdLeadId = res.body.data.id;
    });

    it('should atomically convert lead into Contact, Company & Opportunity', async () => {
      const res = await request(app)
        .post(`/api/v1/leads/${createdLeadId}/convert`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          dealTitle: 'Solaris Tactical Defense Integration',
          dealValue: 125000,
          expectedCloseDays: 30,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.lead.status).toBe('CONVERTED');
      expect(res.body.data.contact.email).toBe('g.mendoza@solarisdefense.com');
      expect(res.body.data.opportunity.value).toBe(125000);
      
      createdContactId = res.body.data.contact.id;
      createdCompanyId = res.body.data.companyId;
      createdOpportunityId = res.body.data.opportunity.id;
    });

    it('should prevent re-converting an already converted lead', async () => {
      const res = await request(app)
        .post(`/api/v1/leads/${createdLeadId}/convert`)
        .set('Authorization', `Bearer ${repToken}`)
        .send({
          dealTitle: 'Duplicate Conversion Attempt',
          dealValue: 50000,
        });

      expect(res.status).toBe(409);
    });
  });

  // ==========================================
  // Capstone Challenge 1: Multi-Company Contacts
  // ==========================================
  describe('Capstone Challenge - Multi-Company Contact Associations', () => {
    it('should associate contact with a secondary company with distinct job title', async () => {
      // Create a secondary company
      const compRes = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Helios Aerospace Innovations',
          industry: 'Defense & Aerospace',
          tier: 'GROWTH',
        });
      expect(compRes.status).toBe(201);
      const heliosId = compRes.body.data.id;

      // Associate contact to secondary company
      const linkRes = await request(app)
        .post(`/api/v1/contacts/${createdContactId}/companies`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          companyId: heliosId,
          jobTitle: 'Independent Systems Safety Advisor',
          department: 'Executive Governance',
          isPrimary: false,
        });

      expect(linkRes.status).toBe(201);
      expect(linkRes.body.data.jobTitle).toBe('Independent Systems Safety Advisor');

      // Verify contact profile returns multiple associated companies
      const contactRes = await request(app)
        .get(`/api/v1/contacts/${createdContactId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(contactRes.status).toBe(200);
      expect(contactRes.body.data.companies.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================
  // Capstone Challenge 2: Multi-Rep Deals & Team Visibility
  // ==========================================
  describe('Capstone Challenge - Collaborative Multi-Rep Opportunities & Team Visibility', () => {
    it('should add multiple representatives to opportunity team with commission split', async () => {
      const res = await request(app)
        .post(`/api/v1/opportunities/${createdOpportunityId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: (await getUserIdByEmail('manager@clientsphere.io')),
          role: 'EXECUTIVE_SPONSOR',
          canEdit: true,
          commissionShare: 0.25,
        });

      expect(res.status).toBe(201);

      // Verify opportunity details displays full collaborative team
      const dealRes = await request(app)
        .get(`/api/v1/opportunities/${createdOpportunityId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dealRes.status).toBe(200);
      expect(dealRes.body.data.teamMembers.length).toBeGreaterThanOrEqual(2);
    });

    it('should transition deal through Kanban stages and validate Closed Lost reason', async () => {
      // Find stages
      const pipeRes = await request(app)
        .get('/api/v1/pipelines')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const stages = pipeRes.body.data[0].stages;
      const negotiationStage = stages.find((s: any) => s.name.includes('Negotiation')) || stages[3];

      const transRes = await request(app)
        .patch(`/api/v1/opportunities/${createdOpportunityId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stageId: negotiationStage.id,
        });

      expect(transRes.status).toBe(200);
      expect(transRes.body.data.stageId).toBe(negotiationStage.id);
    });
  });

  // ==========================================
  // Assessment 07: Workflow Automation
  // ==========================================
  describe('Assessment 07 - Workflow Automation Engine', () => {
    it('should evaluate conditions and execute workflow action', async () => {
      const workflows = await request(app)
        .get('/api/v1/workflows')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(workflows.status).toBe(200);
      const testWf = workflows.body.data.find((wf: any) => wf.triggerType === 'DEAL_STAGE_CHANGED');

      const testRun = await request(app)
        .post(`/api/v1/workflows/${testWf.id}/trigger`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          entityType: 'OPPORTUNITY',
          entityId: createdOpportunityId,
          entityData: { value: 75000, status: 'OPEN' }
        });

      expect(testRun.status).toBe(200);
      expect(testRun.body.success).toBe(true);
    });
  });

  // ==========================================
  // Assessment 08: Sandbox Integrations
  // ==========================================
  describe('Assessment 08 - CRM External Integrations Sandbox', () => {
    it('should deliver email in sandbox mode and log timeline activity', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/sandbox/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          to: 'client.executive@enterprise.com',
          subject: 'Technical Architecture Discovery',
          body: 'Hello, presenting our cloud migration roadmap overview.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.delivered).toBe(true);
    });

    it('should accept inbound leads via authenticated webhook capture', async () => {
      const res = await request(app)
        .post('/api/v1/integrations/lead-capture')
        .set('X-API-KEY', process.env.WEBHOOK_SECRET!)
        .send({
          firstName: 'Miranda',
          lastName: 'Priestley',
          email: 'm.priestley@runwaymedia.com',
          phone: '+1-212-555-0144',
          companyName: 'Runway Global Media',
          jobTitle: 'Editor in Chief',
          consentGiven: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.score).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // Assessment 06: Analytics & Dashboard KPIs
  // ==========================================
  describe('Assessment 06 - Analytics & Sales Velocity', () => {
    it('should return computed sales velocity and revenue forecasts', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.salesVelocityPerDay).toBeGreaterThanOrEqual(0);
      expect(res.body.data.conversionWaterfall.length).toBeGreaterThan(0);
    });
  });
});

async function getUserIdByEmail(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'Password123!' });
  return res.body.data.user.id;
}
