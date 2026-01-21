import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Salesforce Actions Webhook
 * 
 * This endpoint allows Salesforce Apex to:
 * 1. GET /salesforce-actions-webhook - Fetch pending (unsynced) actions
 * 2. POST /salesforce-actions-webhook - Mark actions as synced
 * 
 * Salesforce Apex can poll this endpoint to get new tasks, notes, and stage updates
 * created from the Pipeline Agent, then sync them back to Salesforce.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // GET: Fetch pending actions for Salesforce to process
    if (req.method === "GET") {
      const url = new URL(req.url);
      const actionType = url.searchParams.get("type"); // Optional filter: create_task, add_note, update_stage
      const limit = parseInt(url.searchParams.get("limit") || "50");

      // Fetch unsynced action logs
      let actionQuery = serviceClient
        .from("action_logs")
        .select("*")
        .eq("synced_to_sf", false)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (actionType) {
        actionQuery = actionQuery.eq("action_type", actionType);
      }

      const { data: actions, error: actionsError } = await actionQuery;

      if (actionsError) {
        console.error("Error fetching actions:", actionsError);
        throw actionsError;
      }

      // Also fetch unsynced tasks directly
      const { data: tasks, error: tasksError } = await serviceClient
        .from("tasks")
        .select("*")
        .eq("synced_to_sf", false)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
      }

      // Format response for Salesforce consumption
      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        pendingActions: {
          count: (actions?.length || 0) + (tasks?.length || 0),
          actions: actions || [],
          tasks: (tasks || []).map(task => ({
            id: task.id,
            action_type: "create_task",
            opportunity_id: task.opportunity_id,
            opportunity_name: task.opportunity_name,
            payload: {
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              priority: task.priority,
              status: task.status,
              assigned_to: task.assigned_to,
            },
            created_at: task.created_at,
          })),
        },
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Mark actions as synced (called by Salesforce after processing)
    if (req.method === "POST") {
      const body = await req.json();
      const { syncedActions, syncedTasks } = body;

      const results = {
        actions: { updated: 0, errors: [] as string[] },
        tasks: { updated: 0, errors: [] as string[] },
      };

      // Mark action_logs as synced
      if (syncedActions && Array.isArray(syncedActions)) {
        for (const action of syncedActions) {
          const { id, sf_record_id } = action;
          
          const { error } = await serviceClient
            .from("action_logs")
            .update({
              synced_to_sf: true,
              synced_at: new Date().toISOString(),
              sf_record_id: sf_record_id || null,
            })
            .eq("id", id);

          if (error) {
            results.actions.errors.push(`Failed to sync action ${id}: ${error.message}`);
          } else {
            results.actions.updated++;
          }
        }
      }

      // Mark tasks as synced
      if (syncedTasks && Array.isArray(syncedTasks)) {
        for (const task of syncedTasks) {
          const { id, sf_task_id } = task;
          
          const { error } = await serviceClient
            .from("tasks")
            .update({
              synced_to_sf: true,
              synced_at: new Date().toISOString(),
              sf_task_id: sf_task_id || null,
            })
            .eq("id", id);

          if (error) {
            results.tasks.errors.push(`Failed to sync task ${id}: ${error.message}`);
          } else {
            results.tasks.updated++;
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${results.actions.updated} actions and ${results.tasks.updated} tasks`,
          results,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});