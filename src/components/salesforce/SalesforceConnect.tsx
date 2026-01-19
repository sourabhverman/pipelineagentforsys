import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, RefreshCw, CheckCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SalesforceConnectProps {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  onConnect: () => void;
  onRefresh: () => void;
}

const WEBHOOK_URL = 'https://dbyggdkrlmuqzdhxodzr.supabase.co/functions/v1/opportunity-data';

export function SalesforceConnect({ 
  isConnected, 
  isLoading, 
  onRefresh 
}: SalesforceConnectProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isConnected) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-sm font-medium">Salesforce Connected (Webhook Active)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cloud className="h-5 w-5" />
          Salesforce Webhook Integration
        </CardTitle>
        <CardDescription>
          Configure Salesforce to push opportunity data to this endpoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook Endpoint:</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-2 rounded text-xs break-all">
              {WEBHOOK_URL}
            </code>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Request Type:</strong> POST</p>
          <p><strong>Content-Type:</strong> application/json</p>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Configure an Apex Trigger or Flow in Salesforce to send opportunity data when records are created or updated.
          </p>
        </div>

        <Button 
          variant="outline"
          onClick={onRefresh} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
