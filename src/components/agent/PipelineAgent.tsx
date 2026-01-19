import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { type ChatMessage, type SalesforceState, formatCurrency } from '@/lib/mockData';

const suggestedQueries = [
  { icon: TrendingUp, text: "What's my Q1 forecast?" },
  { icon: AlertTriangle, text: "Show deals at risk" },
  { icon: DollarSign, text: "Top opportunities by value" },
];

interface PipelineAgentProps {
  salesforce: SalesforceState;
}

export function PipelineAgent({ salesforce }: PipelineAgentProps) {
  const { isConnected, opportunities } = salesforce;
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: isConnected 
        ? "Hi! I'm your Pipeline Summarizer Agent, connected to your Salesforce data. I can help you analyze your pipeline, forecast revenue, and identify opportunities that need attention.\n\nTry asking me about your Q1 forecast, deals at risk, or top opportunities!"
        : "Hi! I'm your Pipeline Summarizer Agent. Connect Salesforce to get AI-powered insights from your real pipeline data.\n\nIn demo mode, I can show you what's possible - try asking about Q1 forecast or deals at risk!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (query: string): string => {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (isConnected && opportunities.length > 0) {
      // Generate real responses from Salesforce data
      const totalPipeline = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
      const weightedPipeline = opportunities.reduce((sum, opp) => sum + (opp.amount * opp.probability / 100), 0);
      const highRiskDeals = opportunities.filter(o => o.riskLevel === 'high');
      const topDeals = [...opportunities].sort((a, b) => b.amount - a.amount).slice(0, 5);
      
      if (normalizedQuery.includes('forecast') || normalizedQuery.includes('q1')) {
        return `## Q1 Forecast Summary (Salesforce Data)

**Total Pipeline Value:** ${formatCurrency(totalPipeline)}
**Weighted Forecast:** ${formatCurrency(weightedPipeline)}
**Total Opportunities:** ${opportunities.length}

### Key Insights:
- **${topDeals.length}** top opportunities worth ${formatCurrency(topDeals.reduce((s, o) => s + o.amount, 0))}
- **${highRiskDeals.length}** deals flagged as high risk
- Average win probability: ${(opportunities.reduce((s, o) => s + o.probability, 0) / opportunities.length).toFixed(0)}%

### Recommended Actions:
1. Focus on high-value opportunities in negotiation stage
2. Address ${highRiskDeals.length} high-risk deals immediately
3. Review stalled opportunities with extended stage durations`;
      }
      
      if (normalizedQuery.includes('risk')) {
        const riskDeals = opportunities.filter(o => o.riskLevel === 'high' || o.riskLevel === 'medium');
        return `## At-Risk Deals Analysis (Salesforce Data)

### 🔴 High Risk (${highRiskDeals.length} deals)
${highRiskDeals.slice(0, 3).map(d => `
**${d.name}** - ${d.accountName}
- Value: ${formatCurrency(d.amount)} | Stage: ${d.stage}
- Days in stage: ${d.daysInStage}
- Risk: ${d.riskLevel}`).join('\n')}

### Total at Risk
- **${riskDeals.length} deals** need attention
- Combined value: ${formatCurrency(riskDeals.reduce((s, o) => s + o.amount, 0))}

### Actions Required:
1. Schedule executive calls for high-risk deals
2. Review and update close dates
3. Increase engagement frequency`;
      }
      
      if (normalizedQuery.includes('top') || normalizedQuery.includes('value') || normalizedQuery.includes('opportunities')) {
        return `## Top Opportunities by Value (Salesforce Data)

| Rank | Opportunity | Account | Value | Probability |
|------|------------|---------|-------|-------------|
${topDeals.map((d, i) => `| ${i + 1} | ${d.name} | ${d.accountName} | ${formatCurrency(d.amount)} | ${d.probability}% |`).join('\n')}

**Total Pipeline:** ${formatCurrency(totalPipeline)}
**Weighted Value:** ${formatCurrency(weightedPipeline)}

💡 Focus on deals with highest probability and value combination.`;
      }
      
      return `I analyzed your query: "${query}"

Based on your Salesforce data:
- **${opportunities.length} active opportunities** worth ${formatCurrency(totalPipeline)}
- **Weighted forecast:** ${formatCurrency(weightedPipeline)}
- **${highRiskDeals.length} deals** require attention

Would you like me to drill down into forecast, at-risk deals, or top opportunities?`;
    }
    
    // Demo mode responses
    const mockResponses: Record<string, string> = {
      "what's my q1 forecast?": `## Q1 2025 Forecast Summary (Demo Data)

**Total Pipeline Value:** $1,965,000
**Weighted Forecast:** $892,500
**Win Probability Range:** 15% - 85%

### Key Insights:
- 🟢 **2 deals** in final negotiation stage ($545K committed)
- 🟡 **2 deals** in proposal stage ($620K at risk)
- 🔴 **1 deal** showing stalled activity (FinanceFirst Bank)

### Recommended Actions:
1. Schedule executive call with FinanceFirst Bank - 35 days in qualification
2. Push CRM Implementation to close by month end (85% probability)
3. Review pricing strategy for Cloud Migration Project

*Connect Salesforce for live data analysis*`,

      "show deals at risk": `## At-Risk Deals Analysis (Demo Data)

### 🔴 High Risk (2 deals - $960K)

**1. Security Suite Upgrade - FinanceFirst Bank**
- Value: $620,000 | Stage: Qualification
- ⚠️ 35 days in stage (avg: 14 days)
- Last activity: 5 days ago
- **Action:** Immediate executive outreach required

**2. Infrastructure Overhaul - Manufacturing Plus**
- Value: $340,000 | Stage: Proposal
- ⚠️ 28 days without response
- Last activity: 3 days ago
- **Action:** Schedule technical review meeting

*Connect Salesforce for live risk analysis*`,

      "top opportunities by value": `## Top Opportunities by Value (Demo Data)

| Rank | Opportunity | Company | Value | Probability |
|------|------------|---------|-------|-------------|
| 1 | Security Suite Upgrade | FinanceFirst Bank | $620K | 30% |
| 2 | Enterprise Platform Deal | TechCorp Industries | $450K | 75% |
| 3 | Infrastructure Overhaul | Manufacturing Plus | $340K | 45% |
| 4 | Cloud Migration Project | Global Retail Co | $280K | 50% |
| 5 | Data Analytics Platform | HealthPlus Medical | $180K | 15% |

**Total Pipeline:** $1.87M
**Weighted Value:** $671K

*Connect Salesforce for live opportunity data*`,
    };

    return mockResponses[normalizedQuery] || 
      `I analyzed your query: "${query}"

Based on demo pipeline data:
- **6 active opportunities** worth $1.97M
- **Average win rate:** 50%
- **2 deals** require immediate attention

Would you like me to drill down into any specific area?

*Connect Salesforce for live insights*`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateResponse(input);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-card rounded-xl border shadow-card overflow-hidden">
      {/* Header */}
      <div className="gradient-primary px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-primary-foreground">Pipeline Summarizer Agent</h2>
          <p className="text-sm text-primary-foreground/70">
            {isConnected ? 'Connected to Salesforce' : 'Demo mode - Connect Salesforce for live data'}
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-primary-foreground/50 ml-auto animate-pulse-subtle" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3 animate-fade-in",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              )}
            >
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 last:mb-0">{line}</p>
                ))}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-6 pb-4 flex gap-2 flex-wrap">
          {suggestedQueries.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => handleSuggestion(text)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted hover:bg-accent/20 text-sm font-medium text-muted-foreground hover:text-accent transition-colors"
            >
              <Icon className="w-4 h-4" />
              {text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your pipeline, forecast, or opportunities..."
            className="min-h-[48px] max-h-32 resize-none bg-muted/50 border-0 focus-visible:ring-1"
          />
          <Button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="gradient-primary hover:opacity-90 transition-opacity h-12 w-12 shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
