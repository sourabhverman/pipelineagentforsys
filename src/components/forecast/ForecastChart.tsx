import { teamForecasts, formatCurrency } from '@/lib/mockData';
import { cn } from '@/lib/utils';

export function ForecastChart() {
  const maxValue = Math.max(...teamForecasts.map(t => Math.max(t.pipeline, t.target)));

  return (
    <div className="bg-card rounded-xl border shadow-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Pipeline vs Target</h3>
          <p className="text-sm text-muted-foreground">Visual comparison by team</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full gradient-primary" />
            <span className="text-muted-foreground">Committed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground">Target</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {teamForecasts.map((team) => (
          <div key={team.teamName} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{team.teamName}</span>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(team.committed)} / {formatCurrency(team.target)}
              </span>
            </div>
            <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
              {/* Target line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
                style={{ left: `${(team.target / maxValue) * 100}%` }}
              />
              {/* Committed bar */}
              <div 
                className={cn(
                  "h-full rounded-lg transition-all duration-500",
                  team.committed >= team.target ? "gradient-success" : "gradient-primary"
                )}
                style={{ width: `${(team.committed / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
