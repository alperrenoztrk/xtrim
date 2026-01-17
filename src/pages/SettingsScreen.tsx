import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Globe,
  Palette,
  Volume2,
  Sparkles,
  Shield,
  Info,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AppSettings } from '@/types';
import { SETTINGS_STORAGE_KEY, useAppSettings } from '@/context/AppSettingsContext';

const SettingsScreen = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, setSettings } = useAppSettings();
  const languageLabel = settings.language === 'auto' ? 'Auto' : settings.language.toUpperCase();
  const themeLabel = settings.theme === 'auto' ? 'Auto' : settings.theme[0].toUpperCase() + settings.theme.slice(1);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      setSettings((prev) => ({ ...prev, ...parsed }));
    } catch {
      setSettings((prev) => prev);
    }
  }, [setSettings]);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* AI Beta */}
        <motion.div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">AI Features (Beta)</p>
                <p className="text-xs text-muted-foreground">Enable AI-powered enhancements</p>
              </div>
            </div>
            <Switch checked={settings.aiBetaEnabled} onCheckedChange={(v) => updateSetting('aiBetaEnabled', v)} />
          </div>
          {settings.aiBetaEnabled && (
            <p className="mt-3 text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
              ⚠️ AI features are experimental. Results may vary and require API configuration.
            </p>
          )}
        </motion.div>

        {/* General */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">General</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span>Language</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">{languageLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <span>Theme</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">{themeLabel}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-muted-foreground" />
                <span>Sound Effects</span>
              </div>
              <Switch checked={settings.soundEffects} onCheckedChange={(v) => updateSetting('soundEffects', v)} />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">About</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span>Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground" />
                <span>Version</span>
              </div>
              <span className="text-sm text-muted-foreground">1.0.0</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
