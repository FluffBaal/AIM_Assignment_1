import { useState, useCallback } from 'react';
import { 
  BenchmarkEvent, 
  AnswerEvent, 
  EvalEvent, 
  ToolEvent, 
  SummaryEvent,
  consumeNDJSONStream 
} from '@/utils/ndjson';

export interface BenchmarkResult {
  promptId: string;
  prompt: string;
  answer: string;
  score: number;
  passed: boolean;
  latencyMs?: number;
  tokensUsed?: number;
  tools: ToolEvent[];
}

export interface BenchmarkRunState {
  isRunning: boolean;
  results: BenchmarkResult[];
  summary: SummaryEvent | null;
  error: string | null;
  progress: number; // 0-100
}

export interface BenchmarkRequest {
  name: string;
  provider: 'openai' | 'anthropic' | 'deepseek' | 'ollama';
  model: string;
  prompts: Array<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  eval_type?: 'basic' | 'llm_as_judge' | 'custom';
  eval_config?: Record<string, any>;
}

export function useBenchmarkRun() {
  const [state, setState] = useState<BenchmarkRunState>({
    isRunning: false,
    results: [],
    summary: null,
    error: null,
    progress: 0,
  });

  const runBenchmark = useCallback(async (request: BenchmarkRequest) => {
    setState({
      isRunning: true,
      results: [],
      summary: null,
      error: null,
      progress: 0,
    });

    const resultsMap = new Map<string, Partial<BenchmarkResult>>();
    const totalPrompts = request.prompts.length;
    let processedPrompts = 0;

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await consumeNDJSONStream(
        response,
        (event: BenchmarkEvent) => {
          switch (event.event_type) {
            case 'answer':
              const answerEvent = event as AnswerEvent;
              const prompt = request.prompts.find(p => p.id === answerEvent.prompt_id);
              
              resultsMap.set(answerEvent.prompt_id, {
                promptId: answerEvent.prompt_id,
                prompt: prompt?.content || '',
                answer: answerEvent.content,
                latencyMs: answerEvent.latency_ms,
                tokensUsed: answerEvent.tokens_used,
                tools: [],
                score: 0,
                passed: false,
              });
              break;

            case 'eval':
              const evalEvent = event as EvalEvent;
              const existingResult = resultsMap.get(evalEvent.prompt_id);
              if (existingResult) {
                existingResult.score = evalEvent.result.score;
                existingResult.passed = evalEvent.result.passed;
              }
              
              processedPrompts++;
              const progress = Math.round((processedPrompts / totalPrompts) * 100);
              
              setState(prev => ({
                ...prev,
                results: Array.from(resultsMap.values()) as BenchmarkResult[],
                progress,
              }));
              break;

            case 'tool':
              const toolEvent = event as ToolEvent;
              const resultForTool = resultsMap.get(toolEvent.prompt_id);
              if (resultForTool && resultForTool.tools) {
                resultForTool.tools.push(toolEvent);
              }
              break;

            case 'summary':
              setState(prev => ({
                ...prev,
                summary: event as SummaryEvent,
                isRunning: false,
                progress: 100,
              }));
              break;
          }
        },
        (error: Error) => {
          setState(prev => ({
            ...prev,
            error: error.message,
            isRunning: false,
          }));
        }
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isRunning: false,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      results: [],
      summary: null,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    ...state,
    runBenchmark,
    reset,
  };
}