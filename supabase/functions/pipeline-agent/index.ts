import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  action: "create_task" | "send_email" | "add_note" | "update_stage";
  opportunityId: string;
  opportunityName?: string;
  data: {
    // For tasks
    title?: string;
    dueDate?: string;
    priority?: string;
    // For emails
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
    body?: string;
    // For notes
    note?: string;
    // For stage updates
    newStage?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { query, action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Handle action requests (non-AI quick actions)
    if (action) {
      return await handleAction(action as ActionRequest, supabaseUrl, supabaseServiceKey);
    }
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");

    let userEmail: string | null = null;
    let isAdmin = false;
    let userId: string | null = null;

    // Verify user auth
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      
      if (!claimsError && claimsData?.claims) {
        userId = claimsData.claims.sub as string;
        
        // Get user email and check admin role
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        
        const [profileResult, roleResult] = await Promise.all([
          serviceClient.from("profiles").select("email").eq("user_id", userId).single(),
          serviceClient.from("user_roles").select("role").eq("user_id", userId)
        ]);
        
        userEmail = profileResult.data?.email || null;
        isAdmin = roleResult.data?.some(r => r.role === "admin") || false;
      }
    }

    // Fetch opportunities based on user role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    let opportunitiesQuery = serviceClient
      .from("salesforce_opportunities")
      .select("*")
      .order("amount", { ascending: false });

    // Filter by owner_email if not admin
    if (!isAdmin && userEmail) {
      opportunitiesQuery = opportunitiesQuery.eq("owner_email", userEmail);
    }

    const { data: opportunities, error: dbError } = await opportunitiesQuery;

    if (dbError) {
      console.error("Database error:", dbError);
    }

    // Build context from opportunities
    let pipelineContext = "";
    let opportunitiesList = "";
    
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

      opportunitiesList = opportunities.map(o => 
        `- ID: ${o.sf_opportunity_id || o.id} | ${o.name} | ${o.account_name} | $${(o.amount || 0).toLocaleString()} | ${o.stage_name} | ${o.probability}% | Owner: ${o.owner_name} (${o.owner_email || 'no email'})`
      ).join('\n');

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
   - Owner: ${o.owner_name || "Unassigned"} (${o.owner_email || "no email"})
   - Opportunity ID: ${o.sf_opportunity_id || o.id}`).join('\n\n')}

### All Opportunities (for actions)
${opportunitiesList}

### Risk Analysis
${opportunities.filter(o => (o.probability || 0) < 50 || !o.close_date).slice(0, 5).map(o => `- **${o.name}**: ${o.probability || 0}% probability, Close: ${o.close_date || "Not set"}`).join('\n')}
`;
    } else {
      pipelineContext = "No opportunities data available in the database. Please sync Salesforce data first.";
    }

    const userContext = isAdmin 
      ? "You are viewing ALL opportunities as an admin." 
      : `You are viewing opportunities owned by ${userEmail || "the current user"}.`;

    const systemPrompt = `You are a Pipeline Summarizer Agent - an AI assistant that analyzes sales pipeline data and provides actionable insights.

${userContext}

You have access to real Salesforce opportunity data. Use this data to answer questions about:
- Revenue forecasts and pipeline health
- At-risk deals and recommended actions
- Top opportunities and priorities
- Stage analysis and conversion insights
- Account and owner performance

## QUICK ACTIONS
You can help users take actions on opportunities. When a user wants to take an action, respond with structured JSON in a code block.

### Available Actions:

1. **Create Task** - Create a follow-up task for an opportunity
   When user says things like "create a task for X" or "remind me to follow up on X":
   \`\`\`json
   {"action":"create_task","opportunityId":"<id>","opportunityName":"<name>","data":{"title":"<task title>","dueDate":"<YYYY-MM-DD>","priority":"high|medium|low"}}
   \`\`\`

2. **Send Email** - Send an email related to an opportunity
   When user says "send email to X" or "email the owner of X":
   \`\`\`json
   {"action":"send_email","opportunityId":"<id>","opportunityName":"<name>","data":{"recipientEmail":"<email>","recipientName":"<name>","subject":"<subject>","body":"<email body>"}}
   \`\`\`

3. **Add Note** - Add a note to an opportunity
   When user says "add note to X" or "note on X":
   \`\`\`json
   {"action":"add_note","opportunityId":"<id>","opportunityName":"<name>","data":{"note":"<note content>"}}
   \`\`\`

4. **Update Stage** - Move opportunity to a different stage
   When user says "move X to proposal" or "update stage of X":
   \`\`\`json
   {"action":"update_stage","opportunityId":"<id>","opportunityName":"<name>","data":{"newStage":"<new stage name>"}}
   \`\`\`

IMPORTANT: 
- When outputting an action, include the JSON in a code block with \`\`\`json tags
- Always include a brief explanation before/after the action block
- If you can't find the opportunity, ask for clarification
- Use the opportunity ID from the data provided

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

async function handleAction(
  actionReq: ActionRequest,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Response> {
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    switch (actionReq.action) {
      case "create_task": {
        const { title, dueDate, priority } = actionReq.data;
        
        if (!title) {
          return new Response(
            JSON.stringify({ success: false, error: "Task title is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Insert task into database
        const { data: newTask, error: insertError } = await serviceClient
          .from("tasks")
          .insert({
            opportunity_id: actionReq.opportunityId,
            opportunity_name: actionReq.opportunityName,
            title: title,
            due_date: dueDate || null,
            priority: priority || "medium",
            status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating task:", insertError);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create task" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Task created: "${title}" for ${actionReq.opportunityName}`,
            task: newTask,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send_email": {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          return new Response(
            JSON.stringify({ success: false, error: "Email service not configured" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const resend = new Resend(resendApiKey);
        
        const { recipientEmail, recipientName, subject, body } = actionReq.data;
        
        if (!recipientEmail || !subject || !body) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing email details" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For testing: always send to test email, but display original recipient in UI
        const testEmail = "sourabh.verma@forsysinc.com";
        const actualRecipient = testEmail; // Change to recipientEmail for production

        const emailResult = await resend.emails.send({
          from: "Forsys Sales <onboarding@resend.dev>",
          to: [actualRecipient],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Hi ${recipientName || "there"},</p>
              <p>${body.replace(/\n/g, "<br>")}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                Regarding: ${actionReq.opportunityName}<br>
                Sent via Forsys Pipeline Agent<br>
                <em>(Test mode: Originally intended for ${recipientEmail})</em>
              </p>
            </div>
          `,
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Email sent to ${recipientEmail}`, // Show original recipient in UI
            emailId: emailResult.data?.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_note": {
        // Update opportunity description with note
        const { note } = actionReq.data;
        
        if (!note) {
          return new Response(
            JSON.stringify({ success: false, error: "Note content is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get current description
        const { data: opp } = await serviceClient
          .from("salesforce_opportunities")
          .select("description")
          .or(`sf_opportunity_id.eq.${actionReq.opportunityId},id.eq.${actionReq.opportunityId}`)
          .single();

        const timestamp = new Date().toISOString().split("T")[0];
        const existingDesc = opp?.description || "";
        const updatedDesc = existingDesc 
          ? `${existingDesc}\n\n[${timestamp}] ${note}`
          : `[${timestamp}] ${note}`;

        const { error: updateError } = await serviceClient
          .from("salesforce_opportunities")
          .update({ description: updatedDesc })
          .or(`sf_opportunity_id.eq.${actionReq.opportunityId},id.eq.${actionReq.opportunityId}`);

        if (updateError) {
          console.error("Error adding note:", updateError);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to add note" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Note added to ${actionReq.opportunityName}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_stage": {
        const { newStage } = actionReq.data;
        
        if (!newStage) {
          return new Response(
            JSON.stringify({ success: false, error: "New stage is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await serviceClient
          .from("salesforce_opportunities")
          .update({ stage_name: newStage })
          .or(`sf_opportunity_id.eq.${actionReq.opportunityId},id.eq.${actionReq.opportunityId}`);

        if (updateError) {
          console.error("Error updating stage:", updateError);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to update stage" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `${actionReq.opportunityName} moved to ${newStage}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Action error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Action failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}