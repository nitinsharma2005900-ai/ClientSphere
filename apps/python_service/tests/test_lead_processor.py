# Tests for Assessment 05: Lead Processor, Normalization, Deduplication & Scoring
# Developer: Nitin Sharma

from lead_processor import LeadProcessor
from models import LeadScoreRequest, PriorityTier


def test_normalization():
    # Email normalization
    assert LeadProcessor.normalize_email("  John.DOE@Enterprise.COM  ") == "john.doe@enterprise.com"

    # Phone normalization
    assert LeadProcessor.normalize_phone("(415) 555-0192") == "+14155550192"
    assert LeadProcessor.normalize_phone("+44 20 7946 0991") == "+442079460991"

    # Company name normalization
    assert LeadProcessor.normalize_company("Apex Cloud Solutions, Inc.") == "apex cloud solutions"
    assert LeadProcessor.normalize_company("Vanguard Cyber LLC.") == "vanguard cyber"

def test_lead_scoring_hot_executive():
    lead = LeadScoreRequest(
        firstName="Victoria",
        lastName="Sterling",
        email="v.sterling@apexcloud.io",
        phone="+1-415-555-0192",
        companyName="Apex Global Cloud Solutions Inc.",
        jobTitle="Chief Technology Officer",
        employeeCount=4500,
        source="INBOUND_FORM"
    )

    result = LeadProcessor.calculate_lead_score(lead)
    assert result.score >= 70
    assert result.priorityTier == PriorityTier.HOT
    assert len(result.factors) >= 4
    # Check that executive title points were awarded
    factor_names = [f.factor for f in result.factors]
    assert "Executive Decision Maker" in factor_names

def test_lead_scoring_cold():
    lead = LeadScoreRequest(
        firstName="Anonymous",
        lastName="Visitor",
        email="user123@gmail.com",
        jobTitle="Student Intern",
        source="COLD_OUTREACH"
    )

    result = LeadProcessor.calculate_lead_score(lead)
    assert result.score < 40
    assert result.priorityTier == PriorityTier.COLD

def test_exact_and_fuzzy_deduplication():
    records = [
        {
            "firstName": "Alexander",
            "lastName": "Hayes",
            "email": "a.hayes@vanguardcyber.com",
            "phone": "+12025550144",
            "companyName": "Vanguard Cyber Systems",
        },
        {
            # Exact email duplicate
            "firstName": "Alex",
            "lastName": "Hayes",
            "email": "A.HAYES@vanguardcyber.com",
            "phone": "+12025559999",
            "companyName": "Vanguard Cyber Systems",
        },
        {
            # Fuzzy name duplicate in same company
            "firstName": "Alexande",
            "lastName": "Hayes",
            "email": "secondary@vanguardcyber.com",
            "phone": "+12025550144",
            "companyName": "Vanguard Cyber Systems Inc",
        }
    ]

    duplicates = LeadProcessor.detect_duplicates(records)
    assert len(duplicates) >= 2
    types = [d.matchType for d in duplicates]
    assert "EXACT_EMAIL" in types
    assert "EXACT_PHONE" in types or "FUZZY_NAME_COMPANY" in types
