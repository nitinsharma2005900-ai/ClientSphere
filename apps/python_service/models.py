# ClientSphere Python Service Models
# Pydantic Schemas for Lead Processing & Sales Intelligence
# Developer: Nitin Sharma

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PriorityTier(str, Enum):
    HOT = "HOT"
    WARM = "WARM"
    COLD = "COLD"

class FactorCategory(str, Enum):
    FIRMOGRAPHIC = "FIRMOGRAPHIC"
    ENGAGEMENT = "ENGAGEMENT"
    DEMOGRAPHIC = "DEMOGRAPHIC"
    TIMING = "TIMING"

class ScoreFactor(BaseModel):
    factor: str
    points: int
    category: FactorCategory
    explanation: str

class LeadScoreRequest(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str
    phone: str | None = None
    companyName: str | None = None
    jobTitle: str | None = None
    employeeCount: int | None = None
    annualRevenue: float | None = None
    source: str | None = "WEBSITE"

class LeadScoreResponse(BaseModel):
    score: int
    priorityTier: PriorityTier
    confidence: float
    factors: list[ScoreFactor]
    recommendedAction: str

class DuplicateCandidate(BaseModel):
    recordIndex: int
    matchedWithIndex: int
    matchType: str  # EXACT_EMAIL, EXACT_PHONE, FUZZY_NAME_COMPANY
    confidence: float
    reason: str

class LeadCsvProcessingResult(BaseModel):
    totalRows: int
    normalizedRows: int
    duplicateCount: int
    duplicates: list[DuplicateCandidate]
    leads: list[dict[str, Any]]
    processingTimeMs: float

class OpportunityInput(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    id: str
    title: str
    value: float = Field(ge=0)
    stage: str
    probability: float = Field(ge=0, le=1)
    daysInPipeline: int = Field(default=30, ge=0)
    expectedCloseDate: str | None = None
    actualCloseDate: str | None = None
    status: str | None = "OPEN"

class SalesVelocityRequest(BaseModel):
    opportunities: list[OpportunityInput]
    historicalWinRate: float = Field(default=0.35, ge=0, le=1)
    averageCycleDays: float = Field(default=34.5, gt=0)

class SalesVelocityResponse(BaseModel):
    activeDealsCount: int
    winRate: float
    averageDealSize: float
    salesCycleDays: float
    velocityPerDay: float
    projectedMonthlyRevenue: float
    sensitivity: dict[str, float]
    formula: str

class ConversionStage(BaseModel):
    stageName: str
    dealCount: int
    totalValue: float
    conversionRateToNext: float
    cumulativeYield: float

class ConversionWaterfallResponse(BaseModel):
    stages: list[ConversionStage]
    overallPipelineConversionRate: float
    totalFunnelValue: float

class ForecastQuarter(BaseModel):
    quarter: str
    closedWon: float
    commit: float
    weighted: float
    bestCase: float

class ForecastResponse(BaseModel):
    weightedPipeline: float
    commitPipeline: float
    bestCasePipeline: float
    quarterlyProjections: list[ForecastQuarter]
    assumptions: list[str]
