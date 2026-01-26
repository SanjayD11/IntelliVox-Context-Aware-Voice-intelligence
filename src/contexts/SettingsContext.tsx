import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Confidence level affects response tone, not facts
export type ConfidenceLevel = 'normal' | 'confident' | 'careful';

interface UserSettings {
  voice_gender: 'male' | 'female';
  voice_language: string;
  auto_speak: boolean;
  hands_free_enabled: boolean;
  voice_speed: number; // 0.5 to 2.0
}

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  // Session-only confidence level (not persisted)
  confidenceLevel: ConfidenceLevel;
  setConfidenceLevel: (level: ConfidenceLevel) => void;
}

const defaultSettings: UserSettings = {
  voice_gender: 'female',
  voice_language: 'en-US',
  auto_speak: true,
  hands_free_enabled: false,
  voice_speed: 1.0,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  // Session-only confidence level - not persisted to database
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('normal');

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setSettings(defaultSettings);
      setLoading(false);
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        voice_gender: data.voice_gender as 'male' | 'female',
        voice_language: data.voice_language || 'en-US',
        auto_speak: data.auto_speak ?? true,
        hands_free_enabled: data.hands_free_enabled ?? false,
        voice_speed: data.voice_speed ?? 1.0,
      });
    }
    setLoading(false);
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }

    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      loading,
      updateSettings,
      confidenceLevel,
      setConfidenceLevel,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
