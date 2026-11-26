from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_empty_forecast_and_waterfall_have_no_synthetic_revenue():
    forecast = client.post('/api/v1/analytics/forecast', json=[])
    assert forecast.status_code == 200
    assert forecast.json()['weightedPipeline'] == 0
    waterfall = client.post('/api/v1/analytics/conversion-waterfall', json=[]).json()
    assert waterfall['totalFunnelValue'] == 0
    assert all(stage['dealCount'] == 0 for stage in waterfall['stages'])


def test_zero_win_rate_is_preserved():
    response = client.post('/api/v1/analytics/sales-velocity', json={
        'historicalWinRate': 0, 'averageCycleDays': 30,
        'opportunities': [{'id': '1', 'title': 'Deal', 'value': 10000, 'stage': 'Proposal', 'probability': 0, 'status': 'OPEN'}],
    })
    assert response.status_code == 200
    assert response.json()['velocityPerDay'] == 0


def test_negative_money_and_out_of_range_probabilities_are_rejected():
    for value, probability in [(-1, .5), (100, 1.1), (100, -.1)]:
        response = client.post('/api/v1/analytics/forecast', json=[{'id': '1', 'title': 'Deal', 'value': value, 'stage': 'New', 'probability': probability}])
        assert response.status_code == 422


def test_zero_cycle_days_is_rejected():
    assert client.post('/api/v1/analytics/sales-velocity', json={'opportunities': [], 'averageCycleDays': 0}).status_code == 422


def test_batch_normalization_validation_and_duplicate_reporting():
    response = client.post('/api/v1/leads/process-batch', json={'leads': [
        {'email': ' USER@EXAMPLE.COM ', 'firstName': 'Ada', 'lastName': 'Test', 'phone': '(415) 555-0192'},
        {'email': 'user@example.com', 'firstName': 'Ada', 'lastName': 'Test'},
        {'email': 'bad-address'},
    ]})
    assert response.status_code == 200
    result = response.json()
    assert result['leads'][0]['email'] == 'user@example.com'
    assert result['leads'][0]['phone'] == '+14155550192'
    assert result['leads'][1]['duplicate'] == 'EXACT_EMAIL'
    assert len(result['errors']) == 1


def test_batch_size_is_bounded():
    assert client.post('/api/v1/leads/process-batch', json={'leads': [{}] * 2001}).status_code == 422


def test_invalid_utf8_csv_returns_a_safe_validation_error():
    response = client.post('/api/v1/leads/process-csv', files={'file': ('leads.csv', b'\xff\xfe', 'text/csv')})
    assert response.status_code == 422


def test_configurable_explainable_scoring_weights():
    response = client.post('/api/v1/leads/score', json={'email': 'person@gmail.com', 'jobTitle': 'CTO', 'weights': {'base': 0, 'executive': 10}})
    assert response.status_code == 200
    assert response.json()['score'] == 10
    assert response.json()['factors'][0]['points'] == 10
    assert client.post('/api/v1/leads/score', json={'email': 'a@gmail.com', 'weights': {'unknown': 5}}).status_code == 422
