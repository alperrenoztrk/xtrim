import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Globe,
  Palette,
  Volume2,
  Sparkles,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppSettings, ExportSettings } from '@/types';

const languages = [
  { value: 'auto', label: 'Otomatik (Sistem)', flag: '🌐' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
];

const themes = [
  { value: 'auto', label: 'Sistem', icon: Monitor, description: 'Cihaz ayarlarını takip et' },
  { value: 'dark', label: 'Koyu', icon: Moon, description: 'Göz yorgunluğunu azalt' },
  { value: 'light', label: 'Açık', icon: Sun, description: 'Aydınlık ortamlar için' },
];

const resolutions = [
  { value: '720p', label: '720p HD', description: 'Hızlı dışa aktarım' },
  { value: '1080p', label: '1080p Full HD', description: 'Önerilen' },
  { value: '4k', label: '4K Ultra HD', description: 'En yüksek kalite' },
];

const formats = [
  { value: 'mp4', label: 'MP4 (H.264)', description: 'Evrensel uyumluluk' },
  { value: 'webm', label: 'WebM (VP9)', description: 'Web için optimize' },
  { value: 'mov', label: 'MOV (ProRes)', description: 'Apple cihazlar' },
];

const frameRates = [
  { value: 24, label: '24 FPS', description: 'Sinematik' },
  { value: 30, label: '30 FPS', description: 'Standart' },
  { value: 60, label: '60 FPS', description: 'Akıcı hareket' },
];

const qualities = [
  { value: 'speed', label: 'Hızlı', description: 'Düşük dosya boyutu' },
  { value: 'balanced', label: 'Dengeli', description: 'Önerilen' },
  { value: 'quality', label: 'Kalite', description: 'Maksimum kalite' },
];

interface ExtendedSettings extends AppSettings {
  defaultExport: ExportSettings;
}

const defaultSettings: ExtendedSettings = {
  language: 'auto',
  theme: 'dark',
  soundEffects: true,
  aiBetaEnabled: false,
  autoSave: true,
  exportQuality: 'balanced',
  defaultExport: {
    resolution: '1080p',
    fps: 30,
    bitrate: 'medium',
    format: 'mp4',
  },
};

const SettingsScreen = () => {
  const navigate = useNavigate();
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
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);

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

  const getCurrentLanguage = () => {
    return languages.find(l => l.value === settings.language) || languages[0];
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
        <h1 className="text-lg font-semibold">Ayarlar</h1>
      </header>

      <div className="p-4 space-y-6 pb-20">
        {/* AI Beta */}
        <motion.div 
          className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30" 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">YZ Özellikleri (Beta)</p>
                <p className="text-xs text-muted-foreground">Yapay zeka ile güçlendirilmiş özellikler</p>
              </div>
            </div>
            <Switch checked={settings.aiBetaEnabled} onCheckedChange={(v) => updateSetting('aiBetaEnabled', v)} />
          </div>
          {settings.aiBetaEnabled && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 text-xs text-muted-foreground bg-background/50 p-2 rounded-lg"
            >
              ⚠️ YZ özellikleri deneyseldir. Sonuçlar değişiklik gösterebilir.
            </motion.p>
          )}
        </motion.div>

        {/* Appearance */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Görünüm</h2>
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
                  <span className="block">Tema</span>
                  <span className="text-xs text-muted-foreground">{getCurrentTheme().label}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Language */}
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              onClick={() => setShowLanguageSheet(true)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <span className="block">Dil</span>
                  <span className="text-xs text-muted-foreground">
                    {getCurrentLanguage().flag} {getCurrentLanguage().label}
                  </span>
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
                  <span className="block">Ses Efektleri</span>
                  <span className="text-xs text-muted-foreground">Uygulama içi sesler</span>
                </div>
              </div>
              <Switch checked={settings.soundEffects} onCheckedChange={(v) => updateSetting('soundEffects', v)} />
            </div>
          </div>
        </div>

        {/* Default Export Settings */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Varsayılan Dışa Aktarma</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            {/* Resolution */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Film className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <span className="block font-medium">Çözünürlük</span>
                  <span className="text-xs text-muted-foreground">Video kalitesi</span>
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
                  <span className="text-xs text-muted-foreground">Dosya türü</span>
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
                  <span className="block font-medium">Kare Hızı</span>
                  <span className="text-xs text-muted-foreground">Saniyedeki kare sayısı</span>
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
                  <span className="block font-medium">Kalite Modu</span>
                  <span className="text-xs text-muted-foreground">Hız vs kalite dengesi</span>
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
                  <span className="block">Otomatik Kayıt</span>
                  <span className="text-xs text-muted-foreground">Projeleri otomatik kaydet</span>
                </div>
              </div>
              <Switch checked={settings.autoSave} onCheckedChange={(v) => updateSetting('autoSave', v)} />
            </div>
          </div>
        </div>

        {/* About */}
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Hakkında</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/privacy')}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>Gizlilik Politikası</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>Versiyon</span>
              </div>
              <span className="text-sm text-muted-foreground">1.0.0</span>
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
              <h3 className="text-lg font-semibold mb-4">Tema Seç</h3>
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

      {/* Language Selection Sheet */}
      <AnimatePresence>
        {showLanguageSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowLanguageSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-6 safe-area-bottom max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-4">Dil Seç</h3>
              <div className="space-y-2">
                {languages.map((lang) => {
                  const isSelected = settings.language === lang.value;
                  return (
                    <button
                      key={lang.value}
                      onClick={() => {
                        updateSetting('language', lang.value as AppSettings['language']);
                        setShowLanguageSheet(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted/50 border border-transparent hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="font-medium">{lang.label}</span>
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
    </div>
  );
};

export default SettingsScreen;
