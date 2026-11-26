# ClientSphere

Existing premium CRM interface, Express business API, PostgreSQL persistence, Python lead processing and sales intelligence, and a Redis/BullMQ automation consumer.

## Verified destinations

- GitHub: https://github.com/nitinsharma2005900-ai/ClientSphere (private repository).
- Railway project: https://railway.com/project/ce2949fd-814f-46ee-96c4-aee38dd9b090
- Railway live URL: **Unavailable. Deployment blocked by the account free-plan resource provision limit.** No application service was provisioned; no public application was verified.
- Verified running Docker UI in this workspace: http://127.0.0.1:3046 (standard Compose defaults to port 3000).
- Verified Docker API / Swagger: http://127.0.0.1:4046/api/v1/docs/; frontend proxy: http://127.0.0.1:3046/api/v1/docs/.

The project brief is `project6.pdf`; its assessment criteria are treated as requirements to verify. The earlier claim of an awarded 15/15 score has been removed. Assessment 14 requires a verified cloud deployment and remains blocked. See [the assessment matrix](docs/ASSESSMENTS_CHECKLIST.md) and [actual verification evidence](docs/VERIFICATION_RESULTS.md).

## Run the complete stack

Requires Node.js 22 when running without containers, Python 3.12+, and Docker with Compose. PostgreSQL is mandatory; there is no JSON or SQLite fallback.

```sh
python scripts/setup_env.py
docker compose up --build -d
```

The migration service applies checked-in Prisma migrations before the API starts. The demo seed runs only with `SEED_DEMO=true`; it never resets an existing organization. PostgreSQL and Redis use persistent named volumes. The backend, frontend, Python service and worker have health checks and run as non-root users.

For VS Code development using local PostgreSQL and Redis:

```sh
npm ci
npm run db:generate
npm run build -w packages/shared-types
npm run db:migrate
npm run db:seed
python -m venv .venv
# Activate .venv, then:
pip install -r apps/python_service/requirements-dev.txt
python apps/python_service/main.py
# In separate terminals:
npm run dev:backend
npm run dev:worker
npm run dev:frontend
```

The frontend calls `/api/v1` on its own origin. Its server proxies to `BACKEND_INTERNAL_URL`, defaulting to http://127.0.0.1:4000. Browser bundles contain no private service hostnames or production credentials.

## Demo logins

All five accounts use **Password123!**. These are intentionally public demonstration credentials for synthetic data; disable demo seeding and replace these accounts before storing customer data.

| Role | Email |
| --- | --- |
| Administrator | admin@clientsphere.io |
| Sales manager | manager@clientsphere.io |
| Sales representative | rep@clientsphere.io |
| Marketing | marketing@clientsphere.io |
| Support | support@clientsphere.io |

Sign-in is explicit. A failed or expired session never silently signs in as administrator. The existing sidebar role selector demonstrates the seeded accounts. Representatives see owned/shared sales records; read-only collaboration is enforced. Support and marketing have restricted writes. Tenant checks cover resource IDs and referenced records. Manager access is required for workflows, pipelines, and audit history.

## Verified results

65 automated tests passed: 41 backend, 3 React component, 15 Python and 6 browser journeys. All 20 container smoke checks returned HTTP 200, an actual queued workflow completed, and all six services are healthy. Production builds, npm audit (0 vulnerabilities) and Gitleaks passed. [GitHub CI](https://github.com/nitinsharma2005900-ai/ClientSphere/actions/runs/45881164059) and [security checks](https://github.com/nitinsharma2005900-ai/ClientSphere/actions/runs/45881164269) passed for the final application code. See the evidence report for CI URLs and remaining assessment requirements.

## Tests and builds

Create a separate PostgreSQL database ending in `_test`, set `TEST_DATABASE_URL`, and keep Redis and the Python service running. Tests refuse to clear a database whose name does not end in `_test`. They clear only the selected test database.

```sh
npm run db:generate
npm run build -w packages/shared-types
npm run build -w apps/backend
# Apply migrations to TEST_DATABASE_URL before running API tests.
npm test -w apps/backend
npm run test:frontend
pytest -c apps/python_service/pytest.ini -q
ruff check apps/python_service
npm run build
npm audit --audit-level=high
# With the full application running; Chrome installed locally:
npm run test:e2e
```

GitHub Actions provisions PostgreSQL/Redis, applies migrations, starts FastAPI, runs Node/Python/UI tests, builds the application, audits dependencies, and runs browser journeys. CI status is recorded in the verification report after pushing; local success does not imply CI success.

## Business behavior

- Leads are scored by FastAPI with explainable factors. CSV imports use a CSV parser supporting quoted commas and a Python normalization/duplicate-validation stage. Import size is limited to 2,000 records. Repeated email imports are safe to retry, with database uniqueness as the final guard.
- Lead conversion locks its database row and creates the contact, company association and opportunity in one transaction. Concurrent conversion cannot create two deals.
- A contact can have multiple company associations with individual titles and departments. Opportunities support multiple team members, read-only access and commission allocation.
- Automation supports `LEAD_CREATED`, `LEAD_SCORE_CHANGED` and `DEAL_STAGE_CHANGED`, condition arrays, sandbox emails, tasks, notes, safe field updates and owner assignment. Workflow executions are a database outbox; the worker dispatches them to BullMQ with optional delay and three attempts with exponential backoff. Action side effects and completion are committed together, making retries safe. Failed executions have a manager-only retry endpoint.
- Forecasts and dashboards use database records and Python calculations. Empty inputs remain zero, zero probabilities are preserved, and quarters follow close dates. Sales velocity uses observed close cycles when available, with a documented 34.5-day assumption otherwise. Snapshot stage distribution is not presented as observed stage-to-stage conversion history.
- Email/calendar integrations are **sandboxes**, and telephony is a **mock**. No real email, SMS, call, calendar provider or recording is claimed. Web-to-lead requires an exact secret and captures consent explicitly.
- Sales Intelligence provides a real PDF forecast download. The repository documentation PDF records the same deployment limitations as this README.

## Deployment and operations

[Railway configuration and recovery guide](docs/RAILWAY_DEPLOYMENT_GUIDE.md) documents private networking, environment references, migrations, health checks and backup/restore. Per-service configuration lives in `railway/`. Secrets are supplied through ignored local files or Railway variables, never source control. Docker image builds and local runtime checks are distinct from a Railway deployment.

Known limits and outstanding evidence are listed in [VERIFICATION_RESULTS.md](docs/VERIFICATION_RESULTS.md). No paid plan or additional resources were purchased.
