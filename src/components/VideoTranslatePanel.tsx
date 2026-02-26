import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Languages, Mic, Volume2, FileText, Loader2, Play, Pause, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VideoTranslatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  onTranslationComplete?: (result: TranslationResult) => void;
}

interface TranslationResult {
  translatedAudioUrl?: string;
  subtitlesUrl?: string;
  subtitles?: Array<{ start: string; end: string; text: string }>;
  targetLanguage: string;
  translatedScript?: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

const VideoTranslatePanel = ({ 
  isOpen, 
  onClose, 
  videoUrl,
  onTranslationComplete 
}: VideoTranslatePanelProps) => {
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translateAudio, setTranslateAudio] = useState(true);
  const [generateSubtitles, setGenerateSubtitles] = useState(true);
  const [preserveOriginalVoice, setPreserveOriginalVoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const updateProgress = (value: number, step: string) => {
    setProgress(value);
    setCurrentStep(step);
  };

  const generateTTS = async (text: string, language: string): Promise<string> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          text, 
          language 
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.code === 'FREE_TIER_RESTRICTED' 
        ? errorData.error 
        : (errorData.error || `TTS request failed: ${response.status}`);
      throw new Error(errorMessage);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  };

  const handleTranslate = async () => {
    if (!videoUrl) {
      toast.error('Please add a video first');
      return;
    }

    if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
      toast.error('Source and target languages cannot be the same');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setGeneratedAudioUrl(null);

    try {
      // Step 1: Upload video to storage so the AI can access it
      updateProgress(5, 'Uploading video...');

      let publicVideoUrl = videoUrl;

      if (videoUrl.startsWith('blob:')) {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const fileName = `translate-${Date.now()}.mp4`;
        const filePath = `temp-translations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, blob, { contentType: blob.type || 'video/mp4', upsert: true });

        if (uploadError) throw new Error('Video upload failed: ' + uploadError.message);

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
        publicVideoUrl = urlData.publicUrl;
      }

      // Step 2: Analyze and translate text
      updateProgress(10, 'Analyzing video...');
      
      const { data: translateData, error: translateError } = await supabase.functions.invoke('video-translate', {
        body: {
          videoUrl: publicVideoUrl,
          sourceLanguage: sourceLanguage === 'auto' ? null : sourceLanguage,
          targetLanguage,
          options: {
            translateAudio,
            generateSubtitles,
            preserveOriginalVoice,
          },
        },
      });

      if (translateError) {
        // When edge function returns non-2xx, read the error from context
        const errorBody = translateError?.context ? await translateError.context.json?.().catch(() => null) : null;
        const errorMessage = errorBody?.error || translateError.message || 'Translation failed';
        throw new Error(errorMessage);
      }
      if (!translateData?.success) throw new Error(translateData?.error || 'Translation failed');

      updateProgress(40, 'Text translated...');

      let audioUrl: string | undefined;

      // Step 2: Generate TTS if audio translation is enabled
      if (translateAudio && translateData.translatedScript) {
        updateProgress(50, 'Synthesizing audio (ElevenLabs)...');
        
        try {
          audioUrl = await generateTTS(translateData.translatedScript, targetLanguage);
          setGeneratedAudioUrl(audioUrl);
          updateProgress(90, 'Audio created!');
        } catch (ttsError: any) {
          console.error('TTS error:', ttsError);
          const errorMessage = ttsError?.message || '';
          
          if (errorMessage.includes('FREE_TIER_RESTRICTED') || errorMessage.includes('free plan')) {
            toast.error('ElevenLabs free plan restricted', {
              description: 'You need a paid plan for voice dubbing. Subtitles will be used.',
            });
          } else {
            toast.warning('Audio could not be created', {
              description: 'Only subtitles will be used',
            });
          }
        }
      }

      updateProgress(100, 'Completed!');

      toast.success('Video translation completed!', {
        description: audioUrl ? 'Voice dubbing ready' : 'Subtitles generated',
      });

      onTranslationComplete?.({
        translatedAudioUrl: audioUrl,
        subtitlesUrl: translateData.subtitlesUrl,
        subtitles: translateData.subtitles,
        targetLanguage,
        translatedScript: translateData.translatedScript,
      });

    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred during translation');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePreview = () => {
    if (!generatedAudioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(generatedAudioUrl);
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingPreview(false);
    setGeneratedAudioUrl(null);
    setProgress(0);
    setCurrentStep('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-background rounded-t-3xl overflow-hidden"
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Video Translator</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Voice dubbing with ElevenLabs TTS
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Language Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Source Language</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Auto detect" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[60]">
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Auto Detect</span>
                        </div>
                      </SelectItem>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Target Language</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[60]">
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Translation Options */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-foreground">Translation Options</h3>
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Voice Dubbing</p>
                      <p className="text-xs text-muted-foreground">Realistic voice with ElevenLabs</p>
                    </div>
                  </div>
                  <Switch checked={translateAudio} onCheckedChange={setTranslateAudio} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Create Subtitles</p>
                      <p className="text-xs text-muted-foreground">Add translated subtitles</p>
                    </div>
                  </div>
                  <Switch checked={generateSubtitles} onCheckedChange={setGenerateSubtitles} />
                </div>

                {translateAudio && (
                  <motion.div 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      <Volume2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Keep Original Audio</p>
                        <p className="text-xs text-muted-foreground">Original audio in the background</p>
                      </div>
                    </div>
                    <Switch checked={preserveOriginalVoice} onCheckedChange={setPreserveOriginalVoice} />
                  </motion.div>
                )}
              </div>

              {/* Generated Audio Preview */}
              {generatedAudioUrl && (
                <motion.div
                  className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Volume2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dubbing Ready</p>
                        <p className="text-xs text-muted-foreground">
                          {languages.find(l => l.code === targetLanguage)?.name} voice created
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={togglePreview}
                    >
                      {isPlayingPreview ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Durdur
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Preview
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Progress */}
              {isProcessing && (
                <motion.div
                  className="space-y-3 pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{currentStep}</span>
                    <span className="font-medium text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Action Button */}
              <Button
                className="w-full h-12 bg-gradient-to-r from-primary to-accent text-white font-semibold"
                onClick={handleTranslate}
                disabled={isProcessing || !videoUrl}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="h-5 w-5 mr-2" />
                    Translate Video
                  </>
                )}
              </Button>

              {!videoUrl && (
                <p className="text-center text-xs text-muted-foreground">
                  Add a video first for translation
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoTranslatePanel;
