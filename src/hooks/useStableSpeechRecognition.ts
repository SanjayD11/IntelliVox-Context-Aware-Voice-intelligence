/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Production-hardened Speech Recognition Hook
 * 
 * Key improvements:
 * - Microphone gating support: Respects external gate signals to prevent echo
 * - Clean state management: No stuck listening states
 * - Proper cleanup: No memory leaks or orphaned listeners
 * - Better silence detection: Configurable timeouts
 * - Robust restart logic: Handles browser quirks
 * - STABLE REFERENCES: Callbacks stored in refs to prevent effect recreation
 */

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

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const restartingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const isGatedRef = useRef(isGated);
  const startRequestedRef = useRef(false);
  const isListeningRef = useRef(false);
  const isInitializedRef = useRef(false);

  // ============ STABLE CALLBACK REFS ============
  // Store callbacks in refs to prevent useEffect recreation
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

  // Keep gate ref in sync - but DON'T auto-stop here
  // The gating logic is handled in the recognition handlers
  useEffect(() => {
    const wasGated = isGatedRef.current;
    isGatedRef.current = isGated;

    // Only stop if we transition FROM ungated TO gated while actively listening
    if (!wasGated && isGated && isListeningRef.current) {
      console.log('[SpeechRecognition] Mic gated while listening - stopping');
      stopListeningInternal();
    }
  }, [isGated]);

  // Internal stop function that doesn't depend on isListening state
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

  // Initialize speech recognition ONCE
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

    console.log('[SpeechRecognition] Initializing speech recognition');

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      // Ignore results if gated
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

      // Update display transcript
      // MOBILE FIX: Deduplicate final transcript to prevent "hellohello"
      if (finalTranscript) {
        // Clean up the new segment
        const cleanSegment = finalTranscript.trim();
        const currentRef = finalTranscriptRef.current.trim();

        // Only append if we haven't just added this exact segment
        // This fixes the Android repetitive text bug
        if (cleanSegment && !currentRef.endsWith(cleanSegment)) {
          // Add space if we have previous text
          const prefix = finalTranscriptRef.current ? ' ' : '';
          finalTranscriptRef.current += prefix + cleanSegment;
        }
      }

      // Reconstruct full transcript for display
      const currentTranscript = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
      setTranscript(currentTranscript);
      onInterimRef.current?.(currentTranscript);

      // NUCLEAR OPTION FOR MOBILE:
      // If we got a final result, force a restart by stopping immediately.
      // This wipes the browser's internal legacy buffer which causes the "hellohello" bug.
      if (finalTranscript) {
        console.log('[SpeechRecognition] Final result received, force-resetting to prevent Android echo');
        // We do NOT append here. We rely on the fact that we processed it above.
        // But we MUST check if we processed it. 
        // Actually, the previous logic (lines 161-171) added it to finalTranscriptRef.
        // Note: I see I need to be careful not to double-add.

        // Let's rely on the dedupe logic we added before, BUT force a stop.
        if (continuousRef.current) {
          recognition.stop();
          // The onend handler will see 'shouldRestartRef' is true and restart us.
        }
      }

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Set silence detection timer
      if (finalTranscriptRef.current.trim()) {
        silenceTimerRef.current = window.setTimeout(() => {
          const fullTranscript = finalTranscriptRef.current.trim();
          if (fullTranscript && onResultRef.current && !isGatedRef.current) {
            console.log('[SpeechRecognition] Silence detected, sending result:', fullTranscript.substring(0, 50));
            onResultRef.current(fullTranscript);
            finalTranscriptRef.current = '';
            setTranscript('');

            if (!continuousRef.current) {
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
      startRequestedRef.current = false; // Clear the request flag since we're now started
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition] Recognition ended, shouldRestart:', shouldRestartRef.current, 'isGated:', isGatedRef.current);

      // Handle restart for continuous mode
      if (shouldRestartRef.current && !restartingRef.current && !isGatedRef.current) {
        restartingRef.current = true;
        console.log('[SpeechRecognition] Scheduling restart for continuous mode');
        setTimeout(() => {
          try {
            if (shouldRestartRef.current && !isGatedRef.current) {
              console.log('[SpeechRecognition] Restarting...');
              recognition.start();
            } else {
              console.log('[SpeechRecognition] Restart cancelled - shouldRestart:', shouldRestartRef.current, 'isGated:', isGatedRef.current);
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
        console.log('[SpeechRecognition] Sending remaining transcript on end');
        onResultRef.current(finalTranscriptRef.current.trim());
        finalTranscriptRef.current = '';
      }

      onEndRef.current?.();
      startRequestedRef.current = false;
    };

    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);

      if (event.error === 'no-speech' || event.error === 'aborted') {
        // Non-fatal errors - don't stop listening
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
  }, [language]); // ONLY language as dependency - callbacks are in refs!

  const startListening = useCallback(() => {
    // Don't start if gated
    if (isGatedRef.current) {
      console.log('[SpeechRecognition] Cannot start - mic is gated');
      return false;
    }

    // Use ref for checking listening state to avoid stale closure
    if (!recognitionRef.current) {
      console.log('[SpeechRecognition] Cannot start - recognition not initialized');
      return false;
    }

    if (isListeningRef.current) {
      console.log('[SpeechRecognition] Already listening, ignoring start request');
      return true;
    }

    if (startRequestedRef.current) {
      console.log('[SpeechRecognition] Start already requested, waiting...');
      return true;
    }

    console.log('[SpeechRecognition] Starting listening...');
    setTranscript('');
    finalTranscriptRef.current = '';
    shouldRestartRef.current = continuousRef.current;
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
