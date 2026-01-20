import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { PipelineAgentView } from '@/components/views/PipelineAgentView';
import { ForecastView } from '@/components/views/ForecastView';
import { WinLossAnalyzerView } from '@/components/views/WinLossAnalyzerView';
import { OpportunitiesView } from '@/components/views/OpportunitiesView';
import { useSalesforce } from '@/hooks/useSalesforce';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const salesforce = useSalesforce();

  console.log('Index page rendered, activeView:', activeView);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView salesforce={salesforce} />;
      case 'pipeline-agent':
        return <PipelineAgentView salesforce={salesforce} />;
      case 'forecast':
        return <ForecastView salesforce={salesforce} />;
      case 'win-loss-analyzer':
        return <WinLossAnalyzerView salesforce={salesforce} />;
      case 'opportunities':
        return <OpportunitiesView salesforce={salesforce} />;
      default:
        return <DashboardView salesforce={salesforce} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="ml-64 flex-1 flex flex-col">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;
