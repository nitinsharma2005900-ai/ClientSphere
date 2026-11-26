# ClientSphere – Database Entity-Relationship (ER) Documentation

**Database:** PostgreSQL 16  
**ORM:** Prisma ORM  
**Developer:** Nitin Sharma  

---

## 1. Complete Entity-Relationship Diagram

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : "employs"
    ORGANIZATIONS ||--o{ COMPANIES : "owns"
    ORGANIZATIONS ||--o{ CONTACTS : "manages"
    ORGANIZATIONS ||--o{ LEADS : "captures"
    ORGANIZATIONS ||--o{ PIPELINES : "configures"
    ORGANIZATIONS ||--o{ OPPORTUNITIES : "tracks"
    ORGANIZATIONS ||--o{ WORKFLOWS : "automates"
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "audits"

    USERS ||--o{ REFRESH_TOKENS : "issues"
    USERS ||--o{ OPPORTUNITY_MEMBERS : "collaborates_in"
    USERS ||--o{ ACTIVITIES : "performs"
    USERS ||--o{ TASKS : "assigned_to"

    COMPANIES ||--o{ COMPANIES : "parent_of"
    COMPANIES ||--o{ CONTACT_COMPANIES : "employs_via"
    COMPANIES ||--o{ OPPORTUNITIES : "targets"
    
    CONTACTS ||--o{ CONTACT_COMPANIES : "affiliated_with"
    CONTACTS ||--o{ OPPORTUNITIES : "primary_contact_for"
    CONTACTS ||--o{ ACTIVITIES : "subject_of"

    PIPELINES ||--o{ PIPELINE_STAGES : "contains"
    PIPELINE_STAGES ||--o{ OPPORTUNITIES : "current_stage"

    OPPORTUNITIES ||--o{ OPPORTUNITY_MEMBERS : "staffed_by"
    OPPORTUNITIES ||--o{ ACTIVITIES : "logs"
    OPPORTUNITIES ||--o{ TASKS : "generates"

    WORKFLOWS ||--o{ WORKFLOW_EXECUTIONS : "executes"

    ORGANIZATIONS {
        uuid id PK
        string name
        string domain UK
        string plan
        datetime createdAt
    }

    USERS {
        uuid id PK
        uuid organizationId FK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role
        string department
    }

    COMPANIES {
        uuid id PK
        uuid organizationId FK
        uuid ownerId FK
        uuid parentId FK
        string name
        string domain
        string industry
        int employeeCount
        float annualRevenue
        string tier
    }

    CONTACTS {
        uuid id PK
        uuid organizationId FK
        uuid ownerId FK
        string firstName
        string lastName
        string email UK
        string phone
        boolean gdprConsent
        datetime consentDate
        string consentSource
    }

    CONTACT_COMPANIES {
        uuid id PK
        uuid contactId FK
        uuid companyId FK
        string jobTitle
        string department
        boolean isPrimary
        datetime startDate
    }

    LEADS {
        uuid id PK
        uuid organizationId FK
        uuid ownerId FK
        string firstName
        string lastName
        string email
        string phone
        string companyName
        string jobTitle
        enum status
        enum source
        int score
        string priorityTier
        json scoreFactors
        datetime convertedAt
    }

    OPPORTUNITIES {
        uuid id PK
        uuid organizationId FK
        uuid ownerId FK
        uuid pipelineId FK
        uuid stageId FK
        uuid companyId FK
        uuid primaryContactId FK
        string title
        float value
        float probability
        enum status
        string winLossReason
        datetime expectedCloseDate
    }

    OPPORTUNITY_MEMBERS {
        uuid id PK
        uuid opportunityId FK
        uuid userId FK
        enum role
        boolean canEdit
        float commissionShare
    }

    PIPELINE_STAGES {
        uuid id PK
        uuid pipelineId FK
        string name
        int order
        float winProbability
        string color
    }

    WORKFLOWS {
        uuid id PK
        uuid organizationId FK
        string name
        boolean isActive
        enum triggerType
        json conditions
        json actions
    }

    WORKFLOW_EXECUTIONS {
        uuid id PK
        uuid workflowId FK
        uuid organizationId FK
        string triggerEvent
        string entityId
        enum status
        int retryCount
        string idempotencyKey UK
        json stepLogs
    }
```

---

## 2. Relational Integrity, Constraints & Indexes

1. **Foreign Key Cascades:**
   - Deleting an Organization cascades and wipes related records cleanly.
   - Deleting a Contact cascades to its `contact_companies` associations without affecting the Company record.
   - Removing an Opportunity cascades its `opportunity_members` entries.
2. **Compound Unique Constraints:**
   - `contact_companies(contactId, companyId)`: A contact cannot have duplicate entries for the exact same company.
   - `opportunity_members(opportunityId, userId)`: Prevents duplicate membership records for the same team collaborator on a deal.
   - `contacts(organizationId, email)`: Enforces unique email per organization while allowing identical emails across different tenants.
3. **Optimized Indexes:**
   - Composite indexes on `[organizationId, status]` and `[organizationId, score]` for low-latency pagination and filtering.
   - Full indexing on `[stageId]` and `[ownerId]` for instantaneous Kanban board rendering.
