# ClientSphere architecture

The premium Next.js interface remains the presentation layer. TanStack Query stores client data and is cleared whenever accounts change. Browser requests use a same-origin proxy; `BACKEND_INTERNAL_URL` is read only by the Next.js server at runtime.

Express owns business authorization and every PostgreSQL CRM entity. Prisma migrations create the relational schema; no alternative file store exists. Organization IDs come from authenticated tokens, while a central policy validates resource IDs and referenced records before controllers run. Representative ownership and team `canEdit` rules are enforced on writes. Managers and administrators see organization-wide data; the implementation has no separate per-department team hierarchy.

FastAPI owns no authoritative CRM data. It accepts bounded processing inputs, normalizes and scores leads, identifies duplicate candidates, and calculates forecasts/velocity. Core calculations use Python's standard library and Pydantic; pandas/numpy are unnecessary for this bounded workload. Express calls it with timeouts and one retry, returning a safe 503 when unavailable.

Workflow executions form a PostgreSQL outbox. The separate worker process polls queued rows, dispatches BullMQ jobs through Redis, and commits actions together with completion under a row lock. Three attempts use exponential backoff. Failed executions remain in both the execution history and Redis failed-job set, and managers can explicitly request a retry. Sandbox activities are database writes; no external network delivery is implied. Workflow-generated field updates do not recursively emit business triggers.

PostgreSQL is the sole persistent business store. Redis stores job delivery state and a worker heartbeat. Docker uses persistent volumes; backups require a separately configured backup system and verified restore, described in the deployment runbook. Railway cloud services have not been provisioned because account capacity is exhausted.

The backend is a modular monolith with a separate processing service and worker. Reusing its business engine in the worker avoids implementing authorization/action rules twice. The shared-types workspace is compiled before the API, and production imports resolve to its compiled package.

## Concurrency decisions

Lead conversion and commission allocation lock the relevant lead/opportunity row. Conversion commits contacts, associations, deal team, lead status and activity in one transaction. Financial checks and tenant/email uniqueness also exist in SQL. Workflow action transactions roll back all internal side effects on failure; stable execution IDs prevent duplicate effects across retries. CSV uniqueness is ultimately enforced by PostgreSQL, including competing imports.

## Operational limits

Authentication uses short-lived signed access JWTs and hashed, revocable refresh tokens. JWTs already issued remain valid for at most 15 minutes after logout. Rate limiting is per API process, appropriate to the single-instance demo; multiple API replicas require a shared limiter. Conversion waterfall data is a current-stage distribution; historical stage-to-stage conversion is not fabricated. No user-management UI, real email/calendar/telephony provider, advanced custom-field schema editor or observed production load test is claimed.
