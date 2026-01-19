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

export function useSalesforce() {
  const [state, setState] = useState<SalesforceState>({
    isConnected: false,
    isLoading: true,
    opportunities: [],
    teamForecasts: [],
    forecastSummary: null,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-status');
      if (error) throw error;
      return data?.connected || false;
    } catch (err) {
      console.error('Error checking Salesforce connection:', err);
      return false;
    }
  }, []);

  const connectSalesforce = useCallback(async () => {
    try {
      setState(s => ({ ...s, isLoading: true, error: null }));
      const { data, error } = await supabase.functions.invoke('salesforce-auth');
      if (error) throw error;
      
      if (data?.authUrl) {
        // Open Salesforce OAuth in a new window
        window.open(data.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      console.error('Error connecting to Salesforce:', err);
      setState(s => ({ ...s, error: err.message, isLoading: false }));
    }
  }, []);

  const fetchOpportunities = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-opportunities');
      if (error) throw error;
      
      if (data?.needsAuth) {
        setState(s => ({ ...s, isConnected: false, isLoading: false }));
        return [];
      }
      
      return data?.opportunities || [];
    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
      throw err;
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-forecast');
      if (error) throw error;
      
      return {
        teamForecasts: data?.teamForecasts || [],
        summary: data?.summary || null,
      };
    } catch (err: any) {
      console.error('Error fetching forecast:', err);
      throw err;
    }
  }, []);

  const refreshData = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        setState(s => ({ 
          ...s, 
          isConnected: false, 
          isLoading: false,
          opportunities: [],
          teamForecasts: [],
          forecastSummary: null,
        }));
        return;
      }

      const [opportunities, forecastData] = await Promise.all([
        fetchOpportunities(),
        fetchForecast(),
      ]);

      setState({
        isConnected: true,
        isLoading: false,
        opportunities,
        teamForecasts: forecastData.teamForecasts,
        forecastSummary: forecastData.summary,
        error: null,
      });
    } catch (err: any) {
      setState(s => ({ 
        ...s, 
        isLoading: false, 
        error: err.message 
      }));
    }
  }, [checkConnection, fetchOpportunities, fetchForecast]);

  // Check connection on mount and listen for callback
  useEffect(() => {
    refreshData();

    // Listen for Salesforce callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.salesforceConnected) {
        refreshData();
      }
    };
    window.addEventListener('message', handleMessage);

    // Check URL for callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('salesforce_connected') === 'true') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      refreshData();
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [refreshData]);

  return {
    ...state,
    connectSalesforce,
    refreshData,
  };
}
