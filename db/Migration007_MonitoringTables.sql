/**
 * Migration 007: Monitoring and Analytics Tables
 * 
 * Creates tables for storing RAG pipeline execution metrics, monitoring data,
 * and alert configurations.
 * 
 * Tables:
 * - rag_executions: Stores execution results and metrics
 * - monitoring_alerts: Active and resolved alerts
 * - alert_configurations: Alert rules and configurations
 * 
 * Features:
 * - Performance tracking
 * - Cost analytics
 * - Health monitoring
 * - Alert management
 */

-- ============================================================================
-- RAG Executions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rag_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Query information
    query TEXT NOT NULL,
    techniques TEXT[] NOT NULL,
    document_ids UUID[] NOT NULL,
    domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
    
    -- Results
    result_count INTEGER NOT NULL DEFAULT 0,
    overall_confidence DECIMAL(3, 2),
    fusion_strategy TEXT,
    best_technique TEXT,
    technique_agreement DECIMAL(3, 2),
    
    -- Performance metrics
    execution_time_ms INTEGER NOT NULL,
    
    -- Cost tracking
    total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT rag_executions_confidence_check CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
    CONSTRAINT rag_executions_technique_agreement_check CHECK (technique_agreement >= 0 AND technique_agreement <= 1)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_executions_user_id ON rag_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_executions_created_at ON rag_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_executions_domain_id ON rag_executions(domain_id);
CREATE INDEX IF NOT EXISTS idx_rag_executions_techniques ON rag_executions USING GIN(techniques);
CREATE INDEX IF NOT EXISTS idx_rag_executions_request_id ON rag_executions(request_id);

-- Create composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_rag_executions_analytics 
    ON rag_executions(user_id, created_at DESC, total_cost);

COMMENT ON TABLE rag_executions IS 'Stores RAG pipeline execution results and metrics for analytics';
COMMENT ON COLUMN rag_executions.request_id IS 'Unique identifier for the request';
COMMENT ON COLUMN rag_executions.techniques IS 'Array of RAG techniques used in this execution';
COMMENT ON COLUMN rag_executions.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN rag_executions.total_cost IS 'Estimated cost in USD';
COMMENT ON COLUMN rag_executions.fusion_strategy IS 'Result aggregation strategy used';
COMMENT ON COLUMN rag_executions.best_technique IS 'Best performing technique for this query';
COMMENT ON COLUMN rag_executions.technique_agreement IS 'Agreement score between techniques (0-1)';

-- ============================================================================
-- Monitoring Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT NOT NULL,
    
    -- Alert details
    name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved')),
    message TEXT NOT NULL,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Alert configuration reference
    alert_config_id UUID REFERENCES alert_configurations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_triggered_at ON monitoring_alerts(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_alert_id ON monitoring_alerts(alert_id);

COMMENT ON TABLE monitoring_alerts IS 'Stores active and resolved monitoring alerts';
COMMENT ON COLUMN monitoring_alerts.alert_id IS 'Identifier linking to alert configuration';
COMMENT ON COLUMN monitoring_alerts.severity IS 'Alert severity: info, warning, or critical';
COMMENT ON COLUMN monitoring_alerts.status IS 'Current alert status: active or resolved';

-- ============================================================================
-- Alert Configurations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT NOT NULL UNIQUE,
    
    -- Configuration
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Condition
    metric TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN ('>', '<', '=', '>=', '<=')),
    threshold DECIMAL(10, 2) NOT NULL,
    
    -- Alert settings
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    notification_channels TEXT[] NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_configurations_enabled ON alert_configurations(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_configurations_metric ON alert_configurations(metric);
CREATE INDEX IF NOT EXISTS idx_alert_configurations_alert_id ON alert_configurations(alert_id);

COMMENT ON TABLE alert_configurations IS 'Stores alert rule configurations';
COMMENT ON COLUMN alert_configurations.metric IS 'Metric to monitor (e.g., execution_time_ms, cost, error_rate)';
COMMENT ON COLUMN alert_configurations.operator IS 'Comparison operator for threshold';
COMMENT ON COLUMN alert_configurations.threshold IS 'Threshold value that triggers the alert';
COMMENT ON COLUMN alert_configurations.notification_channels IS 'Array of notification channels (email, slack, etc.)';

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE rag_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rag_executions
CREATE POLICY "Users can view their own executions"
    ON rag_executions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert executions"
    ON rag_executions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete their own executions"
    ON rag_executions
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for monitoring_alerts
CREATE POLICY "Authenticated users can view alerts"
    ON monitoring_alerts
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage alerts"
    ON monitoring_alerts
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for alert_configurations
CREATE POLICY "Authenticated users can view alert configurations"
    ON alert_configurations
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own alert configurations"
    ON alert_configurations
    FOR ALL
    USING (auth.uid() = created_by);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for alert_configurations
CREATE TRIGGER update_alert_configurations_updated_at
    BEFORE UPDATE ON alert_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-resolve old alerts
CREATE OR REPLACE FUNCTION auto_resolve_old_alerts()
RETURNS void AS $$
BEGIN
    UPDATE monitoring_alerts
    SET status = 'resolved',
        resolved_at = NOW()
    WHERE status = 'active'
      AND triggered_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Analytics Views
-- ============================================================================

-- View for daily execution metrics
CREATE OR REPLACE VIEW daily_execution_metrics AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE result_count > 0) as successful_executions,
    COUNT(*) FILTER (WHERE result_count = 0) as failed_executions,
    AVG(execution_time_ms) as avg_execution_time_ms,
    MAX(execution_time_ms) as max_execution_time_ms,
    MIN(execution_time_ms) as min_execution_time_ms,
    SUM(total_cost) as total_cost,
    AVG(overall_confidence) as avg_confidence
