import { StateCreator } from 'zustand';

export interface ChatSlice {
  // Current thread and navigation state
  currentThreadId: string | null;
  setCurrentThreadId: (id: string | null) => void;
  
  // Chat configuration
  chatProvider: 'openai' | 'anthropic' | 'deepseek' | 'ollama';
  setChatProvider: (provider: 'openai' | 'anthropic' | 'deepseek' | 'ollama') => void;
  chatModel: string;
  setChatModel: (model: string) => void;
  
  // Tools configuration
  enableTools: boolean;
  setEnableTools: (enable: boolean) => void;
  
  // Thread list state (for UI purposes only, actual data is in IndexedDB)
  threadListOpen: boolean;
  setThreadListOpen: (open: boolean) => void;
}

export const chatSlice: StateCreator<ChatSlice> = (set) => ({
  // Current thread and navigation state
  currentThreadId: null,
  setCurrentThreadId: (id) => set({ currentThreadId: id }),
  
  // Chat configuration
  chatProvider: 'openai',
  setChatProvider: (provider) => set({ chatProvider: provider }),
  chatModel: 'gpt-3.5-turbo',
  setChatModel: (model) => set({ chatModel: model }),
  
  // Tools configuration
  enableTools: false,
  setEnableTools: (enable) => set({ enableTools: enable }),
  
  // Thread list state
  threadListOpen: true,
  setThreadListOpen: (open) => set({ threadListOpen: open }),
});