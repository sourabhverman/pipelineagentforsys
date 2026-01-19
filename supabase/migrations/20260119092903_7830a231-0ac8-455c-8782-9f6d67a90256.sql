-- Create table to store Salesforce OAuth tokens
CREATE TABLE public.salesforce_connections (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  instance_url TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- This table stores sensitive OAuth tokens, so we restrict access
-- Only edge functions with service role key can access this table
ALTER TABLE public.salesforce_connections ENABLE ROW LEVEL SECURITY;

-- No public access policies - only service role can access
-- This is intentional as this table is accessed via edge functions only