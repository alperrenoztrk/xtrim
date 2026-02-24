import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Check,
  Palette,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface ColorSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  exposure: number;
  highlights: number;
  shadows: number;
}

interface FilterPreset {
  id: string;
  name: string;
  settings: Partial<ColorSettings>;
  gradient: string;
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
};

const filterPresets: FilterPreset[] = [
  { 
    id: 'normal', 
    name: 'Normal', 
    settings: {},
    gradient: 'bg-gradient-to-br from-gray-400 to-gray-600'
  },
  { 
    id: 'vivid', 
    name: 'Vivid', 
    settings: { saturation: 140, contrast: 110, brightness: 105 },
    gradient: 'bg-gradient-to-br from-pink-500 to-orange-500'
  },
  { 
    id: 'warm', 
    name: 'Warm', 
    settings: { temperature: 30, saturation: 110 },
    gradient: 'bg-gradient-to-br from-orange-400 to-red-500'
  },
  { 
    id: 'cool', 
    name: 'Cool', 
    settings: { temperature: -30, saturation: 90 },
    gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500'
  },
  { 
    id: 'vintage', 
    name: 'Vintage', 
    settings: { saturation: 70, contrast: 90, brightness: 95, temperature: 15 },
    gradient: 'bg-gradient-to-br from-amber-600 to-yellow-800'
  },
  { 
    id: 'bw', 
    name: 'S/B', 
    settings: { saturation: 0 },
    gradient: 'bg-gradient-to-br from-gray-800 to-gray-300'
  },
  { 
    id: 'dramatic', 
    name: 'Dramatik', 
    settings: { contrast: 140, saturation: 80, shadows: -20 },
    gradient: 'bg-gradient-to-br from-gray-900 to-gray-600'
  },
  { 
    id: 'cinematic', 
    name: 'Cinematic', 
    settings: { contrast: 120, saturation: 85, temperature: -10, tint: 5 },
    gradient: 'bg-gradient-to-br from-teal-600 to-orange-400'
  },
  { 
    id: 'fade', 
    name: 'Soluk', 
    settings: { contrast: 80, brightness: 110, saturation: 80, shadows: 30 },
    gradient: 'bg-gradient-to-br from-gray-300 to-gray-500'
  },
  { 
    id: 'moody', 
    name: 'Duygusal', 
    settings: { saturation: 70, contrast: 110, temperature: -15, shadows: -10 },
    gradient: 'bg-gradient-to-br from-indigo-600 to-purple-800'
  },
];

interface VideoColorPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
  onApplySettings?: (settings: ColorSettings, filterId: string) => void;
}

export const VideoColorPanel = ({
  videoRef,
  onClose,
  onApplySettings
}: VideoColorPanelProps) => {
  const [settings, setSettings] = useState<ColorSettings>(defaultSettings);
  const [activeFilter, setActiveFilter] = useState<string>('normal');
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust'>('filters');

  // Apply CSS filter to video for live preview
  const applyFiltersToVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const filters: string[] = [];
    
    // Brightness (0-200, 100 = normal)
    if (settings.brightness !== 100) {
      filters.push(`brightness(${settings.brightness / 100})`);
    }
    
    // Contrast (0-200, 100 = normal)
    if (settings.contrast !== 100) {
      filters.push(`contrast(${settings.contrast / 100})`);
    }
    
    // Saturation (0-200, 100 = normal)
    if (settings.saturation !== 100) {
      filters.push(`saturate(${settings.saturation / 100})`);
    }
    
    // Temperature (simulate with sepia + hue-rotate)
    if (settings.temperature !== 0) {
      if (settings.temperature > 0) {
        filters.push(`sepia(${settings.temperature / 100})`);
      } else {
        filters.push(`hue-rotate(${settings.temperature}deg)`);
      }
    }

    video.style.filter = filters.length > 0 ? filters.join(' ') : 'none';
  }, [settings, videoRef]);

  useEffect(() => {
    applyFiltersToVideo();
  }, [applyFiltersToVideo]);

  // Reset filters when panel closes
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.style.filter = 'none';
      }
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

  const handleReset = () => {
    setSettings(defaultSettings);
    setActiveFilter('normal');
  };

  const handleApply = () => {
    if (onApplySettings) {
      onApplySettings(settings, activeFilter);
    }
    toast.success('Color settings applied');
    onClose();
  };

  const adjustmentControls = [
    { key: 'brightness' as const, label: 'Brightness', icon: Sun, min: 0, max: 200, default: 100 },
    { key: 'contrast' as const, label: 'Kontrast', icon: Contrast, min: 0, max: 200, default: 100 },
    { key: 'saturation' as const, label: 'Saturation', icon: Droplets, min: 0, max: 200, default: 100 },
    { key: 'temperature' as const, label: 'Temperature', icon: Thermometer, min: -50, max: 50, default: 0 },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ y: 0 }}
      transition={{ duration: 0 }}
      exit={{ y: 0 }}
      className="absolute bottom-20 left-0 right-0 bg-white border-t border-zinc-200 dark:border-zinc-800 dark:bg-black p-4 z-10 max-h-[70vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Filters & Colors</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === 'filters' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setActiveTab('filters')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button
          variant={activeTab === 'adjust' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setActiveTab('adjust')}
        >
          <Sun className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="grid grid-cols-5 gap-2">
            {filterPresets.map((preset) => (
              <button
                key={preset.id}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  activeFilter === preset.id 
                    ? 'ring-2 ring-primary bg-primary/10' 
                    : 'hover:bg-secondary'
                }`}
                onClick={() => handleFilterSelect(preset)}
              >
                <div className={`w-12 h-12 rounded-lg ${preset.gradient} shadow-sm`} />
                <span className="text-[10px] text-center leading-tight">{preset.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Adjust Tab */}
        {activeTab === 'adjust' && (
          <div className="space-y-5">
            {adjustmentControls.map((control) => (
              <div key={control.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <control.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{control.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                    {control.default === 100 
                      ? `${settings[control.key]}%`
                      : settings[control.key] > 0 
                        ? `+${settings[control.key]}`
                        : settings[control.key]
                    }
                  </span>
                </div>
                <Slider
                  value={[settings[control.key]]}
                  min={control.min}
                  max={control.max}
                  step={1}
                  onValueChange={([v]) => handleSettingChange(control.key, v)}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{control.min}{control.default === 100 ? '%' : ''}</span>
                  <span>{control.default}{control.default === 100 ? '%' : ''}</span>
                  <span>{control.max}{control.default === 100 ? '%' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Filter Info */}
      {activeFilter !== 'normal' && activeFilter !== 'custom' && (
        <div className="mt-4 p-2 bg-primary/5 rounded-lg">
          <p className="text-xs text-center text-muted-foreground">
            <span className="font-medium text-primary">
              {filterPresets.find(f => f.id === activeFilter)?.name}
            </span>
            {' '}filtresi aktif
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 pt-4 border-t border-border mt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleReset}
          disabled={activeFilter === 'normal' && JSON.stringify(settings) === JSON.stringify(defaultSettings)}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button 
          variant="gradient" 
          className="flex-1 gap-2"
          onClick={handleApply}
        >
          <Check className="w-4 h-4" />
          Apply
        </Button>
      </div>
    </motion.div>
  );
};
