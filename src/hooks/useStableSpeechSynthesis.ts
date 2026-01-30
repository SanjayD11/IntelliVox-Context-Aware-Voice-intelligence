import { useState, useCallback, useRef, useEffect } from 'react';
import { isMobileDevice } from '@/utils/deviceDetection';

/**
 * Production-hardened Speech Synthesis Hook
 * 
 * CAPABILITY-AWARE VOICE SELECTION:
 * - Male voices are ONLY available for English (en-US, en-UK)
 * - Other languages use the best available voice (typically female or neutral)
 * - This is NOT a fallback or error - it's the expected behavior
 * - No warning logs for expected capability constraints
 */

interface UseStableSpeechSynthesisOptions {
  voice?: 'male' | 'female';
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface SpeechChunk {
  text: string;
  index: number;
}

// Maximum characters per chunk to avoid Chrome's speech timeout
const MAX_CHUNK_LENGTH = 150;
// Pause between chunks for natural flow
const CHUNK_PAUSE_MS = 50;

// ============ LANGUAGE VOICE CAPABILITY MAP ============
// Defines which languages support which voice genders
// This is based on actual browser/platform TTS capabilities

interface LanguageVoiceCapability {
  supportsMale: boolean;
  supportsFemale: boolean;
  defaultGender: 'male' | 'female' | 'neutral';
}

const LANGUAGE_CAPABILITIES: Record<string, LanguageVoiceCapability> = {
  // English - Full support for both genders
  'en': { supportsMale: true, supportsFemale: true, defaultGender: 'female' },

  // Other languages - Female/neutral only in most browser implementations
  'es': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'fr': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'de': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'it': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'pt': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'ja': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'ko': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'zh': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'ru': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'nl': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'pl': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'tr': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'hi': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'ar': { supportsMale: false, supportsFemale: true, defaultGender: 'neutral' },
  'ta': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'te': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'vi': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'th': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
  'id': { supportsMale: false, supportsFemale: true, defaultGender: 'female' },
};

/**
 * Get voice capability for a language
 */
function getLanguageCapability(language: string): LanguageVoiceCapability {
  const langPrefix = language.split('-')[0].toLowerCase();
  return LANGUAGE_CAPABILITIES[langPrefix] || {
    supportsMale: false,
    supportsFemale: true,
    defaultGender: 'neutral'
  };
}

/**
 * Check if a language supports the requested gender
 */
function languageSupportsGender(language: string, gender: 'male' | 'female'): boolean {
  const capability = getLanguageCapability(language);
  return gender === 'male' ? capability.supportsMale : capability.supportsFemale;
}

// ============ VOICE NAME PATTERNS ============
// For languages that DO support male voices (English)

const MALE_VOICE_PATTERNS = [
  'david', 'mark', 'richard', 'george', 'james', 'sean', 'male', 'man',
  'alex', 'daniel', 'oliver', 'fred', 'thomas', 'gordon', 'lee', 'bruce',
  'google.*male', 'microsoft.*david', 'microsoft.*mark',
];

const FEMALE_VOICE_PATTERNS = [
  'zira', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'female', 'woman',
  'susan', 'linda', 'kate', 'catherine', 'emily', 'emma', 'ava', 'sophia',
  'google.*female', 'microsoft.*zira',
];

/**
 * Match voice name against patterns
 */
function matchesPatterns(voiceName: string, patterns: string[]): boolean {
  const nameLower = voiceName.toLowerCase();
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(nameLower);
    }
    return nameLower.includes(pattern);
  });
}

