import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { ChatMessage } from '@/types/conference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onClose: () => void;
}

export function ChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  onClose,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="glass-panel flex h-full w-80 flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold">Chat</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 transition-colors hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const isSelf = message.senderId === currentUserId;
            const isSystem = message.type === 'system';

            if (isSystem) {
              return (
                <div
                  key={message.id}
                  className="mx-auto max-w-[90%] rounded-lg bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground"
                >
                  {message.content}
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-1',
                  isSelf ? 'items-end' : 'items-start'
                )}
              >
                {!isSelf && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.senderName}
                  </span>
                )}
                <div
                  className={cn(
                    'chat-message',
                    isSelf ? 'chat-message-self' : 'chat-message-other'
                  )}
                >
                  {message.content}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(message.timestamp, 'HH:mm')}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-secondary/50"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
