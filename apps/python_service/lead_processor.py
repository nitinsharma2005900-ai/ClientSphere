# ClientSphere Lead Normalization, Deduplication & Scoring Engine (Assessment 05)
# Developer: Nitin Sharma

import re
from typing import Any

from models import (
    DuplicateCandidate,
    FactorCategory,
    LeadScoreRequest,
    LeadScoreResponse,
    PriorityTier,
    ScoreFactor,
)


class LeadProcessor:
    @staticmethod
    def normalize_email(email: str) -> str:
        if not email:
            return ""
        return email.strip().lower()

    @staticmethod
    def normalize_phone(phone: str) -> str:
        if not phone:
            return ""
        digits = re.sub(r"[^\d+]", "", phone)
        if not digits.startswith("+") and len(digits) == 10:
            return f"+1{digits}"
        return digits

    @staticmethod
    def normalize_company(company: str) -> str:
        if not company:
            return ""
        # Remove common corporate suffixes and symbols
        clean = company.strip().lower()
        clean = re.sub(r"\b(inc|llc|corp|corporation|ltd|limited|co|gmbh|sa)\b\.?", "", clean)
        clean = re.sub(r"[^\w\s]", "", clean)
        return " ".join(clean.split())

    @classmethod
    def calculate_lead_score(cls, lead: LeadScoreRequest) -> LeadScoreResponse:
        score = 20  # Base entry score
        factors: list[ScoreFactor] = []

        # 1. Job Title Evaluation (Demographic)
        title = (lead.jobTitle or "").lower()
        if any(term in title for term in ["cxo", "ceo", "cto", "cfo", "cio", "vp", "president", "founder", "director", "chief", "officer"]):
            score += 35
            factors.append(ScoreFactor(
                factor="Executive Decision Maker",
                points=35,
                category=FactorCategory.DEMOGRAPHIC,
                explanation=f"Title '{lead.jobTitle}' indicates direct budget authorization authority."
            ))
        elif any(term in title for term in ["manager", "lead", "head", "architect", "supervisor"]):
            score += 20
            factors.append(ScoreFactor(
                factor="Technical Management",
                points=20,
                category=FactorCategory.DEMOGRAPHIC,
                explanation=f"Title '{lead.jobTitle}' indicates significant project influence."
            ))

        # 2. Firmographic & Company Size Evaluation
        norm_company = cls.normalize_company(lead.companyName or "")
        if norm_company:
            score += 15
            factors.append(ScoreFactor(
                factor="Identified Commercial Enterprise",
                points=15,
                category=FactorCategory.FIRMOGRAPHIC,
                explanation=f"Company '{lead.companyName}' is an established business organization."
            ))

        if lead.employeeCount and lead.employeeCount >= 500:
            score += 15
            factors.append(ScoreFactor(
                factor="Enterprise Scale Company",
                points=15,
                category=FactorCategory.FIRMOGRAPHIC,
                explanation=f"Organization scale with {lead.employeeCount}+ staff satisfies enterprise qualification."
            ))

        # 3. Contact & Telephony Richness (Engagement)
        norm_phone = cls.normalize_phone(lead.phone or "")
        if norm_phone and len(norm_phone) >= 10:
            score += 15
            factors.append(ScoreFactor(
                factor="Direct Outbound Telephony Verified",
                points=15,
                category=FactorCategory.ENGAGEMENT,
                explanation="Verified phone number facilitates multi-channel outbound cadence."
            ))

        # 4. Domain & Email Type Check
        email = cls.normalize_email(lead.email)
        public_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"]
        domain = email.split("@")[-1] if "@" in email else ""
        if domain and domain not in public_domains:
            score += 10
            factors.append(ScoreFactor(
                factor="Corporate Domain Address",
                points=10,
                category=FactorCategory.ENGAGEMENT,
                explanation=f"Corporate email on domain '@{domain}' confirms institutional identity."
            ))

        # 5. Acquisition Channel Source (Timing)
        src = (lead.source or "").upper()
        if src in ["REFERRAL", "INBOUND_FORM"]:
            score += 15
            factors.append(ScoreFactor(
                factor="High Intent Acquisition Source",
                points=15,
                category=FactorCategory.TIMING,
                explanation=f"Inbound acquisition via {src} exhibits superior sales acceleration."
            ))

        # Boundary clamping [0, 100]
        final_score = min(100, max(0, score))
        tier = PriorityTier.HOT if final_score >= 70 else PriorityTier.WARM if final_score >= 40 else PriorityTier.COLD

        action_map = {
            PriorityTier.HOT: "Assign to Senior Enterprise Rep for immediate same-day discovery call.",
            PriorityTier.WARM: "Enroll in targeted 5-step email sandbox nurture sequence.",
            PriorityTier.COLD: "Place into marketing quarterly newsletter digest."
        }

        return LeadScoreResponse(
            score=final_score,
            priorityTier=tier,
            confidence=0.92,
            factors=factors,
            recommendedAction=action_map[tier]
        )

    @classmethod
    def detect_duplicates(cls, leads: list[dict[str, Any]]) -> list[DuplicateCandidate]:
        duplicates: list[DuplicateCandidate] = []
        email_map: dict[str, int] = {}
        phone_map: dict[str, int] = {}

        for idx, item in enumerate(leads):
            email = cls.normalize_email(item.get("email", ""))
            phone = cls.normalize_phone(item.get("phone", ""))
            name = f"{item.get('firstName', '')} {item.get('lastName', '')}".strip().lower()
            company = cls.normalize_company(item.get("companyName", ""))

            # Exact email collision
            if email:
                if email in email_map:
                    duplicates.append(DuplicateCandidate(
                        recordIndex=idx,
                        matchedWithIndex=email_map[email],
                        matchType="EXACT_EMAIL",
                        confidence=1.0,
                        reason=f"Identical normalized email '{email}' detected."
                    ))
                else:
                    email_map[email] = idx

            # Exact phone collision
            if phone and len(phone) >= 10:
                if phone in phone_map:
                    duplicates.append(DuplicateCandidate(
                        recordIndex=idx,
                        matchedWithIndex=phone_map[phone],
                        matchType="EXACT_PHONE",
                        confidence=0.95,
                        reason=f"Identical telephony identifier '{phone}' detected."
                    ))
                else:
                    phone_map[phone] = idx

            # Fuzzy name + company check against previous records
            for prev_idx in range(idx):
                prev_item = leads[prev_idx]
                prev_name = f"{prev_item.get('firstName', '')} {prev_item.get('lastName', '')}".strip().lower()
                prev_company = cls.normalize_company(prev_item.get("companyName", ""))

                if name and prev_name and company and prev_company and company == prev_company:
                    similarity = cls._levenshtein_ratio(name, prev_name)
                    if similarity >= 0.85:
                        duplicates.append(DuplicateCandidate(
                            recordIndex=idx,
                            matchedWithIndex=prev_idx,
                            matchType="FUZZY_NAME_COMPANY",
                            confidence=round(similarity, 2),
                            reason=f"Fuzzy match (similarity {similarity:.0%}) on contact name '{name}' within company '{company}'."
                        ))
                        break

        return duplicates

    @staticmethod
    def _levenshtein_ratio(s1: str, s2: str) -> float:
        if s1 == s2:
            return 1.0
        if not s1 or not s2:
            return 0.0

        len1, len2 = len(s1), len(s2)
        matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

        for i in range(len1 + 1):
            matrix[i][0] = i
        for j in range(len2 + 1):
            matrix[0][j] = j

        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                matrix[i][j] = min(
                    matrix[i - 1][j] + 1,      # deletion
                    matrix[i][j - 1] + 1,      # insertion
                    matrix[i - 1][j - 1] + cost # substitution
                )

        distance = matrix[len1][len2]
        return 1.0 - (distance / max(len1, len2))
