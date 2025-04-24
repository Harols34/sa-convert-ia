
-- Create a storage bucket for call audio files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('calls', 'Call Recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Set up a policy to allow public read access to the bucket
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'calls')
    ON CONFLICT DO NOTHING;

-- Set up a policy to allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'calls' AND auth.role() = 'authenticated')
    ON CONFLICT DO NOTHING;

-- Set up a policy to allow authenticated users to update their files
CREATE POLICY "Authenticated Update" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'calls' AND auth.role() = 'authenticated')
    ON CONFLICT DO NOTHING;

-- Set up a policy to allow authenticated users to delete their files
CREATE POLICY "Authenticated Delete" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'calls' AND auth.role() = 'authenticated')
    ON CONFLICT DO NOTHING;
