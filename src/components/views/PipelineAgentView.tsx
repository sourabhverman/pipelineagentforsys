import { Header } from '@/components/layout/Header';
import { PipelineAgent } from '@/components/agent/PipelineAgent';
import { SalesforceConnect } from '@/components/salesforce/SalesforceConnect';
import { type SalesforceState } from '@/lib/mockData';

interface PipelineAgentViewProps {
  salesforce: SalesforceState;
}

export function PipelineAgentView({ salesforce }: PipelineAgentViewProps) {
  const { isConnected, isLoading, error, connectSalesforce, refreshData } = salesforce;

  return (
    <div className="flex-1 flex flex-col">
      <Header 
        title="Pipeline Summarizer Agent" 
        subtitle={isConnected ? "AI-powered pipeline insights from Salesforce" : "Connect Salesforce for live AI analysis"} 
      />
      
      <div className="flex-1 p-6 overflow-hidden">
        {!isConnected && (
          <div className="mb-6">
            <SalesforceConnect
              isConnected={isConnected}
              isLoading={isLoading}
              error={error}
              onConnect={connectSalesforce}
              onRefresh={refreshData}
            />
          </div>
        )}
        <PipelineAgent salesforce={salesforce} />
      </div>
    </div>
  );
}
