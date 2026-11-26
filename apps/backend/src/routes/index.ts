// ClientSphere Primary REST API Router
// Developer: Nitin Sharma

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, requireRole, enforceTenant } from '../middlewares/auth.middleware';
import { logAudit } from '../middlewares/audit.middleware';
import { UserRole } from '@clientsphere/shared-types';

import { AuthController } from '../controllers/auth.controller';
import { LeadController } from '../controllers/lead.controller';
import { ContactController } from '../controllers/contact.controller';
import { CompanyController } from '../controllers/company.controller';
import { OpportunityController } from '../controllers/opportunity.controller';
import { ActivityController } from '../controllers/activity.controller';
import { TaskController } from '../controllers/task.controller';
import { PipelineController } from '../controllers/pipeline.controller';
import { WorkflowController } from '../controllers/workflow.controller';
import { IntegrationController } from '../controllers/integration.controller';
import { ImportController } from '../controllers/import.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AuditController } from '../controllers/audit.controller';
import { enforcePolicy } from '../middlewares/policy.middleware';
import { RecordsController } from '../controllers/records.controller';
import { db } from '../db/client';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// ==========================================
// System Health & Readiness Endpoints
// ==========================================
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'ClientSphere Core Backend',
    version: '1.0.0',
  });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    await db.organization.findFirst();
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err: any) {
    res.status(503).json({ status: 'unready', error: 'Database is unavailable' });
  }
});

// ==========================================
// Authentication Routes (Public)
// ==========================================
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh', AuthController.refresh);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', authenticate, AuthController.me);

// ==========================================
// Webhook Integrations (Public with secret / API key)
// ==========================================
router.post('/integrations/lead-capture', IntegrationController.handleWebToLeadWebhook);

// ==========================================
// Authenticated & Tenant Scoped Routes
// ==========================================
router.use(authenticate);
router.use(enforceTenant);
router.use(enforcePolicy);

// Users Directory (For assigning owners and team members)
router.get('/users', async (req: Request, res: Response) => {
  const users = await db.user.findMany({
    where: { organizationId: req.user!.organizationId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, department: true }
  });
  res.status(200).json({ success: true, data: users });
});

// Leads
router.get('/leads', LeadController.list);
router.get('/leads/:id', logAudit('READ', 'LEAD', true), LeadController.getById);
router.post('/leads', logAudit('CREATE', 'LEAD'), LeadController.create);
router.put('/leads/:id', logAudit('UPDATE', 'LEAD'), LeadController.update);
router.delete('/leads/:id', logAudit('DELETE', 'LEAD'), LeadController.delete);
router.post('/leads/:id/convert', logAudit('CONVERT', 'LEAD'), LeadController.convert);

// Contacts
router.get('/contacts', ContactController.list);
router.get('/contacts/:id', logAudit('READ', 'CONTACT', true), ContactController.getById);
router.post('/contacts', logAudit('CREATE', 'CONTACT'), ContactController.create);
router.put('/contacts/:id', logAudit('UPDATE', 'CONTACT'), ContactController.update);
router.delete('/contacts/:id', logAudit('DELETE', 'CONTACT'), ContactController.delete);
// Capstone Challenge: Multi-company associations
router.post('/contacts/:id/companies', logAudit('LINK_COMPANY', 'CONTACT'), ContactController.linkCompany);
router.delete('/contacts/:id/companies/:companyId', logAudit('UNLINK_COMPANY', 'CONTACT'), ContactController.unlinkCompany);

// Companies
router.get('/companies', CompanyController.list);
router.get('/companies/:id', CompanyController.getById);
router.post('/companies', logAudit('CREATE', 'COMPANY'), CompanyController.create);
router.put('/companies/:id', logAudit('UPDATE', 'COMPANY'), CompanyController.update);
router.delete('/companies/:id', logAudit('DELETE', 'COMPANY'), CompanyController.delete);

