import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.json();
    console.log('Received Salesforce webhook payload:', JSON.stringify(body, null, 2));

    // Validate the payload has required fields
    if (!body.opportunity || !body.opportunity.id) {
      console.error('Invalid payload: missing opportunity data');
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing opportunity data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify this is from Salesforce
    if (!body.sentFromSalesforce) {
      console.warn('Payload not marked as sent from Salesforce');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { opportunity, account, owner } = body;

    // Prepare the record
    const opportunityRecord = {
      sf_opportunity_id: opportunity.id,
      name: opportunity.name,
      stage_name: opportunity.stageName,
      amount: opportunity.amount,
      close_date: opportunity.closeDate,
      description: opportunity.description,
      probability: opportunity.probability,
      opportunity_type: opportunity.type,
      sf_account_id: opportunity.accountId || account?.id,
      sf_owner_id: opportunity.ownerId || owner?.id,
      account_name: account?.name,
      account_industry: account?.industry,
      account_billing_country: account?.billingCountry,
      account_rating: account?.rating,
      owner_name: owner?.name || account?.owner?.name,
      owner_email: owner?.email || account?.owner?.email,
      raw_payload: body,
      updated_at: new Date().toISOString(),
    };

    // Upsert the opportunity (insert or update if exists)
    const { data, error } = await supabase
      .from('salesforce_opportunities')
      .upsert(opportunityRecord, { 
        onConflict: 'sf_opportunity_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save opportunity', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully saved opportunity:', data.id);

    // Also mark connection as active
    await supabase
      .from('salesforce_connections')
      .upsert({
        id: 'default',
        access_token: 'webhook-based',
        instance_url: 'webhook-based',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Opportunity received and saved',
        opportunityId: data.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
