import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStableSpeechRecognition } from '@/hooks/useStableSpeechRecognition';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  isSpeaking?: boolean;
}

export function MessageInput({ 
  onSendMessage, 
  disabled, 
  isSpeaking = false,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { settings } = useSettings();
  const [isManualListening, setIsManualListening] = useState(false);

  // Handle speech result - auto-send on silence detection
  const handleSpeechResult = useCallback((transcript: string) => {
    if (transcript.trim() && !disabled && !isSpeaking) {
      setMessage('');
      setIsManualListening(false);
      onSendMessage(transcript.trim());
    }
  }, [onSendMessage, disabled, isSpeaking]);

  const handleInterim = useCallback((interim: string) => {
    setMessage(interim);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setIsManualListening(false);
  }, []);

  const handleSpeechError = useCallback((error: string) => {
    console.error('Speech recognition error:', error);
    setIsManualListening(false);
  }, []);

  const { 
    isListening, 
    transcript, 
    isSupported, 
    startListening, 
    stopListening,
    clearTranscript
  } = useStableSpeechRecognition({
    onResult: handleSpeechResult,
    onInterim: handleInterim,
    onEnd: handleSpeechEnd,
    onError: handleSpeechError,
    language: settings.voice_language,
    continuous: false,
    silenceTimeout: 1500,
    isGated: isSpeaking, // Gate mic while AI is speaking
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSubmit = useCallback(() => {
    if (message.trim() && !disabled && !isSpeaking) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, disabled, isSpeaking, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Manual mic button handler
  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsManualListening(false);
    } else if (!isSpeaking && !disabled) {
      setMessage('');
      clearTranscript();
      setIsManualListening(true);
      startListening();
    }
  }, [isListening, isSpeaking, disabled, stopListening, clearTranscript, startListening]);

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl p-4">
      <div className="max-w-3xl mx-auto space-y-3">
        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm animate-fade-in">
            <VolumeX className="h-4 w-4" />
            <span>AI is speaking...</span>
          </div>
        )}
        
        {/* Listening indicator */}
        {isListening && !isSpeaking && (
          <div className="flex items-center justify-center gap-2 text-primary text-sm animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            Listening — will auto-send on silence
          </div>
        )}
        
        {/* Input area */}
        <div className="relative flex items-end gap-2 bg-muted/30 rounded-2xl border border-border/50 p-2 transition-all duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-muted/40">
          {/* Manual Mic Button */}
          {isSupported && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleMicClick}
                  disabled={isSpeaking || disabled}
                  className={cn(
                    'h-10 w-10 rounded-xl shrink-0 transition-all duration-300',
                    isListening 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 animate-pulse' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isListening ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isSpeaking 
                  ? 'Wait for AI to finish speaking'
                  : isListening 
                    ? 'Stop listening' 
                    : 'Tap to speak (auto-sends on silence)'
                }
              </TooltipContent>
            </Tooltip>
          )}

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isSpeaking 
                ? "AI is speaking..." 
                : isListening 
                  ? "Listening..." 
                  : "Type a message..."
            }
            disabled={disabled || isListening}
            className={cn(
              'flex-1 min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2.5 px-3 text-base placeholder:text-muted-foreground/50',
              isListening && 'text-primary'
            )}
            rows={1}
          />

          {/* Send Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !message.trim() || isListening || isSpeaking}
                size="icon"
                className={cn(
                  'h-10 w-10 rounded-xl shrink-0 transition-all duration-300',
                  message.trim() && !disabled && !isListening && !isSpeaking
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {disabled ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
