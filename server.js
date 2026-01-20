import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(cors());

interface SalesforceOpportunity {
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
}

interface WebhookPayload {
  opportunities: SalesforceOpportunity[];
  timestamp: string;
}

// Webhook endpoint
app.post('/api/webhook', async (req, res) => {
  try {
    const payload: WebhookPayload = req.body;

    console.log('Received Salesforce webhook with', payload.opportunities?.length || 0, 'opportunities');

    if (!payload.opportunities || !Array.isArray(payload.opportunities)) {
      return res.status(400).json({ error: 'Missing opportunities array' });
    }

    let processedCount = 0;

    // Process each opportunity
    for (const opp of payload.opportunities) {
      try {
        const { data: existing } = await supabase
          .from('salesforce_opportunities')
          .select('id')
          .eq('sf_opportunity_id', opp.id)
          .single()
          .catch(() => ({ data: null }));

        if (existing) {
          // Update existing
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
              owner_email: opp.ownerEmail?.toLowerCase(),
              opportunity_type: opp.opportunityType,
              updated_at: new Date().toISOString(),
            })
            .eq('sf_opportunity_id', opp.id);
        } else {
          // Insert new
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
              owner_email: opp.ownerEmail?.toLowerCase(),
              opportunity_type: opp.opportunityType,
              updated_at: new Date().toISOString(),
            });
        }
        processedCount++;
      } catch (error) {
        console.error('Error processing opportunity', opp.id, error);
      }
    }

    res.json({ success: true, processed: processedCount, total: payload.opportunities.length });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhook`);
});
