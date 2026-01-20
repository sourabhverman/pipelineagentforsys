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

    // Determine payload format - could be nested (opportunity: {...}) or flat (opportunityId, opportunityName, etc.)
    const isNestedFormat = body.opportunity && (body.opportunity.id || body.opportunity.Id);
    const isFlatFormat = body.opportunityId || body.OpportunityId;

    if (!isNestedFormat && !isFlatFormat) {
      console.error('Invalid payload: missing opportunity data');
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing opportunity data. Expected either nested format with "opportunity" object or flat format with "opportunityId"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let opportunityRecord;

    if (isFlatFormat) {
      // Handle FLAT payload format from Salesforce
      // Example: { opportunityId, opportunityName, stageName, amount, closeDate, accountId, accountName, owner: { ownerId, owner_name, owner_email }, ... }
      const owner = body.owner || {};
      
      opportunityRecord = {
        sf_opportunity_id: body.opportunityId || body.OpportunityId,
        name: body.opportunityName || body.OpportunityName || body.name || body.Name,
        stage_name: body.stageName || body.StageName,
        amount: body.amount || body.Amount,
        close_date: body.closeDate || body.CloseDate,
        description: body.description || body.Description,
        probability: body.probability || body.Probability,
        opportunity_type: body.type || body.Type || body.opportunityType,
        sf_account_id: body.accountId || body.AccountId,
        sf_owner_id: body.ownerId || body.OwnerId || owner.ownerId || owner.OwnerId,
        account_name: body.accountName || body.AccountName,
        account_industry: body.industry || body.Industry,
        account_billing_country: body.billingCountry || body.BillingCountry,
        account_rating: body.rating || body.Rating,
        owner_name: body.ownerName || body.OwnerName || owner.owner_name || owner.ownerName || owner.OwnerName || owner.name || owner.Name,
        owner_email: body.ownerEmail || body.OwnerEmail || owner.owner_email || owner.ownerEmail || owner.OwnerEmail || owner.email || owner.Email,
        raw_payload: body,
        updated_at: new Date().toISOString(),
      };
    } else {
      // Handle NESTED payload format
      // Example: { opportunity: {...}, account: {...}, owner: {...} }
      const opportunity = body.opportunity;
      const account = body.account;
      const owner = body.owner || opportunity?.Owner;

      opportunityRecord = {
        sf_opportunity_id: opportunity.Id || opportunity.id,
        name: opportunity.Name || opportunity.name,
        stage_name: opportunity.StageName || opportunity.stageName,
        amount: opportunity.Amount || opportunity.amount,
        close_date: opportunity.CloseDate || opportunity.closeDate,
        description: opportunity.Description || opportunity.description,
        probability: opportunity.Probability || opportunity.probability,
        opportunity_type: opportunity.Type || opportunity.type,
        sf_account_id: opportunity.AccountId || opportunity.accountId || account?.Id || account?.id,
        sf_owner_id: opportunity.OwnerId || opportunity.ownerId || owner?.Id || owner?.id,
        account_name: account?.Name || account?.name,
        account_industry: account?.Industry || account?.industry,
        account_billing_country: account?.BillingCountry || account?.billingCountry,
        account_rating: account?.Rating || account?.rating,
        owner_name: owner?.Name || owner?.name || account?.owner?.name,
        owner_email: owner?.Email || owner?.email || account?.owner?.email,
        raw_payload: body,
        updated_at: new Date().toISOString(),
      };
    }

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
