import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Merge,
  Sparkles,
  Lock,
  Play,
  ChevronRight,
  Zap,
  Layers,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TransitionEffect {
  id: string;
  name: string;
  icon: typeof Merge;
  description: string;
  isPro: boolean;
  isAI?: boolean;
  duration: number; // in seconds
}

const transitionEffects: TransitionEffect[] = [
  // Free transitions
  { id: 'none', name: 'Yok', icon: Layers, description: 'Doğrudan kesme', isPro: false, duration: 0 },
  { id: 'fade', name: 'Solma', icon: Sparkles, description: 'Yumuşak geçiş', isPro: false, duration: 0.5 },
  { id: 'dissolve', name: 'Çözünme', icon: Sparkles, description: 'Kademeli geçiş', isPro: false, duration: 0.75 },
  { id: 'slide-left', name: 'Sola Kayma', icon: ChevronRight, description: 'Sola doğru kayar', isPro: false, duration: 0.5 },
  { id: 'slide-right', name: 'Sağa Kayma', icon: ChevronRight, description: 'Sağa doğru kayar', isPro: false, duration: 0.5 },
  { id: 'zoom', name: 'Yakınlaştırma', icon: Sparkles, description: 'Zoom efekti', isPro: false, duration: 0.5 },
  
  // Pro transitions
  { id: 'glitch', name: 'Glitch', icon: Zap, description: 'Dijital bozulma efekti', isPro: true, duration: 0.75 },
  { id: 'whip', name: 'Hızlı Geçiş', icon: Zap, description: 'Hızlı pan efekti', isPro: true, duration: 0.3 },
  { id: 'morph', name: 'Dönüşüm', icon: Wand2, description: 'Şekil dönüşümü', isPro: true, duration: 1 },
  { id: 'light-leak', name: 'Işık Sızması', icon: Sparkles, description: 'Sinematik ışık efekti', isPro: true, duration: 0.75 },
  
  // AI Pro transitions
  { id: 'ai-smooth', name: 'AI Akıcı Geçiş', icon: Wand2, description: 'Yapay zeka ile mükemmel geçiş', isPro: true, isAI: true, duration: 1 },
  { id: 'ai-match', name: 'AI Eşleştirme', icon: Wand2, description: 'Renk ve hareket eşleştirme', isPro: true, isAI: true, duration: 1.5 },
  { id: 'ai-cinematic', name: 'AI Sinematik', icon: Wand2, description: 'Profesyonel film geçişi', isPro: true, isAI: true, duration: 1.25 },
];

interface VideoMergePanelProps {
  clipCount: number;
  isPro?: boolean;
  onClose: () => void;
  onApplyTransition: (transitionId: string, duration: number) => void;
  onMergeAll: (transitionId: string) => void;
}

