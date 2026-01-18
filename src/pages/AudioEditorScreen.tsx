import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Volume2,
  VolumeX,
  Music,
  Mic,
  Trash2,
  Download,
  Library,
  AudioWaveform,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  Check,
  Shuffle,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { cn } from '@/lib/utils';
import type { Project, AudioTrack } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock music library data
const musicLibrary = [
  { id: '1', name: 'Upbeat Energy', artist: 'Xtrim Music', duration: 120, category: 'Pop', isFavorite: false },
  { id: '2', name: 'Cinematic Epic', artist: 'Film Scores', duration: 180, category: 'Cinematic', isFavorite: true },
  { id: '3', name: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: 150, category: 'Lo-Fi', isFavorite: false },
  { id: '4', name: 'Summer Dance', artist: 'EDM Studio', duration: 135, category: 'Electronic', isFavorite: false },
  { id: '5', name: 'Acoustic Morning', artist: 'Guitar Dreams', duration: 165, category: 'Acoustic', isFavorite: true },
  { id: '6', name: 'Hip Hop Beat', artist: 'Urban Sounds', duration: 110, category: 'Hip Hop', isFavorite: false },
  { id: '7', name: 'Tropical Sunset', artist: 'Island Vibes', duration: 145, category: 'World', isFavorite: false },
  { id: '8', name: 'Dark Ambient', artist: 'Atmosphere', duration: 200, category: 'Ambient', isFavorite: false },
];

const categories = ['All', 'Pop', 'Cinematic', 'Lo-Fi', 'Electronic', 'Acoustic', 'Hip Hop', 'World', 'Ambient'];

type ViewMode = 'tracks' | 'library';

interface AudioTrackItemProps {
  track: AudioTrack;
  isSelected: boolean;
  onSelect: () => void;
  onVolumeChange: (volume: number) => void;
  onFadeInChange: (fadeIn: number) => void;
  onFadeOutChange: (fadeOut: number) => void;
  onMuteToggle: () => void;
  onDelete: () => void;
  projectDuration: number;
}

