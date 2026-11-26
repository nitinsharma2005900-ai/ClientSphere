# ClientSphere Sales Intelligence Engine (Assessment 06)
# Sales Velocity Formula, Conversion Waterfall & Revenue Forecasting
# Developer: Nitin Sharma

from datetime import UTC, datetime

from models import (
    ConversionStage,
    ConversionWaterfallResponse,
    ForecastQuarter,
    ForecastResponse,
    OpportunityInput,
    SalesVelocityRequest,
    SalesVelocityResponse,
)


class SalesIntelligence:
    @staticmethod
    def calculate_sales_velocity(request: SalesVelocityRequest) -> SalesVelocityResponse:
        """
        Sales Velocity Formula:
        V = (L * WR * AS) / T
        Where:
        - L = Number of active qualified opportunities
        - WR = Historical Win Rate %
        - AS = Average Deal Size ($)
        - T = Sales Cycle Length (Days)
        """
        active_deals = [d for d in request.opportunities if d.status == "OPEN"]
        active_count = len(active_deals)
        total_value = sum(d.value for d in active_deals)
        avg_deal_size = (total_value / active_count) if active_count > 0 else 0.0

        win_rate = request.historicalWinRate
        cycle_days = request.averageCycleDays

        # Velocity per day in USD
        velocity_per_day = (active_count * win_rate * avg_deal_size) / cycle_days
        projected_monthly = velocity_per_day * 30.0

        # Sensitivity Analysis (+/- 10% on deal size and win rate)
        sensitivity = {
            "pessimistic_monthly": ((active_count * (win_rate * 0.9) * (avg_deal_size * 0.9)) / cycle_days) * 30.0,
            "baseline_monthly": projected_monthly,
            "optimistic_monthly": ((active_count * (win_rate * 1.1) * (avg_deal_size * 1.1)) / cycle_days) * 30.0,
        }

        return SalesVelocityResponse(
            activeDealsCount=active_count,
            winRate=round(win_rate, 4),
            averageDealSize=round(avg_deal_size, 2),
            salesCycleDays=cycle_days,
            velocityPerDay=round(velocity_per_day, 2),
            projectedMonthlyRevenue=round(projected_monthly, 2),
            sensitivity={k: round(v, 2) for k, v in sensitivity.items()},
            formula="V = (Qualified Deals * Win Rate * Average Deal Size) / Sales Cycle Days"
        )

    @staticmethod
    def generate_conversion_waterfall(opportunities: list[OpportunityInput]) -> ConversionWaterfallResponse:
        stage_order = [
            ("Prospecting", 0.10),
            ("Qualification", 0.25),
            ("Proposal & Demo", 0.50),
            ("Negotiation", 0.75),
            ("Closed Won", 1.00),
        ]

        stage_metrics = []
        total = len(opportunities)
        won = sum(o.status == 'WON' for o in opportunities)
        for stage_name, _ in stage_order:
            deals = [o for o in opportunities if o.stage.lower() == stage_name.lower()]
            stage_metrics.append(ConversionStage(stageName=stage_name, dealCount=len(deals), totalValue=sum(o.value for o in deals), conversionRateToNext=0, cumulativeYield=0))
        return ConversionWaterfallResponse(stages=stage_metrics, overallPipelineConversionRate=won / total if total else 0, totalFunnelValue=sum(o.value for o in opportunities))

    @staticmethod
    def calculate_forecast(opportunities: list[OpportunityInput]) -> ForecastResponse:
        open_deals = [o for o in opportunities if o.status == "OPEN"]
        won_deals = [o for o in opportunities if o.status == "WON"]

        weighted_pipeline = sum(o.value * o.probability for o in open_deals)
        commit_pipeline = sum(o.value for o in open_deals if o.probability >= 0.7)
        best_case_pipeline = sum(o.value for o in open_deals if o.probability >= 0.4)

        now = datetime.now(UTC)
        current = now.year * 4 + (now.month - 1) // 3
        quarterly = []
        for offset in range(4):
            period = current + offset
            def belongs(deal, offset=offset, period=period):
                date = deal.actualCloseDate if deal.status == 'WON' else deal.expectedCloseDate
                if not date:
                    return offset == 0
                parsed = datetime.fromisoformat(date)
                return parsed.year * 4 + (parsed.month - 1) // 3 == period
            active = [o for o in open_deals if belongs(o)]
            closed = [o for o in won_deals if belongs(o)]
            quarterly.append(ForecastQuarter(quarter=f'Q{period % 4 + 1} {period // 4}', closedWon=sum(o.value for o in closed), commit=sum(o.value for o in active if o.probability >= .7), weighted=sum(o.value * o.probability for o in active), bestCase=sum(o.value for o in active if o.probability >= .4)))

        return ForecastResponse(
            weightedPipeline=round(weighted_pipeline, 2),
            commitPipeline=round(commit_pipeline, 2),
            bestCasePipeline=round(best_case_pipeline, 2),
            quarterlyProjections=quarterly,
            assumptions=[
                "Weighted forecast equals the sum of open deal value times its stage probability.",
                "Commit represents deals having >= 70% confidence probability.",
                "Best case includes open deals with probability >= 40%; no synthetic expansion.",
                "Quarters use expected close dates for open deals and actual dates for won deals; undated deals fall in the current quarter.",
            ]
        )
