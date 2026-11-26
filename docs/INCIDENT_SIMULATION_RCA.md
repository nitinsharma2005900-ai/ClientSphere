# Incident review and regression evidence

This is a local code/incident review. No production incident or cloud availability is claimed.

| Incident | Observed defect | Correction | Regression evidence |
| --- | --- | --- | --- |
| Duplicate imports/conversion | CSV was split on commas, email uniqueness was absent for leads, and concurrent conversion was not locked. | CSV parser, Python normalization/validation, organization/email unique key, transaction row lock for conversion. | Quoted commas, malformed rows, retry import, duplicate contacts and concurrent conversion tests. |
| Wrong assignment/data visibility | Write routes and relationship removal did not consistently check record ownership or tenant references. Frontend failed sessions could auto-login as admin. | Central resource/reference policy, explicit login, preserved-role refresh, role write restrictions and read-only collaborator enforcement. | Cross-tenant association/unlink, representative ownership, support/marketing/audit authorization and browser login tests. |
| Automation did not run | Worker checked Redis connection synchronously before connect, stayed in simulator mode, and business changes did not dispatch jobs. | Database outbox, actual BullMQ consumer, delayed dispatch, retries/backoff, atomic action effects and manager recovery. | Real delayed consumer execution, repeated stable event, rollback on unsafe field and direct recursion-depth checks. |
| Forecast boundary errors | Empty input produced invented revenue; zero win rate used a nonzero fallback; quarters were fixed to Q1-Q4 2026. | Zero-preserving calculations, bounded financial inputs and date-based current/future quarter grouping. | Python empty/zero/negative/probability/cycle tests and API/PDF verification. |
| Slow/incorrect reporting | Dashboard loaded entire related tables and pipeline stages from every tenant. Original latency test could pass on a JSON store. | PostgreSQL counts/projections, tenant stage scope, parallel independent queries and visible-deal filters. | Dashboard latency budget measured on real local PostgreSQL/Python. Budget is 2 seconds and is not a load-test guarantee. |

All failures are tested with actual persistence. The original mock-only claims and hard-coded successful metrics were removed. Detailed totals and remaining limits are in VERIFICATION_RESULTS.md.
