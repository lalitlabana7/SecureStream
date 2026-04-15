'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { sanitizeText } from '@/lib/sanitize';

export interface ChatMessage {
  id: string;
  from: 'me' | 'partner';
  text: string;
  time: number;
}

interface TextChatProps {
  onSendMessage: (text: string) => void;
  messages: ChatMessage[];
  isOpen: boolean;
  onToggle: () => void;
}

export function TextChat({ onSendMessage, messages, isOpen, onToggle }: TextChatProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const sanitized = sanitizeText(trimmed);
    if (!sanitized) return;
    onSendMessage(sanitized);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        size="sm"
        className="bg-neutral-900/80 backdrop-blur-sm border-neutral-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-neutral-300 hover:text-emerald-400 h-10 px-3 rounded-xl gap-2 transition-all duration-200 relative"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Chat</span>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {messages.length > 99 ? '99+' : messages.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="flex flex-col w-full sm:w-80 bg-neutral-900/95 backdrop-blur-sm border border-neutral-800 rounded-xl overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
        <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          Text Chat
        </span>
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800"
        >
          &times;
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[200px] min-h-[120px] p-2 space-y-1.5 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-600 text-xs">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex flex-col max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm',
                msg.from === 'me'
                  ? 'self-end bg-emerald-600/20 text-emerald-100 border border-emerald-500/20'
                  : 'self-start bg-neutral-800 text-neutral-200 border border-neutral-700',
              )}
            >
              <span className="text-xs break-words">{sanitizeText(msg.text)}</span>
              <span className={cn(
                'text-[10px] mt-0.5 opacity-60',
                msg.from === 'me' ? 'text-emerald-300' : 'text-neutral-500',
              )}>
                {formatTime(msg.time)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-2 border-t border-neutral-800">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 h-9 bg-neutral-800 border-neutral-700 text-sm text-white placeholder:text-neutral-500 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 rounded-lg"
          maxLength={500}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim()}
          size="sm"
          className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shrink-0 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
