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
  
  // Use Salesforce data if connected (even if empty for proper zero-state)
  // Only fall back to mock data if not connected
  const displayOpportunities = isConnected
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
        {displayOpportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        ) : (
          <div className="bg-card border rounded-lg p-12 text-center">
            <p className="text-lg font-medium text-foreground">No opportunities found</p>
            <p className="text-muted-foreground mt-2">
              You don't have any opportunities assigned to your account yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Opportunities will appear here when your email matches the owner email in Salesforce.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
