// ClientSphere Integrations Controller
// Email/Calendar Sandbox, Telephony Mock & Webhook Lead Capture
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { NotFoundError, ValidationError, UnauthorizedError } from '../utils/errors';
import { ActivityType, ActivityStatus, LeadSource, LeadStatus } from '@clientsphere/shared-types';
import { calculateDeterministicScore } from './lead.controller';
import { z } from 'zod';
import crypto from 'crypto';
import { config } from '../config';
import { intelligence } from '../services/intelligence';
import { WorkflowEngine } from '../services/workflow/workflow.engine';
import { TriggerType } from '@clientsphere/shared-types';

const emailSandboxSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
});

const calendarSandboxSchema = z.object({
  title: z.string().min(1),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(30),
  attendeeEmail: z.string().email(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
});

const telephonyMockSchema = z.object({
  phoneNumber: z.string().min(5),
  direction: z.enum(['INBOUND', 'OUTBOUND']).default('OUTBOUND'),
  durationSeconds: z.number().int().min(0).max(86400).default(145),
  notes: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
});

const leadCaptureWebhookSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  consentGiven: z.boolean().default(false),
  sourceParam: z.string().optional(),
});

export class IntegrationController {
  public static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;

      const counts = await db.activity.groupBy({ by: ['type'], where: { organizationId }, _count: true });
      const count = (type: string) => counts.find(row => row.type === type)?._count || 0;
      return res.status(200).json({
        success: true,
        data: {
          emailSandbox: { status: 'ONLINE', mode: 'SANDBOX', simulatedSentCount: count('EMAIL') },
          calendarSandbox: { status: 'ONLINE', mode: 'SANDBOX', syncedEventsCount: count('MEETING') },
          telephonyMock: { status: 'ONLINE', provider: 'TwilioMock/WebRTC', simulatedCallCount: count('CALL') },
          leadCaptureWebhook: {
            status: 'ACTIVE',
            endpoint: '/api/v1/integrations/lead-capture',
            secured: 'API_KEY_OR_WEBHOOK_SECRET',
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // Email Sandbox Simulation
  public static async sendSandboxEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = emailSandboxSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid email payload', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const activity = await db.activity.create({
        data: {
          type: ActivityType.EMAIL,
          subject: `[Sent Email] ${input.subject}`,
          description: input.body,
          status: ActivityStatus.COMPLETED,
          leadId: input.leadId || null,
          contactId: input.contactId || null,
          opportunityId: input.opportunityId || null,
          userId: req.user!.id,
          organizationId,
          metadata: {
            sandbox: true,
            recipient: input.to,
            threadId: `th_${Date.now()}`,
            messageId: `msg_${Math.random().toString(36).substring(7)}`,
            deliveryReceipt: '250 2.0.0 OK Message Accepted',
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          activityId: activity.id,
          recipient: input.to,
          delivered: true,
          sandboxDeliveryTimeMs: 42,
        },
        message: `Email successfully delivered to ${input.to} via sandbox.`
      });
    } catch (err) {
      next(err);
    }
  }

  // Calendar Sandbox Simulation
  public static async scheduleSandboxMeeting(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = calendarSandboxSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid calendar payload', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;
      const eventDate = new Date(input.startTime);

      const activity = await db.activity.create({
        data: {
          type: ActivityType.MEETING,
          subject: `[Meeting] ${input.title}`,
          description: `Scheduled meeting with ${input.attendeeEmail} for ${input.durationMinutes} minutes.`,
          status: ActivityStatus.PLANNED,
          dueDate: eventDate,
          leadId: input.leadId || null,
          contactId: input.contactId || null,
          opportunityId: input.opportunityId || null,
          userId: req.user!.id,
          organizationId,
          metadata: {
            calendarSynced: true,
            durationMinutes: input.durationMinutes,
            attendeeEmail: input.attendeeEmail,
            calendarEventLink: `https://calendar.clientsphere.internal/events/${Date.now()}`,
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          activityId: activity.id,
          eventDate,
          calendarEventId: `evt_${Date.now()}`,
        },
        message: 'Meeting successfully synchronized to sandbox calendar.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Telephony Mock & Call Simulation
  public static async triggerTelephonyCall(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = telephonyMockSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid telephony call data', validation.error.format());
      }

      const input = validation.data;
      const organizationId = req.user!.organizationId;

      const activity = await db.activity.create({
        data: {
          type: ActivityType.CALL,
          subject: `[${input.direction} Call] ${input.phoneNumber}`,
          description: input.notes || `Simulated ${input.direction} phone call (${input.durationSeconds}s duration).`,
          status: ActivityStatus.COMPLETED,
          leadId: input.leadId || null,
          contactId: input.contactId || null,
          userId: req.user!.id,
          organizationId,
          metadata: {
            telephonyMock: true,
            direction: input.direction,
            durationSeconds: input.durationSeconds,
            callSid: `CA_${Math.random().toString(36).substring(2, 14)}`,
            recordingUrl: `https://telephony-mock.clientsphere.internal/recordings/call_${Date.now()}.mp3`,
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          activityId: activity.id,
          callStatus: 'COMPLETED',
          duration: `${input.durationSeconds} seconds`,
          simulatedRecording: true,
        },
        message: 'Telephony call mock completed and logged to activity timeline.'
      });
    } catch (err) {
      next(err);
    }
  }

  // Webhook Lead-Capture Endpoint (Public with API Key / Secret)
  public static async handleWebToLeadWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate webhook secret or API key from header
      const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
      const configuredSecret = config.integrations.webhookSecret;

      const supplied = Buffer.from(typeof apiKey === 'string' ? apiKey : '');
      const expected = Buffer.from(configuredSecret);
      if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
        throw new UnauthorizedError('Invalid or missing Webhook API Key.');
      }

      const validation = leadCaptureWebhookSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid webhook payload format', validation.error.format());
      }

      const input = validation.data;

      // Find primary organization or default
      const defaultOrg = await db.organization.findUnique({ where: { domain: process.env.WEBHOOK_ORG_DOMAIN || 'clientsphere.io' } });
      if (!defaultOrg) throw new ValidationError('Webhook organization is not configured');
      const organizationId = defaultOrg.id;
      const existing = await db.lead.findFirst({ where: { organizationId, email: input.email.trim().toLowerCase() } });
      if (existing) return res.status(200).json({ success: true, data: { leadId: existing.id, duplicate: true } });

      const calculatedScore = await intelligence('/leads/score', {
        ...input,
        source: LeadSource.INBOUND_FORM,
      });

      const lead = await db.lead.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email.toLowerCase().trim(),
          phone: input.phone || null,
          companyName: input.companyName || null,
          jobTitle: input.jobTitle || null,
          status: LeadStatus.NEW,
          source: LeadSource.INBOUND_FORM,
          score: calculatedScore.score,
          priorityTier: calculatedScore.priorityTier,
          scoreFactors: calculatedScore.factors,
          organizationId,
          customFields: {
            consentGiven: input.consentGiven,
            sourceParam: input.sourceParam || 'marketing-landing-page',
            capturedVia: 'WEB_TO_LEAD_WEBHOOK',
          }
        }
      });

      await WorkflowEngine.evaluateAndTrigger({ organizationId, triggerEvent: TriggerType.LEAD_CREATED, entityType: 'LEAD', entityId: lead.id, entityData: lead });
      return res.status(201).json({
        success: true,
        data: {
          leadId: lead.id,
          status: lead.status,
          score: lead.score,
          priorityTier: lead.priorityTier,
        },
        message: 'Lead captured successfully via webhook integration.'
      });
    } catch (err) {
      next(err);
    }
  }
}
