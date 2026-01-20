import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { SalesforceState } from '@/hooks/useSalesforce';
import { TrendingUp, TrendingDown, MessageSquare, BarChart3, Lightbulb, Send, Loader2 } from 'lucide-react';

interface WinLossAnalyzerViewProps {
  salesforce: SalesforceState;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function WinLossAnalyzerView({ salesforce }: WinLossAnalyzerViewProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate win/loss stats from opportunities
  const closedWonOpps = salesforce.opportunities.filter(o => 
    o.stage?.toLowerCase().includes('closed won') || o.stage?.toLowerCase() === 'won'
  );
  const closedLostOpps = salesforce.opportunities.filter(o => 
    o.stage?.toLowerCase().includes('closed lost') || o.stage?.toLowerCase() === 'lost'
  );
  
  const totalClosed = closedWonOpps.length + closedLostOpps.length;
  const winRate = totalClosed > 0 ? Math.round((closedWonOpps.length / totalClosed) * 100) : 0;
  
  const totalWonValue = closedWonOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
  const totalLostValue = closedLostOpps.reduce((sum, o) => sum + (o.amount || 0), 0);

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('win-loss-agent', {
        body: { query: userMessage }
      });

      if (response.error) {
        throw response.error;
      }

      // Handle streaming response
      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              assistantMessage += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage };
                return newMessages;
              });
            } catch {
              // Skip non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('Win/Loss Agent error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error analyzing win/loss data. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What are the top reasons we're losing deals?",
    "Compare win rates by industry",
    "Which competitors are we losing to most?",
    "What pricing objections are common in lost deals?",
    "Analyze win patterns by deal size",
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Win/Loss Analyzer" subtitle="Post-close analysis and trend insights" />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Won Deals</p>
                  <p className="text-2xl font-bold text-emerald-600">{closedWonOpps.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(totalWonValue / 1000).toFixed(0)}K value
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lost Deals</p>
                  <p className="text-2xl font-bold text-red-600">{closedLostOpps.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${(totalLostValue / 1000).toFixed(0)}K value
                  </p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold text-blue-600">{winRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalClosed} total closed
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${totalClosed > 0 ? ((totalWonValue + totalLostValue) / totalClosed / 1000).toFixed(0) : 0}K
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All closed deals
                  </p>
                </div>
                <Lightbulb className="w-8 h-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Interface */}
        <Card className="flex-1 flex flex-col min-h-[500px]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Win/Loss Intelligence Agent</CardTitle>
                <CardDescription>
                  Ask questions about win/loss trends, reasons, and patterns
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Analyze Your Win/Loss Patterns</h3>
                  <p className="text-muted-foreground max-w-md">
                    This agent analyzes closed opportunities to identify trends, 
                    categorize reasons (pricing, competition, timing), and surface actionable insights.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                  {suggestedQuestions.map((question, index) => (
                    <Badge 
                      key={index}
                      variant="outline" 
                      className="cursor-pointer hover:bg-accent transition-colors py-2 px-3"
                      onClick={() => setQuery(question)}
                    >
                      {question}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-lg">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    Salesforce Fields for Better Analysis
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    To get deeper insights, consider adding these fields to your Opportunity object:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <strong>Loss_Reason__c</strong> - Picklist (Pricing, Competition, Timing, Features, Budget, etc.)</li>
                    <li>• <strong>Win_Reason__c</strong> - Picklist (Relationship, Product Fit, Price, Support, etc.)</li>
                    <li>• <strong>Competitor__c</strong> - Text or Lookup to track which competitor was involved</li>
                    <li>• <strong>Decision_Maker_Feedback__c</strong> - Long Text for survey/interview notes</li>
                    <li>• <strong>Days_to_Close__c</strong> - Formula: Close_Date - Created_Date</li>
                  </ul>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="mt-4 flex gap-2">
              <Textarea
                placeholder="Ask about win/loss trends, reasons, or patterns..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                className="min-h-[60px] resize-none"
              />
              <Button 
                onClick={handleSubmit} 
                disabled={!query.trim() || isLoading}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
