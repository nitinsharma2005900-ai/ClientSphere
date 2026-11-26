from pathlib import Path

Path('.github/workflows/ci.yml').write_text('''name: ClientSphere checks
on:
  push:
    branches: [main, develop, 'fix/**', 'feature/**']
  pull_request:
permissions:
  contents: read
concurrency:
  group: checks-${{ github.ref }}
  cancel-in-progress: true
jobs:
  tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: local_test_only
          POSTGRES_DB: clientsphere_test
        ports: ['5432:5432']
        options: --health-cmd "pg_isready -U postgres" --health-interval 5s --health-timeout 5s --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 5s --health-timeout 3s --health-retries 10
    env:
      DATABASE_URL: postgresql://postgres:local_test_only@127.0.0.1:5432/clientsphere_test
      TEST_DATABASE_URL: postgresql://postgres:local_test_only@127.0.0.1:5432/clientsphere_test
      REDIS_URL: redis://127.0.0.1:6379
      PYTHON_SERVICE_URL: http://127.0.0.1:8000
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 22, cache: npm}
      - uses: actions/setup-python@v5
        with: {python-version: '3.12', cache: pip}
      - run: npm ci
      - run: pip install -r apps/python_service/requirements-dev.txt
      - run: npm run db:generate && npm run build -w packages/shared-types && npm run build -w apps/backend && npm run db:migrate
      - name: Start intelligence service
        run: |
          python apps/python_service/main.py > /tmp/clientsphere-python.log 2>&1 &
          for attempt in $(seq 1 30); do curl -fsS http://127.0.0.1:8000/health && break; sleep 1; done
          curl -fsS http://127.0.0.1:8000/health
      - run: npm test -w apps/backend
      - run: npm run test:frontend
      - run: ruff check apps/python_service
      - run: pytest -c apps/python_service/pytest.ini -q
      - run: npm run build -w apps/worker && npm run build -w apps/frontend
      - run: npm audit --audit-level=high
      - name: Prepare demonstration database
        run: npm run db:seed
      - name: Start application processes
        run: |
          NODE_ENV=development node apps/backend/dist/server.js > /tmp/clientsphere-api.log 2>&1 &
          npm start -w apps/frontend > /tmp/clientsphere-ui.log 2>&1 &
          for attempt in $(seq 1 30); do curl -fsS http://127.0.0.1:3000/health && break; sleep 1; done
          curl -fsS http://127.0.0.1:3000/health
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          PLAYWRIGHT_CHANNEL: chromium
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: browser-results
          path: test-results/
''')

Path('.github/workflows/security-scan.yml').write_text('''name: Security checks
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'
permissions:
  contents: read
jobs:
  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: 22, cache: npm}
      - run: npm ci --ignore-scripts
      - run: npm audit --audit-level=high
  codeql:
    if: github.event.repository.private == false
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript,python
      - uses: github/codeql-action/analyze@v3
''')

Path('.github/workflows/release.yml').write_text('''name: Container builds
on:
  workflow_dispatch:
  push:
    tags: ['v*.*.*']
permissions:
  contents: read
jobs:
  containers:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [backend, frontend, python]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile.${{ matrix.service }}
          push: false
''')
