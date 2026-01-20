import { formatCurrency, formatPercentage, type LegacyTeamForecast } from '@/lib/mockData';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastTableProps {
  forecasts: LegacyTeamForecast[];
}

// Get current quarter label dynamically
const getCurrentQuarter = (): string => {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();
  return `Q${quarter} ${year}`;
};

export function ForecastTable({ forecasts }: ForecastTableProps) {
  const totals = forecasts.reduce(
    (acc, team) => ({
      committed: acc.committed + team.committed,
      bestCase: acc.bestCase + team.bestCase,
      pipeline: acc.pipeline + team.pipeline,
      target: acc.target + team.target,
      deals: acc.deals + team.deals,
    }),
    { committed: 0, bestCase: 0, pipeline: 0, target: 0, deals: 0 }
  );

  const totalVariance = totals.target > 0 ? ((totals.committed - totals.target) / totals.target) * 100 : 0;

  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden animate-slide-up">
      <div className="gradient-primary px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-foreground">{getCurrentQuarter()} Forecast by Team</h2>
            <p className="text-sm text-primary-foreground/70">Forecast Updater Agent • Auto-updated 5 mins ago</p>
          </div>
          {Math.abs(totalVariance) > 10 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-risk/20 text-risk-foreground">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Variance Alert: {formatPercentage(totalVariance)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-6 text-sm font-semibold text-muted-foreground">Team</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Committed</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Best Case</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Pipeline</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Target</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground">Variance</th>
              <th className="text-right py-4 px-6 text-sm font-semibold text-muted-foreground">Deals</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((team) => (
              <tr key={team.teamName} className="border-b border-border hover:bg-muted/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{team.teamName}</p>
                      <p className="text-sm text-muted-foreground">{team.teamLead}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-semibold">{formatCurrency(team.committed)}</td>
                <td className="py-4 px-4 text-right text-muted-foreground">{formatCurrency(team.bestCase)}</td>
                <td className="py-4 px-4 text-right text-muted-foreground">{formatCurrency(team.pipeline)}</td>
                <td className="py-4 px-4 text-right font-medium">{formatCurrency(team.target)}</td>
                <td className="py-4 px-4 text-right">
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
                    Math.abs(team.variance) > 10 ? "bg-risk/10 text-risk" : "bg-warning/10 text-warning"
                  )}>
                    <TrendingDown className="w-3 h-3" />
                    {formatPercentage(team.variance)}
                  </div>
                </td>
                <td className="py-4 px-6 text-right text-muted-foreground">{team.deals}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50">
              <td className="py-4 px-6 font-bold">Total</td>
              <td className="py-4 px-4 text-right font-bold">{formatCurrency(totals.committed)}</td>
              <td className="py-4 px-4 text-right font-semibold text-muted-foreground">{formatCurrency(totals.bestCase)}</td>
              <td className="py-4 px-4 text-right font-semibold text-muted-foreground">{formatCurrency(totals.pipeline)}</td>
              <td className="py-4 px-4 text-right font-bold">{formatCurrency(totals.target)}</td>
              <td className="py-4 px-4 text-right">
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold",
                  "bg-risk/10 text-risk"
                )}>
                  <TrendingDown className="w-3 h-3" />
                  {formatPercentage(totalVariance)}
                </div>
              </td>
              <td className="py-4 px-6 text-right font-semibold">{totals.deals}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
