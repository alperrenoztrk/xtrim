import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Brush, Eraser, ZoomIn, ZoomOut, RotateCcw, Sparkles, MessageSquare, Paintbrush, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionService } from '@/services/SubscriptionService';

interface BackgroundRemoverProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (resultUrl: string) => Promise<void> | void;
}

type Tool = 'brush' | 'eraser';
type RemovalMode = 'auto' | 'brush' | 'prompt';

const BackgroundRemover = ({ imageUrl, onClose, onSave }: BackgroundRemoverProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isProcessed, setIsProcessed] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('eraser');
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [removalMode, setRemovalMode] = useState<RemovalMode>('auto');
  const [promptText, setPromptText] = useState('');
  const [isBrushMode, setIsBrushMode] = useState(false);

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);

  // Load and process image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      setProcessedImage(null);
      initializeCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // Keep original upload dimensions to avoid any quality loss.
    const width = img.width;
    const height = img.height;

    canvas.width = width;
    canvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;

    // Draw original image
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
    }

    // Initialize mask (white = keep, black = remove)
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'white';
      maskCtx.fillRect(0, 0, width, height);
    }
  };

  const processWithAI = async (customPrompt?: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('AI kullanım kotanız doldu. Lütfen planınızı yükseltin ya da yarını bekleyin.');
      }

      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !originalImage || !maskCanvas) {
        throw new Error('Canvas not ready');
      }

      // Convert image to base64
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/png');

      // Simulate progress while waiting
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('remove-background', {
        body: { 
          imageBase64,
          customPrompt: customPrompt || undefined
        }
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'AI operation failed');
      }

      if (!data?.success || !data?.imageUrl) {
        throw new Error(data?.error || 'Background could not be removed');
      }

      setProgress(100);

      // Load the result image
      const resultImg = new Image();
      resultImg.crossOrigin = 'anonymous';
      resultImg.onload = () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;

        // Draw result to main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);
        setProcessedImage(resultImg);

        // Update mask based on result transparency
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.fillStyle = 'white';
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          
          // Extract alpha channel from result
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);
            const resultData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
            const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
            
            for (let i = 0; i < resultData.data.length; i += 4) {
              if (resultData.data[i + 3] < 128) {
                maskData.data[i] = 0;
                maskData.data[i + 1] = 0;
                maskData.data[i + 2] = 0;
              }
            }
            maskCtx.putImageData(maskData, 0, 0);
          }
        }

        setIsProcessing(false);
        setIsProcessed(true);
        setIsBrushMode(false);
        toast.success('AI background removal completed! You can refine it with the brush.');
      };

      resultImg.onerror = () => {
        throw new Error('Result image could not be loaded');
      };

      resultImg.src = data.imageUrl;

    } catch (error) {
      console.error('AI processing error:', error);
      setIsProcessing(false);
      setProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      if (errorMessage.includes('Rate limit')) {
        toast.error('Too many requests sent. Please wait a bit.');
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('API credits are exhausted. Please add credits.');
      } else {
        toast.error(`AI error: ${errorMessage}`);
      }
    }
  };

  const startBrushMode = () => {
    setIsBrushMode(true);
    setActiveTool('eraser');
    setProcessedImage(null);
    
    // Clear mask to white (keep everything)
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        maskCtx.fillStyle = 'white';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
    
    toast.info('Paint the areas you want to remove, then click "Apply".');
  };

  const applyBrushMask = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    // Apply mask to create result
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image with mask applied
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const maskValue = maskData.data[i];
      if (maskValue < 128) {
        imageData.data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setIsProcessed(true);
    setIsBrushMode(false);
    toast.success('Background manually removed!');
  };

  const applyMaskToCanvas = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!ctx || !maskCtx) return;

    // Redraw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw original image first
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    if (isBrushMode) {
      // In brush mode, show the mask overlay
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        const maskValue = maskData.data[i];
        if (maskValue < 128) {
          // Show removed area with red tint
          imageData.data[i] = Math.min(255, imageData.data[i] + 100);
          imageData.data[i + 1] = Math.max(0, imageData.data[i + 1] - 50);
          imageData.data[i + 2] = Math.max(0, imageData.data[i + 2] - 50);
          imageData.data[i + 3] = 180;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    } else if (isProcessed) {
      // Draw image with mask
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      for (let i = 0; i < imageData.data.length; i += 4) {
        const maskValue = maskData.data[i];
        if (maskValue < 128) {
          imageData.data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) / zoom,
      y: (clientY - rect.top) * (canvas.height / rect.height) / zoom,
    };
  };

  const draw = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas || (!isProcessed && !isBrushMode)) return;

    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fillStyle = activeTool === 'brush' ? 'white' : 'black';
    maskCtx.fill();

    if (lastPos) {
      maskCtx.beginPath();
      maskCtx.moveTo(lastPos.x, lastPos.y);
      maskCtx.lineTo(x, y);
      maskCtx.strokeStyle = activeTool === 'brush' ? 'white' : 'black';
      maskCtx.lineWidth = brushSize;
      maskCtx.lineCap = 'round';
      maskCtx.stroke();
    }

    applyMaskToCanvas();
  }, [activeTool, brushSize, lastPos, isProcessed, isBrushMode]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isProcessed && !isBrushMode) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) {
      setIsDrawing(true);
      setLastPos(coords);
      draw(coords.x, coords.y);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || (!isProcessed && !isBrushMode)) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) {
      draw(coords.x, coords.y);
      setLastPos(coords);
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const handleReset = () => {
    if (originalImage) {
      initializeCanvas(originalImage);
      setIsProcessed(false);
      setIsBrushMode(false);
      setProcessedImage(null);
      setMaskData(null);
      setPromptText('');
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new canvas for export with transparency
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    const baseImage = processedImage || originalImage;

    if (exportCtx && baseImage && maskCanvasRef.current) {
      exportCtx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      
      const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      const maskCtx = maskCanvasRef.current.getContext('2d');
      
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (maskData.data[i] < 128) {
            imageData.data[i + 3] = 0;
          }
        }
        
        exportCtx.putImageData(imageData, 0, 0);
      }
    }

    const resultUrl = exportCanvas.toDataURL('image/png');
    await onSave(resultUrl);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground">Remove Background</h1>
        </div>

        <div className="flex items-center gap-2">
          {(isProcessed || isBrushMode) && (
            <>
              <Button variant="iconGhost" size="iconSm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              {isProcessed && (
                <Button variant="gradient" size="sm" onClick={handleSave}>
                  <Download className="w-4 h-4" />
                  Save
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Canvas area */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-4"
      >
        <div 
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          className="transition-transform"
        >
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full rounded-lg cursor-crosshair touch-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>
        <canvas ref={maskCanvasRef} className="hidden" />

        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-white text-sm">Removing background... %{progress}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode selection - show when not processing and not processed */}
        {!isProcessing && !isProcessed && !isBrushMode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 mx-4 max-w-md w-full shadow-2xl border border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
                Background Removal Method
              </h2>
              
              <Tabs value={removalMode} onValueChange={(v) => setRemovalMode(v as RemovalMode)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="auto" className="text-xs">
                    <Wand2 className="w-3 h-3 mr-1" />
                    Automatic
                  </TabsTrigger>
                  <TabsTrigger value="brush" className="text-xs">
                    <Paintbrush className="w-3 h-3 mr-1" />
                    Brush
                  </TabsTrigger>
                  <TabsTrigger value="prompt" className="text-xs">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Description
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="auto" className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    AI automatically detects the main subject and removes the background.
                  </p>
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={() => processWithAI()}
                    className="w-full"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start with AI
                  </Button>
                </TabsContent>

                <TabsContent value="brush" className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Paint the areas you want to remove with the brush.
                  </p>
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={startBrushMode}
                    className="w-full"
                  >
                    <Paintbrush className="w-5 h-5 mr-2" />
                    Start Painting with Brush
                  </Button>
                </TabsContent>

                <TabsContent value="prompt" className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Describe which areas you want AI to remove.
                  </p>
                  <Textarea
                    placeholder="Example: Keep only the person, remove all buildings and trees in the background..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <Button
                    variant="gradient"
                    size="lg"
                    onClick={() => processWithAI(promptText)}
                    disabled={!promptText.trim()}
                    className="w-full"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Remove with Description
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>

      {/* Brush mode tools */}
      {isBrushMode && (
        <motion.div
          className="bg-card border-t border-border p-4 space-y-4"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={activeTool === 'eraser' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('eraser')}
            >
              <Eraser className="w-4 h-4 mr-1" />
              Remove
            </Button>
            <Button
              variant={activeTool === 'brush' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('brush')}
            >
              <Brush className="w-4 h-4 mr-1" />
              Undo
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant="outline"
              size="iconSm"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="iconSm"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Brush Size</span>
              <span className="text-xs font-medium text-foreground">{brushSize}px</span>
            </div>
            <Slider
              value={[brushSize]}
              min={5}
              max={100}
              step={1}
              onValueChange={([value]) => setBrushSize(value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
              Cancel
            </Button>
            <Button variant="gradient" size="sm" onClick={applyBrushMask} className="flex-1">
              <Sparkles className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            🎨 Red areas show regions that will be removed
          </p>
        </motion.div>
      )}

      {/* Post-processing tools */}
      {isProcessed && (
        <motion.div
          className="bg-card border-t border-border p-4 space-y-4"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
        >
          {/* Tool buttons */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={activeTool === 'brush' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('brush')}
            >
              <Brush className="w-4 h-4 mr-1" />
              Restore
            </Button>
            <Button
              variant={activeTool === 'eraser' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('eraser')}
            >
              <Eraser className="w-4 h-4 mr-1" />
              Erase
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant="outline"
              size="iconSm"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="iconSm"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Brush size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Brush Size</span>
              <span className="text-xs font-medium text-foreground">{brushSize}px</span>
            </div>
            <Slider
              value={[brushSize]}
              min={5}
              max={100}
              step={1}
              onValueChange={([value]) => setBrushSize(value)}
            />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 Draw to restore with brush or remove with eraser
          </p>
        </motion.div>
      )}

      {/* Safe area */}
      <div className="safe-area-bottom bg-card" />
    </motion.div>
  );
};

export default BackgroundRemover;
