import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Check,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Sparkles,
  Loader2,
  Circle,
  Eclipse,
  Aperture,
  SunDim,
  CloudFog,
  CircleDot,
  Blend,
  Palette,
  Waves,
  Eye,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AnimatedFilterType } from '@/components/AnimatedFilterOverlay';
import { AIToolsService } from '@/services/AIToolsService';

// ---------- Types ----------
export interface ColorSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  exposure: number;
  highlights: number;
  shadows: number;
  tone: number;
  whitePoint: number;
  blackPoint: number;
  vignette: number;
  skinTone: number;
  blueTone: number;
}

const defaultSettings: ColorSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  tone: 0,
  whitePoint: 0,
  blackPoint: 0,
  vignette: 0,
  skinTone: 0,
  blueTone: 0,
};

// ---------- Filter Presets ----------
interface FilterPreset {
  id: string;
  name: string;
  css: string; // CSS filter string for thumbnail preview
  settings: Partial<ColorSettings>;
}

const filterPresets: FilterPreset[] = [
  { id: 'none', name: 'Yok', css: 'none', settings: {} },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.4) contrast(1.1) brightness(1.05)', settings: { saturation: 140, contrast: 110, brightness: 105 } },
  { id: 'playa', name: 'Playa', css: 'brightness(1.1) saturate(1.15) sepia(0.15)', settings: { brightness: 110, saturation: 115, temperature: 15 } },
  { id: 'honey', name: 'Honey', css: 'sepia(0.3) saturate(1.2) brightness(1.05)', settings: { temperature: 30, saturation: 120, brightness: 105 } },
  { id: 'isla', name: 'Isla', css: 'hue-rotate(-15deg) saturate(0.9) brightness(1.08)', settings: { temperature: -15, saturation: 90, brightness: 108 } },
  { id: 'desert', name: 'Desert', css: 'sepia(0.25) contrast(1.1) saturate(0.85)', settings: { temperature: 25, contrast: 110, saturation: 85 } },
  { id: 'clay', name: 'Clay', css: 'sepia(0.2) saturate(0.75) contrast(1.05)', settings: { temperature: 20, saturation: 75, contrast: 105 } },
  { id: 'palma', name: 'Palma', css: 'hue-rotate(10deg) saturate(1.3) brightness(1.02)', settings: { tint: 10, saturation: 130, brightness: 102 } },
  { id: 'blush', name: 'Blush', css: 'hue-rotate(-5deg) saturate(1.1) brightness(1.06) sepia(0.1)', settings: { tint: -5, saturation: 110, brightness: 106, temperature: 10 } },
  { id: 'bazaar', name: 'Bazaar', css: 'contrast(1.15) saturate(0.8) sepia(0.1)', settings: { contrast: 115, saturation: 80, temperature: 10 } },
  { id: 'ollie', name: 'Ollie', css: 'contrast(0.85) brightness(1.08) saturate(0.8) sepia(0.05)', settings: { contrast: 85, brightness: 108, saturation: 80 } },
  { id: 'onyx', name: 'Onyx', css: 'saturate(0) contrast(1.2)', settings: { saturation: 0, contrast: 120 } },
  { id: 'eiffel', name: 'Eiffel', css: 'contrast(1.2) saturate(0.85) hue-rotate(-10deg)', settings: { contrast: 120, saturation: 85, temperature: -10 } },
  { id: 'vogue', name: 'Vogue', css: 'contrast(1.25) saturate(0.7) brightness(0.95)', settings: { contrast: 125, saturation: 70, brightness: 95 } },
];

// ---------- Adjust Controls ----------
interface AdjustControl {
  key: keyof ColorSettings;
  label: string;
  icon: React.ElementType;
  min: number;
  max: number;
  defaultVal: number;
  isPercent: boolean;
}

const adjustControls: AdjustControl[] = [
  { key: 'brightness', label: 'Parlaklık', icon: Sun, min: 0, max: 200, defaultVal: 100, isPercent: true },
  { key: 'contrast', label: 'Kontrast', icon: Contrast, min: 0, max: 200, defaultVal: 100, isPercent: true },
  { key: 'tone', label: 'Ton', icon: Palette, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'whitePoint', label: 'Beyaz nokta', icon: Circle, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'highlights', label: 'Parlak alanlar', icon: SunDim, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'shadows', label: 'Gölgeler', icon: CloudFog, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'blackPoint', label: 'Siyah nokta', icon: CircleDot, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'vignette', label: 'Vinyet', icon: Aperture, min: 0, max: 100, defaultVal: 0, isPercent: false },
  { key: 'saturation', label: 'Doygunluk', icon: Droplets, min: 0, max: 200, defaultVal: 100, isPercent: true },
  { key: 'temperature', label: 'Sıcaklık', icon: Thermometer, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'tint', label: 'Tonlama', icon: Blend, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'skinTone', label: 'Cilt tonu', icon: Eye, min: -50, max: 50, defaultVal: 0, isPercent: false },
  { key: 'blueTone', label: 'Mavi ton', icon: Waves, min: -50, max: 50, defaultVal: 0, isPercent: false },
];

