import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mic, MicOff, ArrowLeft, Volume2, Loader2, Square, Radio, AlertCircle, Captions, CaptionsOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useStableSpeechRecognition } from '@/hooks/useStableSpeechRecognition';
import { useStableSpeechSynthesis } from '@/hooks/useStableSpeechSynthesis';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { useAI } from '@/hooks/useAI';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { IntelliVoxLogo } from '@/components/brand/IntelliVoxLogo';
import { toast } from 'sonner';

// Languages with full voice support (text + speech)
const FULL_VOICE_SUPPORT_LANGUAGES = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR',
  'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'nl-NL', 'pl-PL', 'tr-TR'
];

export default function Voice() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  // Captions state with persistence
  const [showCaptions, setShowCaptions] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('intellivox_captions_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const conversationRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const processingRef = useRef(false);
  const initialPromptProcessedRef = useRef(false);
  const mountedRef = useRef(true);

  const { streamChat, cancel } = useAI();

  // Toggle captions handler
  const toggleCaptions = () => {
    setShowCaptions(prev => {
      const newValue = !prev;
      localStorage.setItem('intellivox_captions_enabled', String(newValue));
      if (newValue) {
        toast.success("Captions enabled");
      } else {
        toast.info("Captions disabled");
      }
      return newValue;
    });
  };

  // Check if current language has full voice support
  const hasFullVoiceSupport = FULL_VOICE_SUPPORT_LANGUAGES.includes(settings.voice_language);

  // Centralized voice session management - handles mic gating automatically
  const {
    sessionState,
    isMicGated,
    transitionTo,
    resetSession,
    canStartListening,
  } = useVoiceSession({
    postSpeechDelay: 400,
    autoResumeListening: true,
  });

  // ============ STABLE MEMOIZED CALLBACKS ============
  // These prevent unnecessary re-renders and effect triggers

  // Handle speech synthesis end - transition back to listening
  const handleSpeechEnd = useCallback(() => {
    console.log('[Voice] Speech synthesis ended');
    if (!processingRef.current && mountedRef.current) {
      transitionTo('listening');
    }
  }, [transitionTo]);

  const handleSpeechError = useCallback((error: string) => {
    console.error('[Voice] Speech synthesis error:', error);
    if (mountedRef.current) {
      transitionTo('idle');
    }
  }, [transitionTo]);

  // Stable speech synthesis with voice locking and chunking
  const { speak, stop: stopSpeaking, isSpeaking, progress, resetVoiceLock } = useStableSpeechSynthesis({
    voice: settings.voice_gender,
    language: settings.voice_language,
    rate: settings.voice_speed,
    onEnd: handleSpeechEnd,
    onError: handleSpeechError,
  });

  // Reset voice lock when gender setting changes to force re-selection
  useEffect(() => {
    resetVoiceLock();
  }, [settings.voice_gender, resetVoiceLock]);

  // Process a prompt - core AI interaction logic
  const processPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim() || processingRef.current) {
      console.log('[Voice] Skipping prompt - empty or already processing');
      return;
    }

    console.log('[Voice] Processing prompt:', prompt.substring(0, 50));
    processingRef.current = true;
    transitionTo('processing');
    setAiResponse('');

    conversationRef.current.push({ role: 'user', content: prompt });

    let fullResponse = '';

    streamChat(conversationRef.current, {
      onDelta: (chunk) => {
        if (!mountedRef.current) return;
        fullResponse += chunk;
        setAiResponse(fullResponse);
      },
      onComplete: (response) => {
        if (!mountedRef.current) return;
        conversationRef.current.push({ role: 'assistant', content: response });
        processingRef.current = false;

        // Transition to speaking and start TTS
        console.log('[Voice] AI complete, starting TTS');
        transitionTo('speaking');
        speak(response);
      },
      onError: (error) => {
        if (!mountedRef.current) return;
        console.error('[Voice] AI Error:', error);
        processingRef.current = false;
        const fallback = "I'm here and listening. Please try again.";
        setAiResponse(fallback);
        transitionTo('speaking');
        speak(fallback);
      },
    });
  }, [speak, streamChat, transitionTo]);

  // Handle final speech recognition result
  const handleSpeechResult = useCallback((transcript: string) => {
    if (!transcript.trim() || processingRef.current) {
      console.log('[Voice] Ignoring speech result - empty or processing');
      return;
    }
    console.log('[Voice] Speech result received:', transcript.substring(0, 50));
    setCurrentTranscript(transcript);
    processPrompt(transcript);
  }, [processPrompt]);

  // Handle interim speech updates
  const handleInterim = useCallback((interim: string) => {
    if (mountedRef.current) {
      setCurrentTranscript(interim);
    }
  }, []);

  // Handle speech recognition end
  const handleRecognitionEnd = useCallback(() => {
    console.log('[Voice] Recognition ended, session state:', sessionState);
  }, [sessionState]);

  // Stable speech recognition with mic gating
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
    onEnd: handleRecognitionEnd,
    language: settings.voice_language,
    continuous: true,
    silenceTimeout: 1500,
    isGated: isMicGated, // Key: mic is gated during TTS
  });

  // Track mounted state for async operations
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync transcript to display (only when actively listening and not gated)
  useEffect(() => {
    if (isListening && transcript && !isMicGated) {
      setCurrentTranscript(transcript);
    }
  }, [transcript, isListening, isMicGated]);

  // Start listening when session transitions to listening state
  useEffect(() => {
    if (sessionState === 'listening' && !isListening && canStartListening()) {
      console.log('[Voice] Session is listening, starting recognition...');
      const started = startListening();
      console.log('[Voice] startListening result:', started);
    }
  }, [sessionState, isListening, startListening, canStartListening]);

  // Handle initial prompt from homepage - AUTO-START voice mode
  useEffect(() => {
    const handleInitialPrompt = async () => {
      if (!authLoading && user && !initialPromptProcessedRef.current && isSupported) {
        const initialPrompt = sessionStorage.getItem('intellivox_initial_prompt');
        if (initialPrompt) {
          initialPromptProcessedRef.current = true;
          sessionStorage.removeItem('intellivox_initial_prompt');

          // Small delay to ensure everything is ready
          await new Promise(resolve => setTimeout(resolve, 500));

          // Display the prompt and process it directly
          setCurrentTranscript(initialPrompt);
          await processPrompt(initialPrompt);
        }
      }
    };

    handleInitialPrompt();
  }, [authLoading, user, isSupported, processPrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[Voice] Unmounting - cleaning up');
      resetSession();
      stopSpeaking();
      stopListening();
      cancel();
    };
  }, [resetSession, stopSpeaking, stopListening, cancel]);

  // Mic toggle handler - STABLE with proper guards
  const handleMicToggle = useCallback(() => {
    console.log('[Voice] Mic toggle clicked, current state:', sessionState);

    if (sessionState === 'listening') {
      console.log('[Voice] Stopping listening');
      stopListening();
      transitionTo('idle');
    } else if (sessionState === 'speaking') {
      // User can interrupt AI mid-speech
      console.log('[Voice] Interrupting speech');
      stopSpeaking();
      clearTranscript();
      setCurrentTranscript('');
      transitionTo('listening');
    } else if (sessionState === 'idle') {
      console.log('[Voice] Starting new listening session');
      setCurrentTranscript('');
      setAiResponse('');
      transitionTo('listening');
    } else if (sessionState === 'processing') {
      console.log('[Voice] Cannot toggle during processing');
    }
  }, [sessionState, stopListening, stopSpeaking, clearTranscript, transitionTo]);

  // Full stop handler
  const handleStop = useCallback(() => {
    console.log('[Voice] Full stop requested');
    resetSession();
    stopSpeaking();
    stopListening();
    cancel();
    processingRef.current = false;
    setCurrentTranscript('');
  }, [resetSession, stopSpeaking, stopListening, cancel]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center glow-primary">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Speech not supported
  if (!isSupported) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gradient-mesh p-4">
        <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <MicOff className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Speech Not Supported</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-sm">
          Your browser doesn't support speech recognition. Please try Chrome or Edge.
        </p>
        <Button onClick={() => navigate('/chat')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background gradient-mesh">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={() => navigate('/chat')} className="hover:bg-primary/10 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <IntelliVoxLogo size="sm" />
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-success" />
            <h1 className="font-bold gradient-text">Live-Voice Chat</h1>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Captions Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCaptions}
            className={cn(
              "rounded-xl transition-all",
              showCaptions ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50"
            )}
            title={showCaptions ? "Hide captions" : "Show captions"}
          >
            {showCaptions ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
          </Button>

          {sessionState !== 'idle' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStop}
              className="hover:bg-destructive/10 text-destructive rounded-xl"
            >
              <Square className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Language warning for limited voice support */}
      {!hasFullVoiceSupport && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-3 animate-fade-in">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning">Limited Voice Support</p>
            <p className="text-muted-foreground">
              Voice output may be limited for this language. Text responses work fully.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* AI Response Display - Only show if captions enabled */}
        {showCaptions && aiResponse && (
          <div className="mb-8 max-w-md w-full animate-fade-in-up">
            <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-xl">
              <p className="text-foreground leading-relaxed">{aiResponse}</p>
              {/* Progress indicator for long responses */}
              {sessionState === 'speaking' && progress > 0 && progress < 100 && (
                <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mb-8 text-center">
          <div
            className={cn(
              'text-xl font-semibold transition-all duration-300',
              sessionState === 'listening' && 'text-primary',
              sessionState === 'processing' && 'text-warning',
              sessionState === 'speaking' && 'text-success'
            )}
          >
            {sessionState === 'idle' && 'Tap to start conversation'}
            {sessionState === 'listening' && 'Listening...'}
            {sessionState === 'processing' && 'Processing...'}
            {sessionState === 'speaking' && 'Speaking...'}
          </div>
          {/* User Transcript - Only show if captions enabled */}
          {showCaptions && currentTranscript && (sessionState === 'listening' || sessionState === 'processing') && (
            <p className="mt-4 text-muted-foreground max-w-md text-center animate-fade-in italic px-4">
              "{currentTranscript}"
            </p>
          )}

          {/* Mic gated indicator (debugging, can be removed in production) */}
          {isMicGated && sessionState === 'speaking' && (
            <p className="mt-2 text-xs text-muted-foreground/50">
              🔇 Microphone muted during playback
            </p>
          )}
        </div>

        {/* Mic Button */}
        <button
          onClick={handleMicToggle}
          className={cn(
            'relative h-40 w-40 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50',
            sessionState === 'idle' && 'bg-gradient-to-br from-primary/20 to-accent/10 hover:from-primary/30 hover:to-accent/20 hover:scale-105 btn-press',
            sessionState === 'listening' && 'bg-gradient-to-br from-primary to-primary/80 scale-110 glow-primary-intense',
            sessionState === 'processing' && 'bg-gradient-to-br from-warning/20 to-warning/5',
            sessionState === 'speaking' && 'bg-gradient-to-br from-success/20 to-success/5 hover:scale-105 cursor-pointer glow-success'
          )}
          disabled={sessionState === 'processing'}
        >
          {/* Animated rings */}
          {sessionState === 'listening' && (
            <>
              <span className="absolute inset-0 rounded-full animate-ripple bg-primary/30" />
              <span className="absolute -inset-4 rounded-full border-2 border-primary/30 animate-pulse" />
              <span className="absolute -inset-8 rounded-full border border-primary/20 animate-pulse" style={{ animationDelay: '0.3s' }} />
            </>
          )}

          {sessionState === 'speaking' && (
            <>
              <span className="absolute -inset-2 rounded-full border-2 border-success/40 animate-pulse" />
              <span className="absolute -inset-4 rounded-full border border-success/20 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="absolute -bottom-10 flex items-end gap-1.5 h-8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-2 bg-success rounded-full animate-speaking-bar"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </>
          )}

          {sessionState === 'processing' ? (
            <Loader2 className="h-16 w-16 text-warning animate-spin" />
          ) : sessionState === 'speaking' ? (
            <Volume2 className="h-16 w-16 text-success animate-pulse" />
          ) : (
            <Mic
              className={cn(
                'h-16 w-16 transition-all duration-300',
                sessionState === 'listening' ? 'text-primary-foreground scale-110' : 'text-primary'
              )}
            />
          )}
        </button>

        {/* Instructions */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
            {sessionState === 'idle' && 'Tap the microphone to start a live voice conversation'}
            {sessionState === 'listening' && 'Speak naturally — I\'ll respond when you pause'}
            {sessionState === 'processing' && 'Getting your response...'}
            {sessionState === 'speaking' && 'Tap to interrupt and speak'}
          </p>

          {/* Language indicator */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <span>Language:</span>
            <span className="font-medium">{settings.voice_language}</span>
            {hasFullVoiceSupport && (
              <span className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium">
                Full Support
              </span>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
