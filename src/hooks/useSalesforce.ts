import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SalesforceOpportunity {
  id: string;
  name: string;
  accountName: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate: string;
  owner: string;
  nextStep?: string;
  leadSource?: string;
  type?: string;
  daysInStage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface TeamForecast {
  id: string;
  teamName: string;
  teamLead: string;
  pipeline: number;
  weighted: number;
  closed: number;
  target: number;
  dealCount: number;
}

interface ForecastSummary {
  totalPipeline: number;
  totalWeighted: number;
  totalTarget: number;
  quarterStart: string;
  quarterEnd: string;
  variance: string;
}

interface SalesforceState {
  isConnected: boolean;
  isLoading: boolean;
  opportunities: SalesforceOpportunity[];
  teamForecasts: TeamForecast[];
  forecastSummary: ForecastSummary | null;
  error: string | null;
}

// Helper to calculate risk level based on probability and days
function calculateRiskLevel(probability: number, daysUntilClose: number): 'low' | 'medium' | 'high' {
  if (probability >= 70 && daysUntilClose > 7) return 'low';
  if (probability < 30 || daysUntilClose < 3) return 'high';
  return 'medium';
}

// Helper to calculate days in stage (estimate based on updated_at)
function calculateDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

export function useSalesforce() {
  const [state, setState] = useState<SalesforceState>({
    isConnected: false,
    isLoading: true,
    opportunities: [],
    teamForecasts: [],
    forecastSummary: null,
    error: null,
  });

  // Check if we have any opportunities in the database (indicates Salesforce is pushing data)
  const checkConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('salesforce_opportunities')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return (data && data.length > 0);
    } catch (err) {
      console.error('Error checking Salesforce connection:', err);
      return false;
    }
  }, []);

  // Fetch opportunities from the local database (pushed by Salesforce webhook)
  const fetchOpportunities = useCallback(async (): Promise<SalesforceOpportunity[]> => {
    try {
      const { data, error } = await supabase
        .from('salesforce_opportunities')
        .select('*')
        .order('close_date', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [];
      }

      // Transform database records to our interface format
      return data.map(opp => {
        const daysUntilClose = Math.ceil(
          (new Date(opp.close_date || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysInStage = calculateDaysInStage(opp.updated_at);
        
        return {
          id: opp.sf_opportunity_id,
          name: opp.name,
          accountName: opp.account_name || 'Unknown Account',
          amount: Number(opp.amount) || 0,
          stage: opp.stage_name || 'Unknown',
          probability: opp.probability || 0,
          closeDate: opp.close_date || '',
          owner: opp.owner_name || 'Unknown',
          nextStep: undefined,
          leadSource: undefined,
          type: opp.opportunity_type,
          daysInStage,
          riskLevel: calculateRiskLevel(opp.probability || 0, daysUntilClose),
        };
      });
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      throw err;
    }
  }, []);

  // Generate forecast data from opportunities
  const generateForecast = useCallback((opportunities: SalesforceOpportunity[]) => {
    if (opportunities.length === 0) {
      return {
        teamForecasts: [],
        summary: null,
      };
    }

    // Group by owner to create team forecasts
    const byOwner = opportunities.reduce((acc, opp) => {
      const owner = opp.owner || 'Unknown';
      if (!acc[owner]) {
        acc[owner] = [];
      }
      acc[owner].push(opp);
      return acc;
    }, {} as Record<string, SalesforceOpportunity[]>);

    const teamForecasts: TeamForecast[] = Object.entries(byOwner).map(([owner, opps], index) => {
      const pipeline = opps.reduce((sum, o) => sum + o.amount, 0);
      const weighted = opps.reduce((sum, o) => sum + (o.amount * o.probability / 100), 0);
      const closed = opps.filter(o => o.stage === 'Closed Won').reduce((sum, o) => sum + o.amount, 0);
      
      return {
        id: `team-${index}`,
        teamName: `${owner}'s Team`,
        teamLead: owner,
        pipeline,
        weighted,
        closed,
        target: pipeline * 1.2, // Estimate target as 120% of pipeline
        dealCount: opps.length,
      };
    });

    const totalPipeline = teamForecasts.reduce((sum, t) => sum + t.pipeline, 0);
    const totalWeighted = teamForecasts.reduce((sum, t) => sum + t.weighted, 0);
    const totalTarget = teamForecasts.reduce((sum, t) => sum + t.target, 0);
    
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const summary: ForecastSummary = {
      totalPipeline,
      totalWeighted,
      totalTarget,
      quarterStart: quarterStart.toISOString().split('T')[0],
      quarterEnd: quarterEnd.toISOString().split('T')[0],
      variance: ((totalWeighted / totalTarget - 1) * 100).toFixed(1) + '%',
    };

    return { teamForecasts, summary };
  }, []);

  const refreshData = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const opportunities = await fetchOpportunities();
      const connected = opportunities.length > 0;
      
      if (!connected) {
        setState({ 
          isConnected: false, 
          isLoading: false,
          opportunities: [],
          teamForecasts: [],
          forecastSummary: null,
          error: null,
        });
        return;
      }

      const { teamForecasts, summary } = generateForecast(opportunities);

      setState({
        isConnected: true,
        isLoading: false,
        opportunities,
        teamForecasts,
        forecastSummary: summary,
        error: null,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        error: errorMessage,
      }));
    }
  }, [fetchOpportunities, generateForecast]);

  // Set up realtime subscription for live updates
  useEffect(() => {
    refreshData();

    // Subscribe to changes in salesforce_opportunities table
    const channel = supabase
      .channel('salesforce-opportunities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'salesforce_opportunities',
        },
        () => {
          console.log('Salesforce opportunity updated, refreshing data...');
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);

  // Placeholder for connect - now webhook-based, so just shows setup info
  const connectSalesforce = useCallback(async () => {
    setState(s => ({ ...s, error: 'This integration uses Salesforce push (webhook). Configure your Salesforce org to send data to the webhook endpoint.' }));
  }, []);

  return {
    ...state,
    connectSalesforce,
    refreshData,
  };
}
