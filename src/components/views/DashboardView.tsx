import { DollarSign, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PipelineStages } from '@/components/dashboard/PipelineStages';
import { RiskDeals } from '@/components/dashboard/RiskDeals';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { opportunities, formatCurrency } from '@/lib/mockData';

export function DashboardView() {
  const totalPipeline = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedPipeline = opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0);
  const atRiskCount = opportunities.filter(opp => opp.riskLevel !== 'low').length;
  const avgWinRate = opportunities.reduce((sum, opp) => sum + opp.probability, 0) / opportunities.length;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Pipeline Dashboard" subtitle="Real-time sales intelligence" />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
            <PipelineStages />
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Opportunities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.slice(0, 4).map((opp) => (
                  <OpportunityCard key={opp.id} opportunity={opp} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <RiskDeals />
          </div>
        </div>
      </div>
    </div>
  );
}
