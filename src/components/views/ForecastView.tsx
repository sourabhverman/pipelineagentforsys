import { Header } from '@/components/layout/Header';
import { ForecastTable } from '@/components/forecast/ForecastTable';
import { ForecastChart } from '@/components/forecast/ForecastChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { teamForecasts, formatCurrency } from '@/lib/mockData';
import { TrendingUp, Target, AlertTriangle, Users } from 'lucide-react';

export function ForecastView() {
  const totals = teamForecasts.reduce(
    (acc, team) => ({
      committed: acc.committed + team.committed,
      target: acc.target + team.target,
      deals: acc.deals + team.deals,
    }),
    { committed: 0, target: 0, deals: 0 }
  );

  const attainment = (totals.committed / totals.target) * 100;
  const teamsAtRisk = teamForecasts.filter(t => Math.abs(t.variance) > 10).length;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Forecast Management" subtitle="Forecast Updater Agent • Auto-synced with Salesforce" />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Forecast Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Committed Revenue"
            value={formatCurrency(totals.committed)}
            change={-15.8}
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
            <ForecastTable />
          </div>
          <div>
            <ForecastChart />
          </div>
        </div>
      </div>
    </div>
  );
}
