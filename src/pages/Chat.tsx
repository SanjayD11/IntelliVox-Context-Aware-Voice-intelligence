import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Menu, Loader2, PanelLeftClose, PanelLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useChats, useMessages } from '@/hooks/useChats';
import { useStableSpeechSynthesis } from '@/hooks/useStableSpeechSynthesis';
import { useAI } from '@/hooks/useAI';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { VoiceControls } from '@/components/chat/VoiceControls';
import { ConfidenceToggle } from '@/components/chat/ConfidenceToggle';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const { chats, loading: chatsLoading, createChat, deleteChat, updateChatTitle } = useChats();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [initialPromptProcessed, setInitialPromptProcessed] = useState(false);
  // Scroll to latest button state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedChatId);

  // Store messages in a ref to prevent re-renders from affecting TTS
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Stable speech synthesis with voice locking
  const { speak, stop: stopSpeaking, isSpeaking, resetVoiceLock } = useStableSpeechSynthesis({
    voice: settings.voice_gender,
    language: settings.voice_language,
    rate: settings.voice_speed,
  });

  const { streamChat, cancel } = useAI();

  const streamingRef = useRef('');
  const fullResponseRef = useRef('');
  // For retry feature - stores the last user message
  const lastUserMessageRef = useRef<string>('');

  // Handle scroll state changes from MessageList
  const handleScrollStateChange = useCallback((shouldShow: boolean, scrollFn: () => void) => {
    setShowScrollButton(shouldShow);
    scrollToBottomRef.current = scrollFn;
  }, []);

  // Select first chat when available
  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      setSelectedChatId(chats[0].id);
    }
  }, [chats, selectedChatId]);

  // Stop speaking when changing chats
  useEffect(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
  }, [selectedChatId]);

  // Reset voice lock when settings change
  useEffect(() => {
    resetVoiceLock();
  }, [settings.voice_gender, settings.voice_language, resetVoiceLock]);

  // Handle initial prompt from homepage
  useEffect(() => {
    const processInitialPrompt = async () => {
      if (!authLoading && user && !chatsLoading && !initialPromptProcessed) {
        const initialPrompt = sessionStorage.getItem('intellivox_initial_prompt');
        if (initialPrompt) {
          sessionStorage.removeItem('intellivox_initial_prompt');
          setInitialPromptProcessed(true);
          await new Promise(resolve => setTimeout(resolve, 300));
          handleSendMessage(initialPrompt);
        } else {
          setInitialPromptProcessed(true);
        }
      }
    };
    processInitialPrompt();
  }, [authLoading, user, chatsLoading, initialPromptProcessed]);

  const handleNewChat = async () => {
    const chat = await createChat();
    if (chat) {
      setSelectedChatId(chat.id);
      setIsMobileSidebarOpen(false);
    }
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    await updateChatTitle(chatId, newTitle);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Stop any ongoing speech
    if (isSpeaking) {
      stopSpeaking();
    }

    // Store for retry feature
    lastUserMessageRef.current = content;

    let chatId = selectedChatId;

    // Create new chat if needed
    if (!chatId) {
      const chat = await createChat(content.slice(0, 30) + (content.length > 30 ? '...' : ''));
      if (!chat) return;
      chatId = chat.id;
      setSelectedChatId(chat.id);
    }

    // Send user message
    await sendMessage(content, 'user');

    // Start AI response
    setIsAiResponding(true);
    setStreamingContent('');
    streamingRef.current = '';
    fullResponseRef.current = '';

    const currentMessages = messagesRef.current;
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = currentMessages.map(m => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));
    conversationHistory.push({ role: 'user' as const, content });

    streamChat(conversationHistory, {
      onDelta: (chunk) => {
        streamingRef.current += chunk;
        fullResponseRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      onComplete: async (fullResponse) => {
        // Save message first - text must persist
        await sendMessage(fullResponse, 'ai');

        // Clear streaming after save
        setStreamingContent('');
        setIsAiResponding(false);

        // Voice is secondary - only after text is saved
        if (settings.auto_speak && fullResponse?.trim()) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              speak(fullResponse);
            }, 100);
          });
        }
      },
      onError: (error) => {
        console.error('AI Error:', error);
        const fallback = "I'm processing your request. Let me try again.";
        setStreamingContent(fallback);
        setTimeout(async () => {
          await sendMessage(fallback, 'ai');
          setStreamingContent('');
          setIsAiResponding(false);
        }, 500);
      },
    });
  }, [selectedChatId, createChat, sendMessage, settings.auto_speak, speak, streamChat, isSpeaking, stopSpeaking]);

  // Retry last response - controlled regeneration without session reset
  const handleRetry = useCallback(async () => {
    const lastMessage = lastUserMessageRef.current;
    if (!lastMessage || !selectedChatId || isAiResponding) return;

    // Stop any ongoing speech first
    if (isSpeaking) {
      stopSpeaking();
    }

    // Cancel any pending AI request
    cancel();

    // Start AI response with elevated temperature for variation
    setIsAiResponding(true);
    setStreamingContent('');
    streamingRef.current = '';
    fullResponseRef.current = '';

    // Build conversation history - includes the original user message but NOT the previous AI response
    // We exclude the last AI message to regenerate it
    const currentMessages = messagesRef.current;
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (let i = 0; i < currentMessages.length; i++) {
      const m = currentMessages[i];
      // Skip the last AI message (we're regenerating it)
      if (i === currentMessages.length - 1 && m.role === 'ai') {
        continue;
      }
      conversationHistory.push({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      });
    }

    streamChat(conversationHistory, {
      temperature: 0.9, // +0.1 from default 0.8 for natural variation
      onDelta: (chunk) => {
        streamingRef.current += chunk;
        fullResponseRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      onComplete: async (fullResponse) => {
        // Save the new AI message
        await sendMessage(fullResponse, 'ai');

        // Clear streaming after save
        setStreamingContent('');
        setIsAiResponding(false);

        // Voice is secondary - only after text is saved
        if (settings.auto_speak && fullResponse?.trim()) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              speak(fullResponse);
            }, 100);
          });
        }
      },
      onError: (error) => {
        console.error('AI Retry Error:', error);
        const fallback = "Let me try a different approach. Please ask again.";
        setStreamingContent(fallback);
        setTimeout(async () => {
          await sendMessage(fallback, 'ai');
          setStreamingContent('');
          setIsAiResponding(false);
        }, 500);
      },
    });
  }, [selectedChatId, isAiResponding, isSpeaking, stopSpeaking, cancel, sendMessage, settings.auto_speak, speak, streamChat]);

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (selectedChatId === chatId) {
      setSelectedChatId(chats.find(c => c.id !== chatId)?.id || null);
    }
  };

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
  }, [stopSpeaking]);

  const handleLogoClick = () => {
    navigate('/');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
      stopSpeaking();
    };
  }, [cancel, stopSpeaking]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
          <IntelliVoxLogo size="lg" />
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading IntelliVox...</p>
        </div>
      </div>
    );
  }

  // Auth redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={setSelectedChatId}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/95 backdrop-blur-xl shrink-0">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden hover:bg-primary/10 rounded-xl shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex hover:bg-primary/10 transition-all duration-200 rounded-xl shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
          >
            <IntelliVoxLogo size="sm" />
          </button>

          <h2 className="font-semibold truncate flex-1 text-foreground">
            {chats.find(c => c.id === selectedChatId)?.title || 'IntelliVox'}
          </h2>

          {/* Confidence Toggle */}
          <div className="hidden sm:block">
            <ConfidenceToggle />
          </div>

          {/* Voice controls */}
          <VoiceControls
            isSpeaking={isSpeaking}
            onStop={handleStopSpeaking}
          />
        </header>

        {/* Messages */}
        {chatsLoading || messagesLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading messages...</p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            loading={isAiResponding}
            streamingContent={streamingContent}
            isSpeaking={isSpeaking}
            onRetry={handleRetry}
            onScrollStateChange={handleScrollStateChange}
          />
        )}

        {/* Scroll to Latest button - positioned just above input, centered like ChatGPT */}
        {showScrollButton && (
          <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => scrollToBottomRef.current?.()}
              aria-label="Scroll to latest"
              className={cn(
                'h-8 w-8 rounded-full',
                'bg-background/95 backdrop-blur-sm border border-border/60 shadow-md',
                'flex items-center justify-center',
                'text-muted-foreground hover:text-foreground hover:bg-background',
                'transition-all duration-200 ease-out',
                'hover:shadow-lg hover:scale-105'
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isAiResponding}
          isSpeaking={isSpeaking}
        />
      </div>
    </div>
  );
}
