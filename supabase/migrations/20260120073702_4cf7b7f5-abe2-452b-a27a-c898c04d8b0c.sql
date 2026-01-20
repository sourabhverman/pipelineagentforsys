-- Drop the existing restrictive RLS policy
DROP POLICY IF EXISTS "Users can view own opportunities" ON public.salesforce_opportunities;

-- Create a new public read policy for all opportunities
CREATE POLICY "Public read access for opportunities" 
ON public.salesforce_opportunities 
FOR SELECT 
USING (true);