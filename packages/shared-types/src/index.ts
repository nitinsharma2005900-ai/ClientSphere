// ClientSphere Core Domain Types & Enumerations
// Developer: Nitin Sharma

export enum UserRole {
  ADMINISTRATOR = 'ADMINISTRATOR',
  SALES_MANAGER = 'SALES_MANAGER',
  SALES_REPRESENTATIVE = 'SALES_REPRESENTATIVE',
  MARKETING_USER = 'MARKETING_USER',
  SUPPORT_USER = 'SUPPORT_USER'
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  UNQUALIFIED = 'UNQUALIFIED',
  CONVERTED = 'CONVERTED'
}

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  COLD_OUTREACH = 'COLD_OUTREACH',
  INBOUND_FORM = 'INBOUND_FORM',
  TRADE_SHOW = 'TRADE_SHOW',
  PARTNER = 'PARTNER',
  CSV_IMPORT = 'CSV_IMPORT'
}

export enum OpportunityStatus {
  OPEN = 'OPEN',
  WON = 'WON',
  LOST = 'LOST'
}

export enum WorkflowStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export enum DealStage {
  PROSPECTING = 'PROSPECTING',
  QUALIFICATION = 'QUALIFICATION',
  PROPOSAL_DEMO = 'PROPOSAL_DEMO',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export enum ActivityType {
  NOTE = 'NOTE',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  TASK = 'TASK',
  STAGE_CHANGE = 'STAGE_CHANGE'
}

export enum ActivityStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TriggerType {
  LEAD_CREATED = 'LEAD_CREATED',
  LEAD_SCORE_CHANGED = 'LEAD_SCORE_CHANGED',
  DEAL_STAGE_CHANGED = 'DEAL_STAGE_CHANGED',
  TASK_OVERDUE = 'TASK_OVERDUE',
  TAG_ADDED = 'TAG_ADDED'
}

export enum ActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  CREATE_TASK = 'CREATE_TASK',
  ASSIGN_OWNER = 'ASSIGN_OWNER',
  UPDATE_FIELD = 'UPDATE_FIELD',
  CALL_WEBHOOK = 'CALL_WEBHOOK',
  CREATE_ACTIVITY = 'CREATE_ACTIVITY'
}

export enum OpportunityMemberRole {
  PRIMARY_OWNER = 'PRIMARY_OWNER',
  SALES_ENGINEER = 'SALES_ENGINEER',
  ACCOUNT_EXECUTIVE = 'ACCOUNT_EXECUTIVE',
  CUSTOMER_SUCCESS = 'CUSTOMER_SUCCESS',
  EXECUTIVE_SPONSOR = 'EXECUTIVE_SPONSOR'
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  department?: string;
  avatarUrl?: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  tier?: string;
  organizationId: string;
}

export interface ContactCompanyRelation {
  id: string;
  contactId: string;
  companyId: string;
  jobTitle: string;
  department?: string;
  isPrimary: boolean;
  startDate?: string;
  company?: CompanySummary;
}

export interface OpportunityTeamMemberSummary {
  id: string;
  opportunityId: string;
  userId: string;
  role: OpportunityMemberRole;
  canEdit: boolean;
  commissionShare?: number;
  user?: UserSummary;
}

export interface LeadScoreFactor {
  factor: string;
  points: number;
  category: 'FIRMOGRAPHIC' | 'ENGAGEMENT' | 'DEMOGRAPHIC' | 'TIMING';
  explanation: string;
}

export interface LeadScoreResult {
  score: number;
  priorityTier: 'HOT' | 'WARM' | 'COLD';
  confidence: number;
  factors: LeadScoreFactor[];
  recommendedAction: string;
}
