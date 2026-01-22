import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Video, Wand2, Clock, Crown, Loader2, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VideoAIGeneratePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoGenerated: (videoUrl: string, duration: number) => void;
}

const videoStyles = [
  { id: 'cinematic', name: 'Sinematik', description: 'Film kalitesinde görsel' },
  { id: 'anime', name: 'Anime', description: 'Japon animasyon tarzı' },
  { id: 'realistic', name: 'Gerçekçi', description: 'Fotogerçekçi görünüm' },
  { id: 'artistic', name: 'Sanatsal', description: 'Artistik ve yaratıcı' },
  { id: '3d', name: '3D Render', description: '3D modelleme tarzı' },
  { id: 'vintage', name: 'Vintage', description: 'Retro film görünümü' },
];

const durationOptions = [
  { value: 3, label: '3 saniye' },
  { value: 5, label: '5 saniye' },
  { value: 10, label: '10 saniye' },
  { value: 15, label: '15 saniye (Pro+)' },
];

const VideoAIGeneratePanel: React.FC<VideoAIGeneratePanelProps> = ({
  isOpen,
  onClose,
  onVideoGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState([75]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  
  // Video preview states
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir açıklama girin');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedPreview(null);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      const { data, error } = await supabase.functions.invoke('ai-video-generate', {
        body: {
          prompt,
          style,
          duration,
          quality: quality[0],
        },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success && data?.frameUrl) {
        setProgress(100);
        setGeneratedPreview(data.frameUrl);
        toast.success('Video oluşturuldu!');
      } else {
        throw new Error(data?.error || 'Video oluşturulamadı');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Video oluşturma hatası');
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview animation logic
  useEffect(() => {
    if (isPreviewPlaying && generatedPreview) {
      startTimeRef.current = performance.now() - (previewTime * 1000);
      
      const animate = (currentTime: number) => {
        const elapsed = (currentTime - startTimeRef.current) / 1000;
        
        if (elapsed >= duration) {
          setPreviewTime(0);
          setIsPreviewPlaying(false);
          return;
        }
        
        setPreviewTime(elapsed);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPreviewPlaying, duration, generatedPreview]);

  const handlePlayPause = () => {
    if (isPreviewPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const handleRestart = () => {
    setPreviewTime(0);
    setIsPreviewPlaying(true);
  };

  const handleSeek = (value: number[]) => {
    setPreviewTime(value[0]);
    if (isPreviewPlaying) {
      startTimeRef.current = performance.now() - (value[0] * 1000);
    }
  };

  const toggleFullscreen = () => {
    if (!previewRef.current) return;
    
    if (!isFullscreen) {
      if (previewRef.current.requestFullscreen) {
        previewRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAddToTimeline = () => {
    if (generatedPreview) {
      onVideoGenerated(generatedPreview, duration);
      toast.success('Video zaman çizelgesine eklendi');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              AI Video Üretimi
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" />
                PRO
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Metinden video oluştur</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Açıklaması</Label>
          <Textarea
            placeholder="Örn: Gün batımında sahilde yürüyen bir çift, sinematik kamera hareketi ile..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            Ne kadar detaylı açıklarsanız, o kadar iyi sonuç alırsınız
          </p>
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Stili</Label>
          <div className="grid grid-cols-3 gap-2">
            {videoStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                disabled={isGenerating}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  style === s.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-border hover:border-purple-500/50'
                }`}
              >
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Video Süresi
          </Label>
          <Select
            value={duration.toString()}
            onValueChange={(v) => setDuration(parseInt(v))}
            disabled={isGenerating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quality Slider */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center justify-between">
            <span>Kalite</span>
            <span className="text-muted-foreground">{quality[0]}%</span>
          </Label>
          <Slider
            value={quality}
            onValueChange={setQuality}
            min={50}
            max={100}
            step={5}
            disabled={isGenerating}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Hızlı</span>
            <span>Yüksek Kalite</span>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Video oluşturuluyor...</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              AI videonuzu oluşturuyor, bu birkaç dakika sürebilir...
            </p>
          </div>
        )}

        {/* Generated Preview with Video Player */}
        <AnimatePresence>
          {generatedPreview && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-500" />
                Video Önizleme
              </Label>
              
              <div 
                ref={previewRef}
                className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-500/30 bg-black group"
              >
                {/* Video Frame with Animation Effects */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    scale: isPreviewPlaying ? [1, 1.02, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isPreviewPlaying ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  <img
                    src={generatedPreview}
                    alt="Generated video preview"
                    className="w-full h-full object-cover"
                    style={{
                      filter: isPreviewPlaying 
                        ? `brightness(${1 + Math.sin(previewTime * 0.5) * 0.05})` 
                        : 'none'
                    }}
                  />
                </motion.div>
                
                {/* Cinematic Overlay Effect */}
                {isPreviewPlaying && (
                  <motion.div 
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
                    {/* Film grain effect */}
                    <div 
                      className="absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
                        animation: 'noise 0.2s steps(2) infinite'
                      }}
                    />
                  </motion.div>
                )}

                {/* Play/Pause Overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer transition-opacity"
                  onClick={handlePlayPause}
                >
                  <AnimatePresence>
                    {!isPreviewPlaying && (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="p-5 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
                      >
                        <Play className="w-10 h-10 text-white fill-white" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <Slider
                      value={[previewTime]}
                      onValueChange={handleSeek}
                      min={0}
                      max={duration}
                      step={0.1}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={handlePlayPause}
                      >
                        {isPreviewPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={handleRestart}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      <span className="text-white text-xs font-mono">
                        {formatTime(previewTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={toggleFullscreen}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Style Badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500/80 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  {videoStyles.find(s => s.id === style)?.name}
                </div>

                {/* Quality Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                  {quality[0]}% Kalite
                </div>
              </div>

              {/* Preview Info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                <span>Süre: {duration} saniye</span>
                <span>Stil: {videoStyles.find(s => s.id === style)?.name}</span>
                <span className="text-green-500 font-medium">✓ Hazır</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {generatedPreview && !isGenerating ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setGeneratedPreview(null);
                  setProgress(0);
                }}
              >
                Yeniden Oluştur
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleAddToTimeline}
              >
                <Video className="w-4 h-4 mr-2" />
                Videoya Ekle
              </Button>
            </>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Video Oluştur
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          AI Video üretimi Pro abonelik gerektirir. Her video için kredi kullanılır.
        </p>
      </div>
    </motion.div>
  );
};

export default VideoAIGeneratePanel;
