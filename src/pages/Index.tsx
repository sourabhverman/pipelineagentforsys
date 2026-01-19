import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { PipelineAgentView } from '@/components/views/PipelineAgentView';
import { ForecastView } from '@/components/views/ForecastView';
import { OpportunitiesView } from '@/components/views/OpportunitiesView';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'pipeline-agent':
        return <PipelineAgentView />;
      case 'forecast':
        return <ForecastView />;
      case 'opportunities':
        return <OpportunitiesView />;
      default:
        return <DashboardView />;
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
