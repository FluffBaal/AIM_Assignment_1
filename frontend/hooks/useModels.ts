import { useState, useEffect } from 'react';
import { useApiKeys } from './useApiKeys';

type Model = {
  id: string;
  name: string;
};

export function useModels(provider: string) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiKeys } = useApiKeys();

  useEffect(() => {
    async function fetchModels() {
      if (!provider) return;

      // For Ollama, we don't need an API key
      const needsApiKey = provider !== 'ollama';
      const hasRequiredKey = !needsApiKey || apiKeys[provider as keyof typeof apiKeys];

      // If we need an API key but don't have one, use defaults
      if (needsApiKey && !hasRequiredKey) {
        setModels(getDefaultModels(provider));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add API keys to headers (only if not empty)
        if (apiKeys.openai && apiKeys.openai !== 'empty') headers['X-OpenAI-API-Key'] = apiKeys.openai;
        if (apiKeys.anthropic && apiKeys.anthropic !== 'empty') headers['X-Anthropic-API-Key'] = apiKeys.anthropic;
        if (apiKeys.deepseek && apiKeys.deepseek !== 'empty') headers['X-DeepSeek-API-Key'] = apiKeys.deepseek;
        if (apiKeys.tavily && apiKeys.tavily !== 'empty') headers['X-Tavily-API-Key'] = apiKeys.tavily;
        if (apiKeys.ollamaUrl && apiKeys.ollamaUrl !== 'empty') headers['X-Ollama-URL'] = apiKeys.ollamaUrl;

        console.log(`Fetching models for ${provider} with headers:`, Object.keys(headers));
        const response = await fetch(`/api/models/${provider}`, { headers });

        if (!response.ok) {
          let errorMessage = 'Failed to fetch models';
          try {
            const error = await response.json();
            errorMessage = error.detail || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setModels(data.models || []);
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
        
        // Fall back to default models
        setModels(getDefaultModels(provider));
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, [provider, apiKeys]);

  return { models, loading, error };
}

function getDefaultModels(provider: string): Model[] {
  const defaults: Record<string, Model[]> = {
    openai: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    anthropic: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
    ],
    deepseek: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    ],
    ollama: [
      { id: 'llama2', name: 'Llama 2' },
      { id: 'mistral', name: 'Mistral' },
      { id: 'codellama', name: 'CodeLlama' },
    ],
  };

  return defaults[provider] || [];
}