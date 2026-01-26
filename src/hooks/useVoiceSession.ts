import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Voice Session Manager
 * Provides centralized control over voice state to prevent:
 * - Echo/feedback loops (AI hearing its own output)
 * - Race conditions between listening and speaking
 * - Inconsistent state across components
 * 
 * FIXES APPLIED:
 * - No more idle state flicker during transitions
 * - Stable state machine with proper guards
 * - Improved logging for debugging
 */

export type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceSessionConfig {
  /** Delay in ms after speech ends before re-enabling mic */
  postSpeechDelay?: number;
  /** Whether to auto-resume listening after AI finishes speaking */
  autoResumeListening?: boolean;
}

interface VoiceSessionReturn {
  /** Current state of the voice session */
  sessionState: VoiceSessionState;
  /** Whether microphone input should be accepted */
  isMicGated: boolean;
  /** Whether AI is currently outputting audio */
  isOutputActive: boolean;
  /** Transition to a new state with proper gating */
  transitionTo: (state: VoiceSessionState) => void;
  /** Force gate the mic (during TTS) */
  gateMicrophone: () => void;
  /** Release mic gate (after TTS + delay) */
  releaseMicrophone: () => void;
  /** Check if we can start listening */
  canStartListening: () => boolean;
  /** Check if we're in a safe state to process audio input */
  canProcessInput: () => boolean;
  /** Reset session to idle */
  resetSession: () => void;
}

const DEFAULT_POST_SPEECH_DELAY = 400; // ms to wait after TTS ends before enabling mic

export function useVoiceSession(config: VoiceSessionConfig = {}): VoiceSessionReturn {
  const {
    postSpeechDelay = DEFAULT_POST_SPEECH_DELAY,
    autoResumeListening = false
  } = config;

  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');
  const [isMicGated, setIsMicGated] = useState(false);
  const [isOutputActive, setIsOutputActive] = useState(false);

  const stateRef = useRef<VoiceSessionState>('idle');
  const micGateTimeoutRef = useRef<number | null>(null);
  const pendingStateRef = useRef<VoiceSessionState | null>(null);
  const transitionLockRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    stateRef.current = sessionState;
  }, [sessionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micGateTimeoutRef.current) {
        clearTimeout(micGateTimeoutRef.current);
      }
    };
  }, []);

  const gateMicrophone = useCallback(() => {
    console.log('[VoiceSession] Gating microphone');
    // Clear any pending ungate
    if (micGateTimeoutRef.current) {
      clearTimeout(micGateTimeoutRef.current);
      micGateTimeoutRef.current = null;
    }
    setIsMicGated(true);
    setIsOutputActive(true);
  }, []);

  const releaseMicrophone = useCallback(() => {
    console.log('[VoiceSession] Releasing microphone (with delay)');
    setIsOutputActive(false);

    // Delay before actually ungating to prevent echo from lingering audio
    micGateTimeoutRef.current = window.setTimeout(() => {
      console.log('[VoiceSession] Mic gate released');
      setIsMicGated(false);
      micGateTimeoutRef.current = null;

      // If we have a pending state transition to listening, do it now
      if (pendingStateRef.current && autoResumeListening) {
        console.log('[VoiceSession] Executing pending transition to:', pendingStateRef.current);
        const pendingState = pendingStateRef.current;
        pendingStateRef.current = null;
        setSessionState(pendingState);
      }
    }, postSpeechDelay);
  }, [postSpeechDelay, autoResumeListening]);

  const transitionTo = useCallback((newState: VoiceSessionState) => {
    // Prevent concurrent transitions
    if (transitionLockRef.current) {
      console.log('[VoiceSession] Transition locked, queueing:', newState);
      pendingStateRef.current = newState;
      return;
    }

    const currentState = stateRef.current;

    // Validate state transitions
    const validTransitions: Record<VoiceSessionState, VoiceSessionState[]> = {
      'idle': ['listening', 'processing'],
      'listening': ['idle', 'processing', 'speaking'],
      'processing': ['speaking', 'idle', 'listening'],
      'speaking': ['idle', 'listening', 'processing'],
    };

    if (!validTransitions[currentState].includes(newState)) {
      console.warn(`[VoiceSession] Invalid transition: ${currentState} -> ${newState}`);
      return;
    }

    console.log(`[VoiceSession] Transitioning: ${currentState} -> ${newState}`);

    // Handle mic gating based on state
    if (newState === 'speaking') {
      gateMicrophone();
      setSessionState(newState);
    } else if (currentState === 'speaking') {
      // Transitioning OUT of speaking state
      releaseMicrophone();

      if (newState === 'listening') {
        // IMPORTANT FIX: Don't flicker to idle!
        // Instead, mark as pending and transition directly when mic is released
        console.log('[VoiceSession] Queuing listen after speech ends');
        pendingStateRef.current = 'listening';
        // Stay in speaking state visually until mic is ready
        // The actual transition happens in releaseMicrophone callback
      } else {
        setSessionState(newState);
      }
    } else {
      // Normal transitions not involving speaking
      setSessionState(newState);
    }
  }, [gateMicrophone, releaseMicrophone]);

  const canStartListening = useCallback((): boolean => {
    const can = !isMicGated && !isOutputActive && stateRef.current !== 'speaking';
    console.log('[VoiceSession] canStartListening:', can, '(gated:', isMicGated, 'output:', isOutputActive, 'state:', stateRef.current, ')');
    return can;
  }, [isMicGated, isOutputActive]);

  const canProcessInput = useCallback((): boolean => {
    return !isMicGated && stateRef.current === 'listening';
  }, [isMicGated]);

  const resetSession = useCallback(() => {
    console.log('[VoiceSession] Resetting session');
    if (micGateTimeoutRef.current) {
      clearTimeout(micGateTimeoutRef.current);
      micGateTimeoutRef.current = null;
    }
    pendingStateRef.current = null;
    transitionLockRef.current = false;
    setIsMicGated(false);
    setIsOutputActive(false);
    setSessionState('idle');
  }, []);

  return {
    sessionState,
    isMicGated,
    isOutputActive,
    transitionTo,
    gateMicrophone,
    releaseMicrophone,
    canStartListening,
    canProcessInput,
    resetSession,
  };
}
