export interface Opportunity {
  id: string;
  name: string;
  company: string;
  value: number;
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  probability: number;
  closeDate: string;
  owner: string;
  daysInStage: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastActivity: string;
}

export interface TeamForecast {
  teamName: string;
  teamLead: string;
  committed: number;
  bestCase: number;
  pipeline: number;
  target: number;
  variance: number;
  deals: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const opportunities: Opportunity[] = [
  {
    id: '1',
    name: 'Enterprise Platform Deal',
    company: 'TechCorp Industries',
    value: 450000,
    stage: 'Negotiation',
    probability: 75,
    closeDate: '2025-02-15',
    owner: 'Sarah Chen',
    daysInStage: 12,
    riskLevel: 'low',
    lastActivity: '2 hours ago'
  },
  {
    id: '2',
    name: 'Cloud Migration Project',
    company: 'Global Retail Co',
    value: 280000,
    stage: 'Proposal',
    probability: 50,
    closeDate: '2025-03-01',
    owner: 'Marcus Johnson',
    daysInStage: 21,
    riskLevel: 'medium',
    lastActivity: '1 day ago'
  },
  {
    id: '3',
    name: 'Security Suite Upgrade',
    company: 'FinanceFirst Bank',
    value: 620000,
    stage: 'Qualification',
    probability: 30,
    closeDate: '2025-03-20',
    owner: 'Sarah Chen',
    daysInStage: 35,
    riskLevel: 'high',
    lastActivity: '5 days ago'
  },
  {
    id: '4',
    name: 'Data Analytics Platform',
    company: 'HealthPlus Medical',
    value: 180000,
    stage: 'Prospecting',
    probability: 15,
    closeDate: '2025-04-10',
    owner: 'Alex Rivera',
    daysInStage: 8,
    riskLevel: 'low',
    lastActivity: '4 hours ago'
  },
  {
    id: '5',
    name: 'CRM Implementation',
    company: 'StartupXYZ',
    value: 95000,
    stage: 'Negotiation',
    probability: 85,
    closeDate: '2025-01-30',
    owner: 'Marcus Johnson',
    daysInStage: 5,
    riskLevel: 'low',
    lastActivity: '30 mins ago'
  },
  {
    id: '6',
    name: 'Infrastructure Overhaul',
    company: 'Manufacturing Plus',
    value: 340000,
    stage: 'Proposal',
    probability: 45,
    closeDate: '2025-02-28',
    owner: 'Alex Rivera',
    daysInStage: 28,
    riskLevel: 'high',
    lastActivity: '3 days ago'
  },
];

export const teamForecasts: TeamForecast[] = [
  {
    teamName: 'Enterprise West',
    teamLead: 'Sarah Chen',
    committed: 1250000,
    bestCase: 1850000,
    pipeline: 2400000,
    target: 1500000,
    variance: -16.7,
    deals: 12
  },
  {
    teamName: 'Enterprise East',
    teamLead: 'Marcus Johnson',
    committed: 980000,
    bestCase: 1420000,
    pipeline: 1890000,
    target: 1200000,
    variance: -18.3,
    deals: 9
  },
  {
    teamName: 'Mid-Market',
    teamLead: 'Alex Rivera',
    committed: 620000,
    bestCase: 890000,
    pipeline: 1250000,
    target: 800000,
    variance: -22.5,
    deals: 15
  },
  {
    teamName: 'Commercial',
    teamLead: 'Jordan Lee',
    committed: 340000,
    bestCase: 520000,
    pipeline: 780000,
    target: 400000,
    variance: -15.0,
    deals: 22
  },
];

export const stageConfig = {
  'Prospecting': { color: 'bg-muted', textColor: 'text-muted-foreground', order: 1 },
  'Qualification': { color: 'bg-accent/20', textColor: 'text-accent', order: 2 },
  'Proposal': { color: 'bg-warning/20', textColor: 'text-warning', order: 3 },
  'Negotiation': { color: 'bg-success/20', textColor: 'text-success', order: 4 },
  'Closed Won': { color: 'bg-success', textColor: 'text-success-foreground', order: 5 },
  'Closed Lost': { color: 'bg-risk/20', textColor: 'text-risk', order: 6 },
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};
