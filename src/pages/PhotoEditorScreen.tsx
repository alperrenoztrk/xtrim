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
  Check,
  X,
  ImagePlus,
  Eraser,
  Expand,
  Type,
  LayoutGrid,
  Trash2,
  Volume2,
  MoreHorizontal,
  Bot,
  Loader2,
  Copy,
  Share2,
  Sticker,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  PenLine,
  Undo2,
  Highlighter,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BackgroundRemover from '@/components/BackgroundRemover';
import { AnimatedFilterOverlay, type AnimatedFilterType } from '@/components/AnimatedFilterOverlay';
import { AIToolsService } from '@/services/AIToolsService';
import { nativeExportService } from '@/services/NativeExportService';
import samplePhoto from '@/assets/sample-photo.jpg';


type EditorTab = 'adjust' | 'crop' | 'draw' | 'filters' | 'ai' | 'more';
type AIToolType = 'enhance' | 'expand' | 'generate' | 'avatar' | 'poster' | 'background' | 'watermark' | null;

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
}

interface EditorSnapshot {
  imageUrl: string | null;
  adjustments: ImageAdjustments;
  selectedFilter: string;
  animatedFilter: AnimatedFilterType;
  aiAnimatedTextureUrl: string | null;
  aiAnimatedPrompt: string;
  drawStrokes: DrawStroke[];
  cornerRadius: number;
}

interface AnimatedFilterPreset {
  id: AnimatedFilterType;
  name: string;
  description: string;
}

interface DrawPoint {
  x: number;
  y: number;
}

type DrawBrushType = 'precision' | 'marker' | 'neon';

interface DrawStroke {
  points: DrawPoint[];
  color: string;
  size: number;
  opacity: number;
  brushType: DrawBrushType;
}

interface FreeCropSettings {
  widthPercent: number;
  heightPercent: number;
  xPercent: number;
  yPercent: number;
}

interface CropPreviewBounds {
  widthPercent: number;
  heightPercent: number;
  xPercent: number;
  yPercent: number;
}

const filterPresets: FilterPreset[] = [
  { id: 'none', name: 'Original', adjustments: {} },
  { id: 'vivid', name: 'Vivid', adjustments: { saturation: 30, contrast: 15 } },
  { id: 'warm', name: 'Warm', adjustments: { temperature: 25, saturation: 10 } },
  { id: 'cool', name: 'Cool', adjustments: { temperature: -25, brightness: 5 } },
  { id: 'dramatic', name: 'Dramatic', adjustments: { contrast: 40, saturation: -20 } },
  { id: 'fade', name: 'Fade', adjustments: { contrast: -20, brightness: 10 } },
  { id: 'noir', name: 'Noir', adjustments: { saturation: -100, contrast: 30 } },
  { id: 'vintage', name: 'Vintage', adjustments: { saturation: -30, temperature: 20, contrast: -10 } },
  { id: 'chrome', name: 'Chrome', adjustments: { saturation: 20, contrast: 25, brightness: 5 } },
  { id: 'mono', name: 'Mono', adjustments: { saturation: -100 } },
];

const animatedFilterPresets: AnimatedFilterPreset[] = [
  { id: 'none', name: 'None', description: 'No animation' },
  { id: 'snow', name: 'Snow', description: 'Snowfall effect' },
  { id: 'rain', name: 'Rain', description: 'Rainfall effect' },
  { id: 'sparkles', name: 'Sparkle', description: 'Twinkling lights' },
  { id: 'ai', name: 'AI', description: 'AI generated animated texture' },
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

const DEFAULT_FREE_CROP_INSET_PERCENT = 4;

const defaultFreeCropSettings: FreeCropSettings = {
  widthPercent: 100 - DEFAULT_FREE_CROP_INSET_PERCENT * 2,
  heightPercent: 100 - DEFAULT_FREE_CROP_INSET_PERCENT * 2,
  xPercent: DEFAULT_FREE_CROP_INSET_PERCENT,
  yPercent: DEFAULT_FREE_CROP_INSET_PERCENT,
};

const MIN_FREE_CROP_PERCENT = 10;

type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface CropInteractionState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  startSettings: FreeCropSettings;
  handle?: CropHandle;
}

type QuickTool = 'collage' | 'delete' | 'audio' | 'text' | 'sticker' | 'more';

const moreMenuTools: { id: Exclude<QuickTool, 'more'>; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'collage', icon: LayoutGrid, label: 'Collage' },
  { id: 'delete', icon: Trash2, label: 'Delete' },
  { id: 'audio', icon: Volume2, label: 'Audio' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'sticker', icon: Sticker, label: 'Sticker' },
];

const drawBrushOptions: { id: DrawBrushType; label: string; icon: React.ComponentType<any>; description: string }[] = [
  { id: 'precision', label: 'Precision', icon: PenLine, description: 'Sharp strokes for detailed retouching' },
  { id: 'marker', label: 'Marker', icon: Highlighter, description: 'Thicker semi-transparent marker look' },
  { id: 'neon', label: 'Neon', icon: WandSparkles, description: 'Glowing brush for highlights and effects' },
];

const PhotoEditorScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectName = searchParams.get('projectName')?.trim() || 'Photo Editor';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const cornerRadiusInteractionRef = useRef(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<EditorTab>('adjust');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [animatedFilter, setAnimatedFilter] = useState<AnimatedFilterType>('none');
  const [aiAnimatedTextureUrl, setAiAnimatedTextureUrl] = useState<string | null>(null);
  const [aiAnimatedPrompt, setAiAnimatedPrompt] = useState('');
  const [isGeneratingAnimatedFilter, setIsGeneratingAnimatedFilter] = useState(false);
  const [selectedCropRatio, setSelectedCropRatio] = useState<string>('free');
  const [freeCropSettings, setFreeCropSettings] = useState<FreeCropSettings>(defaultFreeCropSettings);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);
  const [activeQuickTool, setActiveQuickTool] = useState<QuickTool | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openCollageAfterSelection, setOpenCollageAfterSelection] = useState(false);
  const [cropInteraction, setCropInteraction] = useState<CropInteractionState | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>([]);
  const [activeDrawStroke, setActiveDrawStroke] = useState<DrawStroke | null>(null);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [drawSize, setDrawSize] = useState(1.2);
  const [drawOpacity, setDrawOpacity] = useState(0.9);
  const [drawBrushType, setDrawBrushType] = useState<DrawBrushType>('precision');
  const [cornerRadius, setCornerRadius] = useState(0);
  const [isCreatingSticker, setIsCreatingSticker] = useState(false);
  
  // AI Tool states
  const [activeAITool, setActiveAITool] = useState<AIToolType>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiProgress, setAIProgress] = useState(0);

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

    if (source === 'collage') {
      const collageImage = sessionStorage.getItem('photoEditorImportedImage');
      if (collageImage) {
        setImageUrl(collageImage);
        setSelectedImageUrls([collageImage]);
        sessionStorage.removeItem('photoEditorImportedImage');
        toast.success('Collage applied', { description: 'Returned to photo editor with the new collage.' });
      }
    }
    
    if (tool === 'background' || tool === 'enhance' || tool === 'expand' || tool === 'generate' || tool === 'avatar' || tool === 'poster' || tool === 'watermark') {
      setActiveTab('ai');
      setActiveAITool(tool as AIToolType);
    }
  }, [searchParams]);

  const createSnapshot = useCallback(
    (): EditorSnapshot => ({
      imageUrl,
      adjustments: { ...adjustments },
      selectedFilter,
      animatedFilter,
      aiAnimatedTextureUrl,
      aiAnimatedPrompt,
      drawStrokes: drawStrokes.map((stroke) => ({ ...stroke, points: [...stroke.points] })),
      cornerRadius,
    }),
    [imageUrl, adjustments, selectedFilter, animatedFilter, aiAnimatedTextureUrl, aiAnimatedPrompt, drawStrokes, cornerRadius]
  );

  const restoreSnapshot = useCallback((snapshot: EditorSnapshot) => {
    setImageUrl(snapshot.imageUrl);
    setAdjustments(snapshot.adjustments);
    setSelectedFilter(snapshot.selectedFilter);
    setAnimatedFilter(snapshot.animatedFilter);
    setAiAnimatedTextureUrl(snapshot.aiAnimatedTextureUrl ?? null);
    setAiAnimatedPrompt(snapshot.aiAnimatedPrompt ?? "");
    setDrawStrokes(snapshot.drawStrokes);
    setCornerRadius(snapshot.cornerRadius ?? 0);
    setActiveDrawStroke(null);
  }, []);

  const saveState = useCallback(() => {
    const snapshot = createSnapshot();
    setUndoStack((prev) => [...prev.slice(-20), snapshot]);
    setRedoStack([]);
  }, [createSnapshot]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const currentSnapshot = createSnapshot();
    setRedoStack((prev) => [...prev, currentSnapshot]);
    restoreSnapshot(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentSnapshot = createSnapshot();
    setUndoStack((prev) => [...prev, currentSnapshot]);
    restoreSnapshot(next);
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
    setAnimatedFilter('none');
    setAiAnimatedTextureUrl(null);
    setAiAnimatedPrompt('');
  };

  const handleApplyAnimatedFilter = (filter: AnimatedFilterType) => {
    saveState();
    setAnimatedFilter(filter);
    if (filter !== 'ai') {
      setAiAnimatedTextureUrl(null);
    }
  };

  const handleGenerateAnimatedFilter = async () => {
    if (!aiAnimatedPrompt.trim()) {
      toast.error('Please describe the animated filter');
      return;
    }

    setIsGeneratingAnimatedFilter(true);
    try {
      let imageBase64: string | undefined;
      if (imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const result = await AIToolsService.generateImage(
        'poster',
        `${aiAnimatedPrompt}. Create a seamless VFX texture for animated overlay.`,
        imageBase64,
        { style: 'vfx overlay texture' }
      );

      if (!result.success || !(result.imageUrl || result.outputUrl)) {
        throw new Error(result.error || 'Could not generate animated filter texture');
      }

      saveState();
      setAiAnimatedTextureUrl(result.imageUrl || result.outputUrl || null);
      setAnimatedFilter('ai');
      toast.success('AI animated filter is ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate animated filter';
      toast.error(message);
    } finally {
      setIsGeneratingAnimatedFilter(false);
    }
  };

  const openCollageEditor = useCallback((images: string[]) => {
    if (images.length < 2) {
      toast.info('Collage requires at least 2 photos.');
      return;
    }

    sessionStorage.setItem('collageSeedImages', JSON.stringify(images));
    navigate('/collage?source=photo-editor');
  }, [navigate]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      setOpenCollageAfterSelection(false);
      return;
    }

    const imageUrls = files.map((file) => URL.createObjectURL(file));
    const existingImages = selectedImageUrls.length > 0
      ? selectedImageUrls
      : imageUrl
        ? [imageUrl]
        : [];
    const mergedImages = Array.from(new Set([...existingImages, ...imageUrls]));

    setSelectedImageUrls(mergedImages);
    setImageUrl(imageUrls[0]);
    setAdjustments(defaultAdjustments);
    setSelectedFilter('none');
    setAnimatedFilter('none');
    setAiAnimatedTextureUrl(null);
    setAiAnimatedPrompt('');
    setUndoStack([]);
    setRedoStack([]);
    setZoomLevel(1);
    setDrawStrokes([]);
    setActiveDrawStroke(null);
    setCornerRadius(0);

    if (openCollageAfterSelection) {
      openCollageEditor(mergedImages);
      setOpenCollageAfterSelection(false);
    }

    e.target.value = '';
  };

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoomLevel(Math.min(4, Math.max(1, nextZoom)));
  }, []);

  const handlePreviewWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!imageUrl || activeTab === 'crop') return;
    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
    handleZoomChange(zoomLevel + zoomDelta);
  }, [activeTab, handleZoomChange, imageUrl, zoomLevel]);

  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const getFilterString = (values: ImageAdjustments) =>
    [
      `brightness(${1 + values.brightness / 100})`,
      `contrast(${1 + values.contrast / 100})`,
      `saturate(${1 + values.saturation / 100})`,
      values.temperature > 0
        ? `sepia(${values.temperature / 100})`
        : `hue-rotate(${values.temperature}deg)`,
    ].join(' ');

  const getImageStyle = (): React.CSSProperties => {
    const filters = getFilterString(adjustments);
    const scaledFlipX = (adjustments.flipH ? -1 : 1) * zoomLevel;
    const scaledFlipY = (adjustments.flipV ? -1 : 1) * zoomLevel;

    return {
      filter: filters,
      transform: `
        rotate(${adjustments.rotation}deg)
        scale(${scaledFlipX}, ${scaledFlipY})
      `,
      borderRadius: `${cornerRadius}px`,
      transition: 'filter 0.2s, transform 0.3s',
    };
  };

  const filterPreviewImage = imageUrl ?? samplePhoto;

  const getRelativeDrawPoint = useCallback((clientX: number, clientY: number, bounds: DOMRect): DrawPoint | null => {
    if (!bounds || !bounds.width || !bounds.height) return null;

    const x = ((clientX - bounds.left) / bounds.width) * 100;
    const y = ((clientY - bounds.top) / bounds.height) * 100;

    if (x < 0 || x > 100 || y < 0 || y > 100) {
      return null;
    }

    return { x, y };
  }, []);

  const getBrushStyle = useCallback((brushType: DrawBrushType) => {
    if (brushType === 'marker') {
      return { lineCap: 'round' as const, lineJoin: 'round' as const, blur: 0, sizeMultiplier: 1.4 };
    }

    if (brushType === 'neon') {
      return { lineCap: 'round' as const, lineJoin: 'round' as const, blur: 8, sizeMultiplier: 1.1 };
    }

    return { lineCap: 'round' as const, lineJoin: 'round' as const, blur: 0, sizeMultiplier: 1 };
  }, []);

  const beginDrawStroke = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTab !== 'draw') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const startPoint = getRelativeDrawPoint(event.clientX, event.clientY, bounds);
    if (!startPoint) return;

    saveState();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    setActiveDrawStroke({
      points: [startPoint],
      color: drawColor,
      size: drawSize,
      opacity: drawOpacity,
      brushType: drawBrushType,
    });
  }, [activeTab, drawColor, drawOpacity, drawBrushType, drawSize, getRelativeDrawPoint, saveState]);

  const drawStroke = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTab !== 'draw' || !activeDrawStroke) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = getRelativeDrawPoint(event.clientX, event.clientY, bounds);
    if (!point) return;

    setActiveDrawStroke((prev) => {
      if (!prev) return prev;
      return { ...prev, points: [...prev.points, point] };
    });
  }, [activeDrawStroke, activeTab, getRelativeDrawPoint]);

  const finishDrawStroke = useCallback((event?: React.PointerEvent<SVGSVGElement>) => {
    if (!activeDrawStroke || activeDrawStroke.points.length === 0) return;

    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDrawStrokes((prev) => [...prev, activeDrawStroke]);
    setActiveDrawStroke(null);
  }, [activeDrawStroke]);

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
      } else {
        cropWidth = Math.max(1, img.width * (freeCropSettings.widthPercent / 100));
        cropHeight = Math.max(1, img.height * (freeCropSettings.heightPercent / 100));
        cropX = clamp(img.width * (freeCropSettings.xPercent / 100), 0, img.width - cropWidth);
        cropY = clamp(img.height * (freeCropSettings.yPercent / 100), 0, img.height - cropHeight);
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
      saveState();
      setImageUrl(dataUrl);
      setDrawStrokes([]);
      setActiveDrawStroke(null);
      setActiveTab('adjust');
      setFreeCropSettings(defaultFreeCropSettings);
      toast.success('Crop applied');
    } catch (error) {
      console.error('Crop error:', error);
      toast.error('Crop could not be applied');
    }
  }, [freeCropSettings, imageUrl, selectedCropRatio, saveState]);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const isFreeCropEditing = activeTab === 'crop' && selectedCropRatio === 'free' && Boolean(imageUrl);

  const fixedCropPreviewBounds = useCallback((): CropPreviewBounds | null => {
    if (activeTab !== 'crop' || selectedCropRatio === 'free') {
      return null;
    }

    const selectedRatio = cropRatios.find((ratio) => ratio.id === selectedCropRatio)?.ratio;
    const previewImage = previewImageRef.current;

    if (!selectedRatio || !previewImage?.naturalWidth || !previewImage?.naturalHeight) {
      return null;
    }

    const imageRatio = previewImage.naturalWidth / previewImage.naturalHeight;

    if (imageRatio > selectedRatio) {
      const widthPercent = (selectedRatio / imageRatio) * 100;
      return {
        widthPercent,
        heightPercent: 100,
        xPercent: (100 - widthPercent) / 2,
        yPercent: 0,
      };
    }

    const heightPercent = (imageRatio / selectedRatio) * 100;
    return {
      widthPercent: 100,
      heightPercent,
      xPercent: 0,
      yPercent: (100 - heightPercent) / 2,
    };
  }, [activeTab, selectedCropRatio]);

  const activeFixedCropPreview = fixedCropPreviewBounds();

  const handleCancelCrop = useCallback(() => {
    setSelectedCropRatio('free');
    setFreeCropSettings(defaultFreeCropSettings);
    setCropInteraction(null);
    setActiveTab('adjust');
  }, []);

  const beginFreeCropInteraction = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>,
      mode: CropInteractionState['mode'],
      handle?: CropHandle,
    ) => {
      if (!isFreeCropEditing) return;

      event.preventDefault();
      event.stopPropagation();

      setCropInteraction({
        mode,
        startX: event.clientX,
        startY: event.clientY,
        startSettings: { ...freeCropSettings },
        handle,
      });
    },
    [freeCropSettings, isFreeCropEditing]
  );

  useEffect(() => {
    if (!cropInteraction) return;

    const handlePointerMove = (event: PointerEvent) => {
      const imageBounds = previewImageRef.current?.getBoundingClientRect();
      if (!imageBounds?.width || !imageBounds?.height) return;

      const deltaXPct = ((event.clientX - cropInteraction.startX) / imageBounds.width) * 100;
      const deltaYPct = ((event.clientY - cropInteraction.startY) / imageBounds.height) * 100;

      const nextSettings: FreeCropSettings = { ...cropInteraction.startSettings };

      if (cropInteraction.mode === 'move') {
        nextSettings.xPercent = clamp(
          cropInteraction.startSettings.xPercent + deltaXPct,
          0,
          100 - cropInteraction.startSettings.widthPercent
        );
        nextSettings.yPercent = clamp(
          cropInteraction.startSettings.yPercent + deltaYPct,
          0,
          100 - cropInteraction.startSettings.heightPercent
        );
      } else if (cropInteraction.handle) {
        const minWidth = MIN_FREE_CROP_PERCENT;
        const minHeight = MIN_FREE_CROP_PERCENT;
        const { xPercent: startX, yPercent: startY, widthPercent: startWidth, heightPercent: startHeight } = cropInteraction.startSettings;

        if (cropInteraction.handle.includes('e')) {
          nextSettings.widthPercent = clamp(startWidth + deltaXPct, minWidth, 100 - startX);
        }

        if (cropInteraction.handle.includes('s')) {
          nextSettings.heightPercent = clamp(startHeight + deltaYPct, minHeight, 100 - startY);
        }

        if (cropInteraction.handle.includes('w')) {
          const maxLeft = startX + startWidth - minWidth;
          nextSettings.xPercent = clamp(startX + deltaXPct, 0, maxLeft);
          nextSettings.widthPercent = startX + startWidth - nextSettings.xPercent;
        }

        if (cropInteraction.handle.includes('n')) {
          const maxTop = startY + startHeight - minHeight;
          nextSettings.yPercent = clamp(startY + deltaYPct, 0, maxTop);
          nextSettings.heightPercent = startY + startHeight - nextSettings.yPercent;
        }

        nextSettings.widthPercent = clamp(nextSettings.widthPercent, minWidth, 100 - nextSettings.xPercent);
        nextSettings.heightPercent = clamp(nextSettings.heightPercent, minHeight, 100 - nextSettings.yPercent);
      }

      setFreeCropSettings(nextSettings);
    };

    const endInteraction = () => setCropInteraction(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endInteraction);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endInteraction);
    };
  }, [cropInteraction]);

  const createEditedImageBlob = async (): Promise<Blob | null> => {
    if (!imageUrl) {
      toast.error('No image found to save');
      return null;
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

      ctx.filter = getFilterString(adjustments);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      const scaleX = adjustments.flipH ? -1 : 1;
      const scaleY = adjustments.flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const allStrokes = activeDrawStroke ? [...drawStrokes, activeDrawStroke] : drawStrokes;
      ctx.filter = 'none';
      allStrokes.forEach((stroke) => {
        if (stroke.points.length === 0) return;
        const widthScale = Math.max(img.width, img.height) / 100;
        const brushStyle = getBrushStyle(stroke.brushType);
        ctx.beginPath();
        ctx.lineCap = brushStyle.lineCap;
        ctx.lineJoin = brushStyle.lineJoin;
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity;
        ctx.lineWidth = stroke.size * brushStyle.sizeMultiplier * widthScale;

        if (brushStyle.blur > 0) {
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = brushStyle.blur * widthScale * 0.15;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        stroke.points.forEach((point, index) => {
          const drawX = (point.x / 100) * img.width - img.width / 2;
          const drawY = (point.y / 100) * img.height - img.height / 2;
          if (index === 0) {
            ctx.moveTo(drawX, drawY);
          } else {
            ctx.lineTo(drawX, drawY);
          }
        });

        if (stroke.points.length === 1) {
          const point = stroke.points[0];
          const drawX = (point.x / 100) * img.width - img.width / 2;
          const drawY = (point.y / 100) * img.height - img.height / 2;
          ctx.arc(drawX, drawY, (stroke.size * widthScale) / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke.color;
          ctx.fill();
        } else {
          ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });

      if (cornerRadius > 0) {
        const safeRadius = Math.min(cornerRadius, canvas.width / 2, canvas.height / 2);
        const roundedCanvas = document.createElement('canvas');
        roundedCanvas.width = canvas.width;
        roundedCanvas.height = canvas.height;
        const roundedCtx = roundedCanvas.getContext('2d');

        if (!roundedCtx) {
          throw new Error('Rounded canvas could not be created');
        }

        roundedCtx.beginPath();
        roundedCtx.moveTo(safeRadius, 0);
        roundedCtx.lineTo(roundedCanvas.width - safeRadius, 0);
        roundedCtx.quadraticCurveTo(roundedCanvas.width, 0, roundedCanvas.width, safeRadius);
        roundedCtx.lineTo(roundedCanvas.width, roundedCanvas.height - safeRadius);
        roundedCtx.quadraticCurveTo(
          roundedCanvas.width,
          roundedCanvas.height,
          roundedCanvas.width - safeRadius,
          roundedCanvas.height
        );
        roundedCtx.lineTo(safeRadius, roundedCanvas.height);
        roundedCtx.quadraticCurveTo(0, roundedCanvas.height, 0, roundedCanvas.height - safeRadius);
        roundedCtx.lineTo(0, safeRadius);
        roundedCtx.quadraticCurveTo(0, 0, safeRadius, 0);
        roundedCtx.closePath();
        roundedCtx.clip();
        roundedCtx.drawImage(canvas, 0, 0);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(roundedCanvas, 0, 0);
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png');
      });

      if (!blob) {
        toast.error('Image could not be created');
        return null;
      }

      return blob;
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Image could not be saved');
      return null;
    }
  };

  const handleUndoDrawStroke = () => {
    if (drawStrokes.length === 0) return;
    saveState();
    setDrawStrokes((prev) => prev.slice(0, -1));
  };

  const handleClearDrawings = () => {
    if (drawStrokes.length === 0) return;
    saveState();
    setDrawStrokes([]);
    setActiveDrawStroke(null);
  };

  const handleSaveToDevice = async (imageBlob: Blob) => {
    const fileName = `Xtrim_photo_${Date.now()}.png`;
    const result = await nativeExportService.saveVideoToDevice(imageBlob, fileName);
    if (result.success) {
      toast.success('Image saved to device!');
    } else {
      // Web fallback - direct download
      const url = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    }
  };

  const handleShareImage = async (imageBlob: Blob) => {
    const fileName = `Xtrim_photo_${Date.now()}.png`;
    
    // Try Web Share API first
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([imageBlob], fileName, { type: 'image/png' });
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
    const success = await nativeExportService.shareVideoBlob(imageBlob, fileName);
    if (success) {
      toast.success('Shared!');
    } else {
      toast.error('Sharing is not supported');
    }
  };

  const handleExportAction = async (action: 'download' | 'share') => {
    const imageBlob = await createEditedImageBlob();
    if (!imageBlob) return;

    if (action === 'share') {
      await handleShareImage(imageBlob);
      return;
    }

    await handleSaveToDevice(imageBlob);
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('File could not be read'));
          return;
        }

        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('File could not be read'));
      reader.readAsDataURL(blob);
    });

  const convertBlobToPng = async (blob: Blob): Promise<Blob> => {
    if (blob.type === 'image/png') {
      return blob;
    }

    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Sticker could not be converted');
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((convertedBlob) => resolve(convertedBlob), 'image/png');
    });

    if (!pngBlob) {
      throw new Error('Sticker could not be converted');
    }

    return pngBlob;
  };

  const copyStickerToClipboard = async (blob: Blob) => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('Clipboard is not supported on this device.');
    }

    const pngSticker = await convertBlobToPng(blob);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': pngSticker,
      }),
    ]);
  };

  const handleCreateSticker = async () => {
    if (!imageUrl) {
      toast.error('Please select a photo first');
      return;
    }

    setIsCreatingSticker(true);

    try {
      const editedImageBlob = await createEditedImageBlob();
      if (!editedImageBlob) {
        return;
      }

      const editedImageBase64 = await blobToDataUrl(editedImageBlob);
      const stickerResult = await AIToolsService.removeBackground(editedImageBase64);

      if (!stickerResult.success || !stickerResult.imageUrl) {
        throw new Error(stickerResult.error || 'Sticker could not be created');
      }

      saveState();
      setImageUrl(stickerResult.imageUrl);
      setSelectedImageUrls([stickerResult.imageUrl]);

      const stickerResponse = await fetch(stickerResult.imageUrl);
      const stickerBlob = await stickerResponse.blob();

      try {
        await copyStickerToClipboard(stickerBlob);
        toast.success('Sticker created and copied to clipboard');
      } catch {
        toast.success('Sticker created');
      }
    } catch (error) {
      console.error('Sticker creation error:', error);
      const message = error instanceof Error ? error.message : 'Sticker could not be created';
      toast.error(message);
    } finally {
      setIsCreatingSticker(false);
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
        case 'watermark':
          result = await AIToolsService.processVideoTool('watermark-remove', imageBase64);
          break;
        default:
          throw new Error('Unknown AI tool');
      }

      clearInterval(progressInterval);
      setAIProgress(100);

      if (result.success) {
        const outputUrl = result.outputUrl || result.imageUrl;
        if (outputUrl) {
          saveState();
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

  const handleConfirmDeletePhoto = () => {
    saveState();
    setImageUrl(null);
    setSelectedImageUrls([]);
    setActiveAITool(null);
    setAiPrompt('');
    setAiAnimatedPrompt('');
    setAiAnimatedTextureUrl(null);
    setActiveQuickTool(null);
    setDrawStrokes([]);
    setActiveDrawStroke(null);
    setShowDeleteConfirm(false);
    toast.success('Photo removed from editor');
  };

  const handleQuickToolClick = async (toolId: QuickTool) => {
    setActiveQuickTool(toolId);
    const collageSourceImages = selectedImageUrls.length > 0
      ? selectedImageUrls
      : imageUrl
        ? [imageUrl]
        : [];

    switch (toolId) {
      case 'collage':
        if (collageSourceImages.length < 2) {
          setOpenCollageAfterSelection(true);
          fileInputRef.current?.click();
          toast.info('Select another photo to continue with collage.');
        } else {
          openCollageEditor(collageSourceImages);
        }
        break;
      case 'delete':
        setShowDeleteConfirm(true);
        break;
      case 'audio':
        toast.info('Audio tools are available in the video editor.');
        break;
      case 'text':
        setActiveTab('ai');
        setActiveAITool('poster');
        break;
      case 'sticker':
        await handleCreateSticker();
        break;
      case 'more':
        setActiveTab('filters');
        break;
    }
  };

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/home', { replace: true });
  }, [navigate]);

  const adjustmentControls = [
    { key: 'brightness', label: 'Brightness', icon: Sun, min: -100, max: 100 },
    { key: 'contrast', label: 'Contrast', icon: Contrast, min: -100, max: 100 },
    { key: 'saturation', label: 'Saturation', icon: Droplets, min: -100, max: 100 },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, min: -100, max: 100 },
  ];

  const aiTools = [
    { id: 'background', name: 'Remove Background', icon: Eraser, description: 'Automatically remove image background' },
    { id: 'enhance', name: 'Enhance Quality', icon: Sparkles, description: 'Improve photo quality' },
    { id: 'watermark', name: 'Remove Watermark', icon: Eraser, description: 'Remove text/logo watermark with AI' },
    { id: 'expand', name: 'Expand', icon: Expand, description: 'Expand photo with AI' },
    { id: 'generate', name: 'Image from Text', icon: Type, description: 'Create image from description' },
    { id: 'avatar', name: 'Avatar Generator', icon: Bot, description: 'Design AI avatar' },
    { id: 'poster', name: 'Make a Poster', icon: Palette, description: 'Design a professional poster' },
  ];

  return (
    <div className="h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white safe-area-top overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">{projectName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {imageUrl && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gradient" size="sm">
                  <Download className="w-4 h-4" />
                  Save
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleExportAction('download')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportAction('share')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Image preview */}
      <div
        ref={previewStageRef}
        data-photo-zoom-area="true"
        className={cn(
          'relative bg-white dark:bg-black flex items-center justify-center overflow-hidden p-4',
          imageUrl && !isFullscreen ? 'h-1/2 min-h-0 flex-none' : 'flex-1',
          isFullscreen && 'fixed inset-0 z-50 bg-black p-2',
        )}
        onWheel={handlePreviewWheel}
      >
        {imageUrl ? (
          <motion.div
            key={imageUrl}
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0 }}
            className={cn('relative inline-block', isFreeCropEditing ? 'cursor-default' : isFullscreen ? 'cursor-zoom-out' : 'cursor-zoom-in')}
            onClick={() => {
              if (!isFreeCropEditing) {
                handleToggleFullscreen();
              }
            }}
          >
            <img
              ref={previewImageRef}
              src={imageUrl}
              alt="Editing"
              className="max-h-full max-w-full object-contain"
              style={getImageStyle()}
            />

            <AnimatedFilterOverlay type={animatedFilter} aiTextureUrl={aiAnimatedTextureUrl ?? undefined} className="rounded-[inherit]" />

            {(activeTab === 'draw' || drawStrokes.length > 0 || activeDrawStroke) && (
              <svg
                className={cn(
                  'absolute inset-0',
                  activeTab === 'draw' ? 'pointer-events-auto touch-none' : 'pointer-events-none'
                )}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={getImageStyle()}
                onPointerDown={beginDrawStroke}
                onPointerMove={drawStroke}
                onPointerUp={finishDrawStroke}
                onPointerLeave={finishDrawStroke}
                onClick={(event) => event.stopPropagation()}
              >
                {[...drawStrokes, ...(activeDrawStroke ? [activeDrawStroke] : [])].map((stroke, index) => (
                  <polyline
                    key={`${index}-${stroke.points.length}`}
                    points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke={stroke.color}
                    strokeWidth={stroke.size * getBrushStyle(stroke.brushType).sizeMultiplier}
                    strokeOpacity={stroke.opacity}
                    style={stroke.brushType === 'neon' ? { filter: `drop-shadow(0 0 ${stroke.size * 2}px ${stroke.color})` } : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>
            )}

            {activeFixedCropPreview && (
              <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${cornerRadius}px` }}>
                <div className="absolute left-0 top-0 w-full bg-black/55" style={{ height: `${activeFixedCropPreview.yPercent}%` }} />
                <div
                  className="absolute left-0 bg-black/55"
                  style={{
                    top: `${activeFixedCropPreview.yPercent}%`,
                    width: `${activeFixedCropPreview.xPercent}%`,
                    height: `${activeFixedCropPreview.heightPercent}%`,
                  }}
                />
                <div
                  className="absolute right-0 bg-black/55"
                  style={{
                    top: `${activeFixedCropPreview.yPercent}%`,
                    width: `${100 - (activeFixedCropPreview.xPercent + activeFixedCropPreview.widthPercent)}%`,
                    height: `${activeFixedCropPreview.heightPercent}%`,
                  }}
                />
                <div
                  className="absolute left-0 bottom-0 w-full bg-black/55"
                  style={{ height: `${100 - (activeFixedCropPreview.yPercent + activeFixedCropPreview.heightPercent)}%` }}
                />
                <div
                  className="absolute border-2 border-primary rounded-sm"
                  style={{
                    left: `${activeFixedCropPreview.xPercent}%`,
                    top: `${activeFixedCropPreview.yPercent}%`,
                    width: `${activeFixedCropPreview.widthPercent}%`,
                    height: `${activeFixedCropPreview.heightPercent}%`,
                  }}
                />
              </div>
            )}

            {isFreeCropEditing && (
              <div className="absolute inset-0" style={{ borderRadius: `${cornerRadius}px` }}>
                <div
                  className="absolute border-2 border-primary bg-primary/15 rounded-sm cursor-move touch-none"
                  style={{
                    left: `${freeCropSettings.xPercent}%`,
                    top: `${freeCropSettings.yPercent}%`,
                    width: `${freeCropSettings.widthPercent}%`,
                    height: `${freeCropSettings.heightPercent}%`,
                  }}
                  onPointerDown={(event) => beginFreeCropInteraction(event, 'move')}
                >
                  {([
                    { id: 'nw', className: '-left-2 -top-2 cursor-nwse-resize' },
                    { id: 'n', className: 'left-1/2 -translate-x-1/2 -top-2 cursor-ns-resize' },
                    { id: 'ne', className: '-right-2 -top-2 cursor-nesw-resize' },
                    { id: 'e', className: 'right-[-8px] top-1/2 -translate-y-1/2 cursor-ew-resize' },
                    { id: 'se', className: '-right-2 -bottom-2 cursor-nwse-resize' },
                    { id: 's', className: 'left-1/2 -translate-x-1/2 -bottom-2 cursor-ns-resize' },
                    { id: 'sw', className: '-left-2 -bottom-2 cursor-nesw-resize' },
                    { id: 'w', className: 'left-[-8px] top-1/2 -translate-y-1/2 cursor-ew-resize' },
                  ] as { id: CropHandle; className: string }[]).map((handle) => (
                    <button
                      key={handle.id}
                      type="button"
                      className={cn(
                        'absolute w-4 h-4 rounded-full bg-primary border-2 border-background shadow-sm',
                        handle.className
                      )}
                      onPointerDown={(event) => beginFreeCropInteraction(event, 'resize', handle.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <div className="flex items-center justify-center">
            <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="w-4 h-4" />
              Select a photo
            </Button>
          </div>
        )}

        {imageUrl && (
          <>
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
              <Button
                variant="icon"
                size="iconSm"
                className="bg-transparent hover:bg-black/40"
                onClick={() => handleZoomChange(zoomLevel - 0.25)}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </Button>
              <span className="min-w-12 text-center text-xs font-medium text-white">{Math.round(zoomLevel * 100)}%</span>
              <Button
                variant="icon"
                size="iconSm"
                className="bg-transparent hover:bg-black/40"
                onClick={() => handleZoomChange(zoomLevel + 0.25)}
                disabled={zoomLevel >= 4}
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </Button>
            </div>

            <Button
              variant="icon"
              size="iconSm"
              className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm hover:bg-black/70"
              onClick={handleToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-white" />
              ) : (
                <Maximize className="w-4 h-4 text-white" />
              )}
            </Button>
          </>
        )}

        {/* AI Processing Overlay */}
        <AnimatePresence>
          {isAIProcessing && (
            <motion.div
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
              transition={{ duration: 0 }}
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={false}
                  animate={{ width: `${aiProgress}%` }}
                  transition={{ duration: 0 }}
                />
              </div>
              <p className="text-white text-sm">AI processing... %{aiProgress}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {imageUrl && (
        <>
          <div className="h-1/2 min-h-0 flex flex-col border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
          {/* Tab selector */}
          <div className="flex border-b border-zinc-200 bg-white overflow-x-auto scrollbar-hide dark:border-zinc-800 dark:bg-black">
              {[
              { id: 'adjust', label: 'Adjust', icon: Sun },
              { id: 'crop', label: 'Crop', icon: Crop },
              { id: 'draw', label: 'Draw', icon: PenLine },
              { id: 'filters', label: 'Filters', icon: Palette },
              { id: 'ai', label: 'AI Tools', icon: Sparkles },
              { id: 'more', label: 'More', icon: MoreHorizontal },
            ].map((tab) => (
              <button
                key={tab.id}
                className={cn(
                  'flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                )}
                onClick={() => {
                  setActiveTab(tab.id as EditorTab);
                }}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls panel */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white border-t border-zinc-200 dark:border-zinc-800 dark:bg-black">
            <AnimatePresence mode="wait">
              {activeTab === 'adjust' && (
                <motion.div
                  key="adjust"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
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
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
                  className="p-4"
                >
                  {/* Crop ratio buttons */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cropRatios.map((ratio) => (
                      <Button
                        key={ratio.id}
                        variant={selectedCropRatio === ratio.id ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedCropRatio(ratio.id);

                          if (ratio.id === 'free') {
                            setIsFullscreen(true);
                          }
                        }}
                      >
                        {ratio.name}
                      </Button>
                    ))}
                  </div>

                  {selectedCropRatio === 'free' ? (
                    <div className="space-y-4 mt-4">
                      <p className="text-xs text-muted-foreground text-center">
                        Adjust the free crop area by dragging it on the image
                      </p>

                      <p className="text-[11px] text-muted-foreground text-center">
                        Use the inside area to move the box, and drag any corner or edge handle to resize it.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        Selected ratio will crop from center
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 justify-center">
                    <Button variant="outline" onClick={handleCancelCrop}>
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

              {activeTab === 'draw' && (
                <motion.div
                  key="draw"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
                  className="p-4 space-y-4"
                >
                  <p className="text-xs text-muted-foreground text-center">
                    Draw on the photo with professional brush presets.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {drawBrushOptions.map((brush) => (
                      <Button
                        key={brush.id}
                        type="button"
                        variant={drawBrushType === brush.id ? 'secondary' : 'outline'}
                        className="h-auto py-2 px-2 flex flex-col gap-1"
                        onClick={() => setDrawBrushType(brush.id)}
                      >
                        <brush.icon className="w-4 h-4" />
                        <span className="text-[11px] font-medium leading-none">{brush.label}</span>
                      </Button>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center">
                    {drawBrushOptions.find((brush) => brush.id === drawBrushType)?.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Brush Size</span>
                      <span>{drawSize.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[drawSize]}
                      min={0.5}
                      max={4}
                      step={0.1}
                      onValueChange={([value]) => setDrawSize(value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Opacity</span>
                      <span>{Math.round(drawOpacity * 100)}%</span>
                    </div>
                    <Slider
                      value={[drawOpacity]}
                      min={0.1}
                      max={1}
                      step={0.05}
                      onValueChange={([value]) => setDrawOpacity(value)}
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ffffff', '#111827'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          'w-7 h-7 rounded-full border-2 transition-all',
                          drawColor === color ? 'border-primary scale-110' : 'border-border'
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setDrawColor(color)}
                        aria-label={`Set color ${color}`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={handleUndoDrawStroke} disabled={drawStrokes.length === 0}>
                      <Undo2 className="w-4 h-4" />
                      Undo Draw
                    </Button>
                    <Button variant="outline" onClick={handleClearDrawings} disabled={drawStrokes.length === 0}>
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'filters' && (
                <motion.div
                  key="filters"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
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
                            style={{
                              filter: filter.id === 'none'
                                ? 'none'
                                : getFilterString({ ...defaultAdjustments, ...filter.adjustments }),
                            }}
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


                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">Animated Filters</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                      {animatedFilterPresets.map((filter) => (
                        <motion.button
                          key={filter.id}
                          className={cn(
                            'shrink-0 rounded-lg border px-3 py-2 text-left transition-all min-w-[112px]',
                            animatedFilter === filter.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background/70'
                          )}
                          onClick={() => handleApplyAnimatedFilter(filter.id)}
                          whileTap={{ scale: 0.96 }}
                        >
                          <p className="text-xs font-semibold">{filter.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">{filter.description}</p>
                        </motion.button>
                      ))}
                    </div>

                    {animatedFilter === 'ai' && (
                      <div className="mt-2 rounded-lg border border-border p-2 space-y-2 bg-muted/20 min-w-[280px]">
                        <Input
                          value={aiAnimatedPrompt}
                          onChange={(event) => setAiAnimatedPrompt(event.target.value)}
                          placeholder="E.g.: neon particles, fog, cinematic light leak"
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          className="w-full h-8"
                          disabled={isGeneratingAnimatedFilter}
                          onClick={handleGenerateAnimatedFilter}
                        >
                          {isGeneratingAnimatedFilter ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          Generate AI animation filter
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="ai"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
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

                      {activeAITool === 'background' ? (
                        <Button
                          variant="gradient"
                          className="w-full"
                          onClick={() => setShowBackgroundRemover(true)}
                        >
                          <Sparkles className="w-4 h-4" />
                          Start with AI
                        </Button>
                      ) : (
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
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'more' && (
                <motion.div
                  key="more"
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0 }}
                  className="p-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {moreMenuTools.map((tool) => (
                      <button
                        key={tool.id}
                        className={cn(
                          'h-20 rounded-xl border border-border bg-background transition-colors px-3 flex items-center gap-3',
                          'hover:bg-secondary/40'
                        )}
                        onClick={() => {
                          void handleQuickToolClick(tool.id);
                        }}
                        disabled={tool.id === 'sticker' && isCreatingSticker}
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {tool.id === 'sticker' && isCreatingSticker ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <tool.icon className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-left">
                          {tool.label}
                        </span>
                        {tool.id === 'sticker' && (
                          <Copy className="w-4 h-4 ml-auto text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border bg-background p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Corner Radius</span>
                      <span className="text-xs text-muted-foreground">{cornerRadius}px</span>
                    </div>
                    <Slider
                      value={[cornerRadius]}
                      min={0}
                      max={80}
                      step={1}
                      onValueChange={([value]) => {
                        if (!cornerRadiusInteractionRef.current) {
                          saveState();
                          cornerRadiusInteractionRef.current = true;
                        }
                        setCornerRadius(value ?? 0);
                      }}
                      onValueCommit={() => {
                        cornerRadiusInteractionRef.current = false;
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Safe area bottom padding */}
          <div className="safe-area-bottom bg-white dark:bg-black" />
          </div>
        </>
      )}

      {/* Background Remover Modal */}
      <AnimatePresence>
        {showBackgroundRemover && imageUrl && (
          <BackgroundRemover
            imageUrl={imageUrl}
            onClose={() => setShowBackgroundRemover(false)}
            onSave={async (resultUrl) => {
              saveState();
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This photo will be removed from the editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeletePhoto}>Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PhotoEditorScreen;
