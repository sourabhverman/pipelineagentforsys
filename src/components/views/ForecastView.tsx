import { Header } from '@/components/layout/Header';
import { ForecastTable } from '@/components/forecast/ForecastTable';
import { ForecastChart } from '@/components/forecast/ForecastChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { SalesforceConnect } from '@/components/salesforce/SalesforceConnect';
import { mockTeamForecasts, formatCurrency, type SalesforceState } from '@/lib/mockData';
import { TrendingUp, Target, AlertTriangle, Users } from 'lucide-react';

interface ForecastViewProps {
  salesforce: SalesforceState;
}

export function ForecastView({ salesforce }: ForecastViewProps) {
  const { isConnected, isLoading, teamForecasts: sfForecasts, forecastSummary, error, connectSalesforce, refreshData } = salesforce;

  // Use Salesforce data if connected, otherwise use mock data
  const displayForecasts = isConnected && sfForecasts.length > 0
    ? sfForecasts.map(f => ({
        teamName: f.teamName,
        teamLead: f.teamLead,
        committed: f.weighted,
        bestCase: f.pipeline * 0.7,
        pipeline: f.pipeline,
        target: f.target,
        variance: ((f.weighted - f.target) / f.target) * 100,
        deals: f.dealCount,
      }))
    : mockTeamForecasts;

  const totals = displayForecasts.reduce(
    (acc, team) => ({
      committed: acc.committed + team.committed,
      target: acc.target + team.target,
      deals: acc.deals + team.deals,
    }),
    { committed: 0, target: 0, deals: 0 }
  );

  const attainment = totals.target > 0 ? (totals.committed / totals.target) * 100 : 0;
  const teamsAtRisk = displayForecasts.filter(t => Math.abs(t.variance) > 10).length;

  return (
    <div className="flex-1 flex flex-col">
      <Header 
        title="Forecast Management" 
        subtitle={isConnected ? "Connected to Salesforce • Auto-synced" : "Demo Mode - Connect Salesforce for live data"} 
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

        {/* Forecast Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Committed Revenue"
            value={formatCurrency(totals.committed)}
            change={forecastSummary ? parseFloat(forecastSummary.variance) : -15.8}
            changeLabel="vs target"
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="Quota Attainment"
            value={`${attainment.toFixed(0)}%`}
            icon={Target}
            variant={attainment >= 90 ? 'success' : 'warning'}
          />
          <MetricCard
            title="Teams at Risk"
            value={teamsAtRisk.toString()}
            icon={AlertTriangle}
            variant={teamsAtRisk > 0 ? 'risk' : 'success'}
          />
          <MetricCard
            title="Total Deals"
            value={totals.deals.toString()}
            icon={Users}
          />
        </div>

        {/* Forecast Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ForecastTable forecasts={displayForecasts} />
          </div>
          <div>
            <ForecastChart forecasts={displayForecasts} />
          </div>
        </div>
      </div>
    </div>
  );
}
