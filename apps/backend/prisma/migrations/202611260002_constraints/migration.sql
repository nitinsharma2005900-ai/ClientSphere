
-- Financial and score invariants also protect direct database writes.
ALTER TABLE opportunities ADD CONSTRAINT opportunity_value_nonnegative CHECK (value >= 0), ADD CONSTRAINT opportunity_probability_range CHECK (probability >= 0 AND probability <= 1);
ALTER TABLE opportunity_members ADD CONSTRAINT commission_range CHECK ("commissionShare" >= 0 AND "commissionShare" <= 1);
ALTER TABLE pipeline_stages ADD CONSTRAINT stage_probability_range CHECK ("winProbability" >= 0 AND "winProbability" <= 1);
ALTER TABLE leads ADD CONSTRAINT score_range CHECK (score >= 0 AND score <= 100);
