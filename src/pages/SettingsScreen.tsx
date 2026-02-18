import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Palette,
  Volume2,
  Shield,
  Info,
  ChevronRight,
  Check,
  Sun,
  Moon,
  Monitor,
  Download,
  Film,
  Gauge,
  HardDrive,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { applyTheme } from '@/lib/theme';
import type { AppSettings, ExportSettings } from '@/types';

const themes = [
  { value: 'auto', label: 'System', icon: Monitor, description: 'Follow device settings' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Reduce eye strain' },
  { value: 'light', label: 'Light', icon: Sun, description: 'For bright environments' },
];

const resolutions = [
  { value: '720p', label: '720p HD', description: 'Fast export' },
  { value: '1080p', label: '1080p Full HD', description: 'Recommended' },
  { value: '4k', label: '4K Ultra HD', description: 'Highest quality' },
];

const formats = [
  { value: 'mp4', label: 'MP4 (H.264)', description: 'Universal compatibility' },
  { value: 'webm', label: 'WebM (VP9)', description: 'Optimized for web' },
  { value: 'mov', label: 'MOV (ProRes)', description: 'Apple devices' },
];

const frameRates = [
  { value: 24, label: '24 FPS', description: 'Cinematic' },
  { value: 30, label: '30 FPS', description: 'Standard' },
  { value: 60, label: '60 FPS', description: 'Smooth motion' },
];

const qualities = [
  { value: 'speed', label: 'Fast', description: 'Smaller file size' },
  { value: 'balanced', label: 'Balanced', description: 'Recommended' },
  { value: 'quality', label: 'Quality', description: 'Maximum quality' },
];

interface ExtendedSettings extends AppSettings {
  defaultExport: ExportSettings;
}

const defaultSettings: ExtendedSettings = {
  language: 'auto',
  theme: 'dark',
  soundEffects: true,
  autoSave: true,
  exportQuality: 'balanced',
  defaultExport: {
    resolution: '1080p',
    fps: 30,
    bitrate: 'medium',
    format: 'mp4',
  },
};

const resolveCodexPrNumber = () => {
  const possiblePrValues = [
    import.meta.env.VITE_CODEX_PR_COUNT,
    import.meta.env.VITE_CODEX_PR_NUMBER,
    import.meta.env.VITE_PR_NUMBER,
  ];

  for (const value of possiblePrValues) {
    const parsed = Number.parseInt(value ?? '', 10);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return 70;
};

const SettingsScreen = () => {
  const navigate = useNavigate();
  const normalizedPrCount = resolveCodexPrNumber();
  const appVersion = `1.${Math.floor(normalizedPrCount / 10)}.${normalizedPrCount % 10}`;

  const [settings, setSettings] = useState<ExtendedSettings>(() => {
    const saved = localStorage.getItem('xtrim_settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const updateSetting = <K extends keyof ExtendedSettings>(key: K, value: ExtendedSettings[K]) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('xtrim_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const updateExportSetting = <K extends keyof ExportSettings>(key: K, value: ExportSettings[K]) => {
    setSettings((prev) => {
      const newExport = { ...prev.defaultExport, [key]: value };
      const newSettings = { ...prev, defaultExport: newExport };
      localStorage.setItem('xtrim_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const getCurrentTheme = () => {
    return themes.find(t => t.value === settings.theme) || themes[1];
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center gap-3 p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="p-4 space-y-6 pb-20">
        {/* Appearance */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Appearance</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            {/* Theme */}
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              onClick={() => setShowThemeSheet(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Palette className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span className="block">Theme</span>
                  <span className="text-xs text-muted-foreground">{getCurrentTheme().label}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            {/* Sound Effects */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block">Sound Effects</span>
                  <span className="text-xs text-muted-foreground">In-app sounds</span>
                </div>
              </div>
              <Switch checked={settings.soundEffects} onCheckedChange={(v) => updateSetting('soundEffects', v)} />
            </div>
          </div>
        </div>

        {/* Default Export Settings */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Default Export</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            {/* Resolution */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Film className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block font-medium">Resolution</span>
                  <span className="text-xs text-muted-foreground">Video quality</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {resolutions.map((res) => (
                  <button
                    key={res.value}
                    onClick={() => updateExportSetting('resolution', res.value as ExportSettings['resolution'])}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      settings.defaultExport.resolution === res.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{res.label}</span>
                    <span className="text-xs text-muted-foreground">{res.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block font-medium">Format</span>
                  <span className="text-xs text-muted-foreground">File type</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {formats.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => updateExportSetting('format', fmt.value as ExportSettings['format'])}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      settings.defaultExport.format === fmt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{fmt.value.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{fmt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block font-medium">Frame Rate</span>
                  <span className="text-xs text-muted-foreground">Frames per second</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {frameRates.map((fps) => (
                  <button
                    key={fps.value}
                    onClick={() => updateExportSetting('fps', fps.value as ExportSettings['fps'])}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      settings.defaultExport.fps === fps.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{fps.label}</span>
                    <span className="text-xs text-muted-foreground">{fps.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Preset */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block font-medium">Quality Mode</span>
                  <span className="text-xs text-muted-foreground">Speed vs quality balance</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {qualities.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => updateSetting('exportQuality', q.value as ExtendedSettings['exportQuality'])}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      settings.exportQuality === q.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="block text-sm font-medium">{q.label}</span>
                    <span className="text-xs text-muted-foreground">{q.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Save className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block">Auto Save</span>
                  <span className="text-xs text-muted-foreground">Automatically save projects</span>
                </div>
              </div>
              <Switch checked={settings.autoSave} onCheckedChange={(v) => updateSetting('autoSave', v)} />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">About</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              onClick={() => setShowPrivacySheet(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>Version</span>
              </div>
              <span className="text-sm text-muted-foreground">{appVersion}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Selection Sheet */}
      <AnimatePresence>
        {showThemeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowThemeSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-6 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-4">Theme Select</h3>
              <div className="space-y-2">
                {themes.map((theme) => {
                  const Icon = theme.icon;
                  const isSelected = settings.theme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      onClick={() => {
                        updateSetting('theme', theme.value as AppSettings['theme']);
                        setShowThemeSheet(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted/50 border border-transparent hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-primary/20' : 'bg-secondary'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="text-left">
                          <span className="block font-medium">{theme.label}</span>
                          <span className="text-xs text-muted-foreground">{theme.description}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Sheet */}
      <AnimatePresence>
        {showPrivacySheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowPrivacySheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-0 bg-card p-6 safe-area-bottom overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Privacy Policy</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPrivacySheet(false)}>
                  Close
                </Button>
              </div>

              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>
                  XTrim stores only the necessary settings data locally on your device to improve the app
                  experience. This data is not shared with third parties.
                </p>

                <div>
                  <h4 className="font-medium text-foreground mb-1">Information We Collect</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>App settings such as theme, auto-save, and export preferences</li>
                    <li>On-device media metadata related to projects you create</li>
                    <li>Anonymous technical logs in case of crashes or errors (if available)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">How We Use Data</h4>
                  <p>
                    Data is used to ensure proper app functionality, improve performance, and preserve the
                    features you choose.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">Data Security</h4>
                  <p>
                    Your data is stored on your device. For features that use external services, only the
                    content required to complete the requested operation is sent.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">Contact</h4>
                  <p>
                    If you have questions about privacy, you can contact our support team. This policy may
                    change along with app updates.
                  </p>
                </div>

                <p className="text-xs">Last updated: February 18, 2026</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsScreen;
