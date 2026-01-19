import { LayoutDashboard, MessageSquare, TrendingUp, Target, Settings, ChevronRight, LogOut, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline-agent', label: 'Pipeline Agent', icon: MessageSquare },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'opportunities', label: 'Opportunities', icon: Target },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

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

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* User Info */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {profile?.fullName || user?.email?.split('@')[0] || 'User'}
            </p>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
        </div>

        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
