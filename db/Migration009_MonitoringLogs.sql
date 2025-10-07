-- db/Migration009_MonitoringLogs.sql

-- Create a table to store monitoring logs for performance and errors
CREATE TABLE IF NOT EXISTS public.monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name TEXT NOT NULL,
    log_type TEXT NOT NULL CHECK (log_type IN ('performance', 'error')),
    metrics JSONB,
    error_message TEXT,
    error_stack TEXT,
    user_id UUID,
    request_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_service_name ON public.monitoring_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_log_type ON public.monitoring_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_created_at ON public.monitoring_logs(created_at);

-- Add comments to document the table and columns
COMMENT ON TABLE public.monitoring_logs IS 'Stores performance and error logs from various services for monitoring and analysis.';
COMMENT ON COLUMN public.monitoring_logs.service_name IS 'The name of the service or function generating the log (e.g., reranking, rag-orchestrator).';
COMMENT ON COLUMN public.monitoring_logs.log_type IS 'The type of log entry, either ''performance'' or ''error''.';
COMMENT ON COLUMN public.monitoring_logs.metrics IS 'A JSONB object containing performance metrics.';
COMMENT ON COLUMN public.monitoring_logs.error_message IS 'The error message for logs of type ''error''.';
COMMENT ON COLUMN public.monitoring_logs.error_stack IS 'The stack trace for logs of type ''error''.';
