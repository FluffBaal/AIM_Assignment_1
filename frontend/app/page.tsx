'use client';

import { useEffect } from 'react';
import { useChatThread } from '@/utils/stream';
import { ChatWindow } from '@/components/ChatWindow';
import { ThreadList } from '@/components/ThreadList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useModels } from '@/hooks/useModels';
import { useStore } from '@/store';
import { filterModelsWithToolSupport } from '@/lib/modelSupportsTools';

export default function Home() {
  const {
    chatProvider,
    setChatProvider,
    chatModel,
    setChatModel,
    enableTools,
    setEnableTools,
    currentThreadId: storeThreadId,
    setCurrentThreadId: storeSetCurrentThreadId,
  } = useStore();
  
  const { hasApiKey } = useApiKeys();
  const { models, loading: modelsLoading } = useModels(chatProvider);
  
  // Filter models based on tool support when tools are enabled
  const filteredModels = enableTools 
    ? filterModelsWithToolSupport(models, chatProvider)
    : models;
  
  const {
    threads,
    currentThread,
    currentThreadId,
    isStreaming,
    error,
    createThread,
    setCurrentThreadId,
    sendMessage,
    deleteThread,
  } = useChatThread(storeThreadId, storeSetCurrentThreadId);

  // Update model when provider changes or models load
  useEffect(() => {
    if (filteredModels.length > 0) {
      // Try to keep the current model if it exists in the new list
      const modelExists = filteredModels.some(m => m.id === chatModel);
      if (!modelExists) {
        setChatModel(filteredModels[0].id);
      }
    }
  }, [chatProvider, filteredModels, chatModel, setChatModel]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r p-4 space-y-4 overflow-y-auto flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">LLM Bench</h1>
          <p className="text-sm text-muted-foreground">Chat Interface</p>
        </div>
        
        {/* Model Selection */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={chatProvider} onValueChange={(v) => setChatProvider(v as any)}>
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" disabled={!hasApiKey('openai')}>
                  OpenAI {!hasApiKey('openai') && '(No API key)'}
                </SelectItem>
                <SelectItem value="anthropic" disabled={!hasApiKey('anthropic')}>
                  Anthropic {!hasApiKey('anthropic') && '(No API key)'}
                </SelectItem>
                <SelectItem value="deepseek" disabled={!hasApiKey('deepseek')}>
                  DeepSeek {!hasApiKey('deepseek') && '(No API key)'}
                </SelectItem>
                <SelectItem value="ollama">
                  Ollama (Local)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={chatModel} onValueChange={setChatModel} disabled={modelsLoading}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredModels.length === 0 && !modelsLoading ? (
                  <SelectItem value="none" disabled>
                    {enableTools && models.length > 0 
                      ? "No models with tool support available" 
                      : "No models available - Add API key in Settings"}
                  </SelectItem>
                ) : (
                  filteredModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {modelsLoading && (
              <p className="text-xs text-muted-foreground">Loading models...</p>
            )}
          </div>
          
          {/* Tools Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-tools" className="text-sm">
              Enable Tools
              <span className="block text-xs text-muted-foreground">
                Use Tavily search & math
              </span>
            </Label>
            <Switch
              id="enable-tools"
              checked={enableTools}
              onCheckedChange={setEnableTools}
              disabled={!hasApiKey('tavily')}
            />
          </div>
          {!hasApiKey('tavily') && enableTools && (
            <p className="text-xs text-destructive">
              Tavily API key required for web search
            </p>
          )}
          {enableTools && chatProvider === 'ollama' && (
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Ollama models do not currently support tool use
            </p>
          )}
        </div>

        <ThreadList
          threads={threads}
          currentThreadId={currentThreadId}
          onSelectThread={setCurrentThreadId}
          onCreateThread={createThread}
          onDeleteThread={deleteThread}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {currentThread ? (
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              messages={currentThread.messages}
              isStreaming={isStreaming}
              onSendMessage={(content) => sendMessage(content, { provider: chatProvider, model: chatModel, enableTools })}
              threadTitle={currentThread.title}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Welcome to LLM Bench</h2>
              <p className="text-muted-foreground mb-4">
                Start a new conversation to begin chatting
              </p>
              <button
                onClick={createThread}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}