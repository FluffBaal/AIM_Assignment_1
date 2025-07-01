import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { chatSlice, ChatSlice } from './slices/chat';
import { benchmarkSlice, BenchmarkSlice } from './slices/benchmark';
import { testsetSlice, TestsetSlice } from './slices/testset';
import { settingsSlice, SettingsSlice } from './slices/settings';
import { benchmarkResultsSlice, BenchmarkResultsSlice } from './slices/benchmarkResults';

export type StoreState = ChatSlice & BenchmarkSlice & TestsetSlice & SettingsSlice & BenchmarkResultsSlice;

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...chatSlice(...a),
      ...benchmarkSlice(...a),
      ...testsetSlice(...a),
      ...settingsSlice(...a),
      ...benchmarkResultsSlice(...a),
    }),
    {
      name: 'llm-bench-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Chat slice - only persist UI state, not the actual messages (which are in IndexedDB)
        currentThreadId: state.currentThreadId,
        chatProvider: state.chatProvider,
        chatModel: state.chatModel,
        enableTools: state.enableTools,
        
        // Benchmark slice
        benchmarkProvider: state.benchmarkProvider,
        benchmarkModel: state.benchmarkModel,
        evaluatorProvider: state.evaluatorProvider,
        evaluatorModel: state.evaluatorModel,
        benchmarkPrompts: state.benchmarkPrompts,
        benchmarkName: state.benchmarkName,
        benchmarkEnableTools: state.benchmarkEnableTools,
        
        // Testset slice
        testsetContent: state.testsetContent,
        aiConfig: state.aiConfig,
        
        // Settings slice - API keys should NOT be persisted for security
        systemPrompt: state.systemPrompt,
        
        // Benchmark results - only persist the last run
        lastBenchmarkRun: state.lastBenchmarkRun,
      }),
    }
  )
);