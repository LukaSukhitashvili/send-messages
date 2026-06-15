-- Cloud Mailbox Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message images table
CREATE TABLE IF NOT EXISTS message_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_images_message_id ON message_images(message_id);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_images ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous insert (frontend)
CREATE POLICY "Allow anonymous insert messages" ON messages
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous insert images" ON message_images
  FOR INSERT TO anon WITH CHECK (true);

-- Policies for service role (backend/admin)
CREATE POLICY "Service role full access messages" ON messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access images" ON message_images
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Storage bucket for images
-- Run this in Supabase Dashboard > Storage > Create bucket "message-images"
-- Or run via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('message-images', 'message-images', false);

-- Storage policies
-- Allow anonymous upload
CREATE POLICY "Allow anonymous upload" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'message-images');

-- Allow service role full access
CREATE POLICY "Service role full access storage" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'message-images') WITH CHECK (bucket_id = 'message-images');