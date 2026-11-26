// ClientSphere Seed Data Script
// Seeds realistic synthetic enterprise data for all 5 roles, pipelines, companies,
// contacts with multi-company associations, and collaborative multi-rep opportunities.
// Developer: Nitin Sharma

import { db } from './client';
import { AuthService } from '../services/auth.service';
import { UserRole, OpportunityMemberRole, LeadStatus, LeadSource, ActivityType, ActivityStatus, TriggerType, ActionType } from '@clientsphere/shared-types';
import { logger } from '../utils/logger';

export async function seedInitialData() {
  const existingOrg = await db.organization.findFirst();
  if (existingOrg) {
    logger.info('Database already contains organizational data. Skipping seed.');
    return;
  }

  logger.info('Seeding ClientSphere database with realistic enterprise datasets...');

  // 1. Create Organization
  const org = await db.organization.create({
    data: {
      name: 'ClientSphere Global Enterprises',
      domain: 'clientsphere.io',
      plan: 'ENTERPRISE_UNLIMITED',
    }
  });

  const passwordHash = await AuthService.hashPassword('Password123!');

  // 2. Create 5 Users covering all mandatory roles
  const admin = await db.user.create({
    data: {
      email: 'admin@clientsphere.io',
      passwordHash,
      firstName: 'Nitin',
      lastName: 'Sharma',
      role: UserRole.ADMINISTRATOR,
      department: 'Executive Management',
      organizationId: org.id,
    }
  });

  const manager = await db.user.create({
    data: {
      email: 'manager@clientsphere.io',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: UserRole.SALES_MANAGER,
      department: 'Enterprise Sales',
      organizationId: org.id,
    }
  });

  const rep = await db.user.create({
    data: {
      email: 'rep@clientsphere.io',
      passwordHash,
      firstName: 'David',
      lastName: 'Kim',
      role: UserRole.SALES_REPRESENTATIVE,
      department: 'Strategic Accounts',
      organizationId: org.id,
    }
  });

  const marketing = await db.user.create({
    data: {
      email: 'marketing@clientsphere.io',
      passwordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: UserRole.MARKETING_USER,
      department: 'Demand Generation',
      organizationId: org.id,
    }
  });

  const support = await db.user.create({
    data: {
      email: 'support@clientsphere.io',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Thorne',
      role: UserRole.SUPPORT_USER,
      department: 'Customer Success',
      organizationId: org.id,
    }
  });

  // 3. Create Enterprise Sales Pipeline with 6 Stages
  const pipeline = await db.pipeline.create({
    data: {
      name: 'Global Enterprise B2B Pipeline',
      isDefault: true,
      organizationId: org.id,
    }
  });

  const stagesData = [
    { name: 'Prospecting', order: 0, winProbability: 0.10, color: '#94A3B8' },
    { name: 'Qualification', order: 1, winProbability: 0.25, color: '#60A5FA' },
    { name: 'Proposal & Demo', order: 2, winProbability: 0.50, color: '#F59E0B' },
    { name: 'Negotiation', order: 3, winProbability: 0.75, color: '#8B5CF6' },
    { name: 'Closed Won', order: 4, winProbability: 1.00, color: '#10B981' },
    { name: 'Closed Lost', order: 5, winProbability: 0.00, color: '#EF4444' },
  ];

  const stages: any[] = [];
  for (const s of stagesData) {
    const stage = await db.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: s.name,
        order: s.order,
        winProbability: s.winProbability,
        color: s.color,
      }
    });
    stages.push(stage);
  }

  // 4. Create Companies (Corporate Hierarchy)
  const apex = await db.company.create({
    data: {
      name: 'Apex Global Cloud Solutions',
      domain: 'apexcloud.io',
      industry: 'Enterprise Software & Cloud',
      employeeCount: 4800,
      annualRevenue: 125000000,
      tier: 'ENTERPRISE_STRATEGIC',
      ownerId: rep.id,
      organizationId: org.id,
    }
  });

  const vanguard = await db.company.create({
    data: {
      name: 'Vanguard Cyber Systems',
      domain: 'vanguardcyber.com',
      industry: 'Cybersecurity & Defense',
      employeeCount: 1200,
      annualRevenue: 48000000,
      tier: 'MID_MARKET',
      ownerId: rep.id,
      organizationId: org.id,
    }
  });

  const starlight = await db.company.create({
    data: {
      name: 'Starlight Health Technologies',
      domain: 'starlighthealth.com',
      industry: 'Healthcare Technology',
      employeeCount: 650,
      annualRevenue: 22000000,
      tier: 'GROWTH',
      ownerId: manager.id,
      organizationId: org.id,
    }
  });

  const novus = await db.company.create({
    data: {
      name: 'Novus AI Robotics',
      domain: 'novusrobotics.ai',
      industry: 'Artificial Intelligence',
      employeeCount: 140,
      annualRevenue: 9500000,
      tier: 'STARTUP_SCALEUP',
      parentId: apex.id, // Subsidiary of Apex
      ownerId: rep.id,
      organizationId: org.id,
    }
  });

  // 5. Create Contacts & Capstone Multi-Company Associations
  // Contact 1: Victoria Sterling belongs to Apex Global (CTO) AND Novus AI (Board Advisor)
  const victoria = await db.contact.create({
    data: {
      firstName: 'Victoria',
      lastName: 'Sterling',
      email: 'v.sterling@apexcloud.io',
      phone: '+1-415-555-0192',
      mobilePhone: '+1-415-555-0193',
      gdprConsent: true,
      consentSource: 'DIRECT_EXECUTIVE_MEETING',
      ownerId: rep.id,
      organizationId: org.id,
    }
  });

  // Apex primary association
  await db.contactCompany.create({
    data: {
      contactId: victoria.id,
      companyId: apex.id,
      jobTitle: 'Chief Technology Officer',
      department: 'Executive Engineering',
      isPrimary: true,
    }
  });

  // Novus AI secondary advisory association (Capstone challenge)
  await db.contactCompany.create({
    data: {
      contactId: victoria.id,
      companyId: novus.id,
      jobTitle: 'Strategic AI Advisory Board Member',
      department: 'Corporate Strategy',
      isPrimary: false,
    }
  });

  // Contact 2: Alexander Hayes (Vanguard)
  const alexander = await db.contact.create({
    data: {
      firstName: 'Alexander',
      lastName: 'Hayes',
      email: 'a.hayes@vanguardcyber.com',
      phone: '+1-202-555-0144',
      gdprConsent: true,
      ownerId: rep.id,
      organizationId: org.id,
    }
  });

  await db.contactCompany.create({
    data: {
      contactId: alexander.id,
      companyId: vanguard.id,
      jobTitle: 'VP of Global Infrastructure',
      department: 'Information Security',
      isPrimary: true,
    }
  });

  // Contact 3: Dr. Rachel Chen (Starlight Health)
  const rachel = await db.contact.create({
    data: {
      firstName: 'Dr. Rachel',
      lastName: 'Chen',
      email: 'rachel.chen@starlighthealth.com',
      phone: '+1-617-555-0188',
      gdprConsent: true,
      ownerId: manager.id,
      organizationId: org.id,
    }
  });

  await db.contactCompany.create({
    data: {
      contactId: rachel.id,
      companyId: starlight.id,
      jobTitle: 'Chief Medical Informatics Officer',
      department: 'Clinical Operations',
      isPrimary: true,
    }
  });

  // 6. Create Opportunities with Multi-Rep Collaboration (Capstone Challenge)
  // Deal 1: Apex Multi-Region Cloud Migration ($185,000)
  const deal1 = await db.opportunity.create({
    data: {
      title: 'Apex Multi-Region Cloud Migration & Governance',
      value: 185000,
      currency: 'USD',
      stageId: stages[2].id, // Proposal & Demo
      pipelineId: pipeline.id,
      companyId: apex.id,
      primaryContactId: victoria.id,
      ownerId: rep.id,
      organizationId: org.id,
      probability: 0.50,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
    }
  });

  // Multi-representative collaboration team on Deal 1
  await db.opportunityMember.create({
    data: {
      opportunityId: deal1.id,
      userId: rep.id,
      role: OpportunityMemberRole.PRIMARY_OWNER,
      canEdit: true,
      commissionShare: 0.60,
    }
  });

  await db.opportunityMember.create({
    data: {
      opportunityId: deal1.id,
      userId: manager.id,
      role: OpportunityMemberRole.EXECUTIVE_SPONSOR,
      canEdit: true,
      commissionShare: 0.20,
    }
  });

  await db.opportunityMember.create({
    data: {
      opportunityId: deal1.id,
      userId: admin.id,
      role: OpportunityMemberRole.SALES_ENGINEER,
      canEdit: true,
      commissionShare: 0.20,
    }
  });

  // Deal 2: Vanguard Zero-Trust ($95,000)
  const deal2 = await db.opportunity.create({
    data: {
      title: 'Vanguard Zero-Trust Architecture Expansion',
      value: 95000,
      currency: 'USD',
      stageId: stages[3].id, // Negotiation
      pipelineId: pipeline.id,
      companyId: vanguard.id,
      primaryContactId: alexander.id,
      ownerId: rep.id,
      organizationId: org.id,
      probability: 0.75,
      expectedCloseDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      status: 'OPEN',
    }
  });

  await db.opportunityMember.create({
    data: {
      opportunityId: deal2.id,
      userId: rep.id,
      role: OpportunityMemberRole.PRIMARY_OWNER,
      canEdit: true,
      commissionShare: 0.75,
    }
  });

  await db.opportunityMember.create({
    data: {
      opportunityId: deal2.id,
      userId: admin.id,
      role: OpportunityMemberRole.SALES_ENGINEER,
      canEdit: true,
      commissionShare: 0.25,
    }
  });

  // Deal 3: Starlight Closed Won ($65,000)
  const deal3 = await db.opportunity.create({
    data: {
      title: 'Starlight Clinical Telehealth Platform Pilot',
      value: 65000,
      currency: 'USD',
      stageId: stages[4].id, // Closed Won
      pipelineId: pipeline.id,
      companyId: starlight.id,
      primaryContactId: rachel.id,
      ownerId: rep.id,
      organizationId: org.id,
      probability: 1.0,
      status: 'WON',
      actualCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  });

  await db.opportunityMember.create({
    data: {
      opportunityId: deal3.id,
      userId: rep.id,
      role: OpportunityMemberRole.PRIMARY_OWNER,
      canEdit: true,
      commissionShare: 1.0,
    }
  });

  // 7. Seed Leads with Explainable Scores
  const leadsData = [
    {
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'm.vance@cyberstream.net',
      phone: '+1-512-555-0177',
      companyName: 'CyberStream Networks',
      jobTitle: 'VP of Cloud Infrastructure',
      status: LeadStatus.QUALIFIED,
      source: LeadSource.INBOUND_FORM,
      score: 85,
      priorityTier: 'HOT',
    },
    {
      firstName: 'Elena',
      lastName: 'Vasquez',
      email: 'e.vasquez@biogenixlabs.org',
      phone: '+1-415-555-0133',
      companyName: 'BioGenix Labs',
      jobTitle: 'Director of Bioinformatics',
      status: LeadStatus.CONTACTED,
      source: LeadSource.WEBSITE,
      score: 72,
      priorityTier: 'HOT',
    },
    {
      firstName: 'Liam',
      lastName: "O'Connor",
      email: 'loconnor@nexuslogistics.com',
      phone: '+1-312-555-0165',
      companyName: 'Nexus Global Logistics',
      jobTitle: 'Supply Chain Operations Lead',
      status: LeadStatus.NEW,
      source: LeadSource.REFERRAL,
      score: 55,
      priorityTier: 'WARM',
    },
    {
      firstName: 'Avery',
      lastName: 'Jenkins',
      email: 'avery.j@omnitech.io',
      phone: '+1-206-555-0199',
      companyName: 'OmniTech Labs',
      jobTitle: 'Software Architect',
      status: LeadStatus.NEW,
      source: LeadSource.COLD_OUTREACH,
      score: 38,
      priorityTier: 'COLD',
    },
  ];

  for (const l of leadsData) {
    await db.lead.create({
      data: {
        ...l,
        scoreFactors: [
          { factor: 'Executive Title Alignment', points: 35, category: 'DEMOGRAPHIC', explanation: `Title '${l.jobTitle}' indicates decision authority.` },
          { factor: 'Direct Phone Verified', points: 15, category: 'ENGAGEMENT', explanation: 'Telephony connectivity enables fast response outreach.' }
        ],
        ownerId: rep.id,
        organizationId: org.id,
      }
    });
  }

  // 8. Seed Workflows (Assessment 07)
  await db.workflow.create({
    data: {
      name: 'High-Value Deal Negotiation Task Assignment',
      description: 'Automatically create a high-priority executive review task whenever any deal moves into Negotiation and exceeds $50,000.',
      isActive: true,
      triggerType: TriggerType.DEAL_STAGE_CHANGED,
      conditions: [
        { field: 'value', operator: 'GREATER_THAN', value: 50000 }
      ],
      actions: [
        {
          type: ActionType.CREATE_TASK,
          params: {
            title: 'Schedule Executive Alignment & Contract Legal Review',
            priority: 'URGENT',
            description: 'Automated task: High-value enterprise opportunity entered final negotiation stage.'
          }
        }
      ],
      organizationId: org.id,
    }
  });

  await db.workflow.create({
    data: {
      name: 'Hot Lead Instant Email Sandbox Follow-up',
      description: 'Trigger immediate automated outreach when a lead with score >= 70 is created.',
      isActive: true,
      triggerType: TriggerType.LEAD_CREATED,
      conditions: [
        { field: 'score', operator: 'GREATER_THAN', value: 69 }
      ],
      actions: [
        {
          type: ActionType.SEND_EMAIL,
          params: {
            subject: 'Welcome to ClientSphere – Executive Briefing & Discovery',
            body: 'Hello, thank you for your interest. We would love to arrange a personalized technical walkthrough.'
          }
        }
      ],
      organizationId: org.id,
    }
  });

  // 9. Seed Activities & Tasks
  await db.activity.create({
    data: {
      type: ActivityType.CALL,
      subject: 'Quarterly Infrastructure Roadmap Call',
      description: 'Spoke with Alexander Hayes regarding zero-trust architecture rollout across European data centers.',
      status: ActivityStatus.COMPLETED,
      opportunityId: deal2.id,
      companyId: vanguard.id,
      contactId: alexander.id,
      userId: rep.id,
      organizationId: org.id,
      metadata: { durationMinutes: 28, direction: 'OUTBOUND' }
    }
  });

  await db.task.create({
    data: {
      title: 'Send Revised Commercial Proposal to Victoria Sterling',
      description: 'Include 3-year term pricing with multi-region replication add-on.',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      opportunityId: deal1.id,
      companyId: apex.id,
      contactId: victoria.id,
      assignedToId: rep.id,
      organizationId: org.id,
    }
  });

  logger.info('Synthetic data seeding completed successfully for ClientSphere!');
}
