import { useEffect } from 'react';
import { useStore } from '@/store';

export type ApiKeys = {
  openai: string;
  anthropic: string;
  deepseek: string;
  tavily: string;
  ollamaUrl: string;
};

export function useApiKeys() {
  const { apiKeys, setApiKeys } = useStore();

  useEffect(() => {
    // Load from localStorage on mount (API keys are kept in localStorage for security)
    const loadKeys = () => {
      const savedKeys = localStorage.getItem('llm-bench-api-keys');
      console.log('Loading API keys from localStorage:', savedKeys ? 'Found' : 'Not found');
      if (savedKeys) {
        try {
          const parsed = JSON.parse(savedKeys);
          console.log('Parsed API keys:', Object.keys(parsed).reduce((acc, key) => {
            acc[key] = parsed[key] ? `${parsed[key].substring(0, 4)}...` : 'empty';
            return acc;
          }, {} as any));
          setApiKeys(parsed);
        } catch (e) {
          console.error('Failed to load API keys:', e);
        }
      }
    };

    loadKeys();

    // Listen for storage changes (if user updates in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'llm-bench-api-keys' && e.newValue) {
        try {
          setApiKeys(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Failed to parse API keys:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getApiKey = (provider: keyof ApiKeys): string => {
    return apiKeys[provider] || '';
  };

  const hasApiKey = (provider: keyof ApiKeys): boolean => {
    return !!apiKeys[provider];
  };

  return {
    apiKeys,
    getApiKey,
    hasApiKey,
  };
}