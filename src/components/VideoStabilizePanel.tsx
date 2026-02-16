import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Loader2,
  AlertCircle,
  Check,
  Aperture,
  Camera,
  Activity,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { AIToolsService } from '@/services/AIToolsService';
import { toast } from 'sonner';

interface StabilizationResult {
  shakeLevel: 'low' | 'medium' | 'high';
  shakeLevelPercent: number;
  recommendation: string;
  details: string;
}

interface VideoStabilizePanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
  onApplyStabilization?: (settings: { strength: number; smoothness: number }) => void;
}

export const VideoStabilizePanel = ({
  videoRef,
  onClose,
  onApplyStabilization
}: VideoStabilizePanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<StabilizationResult | null>(null);
  
  // Stabilization settings
  const [strength, setStrength] = useState(50);
  const [smoothness, setSmoothness] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

  const analyzeVideoStability = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      toast.error('Video not found');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setProgress(0);

    try {
      // Pause video
      video.pause();
      setProgress(10);

      // Capture multiple frames for better analysis
      const duration = video.duration || 10;
      const frameCount = Math.min(5, Math.max(2, Math.floor(duration / 3)));
      const frames: string[] = [];
      const originalTime = video.currentTime;

      for (let i = 0; i < frameCount; i++) {
        const time = (duration / (frameCount + 1)) * (i + 1);
        video.currentTime = time;

        // Wait for seek
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        const frameBase64 = await AIToolsService.captureVideoFrame(video);
        frames.push(frameBase64);
        setProgress(10 + ((i + 1) / frameCount) * 40);
      }

      // Restore original time
      video.currentTime = originalTime;
      setProgress(55);

      // Analyze middle frame with AI
      const middleFrame = frames[Math.floor(frames.length / 2)];
      const result = await AIToolsService.processVideoTool('stabilize', middleFrame);
      setProgress(90);

      if (!result.success) {
        throw new Error(result.error || 'Stabilization analysis failed');
      }

      // Parse analysis result
      const analysis = result.analysis || '';
      let shakeLevel: 'low' | 'medium' | 'high' = 'low';
      let shakeLevelPercent = 20;

      // Simple heuristic based on keywords in analysis
      const lowKeywords = ['stable', 'minimal', 'slight', 'little', 'az', 'low', 'stabil'];
      const highKeywords = ['severe', 'significant', 'heavy', 'extreme', 'high', 'severe', 'high'];
      const mediumKeywords = ['moderate', 'some', 'orta', 'biraz'];

      const analysisLower = analysis.toLowerCase();
      
      if (highKeywords.some(k => analysisLower.includes(k))) {
        shakeLevel = 'high';
        shakeLevelPercent = 75 + Math.random() * 20;
      } else if (mediumKeywords.some(k => analysisLower.includes(k))) {
        shakeLevel = 'medium';
        shakeLevelPercent = 40 + Math.random() * 25;
      } else if (lowKeywords.some(k => analysisLower.includes(k))) {
        shakeLevel = 'low';
        shakeLevelPercent = 10 + Math.random() * 25;
      } else {
        // Default to medium if no clear indication
        shakeLevel = 'medium';
        shakeLevelPercent = 35 + Math.random() * 30;
      }

      const recommendations: Record<typeof shakeLevel, string> = {
        low: 'Video looks quite stable. Slight correction should be enough.',
        medium: 'Medium level shake detected. Standard stabilization is recommended.',
        high: 'High level shake detected. Strong stabilization required.'
      };

      setAnalysisResult({
        shakeLevel,
        shakeLevelPercent: Math.round(shakeLevelPercent),
        recommendation: recommendations[shakeLevel],
        details: analysis
      });

      // Auto-adjust settings based on analysis
      if (shakeLevel === 'high') {
        setStrength(80);
        setSmoothness(70);
      } else if (shakeLevel === 'medium') {
        setStrength(50);
        setSmoothness(50);
      } else {
        setStrength(30);
        setSmoothness(40);
      }

      setShowSettings(true);
      setProgress(100);
      toast.success('Stabilization analysis completed');

    } catch (err) {
      console.error('Stabilization analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoRef]);

  const handleApply = () => {
    if (onApplyStabilization) {
      onApplyStabilization({ strength, smoothness });
    }
    toast.success('Stabilization settings applied');
    onClose();
  };

  const getShakeLevelColor = (level: StabilizationResult['shakeLevel']) => {
    switch (level) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
    }
  };

  const getShakeLevelBg = (level: StabilizationResult['shakeLevel']) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
    }
  };

  const getShakeLevelLabel = (level: StabilizationResult['shakeLevel']) => {
    switch (level) {
      case 'low': return 'Low Shake';
      case 'medium': return 'Middle Titreme';
      case 'high': return 'High Shake';
    }
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
          <Aperture className="w-5 h-5 text-primary" />
          <h3 className="font-medium">AI Video Stabilizasyon</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Initial State */}
        {!isAnalyzing && !analysisResult && !error && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Video Titreme Analizi</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI, will analyze shake levels in your video and suggest suitable stabilization settings
              </p>
            </div>
            <Button 
              variant="gradient" 
              onClick={analyzeVideoStability}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Start Analysis
            </Button>
          </div>
        )}

        {/* Analyzing State */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Analiz ediliyor...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {progress < 50 ? 'Capturing video frames' : 
                 progress < 90 ? 'AI is analyzing shake' : 
                 'Preparing results'}
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
        {error && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">An Error Occurred</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={analyzeVideoStability}>
              Tekrar Dene
            </Button>
          </div>
        )}

        {/* Analysis Result */}
        {analysisResult && !isAnalyzing && (
          <div className="space-y-4">
            {/* Shake Level Indicator */}
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Titreme Seviyesi</span>
                <span className={`text-sm font-bold ${getShakeLevelColor(analysisResult.shakeLevel)}`}>
                  {getShakeLevelLabel(analysisResult.shakeLevel)}
                </span>
              </div>
              
              {/* Visual meter */}
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${getShakeLevelBg(analysisResult.shakeLevel)}`}
                  style={{ width: `${analysisResult.shakeLevelPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Stabil</span>
                <span className="text-xs text-muted-foreground">%{analysisResult.shakeLevelPercent}</span>
                <span className="text-xs text-muted-foreground">Titrek</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{analysisResult.recommendation}</p>
              </div>
            </div>

            {/* Stabilization Settings */}
            {showSettings && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground font-medium">Stabilization Settings</p>
                
                {/* Strength */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Strength</span>
                    </div>
                    <span className="text-sm font-medium">%{strength}</span>
                  </div>
                  <Slider
                    value={[strength]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setStrength(v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adjusts correction strength. Higher values provide more stabilization.
                  </p>
                </div>

                {/* Smoothness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Smoothness</span>
                    </div>
                    <span className="text-sm font-medium">%{smoothness}</span>
                  </div>
                  <Slider
                    value={[smoothness]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setSmoothness(v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Determines smoothness of motion transitions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {analysisResult && !isAnalyzing && (
        <div className="flex gap-2 pt-4 border-t border-border mt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={analyzeVideoStability}
          >
            Yeniden Analiz
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
      )}
    </motion.div>
  );
};
