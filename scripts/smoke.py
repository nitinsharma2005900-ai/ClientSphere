"""Smoke test the running demonstration stack without printing tokens or secrets."""
import argparse
import json
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--base', default='http://127.0.0.1:3046')
parser.add_argument('--python', default='http://127.0.0.1:8046')
args = parser.parse_args()
base = args.base.rstrip('/') + '/api/v1'


def call(path, data=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read()
        return response.status, json.loads(body) if 'application/json' in response.headers.get('Content-Type', '') else body


_, login = call('/auth/login', {'email': 'admin@clientsphere.io', 'password': 'Password123!'})
token = login['data']['tokens']['accessToken']
checks = {}
for path in ['/health', '/ready', '/users', '/leads', '/contacts', '/companies', '/opportunities', '/pipelines', '/tasks', '/activities', '/workflows', '/workflows/executions', '/imports/jobs', '/integrations/status', '/analytics/dashboard', '/analytics/forecast', '/audit-logs', '/docs/']:
    checks[path] = call(path, token=token)[0]

checks['calendarSandbox'] = call('/integrations/sandbox/calendar', {'title': 'Verified sandbox meeting', 'startTime': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat().replace('+00:00', 'Z'), 'durationMinutes': 30, 'attendeeEmail': 'demo@example.com'}, token)[0]
checks['telephonyMock'] = call('/integrations/sandbox/telephony', {'phoneNumber': '+14155550192', 'direction': 'OUTBOUND', 'durationSeconds': 30}, token)[0]

_, rules = call('/workflows', token=token)
rule = next(row for row in rules['data'] if row['triggerType'] == 'LEAD_CREATED')
_, leads = call('/leads', token=token)
lead = next(row for row in leads['data'] if row['score'] >= 70)
_, queued = call('/workflows/' + rule['id'] + '/trigger', {'entityType': 'LEAD', 'entityId': lead['id']}, token)
execution = queued['data'][0]['id']
for attempt in range(40):
    _, history = call('/workflows/executions', token=token)
    state = next(row['status'] for row in history['data'] if row['id'] == execution)
    if state == 'COMPLETED':
        break
    time.sleep(.25)
assert state == 'COMPLETED', f'Automation did not complete: {state}'

with urllib.request.urlopen(args.python + '/api/v1/leads/benchmark', timeout=20) as response:
    benchmark = json.load(response)
assert benchmark['sampleSize'] == 500 and benchmark['boundedScores']
result = {'checks': checks, 'automation': state, 'benchmark': benchmark}
Path('.data').mkdir(exist_ok=True)
Path('.data/docker-smoke.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
