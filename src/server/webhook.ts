import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface SalesforceWebhookPayload {
  opportunities: Array<{
    id: string;
    name: string;
    accountId: string;
    accountName: string;
    amount: number;
    stageName: string;
    probability: number;
    closeDate: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    opportunityType?: string;
    updatedAt: string;
  }>;
  timestamp: string;
}

export async function handleSalesforceWebhook(payload: SalesforceWebhookPayload) {
  try {
    console.log('Received Salesforce webhook:', payload);

    // Process each opportunity
    for (const opp of payload.opportunities) {
      const { data: existing } = await supabase
        .from('salesforce_opportunities')
        .select('id')
        .eq('sf_opportunity_id', opp.id)
        .single()
        .catch(() => ({ data: null }));

      if (existing) {
        // Update existing opportunity
        await supabase
          .from('salesforce_opportunities')
          .update({
            name: opp.name,
            account_id: opp.accountId,
            account_name: opp.accountName,
            amount: opp.amount,
            stage_name: opp.stageName,
            probability: opp.probability,
            close_date: opp.closeDate,
            owner_id: opp.ownerId,
            owner_name: opp.ownerName,
            owner_email: opp.ownerEmail,
            opportunity_type: opp.opportunityType,
            updated_at: opp.updatedAt,
          })
          .eq('sf_opportunity_id', opp.id);
      } else {
        // Insert new opportunity
        await supabase
          .from('salesforce_opportunities')
          .insert({
            sf_opportunity_id: opp.id,
            name: opp.name,
            account_id: opp.accountId,
            account_name: opp.accountName,
            amount: opp.amount,
            stage_name: opp.stageName,
            probability: opp.probability,
            close_date: opp.closeDate,
            owner_id: opp.ownerId,
            owner_name: opp.ownerName,
            owner_email: opp.ownerEmail,
            opportunity_type: opp.opportunityType,
            updated_at: opp.updatedAt,
          });
      }
    }

    console.log(`Successfully processed ${payload.opportunities.length} opportunities`);
    return { success: true, processed: payload.opportunities.length };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}
