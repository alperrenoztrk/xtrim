import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Trash2,
  Music,
  Image,
  Clock,
  Download,
  GripVertical,
  ChevronRight,
  Volume2,
  Heart,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { MediaService } from '@/services/MediaService';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface PhotoItem {
  id: string;
  url: string;
  name: string;
  duration: number; // display duration in seconds
}

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  category: string;
  isFavorite: boolean;
}

const musicLibrary: MusicTrack[] = [
  { id: '1', name: 'Upbeat Energy', artist: 'Xtrim Music', duration: 120, category: 'Pop', isFavorite: false },
  { id: '2', name: 'Cinematic Epic', artist: 'Film Scores', duration: 180, category: 'Cinematic', isFavorite: true },
  { id: '3', name: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: 150, category: 'Lo-Fi', isFavorite: false },
  { id: '4', name: 'Summer Dance', artist: 'EDM Studio', duration: 135, category: 'Electronic', isFavorite: false },
  { id: '5', name: 'Acoustic Morning', artist: 'Guitar Dreams', duration: 165, category: 'Acoustic', isFavorite: true },
  { id: '6', name: 'Romantic Piano', artist: 'Classical', duration: 140, category: 'Classical', isFavorite: false },
  { id: '7', name: 'Travel Adventure', artist: 'World Music', duration: 155, category: 'World', isFavorite: false },
  { id: '8', name: 'Happy Memories', artist: 'Feel Good', duration: 125, category: 'Pop', isFavorite: true },
];

const categories = ['All', 'Pop', 'Cinematic', 'Lo-Fi', 'Electronic', 'Acoustic', 'Classical', 'World'];

const transitionStyles = [
  { id: 'fade', name: 'Fade', description: 'Smooth fade transition' },
  { id: 'slide', name: 'Slide', description: 'Slide to next photo' },
  { id: 'zoom', name: 'Zoom', description: 'Ken Burns effect' },
  { id: 'none', name: 'None', description: 'Instant switch' },
];

type ViewStep = 'photos' | 'music' | 'timing' | 'preview';

