import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppSettings } from '@/types';
import { AIService } from '@/services/AIService';

export const SETTINGS_STORAGE_KEY = 'xtrim_settings';

const defaultSettings: AppSettings = {
  language: 'auto',
  theme: 'dark',
  soundEffects: true,
  aiBetaEnabled: false,
  autoSave: true,
  exportQuality: 'balanced',
};

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  setSettings: (next: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

const resolveTheme = (theme: AppSettings['theme']) => {
  if (theme !== 'auto') {
    return theme;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const resolveLanguage = (language: AppSettings['language']) => {
  if (language !== 'auto') {
    return language;
  }
  return navigator.language || 'en';
};

const loadStoredSettings = (): Partial<AppSettings> | null => {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored) as Partial<AppSettings>;
  } catch {
    return null;
  }
};

export const AppSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const stored = loadStoredSettings();
    if (stored) {
      setSettingsState((prev) => ({ ...prev, ...stored }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const theme = resolveTheme(settings.theme);
    const language = resolveLanguage(settings.language);

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
    document.documentElement.lang = language;
  }, [settings.language, settings.theme]);

  useEffect(() => {
    AIService.setEnabled(settings.aiBetaEnabled);
  }, [settings.aiBetaEnabled]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
    if (key === 'aiBetaEnabled') {
      AIService.setEnabled(Boolean(value));
    }
  }, []);

  const setSettings = useCallback((next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(next);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
      setSettings,
    }),
    [settings, updateSetting, setSettings]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};
