import { StateCreator } from 'zustand';

export interface BenchmarkSlice {
  // Benchmark configuration
  benchmarkProvider: string;
  setBenchmarkProvider: (provider: string) => void;
  benchmarkModel: string;
  setBenchmarkModel: (model: string) => void;
  
  // Evaluator configuration
  evaluatorProvider: string;
  setEvaluatorProvider: (provider: string) => void;
  evaluatorModel: string;
  setEvaluatorModel: (model: string) => void;
  
  // Benchmark prompts and metadata
  benchmarkPrompts: string;
  setBenchmarkPrompts: (prompts: string) => void;
  benchmarkName: string;
  setBenchmarkName: (name: string) => void;
  
  // Custom testset data (for transfer from testset page)
  customTestsetData: string | null;
  setCustomTestsetData: (data: string | null) => void;
  
  // UI state
  showCoT: boolean;
  setShowCoT: (show: boolean) => void;
  benchmarkEnableTools: boolean;
  setBenchmarkEnableTools: (enable: boolean) => void;
}

export const benchmarkSlice: StateCreator<BenchmarkSlice> = (set) => ({
  // Benchmark configuration
  benchmarkProvider: 'openai',
  setBenchmarkProvider: (provider) => set({ benchmarkProvider: provider }),
  benchmarkModel: 'gpt-3.5-turbo',
  setBenchmarkModel: (model) => set({ benchmarkModel: model }),
  
  // Evaluator configuration
  evaluatorProvider: 'openai',
  setEvaluatorProvider: (provider) => set({ evaluatorProvider: provider }),
  evaluatorModel: 'gpt-3.5-turbo',
  setEvaluatorModel: (model) => set({ evaluatorModel: model }),
  
  // Benchmark prompts and metadata
  benchmarkPrompts: `What is 2+2?
Explain quantum computing in simple terms.
Write a haiku about programming.`,
  setBenchmarkPrompts: (prompts) => set({ benchmarkPrompts: prompts }),
  benchmarkName: 'Manual Benchmark Run',
  setBenchmarkName: (name) => set({ benchmarkName: name }),
  
  // Custom testset data
  customTestsetData: null,
  setCustomTestsetData: (data) => set({ customTestsetData: data }),
  
  // UI state
  showCoT: false,
  setShowCoT: (show) => set({ showCoT: show }),
  benchmarkEnableTools: false,
  setBenchmarkEnableTools: (enable) => set({ benchmarkEnableTools: enable }),
});