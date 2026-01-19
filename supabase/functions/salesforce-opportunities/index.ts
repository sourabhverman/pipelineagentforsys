import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function refreshAccessToken(supabase: any, connection: any) {
  const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
  const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');

  const refreshResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  });

  const tokenData = await refreshResponse.json();
  
  if (tokenData.access_token) {
    await supabase
      .from('salesforce_connections')
      .update({
        access_token: tokenData.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');

    return tokenData.access_token;
  }
  
  throw new Error('Failed to refresh token');
}

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
      console.log('No Salesforce connection found');
      return new Response(
        JSON.stringify({ error: 'Salesforce not connected', needsAuth: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = connection.access_token;
    const instanceUrl = connection.instance_url;

    // Query for open opportunities
    const opportunityQuery = `
      SELECT Id, Name, Amount, StageName, CloseDate, Probability, 
             Account.Name, Owner.Name, CreatedDate, LastModifiedDate,
             NextStep, LeadSource, Type
      FROM Opportunity 
      WHERE IsClosed = false 
      ORDER BY Amount DESC NULLS LAST
      LIMIT 100
    `;

    let result;
    try {
      result = await fetchFromSalesforce(instanceUrl, accessToken, opportunityQuery);
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        console.log('Token expired, refreshing...');
        accessToken = await refreshAccessToken(supabase, connection);
        result = await fetchFromSalesforce(instanceUrl, accessToken, opportunityQuery);
      } else {
        throw error;
      }
    }

    console.log(`Fetched ${result.records?.length || 0} opportunities from Salesforce`);

    // Transform Salesforce data to our format
    const opportunities = (result.records || []).map((opp: any) => ({
      id: opp.Id,
      name: opp.Name,
      accountName: opp.Account?.Name || 'Unknown Account',
      amount: opp.Amount || 0,
      stage: opp.StageName,
      probability: opp.Probability || 0,
      closeDate: opp.CloseDate,
      owner: opp.Owner?.Name || 'Unassigned',
      nextStep: opp.NextStep,
      leadSource: opp.LeadSource,
      type: opp.Type,
      createdDate: opp.CreatedDate,
      lastModifiedDate: opp.LastModifiedDate,
      daysInStage: Math.floor((Date.now() - new Date(opp.LastModifiedDate).getTime()) / (1000 * 60 * 60 * 24)),
      riskLevel: calculateRiskLevel(opp),
    }));

    return new Response(
      JSON.stringify({ opportunities, totalSize: result.totalSize }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateRiskLevel(opp: any): 'low' | 'medium' | 'high' {
  const daysUntilClose = Math.floor((new Date(opp.CloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const probability = opp.Probability || 0;
  
  // High risk: Close date passed or very soon with low probability
  if (daysUntilClose < 0 || (daysUntilClose < 7 && probability < 50)) {
    return 'high';
  }
  
  // Medium risk: Close date within 30 days with moderate probability
  if (daysUntilClose < 30 && probability < 70) {
    return 'medium';
  }
  
  return 'low';
}
