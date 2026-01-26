/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  language?: string;
  continuous?: boolean;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { onResult, onEnd, language = 'en-US', continuous = false } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const restartingRef = useRef(false);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true; // Always continuous for better detection
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
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
        const currentTranscript = finalTranscriptRef.current + (finalTranscript || interimTranscript);
        setTranscript(currentTranscript);

        if (finalTranscript) {
          finalTranscriptRef.current += finalTranscript;
        }

        // Clear existing silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Set silence detection timer - trigger after 1.5s of silence
        if (finalTranscriptRef.current.trim()) {
          silenceTimerRef.current = window.setTimeout(() => {
            const fullTranscript = finalTranscriptRef.current.trim();
            if (fullTranscript && onResult) {
              onResult(fullTranscript);
              finalTranscriptRef.current = '';
              setTranscript('');

              // Stop listening after sending (for non-continuous mode)
              if (!continuous) {
                recognition.stop();
              }
            }
          }, 1500);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended, restartingRef:', restartingRef.current, 'shouldRestartRef:', shouldRestartRef.current);

        // If we need to restart for continuous mode
        if (shouldRestartRef.current && !restartingRef.current) {
          restartingRef.current = true;
          setTimeout(() => {
            try {
              recognition.start();
              restartingRef.current = false;
              console.log('Restarted speech recognition for continuous mode');
            } catch (e) {
              console.error('Failed to restart speech recognition:', e);
              restartingRef.current = false;
              setIsListening(false);
              onEnd?.();
            }
          }, 100);
          return;
        }

        setIsListening(false);

        // Clear any pending timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // If there's remaining transcript, send it
        if (finalTranscriptRef.current.trim() && onResult) {
          onResult(finalTranscriptRef.current.trim());
          finalTranscriptRef.current = '';
        }

        onEnd?.();
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        // Don't stop on 'no-speech' error, just keep listening
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setIsListening(false);
          shouldRestartRef.current = false;
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [continuous, language, onResult, onEnd]);

  // Update language when it changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
      console.log('Updated speech recognition language to:', language);
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      finalTranscriptRef.current = '';
      shouldRestartRef.current = continuous;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Started listening with language:', language);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [isListening, continuous, language]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current && isListening) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, transcript, isSupported, startListening, stopListening };
}
