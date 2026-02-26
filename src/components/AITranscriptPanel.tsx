import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Captions, Download, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionService } from '@/services/SubscriptionService';

interface TranscriptLine {
  second: number;
  text: string;
}

interface AITranscriptPanelProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  videoName?: string;
}

const formatSeconds = (value: number): string => {
  const safeValue = Math.max(0, Math.floor(value));
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

export const AITranscriptPanel = ({ isOpen, onClose, videoUrl, videoName }: AITranscriptPanelProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [includeEmptySeconds, setIncludeEmptySeconds] = useState(false);

  const transcriptText = useMemo(() => {
    if (!transcriptLines.length) {
      return '';
    }

    return transcriptLines
      .map((line) => `[${formatSeconds(line.second)}] ${line.text}`)
      .join('\n');
  }, [transcriptLines]);

  const handleGenerateTranscript = async () => {
    if (!videoUrl) {
      toast.error('Add the video to the project first');
      return;
    }

    setIsProcessing(true);

    try {
      const canUseAI = await SubscriptionService.canUseFeature('ai');
      if (!canUseAI) {
        throw new Error('Your AI usage quota has been reached. Please upgrade your plan or wait until tomorrow.');
      }

      const { data, error } = await supabase.functions.invoke('ai-transcript', {
        body: {
          videoUrl,
          includeEmptySeconds,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Transcript could not be created');
      }

      const lines = Array.isArray(data.transcript) ? data.transcript : [];
      setTranscriptLines(lines);

      toast.success('Second-by-second transcript is ready');
    } catch (error) {
      console.error('AI transcript error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while creating the transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!transcriptText) {
      toast.error('No transcript available to download');
      return;
    }

    const baseName = (videoName || 'video').replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}-transcript.txt`;
    const blob = new Blob([transcriptText], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();

    URL.revokeObjectURL(objectUrl);
    toast.success('Transcript downloaded');
  };

  const handleClose = () => {
    setIsProcessing(false);
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
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-lg bg-background rounded-t-3xl overflow-hidden"
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Captions className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">AI Transcript</h2>
                  <p className="text-xs text-muted-foreground">Converts speech in the video into second-by-second text</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div>
                  <Label className="text-sm">Include empty seconds</Label>
                  <p className="text-xs text-muted-foreground">Include seconds without speech in the text</p>
                </div>
                <Switch
                  checked={includeEmptySeconds}
                  onCheckedChange={setIncludeEmptySeconds}
                  disabled={isProcessing}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleGenerateTranscript} disabled={isProcessing} className="gap-2">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Generate
                </Button>
                <Button variant="secondary" onClick={handleDownload} disabled={!transcriptText || isProcessing} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download (.txt)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Transcript</Label>
                <Textarea
                  value={transcriptText || 'No transcript has been generated yet.'}
                  readOnly
                  className="min-h-[220px] font-mono text-xs"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
