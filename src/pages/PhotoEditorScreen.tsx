import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Expand,
  Type,
  Bot,
  Loader2,
  Share2,
  FolderDown,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BackgroundRemover from '@/components/BackgroundRemover';
import { AIToolsService } from '@/services/AIToolsService';
import { nativeExportService } from '@/services/NativeExportService';
import samplePhoto from '@/assets/sample-photo.jpg';


type EditorTab = 'adjust' | 'crop' | 'filters' | 'background' | 'ai';
type AIToolType = 'enhance' | 'expand' | 'generate' | 'avatar' | 'poster' | null;

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
  { id: 'vivid', name: 'Vivid', adjustments: { saturation: 30, contrast: 15 }, preview: 'saturate(1.45) contrast(1.2)' },
  { id: 'warm', name: 'Warm', adjustments: { temperature: 25, saturation: 10 }, preview: 'sepia(0.3) saturate(1.2) hue-rotate(-8deg)' },
  { id: 'cool', name: 'Cool', adjustments: { temperature: -25, brightness: 5 }, preview: 'hue-rotate(18deg) saturate(1.1) brightness(1.04)' },
  { id: 'dramatic', name: 'Dramatic', adjustments: { contrast: 40, saturation: -20 }, preview: 'contrast(1.55) saturate(0.75) brightness(0.92)' },
  { id: 'fade', name: 'Fade', adjustments: { contrast: -20, brightness: 10 }, preview: 'contrast(0.78) brightness(1.12) saturate(0.88)' },
  { id: 'noir', name: 'Noir', adjustments: { saturation: -100, contrast: 30 }, preview: 'grayscale(1) contrast(1.35) brightness(0.95)' },
  { id: 'vintage', name: 'Vintage', adjustments: { saturation: -30, temperature: 20, contrast: -10 }, preview: 'sepia(0.48) contrast(0.88) saturate(0.85)' },
  { id: 'chrome', name: 'Chrome', adjustments: { saturation: 20, contrast: 25, brightness: 5 }, preview: 'saturate(1.3) contrast(1.3) brightness(1.08)' },
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
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('adjust');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [selectedCropRatio, setSelectedCropRatio] = useState<string>('free');
  const [undoStack, setUndoStack] = useState<ImageAdjustments[]>([]);
  const [redoStack, setRedoStack] = useState<ImageAdjustments[]>([]);
  const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);
  
  // AI Tool states
  const [activeAITool, setActiveAITool] = useState<AIToolType>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiProgress, setAIProgress] = useState(0);
  const [showSaveSharePanel, setShowSaveSharePanel] = useState(false);
  const [savedImageBlob, setSavedImageBlob] = useState<Blob | null>(null);

  // Handle URL params for AI tools and generated images
  useEffect(() => {
    const tool = searchParams.get('tool');
    const source = searchParams.get('source');
    
    // Check if we have a generated image from text-to-image
    if (source === 'generated') {
      const generatedImage = sessionStorage.getItem('generatedImage');
      if (generatedImage) {
        setImageUrl(generatedImage);
        sessionStorage.removeItem('generatedImage');
        toast.success('Image uploaded', { description: 'AI-generated image is ready to edit.' });
      }
    }
    
    if (tool === 'background') {
      setActiveTab('background');
    } else if (tool === 'enhance' || tool === 'expand' || tool === 'generate' || tool === 'avatar' || tool === 'poster') {
      setActiveTab('ai');
      setActiveAITool(tool as AIToolType);
    }
  }, [searchParams]);

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

  const getFilterString = () =>
    [
      `brightness(${1 + adjustments.brightness / 100})`,
      `contrast(${1 + adjustments.contrast / 100})`,
      `saturate(${1 + adjustments.saturation / 100})`,
      adjustments.temperature > 0
        ? `sepia(${adjustments.temperature / 100})`
        : `hue-rotate(${adjustments.temperature}deg)`,
    ].join(' ');

  const getImageStyle = (): React.CSSProperties => {
    const filters = getFilterString();

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

  const filterPreviewImage = imageUrl ?? samplePhoto;

  const handleApplyCrop = useCallback(async () => {
    if (!imageUrl) {
      toast.error('No image found to crop');
      return;
    }

    const selectedRatio = cropRatios.find((ratio) => ratio.id === selectedCropRatio)?.ratio ?? null;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image could not be loaded'));
      });

      let cropWidth = img.width;
      let cropHeight = img.height;
      let cropX = 0;
      let cropY = 0;

      if (selectedRatio) {
        const currentRatio = img.width / img.height;

        if (currentRatio > selectedRatio) {
          cropHeight = img.height;
          cropWidth = img.height * selectedRatio;
          cropX = (img.width - cropWidth) / 2;
        } else {
          cropWidth = img.width;
          cropHeight = img.width / selectedRatio;
          cropY = (img.height - cropHeight) / 2;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropWidth);
      canvas.height = Math.round(cropHeight);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas could not be created');
      }

      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const dataUrl = canvas.toDataURL('image/png');
      setImageUrl(dataUrl);
      setActiveTab('adjust');
      toast.success('Crop applied');
    } catch (error) {
      console.error('Crop error:', error);
      toast.error('Crop could not be applied');
    }
  }, [imageUrl, selectedCropRatio]);

  const handleSave = async () => {
    if (!imageUrl) {
      toast.error('No image found to save');
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image could not be loaded'));
      });

      const rotation = ((adjustments.rotation % 360) + 360) % 360;
      const shouldSwapDimensions = rotation === 90 || rotation === 270;
      const canvas = document.createElement('canvas');
      canvas.width = shouldSwapDimensions ? img.height : img.width;
      canvas.height = shouldSwapDimensions ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas could not be created');
      }

      ctx.filter = getFilterString();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      const scaleX = adjustments.flipH ? -1 : 1;
      const scaleY = adjustments.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {
          setSavedImageBlob(blob);
          setShowSaveSharePanel(true);
        } else {
          toast.error('Image could not be created');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Image could not be saved');
    }
  };

  const handleSaveToDevice = async () => {
    if (!savedImageBlob) return;
    const fileName = `Xtrim_photo_${Date.now()}.png`;
    const result = await nativeExportService.saveVideoToDevice(savedImageBlob, fileName);
    if (result.success) {
      toast.success('Image saved to device!');
    } else {
      // Web fallback - direct download
      const url = URL.createObjectURL(savedImageBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    }
  };

  const handleShareImage = async () => {
    if (!savedImageBlob) return;
    const fileName = `Xtrim_photo_${Date.now()}.png`;
    
    // Try Web Share API first
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([savedImageBlob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Xtrim Photo',
            text: 'Edited with Xtrim',
            files: [file],
          });
          toast.success('Shared!');
          return;
        }
      } catch (e) {
        // User cancelled or not supported
      }
    }

    // Native share fallback
    const success = await nativeExportService.shareVideoBlob(savedImageBlob, fileName);
    if (success) {
      toast.success('Shared!');
    } else {
      toast.error('Sharing is not supported');
    }
  };

  // AI Processing functions
  const processAITool = async () => {
    if (!imageUrl && activeAITool !== 'generate') {
      toast.error('Please select a photo first');
      return;
    }

    if ((activeAITool === 'generate' || activeAITool === 'expand' || activeAITool === 'poster') && !aiPrompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsAIProcessing(true);
    setAIProgress(0);

    const progressInterval = setInterval(() => {
      setAIProgress(prev => Math.min(prev + 5, 90));
    }, 300);

    try {
      let result;
      let imageBase64 = '';

      if (imageUrl) {
        // Convert image to base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      switch (activeAITool) {
        case 'enhance':
          result = await AIToolsService.processVideoTool('enhance', imageBase64);
          break;
        case 'expand':
          result = await AIToolsService.generateImage('expand', aiPrompt, imageBase64);
          break;
        case 'generate':
          result = await AIToolsService.generateImage('text-to-image', aiPrompt);
          break;
        case 'avatar':
          result = await AIToolsService.generateImage('avatar', aiPrompt || 'Professional avatar', imageBase64);
          break;
        case 'poster':
          result = await AIToolsService.generateImage('poster', aiPrompt, imageBase64);
          break;
        default:
          throw new Error('Unknown AI tool');
      }

      clearInterval(progressInterval);
      setAIProgress(100);

      if (result.success) {
        const outputUrl = result.outputUrl || result.imageUrl;
        if (outputUrl) {
          setImageUrl(outputUrl);
          toast.success('AI operation completed!');
        } else {
          throw new Error('No result received');
        }
      } else {
        throw new Error(result.error || 'AI operation failed');
      }
    } catch (error) {
      console.error('AI processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast.error('Too many requests. Please wait a bit.');
      } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
        toast.error('API credits exhausted.');
      } else {
        toast.error(`AI error: ${errorMessage}`);
      }
    } finally {
      clearInterval(progressInterval);
      setIsAIProcessing(false);
      setAIProgress(0);
    }
  };

  const adjustmentControls = [
    { key: 'brightness', label: 'Brightness', icon: Sun, min: -100, max: 100 },
    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -100, max: 100 },
    { key: 'saturation', label: 'Saturation', icon: Droplets, min: -100, max: 100 },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100 },
  ];

  const aiTools = [
    { id: 'enhance', name: 'Enhance Quality', icon: Sparkles, description: 'Improve photo quality' },
    { id: 'expand', name: 'Expand', icon: Expand, description: 'Expand photo with AI' },
    { id: 'generate', name: 'Image from Text', icon: Type, description: 'Create image from description' },
    { id: 'avatar', name: 'Avatar Generator', icon: Bot, description: 'Design AI avatar' },
    { id: 'poster', name: 'Poster Yap', icon: Palette, description: 'Profesyonel poster tasarla' },
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
            <Button variant="gradient" size="sm" onClick={handleSave}>
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
                Choose from your device or try a demo photo
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
                Photo Select
              </Button>
            </div>
          </div>
        )}

        {/* AI Processing Overlay */}
        <AnimatePresence>
          {isAIProcessing && (
            <motion.div
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${aiProgress}%` }}
                />
              </div>
              <p className="text-white text-sm">AI processing... %{aiProgress}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {imageUrl && (
        <>
          {/* Tab selector */}
          <div className="flex border-b border-border bg-card overflow-x-auto scrollbar-hide">
            {[
              { id: 'adjust', label: 'Adjust', icon: Sun },
              { id: 'crop', label: 'Crop', icon: Crop },
              { id: 'filters', label: 'Filters', icon: Palette },
              { id: 'background', label: 'Background', icon: Eraser },
              { id: 'ai', label: 'AI Tools', icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
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
                  </div>

                  <div className="flex gap-2 mt-4 justify-center">
                    <Button variant="outline" onClick={() => setActiveTab('adjust')}>
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                    <Button variant="gradient" onClick={handleApplyCrop}>
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
                        className="flex flex-col items-center gap-2 shrink-0"
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
                          <img
                            src={filterPreviewImage}
                            alt={filter.name}
                            className="w-full h-full object-cover"
                            style={{ filter: filter.preview }}
                          />
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
                      <h3 className="font-semibold text-foreground">Remove Background</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically remove your photo background with AI
                      </p>
                    </div>
                    <Button
                      variant="gradient"
                      onClick={() => setShowBackgroundRemover(true)}
                    >
                      <Sparkles className="w-4 h-4" />
                      Start with AI
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 space-y-4"
                >
                  {!activeAITool ? (
                    // AI Tool Selection
                    <div className="grid grid-cols-3 gap-3">
                      {aiTools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <motion.button
                            key={tool.id}
                            className="flex flex-col items-center p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                            onClick={() => setActiveAITool(tool.id as AIToolType)}
                            whileTap={{ scale: 0.95 }}
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-xs font-medium text-foreground">{tool.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    // Active AI Tool UI
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveAITool(null);
                            setAiPrompt('');
                          }}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Back
                        </Button>
                        <span className="text-sm font-medium text-foreground">
                          {aiTools.find(t => t.id === activeAITool)?.name}
                        </span>
                      </div>

                      {(activeAITool === 'generate' || activeAITool === 'expand' || activeAITool === 'poster') && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">
                            {activeAITool === 'generate' ? 'What would you like to create?' : 'Add a description'}
                          </label>
                          <Input
                            placeholder={
                              activeAITool === 'generate'
                                ? 'e.g.: A sea view at sunset'
                                : activeAITool === 'expand'
                                ? 'e.g.: Expand to the sides, add sky'
                                : 'e.g.: Minimalist movie poster design'
                            }
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                          />
                        </div>
                      )}

                      {activeAITool === 'avatar' && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Avatar style (optional)</label>
                          <Input
                            placeholder="e.g.: Professional, anime style, 3D..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                          />
                        </div>
                      )}

                      <Button
                        variant="gradient"
                        className="w-full"
                        onClick={processAITool}
                        disabled={isAIProcessing}
                      >
                        {isAIProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {activeAITool === 'generate' ? 'Create' : 'Apply'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
            onSave={async (resultUrl) => {
              setImageUrl(resultUrl);
              setShowBackgroundRemover(false);

              try {
                const response = await fetch(resultUrl);
                const imageBlob = await response.blob();
                const fileName = `Xtrim_bg_removed_${Date.now()}.png`;
                const saveResult = await nativeExportService.saveVideoToDevice(imageBlob, fileName);

                if (saveResult.success) {
                  toast.success('Photo saved to gallery!');
                } else {
                  toast.error(saveResult.error || 'Photo could not be saved');
                }
              } catch (error) {
                console.error('Background remover save error:', error);
                toast.error('Photo could not be saved');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Save & Share Panel */}
      <AnimatePresence>
        {showSaveSharePanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={() => setShowSaveSharePanel(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl p-6 space-y-4 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
                <h3 className="text-lg font-semibold text-foreground">Image Ready!</h3>
                <p className="text-sm text-muted-foreground">Your photo was processed successfully</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-14 flex-col gap-1"
                  onClick={handleShareImage}
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-xs">Share</span>
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1 h-14 flex-col gap-1"
                  onClick={handleSaveToDevice}
                >
                  <FolderDown className="w-5 h-5" />
                  <span className="text-xs">Save</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotoEditorScreen;
