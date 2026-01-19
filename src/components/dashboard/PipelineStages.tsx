import { opportunities, stageConfig, formatCurrency } from '@/lib/mockData';
import { cn } from '@/lib/utils';

const stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'] as const;

export function PipelineStages() {
  const stageData = stages.map(stage => {
    const stageOpps = opportunities.filter(opp => opp.stage === stage);
    const totalValue = stageOpps.reduce((sum, opp) => sum + opp.value, 0);
    return {
      stage,
      count: stageOpps.length,
      value: totalValue,
      config: stageConfig[stage]
    };
  });

  const maxValue = Math.max(...stageData.map(s => s.value));

  return (
    <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Pipeline by Stage</h3>
          <p className="text-sm text-muted-foreground">Active opportunities breakdown</p>
        </div>
      </div>

      <div className="space-y-4">
        {stageData.map(({ stage, count, value, config }) => (
          <div key={stage} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  config.color,
                  config.textColor
                )}>
                  {stage}
                </span>
                <span className="text-sm text-muted-foreground">{count} deals</span>
              </div>
              <span className="font-semibold">{formatCurrency(value)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", config.color)}
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
