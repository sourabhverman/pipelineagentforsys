-- Add service-role only policies for salesforce_pkce (used only by edge functions)
CREATE POLICY "Service role only for pkce"
ON public.salesforce_pkce
FOR ALL
USING (false)
WITH CHECK (false);

-- Add service-role only policies for salesforce_connections  
CREATE POLICY "Service role only for connections"
ON public.salesforce_connections
FOR ALL
USING (false)
WITH CHECK (false);