export const VideoMergePanel = ({
  clipCount,
  isPro = false,
  onClose,
  onApplyTransition,
  onMergeAll,
}: VideoMergePanelProps) => {
  const [selectedTransition, setSelectedTransition] = useState<string>('fade');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewTransition, setPreviewTransition] = useState<string | null>(null);

  const handleSelectTransition = (effect: TransitionEffect) => {
    if (effect.isPro && !isPro) {
      toast.error('Bu özellik Pro sürümde kullanılabilir', {
        action: {
          label: 'Pro\'ya Geç',
          onClick: () => toast.info('Pro özelliği yakında!'),
        },
      });
      return;
    }
    setSelectedTransition(effect.id);
  };

  const handlePreview = (effectId: string) => {
    setPreviewTransition(effectId);
    setTimeout(() => setPreviewTransition(null), 1500);
  };

  const handleApply = () => {
    const effect = transitionEffects.find(e => e.id === selectedTransition);
    if (!effect) return;
    
    onApplyTransition(selectedTransition, effect.duration);
    toast.success(`"${effect.name}" geçişi uygulandı`);
  };

  const handleMergeAll = async () => {
    const effect = transitionEffects.find(e => e.id === selectedTransition);
    if (!effect) return;

    if (effect.isAI) {
      setIsProcessing(true);
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessing(false);
    }

    onMergeAll(selectedTransition);
    toast.success(`${clipCount} klip "${effect.name}" geçişiyle birleştirildi`);
    onClose();
  };

  const freeTransitions = transitionEffects.filter(e => !e.isPro);
  const proTransitions = transitionEffects.filter(e => e.isPro && !e.isAI);
  const aiTransitions = transitionEffects.filter(e => e.isAI);

  const getPreviewAnimation = (effectId: string) => {
    switch (effectId) {
      case 'fade':
        return 'animate-fade-in';
      case 'dissolve':
        return 'animate-fade-in';
      case 'slide-left':
        return 'animate-slide-in-right';
      case 'slide-right':
        return 'animate-slide-in-right';
      case 'zoom':
        return 'animate-scale-in';
      case 'glitch':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-20 left-0 right-0 bg-card border-t border-border z-20 max-h-[75vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Merge className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Video Birleştir</h3>
            <p className="text-xs text-muted-foreground">
              {clipCount} klip seçili • Geçiş efekti seçin
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Preview */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="relative h-20 bg-black/80 rounded-lg overflow-hidden flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-16 h-12 rounded bg-gradient-to-br from-primary/50 to-primary/30 flex items-center justify-center text-xs text-white">
              Klip 1
            </div>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              previewTransition ? "bg-primary scale-110" : "bg-muted"
            )}>
              <AnimatePresence mode="wait">
                {previewTransition ? (
                  <motion.div
                    key="playing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className={getPreviewAnimation(previewTransition)}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </AnimatePresence>
            </div>
            <div className="w-16 h-12 rounded bg-gradient-to-br from-accent/50 to-accent/30 flex items-center justify-center text-xs text-white">
              Klip 2
            </div>
          </div>
          {previewTransition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10 flex items-center justify-center"
            >
              <span className="text-xs text-primary font-medium">Önizleme</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Free Transitions */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Ücretsiz Geçişler
          </p>
          <div className="grid grid-cols-3 gap-2">
            {freeTransitions.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleSelectTransition(effect)}
                onDoubleClick={() => handlePreview(effect.id)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  selectedTransition === effect.id
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <effect.icon className={cn(
                  'w-4 h-4 mb-1',
                  selectedTransition === effect.id ? 'text-primary' : 'text-muted-foreground'
                )} />
                <p className="text-xs font-medium truncate">{effect.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Pro Transitions */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Pro Geçişler
            {!isPro && <Lock className="w-3 h-3 ml-1" />}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {proTransitions.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleSelectTransition(effect)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all relative',
                  selectedTransition === effect.id && isPro
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border',
                  !isPro && 'opacity-60'
                )}
              >
                {!isPro && (
                  <div className="absolute top-1 right-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <effect.icon className={cn(
                  'w-4 h-4 mb-1',
                  selectedTransition === effect.id && isPro ? 'text-primary' : 'text-amber-500'
                )} />
                <p className="text-xs font-medium">{effect.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{effect.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* AI Transitions */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-purple-500" />
            AI Geçişler
            {!isPro && <Lock className="w-3 h-3 ml-1" />}
          </p>
          <div className="space-y-2">
            {aiTransitions.map((effect) => (
              <button
                key={effect.id}
                onClick={() => handleSelectTransition(effect)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all relative flex items-center gap-3',
                  selectedTransition === effect.id && isPro
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border hover:bg-muted/50',
                  !isPro && 'opacity-60'
                )}
              >
                {!isPro && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                  <effect.icon className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{effect.name}</p>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-medium">
                      AI
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{effect.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Transition Duration Info */}
        {selectedTransition && (
          <div className="bg-secondary rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Geçiş Süresi</span>
              <span className="text-sm font-medium">
                {transitionEffects.find(e => e.id === selectedTransition)?.duration || 0}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleApply}
          disabled={clipCount < 2}
        >
          <Play className="w-4 h-4" />
          Seçili Kliplere Uygula
        </Button>
        <Button
          variant="gradient"
          className="w-full gap-2"
          onClick={handleMergeAll}
          disabled={clipCount < 2 || isProcessing}
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>
              AI İşleniyor...
            </>
          ) : (
            <>
              <Merge className="w-4 h-4" />
              Tümünü Birleştir
              <Check className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default VideoMergePanel;
