import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Brush, Eraser, ZoomIn, ZoomOut, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundRemoverProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (resultUrl: string) => void;
}

type Tool = 'brush' | 'eraser';

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

  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);

  // Load and process image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      initializeCanvas(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const initializeCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    // Set canvas size based on image
    const maxSize = 800;
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
    const width = img.width * scale;
    const height = img.height * scale;

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

  const processWithAI = async () => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const canvas = canvasRef.current;
      if (!canvas || !originalImage) {
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
        body: { imageBase64 }
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'AI işlemi başarısız oldu');
      }

      if (!data?.success || !data?.imageUrl) {
        throw new Error(data?.error || 'Arka plan kaldırılamadı');
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
        
        // Draw checkerboard pattern for transparency
        const patternSize = 10;
        for (let y = 0; y < canvas.height; y += patternSize) {
          for (let x = 0; x < canvas.width; x += patternSize) {
            ctx.fillStyle = (x / patternSize + y / patternSize) % 2 === 0 ? '#e0e0e0' : '#ffffff';
            ctx.fillRect(x, y, patternSize, patternSize);
          }
        }

        ctx.drawImage(resultImg, 0, 0, canvas.width, canvas.height);

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
        toast.success('AI arka plan kaldırma tamamlandı! Fırça ile düzeltebilirsiniz.');
      };

      resultImg.onerror = () => {
        throw new Error('Sonuç resmi yüklenemedi');
      };

      resultImg.src = data.imageUrl;

    } catch (error) {
      console.error('AI processing error:', error);
      setIsProcessing(false);
      setProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
      
      if (errorMessage.includes('Rate limit')) {
        toast.error('Çok fazla istek gönderildi. Lütfen biraz bekleyin.');
      } else if (errorMessage.includes('credits') || errorMessage.includes('402')) {
        toast.error('API kredileri tükendi. Lütfen kredi ekleyin.');
      } else {
        toast.error(`AI hatası: ${errorMessage}`);
      }
    }
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
    
    // Draw checkerboard pattern for transparency
    const patternSize = 10;
    for (let y = 0; y < canvas.height; y += patternSize) {
      for (let x = 0; x < canvas.width; x += patternSize) {
        ctx.fillStyle = (x / patternSize + y / patternSize) % 2 === 0 ? '#e0e0e0' : '#ffffff';
        ctx.fillRect(x, y, patternSize, patternSize);
      }
    }

    // Draw image with mask
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const maskValue = maskData.data[i]; // R channel of mask
      if (maskValue < 128) {
        // Transparent pixel
        imageData.data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
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
    if (!maskCanvas || !isProcessed) return;

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
  }, [activeTool, brushSize, lastPos, isProcessed]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isProcessed) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (coords) {
      setIsDrawing(true);
      setLastPos(coords);
      draw(coords.x, coords.y);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isProcessed) return;
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
      setMaskData(null);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new canvas for export with transparency
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (exportCtx && originalImage && maskCanvasRef.current) {
      exportCtx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
      
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
    onSave(resultUrl);
    toast.success('Fotoğraf kaydedildi!');
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
          <h1 className="text-sm font-semibold text-foreground">Arka Plan Kaldır</h1>
        </div>

        <div className="flex items-center gap-2">
          {isProcessed && (
            <>
              <Button variant="iconGhost" size="iconSm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="gradient" size="sm" onClick={handleSave}>
                <Download className="w-4 h-4" />
                Kaydet
              </Button>
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
              <p className="text-white text-sm">Arka plan kaldırılıyor... %{progress}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start button */}
        {!isProcessing && !isProcessed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="gradient"
              size="lg"
              onClick={processWithAI}
              className="shadow-2xl"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI ile Arka Planı Kaldır
            </Button>
          </div>
        )}
      </div>

      {/* Tools panel */}
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
              Geri Getir
            </Button>
            <Button
              variant={activeTool === 'eraser' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('eraser')}
            >
              <Eraser className="w-4 h-4 mr-1" />
              Sil
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
              <span className="text-xs text-muted-foreground">Fırça Boyutu</span>
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
            💡 Fırça ile geri getirmek veya silgi ile kaldırmak için çizin
          </p>
        </motion.div>
      )}

      {/* Safe area */}
      <div className="safe-area-bottom bg-card" />
    </motion.div>
  );
};

export default BackgroundRemover;
