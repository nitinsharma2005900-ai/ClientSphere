# Verification results

Verification in progress. Results below reflect completed runs; pending work is not marked successful.

| Check | Actual result |
| --- | --- |
| Backend API, security, concurrency and jobs | 40 passed on real PostgreSQL and Redis |
| Frontend component tests | 3 passed |
| Python processing and HTTP API tests | 14 passed |
| Python lint | Passed |
| Backend TypeScript build | Passed |
| Next.js production build | Passed |
| npm audit, all dependencies | 0 vulnerabilities |
| Browser journeys | Pending final run |
| Docker images and complete stack | Pending final runtime verification |
| GitHub push and CI | Pending initial push |
| Railway deployment | Blocked: Free plan resource provision limit exceeded |
| Production website verification | Not possible without a running deployment |

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
