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
  { id: 'none', name: 'None', icon: Layers, description: 'Direct cut', isPro: false, duration: 0 },
  { id: 'fade', name: 'Fade', icon: Sparkles, description: 'Smooth transition', isPro: false, duration: 0.5 },
  { id: 'dissolve', name: 'Dissolve', icon: Sparkles, description: 'Gradual transition', isPro: false, duration: 0.75 },
  { id: 'slide-left', name: 'Slide Left', icon: ChevronRight, description: 'Slides to the left', isPro: false, duration: 0.5 },
  { id: 'slide-right', name: 'Slide Right', icon: ChevronRight, description: 'Slides to the right', isPro: false, duration: 0.5 },
  { id: 'zoom', name: 'Zoom', icon: Sparkles, description: 'Zoom effect', isPro: false, duration: 0.5 },
  
  // Pro transitions
  { id: 'glitch', name: 'Glitch', icon: Zap, description: 'Digital glitch effect', isPro: true, duration: 0.75 },
  { id: 'whip', name: 'Quick Transition', icon: Zap, description: 'Quick pan effect', isPro: true, duration: 0.3 },
  { id: 'morph', name: 'Morph', icon: Wand2, description: 'Shape morph', isPro: true, duration: 1 },
  { id: 'light-leak', name: 'Light Leak', icon: Sparkles, description: 'Cinematic light effect', isPro: true, duration: 0.75 },
  
  // AI Pro transitions
  { id: 'ai-smooth', name: 'AI Smooth Transition', icon: Wand2, description: 'Perfect transition with AI', isPro: true, isAI: true, duration: 1 },
  { id: 'ai-match', name: 'AI Matching', icon: Wand2, description: 'Color and motion matching', isPro: true, isAI: true, duration: 1.5 },
  { id: 'ai-cinematic', name: 'AI Cinematic', icon: Wand2, description: 'Professional film transition', isPro: true, isAI: true, duration: 1.25 },
];

interface VideoMergePanelProps {
  clipCount: number;
  isPro?: boolean;
  onClose: () => void;
  onApplyTransition: (transitionId: string, duration: number) => void;
  onMergeAll: (transitionId: string) => Promise<void>;
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
      toast.error('This feature is available in Pro version', {
        action: {
          label: 'Upgrade to Pro',
          onClick: () => toast.info('Pro feature coming soon!'),
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
    toast.success(`"${effect.name}" transition applied`);
  };

  const handleMergeAll = async () => {
    const effect = transitionEffects.find(e => e.id === selectedTransition);
    if (!effect) return;

    setIsProcessing(true);
    try {
      if (effect.isAI) {
        // Simulate extra AI processing time
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await onMergeAll(selectedTransition);
      toast.success(`${clipCount} clip "${effect.name}" merged with transition`);
      onClose();
    } catch {
      toast.error('Merge failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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
            <h3 className="font-semibold">Merge Video</h3>
            <p className="text-xs text-muted-foreground">
              {clipCount} clip selected • Select a transition effect
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
              Clip 1
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
              Clip 2
            </div>
          </div>
          {previewTransition && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10 flex items-center justify-center"
            >
              <span className="text-xs text-primary font-medium">Preview</span>
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
            Free Transitions
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
            Pro Transitions
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
            AI Transitions
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
              <span className="text-xs text-muted-foreground">Transition Duration</span>
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
          Apply to Selected Clips
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
              AI Processing...
            </>
          ) : (
            <>
              <Merge className="w-4 h-4" />
              Merge All
              <Check className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default VideoMergePanel;
