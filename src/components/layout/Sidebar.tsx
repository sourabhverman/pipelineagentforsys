import { LayoutDashboard, MessageSquare, TrendingUp, Target, ChevronRight, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline-agent', label: 'Pipeline Agent', icon: MessageSquare },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'win-loss-analyzer', label: 'Win/Loss Analyzer', icon: Scale },
  { id: 'opportunities', label: 'Opportunities', icon: Target },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-sidebar text-sidebar-foreground flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Pipeline AI</h1>
            <p className="text-xs text-sidebar-foreground/60">Sales Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className={cn(
                "w-4 h-4 ml-auto transition-transform",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
              )} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
