-- Create table to store PKCE code verifiers temporarily
CREATE TABLE public.salesforce_pkce (
  state TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS - only service role can access
ALTER TABLE public.salesforce_pkce ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old PKCE records (older than 10 minutes)
-- This is optional but helps keep the table clean
CREATE OR REPLACE FUNCTION public.cleanup_old_pkce()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.salesforce_pkce WHERE created_at < NOW() - INTERVAL '10 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER cleanup_pkce_trigger
AFTER INSERT ON public.salesforce_pkce
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_pkce();