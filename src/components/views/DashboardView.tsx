import { DollarSign, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PipelineStages } from '@/components/dashboard/PipelineStages';
import { RiskDeals } from '@/components/dashboard/RiskDeals';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { SalesforceConnect } from '@/components/salesforce/SalesforceConnect';
import { mockOpportunities, formatCurrency, convertToDisplayOpportunity, type SalesforceState } from '@/lib/mockData';

interface DashboardViewProps {
  salesforce: SalesforceState;
}

export function DashboardView({ salesforce }: DashboardViewProps) {
  const { isConnected, isLoading, opportunities: sfOpportunities, error, connectSalesforce, refreshData } = salesforce;
  
  // Use Salesforce data if connected, otherwise use mock data
  const displayOpportunities = isConnected && sfOpportunities.length > 0
    ? sfOpportunities.map(convertToDisplayOpportunity)
    : mockOpportunities;

  const totalPipeline = displayOpportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedPipeline = displayOpportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);
  const atRiskCount = displayOpportunities.filter(opp => opp.riskLevel !== 'low').length;
  const avgWinRate = displayOpportunities.length > 0 
    ? displayOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / displayOpportunities.length
    : 0;

  return (
    <div className="flex-1 flex flex-col">
      <Header 
        title="Pipeline Dashboard" 
        subtitle={isConnected ? "Connected to Salesforce" : "Demo Mode - Connect Salesforce for live data"} 
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

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Pipeline"
            value={formatCurrency(totalPipeline)}
            change={12.5}
            changeLabel="vs last month"
            icon={DollarSign}
            variant="primary"
          />
          <MetricCard
            title="Weighted Pipeline"
            value={formatCurrency(weightedPipeline)}
            change={8.3}
            changeLabel="vs last month"
            icon={TrendingUp}
          />
          <MetricCard
            title="Deals at Risk"
            value={atRiskCount.toString()}
            icon={AlertTriangle}
            variant="risk"
          />
          <MetricCard
            title="Avg Win Probability"
            value={`${avgWinRate.toFixed(0)}%`}
            change={-2.1}
            changeLabel="vs last month"
            icon={Target}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PipelineStages opportunities={displayOpportunities} />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Opportunities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayOpportunities.slice(0, 4).map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <RiskDeals opportunities={displayOpportunities} />
          </div>
        </div>
      </div>
    </div>
  );
}