// Opportunities (Deals) & Kanban
router.get('/opportunities', OpportunityController.list);
router.get('/opportunities/:id', OpportunityController.getById);
router.post('/opportunities', logAudit('CREATE', 'OPPORTUNITY'), OpportunityController.create);
router.patch('/opportunities/:id/stage', logAudit('TRANSITION_STAGE', 'OPPORTUNITY'), OpportunityController.updateStage);
// Capstone Challenge: Multi-representative Collaboration
router.post('/opportunities/:id/members', logAudit('ADD_TEAM_MEMBER', 'OPPORTUNITY'), OpportunityController.addTeamMember);
router.delete('/opportunities/:id/members/:userId', logAudit('REMOVE_TEAM_MEMBER', 'OPPORTUNITY'), OpportunityController.removeTeamMember);

router.put('/opportunities/:id', logAudit('UPDATE', 'OPPORTUNITY'), RecordsController.updateOpportunity);
router.delete('/opportunities/:id', logAudit('DELETE', 'OPPORTUNITY'), RecordsController.deleteOpportunity);

// Pipelines & Stages
router.get('/pipelines', PipelineController.list);
router.get('/pipelines/:id', PipelineController.getById);
router.post('/pipelines', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), PipelineController.create);

router.put('/pipelines/:id', RecordsController.updatePipeline);
router.delete('/pipelines/:id', RecordsController.deletePipeline);

// Activities & Timeline
router.get('/activities', ActivityController.list);
router.get('/activities/:id', logAudit('READ', 'ACTIVITY', true), async (req, res, next) => {
  try { res.json({ success: true, data: await db.activity.findUnique({ where: { id: req.params.id } }) }); } catch (error) { next(error); }
});
router.post('/activities', ActivityController.create);
router.put('/activities/:id', logAudit('UPDATE', 'ACTIVITY'), RecordsController.updateActivity);
router.delete('/activities/:id', ActivityController.delete);

// Tasks
router.get('/tasks', TaskController.list);
router.get('/tasks/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await db.task.findUnique({ where: { id: req.params.id } }) }); } catch (error) { next(error); }
});
router.post('/tasks', TaskController.create);
router.put('/tasks/:id', TaskController.update);
router.delete('/tasks/:id', TaskController.delete);

// Workflow Automation Rules (Assessment 07)
router.get('/workflows', WorkflowController.list);
router.get('/workflows/executions', WorkflowController.listExecutions);
router.post('/workflows/executions/:executionId/retry', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), async (req, res, next) => {
  try {
    const execution = await db.workflowExecution.findFirst({ where: { id: req.params.executionId, organizationId: req.user!.organizationId, status: 'FAILED' } });
    if (!execution) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Failed execution not found' } });
    await db.workflowExecution.update({ where: { id: execution.id }, data: { status: 'QUEUED', retryCount: 0, error: null, availableAt: new Date() } });
    res.json({ success: true, data: { id: execution.id, status: 'QUEUED' } });
  } catch (error) { next(error); }
});
router.get('/workflows/:id', WorkflowController.getById);
router.post('/workflows', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), logAudit('CREATE', 'WORKFLOW'), WorkflowController.create);
router.put('/workflows/:id', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), logAudit('UPDATE', 'WORKFLOW'), WorkflowController.update);
router.delete('/workflows/:id', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), logAudit('DELETE', 'WORKFLOW'), WorkflowController.delete);
router.post('/workflows/:id/trigger', WorkflowController.testTrigger);

// Integrations Sandbox (Assessment 08)
router.get('/integrations/status', IntegrationController.getStatus);
router.post('/integrations/sandbox/email', IntegrationController.sendSandboxEmail);
router.post('/integrations/sandbox/calendar', IntegrationController.scheduleSandboxMeeting);
router.post('/integrations/sandbox/telephony', IntegrationController.triggerTelephonyCall);

// CSV Lead Import Engine (Assessment 05)
router.post('/imports/upload', upload.single('file'), logAudit('CSV_IMPORT', 'LEAD'), ImportController.uploadLeadsCsv);
router.get('/imports/jobs', ImportController.listJobs);

// Analytics & Forecasting (Assessment 06)
router.get('/analytics/dashboard', AnalyticsController.getDashboardMetrics);
router.get('/analytics/forecast', AnalyticsController.getForecast);
router.get('/analytics/forecast/pdf', AnalyticsController.downloadPdf);

// Audit Logs (Assessment 04 - Admins & Managers)
router.get('/audit-logs', requireRole([UserRole.ADMINISTRATOR, UserRole.SALES_MANAGER]), AuditController.list);

export default router;
