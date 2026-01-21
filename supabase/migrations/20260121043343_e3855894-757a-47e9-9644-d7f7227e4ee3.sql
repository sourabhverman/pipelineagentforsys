-- Add sync tracking columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS synced_to_sf BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sf_task_id TEXT;

-- Create action_logs table to track all actions for Salesforce sync
CREATE TABLE public.action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'add_note', 'update_stage')),
  opportunity_id TEXT NOT NULL,
  opportunity_name TEXT,
  payload JSONB NOT NULL,
  synced_to_sf BOOLEAN DEFAULT false,
  synced_at TIMESTAMP WITH TIME ZONE,
  sf_record_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Public read for webhook access
CREATE POLICY "Public read access for action_logs"
ON public.action_logs
FOR SELECT
USING (true);

-- Service role full access
CREATE POLICY "Service role full access for action_logs"
ON public.action_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Index for efficient polling of unsynced actions
CREATE INDEX idx_action_logs_unsynced ON public.action_logs(synced_to_sf, created_at) WHERE synced_to_sf = false;
CREATE INDEX idx_tasks_unsynced ON public.tasks(synced_to_sf, created_at) WHERE synced_to_sf = false;