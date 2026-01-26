import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechSynthesisOptions {
  voice?: 'male' | 'female';
  language?: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const { voice = 'female', language = 'en-US', rate = 1, pitch = 1, onStart, onEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speakingTextRef = useRef<string>('');
  const resumeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.lang})`).join(', '));
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
      }
    };
  }, []);

  const getPreferredVoice = useCallback(() => {
    if (voices.length === 0) return null;

    // Get exact language and language prefix
    const langPrefix = language.split('-')[0].toLowerCase();
    const exactLang = language.toLowerCase();
    
    // Filter voices by exact language match first, then by prefix
    let langVoices = voices.filter(v => 
      v.lang.toLowerCase() === exactLang
    );
    
    // If no exact match, try prefix match
    if (langVoices.length === 0) {
      langVoices = voices.filter(v => 
        v.lang.toLowerCase().startsWith(langPrefix)
      );
    }

    console.log(`Looking for voice in ${language}, found ${langVoices.length} voices:`, 
      langVoices.map(v => v.name).join(', '));

    if (langVoices.length === 0) {
      console.warn(`No voices found for ${language}, using first available voice`);
      return voices[0];
    }

    // Select by gender preference
    return selectVoiceByGender(langVoices, voice);
  }, [voices, voice, language]);

  // Helper function to select voice by gender
  const selectVoiceByGender = (voiceList: SpeechSynthesisVoice[], preferredGender: 'male' | 'female') => {
    // Common voice name patterns for gender identification
    const femalePatterns = [
      'female', 'woman', 'girl', 'samantha', 'victoria', 'karen', 'moira', 
      'fiona', 'tessa', 'veena', 'alice', 'amelie', 'anna', 'carmit', 
      'damayanti', 'ellen', 'flo', 'grandma', 'helena', 'joana', 'kanya',
      'kyoko', 'lana', 'laura', 'lekha', 'luciana', 'mariska', 'meijia',
      'melina', 'milena', 'monica', 'nora', 'paulina', 'sara', 'satu',
      'sinji', 'tingting', 'yelda', 'yuna', 'zosia', 'latha', 'riya',
      'priya', 'zuzana', 'microsoft zira', 'google', 'anjali', 'swara'
    ];
    
    const malePatterns = [
      'male', 'man', 'guy', 'alex', 'daniel', 'oliver', 'fred', 'thomas', 
      'gordon', 'lee', 'diego', 'jorge', 'juan', 'maged', 'nicolas',
      'xander', 'luca', 'oskar', 'rishi', 'aaron', 'albert', 'bruce',
      'carlos', 'eddy', 'jacques', 'grandpa', 'junior', 'reed', 'rocko',
      'sandy', 'shelley', 'microsoft david', 'raj', 'vijay', 'arun'
    ];

    const patterns = preferredGender === 'female' ? femalePatterns : malePatterns;
    
    // Try to find a matching voice
    const matchedVoice = voiceList.find(v => {
      const nameLower = v.name.toLowerCase();
      return patterns.some(pattern => nameLower.includes(pattern));
    });

    if (matchedVoice) {
      console.log(`Selected ${preferredGender} voice:`, matchedVoice.name);
      return matchedVoice;
    }

    // Default to first voice in the list
    console.log(`No ${preferredGender} voice pattern match, using:`, voiceList[0].name);
    return voiceList[0];
  };

  const speak = useCallback((text: string) => {
    if (!isSupported || !text || !text.trim()) {
      console.log('Cannot speak: not supported or empty text');
      return;
    }

    // Store the text we're speaking
    speakingTextRef.current = text;

    // Cancel any ongoing speech first
    speechSynthesis.cancel();
    
    // Clear any existing resume interval
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }

    // Small delay to ensure cancel is processed
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = getPreferredVoice();
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang; // Use the voice's native language
        console.log(`Speaking in ${selectedVoice.lang} with voice: ${selectedVoice.name}`);
      } else {
        utterance.lang = language;
        console.log(`No specific voice found, using lang: ${language}`);
      }
      
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      utterance.onstart = () => {
        console.log('TTS Started, text length:', text.length);
        setIsSpeaking(true);
        onStart?.();
      };
      
      utterance.onend = () => {
        console.log('TTS Ended normally');
        setIsSpeaking(false);
        speakingTextRef.current = '';
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        onEnd?.();
      };
      
      utterance.onerror = (e) => {
        // Ignore 'interrupted' and 'canceled' errors
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.error('Speech synthesis error:', e.error);
        }
        setIsSpeaking(false);
        speakingTextRef.current = '';
        if (resumeIntervalRef.current) {
          clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
        }
        onEnd?.();
      };

      utteranceRef.current = utterance;
      
      // Speak the entire text
      speechSynthesis.speak(utterance);
      
      // Chrome workaround: Resume if paused (Chrome has bug with long utterances)
      resumeIntervalRef.current = window.setInterval(() => {
        if (speechSynthesis.paused) {
          speechSynthesis.resume();
        }
        if (!speechSynthesis.speaking) {
          if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
          }
        }
      }, 200);
      
    }, 50);
  }, [isSupported, getPreferredVoice, language, rate, pitch, voice, onStart, onEnd]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      speakingTextRef.current = '';
      if (resumeIntervalRef.current) {
        clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
      }
    }
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    voices,
  };
}