const AudioTrackItem = ({
  track,
  isSelected,
  onSelect,
  onVolumeChange,
  onFadeInChange,
  onFadeOutChange,
  onMuteToggle,
  onDelete,
  projectDuration,
}: AudioTrackItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const trackWidth = Math.max(100, ((track.endTime - track.startTime) / Math.max(projectDuration, 1)) * 100);
  const trackOffset = (track.startTime / Math.max(projectDuration, 1)) * 100;

  return (
    <motion.div
      className={cn(
        'rounded-xl border-2 transition-all overflow-hidden',
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Track header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onSelect}
      >
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          {track.uri.includes('voice') ? (
            <Mic className="w-5 h-5 text-accent" />
          ) : (
            <Music className="w-5 h-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
          <p className="text-xxs text-muted-foreground">
            {MediaService.formatDuration(track.endTime - track.startTime)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              onMuteToggle();
            }}
          >
            {track.isMuted ? (
              <VolumeX className="w-4 h-4 text-destructive" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Waveform visualization */}
      <div className="px-3 pb-2">
        <div className="relative h-8 bg-secondary rounded-lg overflow-hidden">
          {/* Track position indicator */}
          <div
            className={cn(
              'absolute top-0 bottom-0 rounded transition-all',
              track.isMuted ? 'bg-muted' : 'xtrim-gradient opacity-60'
            )}
            style={{
              left: `${trackOffset}%`,
              width: `${trackWidth}%`,
            }}
          >
            {/* Simulated waveform */}
            <div className="flex items-center justify-around h-full px-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-0.5 rounded-full transition-all',
                    track.isMuted ? 'bg-muted-foreground/30' : 'bg-white/70'
                  )}
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 30}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Fade in indicator */}
          {track.fadeIn > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-background to-transparent pointer-events-none"
              style={{
                left: `${trackOffset}%`,
                width: `${(track.fadeIn / (track.endTime - track.startTime)) * trackWidth}%`,
              }}
            />
          )}

          {/* Fade out indicator */}
          {track.fadeOut > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-l from-background to-transparent pointer-events-none"
              style={{
                right: `${100 - trackOffset - trackWidth}%`,
                width: `${(track.fadeOut / (track.endTime - track.startTime)) * trackWidth}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Expanded controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-4">
              {/* Volume control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Volume</span>
                  <span className="text-xs text-foreground font-medium">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[track.volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={([value]) => onVolumeChange(value)}
                  className="w-full"
                />
              </div>

              {/* Fade In control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fade In</span>
                  <span className="text-xs text-foreground font-medium">
                    {track.fadeIn.toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[track.fadeIn]}
                  min={0}
                  max={5}
                  step={0.1}
                  onValueChange={([value]) => onFadeInChange(value)}
                  className="w-full"
                />
              </div>

              {/* Fade Out control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Fade Out</span>
                  <span className="text-xs text-foreground font-medium">
                    {track.fadeOut.toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[track.fadeOut]}
                  min={0}
                  max={5}
                  step={0.1}
                  onValueChange={([value]) => onFadeOutChange(value)}
                  className="w-full"
                />
              </div>

              {/* Delete button */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Track
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface MusicLibraryItemProps {
  track: typeof musicLibrary[0];
  onAdd: () => void;
  onToggleFavorite: () => void;
}

const MusicLibraryItem = ({ track, onAdd, onToggleFavorite }: MusicLibraryItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Play button */}
      <Button
        variant="icon"
        size="iconSm"
        className="bg-secondary"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
      </Button>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
        <p className="text-xxs text-muted-foreground">{track.artist}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-muted-foreground">
        {MediaService.formatDuration(track.duration)}
      </span>

      {/* Favorite */}
      <Button
        variant="iconGhost"
        size="iconSm"
        onClick={onToggleFavorite}
      >
        <Heart
          className={cn(
            'w-4 h-4 transition-colors',
            track.isFavorite ? 'text-destructive fill-destructive' : 'text-muted-foreground'
          )}
        />
      </Button>

      {/* Add button */}
      <Button variant="gradient" size="sm" onClick={onAdd}>
        <Plus className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};

const AudioEditorScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(() => {
    if (projectId) {
      return ProjectService.getProject(projectId);
    }
    // Create a new project for standalone audio editing
    const newProject = ProjectService.createProject('Audio Project');
    newProject.duration = 60; // Default 60 second duration
    ProjectService.saveProject(newProject);
    return newProject;
  });

  const [viewMode, setViewMode] = useState<ViewMode>('tracks');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [library, setLibrary] = useState(musicLibrary);

  const saveProject = useCallback(
    (updatedProject: Project) => {
      setProject(updatedProject);
      ProjectService.saveProject(updatedProject);
    },
    []
  );

  const handleAddTrack = (musicTrack: typeof musicLibrary[0]) => {
    if (!project) return;

    const newTrack: AudioTrack = {
      id: uuidv4(),
      uri: `music://${musicTrack.id}`,
      name: musicTrack.name,
      startTime: 0,
      endTime: musicTrack.duration,
      trimStart: 0,
      trimEnd: musicTrack.duration,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
      isMuted: false,
    };

    saveProject({
      ...project,
      audioTracks: [...project.audioTracks, newTrack],
    });

    setViewMode('tracks');
  };

  const handleAddVoiceover = () => {
    if (!project) return;

    // Simulate adding a voiceover (in real app, this would open recording)
    const newTrack: AudioTrack = {
      id: uuidv4(),
      uri: 'voice://recording-' + Date.now(),
      name: 'Voiceover ' + (project.audioTracks.filter(t => t.uri.includes('voice')).length + 1),
      startTime: 0,
      endTime: 10,
      trimStart: 0,
      trimEnd: 10,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
      isMuted: false,
    };

    saveProject({
      ...project,
      audioTracks: [...project.audioTracks, newTrack],
    });
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<AudioTrack>) => {
    if (!project) return;

    saveProject({
      ...project,
      audioTracks: project.audioTracks.map((track) =>
        track.id === trackId ? { ...track, ...updates } : track
      ),
    });
  };

  const handleDeleteTrack = (trackId: string) => {
    if (!project) return;

    saveProject({
      ...project,
      audioTracks: project.audioTracks.filter((track) => track.id !== trackId),
    });
    setSelectedTrackId(null);
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

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Audio Editor</h1>
            <p className="text-xxs text-muted-foreground">
              {project.audioTracks.length} track{project.audioTracks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'tracks' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('tracks')}
          >
            <AudioWaveform className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'library' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('library')}
          >
            <Library className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'tracks' ? (
            <motion.div
              key="tracks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col"
            >
              {/* Playback controls */}
              <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button
                    variant="icon"
                    size="iconLg"
                    className="xtrim-gradient xtrim-glow"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-primary-foreground fill-current" />
                    ) : (
                      <Play className="w-6 h-6 text-primary-foreground fill-current" />
                    )}
                  </Button>
                </div>

                {/* Timeline scrubber */}
                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={Math.max(project.duration, 1)}
                    step={0.1}
                    onValueChange={([value]) => setCurrentTime(value)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{MediaService.formatDuration(currentTime)}</span>
                    <span>{MediaService.formatDuration(project.duration)}</span>
                  </div>
                </div>
              </div>

              {/* Tracks list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {project.audioTracks.length > 0 ? (
                  project.audioTracks.map((track) => (
                    <AudioTrackItem
                      key={track.id}
                      track={track}
                      isSelected={track.id === selectedTrackId}
                      onSelect={() => setSelectedTrackId(track.id)}
                      onVolumeChange={(volume) => handleUpdateTrack(track.id, { volume })}
                      onFadeInChange={(fadeIn) => handleUpdateTrack(track.id, { fadeIn })}
                      onFadeOutChange={(fadeOut) => handleUpdateTrack(track.id, { fadeOut })}
                      onMuteToggle={() => handleUpdateTrack(track.id, { isMuted: !track.isMuted })}
                      onDelete={() => handleDeleteTrack(track.id)}
                      projectDuration={project.duration}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <Music className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium mb-1">No audio tracks</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add music or record a voiceover
                    </p>
                    <div className="flex gap-2">
                      <Button variant="gradient" onClick={() => setViewMode('library')}>
                        <Music className="w-4 h-4" />
                        Add Music
                      </Button>
                      <Button variant="outline" onClick={handleAddVoiceover}>
                        <Mic className="w-4 h-4" />
                        Record
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom actions */}
              {project.audioTracks.length > 0 && (
                <div className="px-4 py-3 border-t border-border flex gap-2 safe-area-bottom">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setViewMode('library')}
                  >
                    <Music className="w-4 h-4" />
                    Add Music
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleAddVoiceover}>
                    <Mic className="w-4 h-4" />
                    Record
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              {/* Search */}
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setSearchQuery('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
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
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filteredLibrary.length > 0 ? (
                  filteredLibrary.map((track) => (
                    <MusicLibraryItem
                      key={track.id}
                      track={track}
                      onAdd={() => handleAddTrack(track)}
                      onToggleFavorite={() => handleToggleFavorite(track.id)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <p className="text-muted-foreground">No music found</p>
                  </div>
                )}
              </div>

              {/* Back to tracks button */}
              <div className="px-4 py-3 border-t border-border safe-area-bottom">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setViewMode('tracks')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Tracks
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AudioEditorScreen;
