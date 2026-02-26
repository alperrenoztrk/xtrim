import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Video, Wand2, Clock, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionService } from '@/services/SubscriptionService';

interface VideoAIGeneratePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoGenerated: (videoUrl: string, duration: number) => void;
}

const videoStyles = [
  { id: 'cinematic', name: 'Cinematic', description: 'Film-quality visuals' },
  { id: 'anime', name: 'Anime', description: 'Japanese animation style' },
  { id: 'realistic', name: 'Realistic', description: 'Photorealistic look' },
  { id: 'artistic', name: 'Artistic', description: 'Artistic and creative' },
  { id: '3d', name: '3D Render', description: '3D modeling style' },
  { id: 'vintage', name: 'Vintage', description: 'Retro film look' },
];

const durationOptions = [
  { value: 3, label: '3 seconds' },
  { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds (Pro+)' },
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
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const cleanupGeneratedVideo = () => {
    if (generatedVideoUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(generatedVideoUrl);
    }
    setGeneratedVideoUrl(null);
  };

  useEffect(() => {
    return () => {
      if (generatedVideoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(generatedVideoUrl);
      }
    };
  }, [generatedVideoUrl]);

  const buildVideoFromFrame = async (frameUrl: string, targetDuration: number) => {
    const image = new Image();
    image.src = frameUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Generated frame could not be loaded'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 1280;
    canvas.height = image.naturalHeight || 720;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Video rendering context could not be created');
    }

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Your browser does not support AI video output format');
    }

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });

    const startedAt = performance.now();
    recorder.start();

    const renderLoop = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      if (elapsedSeconds >= targetDuration) {
        recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return recordingDone;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedPreview(null);
    cleanupGeneratedVideo();

    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('AI kullanım kotanız doldu. Lütfen planınızı yükseltin ya da yarını bekleyin.');
      }

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
        const generatedVideoBlob = await buildVideoFromFrame(data.frameUrl, duration);
        const generatedVideoBlobUrl = URL.createObjectURL(generatedVideoBlob);
        setProgress(100);
        setGeneratedPreview(data.frameUrl);
        setGeneratedVideoUrl(generatedVideoBlobUrl);
        toast.success('Video created!');
      } else {
        throw new Error(data?.error || 'Video could not be created');
      }
    } catch (error) {
      console.error('Video generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Video creation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToTimeline = () => {
    if (generatedVideoUrl) {
      onVideoGenerated(generatedVideoUrl, duration);
      toast.success('Video added to timeline');
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
              AI Video Generateimi
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" />
                PRO
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Create video from text</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Description</Label>
          <Textarea
            placeholder="e.g.: A couple walking on the beach at sunset, with cinematic camera movement..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          <p className="text-xs text-muted-foreground">
            The more detailed your description, the better the result.
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
            Video Duration
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
            <span>Quality</span>
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
            <span>Fast</span>
            <span>High Quality</span>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Creating video...</span>
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
              AI is creating your video, this may take a few minutes...
            </p>
          </div>
        )}

        {/* Generated Preview */}
        {generatedPreview && !isGenerating && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Generated Video Preview</Label>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-black">
              {generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={generatedPreview}
                  alt="Generated video preview"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
                {duration}s
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {generatedPreview && !isGenerating ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setGeneratedPreview(null);
                  cleanupGeneratedVideo();
                  setProgress(0);
                }}
              >
                Generate Again
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                onClick={handleAddToTimeline}
              >
                <Video className="w-4 h-4 mr-2" />
                Add to Video
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
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-center text-muted-foreground pt-2">
          AI video generation requires Pro subscription. Credits are used per video.
        </p>
      </div>
    </motion.div>
  );
};

export default VideoAIGeneratePanel;