export function useStableSpeechSynthesis(options: UseStableSpeechSynthesisOptions = {}) {
  const {
    voice = 'female',
    language = 'en-US',
    rate = 1,
    pitch = 1,
    onStart,
    onEnd,
    onError
  } = options;

  // Mobile voice workaround: detect if on mobile device
  const isMobile = isMobileDevice();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [progress, setProgress] = useState(0);

  // Locked voice PER LANGUAGE
  const lockedVoicesRef = useRef<Map<string, SpeechSynthesisVoice>>(new Map());
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<SpeechChunk[]>([]);
  const currentChunkRef = useRef(0);
  const abortedRef = useRef(false);
  const speakingTextRef = useRef('');
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  // Store current settings in refs
  const voiceGenderRef = useRef(voice);
  const languageRef = useRef(language);

  useEffect(() => {
    voiceGenderRef.current = voice;
  }, [voice]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Initialize speech synthesis
  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          console.log('[TTS] Loaded', availableVoices.length, 'voices');
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
    chunksRef.current = [];
    currentChunkRef.current = 0;
    abortedRef.current = false;
  }, []);

  /**
   * Select the best voice for the given language and requested gender
   * Capability-aware: respects actual platform voice availability
   */
  const selectVoice = useCallback((targetLanguage: string, requestedGender: 'male' | 'female'): SpeechSynthesisVoice | null => {
    const langPrefix = targetLanguage.split('-')[0].toLowerCase();
    const langKey = targetLanguage.toLowerCase();

    // Check cache first
    const cachedVoice = lockedVoicesRef.current.get(langKey);
    if (cachedVoice && voices.find(v => v.name === cachedVoice.name)) {
      return cachedVoice;
    }

    if (voices.length === 0) {
      return null;
    }

    // Get voice capability for this language
    const capability = getLanguageCapability(targetLanguage);

    // Determine the effective gender to use
    let effectiveGender = requestedGender;
    if (requestedGender === 'male' && !capability.supportsMale) {
      // Language doesn't support male - this is EXPECTED, not an error
      console.log(`[TTS] ${targetLanguage} uses standard voice profile (male not available for this language)`);
      effectiveGender = 'female';
    }

    // Find voices for this language
    let langVoices = voices.filter(v => v.lang.toLowerCase() === langKey);
    if (langVoices.length === 0) {
      langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
    }

    if (langVoices.length === 0) {
      console.log(`[TTS] No voices for ${targetLanguage}, using system default`);
      return voices[0] || null;
    }

    let selectedVoice: SpeechSynthesisVoice | null = null;

    // For English with male requested - try to find a male voice
    if (langPrefix === 'en' && effectiveGender === 'male') {
      selectedVoice = langVoices.find(v => matchesPatterns(v.name, MALE_VOICE_PATTERNS)) || null;
      if (selectedVoice) {
        console.log(`[TTS] ✓ Selected male voice:`, selectedVoice.name);
      }
    }

    // For female or when male not found - get best female/default voice
    if (!selectedVoice) {
      // Try to find explicitly female voice first
      selectedVoice = langVoices.find(v => matchesPatterns(v.name, FEMALE_VOICE_PATTERNS)) || null;

      // Otherwise just use the first available voice for the language
      if (!selectedVoice) {
        // Prefer Google or Microsoft voices as they're higher quality
        selectedVoice = langVoices.find(v =>
          v.name.toLowerCase().includes('google') ||
          v.name.toLowerCase().includes('microsoft')
        ) || langVoices[0];
      }

      console.log(`[TTS] ✓ Selected voice for ${targetLanguage}:`, selectedVoice?.name);
    }

    // Cache the selected voice
    if (selectedVoice) {
      lockedVoicesRef.current.set(langKey, selectedVoice);
    }

    return selectedVoice;
  }, [voices]);

  // Split text into speakable chunks
  const chunkText = useCallback((text: string): SpeechChunk[] => {
    if (text.length <= MAX_CHUNK_LENGTH) {
      return [{ text, index: 0 }];
    }

    const chunks: SpeechChunk[] = [];
    let remaining = text;
    let index = 0;

    while (remaining.length > 0) {
      let chunkEnd = MAX_CHUNK_LENGTH;

      if (remaining.length > MAX_CHUNK_LENGTH) {
        const sentenceEnd = remaining.lastIndexOf('.', MAX_CHUNK_LENGTH);
        const comma = remaining.lastIndexOf(',', MAX_CHUNK_LENGTH);
        const space = remaining.lastIndexOf(' ', MAX_CHUNK_LENGTH);

        if (sentenceEnd > MAX_CHUNK_LENGTH * 0.5) {
          chunkEnd = sentenceEnd + 1;
        } else if (comma > MAX_CHUNK_LENGTH * 0.5) {
          chunkEnd = comma + 1;
        } else if (space > MAX_CHUNK_LENGTH * 0.3) {
          chunkEnd = space + 1;
        }
      } else {
        chunkEnd = remaining.length;
      }

      const chunkTextContent = remaining.slice(0, chunkEnd).trim();
      if (chunkTextContent) {
        chunks.push({ text: chunkTextContent, index });
        index++;
      }
      remaining = remaining.slice(chunkEnd).trim();
    }

    return chunks;
  }, []);

  // Speak a single chunk
  const speakChunk = useCallback((chunk: SpeechChunk, totalChunks: number) => {
    return new Promise<void>((resolve, reject) => {
      if (abortedRef.current) {
        reject(new Error('aborted'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk.text);
      const selectedVoice = selectVoice(languageRef.current, voiceGenderRef.current);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = languageRef.current;
      }

      utterance.rate = rate;

      // Mobile pitch adjustment: if male voice is selected on mobile,
      // use lower pitch (0.85) to simulate a deeper/masculine voice
      // since native male voices are typically unavailable on mobile
      let effectivePitch = pitch;
      if (isMobile && voiceGenderRef.current === 'male') {
        effectivePitch = Math.min(pitch * 0.85, 0.85); // Cap at 0.85 for male-like sound
        console.log('[TTS] Mobile male voice: applying pitch adjustment', effectivePitch);
      }

      utterance.pitch = effectivePitch;
      utterance.volume = 1;

      utterance.onend = () => {
        setProgress(((chunk.index + 1) / totalChunks) * 100);
        resolve();
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
          reject(new Error('aborted'));
        } else {
          console.error('[TTS] Chunk error:', e.error);
          reject(new Error(e.error));
        }
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);

      // Chrome pause workaround
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
      }
      resumeIntervalRef.current = window.setInterval(() => {
        if (speechSynthesis.paused) {
          speechSynthesis.resume();
        }
      }, 200);
    });
  }, [selectVoice, rate, pitch]);

  // Main speak function
  const speak = useCallback(async (text: string) => {
    if (!isSupported || !text?.trim()) {
      return;
    }

    speechSynthesis.cancel();
    cleanup();

    speakingTextRef.current = text;
    abortedRef.current = false;
    retryCountRef.current = 0;
    setProgress(0);

    await new Promise(resolve => setTimeout(resolve, 50));

    const chunks = chunkText(text);
    chunksRef.current = chunks;
    currentChunkRef.current = 0;

    setIsSpeaking(true);
    onStart?.();

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (abortedRef.current) break;

        currentChunkRef.current = i;

        try {
          await speakChunk(chunks[i], chunks.length);
        } catch (error) {
          if ((error as Error).message === 'aborted') {
            break;
          }

          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            i--;
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          throw error;
        }

        if (i < chunks.length - 1 && !abortedRef.current) {
          await new Promise(resolve => setTimeout(resolve, CHUNK_PAUSE_MS));
        }
      }
    } catch (error) {
      console.error('[TTS] Speech synthesis failed:', error);
      onError?.((error as Error).message);
    } finally {
      cleanup();
      setIsSpeaking(false);
      setProgress(100);
      speakingTextRef.current = '';

      if (!abortedRef.current) {
        onEnd?.();
      }
    }
  }, [isSupported, chunkText, speakChunk, cleanup, onStart, onEnd, onError]);

  // Stop speech
  const stop = useCallback(() => {
    abortedRef.current = true;
    speechSynthesis.cancel();
    cleanup();
    setIsSpeaking(false);
    setProgress(0);
    speakingTextRef.current = '';
  }, [cleanup]);

  // Reset voice locks
  const resetVoiceLock = useCallback(() => {
    lockedVoicesRef.current.clear();
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    voices,
    progress,
    resetVoiceLock,
    // Expose capability check for UI
    languageSupportsGender,
  };
}
