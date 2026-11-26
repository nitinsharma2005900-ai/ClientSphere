# Verification results

Completed local verification against the corrected application, with production-shaped containers. No cloud deployment success is claimed.

| Check | Actual result |
| --- | --- |
| Backend API, security, concurrency and jobs | 41 passed on real PostgreSQL and Redis |
| Frontend component tests | 3 passed |
| Python processing and HTTP API tests | 15 passed |
| Browser journeys | 6 passed in 53.0 seconds against the full Docker stack |
| Container smoke tests | 20 endpoints/sandbox operations returned HTTP 200 |
| Actual automation | Queued workflow reached COMPLETED through the separate Redis/BullMQ consumer |
| Python lint | Passed |
| Backend, worker and shared-types TypeScript builds | Passed |
| Next.js production build | Passed; final frontend Docker build includes Swagger and favicon fixes |
| Docker stack | Six healthy services; migration container exited successfully with code 0 |
| npm audit, all dependencies | 0 vulnerabilities |
| Gitleaks Git-history scan | No leaks found |
| GitHub push and CI | [CI passed](https://github.com/nitinsharma2005900-ai/ClientSphere/actions/runs/45881164059); [security passed](https://github.com/nitinsharma2005900-ai/ClientSphere/actions/runs/45881164269) for application commit 0f4f95f |
| Railway deployment | BLOCKED: Free plan resource provision limit exceeded |
| Production website verification | Not possible without a running cloud deployment |

The 65 automated tests cover all five logins, role/tenant denial, read-only deal sharing, atomic concurrent conversion, duplicate/quoted CSV imports, JSON/date validation, real PDF output, delayed/idempotent automation, rollback, and browser navigation. The final browser run observed no console errors or failing API responses across the major application pages.

The container scoring benchmark processed 500 leads in 0.1284 seconds: 3895.04 leads/second, 0.257 ms average, all scores bounded to 0-100. This is a local scoring benchmark, not a production load test or a deduplication throughput measurement.

Sanitized structured evidence: [verification.json](evidence/verification.json). Screenshots: [desktop audit view](evidence/audit-desktop.png), [mobile dashboard](evidence/dashboard-mobile.png). The local stack is running at http://127.0.0.1:3046 with port overrides to avoid other workspace services. Default Compose port is 3000.

GitHub: https://github.com/nitinsharma2005900-ai/ClientSphere
Railway project: https://railway.com/project/ce2949fd-814f-46ee-96c4-aee38dd9b090
Railway live URL: unavailable.

## Scope limits

- There is no verified cloud site, cloud database, cloud Redis, DNS, HTTPS endpoint, cloud backup or production health check. Railway refused service creation; no upgrade was purchased.
- Sandbox email/calendar and mocked telephony are deliberate implementations permitted by the brief. Their generated internal recording/calendar URLs are metadata, not functioning external services.
- Snapshot funnel distribution has no historical stage-transition conversion measurement. Zero conversion rates are returned where historical observations do not exist.
- Access JWTs expire after 15 minutes; logout revokes the refresh token immediately. A previously copied access JWT remains valid until expiry.
- The demo organization has known login credentials and synthetic records. It must not contain real customer data.
- CodeQL runs only for public repositories; it is skipped for the private repository unless GitHub Advanced Security is enabled externally.

## Assessment requirements still outstanding

- Assessment 10: no independent reviewer approval or enforced protected branch is claimed. GitHub reports main is unprotected; final verification changes are delivered through a feature branch and pull request.
- Assessment 11: CI tests, builds and dependency scanning are verified. Container registry publishing and a cloud staging/rollback rehearsal have not been executed. The container workflow builds images and deliberately does not claim publication.
- Assessment 14: cloud application services, secure domain, HTTPS, cloud PostgreSQL/Redis, backups and production monitoring cannot be verified until Railway account capacity is enabled.
- Assessment 06: stage distribution is based on current persisted states. Observed historical stage-to-stage conversion is unavailable and is not fabricated.
