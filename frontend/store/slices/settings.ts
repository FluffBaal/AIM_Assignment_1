import { StateCreator } from 'zustand';

export interface ApiKeys {
  openai: string;
  anthropic: string;
  deepseek: string;
  tavily: string;
  ollamaUrl: string;
}

export interface SettingsSlice {
  // API Keys - Note: These are NOT persisted in the store for security
  // They remain in localStorage under 'llm-bench-api-keys'
  apiKeys: ApiKeys;
  setApiKeys: (keys: ApiKeys) => void;
  updateApiKey: (provider: keyof ApiKeys, key: string) => void;
  
  // System prompt for chat
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
}

export const settingsSlice: StateCreator<SettingsSlice> = (set) => ({
  // API Keys
  apiKeys: {
    openai: '',
    anthropic: '',
    deepseek: '',
    tavily: '',
    ollamaUrl: 'http://localhost:11434',
  },
  setApiKeys: (keys) => set({ apiKeys: keys }),
  updateApiKey: (provider, key) => set((state) => ({
    apiKeys: { ...state.apiKeys, [provider]: key }
  })),
  
  // System prompt
  systemPrompt: '',
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
});