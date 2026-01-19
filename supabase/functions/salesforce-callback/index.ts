import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return new Response(
        `<html><body><h1>Authorization Failed</h1><p>${errorDescription || error}</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    if (!code) {
      return new Response(
        '<html><body><h1>Missing authorization code</h1></body></html>',
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    const clientId = Deno.env.get('SALESFORCE_CLIENT_ID');
    const clientSecret = Deno.env.get('SALESFORCE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/salesforce-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response received:', { hasAccessToken: !!tokenData.access_token, instanceUrl: tokenData.instance_url });

    if (!tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return new Response(
        `<html><body><h1>Token Exchange Failed</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre></body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 400 }
      );
    }

    // Store tokens in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: upsertError } = await supabase
      .from('salesforce_connections')
      .upsert({
        id: 'default',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        instance_url: tokenData.instance_url,
        token_type: tokenData.token_type,
        issued_at: new Date(parseInt(tokenData.issued_at)).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error storing tokens:', upsertError);
      return new Response(
        `<html><body><h1>Error Storing Tokens</h1><pre>${JSON.stringify(upsertError, null, 2)}</pre></body></html>`,
        { headers: { 'Content-Type': 'text/html' }, status: 500 }
      );
    }

    // Redirect back to the app
    const appUrl = Deno.env.get('APP_URL') || 'https://id-preview--5ddf4e31-0159-4718-8163-9c668d7757c6.lovable.app';
    
    return new Response(
      `<html>
        <body>
          <h1>Salesforce Connected Successfully!</h1>
          <p>Redirecting back to your app...</p>
          <script>
            setTimeout(() => {
              window.location.href = '${appUrl}?salesforce_connected=true';
            }, 2000);
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Callback error:', error);
    return new Response(
      `<html><body><h1>Error</h1><pre>${errorMessage}</pre></body></html>`,
      { headers: { 'Content-Type': 'text/html' }, status: 500 }
    );
  }
});
