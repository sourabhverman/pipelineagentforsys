import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface SalesforceConnectProps {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  onConnect: () => void;
  onRefresh: () => void;
}

export function SalesforceConnect({ 
  isConnected, 
  isLoading, 
  error, 
  onConnect, 
  onRefresh 
}: SalesforceConnectProps) {
  if (isConnected) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-sm font-medium">Salesforce Connected</span>
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
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cloud className="h-5 w-5" />
          Connect to Salesforce
        </CardTitle>
        <CardDescription>
          Connect your Salesforce org to pull real opportunity and forecast data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <Button 
          onClick={onConnect} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Connect Salesforce
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
