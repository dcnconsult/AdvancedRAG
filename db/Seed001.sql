-- Seed Data for RAG Showcase (Data Only - No Schema Creation)
-- Run this after migrations are applied

-- Insert preloaded domains for MVP
INSERT INTO public.domains (name, description, source_type, created_at) VALUES
    ('Artificial Intelligence', 'General AI concepts, machine learning, and neural networks', 'preloaded', NOW()),
    ('Climate Science', 'Climate change research, environmental data, and sustainability', 'preloaded', NOW()),
    ('Medical Research', 'Healthcare studies, medical procedures, and pharmaceutical research', 'preloaded', NOW())
ON CONFLICT DO NOTHING;

-- Insert sample documents for preloaded domains (placeholder - actual documents would be uploaded)
-- Note: In production, these would be actual PDF documents processed into chunks with embeddings
INSERT INTO public.documents (domain_id, filename, file_path, status, created_at) 
SELECT 
    d.id,
    'sample_' || d.name || '.pdf',
    'documents/' || d.id || '/sample.pdf',
    'completed',
    NOW()
FROM public.domains d
WHERE d.source_type = 'preloaded'
ON CONFLICT DO NOTHING;

-- Insert sample analytics events
INSERT INTO public.analytics_events (event_name, event_data, created_at) VALUES
    ('app_initialized', '{"version": "1.0.0", "platform": "ios"}', NOW()),
    ('app_initialized', '{"version": "1.0.0", "platform": "android"}', NOW())
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create storage buckets (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', false, 10485760, ARRAY['application/pdf']),
    ('avatars', 'avatars', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

