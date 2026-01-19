import { Header } from '@/components/layout/Header';
import { PipelineAgent } from '@/components/agent/PipelineAgent';

export function PipelineAgentView() {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Pipeline Agent" subtitle="AI-powered pipeline analysis" />
      
      <div className="flex-1 p-6">
        <PipelineAgent />
      </div>
    </div>
  );
}
