import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch opportunities from database for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: opportunities, error: dbError } = await supabase
      .from("salesforce_opportunities")
      .select("*")
      .order("amount", { ascending: false });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    // Build context from opportunities
    let pipelineContext = "";
    if (opportunities && opportunities.length > 0) {
      const totalPipeline = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
      const avgProbability = opportunities.reduce((sum, o) => sum + (o.probability || 0), 0) / opportunities.length;
      const weightedPipeline = opportunities.reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0) / 100), 0);
      
      // Group by stage
      const byStage: Record<string, typeof opportunities> = {};
      opportunities.forEach(o => {
        const stage = o.stage_name || "Unknown";
        if (!byStage[stage]) byStage[stage] = [];
        byStage[stage].push(o);
      });

      pipelineContext = `
## Current Pipeline Data (${opportunities.length} opportunities)

### Summary
- Total Pipeline Value: $${totalPipeline.toLocaleString()}
- Weighted Forecast: $${weightedPipeline.toLocaleString()}
- Average Probability: ${avgProbability.toFixed(0)}%

### Opportunities by Stage
${Object.entries(byStage).map(([stage, opps]) => `
**${stage}** (${opps.length} deals, $${opps.reduce((s, o) => s + (o.amount || 0), 0).toLocaleString()})
${opps.slice(0, 5).map(o => `- ${o.name} (${o.account_name}) - $${(o.amount || 0).toLocaleString()} - ${o.probability || 0}% probability`).join('\n')}`).join('\n')}

### Top Opportunities
${opportunities.slice(0, 10).map((o, i) => `${i + 1}. **${o.name}** - ${o.account_name}
   - Amount: $${(o.amount || 0).toLocaleString()}
   - Stage: ${o.stage_name || "Unknown"}
   - Probability: ${o.probability || 0}%
   - Close Date: ${o.close_date || "Not set"}
   - Owner: ${o.owner_name || "Unassigned"}`).join('\n\n')}

### Risk Analysis
${opportunities.filter(o => (o.probability || 0) < 50 || !o.close_date).slice(0, 5).map(o => `- **${o.name}**: ${o.probability || 0}% probability, Close: ${o.close_date || "Not set"}`).join('\n')}
`;
    } else {
      pipelineContext = "No opportunities data available in the database. Please sync Salesforce data first.";
    }

    const systemPrompt = `You are a Pipeline Summarizer Agent - an AI assistant that analyzes sales pipeline data and provides actionable insights.

You have access to real Salesforce opportunity data. Use this data to answer questions about:
- Revenue forecasts and pipeline health
- At-risk deals and recommended actions
- Top opportunities and priorities
- Stage analysis and conversion insights
- Account and owner performance

Always provide specific data points, dollar amounts, and percentages when available.
Format responses with Markdown for clarity (headers, bullet points, tables when appropriate).
Be concise but thorough. Include recommended actions when discussing problems.

${pipelineContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Pipeline agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
