import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Captions, Download, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

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
      toast.error('Önce videoyu projeye ekleyin');
      return;
    }

    setIsProcessing(true);

    try {
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
        throw new Error(data?.error || 'Transkript oluşturulamadı');
      }

      const lines = Array.isArray(data.transcript) ? data.transcript : [];
      setTranscriptLines(lines);

      toast.success('Saniye bazlı transkript hazır');
    } catch (error) {
      console.error('AI transcript error:', error);
      toast.error(error instanceof Error ? error.message : 'Transkript oluşturulurken bir hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!transcriptText) {
      toast.error('İndirilecek transkript yok');
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
    toast.success('Transkript indirildi');
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
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                  <p className="text-xs text-muted-foreground">Videodaki konuşmaları saniye bazında metne çevirir</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div>
                  <Label className="text-sm">Boş saniyeleri ekle</Label>
                  <p className="text-xs text-muted-foreground">Konuşma olmayan saniyeleri de yazıya dahil et</p>
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
                  Oluştur
                </Button>
                <Button variant="secondary" onClick={handleDownload} disabled={!transcriptText || isProcessing} className="gap-2">
                  <Download className="h-4 w-4" />
                  İndir (.txt)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Transkript</Label>
                <Textarea
                  value={transcriptText || 'Henüz transkript oluşturulmadı.'}
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
