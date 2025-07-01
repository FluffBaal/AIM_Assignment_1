import { StateCreator } from 'zustand';

export interface AiConfig {
  topic: string;
  numQuestions: number;
  difficulty: string;
  categories: string;
  customInstructions: string;
  provider: string;
  model: string;
  testFormatOutput: boolean;
  outputFormat: string;
  customOutputFormat?: string;
}

export interface TestsetSlice {
  // Editor content
  testsetContent: string;
  setTestsetContent: (content: string) => void;
  
  // AI generation config
  aiConfig: AiConfig;
  setAiConfig: (config: AiConfig) => void;
  updateAiConfig: (updates: Partial<AiConfig>) => void;
  
  // UI state
  aiGenerationOpen: boolean;
  setAiGenerationOpen: (open: boolean) => void;
}

const defaultTestset = `{"id": "1", "content": "What is 2 + 2?", "expected_answer": "4", "category": "math", "difficulty": "easy"}
{"id": "2", "content": "Explain quantum computing in simple terms.", "expected_answer": "Quantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously, enabling parallel processing of information at a scale impossible for classical computers.", "category": "technology", "difficulty": "medium"}
{"id": "3", "content": "Write a haiku about programming.", "expected_answer": "Code flows like water\\nBugs hide in the shadows deep\\nDebugger finds light", "category": "creative", "difficulty": "medium"}`;

export const testsetSlice: StateCreator<TestsetSlice> = (set) => ({
  // Editor content
  testsetContent: defaultTestset,
  setTestsetContent: (content) => set({ testsetContent: content }),
  
  // AI generation config
  aiConfig: {
    topic: '',
    numQuestions: 5,
    difficulty: 'mixed',
    categories: '',
    customInstructions: '',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    testFormatOutput: false,
    outputFormat: 'none',
    customOutputFormat: '',
  },
  setAiConfig: (config) => set({ aiConfig: config }),
  updateAiConfig: (updates) => set((state) => ({
    aiConfig: { ...state.aiConfig, ...updates }
  })),
  
  // UI state
  aiGenerationOpen: false,
  setAiGenerationOpen: (open) => set({ aiGenerationOpen: open }),
});