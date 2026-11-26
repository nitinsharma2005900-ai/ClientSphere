# Railway deployment and operations

## Actual status

GitHub: https://github.com/nitinsharma2005900-ai/ClientSphere
Railway project: https://railway.com/project/ce2949fd-814f-46ee-96c4-aee38dd9b090

**No live application URL.** Railway returned `Free plan resource provision limit exceeded. Please upgrade to provision more resources!` when creating an empty backend service. PostgreSQL/Redis template requests returned asynchronous workflow IDs, but subsequent environment inventory contained no services or volumes. Template acknowledgement is not evidence of provisioning. No paid upgrade or unrelated project modification was performed.

## Configuration to apply after capacity is available

Create PostgreSQL and Redis from Railway templates with generated passwords and persistent volumes. Keep both on the private network; use Redis `noeviction` for BullMQ. Create `backend`, `worker`, `python` and `frontend` services from the verified GitHub repository, branch `main`.

| Service | Configuration file | Health | Notes |
| --- | --- | --- | --- |
| Backend | railway/backend.json | /api/v1/ready | Root Docker context; pre-deploy migrations |
| Worker | railway/worker.json | /health | Same backend image/code; separate consumer process |
| Python | railway/python.json | /health | Private intelligence API; dynamic PORT |
| Frontend | railway/frontend.json | /health | Only publicly exposed application service |

Set the config-file path on each service. All applications bind `0.0.0.0` and honor Railway `PORT`. Generate a public domain only for the frontend. The browser calls same-origin `/api/v1`; its server proxy reaches the backend privately.

Required variables:

| Service | Variable | Value/source |
| --- | --- | --- |
| Backend and worker | DATABASE_URL | Reference Postgres.DATABASE_URL |
| Backend and worker | REDIS_URL | Reference Redis.REDIS_URL |
| Backend | PYTHON_SERVICE_URL | http://python.railway.internal:8000 (set Python PORT=8000) |
| Backend and worker | JWT_SECRET, JWT_REFRESH_SECRET, WEBHOOK_SECRET | Independently generated random values, at least 32 characters |
| Backend and worker | NODE_ENV | production |
| Backend | CORS_ORIGIN | Exact generated frontend HTTPS origin |
| Backend | WEBHOOK_ORG_DOMAIN | Explicit target organization domain |
| Backend | SEED_DEMO | true for this synthetic demonstration only |
| Frontend | BACKEND_INTERNAL_URL | http://backend.railway.internal:4000 (set backend PORT=4000) |
| Python | PORT | 8000 |
| Worker | PORT | 4001 |

Store generated credentials only in Railway variables. Never put real credentials in templates, repository files or command logs. A demo seed deliberately creates the documented five synthetic accounts; replace them before handling customer data.

## Release checks

1. Verify local tests, Docker builds and GitHub checks for the intended commit.
2. Apply `prisma migrate deploy` as the backend pre-deploy command. Never use `db push` for production release migrations.
3. Verify Postgres, Redis, Python, backend readiness and worker heartbeat before testing the frontend.
4. Verify all five logins, CSV import/retry, lead conversion, shared deals, automation completion and PDF output through the public frontend URL.
5. Check logs and HTTP responses for errors, then record the literal successful domain and deployment identifiers in README, the assessment matrix and the PDF.

## Rollback and recovery

Redeploy the last known-good Railway application deployment. Database migrations are forward-only: never reset a production database to make a release pass. Use a reviewed forward migration or restore to a separate environment. Delayed workflow executions and failed-job records remain in PostgreSQL; manager-only `POST /api/v1/workflows/executions/{executionId}/retry` retries a failed execution after its cause has been corrected.

## Backup and restore runbook (not executed in cloud)

Before a schema change, use `pg_dump --format=custom` against the database and store the result in encrypted off-project storage. Enable and verify Railway volume/database backups according to the available plan; a configured volume alone is not proof of a backup. Regularly restore a dump using `pg_restore --no-owner` into a separate empty database and verify row counts, roles and relationships. Do not restore over the running production database. Store backup access credentials outside Git.

## Monitoring

The API exposes liveness and database readiness. The worker exposes readiness for PostgreSQL/Redis and writes a Redis heartbeat every two seconds. FastAPI and the frontend have health endpoints. Runtime logs include request IDs and structured API errors. Add externally configured uptime/backup alerts when a cloud domain is actually running; none are currently claimed as active.