FROM rag_executions
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW daily_execution_metrics IS 'Daily aggregated metrics for RAG executions';

-- View for technique performance
CREATE OR REPLACE VIEW technique_performance AS
SELECT
    UNNEST(techniques) as technique,
    COUNT(*) as execution_count,
    AVG(execution_time_ms) as avg_execution_time_ms,
    SUM(total_cost) as total_cost,
    AVG(overall_confidence) as avg_confidence,
    COUNT(*) FILTER (WHERE result_count > 0) as successful_count,
    (COUNT(*) FILTER (WHERE result_count > 0)::DECIMAL / COUNT(*)) * 100 as success_rate
FROM rag_executions
GROUP BY UNNEST(techniques)
ORDER BY execution_count DESC;

COMMENT ON VIEW technique_performance IS 'Performance metrics aggregated by RAG technique';

-- View for user analytics
CREATE OR REPLACE VIEW user_analytics AS
SELECT
    user_id,
    COUNT(*) as total_queries,
    SUM(total_cost) as total_cost,
    AVG(execution_time_ms) as avg_execution_time_ms,
    COUNT(DISTINCT domain_id) as domains_used,
    MIN(created_at) as first_query_at,
    MAX(created_at) as last_query_at
FROM rag_executions
GROUP BY user_id;

COMMENT ON VIEW user_analytics IS 'Analytics aggregated by user';

-- ============================================================================
-- Grants
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON rag_executions TO authenticated;
GRANT SELECT ON monitoring_alerts TO authenticated;
GRANT SELECT ON alert_configurations TO authenticated;

GRANT SELECT ON daily_execution_metrics TO authenticated;
GRANT SELECT ON technique_performance TO authenticated;
GRANT SELECT ON user_analytics TO authenticated;

-- Service role has full access
GRANT ALL ON rag_executions TO service_role;
GRANT ALL ON monitoring_alerts TO service_role;
GRANT ALL ON alert_configurations TO service_role;

-- ============================================================================
-- Sample Alert Configurations
-- ============================================================================

-- High latency alert
INSERT INTO alert_configurations (alert_id, name, metric, operator, threshold, severity, notification_channels)
VALUES (
    'high-latency-alert',
    'High Execution Latency',
    'execution_time_ms',
    '>',
    20000,
    'warning',
    ARRAY['email']
) ON CONFLICT (alert_id) DO NOTHING;

-- High cost alert
INSERT INTO alert_configurations (alert_id, name, metric, operator, threshold, severity, notification_channels)
VALUES (
    'high-cost-alert',
    'High Execution Cost',
    'total_cost',
    '>',
    1.0,
    'critical',
    ARRAY['email', 'slack']
) ON CONFLICT (alert_id) DO NOTHING;

-- Low confidence alert
INSERT INTO alert_configurations (alert_id, name, metric, operator, threshold, severity, notification_channels)
VALUES (
    'low-confidence-alert',
    'Low Result Confidence',
    'overall_confidence',
    '<',
    0.5,
    'info',
    ARRAY['email']
) ON CONFLICT (alert_id) DO NOTHING;

COMMENT ON COLUMN rag_executions.request_id IS 'Migration 007: Added monitoring tables for RAG pipeline analytics';

