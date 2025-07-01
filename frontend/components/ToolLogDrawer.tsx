'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wrench } from 'lucide-react';
import { BenchmarkResult } from '@/lib/useBenchmarkRun';

interface ToolLogDrawerProps {
  results: BenchmarkResult[];
}

export function ToolLogDrawer({ results }: ToolLogDrawerProps) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  
  // Collect all tool events
  const allToolEvents = results.flatMap(result => 
    (result.tools_used || []).map(tool => ({ ...tool, promptId: result.prompt_id }))
  );
  
  const filteredTools = selectedPromptId 
    ? allToolEvents.filter(tool => tool.promptId === selectedPromptId)
    : allToolEvents;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Wrench className="w-4 h-4 mr-2" />
          Tool Logs ({allToolEvents.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Tool Call Logs</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedPromptId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPromptId(null)}
            >
              All Prompts
            </Button>
            {results.map(result => (
              <Button
                key={result.prompt_id}
                variant={selectedPromptId === result.prompt_id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPromptId(result.prompt_id)}
              >
                Prompt {result.prompt_id}
              </Button>
            ))}
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {filteredTools.length === 0 ? (
                <p className="text-muted-foreground text-sm">No tool calls logged.</p>
              ) : (
                filteredTools.map((tool, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{tool.tool_name}</h4>
                      <span className="text-xs text-muted-foreground">
                        Prompt {tool.promptId}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Input:</div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(tool.input, null, 2)}
                      </pre>
                    </div>
                    
                    {tool.output && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Output:</div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(tool.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}