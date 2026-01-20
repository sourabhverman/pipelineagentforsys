import { handleSalesforceWebhook } from './webhook';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // Validate webhook structure
    if (!payload.opportunities || !Array.isArray(payload.opportunities)) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload: missing opportunities array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleSalesforceWebhook(payload);
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(req: Request) {
  return new Response(
    JSON.stringify({ message: 'Salesforce webhook endpoint. Use POST to send data.' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
