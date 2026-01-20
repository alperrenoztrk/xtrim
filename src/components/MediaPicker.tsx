import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Video,
  Music,
  Camera,
  FolderOpen,
  X,
  Check,
  AlertCircle,
  Shield,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MediaService } from '@/services/MediaService';
import type { MediaItem } from '@/types';

export type MediaType = 'photo' | 'video' | 'audio' | 'all';

interface MediaPickerProps {
  mediaType?: MediaType;
  multiple?: boolean;
  maxFiles?: number;
  onSelect: (items: MediaItem[]) => void;
  onCancel?: () => void;
  className?: string;
}

interface PermissionState {
  photos: 'prompt' | 'granted' | 'denied';
  camera: 'prompt' | 'granted' | 'denied';
}

const getAcceptTypes = (mediaType: MediaType): string => {
  switch (mediaType) {
    case 'photo':
      return 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.heic,.heif';
    case 'video':
      return 'video/*,.mp4,.webm,.ogg,.ogv,.mov,.m4v,.avi,.mkv,.wmv,.flv,.3gp,.3g2,.ts,.mts,.m2ts,.mpg,.mpeg';
    case 'audio':
      return 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma,.aiff';
    case 'all':
    default:
      return 'image/*,video/*';
  }
};

const getMediaTypeIcon = (mediaType: MediaType) => {
  switch (mediaType) {
    case 'photo':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    default:
      return FolderOpen;
  }
};

const getMediaTypeLabel = (mediaType: MediaType): string => {
  switch (mediaType) {
    case 'photo':
      return 'photos';
    case 'video':
      return 'videos';
    case 'audio':
      return 'audio files';
    default:
      return 'media';
  }
};

export const MediaPicker = ({
  mediaType = 'all',
  multiple = true,
  maxFiles = 20,
  onSelect,
  onCancel,
  className,
}: MediaPickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<MediaItem[]>([]);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState>({
    photos: 'prompt',
    camera: 'prompt',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const Icon = getMediaTypeIcon(mediaType);
  const label = getMediaTypeLabel(mediaType);

  const requestPermission = useCallback(async (type: 'photos' | 'camera') => {
    // Simulate permission request
    // In a real Capacitor app, this would use @capacitor/camera or @capacitor/filesystem
    return new Promise<'granted' | 'denied'>((resolve) => {
      setTimeout(() => {
        // Simulate granted permission
        resolve('granted');
      }, 500);
    });
  }, []);

  const handleRequestPermission = async () => {
    const result = await requestPermission('photos');
    setPermissionState((prev) => ({ ...prev, photos: result }));
    
    if (result === 'granted') {
      setShowPermissionDialog(false);
      fileInputRef.current?.click();
    }
  };

  const handlePickMedia = () => {
    if (permissionState.photos === 'denied') {
      setShowPermissionDialog(true);
      return;
    }
    
    if (permissionState.photos === 'prompt') {
      setShowPermissionDialog(true);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const fileArray = Array.from(files).slice(0, maxFiles - selectedFiles.length);
      const mediaItems: MediaItem[] = [];

      for (const file of fileArray) {
        const item = await MediaService.createMediaItem(file);
        mediaItems.push(item);
      }

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...mediaItems].slice(0, maxFiles));
      } else {
        setSelectedFiles(mediaItems.slice(0, 1));
      }
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const fileArray = Array.from(files)
        .filter((file) => {
          const type = file.type.split('/')[0];
          if (mediaType === 'all') return type === 'image' || type === 'video';
          if (mediaType === 'photo') return type === 'image';
          if (mediaType === 'video') return type === 'video';
          if (mediaType === 'audio') return type === 'audio';
          return false;
        })
        .slice(0, maxFiles - selectedFiles.length);

      const mediaItems: MediaItem[] = [];

      for (const file of fileArray) {
        const item = await MediaService.createMediaItem(file);
        mediaItems.push(item);
      }

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...mediaItems].slice(0, maxFiles));
      } else {
        setSelectedFiles(mediaItems.slice(0, 1));
      }
    } catch (error) {
      console.error('Error processing dropped files:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleConfirm = () => {
    onSelect(selectedFiles);
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    onCancel?.();
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes(mediaType)}
        multiple={multiple}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Permission Dialog */}
      <AnimatePresence>
        {showPermissionDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPermissionDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl xtrim-gradient flex items-center justify-center">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Access Your {label.charAt(0).toUpperCase() + label.slice(1)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Xtrim needs access to your {label} to import media for editing.
                  Your files stay on your device and are never uploaded without your permission.
                </p>
              </div>

              {permissionState.photos === 'denied' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Permission Denied</p>
                    <p className="text-muted-foreground mt-1">
                      Please enable access in your device settings to continue.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPermissionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleRequestPermission}
                >
                  Allow Access
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      <motion.div
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-primary/50',
          isProcessing && 'pointer-events-none opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileTap={{ scale: 0.99 }}
      >
        {selectedFiles.length === 0 ? (
          <button
            className="w-full p-8 flex flex-col items-center gap-4"
            onClick={handlePickMedia}
          >
            <motion.div
              className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="w-7 h-7 text-muted-foreground" />
            </motion.div>
            <div className="text-center">
              <p className="text-foreground font-medium">
                {isDragging ? `Drop ${label} here` : `Select ${label}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap to browse or drag and drop
              </p>
              {multiple && (
                <p className="text-xs text-muted-foreground mt-2">
                  Up to {maxFiles} files
                </p>
              )}
            </div>
          </button>
        ) : (
          <div className="p-4 space-y-4">
            {/* Selected files grid */}
            <div className="grid grid-cols-3 gap-2">
              {selectedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-secondary"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                >
                  {file.thumbnail ? (
                    <img
                      src={file.thumbnail}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {file.type === 'video' ? (
                        <Video className="w-6 h-6 text-muted-foreground" />
                      ) : file.type === 'audio' ? (
                        <Music className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <Image className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  )}

                  {/* Duration badge for videos */}
                  {file.type === 'video' && file.duration && (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm">
                      <span className="text-xxs text-white font-medium">
                        {MediaService.formatDuration(file.duration)}
                      </span>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-destructive transition-colors"
                    onClick={() => handleRemoveFile(file.id)}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </motion.div>
              ))}

              {/* Add more button */}
              {multiple && selectedFiles.length < maxFiles && (
                <motion.button
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 hover:bg-secondary/50 transition-all"
                  onClick={handlePickMedia}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </motion.button>
              )}
            </div>

            {/* Selection info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
              </span>
              <button
                className="text-destructive hover:underline"
                onClick={() => setSelectedFiles([])}
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action buttons */}
      {selectedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 mt-4"
        >
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="gradient" className="flex-1" onClick={handleConfirm}>
            <Check className="w-4 h-4" />
            Use {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default MediaPicker;
