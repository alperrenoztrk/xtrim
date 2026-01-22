import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Video, Wand2, Clock, Crown, Loader2, Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { nativeExportService } from '@/services/NativeExportService';

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
  const [videoFrames, setVideoFrames] = useState<Array<{frameIndex: number; imageUrl: string; timestamp: number}>>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    setVideoFrames([]);
    setGeneratedVideoUrl(null);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + Math.random() * 10;
        });
      }, 800);

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

      if (data?.success) {
        setProgress(90);
        
        // Store all frames for video generation
        if (data.frames && data.frames.length > 0) {
          setVideoFrames(data.frames);
          setGeneratedPreview(data.primaryFrame || data.frames[0].imageUrl);
          
          // Auto-generate video from frames
          toast.loading('Video oluşturuluyor...');
          await generateVideoFromFrames(data.frames, data.animationSettings);
          toast.dismiss();
        } else if (data.frameUrl) {
          setGeneratedPreview(data.frameUrl);
          setVideoFrames([{ frameIndex: 0, imageUrl: data.frameUrl, timestamp: 0 }]);
          await generateVideoFromFrames([{ frameIndex: 0, imageUrl: data.frameUrl, timestamp: 0 }], data.animationSettings);
        }
        
        setProgress(100);
        toast.success('Video başarıyla oluşturuldu!');
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

  // Generate animated video from frames using Canvas API
  const generateVideoFromFrames = async (
    frames: Array<{frameIndex: number; imageUrl: string; timestamp: number}>,
    animationSettings?: { type: string; fps: number }
  ) => {
    try {
      setIsExportingVideo(true);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas dimensions (16:9 aspect ratio)
      const width = 1280;
      const height = 720;
      canvas.width = width;
      canvas.height = height;

      // Load all frame images
      const loadedImages = await Promise.all(
        frames.map(frame => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = frame.imageUrl;
          });
        })
      );

      // Create MediaRecorder for video encoding
      const stream = canvas.captureStream(animationSettings?.fps || 30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: quality[0] >= 80 ? 5000000 : 2500000
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const videoPromise = new Promise<string>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };
      });

      mediaRecorder.start();

      // Animation parameters
      const fps = animationSettings?.fps || 30;
      const totalFrames = duration * fps;
      const framesPerImage = totalFrames / loadedImages.length;
      const animationType = animationSettings?.type || 'slow-zoom-pan';

      // Render frames with animation effects
      for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
        const imageIndex = Math.min(Math.floor(frameNum / framesPerImage), loadedImages.length - 1);
        const img = loadedImages[imageIndex];
        const localProgress = (frameNum % framesPerImage) / framesPerImage;
        const globalProgress = frameNum / totalFrames;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        // Apply animation effects based on style
        ctx.save();
        
        switch (animationType) {
          case 'slow-zoom-pan': {
            const zoom = 1 + globalProgress * 0.15;
            const panX = Math.sin(globalProgress * Math.PI) * 50;
            const panY = Math.cos(globalProgress * Math.PI * 0.5) * 30;
            ctx.translate(width / 2 + panX, height / 2 + panY);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);
            break;
          }
          case 'dynamic-motion': {
            const bounce = Math.sin(globalProgress * Math.PI * 4) * 10;
            const zoom = 1 + Math.sin(globalProgress * Math.PI) * 0.1;
            ctx.translate(width / 2, height / 2 + bounce);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);
            break;
          }
          case 'subtle-parallax': {
            const parallax = globalProgress * 100;
            ctx.translate(-parallax * 0.5, 0);
            break;
          }
          case 'rotate-orbit': {
            const rotation = globalProgress * 0.05;
            const zoom = 1 + Math.sin(globalProgress * Math.PI) * 0.08;
            ctx.translate(width / 2, height / 2);
            ctx.rotate(rotation);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);
            break;
          }
          case 'film-flicker': {
            const flicker = 0.9 + Math.random() * 0.1;
            ctx.globalAlpha = flicker;
            const zoom = 1 + globalProgress * 0.1;
            ctx.translate(width / 2, height / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);
            break;
          }
          default: {
            const zoom = 1 + globalProgress * 0.12;
            ctx.translate(width / 2, height / 2);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);
          }
        }

        // Draw image covering canvas
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;
        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > canvasAspect) {
          drawHeight = height * 1.2;
          drawWidth = drawHeight * imgAspect;
          drawX = (width - drawWidth) / 2;
          drawY = (height - drawHeight) / 2;
        } else {
          drawWidth = width * 1.2;
          drawHeight = drawWidth / imgAspect;
          drawX = (width - drawWidth) / 2;
          drawY = (height - drawHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        // Add cinematic bars for cinematic style
        if (style === 'cinematic') {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, 0, width, height * 0.1);
          ctx.fillRect(0, height * 0.9, width, height * 0.1);
        }

        // Add vintage grain effect
        if (style === 'vintage') {
          ctx.globalAlpha = 0.05;
          for (let i = 0; i < 1000; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const gray = Math.random() * 255;
            ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
            ctx.fillRect(x, y, 1, 1);
          }
          ctx.globalAlpha = 1;
        }

        // Crossfade between images
        if (loadedImages.length > 1 && localProgress > 0.7) {
          const nextIndex = Math.min(imageIndex + 1, loadedImages.length - 1);
          if (nextIndex !== imageIndex) {
            const fadeAlpha = (localProgress - 0.7) / 0.3;
            ctx.globalAlpha = fadeAlpha;
            ctx.drawImage(loadedImages[nextIndex], drawX, drawY, drawWidth, drawHeight);
            ctx.globalAlpha = 1;
          }
        }

        // Wait for next frame timing
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
      }

      mediaRecorder.stop();
      const videoUrl = await videoPromise;
      
      // Fetch the video blob for download/share
      const videoBlob = new Blob(chunks, { type: 'video/webm' });
      setGeneratedVideoBlob(videoBlob);
      setGeneratedVideoUrl(videoUrl);
      setIsExportingVideo(false);
      
    } catch (error) {
      console.error('Video export error:', error);
      setIsExportingVideo(false);
      // Fallback to image-based preview if video generation fails
      toast.error('Video oluşturulamadı, görsel önizleme kullanılıyor');
    }
  };

  // Download video to device
  const handleDownloadVideo = async () => {
    if (!generatedVideoBlob && !generatedVideoUrl) {
      toast.error('İndirilecek video bulunamadı');
      return;
    }

    setIsDownloading(true);

    try {
      let blob = generatedVideoBlob;
      
      // If we only have URL, fetch the blob
      if (!blob && generatedVideoUrl) {
        const response = await fetch(generatedVideoUrl);
        blob = await response.blob();
      }

      if (!blob) {
        throw new Error('Video blob oluşturulamadı');
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const styleName = videoStyles.find(s => s.id === style)?.name || style;
      const fileName = `AI_Video_${styleName}_${timestamp}.webm`;

      // Use native export service
      const result = await nativeExportService.saveVideoToDevice(blob, fileName);

      if (result.success) {
        toast.success('Video kaydedildi!', {
          description: nativeExportService.isNativePlatform() 
            ? 'Xtrim klasörüne kaydedildi' 
            : `${result.filePath} olarak indirildi`
        });
      } else {
        throw new Error(result.error || 'Kaydetme hatası');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error instanceof Error ? error.message : 'İndirme hatası');
    } finally {
      setIsDownloading(false);
    }
  };

  // Share video
  const handleShareVideo = async () => {
    if (!generatedVideoBlob && !generatedVideoUrl) {
      toast.error('Paylaşılacak video bulunamadı');
      return;
    }

    setIsSharing(true);

    try {
      let blob = generatedVideoBlob;
      
      if (!blob && generatedVideoUrl) {
        const response = await fetch(generatedVideoUrl);
        blob = await response.blob();
      }

      if (!blob) {
        throw new Error('Video blob oluşturulamadı');
      }

      const styleName = videoStyles.find(s => s.id === style)?.name || style;
      const fileName = `AI_Video_${styleName}.webm`;

      const success = await nativeExportService.shareVideoBlob(blob, fileName);

      if (success) {
        toast.success('Paylaşım açıldı!');
      } else {
        // Fallback for web: copy blob URL
        if (!nativeExportService.isNativePlatform()) {
          await navigator.clipboard.writeText(generatedVideoUrl || '');
          toast.success('Video bağlantısı kopyalandı!');
        } else {
          toast.error('Paylaşım başarısız');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error(error instanceof Error ? error.message : 'Paylaşım hatası');
    } finally {
      setIsSharing(false);
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
    if (generatedVideoUrl && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    } else {
      if (isPreviewPlaying) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }
      setIsPreviewPlaying(!isPreviewPlaying);
    }
  };

  const handleRestart = () => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    } else {
      setPreviewTime(0);
      setIsPreviewPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    if (generatedVideoUrl && videoRef.current) {
      videoRef.current.currentTime = value[0];
    } else {
      setPreviewTime(value[0]);
      if (isPreviewPlaying) {
        startTimeRef.current = performance.now() - (value[0] * 1000);
      }
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
    // Use generated video URL if available, otherwise use the preview image
    const mediaUrl = generatedVideoUrl || generatedPreview;
    if (mediaUrl) {
      onVideoGenerated(mediaUrl, duration);
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
          {(generatedPreview || generatedVideoUrl) && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-500" />
                Video Önizleme
                {generatedVideoUrl && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full">
                    ✓ Video Hazır
                  </span>
                )}
                {isExportingVideo && (
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Video Render
                  </span>
                )}
              </Label>
              
              <div 
                ref={previewRef}
                className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-500/30 bg-black group"
              >
                {/* Show actual video if available */}
                {generatedVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={generatedVideoUrl}
                    className="w-full h-full object-cover"
                    loop
                    muted={isMuted}
                    playsInline
                    onPlay={() => setIsPreviewPlaying(true)}
                    onPause={() => setIsPreviewPlaying(false)}
                    onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                    onClick={() => {
                      if (videoRef.current) {
                        if (videoRef.current.paused) {
                          videoRef.current.play();
                        } else {
                          videoRef.current.pause();
                        }
                      }
                    }}
                  />
                ) : (
                  /* Fallback to animated image preview */
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
                      src={generatedPreview || ''}
                      alt="Generated video preview"
                      className="w-full h-full object-cover"
                      style={{
                        filter: isPreviewPlaying 
                          ? `brightness(${1 + Math.sin(previewTime * 0.5) * 0.05})` 
                          : 'none'
                      }}
                    />
                  </motion.div>
                )}
                
                {/* Cinematic Overlay Effect - only for image preview */}
                {!generatedVideoUrl && isPreviewPlaying && (
                  <motion.div 
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
                    <div 
                      className="absolute inset-0 opacity-[0.03]"
                      style={{
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
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

              {/* Download & Share Buttons */}
              {generatedVideoUrl && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownloadVideo}
                    disabled={isDownloading || isExportingVideo}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        İndiriliyor...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        İndir
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleShareVideo}
                    disabled={isSharing || isExportingVideo}
                  >
                    {isSharing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Paylaşılıyor...
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 mr-2" />
                        Paylaş
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {(generatedPreview || generatedVideoUrl) && !isGenerating ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setGeneratedPreview(null);
                  setGeneratedVideoUrl(null);
                  setGeneratedVideoBlob(null);
                  setVideoFrames([]);
                  setProgress(0);
                }}
              >
                Yeniden Oluştur
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleAddToTimeline}
                disabled={isExportingVideo}
              >
                {isExportingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Render...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4 mr-2" />
                    Videoya Ekle
                  </>
                )}
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
