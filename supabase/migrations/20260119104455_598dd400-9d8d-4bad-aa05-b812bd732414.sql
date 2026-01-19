-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store opportunities pushed from Salesforce
CREATE TABLE public.salesforce_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sf_opportunity_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stage_name TEXT,
  amount NUMERIC,
  close_date DATE,
  description TEXT,
  probability INTEGER,
  opportunity_type TEXT,
  sf_account_id TEXT,
  sf_owner_id TEXT,
  account_name TEXT,
  account_industry TEXT,
  account_billing_country TEXT,
  account_rating TEXT,
  owner_name TEXT,
  owner_email TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salesforce_opportunities ENABLE ROW LEVEL SECURITY;

-- Allow public read for now (can be restricted later with auth)
CREATE POLICY "Allow public read of opportunities"
ON public.salesforce_opportunities
FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_sf_opportunity_id ON public.salesforce_opportunities(sf_opportunity_id);
CREATE INDEX idx_close_date ON public.salesforce_opportunities(close_date);
CREATE INDEX idx_stage_name ON public.salesforce_opportunities(stage_name);

-- Add trigger for updated_at
CREATE TRIGGER update_salesforce_opportunities_updated_at
BEFORE UPDATE ON public.salesforce_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();