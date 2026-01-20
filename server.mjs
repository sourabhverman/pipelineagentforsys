import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase - check all possible env variable names
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

console.log('✅ Supabase URL:', supabaseUrl.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(cors());

// Webhook endpoint
app.post('/api/webhook', async (req, res) => {
  try {
    const payload = req.body;

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

// Get all stored opportunities
app.get('/api/opportunities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('salesforce_opportunities')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      count: data?.length || 0, 
      data: data || [],
      message: `Found ${data?.length || 0} opportunities`
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Delete all opportunities (CLEANUP)
app.delete('/api/opportunities', async (req, res) => {
  try {
    const { error } = await supabase
      .from('salesforce_opportunities')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) throw error;

    console.log('All opportunities deleted successfully');
    res.json({ success: true, message: 'All opportunities deleted' });
  } catch (error) {
    console.error('Error deleting opportunities:', error);
    res.status(500).json({ error: 'Failed to delete opportunities' });
  }
});

// Get data by user email
app.get('/api/opportunities/user/:email', async (req, res) => {
  try {
    const userEmail = req.params.email?.toLowerCase();

    const { data, error } = await supabase
      .from('salesforce_opportunities')
      .select('*')
      .eq('owner_email', userEmail)
      .order('close_date', { ascending: true });

    if (error) throw error;

    res.json({ 
      email: userEmail,
      count: data?.length || 0, 
      data: data || [],
      totalPipeline: (data || []).reduce((sum, opp) => sum + opp.amount, 0),
      message: `Found ${data?.length || 0} opportunities for ${userEmail}`
    });
  } catch (error) {
    console.error('Error fetching user opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Status dashboard
app.get('/api/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('salesforce_opportunities')
      .select('owner_email')
      .neq('owner_email', null);

    if (error) throw error;

    const uniqueOwners = [...new Set((data || []).map(opp => opp.owner_email))];
    
    res.json({ 
      webhookServer: 'Running',
      port: PORT,
      totalOpportunities: data?.length || 0,
      uniqueOwners: uniqueOwners,
      endpoints: {
        webhook: 'POST /api/webhook',
        getAll: 'GET /api/opportunities',
        deleteAll: 'DELETE /api/opportunities',
        getByEmail: 'GET /api/opportunities/user/:email',
        health: 'GET /api/health',
        status: 'GET /api/status'
      }
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log(`Status: http://localhost:${PORT}/api/status`);
});
