import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchFromSalesforce(instanceUrl: string, accessToken: string, query: string) {
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get stored connection
    const { data: connection, error: connError } = await supabase
      .from('salesforce_connections')
      .select('*')
      .eq('id', 'default')
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: 'Salesforce not connected', needsAuth: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token;
    const instanceUrl = connection.instance_url;

    // Get current quarter date range
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    // Query for forecast data grouped by owner
    const forecastQuery = `
      SELECT Owner.Name, SUM(Amount) totalAmount, SUM(ExpectedRevenue) weightedAmount, COUNT(Id) dealCount
      FROM Opportunity 
      WHERE IsClosed = false 
        AND CloseDate >= ${quarterStart.toISOString().split('T')[0]}
        AND CloseDate <= ${quarterEnd.toISOString().split('T')[0]}
      GROUP BY Owner.Name
      ORDER BY SUM(Amount) DESC
    `;

    const result = await fetchFromSalesforce(instanceUrl, accessToken, forecastQuery);
    console.log(`Fetched forecast data for ${result.records?.length || 0} team members`);

    // Get pipeline by stage for the quarter
    const stageQuery = `
      SELECT StageName, SUM(Amount) totalAmount, COUNT(Id) dealCount
      FROM Opportunity 
      WHERE IsClosed = false 
        AND CloseDate >= ${quarterStart.toISOString().split('T')[0]}
        AND CloseDate <= ${quarterEnd.toISOString().split('T')[0]}
      GROUP BY StageName
    `;

    const stageResult = await fetchFromSalesforce(instanceUrl, accessToken, stageQuery);

    // Transform to our forecast format
    const teamForecasts = (result.records || []).map((record: any, index: number) => ({
      id: `team-${index}`,
      teamName: record.Name || 'Unassigned',
      teamLead: record.Name || 'Unknown',
      pipeline: record.totalAmount || 0,
      weighted: record.weightedAmount || 0,
      closed: 0, // Would need separate query for closed this quarter
      target: 500000, // Default target - would need custom field or config
      dealCount: record.dealCount || 0,
    }));

    const pipelineByStage = (stageResult.records || []).map((record: any) => ({
      stage: record.StageName,
      amount: record.totalAmount || 0,
      count: record.dealCount || 0,
    }));

    // Calculate totals
    const totalPipeline = teamForecasts.reduce((sum: number, t: any) => sum + t.pipeline, 0);
    const totalWeighted = teamForecasts.reduce((sum: number, t: any) => sum + t.weighted, 0);
    const totalTarget = teamForecasts.reduce((sum: number, t: any) => sum + t.target, 0);

    return new Response(
      JSON.stringify({
        teamForecasts,
        pipelineByStage,
        summary: {
          totalPipeline,
          totalWeighted,
          totalTarget,
          quarterStart: quarterStart.toISOString(),
          quarterEnd: quarterEnd.toISOString(),
          variance: ((totalWeighted - totalTarget) / totalTarget * 100).toFixed(1),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching forecast:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
