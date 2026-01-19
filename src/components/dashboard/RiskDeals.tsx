import { formatCurrency, type Opportunity } from '@/lib/mockData';
import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskDealsProps {
  opportunities: Opportunity[];
}

export function RiskDeals({ opportunities }: RiskDealsProps) {
  const atRiskDeals = opportunities.filter(opp => opp.riskLevel === 'high' || opp.riskLevel === 'medium');

  return (
    <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-risk/10">
            <AlertTriangle className="w-5 h-5 text-risk" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">At-Risk Deals</h3>
            <p className="text-sm text-muted-foreground">{atRiskDeals.length} deals need attention</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {atRiskDeals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No at-risk deals</p>
        ) : (
          atRiskDeals.slice(0, 4).map(deal => (
            <div 
              key={deal.id} 
              className={cn(
                "p-4 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer group",
                deal.riskLevel === 'high' ? "bg-risk/5 border-risk/20" : "bg-warning/5 border-warning/20"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
                    {deal.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">{deal.company}</p>
                </div>
                <span className="font-semibold">{formatCurrency(deal.value)}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{deal.daysInStage}d in {deal.stage}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
