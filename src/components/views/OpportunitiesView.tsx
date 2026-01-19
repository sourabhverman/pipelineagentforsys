import { Header } from '@/components/layout/Header';
import { OpportunityCard } from '@/components/dashboard/OpportunityCard';
import { opportunities } from '@/lib/mockData';
import { Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OpportunitiesView() {
  return (
    <div className="flex-1 flex flex-col">
      <Header title="Opportunities" subtitle={`${opportunities.length} active deals in pipeline`} />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SortAsc className="w-4 h-4" />
            Sort by Value
          </Button>
        </div>

        {/* Opportunities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      </div>
    </div>
  );
}
