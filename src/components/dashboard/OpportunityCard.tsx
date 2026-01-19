import { Opportunity, stageConfig, formatCurrency } from '@/lib/mockData';
import { Clock, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: Opportunity;
}

const riskStyles = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-risk',
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const stageStyle = stageConfig[opportunity.stage];

  return (
    <div className="bg-card rounded-xl border shadow-card p-5 hover:shadow-card-hover transition-all duration-300 animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground group-hover:text-accent transition-colors">
            {opportunity.name}
          </h4>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{opportunity.company}</span>
          </div>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          stageStyle.color,
          stageStyle.textColor
        )}>
          {opportunity.stage}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(opportunity.value)}</p>
          <p className="text-sm text-muted-foreground">Close: {opportunity.closeDate}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-lg font-semibold">{opportunity.probability}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Win probability</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{opportunity.daysInStage}d in stage</span>
          </div>
          {opportunity.riskLevel !== 'low' && (
            <div className={cn("flex items-center gap-1.5 text-sm", riskStyles[opportunity.riskLevel])}>
              <AlertTriangle className="w-4 h-4" />
              <span className="capitalize">{opportunity.riskLevel} risk</span>
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{opportunity.lastActivity}</span>
      </div>
    </div>
  );
}
