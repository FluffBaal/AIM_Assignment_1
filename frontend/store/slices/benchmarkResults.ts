import { StateCreator } from 'zustand';

export interface BenchmarkResult {
  prompt_id: string;
  prompt: string;
  answer: string;
  score: number;
  passed: boolean;
  eval_details?: any;
  tools_used?: ToolLogEntry[];
  timestamp: string;
}

export interface ToolLogEntry {
  tool_name: string;
  input: any;
  output: any;
  timestamp: string;
}

export interface BenchmarkRunSummary {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  config: {
    subject_model: string;
    subject_provider: string;
    evaluator_model: string;
    evaluator_provider: string;
    enable_tools: boolean;
  };
  results: BenchmarkResult[];
  summary?: {
    total_prompts: number;
    passed: number;
    failed: number;
    average_score: number;
    total_time: number;
    total_tokens?: number;
    total_cost?: number;
  };
  error?: string;
  created_at: string;
  metadata?: {
    name: string;
    description?: string;
  };
}

export interface BenchmarkResultsSlice {
  // Last benchmark run (persisted)
  lastBenchmarkRun: BenchmarkRunSummary | null;
  setLastBenchmarkRun: (run: BenchmarkRunSummary | null) => void;
  
  // Current run state (not persisted, for UI only)
  currentRunId: string | null;
  setCurrentRunId: (id: string | null) => void;
  
  // Run history (could be persisted in IndexedDB instead)
  runHistory: BenchmarkRunSummary[];
  addToRunHistory: (run: BenchmarkRunSummary) => void;
  clearRunHistory: () => void;
}

export const benchmarkResultsSlice: StateCreator<BenchmarkResultsSlice> = (set) => ({
  // Last benchmark run
  lastBenchmarkRun: null,
  setLastBenchmarkRun: (run) => set({ lastBenchmarkRun: run }),
  
  // Current run state
  currentRunId: null,
  setCurrentRunId: (id) => set({ currentRunId: id }),
  
  // Run history
  runHistory: [],
  addToRunHistory: (run) => set((state) => ({
    runHistory: [...state.runHistory, run].slice(-10) // Keep last 10 runs
  })),
  clearRunHistory: () => set({ runHistory: [] }),
});