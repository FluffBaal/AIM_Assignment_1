'use client';

import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Thread } from '@/utils/stream';

interface ThreadListProps {
  threads: Thread[];
  currentThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (threadId: string) => void;
}

export function ThreadList({
  threads,
  currentThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
}: ThreadListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Conversations</CardTitle>
        <Button
          onClick={onCreateThread}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {threads.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No conversations yet
          </div>
        )}
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={cn(
              'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer',
              currentThreadId === thread.id && 'bg-accent'
            )}
            onClick={() => onSelectThread(thread.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 truncate">
              <div className="font-medium truncate">{thread.title}</div>
              <div className="text-xs text-muted-foreground">
                {thread.messages.length} messages
              </div>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteThread(thread.id);
              }}
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}