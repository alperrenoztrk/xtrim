import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Check,
  Gauge,
  Rabbit,
  Turtle,
  Timer,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface SpeedPreset {
  label: string;
  value: number;
  icon: typeof Gauge;
  description: string;
}

const speedPresets: SpeedPreset[] = [
  { label: '0.25x', value: 0.25, icon: Turtle, description: 'Çok yavaş' },
  { label: '0.5x', value: 0.5, icon: Turtle, description: 'Yavaş' },
  { label: '0.75x', value: 0.75, icon: Timer, description: 'Biraz yavaş' },
  { label: '1x', value: 1, icon: Play, description: 'Normal' },
  { label: '1.25x', value: 1.25, icon: Timer, description: 'Biraz hızlı' },
  { label: '1.5x', value: 1.5, icon: Rabbit, description: 'Hızlı' },
  { label: '2x', value: 2, icon: Rabbit, description: 'Çok hızlı' },
];

interface VideoSpeedPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  currentSpeed: number;
  onClose: () => void;
  onApplySpeed: (speed: number) => void;
}

export const VideoSpeedPanel = ({
  videoRef,
  currentSpeed,
  onClose,
  onApplySpeed
}: VideoSpeedPanelProps) => {
  const [speed, setSpeed] = useState(currentSpeed);
  const [customMode, setCustomMode] = useState(false);

  // Preview speed change on video
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }
  }, [speed, videoRef]);

  // Reset speed when panel closes without applying
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = currentSpeed;
      }
    };
  }, [currentSpeed, videoRef]);

  const handlePresetClick = (presetValue: number) => {
    setSpeed(presetValue);
    setCustomMode(false);
  };

  const handleSliderChange = (value: number[]) => {
    setSpeed(value[0]);
    setCustomMode(true);
  };

  const handleApply = () => {
    onApplySpeed(speed);
    toast.success(`Video hızı ${speed}x olarak ayarlandı`);
    onClose();
  };

  const handleReset = () => {
    setSpeed(1);
    setCustomMode(false);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = 1;
    }
  };

  const getSpeedCategory = (speedValue: number): { label: string; color: string } => {
    if (speedValue < 0.75) return { label: 'Slow Motion', color: 'text-blue-500' };
    if (speedValue <= 1.25) return { label: 'Normal', color: 'text-green-500' };
    return { label: 'Fast Forward', color: 'text-orange-500' };
  };

  const category = getSpeedCategory(speed);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="absolute bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-10 max-h-[70vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="font-medium">Hız Kontrolü</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Current Speed Display */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 mb-3">
            <span className="text-3xl font-bold text-primary">{speed.toFixed(2)}x</span>
          </div>
          <p className={`text-sm font-medium ${category.color}`}>{category.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {speed < 1 
              ? `Video ${(1/speed).toFixed(1)}x daha yavaş oynatılacak` 
              : speed > 1 
                ? `Video ${speed.toFixed(1)}x daha hızlı oynatılacak`
                : 'Normal hızda oynatılacak'}
          </p>
        </div>

        {/* Speed Presets */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium">Hızlı Seçim</p>
          <div className="grid grid-cols-4 gap-2">
            {speedPresets.map((preset) => (
              <Button
                key={preset.value}
                variant={speed === preset.value && !customMode ? "secondary" : "ghost"}
                className={`flex-col gap-1 h-auto py-3 relative ${
                  speed === preset.value && !customMode ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handlePresetClick(preset.value)}
              >
                <preset.icon className={`w-4 h-4 ${
                  preset.value < 1 ? 'text-blue-500' : 
                  preset.value > 1 ? 'text-orange-500' : 
                  'text-green-500'
                }`} />
                <span className="text-xs font-medium">{preset.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Speed Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Özel Hız</p>
            <span className="text-xs text-muted-foreground">
              {speed.toFixed(2)}x
            </span>
          </div>
          
          <div className="space-y-2">
            <Slider
              value={[speed]}
              min={0.1}
              max={3}
              step={0.05}
              onValueChange={handleSliderChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1x</span>
              <span>1x</span>
              <span>3x</span>
            </div>
          </div>

          {/* Speed indicator bar */}
          <div className="flex gap-1 h-2">
            <div 
              className="bg-blue-500/30 rounded-l-full"
              style={{ width: '33%' }}
            />
            <div 
              className="bg-green-500/30"
              style={{ width: '17%' }}
            />
            <div 
              className="bg-orange-500/30 rounded-r-full"
              style={{ width: '50%' }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Slow Motion</span>
            <span>Normal</span>
            <span>Fast Forward</span>
          </div>
        </div>

        {/* Duration Info */}
        <div className="bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Süre Etkisi</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {speed < 1 
              ? `Klip süresi ${(1/speed).toFixed(1)}x uzayacak. Örn: 10s → ${(10/speed).toFixed(1)}s` 
              : speed > 1 
                ? `Klip süresi ${speed.toFixed(1)}x kısalacak. Örn: 10s → ${(10/speed).toFixed(1)}s`
                : 'Klip süresi değişmeyecek.'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-4 border-t border-border mt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleReset}
          disabled={speed === 1}
        >
          Sıfırla
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onClose}
        >
          İptal
        </Button>
        <Button 
          variant="gradient" 
          className="flex-1 gap-2"
          onClick={handleApply}
        >
          <Check className="w-4 h-4" />
          Uygula
        </Button>
      </div>
    </motion.div>
  );
};
