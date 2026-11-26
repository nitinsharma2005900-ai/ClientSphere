# ClientSphere – Service & Data Flow Documentation

**Developer:** Nitin Sharma  
**Version:** 1.0.0  

---

## 1. End-to-End User Journeys & Data Flows

### Data Flow 1: Inbound Lead Creation, Explainable Scoring & Conversion

```mermaid
sequenceDiagram
    autonumber
    actor MarketingUser as Marketing User / Webhook
    participant NextUI as Next.js Frontend
    participant ExpressAPI as Express REST Gateway
    participant FastAPI as Python Intelligence Service
    participant Database as PostgreSQL Database
    participant Worker as BullMQ Automation Worker

    MarketingUser->>NextUI: Submit Lead Form / Upload CSV
    NextUI->>ExpressAPI: POST /api/v1/leads (with payload)
    ExpressAPI->>FastAPI: POST /api/v1/leads/score (calculate factors)
    FastAPI-->>ExpressAPI: Return Score (85), Tier (HOT), 4 Factors
    ExpressAPI->>Database: INSERT into leads (score, priorityTier, factors)
    Database-->>ExpressAPI: Saved Lead Record
    ExpressAPI->>Worker: Dispatch Event: LEAD_CREATED
    Worker->>Database: Query Workflows matching LEAD_CREATED & score >= 70
    Worker->>Database: Execute Action: Send Welcome Sandbox Email & Log Activity
    ExpressAPI-->>NextUI: 201 Created with Explainable Score Breakdown
    NextUI-->>MarketingUser: Render Hot Lead Card with Factor Chips
```

---

### Data Flow 2: Capstone Challenge – Multi-Company Association & Team Deal Collaboration

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Representative (David Kim)
    participant NextUI as Next.js Frontend
    participant ExpressAPI as Express REST Gateway
    participant Database as PostgreSQL Database

    Note over Rep,Database: Scenario: Associate Victoria Sterling with Novus AI while remaining CTO at Apex Cloud
    Rep->>NextUI: Click "Associate Company" in Contact Profile
    NextUI->>ExpressAPI: POST /api/v1/contacts/{id}/companies { companyId: novusId, jobTitle: "Board Advisor" }
    ExpressAPI->>Database: Validate Contact & Company belong to user's Organization
    ExpressAPI->>Database: INSERT into contact_companies (contactId, companyId, jobTitle, isPrimary: false)
    Database-->>ExpressAPI: Record Created
    ExpressAPI-->>NextUI: 201 Created

    Note over Rep,Database: Scenario: Add Solution Architect Nitin Sharma to $185k Deal Team
    Rep->>NextUI: Open Opportunity Details -> Click "Add Collaborator"
    NextUI->>ExpressAPI: POST /api/v1/opportunities/{id}/members { userId, role: "SALES_ENGINEER", commissionShare: 0.20 }
    ExpressAPI->>Database: INSERT into opportunity_members (opportunityId, userId, role, canEdit, commissionShare)
    Database-->>ExpressAPI: Member Registered
    ExpressAPI->>Database: INSERT into activities (subject: "Team Member Added to Deal")
    ExpressAPI-->>NextUI: 201 Created
    NextUI-->>Rep: Team Split Updated (60% AE, 20% Sponsor, 20% SE)
```

---

### Data Flow 3: Kanban Stage Transition, Win/Loss Audit & Workflow Trigger

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Sales Manager
    participant NextUI as Next.js Kanban Board
    participant ExpressAPI as Express REST Gateway
    participant WorkflowEngine as Automation Engine
    participant Database as PostgreSQL Database

    Manager->>NextUI: Drag Opportunity from "Negotiation" to "Closed Won"
    NextUI->>ExpressAPI: PATCH /api/v1/opportunities/{id}/stage { stageId: "stage-closed-won" }
    ExpressAPI->>Database: Update Opportunity status = 'WON', probability = 1.0, actualCloseDate = NOW()
    ExpressAPI->>Database: INSERT into activities (type: STAGE_CHANGE)
    ExpressAPI->>WorkflowEngine: Evaluate Trigger: DEAL_STAGE_CHANGED (status == 'WON')
    WorkflowEngine->>Database: Execute Action: Create Onboarding Task for Customer Success
    Database-->>WorkflowEngine: Task Created
    WorkflowEngine-->>ExpressAPI: Workflow Log Recorded
    ExpressAPI-->>NextUI: 200 OK with Updated Stage & Confetti Micro-interaction
```
