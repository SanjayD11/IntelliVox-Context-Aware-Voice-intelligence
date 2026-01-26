import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { User, Bot, Sparkles, Volume2 } from 'lucide-react';
import { CopyButton } from '@/components/chat/CopyButton';
import { RetryButton } from '@/components/chat/RetryButton';
import type { Message } from '@/hooks/useChats';

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  streamingContent?: string;
  isSpeaking?: boolean;
  /** Callback to retry/regenerate the last AI response */
  onRetry?: () => void;
  /** Callback when scroll state changes (true = not at bottom) */
  onScrollStateChange?: (showScrollButton: boolean, scrollToBottom: () => void) => void;
}

export function MessageList({ messages, loading, streamingContent, isSpeaking = false, onRetry, onScrollStateChange }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if user is near the bottom of the scroll container
  const checkIfNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const threshold = 100; // pixels from bottom to consider "near bottom"
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  // Handle scroll events to track position
  const handleScroll = useCallback(() => {
    const nearBottom = checkIfNearBottom();
    isNearBottomRef.current = nearBottom;
    // Notify parent of scroll state change
    onScrollStateChange?.(!nearBottom, scrollToBottom);
  }, [checkIfNearBottom, onScrollStateChange, scrollToBottom]);

  // Auto-scroll only when user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (messages.length === 0 && !loading && !streamingContent) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 gradient-mesh">
        <div className="text-center max-w-md animate-fade-in-up">
          <div className="relative mx-auto mb-8">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center mx-auto glow-primary animate-breathing">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center animate-bounce">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3 gradient-text">
            Start a conversation
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Type a message or tap the microphone to speak.
            <br />
            <span className="text-sm opacity-75">Your intelligent assistant, ready when you are.</span>
          </p>
        </div>
      </div>
    );
  }

  const lastAiMessageIndex = messages.map((m, i) => ({ ...m, index: i }))
    .filter(m => m.role === 'ai')
    .pop()?.index;

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            'flex gap-3 animate-fade-in group',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
        >
          {message.role === 'ai' && (
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shrink-0 shadow-lg relative">
              <Bot className="h-5 w-5 text-primary" />
              {isSpeaking && index === lastAiMessageIndex && !streamingContent && (
                <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ripple" />
              )}
            </div>
          )}
          <div
            className={cn(
              'relative max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-md transition-all duration-200',
              message.role === 'user'
                ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-lg'
                : 'bg-card border border-border/50 text-foreground rounded-bl-lg'
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>

            {/* Copy button for all messages */}
            <CopyButton
              text={message.content}
              className={cn(
                "absolute -top-2",
                message.role === 'user' ? '-left-2' : '-right-2'
              )}
            />

            {isSpeaking && message.role === 'ai' && index === lastAiMessageIndex && !streamingContent && (
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-3">
                <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-speaking-bar"
                      style={{ animationDelay: `${i * 0.08}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-primary font-medium">Speaking...</span>
              </div>
            )}

            {/* Retry button - shown on last AI message when not loading or speaking */}
            {message.role === 'ai' && index === lastAiMessageIndex && !loading && !streamingContent && !isSpeaking && onRetry && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <RetryButton
                  onRetry={onRetry}
                  disabled={loading}
                />
              </div>
            )}
          </div>
          {message.role === 'user' && (
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 shadow-lg">
              <User className="h-5 w-5 text-foreground" />
            </div>
          )}
        </div>
      ))}

      {/* Streaming response */}
      {streamingContent && (
        <div className="flex gap-3 justify-start animate-fade-in group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shrink-0 shadow-lg">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="relative bg-card border border-border/50 rounded-2xl rounded-bl-lg px-4 py-3 max-w-[85%] md:max-w-[70%] shadow-md">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{streamingContent}</p>
          </div>
        </div>
      )}

      {/* Typing indicator */}
      {loading && !streamingContent && (
        <div className="flex gap-3 justify-start animate-fade-in">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shrink-0 shadow-lg">
            <Bot className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="bg-card border border-border/50 rounded-2xl rounded-bl-lg px-4 py-3 shadow-md">
            <div className="flex gap-1.5 items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
