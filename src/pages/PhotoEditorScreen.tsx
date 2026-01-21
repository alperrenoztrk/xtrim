import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Palette,
  Sparkles,
  Download,
  Undo2,
  Redo2,
  Check,
  X,
  ImagePlus,
  Eraser,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import BackgroundRemover from '@/components/BackgroundRemover';

type EditorTab = 'adjust' | 'crop' | 'filters' | 'background';

interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  adjustments: Partial<ImageAdjustments>;
  preview: string;
}

const filterPresets: FilterPreset[] = [
  { id: 'none', name: 'Original', adjustments: {}, preview: 'none' },
  { id: 'vivid', name: 'Vivid', adjustments: { saturation: 30, contrast: 15 }, preview: 'saturate(1.3) contrast(1.15)' },
  { id: 'warm', name: 'Warm', adjustments: { temperature: 25, saturation: 10 }, preview: 'sepia(0.2) saturate(1.1)' },
  { id: 'cool', name: 'Cool', adjustments: { temperature: -25, brightness: 5 }, preview: 'hue-rotate(15deg) brightness(1.05)' },
  { id: 'dramatic', name: 'Dramatic', adjustments: { contrast: 40, saturation: -20 }, preview: 'contrast(1.4) saturate(0.8)' },
  { id: 'fade', name: 'Fade', adjustments: { contrast: -20, brightness: 10 }, preview: 'contrast(0.8) brightness(1.1)' },
  { id: 'noir', name: 'Noir', adjustments: { saturation: -100, contrast: 30 }, preview: 'grayscale(1) contrast(1.3)' },
  { id: 'vintage', name: 'Vintage', adjustments: { saturation: -30, temperature: 20, contrast: -10 }, preview: 'sepia(0.4) contrast(0.9)' },
  { id: 'chrome', name: 'Chrome', adjustments: { saturation: 20, contrast: 25, brightness: 5 }, preview: 'saturate(1.2) contrast(1.25) brightness(1.05)' },
  { id: 'mono', name: 'Mono', adjustments: { saturation: -100 }, preview: 'grayscale(1)' },
];

const cropRatios = [
  { id: 'free', name: 'Free', ratio: null },
  { id: '1:1', name: '1:1', ratio: 1 },
  { id: '4:3', name: '4:3', ratio: 4 / 3 },
  { id: '3:4', name: '3:4', ratio: 3 / 4 },
  { id: '16:9', name: '16:9', ratio: 16 / 9 },
  { id: '9:16', name: '9:16', ratio: 9 / 16 },
];

const defaultAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
};

const PhotoEditorScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('adjust');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [selectedCropRatio, setSelectedCropRatio] = useState<string>('free');
  const [undoStack, setUndoStack] = useState<ImageAdjustments[]>([]);
  const [redoStack, setRedoStack] = useState<ImageAdjustments[]>([]);
  const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);

  const saveState = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), adjustments]);
    setRedoStack([]);
  }, [adjustments]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, adjustments]);
    setAdjustments(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, adjustments]);
    setAdjustments(next);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleAdjustmentChange = (key: keyof ImageAdjustments, value: number | boolean) => {
    saveState();
    setAdjustments((prev) => ({ ...prev, [key]: value }));
    setSelectedFilter('none');
  };

  const handleRotate = (direction: 'cw' | 'ccw') => {
    saveState();
    setAdjustments((prev) => ({
      ...prev,
      rotation: prev.rotation + (direction === 'cw' ? 90 : -90),
    }));
  };

  const handleFlip = (axis: 'h' | 'v') => {
    saveState();
    setAdjustments((prev) => ({
      ...prev,
      [axis === 'h' ? 'flipH' : 'flipV']: !prev[axis === 'h' ? 'flipH' : 'flipV'],
    }));
  };

  const handleApplyFilter = (filter: FilterPreset) => {
    saveState();
    setSelectedFilter(filter.id);
    if (filter.id === 'none') {
      setAdjustments(defaultAdjustments);
    } else {
      setAdjustments((prev) => ({
        ...prev,
        ...filter.adjustments,
      }));
    }
  };

  const handleReset = () => {
    saveState();
    setAdjustments(defaultAdjustments);
    setSelectedFilter('none');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setAdjustments(defaultAdjustments);
      setSelectedFilter('none');
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const getImageStyle = (): React.CSSProperties => {
    const filters = [
      `brightness(${1 + adjustments.brightness / 100})`,
      `contrast(${1 + adjustments.contrast / 100})`,
      `saturate(${1 + adjustments.saturation / 100})`,
      adjustments.temperature > 0
        ? `sepia(${adjustments.temperature / 100})`
        : `hue-rotate(${adjustments.temperature}deg)`,
    ].join(' ');

    return {
      filter: filters,
      transform: `
        rotate(${adjustments.rotation}deg)
        scaleX(${adjustments.flipH ? -1 : 1})
        scaleY(${adjustments.flipV ? -1 : 1})
      `,
      transition: 'filter 0.2s, transform 0.3s',
    };
  };

  const adjustmentControls = [
    { key: 'brightness', label: 'Brightness', icon: Sun, min: -100, max: 100 },
    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -100, max: 100 },
    { key: 'saturation', label: 'Saturation', icon: Droplets, min: -100, max: 100 },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100 },
  ];

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">Photo Editor</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          {imageUrl && (
            <Button variant="gradient" size="sm">
              <Download className="w-4 h-4" />
              Save
            </Button>
          )}
        </div>
      </header>

      {/* Image preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-4">
        {imageUrl ? (
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt="Editing"
            className="max-h-full max-w-full object-contain rounded-lg"
            style={getImageStyle()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ImagePlus className="w-10 h-10 text-muted-foreground" />
            </motion.div>
            <div>
              <p className="text-foreground font-medium">Select a photo to edit</p>
              <p className="text-sm text-muted-foreground mt-1">
                Choose from your device
              </p>
            </div>
            <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="w-4 h-4" />
              Choose Photo
            </Button>
          </div>
        )}
      </div>

      {imageUrl && (
        <>
          {/* Tab selector */}
          <div className="flex border-b border-border bg-card">
            {[
              { id: 'adjust', label: 'Adjust', icon: Sun },
              { id: 'crop', label: 'Crop', icon: Crop },
              { id: 'filters', label: 'Filters', icon: Palette },
              { id: 'background', label: 'BG Remove', icon: Eraser },
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2',
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
                onClick={() => setActiveTab(tab.id as EditorTab)}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls panel */}
          <div className="bg-card border-t border-border">
            <AnimatePresence mode="wait">
              {activeTab === 'adjust' && (
                <motion.div
                  key="adjust"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 space-y-4"
                >
                  {/* Transform buttons */}
                  <div className="flex items-center justify-center gap-2 pb-3 border-b border-border">
                    <Button variant="outline" size="sm" onClick={() => handleRotate('ccw')}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRotate('cw')}>
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-2" />
                    <Button
                      variant={adjustments.flipH ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleFlip('h')}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={adjustments.flipV ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleFlip('v')}
                    >
                      <FlipVertical className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-2" />
                    <Button variant="ghost" size="sm" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>

                  {/* Adjustment sliders */}
                  <div className="space-y-4 max-h-40 overflow-y-auto">
                    {adjustmentControls.map((control) => (
                      <div key={control.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <control.icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{control.label}</span>
                          </div>
                          <span className="text-xs font-medium text-foreground w-10 text-right">
                            {adjustments[control.key as keyof ImageAdjustments] as number > 0 ? '+' : ''}
                            {adjustments[control.key as keyof ImageAdjustments]}
                          </span>
                        </div>
                        <Slider
                          value={[adjustments[control.key as keyof ImageAdjustments] as number]}
                          min={control.min}
                          max={control.max}
                          step={1}
                          onValueChange={([value]) =>
                            handleAdjustmentChange(control.key as keyof ImageAdjustments, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'crop' && (
                <motion.div
                  key="crop"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4"
                >
                  {/* Crop ratio buttons */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cropRatios.map((ratio) => (
                      <Button
                        key={ratio.id}
                        variant={selectedCropRatio === ratio.id ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCropRatio(ratio.id)}
                      >
                        {ratio.name}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Drag on the image to adjust crop area
                    </p>
                    <p className="text-xxs text-muted-foreground mt-1">
                      (Crop functionality simulated in MVP)
                    </p>
                  </div>

                  <div className="flex gap-2 mt-4 justify-center">
                    <Button variant="outline" onClick={() => setActiveTab('adjust')}>
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button variant="gradient">
                      <Check className="w-4 h-4" />
                      Apply Crop
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'filters' && (
                <motion.div
                  key="filters"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4"
                >
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {filterPresets.map((filter) => (
                      <motion.button
                        key={filter.id}
                        className={cn(
                          'flex flex-col items-center gap-2 shrink-0'
                        )}
                        onClick={() => handleApplyFilter(filter)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div
                          className={cn(
                            'w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                            selectedFilter === filter.id
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border'
                          )}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={filter.name}
                              className="w-full h-full object-cover"
                              style={{ filter: filter.preview }}
                            />
                          ) : (
                            <div className="w-full h-full bg-secondary" />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xxs font-medium',
                            selectedFilter === filter.id ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {filter.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'background' && (
                <motion.div
                  key="background"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4"
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Eraser className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Arka Plan Kaldır</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fotoğrafınızın arka planını otomatik olarak kaldırın
                      </p>
                    </div>
                    <Button
                      variant="gradient"
                      onClick={() => setShowBackgroundRemover(true)}
                    >
                      <Eraser className="w-4 h-4" />
                      Başla
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Safe area bottom padding */}
          <div className="safe-area-bottom bg-card" />
        </>
      )}

      {/* Background Remover Modal */}
      <AnimatePresence>
        {showBackgroundRemover && imageUrl && (
          <BackgroundRemover
            imageUrl={imageUrl}
            onClose={() => setShowBackgroundRemover(false)}
            onSave={(resultUrl) => {
              setImageUrl(resultUrl);
              setShowBackgroundRemover(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoEditorScreen;
