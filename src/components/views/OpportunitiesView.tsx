import { Header } from '@/components/layout/Header';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { SalesforceConnect } from '@/components/salesforce/SalesforceConnect';
import { mockOpportunities, convertToDisplayOpportunity, type SalesforceState } from '@/lib/mockData';
import { Filter, SortAsc, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OpportunitiesViewProps {
  salesforce: SalesforceState;
}

export function OpportunitiesView({ salesforce }: OpportunitiesViewProps) {
  const { isConnected, isLoading, opportunities: sfOpportunities, error, connectSalesforce, refreshData } = salesforce;
  
  const displayOpportunities = isConnected && sfOpportunities.length > 0
    ? sfOpportunities.map(convertToDisplayOpportunity)
    : mockOpportunities;

  return (
    <div className="flex-1 flex flex-col">
      <Header 
        title="Opportunities" 
        subtitle={`${displayOpportunities.length} active deals in pipeline${isConnected ? ' (from Salesforce)' : ' (demo data)'}`} 
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Salesforce Connection */}
        {!isConnected && (
          <SalesforceConnect
            isConnected={isConnected}
            isLoading={isLoading}
            error={error}
            onConnect={connectSalesforce}
            onRefresh={refreshData}
          />
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SortAsc className="w-4 h-4" />
            Sort by Value
          </Button>
          {isConnected && (
            <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={refreshData} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>

        {/* Opportunities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      </div>
    </div>
  );
}
