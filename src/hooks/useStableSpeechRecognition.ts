/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Production-hardened Speech Recognition Hook v2.0
 * 
 * MOBILE-SAFE IMPLEMENTATION:
 * - Detects mobile devices (Android/iOS) via User Agent
 * - Disables interimResults on mobile (prevents accumulation)
 * - Disables continuous mode on mobile (prevents buffer echo)
 * - Uses REPLACE strategy instead of APPEND on mobile
 * - Tracks last processed transcript to prevent duplicates
 * - Single instance guarantee (no concurrent mic sessions)
 * - Echo prevention via external gating signal
 * 
 * Desktop behavior remains unchanged for optimal UX.
 */

// ============ MOBILE DETECTION ============
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !navigator?.userAgent) return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
}

interface UseStableSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  silenceTimeout?: number;
  /** External gate signal - if true, mic input is ignored */
  isGated?: boolean;
}

export function useStableSpeechRecognition(options: UseStableSpeechRecognitionOptions = {}) {
  const {
    onResult,
    onInterim,
    onEnd,
    onError,
    language = 'en-US',
    continuous = false,
    silenceTimeout = 1500,
    isGated = false
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  // ============ REFS FOR STABLE STATE ============
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const lastProcessedRef = useRef(''); // DEDUPLICATION: Track last sent transcript
  const restartingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const isGatedRef = useRef(isGated);
  const startRequestedRef = useRef(false);
  const isListeningRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isMobileRef = useRef(isMobileDevice());

  // ============ STABLE CALLBACK REFS ============
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const continuousRef = useRef(continuous);
  const silenceTimeoutRef = useRef(silenceTimeout);

  // Keep refs synchronized with props
  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
    continuousRef.current = continuous;
    silenceTimeoutRef.current = silenceTimeout;
  }, [onResult, onInterim, onEnd, onError, continuous, silenceTimeout]);

  // Keep listening ref in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Keep gate ref in sync and stop if gated while listening
  useEffect(() => {
    const wasGated = isGatedRef.current;
    isGatedRef.current = isGated;

    if (!wasGated && isGated && isListeningRef.current) {
      console.log('[SpeechRecognition] Mic gated while listening - stopping');
      stopListeningInternal();
    }
  }, [isGated]);

  // Internal stop function
  const stopListeningInternal = useCallback(() => {
    console.log('[SpeechRecognition] stopListeningInternal called');
    shouldRestartRef.current = false;
    startRequestedRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors from stopping already stopped recognition
      }
    }
    setIsListening(false);
  }, []);

  // ============ MAIN INITIALIZATION ============
  useEffect(() => {
    // Guard against re-initialization
    if (isInitializedRef.current) {
      console.log('[SpeechRecognition] Already initialized, updating language only');
      if (recognitionRef.current) {
        recognitionRef.current.lang = language;
      }
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    setIsSupported(!!SpeechRecognitionAPI);

    if (!SpeechRecognitionAPI) {
      console.log('[SpeechRecognition] Speech recognition not supported');
      return;
    }

    const isMobile = isMobileRef.current;
    console.log('[SpeechRecognition] Initializing. Mobile:', isMobile);

    const recognition = new SpeechRecognitionAPI();

    // ============ MOBILE-SAFE CONFIGURATION ============
    if (isMobile) {
      // MOBILE: Disable features that cause duplication
      recognition.continuous = false;
      recognition.interimResults = false;
      console.log('[SpeechRecognition] Mobile mode: continuous=false, interimResults=false');
    } else {
      // DESKTOP: Full features
      recognition.continuous = true;
      recognition.interimResults = true;
    }

    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // Ignore results if gated (echo prevention)
      if (isGatedRef.current) {
        console.log('[SpeechRecognition] Ignoring result - mic is gated');
        return;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // ============ MOBILE-SAFE TRANSCRIPT HANDLING ============
      if (isMobile) {
        // MOBILE: REPLACE strategy - never append, always replace
        if (finalTranscript) {
          const cleanNew = finalTranscript.trim();

          // DEDUPLICATION: Check if this is a duplicate of what we just processed
          if (cleanNew === lastProcessedRef.current) {
            console.log('[SpeechRecognition] Mobile: Ignoring duplicate:', cleanNew.substring(0, 30));
            return;
          }

          // Replace entire transcript with new content
          finalTranscriptRef.current = cleanNew;
          setTranscript(cleanNew);
          onInterimRef.current?.(cleanNew);

          console.log('[SpeechRecognition] Mobile: Set transcript to:', cleanNew.substring(0, 30));
        }
      } else {
        // DESKTOP: Smart overlap removal (existing logic)
        if (finalTranscript) {
          const cleanNew = finalTranscript.trim();
          const currentRef = finalTranscriptRef.current.trim();

          // Strategy A: Extension detection
          if (cleanNew.toLowerCase().startsWith(currentRef.toLowerCase()) && currentRef.length > 0) {
            finalTranscriptRef.current = cleanNew;
          }
          // Strategy B: Overlap detection
          else if (currentRef && cleanNew) {
            let overlapFound = false;
            const words = cleanNew.split(' ');

            if (currentRef.endsWith(cleanNew)) {
              overlapFound = true;
            } else {
              for (let i = words.length; i > 0; i--) {
                const suffix = words.slice(0, i).join(' ');
                if (currentRef.endsWith(suffix)) {
                  const remaining = words.slice(i).join(' ');
                  finalTranscriptRef.current += (remaining ? ' ' + remaining : '');
                  overlapFound = true;
                  break;
                }
              }
            }

            if (!overlapFound) {
              const prefix = finalTranscriptRef.current ? ' ' : '';
              finalTranscriptRef.current += prefix + cleanNew;
            }
          }
          // Strategy C: First result
          else if (!currentRef) {
            finalTranscriptRef.current = cleanNew;
          }
        }

        // Desktop: Show interim results
        const currentTranscript = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
        setTranscript(currentTranscript);
        onInterimRef.current?.(currentTranscript);
      }

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Set silence detection timer to send final result
      if (finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = window.setTimeout(() => {
          const fullTranscript = finalTranscriptRef.current.trim();

          // DEDUPLICATION: Don't send if same as last processed
          if (fullTranscript === lastProcessedRef.current) {
            console.log('[SpeechRecognition] Silence: Skipping duplicate');
            return;
          }

          if (fullTranscript && onResultRef.current && !isGatedRef.current) {
            console.log('[SpeechRecognition] Silence detected, sending:', fullTranscript.substring(0, 50));
            lastProcessedRef.current = fullTranscript; // Mark as processed
            onResultRef.current(fullTranscript);
            finalTranscriptRef.current = '';
            setTranscript('');

            if (!continuousRef.current || isMobile) {
              recognition.stop();
            }
          }
        }, silenceTimeoutRef.current);
      }
    };

    recognition.onstart = () => {
      console.log('[SpeechRecognition] ✅ Recognition STARTED');
      setIsListening(true);
      isListeningRef.current = true;
      startRequestedRef.current = false;
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition] Recognition ended, shouldRestart:', shouldRestartRef.current);

      // MOBILE: Never auto-restart to prevent loops
      if (isMobile) {
        setIsListening(false);
        isListeningRef.current = false;

        // Send any remaining transcript
        if (finalTranscriptRef.current.trim() && onResultRef.current && !isGatedRef.current) {
          const fullTranscript = finalTranscriptRef.current.trim();
          if (fullTranscript !== lastProcessedRef.current) {
            console.log('[SpeechRecognition] Mobile onend: Sending remaining:', fullTranscript.substring(0, 30));
            lastProcessedRef.current = fullTranscript;
            onResultRef.current(fullTranscript);
          }
          finalTranscriptRef.current = '';
        }

        onEndRef.current?.();
        startRequestedRef.current = false;
        return;
      }

      // DESKTOP: Handle restart for continuous mode
      if (shouldRestartRef.current && !restartingRef.current && !isGatedRef.current) {
        restartingRef.current = true;
        console.log('[SpeechRecognition] Scheduling restart for continuous mode');
        setTimeout(() => {
          try {
            if (shouldRestartRef.current && !isGatedRef.current) {
              console.log('[SpeechRecognition] Restarting...');
              recognition.start();
            } else {
              setIsListening(false);
              isListeningRef.current = false;
            }
          } catch (e) {
            console.error('[SpeechRecognition] Failed to restart:', e);
            setIsListening(false);
            isListeningRef.current = false;
            shouldRestartRef.current = false;
          }
          restartingRef.current = false;
        }, 100);
        return;
      }

      setIsListening(false);
      isListeningRef.current = false;

      // Clear pending timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Send any remaining transcript
      if (finalTranscriptRef.current.trim() && onResultRef.current && !isGatedRef.current) {
        const fullTranscript = finalTranscriptRef.current.trim();
        if (fullTranscript !== lastProcessedRef.current) {
          console.log('[SpeechRecognition] Sending remaining transcript on end');
          lastProcessedRef.current = fullTranscript;
          onResultRef.current(fullTranscript);
        }
        finalTranscriptRef.current = '';
      }

      onEndRef.current?.();
      startRequestedRef.current = false;
    };

    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);

      if (event.error === 'no-speech' || event.error === 'aborted') {
        console.log('[SpeechRecognition] Non-fatal error, continuing...');
        return;
      }

      if (event.error === 'not-allowed') {
        onErrorRef.current?.('Microphone access denied');
      } else {
        onErrorRef.current?.(event.error);
      }

      setIsListening(false);
      isListeningRef.current = false;
      shouldRestartRef.current = false;
      startRequestedRef.current = false;
    };

    recognitionRef.current = recognition;
    isInitializedRef.current = true;

    return () => {
      console.log('[SpeechRecognition] Cleanup - aborting recognition');
      shouldRestartRef.current = false;
      startRequestedRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [language]);

  const startListening = useCallback(() => {
    // Don't start if gated
    if (isGatedRef.current) {
      console.log('[SpeechRecognition] Cannot start - mic is gated');
      return false;
    }

    if (!recognitionRef.current) {
      console.log('[SpeechRecognition] Cannot start - recognition not initialized');
      return false;
    }

    // SINGLE INSTANCE GUARANTEE: Prevent double-start
    if (isListeningRef.current) {
      console.log('[SpeechRecognition] Already listening, ignoring start request');
      return true;
    }

    if (startRequestedRef.current) {
      console.log('[SpeechRecognition] Start already requested, waiting...');
      return true;
    }

    console.log('[SpeechRecognition] Starting listening...');

    // Clear previous state
    setTranscript('');
    finalTranscriptRef.current = '';
    lastProcessedRef.current = ''; // Reset deduplication on new session

    // Only enable auto-restart for desktop continuous mode
    shouldRestartRef.current = continuousRef.current && !isMobileRef.current;
    startRequestedRef.current = true;

    try {
      recognitionRef.current.start();
      console.log('[SpeechRecognition] Start command sent, language:', language);
      return true;
    } catch (error) {
      console.error('[SpeechRecognition] Failed to start:', error);
      startRequestedRef.current = false;

      // If error is "already started", treat as success
      if ((error as Error).message?.includes('already started')) {
        console.log('[SpeechRecognition] Recognition was already started');
        setIsListening(true);
        isListeningRef.current = true;
        return true;
      }
      return false;
    }
  }, [language]);

  const stopListening = useCallback(() => {
    console.log('[SpeechRecognition] stopListening called');
    stopListeningInternal();
  }, [stopListeningInternal]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    lastProcessedRef.current = '';
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    clearTranscript
  };
}
