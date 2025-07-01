import { useCallback, useState, useEffect } from 'react';
import { threadDB } from '@/lib/db';
import { useStore } from '@/store';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatOptions {
  provider?: 'openai' | 'anthropic' | 'deepseek' | 'ollama';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableTools?: boolean;
}

export function useChatThread(
  storeThreadId?: string | null,
  storeSetCurrentThreadId?: (id: string | null) => void
) {
  const { systemPrompt } = useStore();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [localCurrentThreadId, setLocalCurrentThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use store values if provided, otherwise use local state
  const currentThreadId = storeThreadId !== undefined ? storeThreadId : localCurrentThreadId;
  const setCurrentThreadId = storeSetCurrentThreadId || setLocalCurrentThreadId;

  const currentThread = threads.find(t => t.id === currentThreadId);

  // Load threads from IndexedDB on mount
  useEffect(() => {
    const loadThreads = async () => {
      try {
        const savedThreads = await threadDB.getAllThreads();
        setThreads(savedThreads);
        if (savedThreads.length > 0 && !currentThreadId) {
          setCurrentThreadId(savedThreads[0].id);
        }
      } catch (err) {
        console.error('Failed to load threads from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadThreads();
  }, [currentThreadId, setCurrentThreadId]);

  const createThread = useCallback(async () => {
    const newThread: Thread = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setThreads(prev => [...prev, newThread]);
    setCurrentThreadId(newThread.id);
    
    // Save to IndexedDB
    try {
      await threadDB.saveThread(newThread);
    } catch (err) {
      console.error('Failed to save thread to IndexedDB:', err);
    }
    
    return newThread;
  }, []);

  const addMessage = useCallback((threadId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        const updatedThread = {
          ...thread,
          messages: [...thread.messages, newMessage],
          updatedAt: new Date(),
        };
        
        // Update title based on first user message
        if (thread.messages.length === 0 && message.role === 'user') {
          updatedThread.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        }
        
        // Save to IndexedDB
        threadDB.saveThread(updatedThread).catch(err => 
          console.error('Failed to save thread to IndexedDB:', err)
        );
        
        return updatedThread;
      }
      return thread;
    }));

    return newMessage;
  }, []);

  const updateMessage = useCallback((threadId: string, messageId: string, content: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        const updatedThread = {
          ...thread,
          messages: thread.messages.map(msg => 
            msg.id === messageId ? { ...msg, content } : msg
          ),
          updatedAt: new Date(),
        };
        
        // Save to IndexedDB
        threadDB.saveThread(updatedThread).catch(err => 
          console.error('Failed to save thread to IndexedDB:', err)
        );
        
        return updatedThread;
      }
      return thread;
    }));
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    options: ChatOptions = {}
  ) => {
    if (!currentThreadId) {
      const newThread = await createThread();
      await sendMessageToThread(newThread.id, content, options);
    } else {
      await sendMessageToThread(currentThreadId, content, options);
    }
  }, [currentThreadId, createThread, threads]);

  const sendMessageToThread = async (
    threadId: string,
    content: string,
    options: ChatOptions = {}
  ) => {
    setError(null);
    setIsStreaming(true);

    // Add user message
    const userMessage = addMessage(threadId, {
      role: 'user',
      content,
    });

    console.log('Added user message:', userMessage);

    // Add placeholder for assistant message
    const assistantMessage = addMessage(threadId, {
      role: 'assistant',
      content: '',
    });

    console.log('Added assistant placeholder:', assistantMessage);

    // System prompt is now from the Zustand store

    try {
      // Get API keys from localStorage
      const savedKeys = localStorage.getItem('llm-bench-api-keys');
      let apiKeys: any = {};
      if (savedKeys) {
        try {
          apiKeys = JSON.parse(savedKeys);
        } catch (e) {
          console.error('Failed to parse API keys:', e);
        }
      }

      // Get the current thread state to build message history
      const thread = threads.find(t => t.id === threadId);
      if (!thread) throw new Error('Thread not found');

      // Build message history from the thread, excluding the assistant placeholder
      const previousMessages = thread.messages.filter(m => 
        m.id !== userMessage.id && m.id !== assistantMessage.id
      );

      // Build the complete message array for the API
      const messagesToSend = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: userMessage.content,
        }
      ];

      console.log('Messages to send:', messagesToSend);

      const requestBody = {
        messages: messagesToSend,
        provider: options.provider || 'openai',
        model: options.model || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: !(options.enableTools || false), // Disable streaming when tools are enabled
        enable_tools: options.enableTools || false,
      };

      console.log('Sending chat request:', requestBody);
      
      // Debug log API keys being sent
      console.log('API Keys from localStorage:', {
        openai: apiKeys.openai ? `${apiKeys.openai.substring(0, 7)}...${apiKeys.openai.slice(-4)}` : 'not set',
        anthropic: apiKeys.anthropic ? 'set' : 'not set',
        deepseek: apiKeys.deepseek ? 'set' : 'not set',
        tavily: apiKeys.tavily ? 'set' : 'not set',
        ollamaUrl: apiKeys.ollamaUrl || 'not set'
      });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKeys.openai && apiKeys.openai !== 'empty') {
        headers['X-OpenAI-API-Key'] = apiKeys.openai;
        console.log('Adding OpenAI API key to headers');
      }
      if (apiKeys.anthropic && apiKeys.anthropic !== 'empty') {
        headers['X-Anthropic-API-Key'] = apiKeys.anthropic;
      }
      if (apiKeys.deepseek && apiKeys.deepseek !== 'empty') {
        headers['X-DeepSeek-API-Key'] = apiKeys.deepseek;
      }
      if (apiKeys.tavily && apiKeys.tavily !== 'empty') {
        headers['X-Tavily-API-Key'] = apiKeys.tavily;
      }
      if (apiKeys.ollamaUrl && apiKeys.ollamaUrl !== 'empty') {
        headers['X-Ollama-URL'] = apiKeys.ollamaUrl;
      }
      
      console.log('Request headers:', Object.keys(headers));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      // Check if response is streaming or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Non-streaming response (when tools are enabled)
        const data = await response.json();
        console.log('Non-streaming response:', data);
        
        let finalContent = data.response || '';
        
        // If there was a tool error, add it to the response
        if (data.tool_error) {
          finalContent += `\n\n⚠️ Note: ${data.tool_error}`;
        }
        
        // Don't show tool usage details in chat - just the response
        updateMessage(threadId, assistantMessage.id, finalContent);
      } else {
        // Streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          updateMessage(threadId, assistantMessage.id, accumulated);
        }
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('429')) {
        errorMessage = 'Rate limit exceeded. The API is receiving too many requests. Please wait a moment and try again.';
      } else if (errorMessage.includes('401')) {
        errorMessage = 'Invalid API key. Please check your API key in Settings.';
      } else if (errorMessage.includes('402')) {
        errorMessage = 'Payment required. Please check your OpenAI account billing.';
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        errorMessage = 'The AI service is temporarily unavailable. Please try again later.';
      }
      
      setError(errorMessage);
      updateMessage(threadId, assistantMessage.id, `Error: ${errorMessage}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const deleteThread = useCallback(async (threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (currentThreadId === threadId) {
      setCurrentThreadId(threads.length > 1 ? threads[0].id : null);
    }
    
    // Delete from IndexedDB
    try {
      await threadDB.deleteThread(threadId);
    } catch (err) {
      console.error('Failed to delete thread from IndexedDB:', err);
    }
  }, [currentThreadId, threads]);

  return {
    threads,
    currentThread,
    currentThreadId,
    isStreaming,
    isLoading,
    error,
    createThread,
    setCurrentThreadId,
    sendMessage,
    deleteThread,
  };
}