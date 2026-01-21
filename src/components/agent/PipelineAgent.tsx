import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, DollarSign, CheckSquare, Mail, StickyNote, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { type ChatMessage, type SalesforceState } from '@/lib/mockData';
import { toast } from 'sonner';

const suggestedQueries = [
  { icon: TrendingUp, text: "What's my Q1 forecast?" },
  { icon: AlertTriangle, text: "Show deals at risk" },
  { icon: DollarSign, text: "Top opportunities by value" },
];

const quickActionSuggestions = [
  { icon: CheckSquare, text: "Create a follow-up task for the top opportunity", label: "Create Task" },
  { icon: Mail, text: "Draft an email to the owner of the largest deal", label: "Send Email" },
  { icon: StickyNote, text: "Add a note to the highest value deal", label: "Add Note" },
  { icon: ArrowRightLeft, text: "Move the top Qualification deal to Proposal stage", label: "Update Stage" },
];

interface PipelineAgentProps {
  salesforce: SalesforceState;
}

interface ActionData {
  action: "create_task" | "send_email" | "add_note" | "update_stage";
  opportunityId: string;
  opportunityName?: string;
  data: Record<string, string | undefined>;
}

const PIPELINE_AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pipeline-agent`;

export function PipelineAgent({ salesforce }: PipelineAgentProps) {
  const { isConnected } = salesforce;
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: isConnected 
        ? "Hi! I'm your AI Pipeline Agent, connected to your Salesforce data. Ask me anything about your pipeline or use quick actions!\n\n**Try:** \"Create a task for the TechCorp deal\", \"Email the owner of our largest opportunity\", or \"Move Enterprise Deal to Negotiation\""
        : "Hi! I'm your AI Pipeline Agent. Connect Salesforce to get AI-powered insights and take actions on your real pipeline data.\n\nOnce connected, you can ask natural language questions and take quick actions!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Execute an action from AI response
  const executeAction = async (actionData: ActionData) => {
    setExecutingAction(actionData.action);
    
    try {
      const response = await fetch(PIPELINE_AGENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: actionData }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        
        // Add confirmation message
        setMessages(prev => [...prev, {
          id: `action-${Date.now()}`,
          role: 'assistant',
          content: `✅ **Action Completed**\n\n${result.message}`,
          timestamp: new Date(),
        }]);
      } else {
        toast.error(result.error || "Action failed");
        setMessages(prev => [...prev, {
          id: `action-error-${Date.now()}`,
          role: 'assistant',
          content: `❌ **Action Failed**\n\n${result.error || "Something went wrong"}`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error("Action error:", error);
      toast.error("Failed to execute action");
    } finally {
      setExecutingAction(null);
    }
  };

  // Parse message content for action blocks
  const parseMessageForActions = (content: string): { text: string; actions: ActionData[] } => {
    const actions: ActionData[] = [];
    let text = content;

    // Find JSON code blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      try {
        const actionData = JSON.parse(match[1].trim()) as ActionData;
        if (actionData.action && actionData.opportunityId) {
          actions.push(actionData);
        }
      } catch {
        // Not a valid action JSON, ignore
      }
    }

    return { text, actions };
  };

  const streamResponse = async (query: string) => {
    const response = await fetch(PIPELINE_AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(errorData.error || "Failed to get AI response");
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    return response;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = input;
    setInput('');
    setIsTyping(true);

    let assistantContent = "";
    
    const updateAssistant = (content: string) => {
      assistantContent = content;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.id.startsWith('stream-')) {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, {
          id: `stream-${Date.now()}`,
          role: 'assistant' as const,
          content: assistantContent,
          timestamp: new Date(),
        }];
      });
    };

    try {
      const response = await streamResponse(queryText);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateAssistant(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              updateAssistant(assistantContent);
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error("AI response error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get AI response";
      toast.error(errorMessage);
      
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}\n\nPlease try again or check your connection.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  // Render message with action buttons
  const renderMessage = (message: ChatMessage) => {
    if (message.role === 'user') {
      return <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{message.content}</div>;
    }

    const { text, actions } = parseMessageForActions(message.content);

    return (
      <div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{text}</div>
        {actions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={executingAction !== null}
                onClick={() => executeAction(action)}
              >
                {executingAction === action.action ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {action.action === 'create_task' && <CheckSquare className="w-4 h-4" />}
                    {action.action === 'send_email' && <Mail className="w-4 h-4" />}
                    {action.action === 'add_note' && <StickyNote className="w-4 h-4" />}
                    {action.action === 'update_stage' && <ArrowRightLeft className="w-4 h-4" />}
                  </>
                )}
                Execute: {action.action.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-card rounded-xl border shadow-card overflow-hidden">
      {/* Header */}
      <div className="gradient-primary px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-primary-foreground">AI Pipeline Agent</h2>
          <p className="text-sm text-primary-foreground/70">
            {isConnected ? 'Powered by AI • Quick Actions Enabled' : 'Connect Salesforce for live data'}
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
              {renderMessage(message)}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-accent-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && !messages.some(m => m.id.startsWith('stream-')) && (
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
        <div className="px-6 pb-4 space-y-3">
          {/* Query suggestions */}
          <div className="flex gap-2 flex-wrap">
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
          
          {/* Quick action suggestions */}
          {isConnected && (
            <div className="flex gap-2 flex-wrap">
              {quickActionSuggestions.map(({ icon: Icon, text, label }) => (
                <button
                  key={label}
                  onClick={() => handleSuggestion(text)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 text-sm font-medium text-primary hover:text-primary transition-colors border border-primary/20"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
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
            placeholder={isConnected 
              ? "Ask about your pipeline or request an action..." 
              : "Connect Salesforce to get started..."}
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