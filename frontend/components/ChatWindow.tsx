'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Message } from '@/utils/stream';

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  threadTitle?: string;
}

export function ChatWindow({ 
  messages, 
  isStreaming, 
  onSendMessage,
  threadTitle = 'Chat'
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = () => {
    if (messagesContainerRef.current && isNearBottomRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Check if user is near bottom of scroll
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Consider "near bottom" if within 100px of the bottom
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  useEffect(() => {
    // Only scroll if new messages were added (not on every render)
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onSendMessage(input);
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Force scroll to bottom when sending a message
      isNearBottomRef.current = true;
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>{threadTitle}</CardTitle>
      </CardHeader>
      <CardContent 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 p-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            Start a conversation by typing a message below
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 text-sm',
              message.role === 'assistant' && 'flex-row',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            <div className={cn(
              'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md',
              message.role === 'assistant' && 'bg-primary text-primary-foreground',
              message.role === 'user' && 'bg-muted'
            )}>
              {message.role === 'assistant' ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div className={cn(
              'flex-1 space-y-2 overflow-hidden rounded-lg px-3 py-2',
              message.role === 'assistant' && 'bg-muted',
              message.role === 'user' && 'bg-primary text-primary-foreground'
            )}>
              <p className="whitespace-pre-wrap break-words">
                {message.content || (
                  <span className="italic opacity-70">Typing...</span>
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            disabled={isStreaming}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}