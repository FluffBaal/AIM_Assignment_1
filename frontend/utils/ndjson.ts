/**
 * NDJSON (Newline Delimited JSON) stream utilities
 */

export interface NDJSONEvent {
  timestamp: string;
  event_type: string;
  [key: string]: any;
}

export interface AnswerEvent extends NDJSONEvent {
  event_type: 'answer';
  prompt_id: string;
  prompt_hash: string;
  content: string;
  model: string;
  provider: string;
  tokens_used?: number;
  latency_ms?: number;
}

export interface EvalEvent extends NDJSONEvent {
  event_type: 'eval';
  prompt_id: string;
  result: {
    prompt_id: string;
    score: number;
    passed: boolean;
    details?: Record<string, any>;
    error?: string;
  };
}

export interface ToolEvent extends NDJSONEvent {
  event_type: 'tool';
  prompt_id: string;
  tool_name: string;
  tool_args: Record<string, any>;
  tool_result?: any;
  error?: string;
}

export interface SummaryEvent extends NDJSONEvent {
  event_type: 'summary';
  total_prompts: number;
  passed: number;
  failed: number;
  average_score: number;
  total_duration_ms: number;
  errors: string[];
}

export type BenchmarkEvent = AnswerEvent | EvalEvent | ToolEvent | SummaryEvent;

/**
 * Parse NDJSON stream and yield events
 */
export async function* parseNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<BenchmarkEvent, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (e) {
          console.error('Failed to parse final buffer:', e);
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    // Keep the last partial line in the buffer
    buffer = lines.pop() || '';
    
    // Process complete lines
    for (const line of lines) {
      if (line.trim()) {
        try {
          const event = JSON.parse(line);
          yield event;
        } catch (e) {
          console.error('Failed to parse line:', line, e);
        }
      }
    }
  }
}

/**
 * Consume NDJSON stream from a fetch response
 */
export async function consumeNDJSONStream(
  response: Response,
  onEvent: (event: BenchmarkEvent) => void,
  onError?: (error: Error) => void
): Promise<void> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  
  try {
    for await (const event of parseNDJSONStream(reader)) {
      onEvent(event);
    }
  } catch (error) {
    if (onError) {
      onError(error as Error);
    } else {
      console.error('Stream error:', error);
    }
  } finally {
    reader.releaseLock();
  }
}