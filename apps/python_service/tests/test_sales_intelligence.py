# Tests for Assessment 06: Sales Intelligence, Velocity & Forecasting
# Developer: Nitin Sharma

from models import OpportunityInput, SalesVelocityRequest
from sales_intelligence import SalesIntelligence


def test_sales_velocity_calculation():
    sample_deals = [
        OpportunityInput(id="deal-1", title="Cloud Migration", value=100000.0, stage="Proposal", probability=0.5, status="OPEN"),
        OpportunityInput(id="deal-2", title="Security Audit", value=50000.0, stage="Negotiation", probability=0.75, status="OPEN"),
    ]

    req = SalesVelocityRequest(
        opportunities=sample_deals,
        historicalWinRate=0.40,
        averageCycleDays=30.0
    )

    res = SalesIntelligence.calculate_sales_velocity(req)
    # Average deal size = 75000, active = 2, win_rate = 0.4, cycle = 30
    # Velocity = (2 * 0.4 * 75000) / 30 = 60000 / 30 = 2000 USD/day
    assert res.velocityPerDay == 2000.0
    assert res.projectedMonthlyRevenue == 60000.0
    assert res.sensitivity["optimistic_monthly"] > res.sensitivity["baseline_monthly"]
    assert res.sensitivity["pessimistic_monthly"] < res.sensitivity["baseline_monthly"]

def test_conversion_waterfall_cumulative_yield():
    deals = [
        OpportunityInput(id="1", title="A", value=10000, stage="Prospecting", probability=0.1),
        OpportunityInput(id="2", title="B", value=20000, stage="Qualification", probability=0.25),
        OpportunityInput(id="3", title="C", value=50000, stage="Closed Won", probability=1.0, status="WON"),
    ]

    res = SalesIntelligence.generate_conversion_waterfall(deals)
    assert len(res.stages) == 5
    assert res.stages[0].stageName == "Prospecting"
    assert res.stages[-1].stageName == "Closed Won"
    assert res.overallPipelineConversionRate > 0

def test_revenue_forecast():
    deals = [
        OpportunityInput(id="1", title="A", value=100000, stage="Negotiation", probability=0.8, status="OPEN"),
        OpportunityInput(id="2", title="B", value=50000, stage="Proposal", probability=0.4, status="OPEN"),
        OpportunityInput(id="3", title="C", value=75000, stage="Closed Won", probability=1.0, status="WON"),
    ]

    res = SalesIntelligence.calculate_forecast(deals)
    # Weighted = 100000*0.8 + 50000*0.4 = 80000 + 20000 = 100000
    assert res.weightedPipeline == 100000.0
    # Commit (prob >= 0.7) = 100000
    assert res.commitPipeline == 100000.0
    assert len(res.quarterlyProjections) == 4
