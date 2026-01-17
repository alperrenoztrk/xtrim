import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ImagePlus, Loader2, CheckCircle2, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateService } from '@/services/TemplateService';
import { MediaService } from '@/services/MediaService';
import { MediaDraftService } from '@/services/MediaDraftService';
import { cn } from '@/lib/utils';
import type { MediaItem, Template } from '@/types';

const MediaSlotCard = ({
  index,
  item,
  isLoading,
  onSelect,
}: {
  index: number;
  item: MediaItem | null;
  isLoading: boolean;
  onSelect: () => void;
}) => {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl border border-border bg-card',
        item ? 'shadow-sm' : 'border-dashed'
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
        {item?.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Media Slot {index + 1}</p>
        <p className="text-xs text-muted-foreground">
          {item ? item.name : 'Add a photo or video'}
        </p>
      </div>
      <Button
        variant={item ? 'outline' : 'gradient'}
        size="sm"
        className="shrink-0"
        onClick={onSelect}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : item ? 'Replace' : 'Select'}
      </Button>
    </motion.div>
  );
};

const MediaPickerScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [draftItems, setDraftItems] = useState<Array<MediaItem | null>>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [loadingSlotIndex, setLoadingSlotIndex] = useState<number | null>(null);

  useEffect(() => {
    const templateId = searchParams.get('template');
    if (!templateId) return;
    const foundTemplate = TemplateService.getTemplateById(templateId);
    setTemplate(foundTemplate);
    if (foundTemplate) {
      const existingDraft = MediaDraftService.getDraft();
      if (existingDraft?.templateId === foundTemplate.id) {
        setDraftItems(existingDraft.items);
      } else {
        const newDraft = MediaDraftService.initializeDraft(foundTemplate);
        setDraftItems(newDraft.items);
      }
    }
  }, [searchParams]);

  const handleSelectSlot = (index: number) => {
    setActiveSlotIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || activeSlotIndex === null) return;
    setLoadingSlotIndex(activeSlotIndex);
    const mediaItem = await MediaService.createMediaItem(file);
    const updatedDraft = MediaDraftService.setSlot(activeSlotIndex, mediaItem);
    if (updatedDraft) {
      setDraftItems(updatedDraft.items);
    }
    setLoadingSlotIndex(null);
    event.target.value = '';
  };

  const filledSlots = draftItems.filter(Boolean).length;
  const canContinue = template ? filledSlots === template.mediaSlots : false;

  if (!template) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6">
        <Film className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-lg font-semibold text-foreground mb-2">
          Template not found
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Please select a template to continue.
        </p>
        <Button variant="gradient" onClick={() => navigate('/templates')}>
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Select Media</h1>
            <p className="text-xs text-muted-foreground">
              {template.name} • {template.mediaSlots} slots
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className={cn('w-4 h-4', canContinue ? 'text-primary' : 'text-muted-foreground')} />
            {filledSlots}/{template.mediaSlots}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Template Overview</h2>
          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            <span>Aspect ratio: {template.aspectRatio}</span>
            <span>Duration: {template.duration}s</span>
          </div>
        </div>

        <div className="space-y-3">
          {draftItems.map((item, index) => (
            <MediaSlotCard
              key={`slot-${index}`}
              index={index}
              item={item}
              isLoading={loadingSlotIndex === index}
              onSelect={() => handleSelectSlot(index)}
            />
          ))}
        </div>

        <Button
          variant="gradient"
          className="w-full"
          disabled={!canContinue}
          onClick={() => navigate('/editor/new')}
        >
          Continue to Editor
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default MediaPickerScreen;
