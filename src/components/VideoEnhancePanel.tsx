import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Wand2, 
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AIToolsService } from '@/services/AIToolsService';
import { toast } from 'sonner';

type EnhanceMode = 'enhance' | 'denoise' | 'upscale';

interface EnhanceModeOption {
  id: EnhanceMode;
  label: string;
  description: string;
  icon: typeof Wand2;
}

const enhanceModes: EnhanceModeOption[] = [
  { 
    id: 'enhance', 
    label: 'General Enhancement', 
    description: 'Optimize color, sharpness, and contrast',
    icon: Wand2 
  },
  { 
    id: 'denoise', 
    label: 'Noise Reduction', 
    description: 'Clean video noise and grain',
    icon: Sparkles 
  },
  { 
    id: 'upscale', 
    label: 'Resolution Upscaling', 
    description: 'Upscale low-quality visuals',
    icon: ImageIcon 
  },
];

interface VideoEnhancePanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
  onEnhanceComplete?: (enhancedImageUrl: string) => void;
}

export const VideoEnhancePanel = ({
  videoRef,
  onClose,
  onEnhanceComplete
}: VideoEnhancePanelProps) => {
  const [selectedMode, setSelectedMode] = useState<EnhanceMode>('enhance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const captureAndEnhance = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      toast.error('Video not found');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultImageUrl(null);
    setProgress(0);

    try {
      // Pause video
      video.pause();
      setProgress(10);

      // Capture current frame
      const frameBase64 = await AIToolsService.captureVideoFrame(video);
      setOriginalImageUrl(frameBase64);
      setProgress(30);

      // Send to AI for enhancement
      const result = await AIToolsService.processVideoTool(selectedMode, frameBase64);
      setProgress(90);

      if (!result.success) {
        throw new Error(result.error || 'Enhancement failed');
      }

      if (!result.outputUrl) {
        throw new Error('Enhanced image could not be retrieved');
      }

      setResultImageUrl(result.outputUrl);
      setProgress(100);
      toast.success('Image enhanced successfully!');

    } catch (err) {
      console.error('Enhance error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [videoRef, selectedMode]);

  const handleDownload = () => {
    if (!resultImageUrl) return;
    
    const link = document.createElement('a');
    link.href = resultImageUrl;
    link.download = `enhanced-frame-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded');
  };

  const handleApply = () => {
    if (resultImageUrl && onEnhanceComplete) {
      onEnhanceComplete(resultImageUrl);
    }
    onClose();
  };

  const getModeLabel = (mode: EnhanceMode) => {
    return enhanceModes.find(m => m.id === mode)?.label || mode;
  };

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
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-medium">AI Video Enhancement</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mode Selection */}
        {!isProcessing && !resultImageUrl && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enhance the current video frame with AI. Choose a mode:
            </p>
            
            <div className="space-y-2">
              {enhanceModes.map((mode) => (
                <div
                  key={mode.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMode === mode.id 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                  onClick={() => setSelectedMode(mode.id)}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedMode === mode.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <mode.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  </div>
                  {selectedMode === mode.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              ))}
            </div>

            <Button 
              variant="gradient" 
              className="w-full gap-2"
              onClick={captureAndEnhance}
            >
              <Sparkles className="w-4 h-4" />
              Capture Frame and Enhance
            </Button>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Enhancing...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {progress < 30 ? 'Capturing frame' : 
                 progress < 90 ? `AI ${getModeLabel(selectedMode)} uyguluyor` : 
                 'Finalizing'}
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-1">
                %{Math.round(progress)}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isProcessing && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">An Error Occurred</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={captureAndEnhance}>
              Try Again
            </Button>
          </div>
        )}

        {/* Result Display */}
        {resultImageUrl && !isProcessing && (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {showComparison && originalImageUrl ? (
                <div className="relative w-full h-full">
                  {/* Before/After comparison */}
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 overflow-hidden border-r-2 border-white/50">
                      <img 
                        src={originalImageUrl} 
                        alt="Original" 
                        className="w-[200%] h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Before
                      </span>
                    </div>
                    <div className="w-1/2 overflow-hidden">
                      <img 
                        src={resultImageUrl} 
                        alt="Enhanced" 
                        className="w-[200%] h-full object-cover ml-[-100%]"
                      />
                      <span className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Sonra
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <img 
                  src={resultImageUrl} 
                  alt="Enhanced frame" 
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant={showComparison ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Hide Comparison' : 'Before/After Compare'}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              ✨ {getModeLabel(selectedMode)} applied successfully
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {resultImageUrl && !isProcessing && (
        <div className="flex gap-2 pt-4 border-t border-border mt-4">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              setResultImageUrl(null);
              setOriginalImageUrl(null);
              setError(null);
            }}
          >
            New Enhancement
          </Button>
        </div>
      )}
    </motion.div>
  );
};
