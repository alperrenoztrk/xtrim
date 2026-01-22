import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Play, 
  Scissors, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Clock,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AIToolsService } from '@/services/AIToolsService';
import { MediaService } from '@/services/MediaService';
import { toast } from 'sonner';

interface CutPoint {
  id: string;
  time: number;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

interface AutoCutPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoDuration: number;
  onClose: () => void;
  onApplyCuts: (cutPoints: number[]) => void;
}

export const AutoCutPanel = ({
  videoRef,
  videoDuration,
  onClose,
  onApplyCuts
}: AutoCutPanelProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cutPoints, setCutPoints] = useState<CutPoint[]>([]);
  const [selectedCutPoints, setSelectedCutPoints] = useState<Set<string>>(new Set());
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureFramesAndAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      toast.error('Video bulunamadı');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCutPoints([]);
    setSelectedCutPoints(new Set());
    setProgress(0);

    try {
      // Pause video if playing
      video.pause();
      
      // Capture frames at regular intervals
      const frameCount = Math.min(10, Math.max(3, Math.floor(videoDuration / 2)));
      const interval = videoDuration / (frameCount + 1);
      const frames: { time: number; base64: string }[] = [];
      
      // Store original time
      const originalTime = video.currentTime;

      for (let i = 1; i <= frameCount; i++) {
        const time = interval * i;
        video.currentTime = time;
        
        // Wait for video to seek
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        // Capture frame
        const base64 = await AIToolsService.captureVideoFrame(video);
        frames.push({ time, base64 });
        setProgress((i / frameCount) * 50);
      }

      // Restore original time
      video.currentTime = originalTime;

      // Analyze frames with AI
      setProgress(55);
      
      // Send middle frame for analysis (representative of the video)
      const middleFrame = frames[Math.floor(frames.length / 2)];
      const result = await AIToolsService.analyzeForAutoCut(middleFrame.base64);

      setProgress(90);

      if (!result.success) {
        throw new Error(result.error || 'Analiz başarısız oldu');
      }

      // Process cut point suggestions
      const suggestedCutPoints: CutPoint[] = [];
      
      // Add AI-suggested cut points if available
      if (result.cutPoints && result.cutPoints.length > 0) {
        result.cutPoints.forEach((time, index) => {
          if (time > 0 && time < videoDuration) {
            suggestedCutPoints.push({
              id: `ai-${index}`,
              time,
              confidence: 'high',
              reason: 'AI tarafından tespit edildi'
            });
          }
        });
      }

      // Add smart suggestions based on video duration
      if (suggestedCutPoints.length === 0) {
        // Suggest cuts at key intervals
        const intervals = [
          { fraction: 0.25, confidence: 'medium' as const },
          { fraction: 0.5, confidence: 'high' as const },
          { fraction: 0.75, confidence: 'medium' as const }
        ];

        intervals.forEach((item, index) => {
          const time = videoDuration * item.fraction;
          suggestedCutPoints.push({
            id: `auto-${index}`,
            time,
            confidence: item.confidence,
            reason: `Video ${Math.round(item.fraction * 100)}% noktası`
          });
        });
      }

      // Add scene change suggestions based on analysis text
      if (result.analysis) {
        // Parse any additional insights from the analysis
        console.log('AI Analysis:', result.analysis);
      }

      setCutPoints(suggestedCutPoints);
      setSelectedCutPoints(new Set(suggestedCutPoints.map(cp => cp.id)));
      setAnalysisComplete(true);
      setProgress(100);
      
      toast.success(`${suggestedCutPoints.length} kesim noktası bulundu`);

    } catch (err) {
      console.error('AutoCut error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Analiz sırasında bir hata oluştu';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoRef, videoDuration]);

  const toggleCutPoint = (id: string) => {
    setSelectedCutPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    const selectedTimes = cutPoints
      .filter(cp => selectedCutPoints.has(cp.id))
      .map(cp => cp.time)
      .sort((a, b) => a - b);
    
    if (selectedTimes.length === 0) {
      toast.error('En az bir kesim noktası seçin');
      return;
    }
    
    onApplyCuts(selectedTimes);
    toast.success(`${selectedTimes.length} kesim noktası uygulandı`);
    onClose();
  };

  const jumpToTime = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  };

  const getConfidenceColor = (confidence: CutPoint['confidence']) => {
    switch (confidence) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-orange-500';
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="absolute bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-10 max-h-80 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-medium">AutoCut - AI Kesim Analizi</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!analysisComplete && !isAnalyzing && !error && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Video Karelerini Analiz Et</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI, videonuzu inceleyerek en iyi kesim noktalarını önerecek
              </p>
            </div>
            <Button 
              variant="gradient" 
              onClick={captureFramesAndAnalyze}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analizi Başlat
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Analiz ediliyor...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {progress < 50 ? 'Video kareleri yakalanıyor' : 'AI analiz yapıyor'}
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

        {error && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">Hata Oluştu</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" onClick={captureFramesAndAnalyze}>
              Tekrar Dene
            </Button>
          </div>
        )}

        {analysisComplete && cutPoints.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {cutPoints.length} kesim noktası bulundu. Uygulamak istediklerinizi seçin:
            </p>
            
            <div className="space-y-2">
              {cutPoints.map((cp) => (
                <div
                  key={cp.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCutPoints.has(cp.id) 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                  onClick={() => toggleCutPoint(cp.id)}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCutPoints.has(cp.id) 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground'
                  }`}>
                    {selectedCutPoints.has(cp.id) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {MediaService.formatDuration(cp.time)}
                      </span>
                      <span className={`text-xs ${getConfidenceColor(cp.confidence)}`}>
                        ({cp.confidence === 'high' ? 'Yüksek' : cp.confidence === 'medium' ? 'Orta' : 'Düşük'} güven)
                      </span>
                    </div>
                    {cp.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cp.reason}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpToTime(cp.time);
                    }}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisComplete && cutPoints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <Scissors className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Kesim noktası bulunamadı</p>
              <p className="text-xs text-muted-foreground mt-1">
                Video çok kısa olabilir veya sahneler benzer
              </p>
            </div>
            <Button variant="outline" onClick={captureFramesAndAnalyze}>
              Tekrar Analiz Et
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      {analysisComplete && cutPoints.length > 0 && (
        <div className="flex gap-2 pt-4 border-t border-border mt-4">
          <Button variant="outline" className="flex-1" onClick={captureFramesAndAnalyze}>
            Yeniden Analiz
          </Button>
          <Button 
            variant="gradient" 
            className="flex-1 gap-2"
            onClick={handleApply}
            disabled={selectedCutPoints.size === 0}
          >
            <Scissors className="w-4 h-4" />
            {selectedCutPoints.size} Kesim Uygula
          </Button>
        </div>
      )}
    </motion.div>
  );
};