const PhotoAudioScreen = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<ViewStep>('photos');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [photoDuration, setPhotoDuration] = useState(3);
  const [transition, setTransition] = useState('fade');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [library, setLibrary] = useState(musicLibrary);

  const totalDuration = photos.reduce((acc, p) => acc + p.duration, 0);

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoItem[] = Array.from(files).map((file) => ({
      id: uuidv4(),
      url: URL.createObjectURL(file),
      name: file.name,
      duration: photoDuration,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReorderPhotos = (newOrder: PhotoItem[]) => {
    setPhotos(newOrder);
  };

  const handleUpdatePhotoDuration = (id: string, duration: number) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, duration } : p))
    );
  };

  const handleApplyDurationToAll = () => {
    setPhotos((prev) => prev.map((p) => ({ ...p, duration: photoDuration })));
  };

  const handleToggleFavorite = (trackId: string) => {
    setLibrary((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, isFavorite: !track.isFavorite } : track
      )
    );
  };

  const filteredLibrary = library.filter((track) => {
    const matchesSearch =
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || track.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const canProceed = {
    photos: photos.length > 0,
    music: true, // Music is optional
    timing: photos.length > 0,
    preview: photos.length > 0,
  };

  const steps: { id: ViewStep; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'timing', label: 'Timing', icon: Clock },
    { id: 'preview', label: 'Preview', icon: Play },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddPhotos}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Photo + Audio</h1>
            <p className="text-xxs text-muted-foreground">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} • {MediaService.formatDuration(totalDuration)}
            </p>
          </div>
        </div>

        {currentStep === 'preview' && (
          <Button variant="gradient" size="sm">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </header>

      {/* Step indicator */}
      <div className="flex items-center px-4 py-3 border-b border-border bg-card">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => canProceed[step.id] && setCurrentStep(step.id)}
              className={cn(
                'flex items-center gap-2 transition-colors',
                currentStep === step.id
                  ? 'text-primary'
                  : index <= currentStepIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
              disabled={!canProceed[step.id]}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                  currentStep === step.id
                    ? 'xtrim-gradient text-primary-foreground'
                    : index < currentStepIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-2 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Photos */}
          {currentStep === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {photos.length > 0 ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <Reorder.Group
                    axis="y"
                    values={photos}
                    onReorder={handleReorderPhotos}
                    className="space-y-2"
                  >
                    {photos.map((photo, index) => (
                      <Reorder.Item key={photo.id} value={photo}>
                        <motion.div
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                          whileTap={{ scale: 0.98 }}
                        >
                          <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              Photo {index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {photo.duration}s duration
                            </p>
                          </div>
                          <Button
                            variant="iconGhost"
                            size="iconSm"
                            onClick={() => handleRemovePhoto(photo.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-1">Add photos</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select photos to create your slideshow video
                  </p>
                </div>
              )}

              <div className="p-4 border-t border-border space-y-3 safe-area-bottom">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4" />
                  Add Photos
                </Button>
                {photos.length > 0 && (
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={() => setCurrentStep('music')}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 2: Music */}
          {currentStep === 'music' && (
            <motion.div
              key="music"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* Selected music */}
              {selectedMusic && (
                <div className="p-4 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg xtrim-gradient flex items-center justify-center">
                      <Music className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedMusic.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{selectedMusic.artist}</p>
                    </div>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => setSelectedMusic(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Volume</span>
                      <span>{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[musicVolume]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={([value]) => setMusicVolume(value)}
                    />
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'secondary' : 'ghost'}
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Music list */}
              <div className="flex-1 overflow-y-auto px-4 space-y-2">
                {filteredLibrary.map((track) => (
                  <motion.div
                    key={track.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                      selectedMusic?.id === track.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border hover:border-primary/50'
                    )}
                    onClick={() => setSelectedMusic(track)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button variant="icon" size="iconSm" className="bg-secondary">
                      <Play className="w-4 h-4 fill-current" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground">{track.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {MediaService.formatDuration(track.duration)}
                    </span>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(track.id);
                      }}
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4',
                          track.isFavorite ? 'text-destructive fill-destructive' : 'text-muted-foreground'
                        )}
                      />
                    </Button>
                  </motion.div>
                ))}
              </div>

              <div className="p-4 border-t border-border flex gap-2 safe-area-bottom">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('photos')}>
                  Back
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => setCurrentStep('timing')}>
                  {selectedMusic ? 'Continue' : 'Skip Music'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Timing */}
          {currentStep === 'timing' && (
            <motion.div
              key="timing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Global duration */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Photo Duration</p>
                      <p className="text-xs text-muted-foreground">Time each photo displays</p>
                    </div>
                    <span className="text-lg font-semibold text-primary">{photoDuration}s</span>
                  </div>
                  <Slider
                    value={[photoDuration]}
                    min={1}
                    max={10}
                    step={0.5}
                    onValueChange={([value]) => setPhotoDuration(value)}
                  />
                  <Button variant="outline" size="sm" onClick={handleApplyDurationToAll}>
                    Apply to all photos
                  </Button>
                </div>

                {/* Transition style */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Transition Style</p>
                  <div className="grid grid-cols-2 gap-2">
                    {transitionStyles.map((style) => (
                      <button
                        key={style.id}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all',
                          transition === style.id
                            ? 'bg-primary/10 border-primary'
                            : 'bg-card border-border'
                        )}
                        onClick={() => setTransition(style.id)}
                      >
                        <p className="text-sm font-medium text-foreground">{style.name}</p>
                        <p className="text-xs text-muted-foreground">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual photo durations */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Individual Timing</p>
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Photo {index + 1}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Slider
                            value={[photo.duration]}
                            min={1}
                            max={10}
                            step={0.5}
                            onValueChange={([value]) => handleUpdatePhotoDuration(photo.id, value)}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-8">{photo.duration}s</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total photos</span>
                    <span className="text-foreground font-medium">{photos.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Video duration</span>
                    <span className="text-foreground font-medium">
                      {MediaService.formatDuration(totalDuration)}
                    </span>
                  </div>
                  {selectedMusic && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Music</span>
                      <span className="text-foreground font-medium">{selectedMusic.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border flex gap-2 safe-area-bottom">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('music')}>
                  Back
                </Button>
                <Button variant="gradient" className="flex-1" onClick={() => setCurrentStep('preview')}>
                  Preview
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* Preview area */}
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {photos[currentPhotoIndex] && (
                    <motion.img
                      key={photos[currentPhotoIndex].id}
                      src={photos[currentPhotoIndex].url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      initial={{ opacity: 0, scale: transition === 'zoom' ? 1.1 : 1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </AnimatePresence>

                {/* Play button overlay */}
                <Button
                  variant="icon"
                  size="iconLg"
                  className="absolute bg-white/10 backdrop-blur-sm hover:bg-white/20"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white fill-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white fill-white" />
                  )}
                </Button>

                {/* Photo counter */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                  <span className="text-xs text-white">
                    {currentPhotoIndex + 1} / {photos.length}
                  </span>
                </div>
              </div>

              {/* Music indicator */}
              {selectedMusic && (
                <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground flex-1 truncate">{selectedMusic.name}</span>
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              {/* Photo timeline */}
              <div className="px-4 py-3 border-t border-border bg-card">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      className={cn(
                        'w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                        currentPhotoIndex === index
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent opacity-60'
                      )}
                      onClick={() => setCurrentPhotoIndex(index)}
                    >
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-border flex gap-2 safe-area-bottom">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('timing')}>
                  Back
                </Button>
                <Button variant="gradient" className="flex-1">
                  <Download className="w-4 h-4" />
                  Export Video
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PhotoAudioScreen;
