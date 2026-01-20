-- Drop the restrictive public read policy
DROP POLICY IF EXISTS "Public read access for opportunities" ON public.salesforce_opportunities;

-- Create a PERMISSIVE public read policy (default is PERMISSIVE)
CREATE POLICY "Public read access for opportunities" 
ON public.salesforce_opportunities 
FOR SELECT 
TO public
USING (true);