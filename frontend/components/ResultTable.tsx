'use client';

import { BenchmarkResult } from '@/lib/useBenchmarkRun';
import { Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ResultTableProps {
  results: BenchmarkResult[];
  showCoT: boolean;
}

export function ResultTable({ results, showCoT }: ResultTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No results yet. Run a benchmark to see results.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Prompt</th>
            <th className="text-left p-2 font-medium">Score</th>
            <th className="text-center p-2 font-medium">Pass/Fail</th>
            <th className="text-left p-2 font-medium">Evaluation</th>
            <th className="text-right p-2 font-medium">Time</th>
            <th className="text-right p-2 font-medium">Tools Used</th>
            {showCoT && <th className="text-left p-2 font-medium">Answer</th>}
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.prompt_id} className="border-b hover:bg-muted/50">
              <td className="p-2">
                <div className="max-w-xs truncate" title={result.prompt}>
                  {result.prompt}
                </div>
              </td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-mono">
                    {result.score !== undefined && result.score !== null ? (result.score * 100).toFixed(0) : '0'}%
                  </div>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(result.score || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="p-2 text-center">
                {result.passed !== undefined ? (
                  result.passed ? (
                    <Check className="w-4 h-4 text-green-600 mx-auto" />
                  ) : (
                    <X className="w-4 h-4 text-red-600 mx-auto" />
                  )
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-2">
                {result.eval_details?.reason ? (
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      View reason
                    </summary>
                    <div className="mt-2 text-sm">
                      <p className="mb-2">{result.eval_details.reason}</p>
                      {result.eval_details.breakdown && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {result.eval_details.breakdown.correctness !== undefined && (
                            <div>Correctness: {(result.eval_details.breakdown.correctness * 100).toFixed(0)}%</div>
                          )}
                          {result.eval_details.breakdown.format_compliance !== undefined && (
                            <div>Format Compliance: {(result.eval_details.breakdown.format_compliance * 100).toFixed(0)}%</div>
                          )}
                          {result.eval_details.breakdown.completeness !== undefined && (
                            <div>Completeness: {(result.eval_details.breakdown.completeness * 100).toFixed(0)}%</div>
                          )}
                          {result.eval_details.breakdown.clarity !== undefined && (
                            <div>Clarity: {(result.eval_details.breakdown.clarity * 100).toFixed(0)}%</div>
                          )}
                          {result.eval_details.breakdown.reasoning !== undefined && (
                            <div>Reasoning: {(result.eval_details.breakdown.reasoning * 100).toFixed(0)}%</div>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-2 text-right font-mono text-sm">
                {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '-'}
              </td>
              <td className="p-2 text-right font-mono text-sm">
                {result.tools_used?.length || 0}
              </td>
              {showCoT && (
                <td className="p-2">
                  <div className="max-w-md">
                    <details>
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View answer ({result.answer ? result.answer.length : 0} chars)
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded text-sm markdown-content">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                            p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="ml-2">{children}</li>,
                            code: ({ children, ...props }: any) => {
                              const inline = !props.className?.includes('language-');
                              return inline ? (
                                <code className="bg-background px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                              ) : (
                                <pre className="bg-background p-2 rounded overflow-x-auto mb-2">
                                  <code className="text-xs font-mono">{children}</code>
                                </pre>
                              );
                            },
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-muted-foreground/30 pl-3 my-2 italic">
                                {children}
                              </blockquote>
                            ),
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            hr: () => <hr className="my-3 border-muted-foreground/30" />,
                            a: ({ href, children }) => (
                              <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {result.answer || 'No answer available'}
                        </ReactMarkdown>
                      </div>
                    </details>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}