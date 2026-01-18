import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image,
  Video,
  Music,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaPicker, MediaType } from './MediaPicker';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/types';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  mediaType?: MediaType;
  multiple?: boolean;
  maxFiles?: number;
  title?: string;
}

export const MediaPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  mediaType = 'all',
  multiple = true,
  maxFiles = 20,
  title,
}: MediaPickerModalProps) => {
  const [selectedType, setSelectedType] = useState<MediaType>(mediaType);

  const mediaTypes: { id: MediaType; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'all', label: 'All Media', icon: FolderOpen },
    { id: 'photo', label: 'Photos', icon: Image },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'audio', label: 'Audio', icon: Music },
  ];

  const handleSelect = (items: MediaItem[]) => {
    onSelect(items);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl border border-border overflow-hidden safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {title || 'Select Media'}
              </h2>
              <Button variant="iconGhost" size="iconSm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Media type selector (only show if mediaType is 'all') */}
            {mediaType === 'all' && (
              <div className="flex gap-2 p-4 border-b border-border overflow-x-auto scrollbar-hide">
                {mediaTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={selectedType === type.id ? 'secondary' : 'ghost'}
                    size="sm"
                    className="shrink-0"
                    onClick={() => setSelectedType(type.id)}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Media picker */}
            <div className="p-4">
              <MediaPicker
                mediaType={selectedType}
                multiple={multiple}
                maxFiles={maxFiles}
                onSelect={handleSelect}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaPickerModal;
