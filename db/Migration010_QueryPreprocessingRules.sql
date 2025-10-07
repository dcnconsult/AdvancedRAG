-- db/Migration010_QueryPreprocessingRules.sql

-- Create a table for dynamic query preprocessing rules
CREATE TABLE IF NOT EXISTS public.query_preprocessing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_type TEXT NOT NULL CHECK (rule_type IN ('synonym', 'expansion', 'pii_detection')),
    pattern TEXT NOT NULL,
    replacement TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a unique index to prevent duplicate rules
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_preprocessing_rule ON public.query_preprocessing_rules(rule_type, pattern);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_preprocessing_rules_type ON public.query_preprocessing_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_preprocessing_rules_active ON public.query_preprocessing_rules(is_active);

-- Add comments for documentation
COMMENT ON TABLE public.query_preprocessing_rules IS 'Stores dynamic rules for query preprocessing, such as synonym replacement and expansion.';
COMMENT ON COLUMN public.query_preprocessing_rules.rule_type IS 'The type of preprocessing rule (e.g., synonym, expansion, pii_detection).';
COMMENT ON COLUMN public.query_preprocessing_rules.pattern IS 'The pattern to match in the query text.';
COMMENT ON COLUMN public.query_preprocessing_rules.replacement IS 'The text to replace the pattern with.';
COMMENT ON COLUMN public.query_preprocessing_rules.is_active IS 'Whether the rule is currently active and should be applied.';

-- Insert some sample rules
INSERT INTO public.query_preprocessing_rules (rule_type, pattern, replacement, is_active) VALUES
('synonym', 'artificial intelligence', 'AI', TRUE),
('synonym', 'machine learning', 'ML', TRUE),
('expansion', 'climate change', 'global warming environmental impact', TRUE)
ON CONFLICT (rule_type, pattern) DO NOTHING;
