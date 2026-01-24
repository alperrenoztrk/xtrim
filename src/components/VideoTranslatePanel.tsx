import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Languages, Mic, Volume2, FileText, Loader2, Check, Play, Pause, Globe } from 'lucide-react';
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
  targetLanguage: string;
}

const languages = [
  { code: 'en', name: 'İngilizce', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', name: 'İspanyolca', flag: '🇪🇸' },
  { code: 'fr', name: 'Fransızca', flag: '🇫🇷' },
  { code: 'de', name: 'Almanca', flag: '🇩🇪' },
  { code: 'it', name: 'İtalyanca', flag: '🇮🇹' },
  { code: 'pt', name: 'Portekizce', flag: '🇵🇹' },
  { code: 'ru', name: 'Rusça', flag: '🇷🇺' },
  { code: 'ja', name: 'Japonca', flag: '🇯🇵' },
  { code: 'ko', name: 'Korece', flag: '🇰🇷' },
  { code: 'zh', name: 'Çince', flag: '🇨🇳' },
  { code: 'ar', name: 'Arapça', flag: '🇸🇦' },
  { code: 'hi', name: 'Hintçe', flag: '🇮🇳' },
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

  const handleTranslate = async () => {
    if (!videoUrl) {
      toast.error('Lütfen önce bir video ekleyin');
      return;
    }

    if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
      toast.error('Kaynak ve hedef dil aynı olamaz');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep('Video analiz ediliyor...');

    try {
      // Simulate progress steps
      const steps = [
        { progress: 20, step: 'Ses çıkarılıyor...' },
        { progress: 40, step: 'Konuşma metne dönüştürülüyor...' },
        { progress: 60, step: 'Metin çevriliyor...' },
        { progress: 80, step: 'Ses sentezleniyor...' },
        { progress: 100, step: 'Tamamlanıyor...' },
      ];

      // Call edge function
      const { data, error } = await supabase.functions.invoke('video-translate', {
        body: {
          videoUrl,
          sourceLanguage: sourceLanguage === 'auto' ? null : sourceLanguage,
          targetLanguage,
          options: {
            translateAudio,
            generateSubtitles,
            preserveOriginalVoice,
          },
        },
      });

      if (error) throw error;

      // Simulate progress for demo
      for (const step of steps) {
        setProgress(step.progress);
        setCurrentStep(step.step);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (data.success) {
        toast.success('Video çevirisi tamamlandı!');
        onTranslationComplete?.({
          translatedAudioUrl: data.translatedAudioUrl,
          subtitlesUrl: data.subtitlesUrl,
          targetLanguage,
        });
        onClose();
      } else {
        throw new Error(data.error || 'Çeviri başarısız oldu');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : 'Çeviri sırasında bir hata oluştu');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentStep('');
    }
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
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg bg-background rounded-t-3xl overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                  <h2 className="text-lg font-bold text-foreground">Video Çevirmeni</h2>
                  <p className="text-xs text-muted-foreground">AI destekli video çevirisi</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Language Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kaynak Dil</Label>
                  <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Otomatik algıla" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-[60]">
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Otomatik Algıla</span>
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
                  <Label className="text-sm font-medium">Hedef Dil</Label>
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
                <h3 className="text-sm font-semibold text-foreground">Çeviri Seçenekleri</h3>
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Sesi Çevir</p>
                      <p className="text-xs text-muted-foreground">AI ile ses dublajı oluştur</p>
                    </div>
                  </div>
                  <Switch checked={translateAudio} onCheckedChange={setTranslateAudio} />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Altyazı Oluştur</p>
                      <p className="text-xs text-muted-foreground">Çevrilmiş altyazılar ekle</p>
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
                        <p className="text-sm font-medium">Orijinal Sesi Koru</p>
                        <p className="text-xs text-muted-foreground">Arka planda orijinal ses</p>
                      </div>
                    </div>
                    <Switch checked={preserveOriginalVoice} onCheckedChange={setPreserveOriginalVoice} />
                  </motion.div>
                )}
              </div>

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
                    Çevriliyor...
                  </>
                ) : (
                  <>
                    <Languages className="h-5 w-5 mr-2" />
                    Videoyu Çevir
                  </>
                )}
              </Button>

              {!videoUrl && (
                <p className="text-center text-xs text-muted-foreground">
                  Çeviri için önce bir video ekleyin
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