// ---------- Props ----------
interface VideoColorPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
  currentAnimatedFilter?: AnimatedFilterType;
  currentAnimatedFilterAssetUrl?: string;
  currentAnimatedFilterPrompt?: string;
  onApplySettings?: (settings: ColorSettings, filterId: string) => void;
  onApplyAnimatedFilter?: (filter: AnimatedFilterType, assetUrl?: string, prompt?: string) => void;
}

// ---------- Component ----------
export const VideoColorPanel = ({
  videoRef,
  onClose,
  currentAnimatedFilter = 'none',
  currentAnimatedFilterAssetUrl,
  currentAnimatedFilterPrompt,
  onApplySettings,
  onApplyAnimatedFilter,
}: VideoColorPanelProps) => {
  const [settings, setSettings] = useState<ColorSettings>(defaultSettings);
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'animated'>('filters');
  const [selectedAdjust, setSelectedAdjust] = useState<keyof ColorSettings>('brightness');
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // Animated filter state
  const [animatedFilter, setAnimatedFilter] = useState<AnimatedFilterType>(currentAnimatedFilter);
  const [animatedPrompt, setAnimatedPrompt] = useState(currentAnimatedFilterPrompt ?? '');
  const [aiAnimatedAssetUrl, setAiAnimatedAssetUrl] = useState<string | undefined>(currentAnimatedFilterAssetUrl);
  const [isGeneratingAnimatedFilter, setIsGeneratingAnimatedFilter] = useState(false);

  // Capture thumbnail from video on mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const capture = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnail(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch { /* cross-origin or not ready */ }
    };
    if (video.readyState >= 2) capture();
    else video.addEventListener('loadeddata', capture, { once: true });
  }, [videoRef]);

  // Apply CSS filter to video for live preview
  const applyFiltersToVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const filters: string[] = [];
    if (settings.brightness !== 100) filters.push(`brightness(${settings.brightness / 100})`);
    if (settings.contrast !== 100) filters.push(`contrast(${settings.contrast / 100})`);
    if (settings.saturation !== 100) filters.push(`saturate(${settings.saturation / 100})`);
    if (settings.temperature !== 0) {
      if (settings.temperature > 0) filters.push(`sepia(${settings.temperature / 100})`);
      else filters.push(`hue-rotate(${settings.temperature}deg)`);
    }
    video.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
  }, [settings, videoRef]);

  useEffect(() => { applyFiltersToVideo(); }, [applyFiltersToVideo]);

  useEffect(() => {
    setAnimatedFilter(currentAnimatedFilter);
    setAiAnimatedAssetUrl(currentAnimatedFilterAssetUrl);
    setAnimatedPrompt(currentAnimatedFilterPrompt ?? '');
  }, [currentAnimatedFilter, currentAnimatedFilterAssetUrl, currentAnimatedFilterPrompt]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) video.style.filter = 'none';
    };
  }, [videoRef]);

  const handleSettingChange = (key: keyof ColorSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setActiveFilter('custom');
  };

  const handleFilterSelect = (preset: FilterPreset) => {
    const newSettings = { ...defaultSettings, ...preset.settings };
    setSettings(newSettings);
    setActiveFilter(preset.id);
  };

  const handleApply = () => {
    onApplySettings?.(settings, activeFilter);
    onApplyAnimatedFilter?.(animatedFilter, aiAnimatedAssetUrl, animatedPrompt);
    toast.success('Renk ayarları uygulandı');
    onClose();
  };

  const handleGenerateAIAnimatedFilter = async () => {
    if (!animatedPrompt.trim()) { toast.error('Lütfen bir prompt girin'); return; }
    setIsGeneratingAnimatedFilter(true);
    try {
      const result = await AIToolsService.generateImage('poster', `${animatedPrompt}. Generate a seamless cinematic texture for motion overlay.`, undefined, { style: 'animated overlay texture' });
      const output = result.imageUrl || result.outputUrl;
      if (!result.success || !output) throw new Error(result.error || 'AI animasyon oluşturulamadı');
      setAnimatedFilter('ai');
      setAiAnimatedAssetUrl(output);
      toast.success('AI animasyon filtresi oluşturuldu');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI animasyon filtresi başarısız');
    } finally { setIsGeneratingAnimatedFilter(false); }
  };

  const currentAdjust = adjustControls.find(c => c.key === selectedAdjust)!;

  const formatValue = (ctrl: AdjustControl, val: number) => {
    if (ctrl.isPercent) return `${val}%`;
    return val > 0 ? `+${val}` : `${val}`;
  };

  const tabTitle = activeTab === 'filters' ? 'Filtreler' : activeTab === 'adjust' ? 'Ayarla' : 'Animasyon';

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 bg-background z-10 flex flex-col"
      style={{ maxHeight: '55vh' }}
    >
      {/* Tab switcher - small pills at top */}
      <div className="flex justify-center gap-1 pt-3 pb-2">
        {(['filters', 'adjust', 'animated'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-foreground/15 text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {tab === 'filters' ? 'Filtreler' : tab === 'adjust' ? 'Ayarla' : 'Animasyon'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-2">
        {/* ===== FILTERS TAB ===== */}
        {activeTab === 'filters' && (
          <div className="flex items-end gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterPresets.map((preset, idx) => (
              <div key={preset.id} className="flex-shrink-0 flex items-center">
                <button
                  className="flex flex-col items-center gap-1"
                  onClick={() => handleFilterSelect(preset)}
                >
                  <div
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeFilter === preset.id ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        style={{ filter: preset.css }}
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" style={{ filter: preset.css }} />
                    )}
                  </div>
                  <span className={`text-[10px] leading-tight ${
                    activeFilter === preset.id ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}>
                    {preset.name}
                  </span>
                </button>
                {/* Vertical divider after "Yok" */}
                {idx === 0 && (
                  <div className="w-px h-12 bg-border mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== ADJUST TAB ===== */}
        {activeTab === 'adjust' && (
          <div className="flex flex-col gap-3">
            {/* Shared slider */}
            <div className="px-4 pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{currentAdjust.label}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatValue(currentAdjust, settings[selectedAdjust])}
                </span>
              </div>
              <Slider
                value={[settings[selectedAdjust]]}
                min={currentAdjust.min}
                max={currentAdjust.max}
                step={1}
                onValueChange={([v]) => handleSettingChange(selectedAdjust, v)}
              />
            </div>

            {/* Icon carousel */}
            <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide px-1">
              {adjustControls.map(ctrl => {
                const Icon = ctrl.icon;
                const isActive = selectedAdjust === ctrl.key;
                const isModified = settings[ctrl.key] !== ctrl.defaultVal;
                return (
                  <button
                    key={ctrl.key}
                    className="flex-shrink-0 flex flex-col items-center gap-1"
                    onClick={() => setSelectedAdjust(ctrl.key)}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-primary/20 ring-1 ring-primary'
                        : 'bg-secondary'
                    }`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[9px] leading-tight max-w-[48px] text-center ${
                      isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}>
                      {ctrl.label}
                    </span>
                    {isModified && (
                      <div className="w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ANIMATED TAB ===== */}
        {activeTab === 'animated' && (
          <div className="space-y-2 overflow-y-auto max-h-[30vh] pb-2">
            {([
              { id: 'none' as const, name: 'Yok', desc: 'Animasyon kapalı' },
              { id: 'snow' as const, name: 'Kar', desc: 'Kar yağışı efekti' },
              { id: 'rain' as const, name: 'Yağmur', desc: 'Yağmur efekti' },
              { id: 'sparkles' as const, name: 'Parıltı', desc: 'Parıldayan parçacıklar' },
              { id: 'ai' as const, name: 'AI', desc: 'AI animasyon dokusu' },
            ]).map(item => (
              <button
                key={item.id}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                  animatedFilter === item.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'
                }`}
                onClick={() => setAnimatedFilter(item.id)}
              >
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </button>
            ))}
            {animatedFilter === 'ai' && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                <Input value={animatedPrompt} onChange={e => setAnimatedPrompt(e.target.value)} placeholder="AI efekti tanımlayın..." />
                <Button className="w-full" onClick={handleGenerateAIAnimatedFilter} disabled={isGeneratingAnimatedFilter}>
                  {isGeneratingAnimatedFilter ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI Filtre Oluştur
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Photos style footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">{tabTitle}</span>
        <button
          onClick={handleApply}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <Check className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </motion.div>
  );
};
