import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all closed opportunities for win/loss analysis
    const { data: opportunities, error } = await supabase
      .from('salesforce_opportunities')
      .select('*')
      .or('stage_name.ilike.%closed%,stage_name.ilike.%won%,stage_name.ilike.%lost%');

    if (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }

    // Categorize opportunities
    const wonOpps = opportunities?.filter(o => 
      o.stage_name?.toLowerCase().includes('won') || 
      (o.stage_name?.toLowerCase().includes('closed') && !o.stage_name?.toLowerCase().includes('lost'))
    ) || [];
    
    const lostOpps = opportunities?.filter(o => 
      o.stage_name?.toLowerCase().includes('lost')
    ) || [];

    // Build context for the AI
    const totalClosed = wonOpps.length + lostOpps.length;
    const winRate = totalClosed > 0 ? ((wonOpps.length / totalClosed) * 100).toFixed(1) : 0;
    const totalWonValue = wonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    const totalLostValue = lostOpps.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Analyze by industry
    const industryStats: Record<string, { won: number; lost: number; wonValue: number; lostValue: number }> = {};
    [...wonOpps, ...lostOpps].forEach(opp => {
      const industry = opp.account_industry || 'Unknown';
      if (!industryStats[industry]) {
        industryStats[industry] = { won: 0, lost: 0, wonValue: 0, lostValue: 0 };
      }
      if (wonOpps.includes(opp)) {
        industryStats[industry].won++;
        industryStats[industry].wonValue += opp.amount || 0;
      } else {
        industryStats[industry].lost++;
        industryStats[industry].lostValue += opp.amount || 0;
      }
    });

    // Analyze by account rating
    const ratingStats: Record<string, { won: number; lost: number }> = {};
    [...wonOpps, ...lostOpps].forEach(opp => {
      const rating = opp.account_rating || 'Unrated';
      if (!ratingStats[rating]) {
        ratingStats[rating] = { won: 0, lost: 0 };
      }
      if (wonOpps.includes(opp)) {
        ratingStats[rating].won++;
      } else {
        ratingStats[rating].lost++;
      }
    });

    // Analyze by country
    const countryStats: Record<string, { won: number; lost: number }> = {};
    [...wonOpps, ...lostOpps].forEach(opp => {
      const country = opp.account_billing_country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { won: 0, lost: 0 };
      }
      if (wonOpps.includes(opp)) {
        countryStats[country].won++;
      } else {
        countryStats[country].lost++;
      }
    });

    // Analyze by opportunity type
    const typeStats: Record<string, { won: number; lost: number }> = {};
    [...wonOpps, ...lostOpps].forEach(opp => {
      const type = opp.opportunity_type || 'Unknown';
      if (!typeStats[type]) {
        typeStats[type] = { won: 0, lost: 0 };
      }
      if (wonOpps.includes(opp)) {
        typeStats[type].won++;
      } else {
        typeStats[type].lost++;
      }
    });

    // Build detailed context
    const winLossContext = `
# Win/Loss Analysis Context

## Overall Metrics
- Total Closed Deals: ${totalClosed}
- Won: ${wonOpps.length} deals ($${(totalWonValue / 1000).toFixed(0)}K)
- Lost: ${lostOpps.length} deals ($${(totalLostValue / 1000).toFixed(0)}K)
- Win Rate: ${winRate}%
- Average Won Deal: $${wonOpps.length > 0 ? (totalWonValue / wonOpps.length / 1000).toFixed(0) : 0}K
- Average Lost Deal: $${lostOpps.length > 0 ? (totalLostValue / lostOpps.length / 1000).toFixed(0) : 0}K

## Win/Loss by Industry
${Object.entries(industryStats).map(([industry, stats]) => {
  const rate = stats.won + stats.lost > 0 ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0) : 0;
  return `- ${industry}: Won ${stats.won}, Lost ${stats.lost} (${rate}% win rate)`;
}).join('\n')}

## Win/Loss by Account Rating
${Object.entries(ratingStats).map(([rating, stats]) => {
  const rate = stats.won + stats.lost > 0 ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0) : 0;
  return `- ${rating}: Won ${stats.won}, Lost ${stats.lost} (${rate}% win rate)`;
}).join('\n')}

## Win/Loss by Country
${Object.entries(countryStats).map(([country, stats]) => {
  const rate = stats.won + stats.lost > 0 ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0) : 0;
  return `- ${country}: Won ${stats.won}, Lost ${stats.lost} (${rate}% win rate)`;
}).join('\n')}

## Win/Loss by Opportunity Type
${Object.entries(typeStats).map(([type, stats]) => {
  const rate = stats.won + stats.lost > 0 ? ((stats.won / (stats.won + stats.lost)) * 100).toFixed(0) : 0;
  return `- ${type}: Won ${stats.won}, Lost ${stats.lost} (${rate}% win rate)`;
}).join('\n')}

## Recent Won Deals (Last 5)
${wonOpps.slice(0, 5).map(o => `- ${o.name} (${o.account_name || 'No Account'}): $${((o.amount || 0) / 1000).toFixed(0)}K - ${o.account_industry || 'No Industry'}`).join('\n')}

## Recent Lost Deals (Last 5)
${lostOpps.slice(0, 5).map(o => `- ${o.name} (${o.account_name || 'No Account'}): $${((o.amount || 0) / 1000).toFixed(0)}K - ${o.account_industry || 'No Industry'}`).join('\n')}
`;

    const systemPrompt = `You are a Win/Loss Analyzer Agent for a sales team. Your role is to analyze closed deals (won and lost) to identify patterns, trends, and actionable insights.

${winLossContext}

When analyzing win/loss data:
1. Focus on identifying patterns and trends
2. Compare performance across different segments (industry, rating, country, type)
3. Highlight concerning trends or opportunities
4. Suggest actionable improvements based on the data
5. Be specific with numbers and percentages
6. If data is limited, acknowledge this and suggest what additional data fields would help

Note: Some fields like Loss_Reason, Win_Reason, and Competitor may not be available in the current data. If asked about these, explain that adding these custom fields to Salesforce would enable deeper analysis.

Respond in a helpful, analytical tone. Keep responses concise but insightful.`;

    // Call AI Gateway
    const aiGatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://ai-gateway.lovable.dev';
    
    const response = await fetch(`${aiGatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Error in win-loss-agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
