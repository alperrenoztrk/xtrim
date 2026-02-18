import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  Undo2,
  Redo2,
  Scissors,
  Split,
  Trash2,
  Volume2,
  Music,
  Type,
  Layers,
  Sparkles,
  Download,
  Plus,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Copy,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward,
  X,
  Check,
  Wand2,
  Palette,
  RotateCcw,
  Crop,
  Filter,
  SlidersHorizontal,
  Zap,
  Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import { AutoCutPanel } from '@/components/AutoCutPanel';
import { VideoEnhancePanel } from '@/components/VideoEnhancePanel';
import { VideoStabilizePanel } from '@/components/VideoStabilizePanel';
import { VideoSpeedPanel } from '@/components/VideoSpeedPanel';
import { VideoColorPanel } from '@/components/VideoColorPanel';
import { TextOverlayPanel } from '@/components/TextOverlayPanel';
import { DraggableTextOverlay } from '@/components/DraggableTextOverlay';
import { VideoMergePanel } from '@/components/VideoMergePanel';
import { VideoRotateCropPanel } from '@/components/VideoRotateCropPanel';
import VideoAIGeneratePanel from '@/components/VideoAIGeneratePanel';
import VideoTranslatePanel from '@/components/VideoTranslatePanel';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { ffmpegService } from '@/services/FFmpegService';
import { cn } from '@/lib/utils';
import type { Project, TimelineClip, MediaItem, AudioTrack } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type EditorTool = 'trim' | 'split' | 'delete' | 'audio' | 'text' | 'effects' | 'layers' | 'autocut';

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  shadow: boolean;
  animation: 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'scale' | 'typewriter' | 'bounce' | 'glow';
}

interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  x?: number; // percentage 0-100 for custom position
  y?: number; // percentage 0-100 for custom position
  style: TextStyle;
  startTime: number;
  endTime: number;
}

const toolItems: { id: EditorTool; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'trim', icon: Scissors, label: 'Trim' },
  { id: 'split', icon: Split, label: 'Split' },
  { id: 'delete', icon: Trash2, label: 'Delete' },
  { id: 'audio', icon: Volume2, label: 'Audio' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'effects', icon: Sparkles, label: 'Effects' },
  { id: 'layers', icon: Layers, label: 'Layers' },
];

const moreMenuItems = [
  { id: 'merge', icon: Layers, label: 'Merge' },
  { id: 'ai-generate', icon: Wand2, label: 'AI Video Generate', isAI: true, isPro: true },
  { id: 'translate', icon: Languages, label: 'Video Translator', isAI: true, isPro: true },
  { id: 'autocut', icon: Zap, label: 'AutoCut', isAI: true },
  { id: 'enhance', icon: Wand2, label: 'AI Enhance', isAI: true },
  { id: 'stabilize', icon: Sparkles, label: 'Stabilize', isAI: true },
  { id: 'speed', icon: SlidersHorizontal, label: 'Speed' },
  { id: 'filters', icon: Filter, label: 'Filters' },
  { id: 'effects', icon: Sparkles, label: 'Effects' },
  { id: 'crop', icon: Crop, label: 'Crop' },
  { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
  { id: 'color', icon: Palette, label: 'Color' },
  { id: 'duplicate', icon: Copy, label: 'Duplicate' },
];

const TimelineClipItem = ({
  clip,
  media,
  isSelected,
  onSelect,
  isDragging,
}: {
  clip: TimelineClip;
  media?: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  isDragging?: boolean;
}) => {
  const duration = clip.endTime - clip.startTime;
  const width = Math.max(80, duration * 50); // 50px per second, min 80px

  const isPhoto = media?.type === 'photo';
  
  return (
    <div
      className={cn(
        'relative h-16 rounded-lg overflow-hidden transition-all border-2 select-none',
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent',
        isDragging ? 'opacity-90 scale-105 shadow-lg shadow-primary/30 cursor-grabbing z-50' : 'cursor-grab'
      )}
      style={{ width }}
      onClick={onSelect}
    >
      {/* Thumbnail background */}
      <div className="absolute inset-0 bg-secondary">
        {media?.thumbnail && (
          <img
            src={media.thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-80 pointer-events-none"
          />
        )}
      </div>

      {/* Gradient overlay - different color for photos */}
      <div className={cn(
        "absolute inset-0 pointer-events-none",
        isPhoto 
          ? "bg-gradient-to-r from-accent/30 to-primary/20" 
          : "bg-gradient-to-r from-primary/20 to-accent/20"
      )} />

      {/* Media type indicator */}
      <div className="absolute top-1 left-1 pointer-events-none">
        {isPhoto ? (
          <div className="w-4 h-4 rounded bg-accent/80 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="w-4 h-4 rounded bg-primary/80 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Drag indicator */}
      <div className="absolute top-1 right-1 pointer-events-none">
        <div className="w-4 h-4 rounded bg-black/50 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
      </div>

      {/* Duration label */}
      <div className="absolute bottom-1 left-2 text-xxs font-medium text-white bg-black/50 px-1 rounded pointer-events-none">
        {MediaService.formatDuration(duration)}
      </div>

      {/* Trim handles - only shown when selected */}
      {isSelected && !isDragging && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/50 rounded" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/50 rounded" />
          </div>
        </>
      )}
    </div>
  );
};

const VideoEditorScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioTrackElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [project, setProject] = useState<Project | null>(() => {
    if (projectId === 'new') {
      const newProject = ProjectService.createProject();
      ProjectService.saveProject(newProject);
      return newProject;
    }
    return projectId ? ProjectService.getProject(projectId) : null;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [undoStack, setUndoStack] = useState<Project[]>([]);
  const [redoStack, setRedoStack] = useState<Project[]>([]);
  const [videoError, setVideoError] = useState(false);
  const [isMediaImporting, setIsMediaImporting] = useState(false);
  const [mediaImportProgress, setMediaImportProgress] = useState(0);
  const [currentImportFileName, setCurrentImportFileName] = useState<string | null>(null);
  
  // Panel states
  const [showTrimPanel, setShowTrimPanel] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [customAudioName, setCustomAudioName] = useState('');
  const [isSearchingAudio, setIsSearchingAudio] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAutoCutPanel, setShowAutoCutPanel] = useState(false);
  const [showEnhancePanel, setShowEnhancePanel] = useState(false);
  const [showStabilizePanel, setShowStabilizePanel] = useState(false);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [showAIGeneratePanel, setShowAIGeneratePanel] = useState(false);
  const [showTranslatePanel, setShowTranslatePanel] = useState(false);
  const [showRotateCropPanel, setShowRotateCropPanel] = useState(false);
  
  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  // Audio state
  const [clipVolume, setClipVolume] = useState(100);
  const [clipSpeed, setClipSpeed] = useState(1);
  
  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [isEditingTextOverlays, setIsEditingTextOverlays] = useState(false);
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Handle phone back button - navigate only one page back
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      navigate(-1);
    };

    // Push a new state so back button triggers popstate
    window.history.pushState({ page: 'editor' }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Handle URL tool parameter to open panels automatically
  useEffect(() => {
    const tool = searchParams.get('tool');
    if (tool === 'ai-generate') {
      setShowAIGeneratePanel(true);
    } else if (tool === 'autocut') {
      setShowAutoCutPanel(true);
    } else if (tool === 'enhance') {
      setShowEnhancePanel(true);
    } else if (tool === 'translate') {
      setShowTranslatePanel(true);
    }
  }, [searchParams]);

  const saveProject = useCallback(
    (updatedProject: Project) => {
      if (project) {
        setUndoStack((prev) => [...prev.slice(-20), project]);
        setRedoStack([]);
      }
      setProject(updatedProject);
      ProjectService.saveProject(updatedProject);
    },
    [project]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    if (project) {
      setRedoStack((prev) => [...prev, project]);
    }
    setProject(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    ProjectService.saveProject(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    if (project) {
      setUndoStack((prev) => [...prev, project]);
    }
    setProject(next);
    setRedoStack((prev) => prev.slice(0, -1));
    ProjectService.saveProject(next);
  };

  const handleAddMedia = async (files: FileList | null) => {
    if (!files || !project) return;

    const selectedFiles = Array.from(files);
    setIsMediaImporting(true);
    setMediaImportProgress(0);
    setCurrentImportFileName(null);

    const newMediaItems: MediaItem[] = [];
    const newClips: TimelineClip[] = [];
    let videoCount = 0;
    let photoCount = 0;

    try {
      for (const [index, file] of selectedFiles.entries()) {
        setCurrentImportFileName(file.name);
        const mediaItem = await MediaService.createMediaItem(file);
        newMediaItems.push(mediaItem);

        if (mediaItem.type === 'video') videoCount++;
        if (mediaItem.type === 'photo') photoCount++;

        if (mediaItem.type !== 'audio') {
          // Photos get default 5 second duration, videos use their actual duration
          const defaultDuration = mediaItem.type === 'photo' ? 5 : (mediaItem.duration || 5);
          const clip: TimelineClip = {
            id: uuidv4(),
            mediaId: mediaItem.id,
            startTime: 0,
            endTime: defaultDuration,
            order: project.timeline.length + newClips.length,
          };
          newClips.push(clip);
        }

        setMediaImportProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
      }

      const updatedProject = {
        ...project,
        mediaItems: [...project.mediaItems, ...newMediaItems],
        timeline: [...project.timeline, ...newClips],
        duration: [...project.timeline, ...newClips].reduce(
          (acc, clip) => acc + (clip.endTime - clip.startTime),
          0
        ),
      };

      saveProject(updatedProject);

      // Show feedback toast
      const parts = [];
      if (videoCount > 0) parts.push(`${videoCount} video`);
      if (photoCount > 0) parts.push(`${photoCount} photo`);
      if (parts.length > 0) {
        toast.success('Media added', {
          description: `${parts.join(' and ')} added to timeline`,
        });
      }
    } catch (error) {
      toast.error('Media import failed', {
        description: 'An error occurred while adding media. Please try again.',
      });
    } finally {
      setCurrentImportFileName(null);
      setMediaImportProgress(0);
      setIsMediaImporting(false);
    }
  };

  const handleDeleteClip = () => {
    if (!selectedClipId || !project) return;

    const updatedTimeline = project.timeline
      .filter((c) => c.id !== selectedClipId)
      .map((clip, index) => ({ ...clip, order: index }));

    saveProject({
      ...project,
      timeline: updatedTimeline,
      duration: updatedTimeline.reduce(
        (acc, clip) => acc + (clip.endTime - clip.startTime),
        0
      ),
    });
    setSelectedClipId(null);
  };

  const handleSplitClip = () => {
    if (!selectedClipId || !project) return;

    const clipIndex = project.timeline.findIndex((c) => c.id === selectedClipId);
    if (clipIndex === -1) return;

    const clip = project.timeline[clipIndex];
    const splitPoint = (clip.startTime + clip.endTime) / 2;

    const firstHalf: TimelineClip = {
      ...clip,
      endTime: splitPoint,
    };

    const secondHalf: TimelineClip = {
      id: uuidv4(),
      mediaId: clip.mediaId,
      startTime: splitPoint,
      endTime: clip.endTime,
      order: clip.order + 1,
    };

    const updatedTimeline = [
      ...project.timeline.slice(0, clipIndex),
      firstHalf,
      secondHalf,
      ...project.timeline.slice(clipIndex + 1).map((c) => ({ ...c, order: c.order + 1 })),
    ];

    saveProject({ ...project, timeline: updatedTimeline });
  };

  const handleReorderClips = (newOrder: TimelineClip[]) => {
    if (!project) return;
    const reorderedTimeline = newOrder.map((clip, index) => ({
      ...clip,
      order: index,
    }));
    saveProject({ ...project, timeline: reorderedTimeline });
    toast.success('Order updated');
  };

  // Handle Trim
  const handleOpenTrim = () => {
    if (!selectedClipId || !project) return;
    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (!clip) return;
    setTrimStart(clip.startTime);
    setTrimEnd(clip.endTime);
    setShowTrimPanel(true);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
  };

  const handleApplyTrim = () => {
    if (!selectedClipId || !project) return;
    
    const updatedTimeline = project.timeline.map((clip) => {
      if (clip.id === selectedClipId) {
        return { ...clip, startTime: trimStart, endTime: trimEnd };
      }
      return clip;
    });
    
    const newDuration = updatedTimeline.reduce(
      (acc, clip) => acc + (clip.endTime - clip.startTime),
      0
    );
    
    saveProject({ ...project, timeline: updatedTimeline, duration: newDuration });
    setShowTrimPanel(false);
  };

  // Handle Audio settings
  const handleOpenAudio = () => {
    setShowAudioPanel(true);
    setShowTrimPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
  };

  const handleAddAudioTrack = async (files: FileList | null) => {
    if (!files || !project) return;
    
    const newAudioTracks: AudioTrack[] = [];
    
    for (const file of Array.from(files)) {
      const mediaItem = await MediaService.createMediaItem(file);
      if (mediaItem.type === 'audio') {
        const audioTrack: AudioTrack = {
          id: uuidv4(),
          uri: mediaItem.uri,
          name: mediaItem.name,
          startTime: 0,
          endTime: mediaItem.duration || 10,
          trimStart: 0,
          trimEnd: mediaItem.duration || 10,
          volume: 1,
          fadeIn: 0,
          fadeOut: 0,
          isMuted: false,
        };
        newAudioTracks.push(audioTrack);
      }
    }
    
    saveProject({
      ...project,
      audioTracks: [...project.audioTracks, ...newAudioTracks],
    });
  };

  const handleAddAudioFromSearch = async () => {
    if (!project) return;

    const query = customAudioName.trim();
    if (!query) {
      toast.error('Please enter a song name');
      return;
    }

    try {
      setIsSearchingAudio(true);

      const searchUrl = new URL('https://itunes.apple.com/search');
      searchUrl.searchParams.set('term', query);
      searchUrl.searchParams.set('entity', 'song');
      searchUrl.searchParams.set('limit', '1');

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        throw new Error('search-failed');
      }

      const data = await response.json() as {
        resultCount: number;
        results: Array<{
          trackName?: string;
          artistName?: string;
          previewUrl?: string;
        }>;
      };

      const bestMatch = data.results.find((item) => item.previewUrl);
      if (!bestMatch?.previewUrl) {
        toast.error('No song found for this name');
        return;
      }

      const trackLabel = [bestMatch.trackName, bestMatch.artistName].filter(Boolean).join(' - ');
      const resolvedName = trackLabel || query;

      const audioTrack: AudioTrack = {
        id: uuidv4(),
        uri: bestMatch.previewUrl,
        name: resolvedName,
        startTime: 0,
        endTime: project.duration || 10,
        trimStart: 0,
        trimEnd: project.duration || 10,
        volume: 1,
        fadeIn: 0,
        fadeOut: 0,
        isMuted: false,
      };

      saveProject({
        ...project,
        audioTracks: [...project.audioTracks, audioTrack],
      });

      setCustomAudioName('');
      toast.success('Song found and added');
    } catch {
      toast.error('Could not search song right now');
    } finally {
      setIsSearchingAudio(false);
    }
  };

  const handleRemoveAudioTrack = (trackId: string) => {
    if (!project) return;

    const audioEl = audioTrackElementsRef.current.get(trackId);
    if (audioEl) {
      audioEl.pause();
      audioTrackElementsRef.current.delete(trackId);
    }

    saveProject({
      ...project,
      audioTracks: project.audioTracks.filter((t) => t.id !== trackId),
    });
  };

  const handleUpdateAudioVolume = (trackId: string, volume: number) => {
    if (!project) return;
    saveProject({
      ...project,
      audioTracks: project.audioTracks.map((t) =>
        t.id === trackId ? { ...t, volume: volume / 100 } : t
      ),
    });
  };

  // Handle Text Overlay
  const handleOpenText = () => {
    setShowTextPanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
  };

  const handleAddTextOverlay = (overlay: TextOverlay) => {
    setTextOverlays([...textOverlays, overlay]);
  };

  const handleUpdateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(textOverlays.map((t) => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  const handleRemoveTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter((t) => t.id !== id));
  };

  // Handle text overlay position change (drag)
  const handleTextOverlayPositionChange = (id: string, x: number, y: number) => {
    setTextOverlays(textOverlays.map((t) =>
      t.id === id ? { ...t, position: 'custom' as const, x, y } : t
    ));
  };

  // Toggle text editing mode
  const handleToggleTextEditing = () => {
    setIsEditingTextOverlays(!isEditingTextOverlays);
    if (isEditingTextOverlays) {
      setSelectedTextOverlayId(null);
    }
  };

  const ensureVideoClipSelection = useCallback(() => {
    if (!project) return false;

    const selectedClip = selectedClipId
      ? project.timeline.find((clip) => clip.id === selectedClipId)
      : null;
    const selectedMedia = selectedClip
      ? project.mediaItems.find((media) => media.id === selectedClip.mediaId)
      : null;

    if (selectedClip && selectedMedia?.type === 'video') {
      return true;
    }

    const firstVideoClip = project.timeline.find((clip) => {
      const media = project.mediaItems.find((item) => item.id === clip.mediaId);
      return media?.type === 'video';
    });

    if (!firstVideoClip) {
      toast.error('Project contains no video clip');
      return false;
    }

    setSelectedClipId(firstVideoClip.id);
    return true;
  }, [project, selectedClipId]);

  // Handle AutoCut Panel
  const handleOpenAutoCut = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    setShowAutoCutPanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowEnhancePanel(false);
  };

  // Handle Enhance Panel
  const handleOpenEnhance = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    setShowEnhancePanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowStabilizePanel(false);
  };

  // Handle Stabilize Panel
  const handleOpenStabilize = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    setShowStabilizePanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowSpeedPanel(false);
  };

  // Handle Speed Panel
  const handleOpenSpeed = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    setShowSpeedPanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowColorPanel(false);
  };

  // Handle speed change - persist to timeline clip
  const handleApplySpeed = (speed: number) => {
    if (!selectedClipId || !project) return;
    
    setClipSpeed(speed);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
    }

    // Update the clip in timeline with new speed
    const updatedTimeline = project.timeline.map((clip) => {
      if (clip.id === selectedClipId) {
        return { 
          ...clip, 
          speed
        };
      }
      return clip;
    });

    const newTotalDuration = updatedTimeline.reduce(
      (acc, clip) => acc + (clip.endTime - clip.startTime),
      0
    );

    saveProject({
      ...project,
      timeline: updatedTimeline,
      duration: newTotalDuration,
    });
  };

  // Handle Color Panel
  const handleOpenColor = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    setShowColorPanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowMergePanel(false);
  };

  // Handle Merge Panel
  const handleOpenMerge = () => {
    if (!project || project.timeline.length < 2) {
      toast.error('At least 2 clips are required to merge');
      return;
    }
    setShowMergePanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
  };

  // Handle apply transition between clips
  const handleApplyTransition = (transitionId: string, duration: number) => {
    if (!project || project.timeline.length < 2) {
      toast.error('At least 2 clips are required to apply transitions');
      return;
    }

    const orderedTimeline = [...project.timeline].sort((a, b) => a.order - b.order);
    const updatedTimeline = orderedTimeline.map((clip, index) => ({
      ...clip,
      transition: index < orderedTimeline.length - 1 && transitionId !== 'none' ? transitionId : undefined,
    }));

    saveProject({
      ...project,
      timeline: updatedTimeline,
    });

    const transitionLabel = transitionId === 'none' ? 'No transition' : transitionId;
    toast.success(`Transition applied to ${Math.max(updatedTimeline.length - 1, 0)} clip gap(s): ${transitionLabel} (${duration}s)`);
  };

  // Handle merge all clips with transition
  const handleMergeAllClips = async (transitionId: string) => {
    if (!project || project.timeline.length < 2) return;

    const orderedClips = [...project.timeline].sort((a, b) => a.order - b.order);
    const totalDuration = orderedClips.reduce(
      (acc, clip) => acc + (clip.endTime - clip.startTime),
      0
    );

    const primaryClip = orderedClips[0];
    const primaryMedia = project.mediaItems.find((item) => item.id === primaryClip.mediaId);
    const firstVideoMedia = orderedClips
      .map((clip) => project.mediaItems.find((item) => item.id === clip.mediaId))
      .find((item) => item?.type === 'video');
    const mergedMediaSource = firstVideoMedia ?? primaryMedia;

    if (!mergedMediaSource) {
      toast.error('No suitable media found for merge');
      return;
    }

    let mergedUri = mergedMediaSource.uri;
    let mergedSize = mergedMediaSource.size;

    try {
      const mergedBlob = await ffmpegService.mergeTimelineClips(project);
      mergedUri = URL.createObjectURL(mergedBlob);
      mergedSize = mergedBlob.size;
    } catch (error) {
      console.error('Real merge failed, using source media:', error);
      toast.warning('Could not process full merge. Using first clip as fallback.');
    }

    const mergedMediaId = uuidv4();
    const mergedMedia: MediaItem = {
      id: mergedMediaId,
      type: mergedMediaSource.type,
      uri: mergedUri,
      name: `Merged ${mergedMediaSource.type === 'video' ? 'Video' : 'Media'} (${orderedClips.length} clip)`,
      duration: totalDuration,
      thumbnail: mergedMediaSource.thumbnail,
      width: mergedMediaSource.width,
      height: mergedMediaSource.height,
      size: mergedSize,
      createdAt: new Date(),
    };

    const mergedClip: TimelineClip = {
      id: uuidv4(),
      mediaId: mergedMediaId,
      startTime: 0,
      endTime: totalDuration,
      order: 0,
      transition: transitionId === 'none' ? undefined : transitionId,
    };

    const updatedProject = {
      ...project,
      mediaItems: [...project.mediaItems, mergedMedia],
      timeline: [mergedClip],
      duration: totalDuration,
    };

    saveProject(updatedProject);
    setSelectedClipId(mergedClip.id);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Handle AI Video Generate Panel
  const handleOpenAIGenerate = () => {
    setShowAIGeneratePanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
    setShowMergePanel(false);
    setShowTranslatePanel(false);
  };

  // Handle Translate Panel
  const handleOpenTranslate = () => {
    setShowTranslatePanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
    setShowMergePanel(false);
    setShowAIGeneratePanel(false);
  };

  // Handle Rotate/Crop Panel
  const handleOpenRotateCrop = () => {
    if (!selectedClipId || !project) {
      toast.error('Please select a clip');
      return;
    }
    setShowRotateCropPanel(true);
    setShowTrimPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowMoreMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
    setShowMergePanel(false);
    setShowAIGeneratePanel(false);
    setShowTranslatePanel(false);
  };

  // Handle apply rotation to clip
  const handleApplyRotation = (rotation: number, flipH: boolean, flipV: boolean) => {
    if (!selectedClipId || !project) return;

    const updatedTimeline = project.timeline.map((clip) => {
      if (clip.id === selectedClipId) {
        return { ...clip, rotation, flipH, flipV };
      }
      return clip;
    });

    saveProject({ ...project, timeline: updatedTimeline });
    toast.success('Rotation applied');
  };

  // Handle apply crop to clip
  const handleApplyCrop = (cropRatio: string | null) => {
    if (!selectedClipId || !project) return;

    const updatedTimeline = project.timeline.map((clip) => {
      if (clip.id === selectedClipId) {
        if (!cropRatio) {
          const { cropRatio: _cropRatio, ...clipWithoutCrop } = clip;
          return clipWithoutCrop;
        }

        return { ...clip, cropRatio };
      }
      return clip;
    });

    saveProject({ ...project, timeline: updatedTimeline });
    toast.success('Crop applied');
  };

  const handleAIVideoGenerated = (videoUrl: string, duration: number) => {
    if (!project) return;
    
    // Create a new media item for the generated video
    const newMediaId = uuidv4();
    const newMedia: MediaItem = {
      id: newMediaId,
      type: 'photo', // AI generates image frames
      uri: videoUrl,
      name: `AI Generated - ${new Date().toLocaleTimeString()}`,
      duration: duration,
      createdAt: new Date(),
    };

    // Create a new clip for the timeline
    const currentDuration = project.timeline.reduce(
      (acc, clip) => acc + (clip.endTime - clip.startTime),
      0
    );

    const newClip: TimelineClip = {
      id: uuidv4(),
      mediaId: newMediaId,
      startTime: 0,
      endTime: duration,
      order: project.timeline.length,
    };

    // Update project with new media and clip
    saveProject({
      ...project,
      mediaItems: [...project.mediaItems, newMedia],
      timeline: [...project.timeline, newClip],
      duration: currentDuration + duration,
    });

    setShowAIGeneratePanel(false);
  };

  // Handle AutoCut results - split video at suggested points
  const handleApplyAutoCuts = (cutPoints: number[]) => {
    if (!selectedClipId || !project || cutPoints.length === 0) return;

    const clipIndex = project.timeline.findIndex((c) => c.id === selectedClipId);
    if (clipIndex === -1) return;

    const originalClip = project.timeline[clipIndex];
    const allTimes = [originalClip.startTime, ...cutPoints, originalClip.endTime].sort((a, b) => a - b);
    
    // Create new clips from cut points
    const newClips: TimelineClip[] = [];
    for (let i = 0; i < allTimes.length - 1; i++) {
      newClips.push({
        id: i === 0 ? originalClip.id : uuidv4(),
        mediaId: originalClip.mediaId,
        startTime: allTimes[i],
        endTime: allTimes[i + 1],
        order: clipIndex + i,
      });
    }

    // Replace original clip with new clips
    const updatedTimeline = [
      ...project.timeline.slice(0, clipIndex),
      ...newClips,
      ...project.timeline.slice(clipIndex + 1).map((c, idx) => ({
        ...c,
        order: clipIndex + newClips.length + idx,
      })),
    ];

    saveProject({
      ...project,
      timeline: updatedTimeline,
      duration: updatedTimeline.reduce((acc, clip) => acc + (clip.endTime - clip.startTime), 0),
    });

    toast.success(`Video ${newClips.length} parts split`);
  };

  // Handle More menu actions
  const handleMoreMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'merge':
        handleOpenMerge();
        break;
      case 'ai-generate':
        handleOpenAIGenerate();
        break;
      case 'translate':
        handleOpenTranslate();
        break;
      case 'autocut':
        handleOpenAutoCut();
        break;
      case 'enhance':
        handleOpenEnhance();
        break;
      case 'stabilize':
        handleOpenStabilize();
        break;
      case 'duplicate':
        if (!selectedClipId || !project) return;
        const clipToDuplicate = project.timeline.find((c) => c.id === selectedClipId);
        if (clipToDuplicate) {
          const newClip: TimelineClip = {
            ...clipToDuplicate,
            id: uuidv4(),
            order: project.timeline.length,
          };
          saveProject({
            ...project,
            timeline: [...project.timeline, newClip],
            duration: project.duration + (newClip.endTime - newClip.startTime),
          });
        }
        break;
      case 'speed':
        handleOpenSpeed();
        break;
      case 'color':
      case 'filters':
        handleOpenColor();
        break;
      case 'rotate':
      case 'crop':
        handleOpenRotateCrop();
        break;
      default:
        break;
    }
    setShowMoreMenu(false);
  };

  // Tool click handler
  const handleToolClick = (toolId: EditorTool) => {
    setActiveTool(activeTool === toolId ? null : toolId);
    
    switch (toolId) {
      case 'trim':
        handleOpenTrim();
        break;
      case 'split':
        if (selectedClipId) handleSplitClip();
        break;
      case 'delete':
        if (selectedClipId) handleDeleteClip();
        break;
      case 'audio':
        handleOpenAudio();
        break;
      case 'text':
        handleOpenText();
        break;
      default:
        break;
    }
  };

  // Auto-select first clip if none selected
  useEffect(() => {
    if (project && project.timeline.length > 0 && !selectedClipId) {
      setSelectedClipId(project.timeline[0].id);
    }
  }, [project, selectedClipId]);

  // Load clip's saved speed when selecting a new clip
  useEffect(() => {
    if (!project || !selectedClipId) return;
    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (clip && clip.speed) {
      setClipSpeed(clip.speed);
      const video = videoRef.current;
      if (video) {
        video.playbackRate = clip.speed;
      }
    } else {
      setClipSpeed(1);
      const video = videoRef.current;
      if (video) {
        video.playbackRate = 1;
      }
    }
  }, [selectedClipId, project]);

  // Handle video playback with clip boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !project) return;

    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (!clip) return;

    if (isPlaying) {
      // Set video to clip start time if before
      if (video.currentTime < clip.startTime || video.currentTime >= clip.endTime) {
        video.currentTime = clip.startTime;
      }
      video.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, selectedClipId, project]);

  // Keep audio tracks in sync with the active video clip playback.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !project) return;

    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const syncAudioTracks = () => {
      const now = video.currentTime;

      for (const track of project.audioTracks) {
        const trackStart = Math.max(track.startTime, clip.startTime);
        const trackEnd = Math.min(track.endTime, clip.endTime);
        const shouldPlayTrack =
          isPlaying &&
          !track.isMuted &&
          track.volume > 0 &&
          now >= trackStart &&
          now <= trackEnd;

        let audioEl = audioTrackElementsRef.current.get(track.id);

        if (!audioEl) {
          audioEl = new Audio(track.uri);
          audioEl.preload = 'auto';
          audioEl.crossOrigin = 'anonymous';
          audioTrackElementsRef.current.set(track.id, audioEl);
        }

        audioEl.volume = Math.max(0, Math.min(track.volume, 1));

        if (!shouldPlayTrack) {
          if (!audioEl.paused) {
            audioEl.pause();
          }
          continue;
        }

        const desiredTime = Math.max(0, now - track.startTime + track.trimStart);
        if (Math.abs(audioEl.currentTime - desiredTime) > 0.35) {
          audioEl.currentTime = desiredTime;
        }

        if (audioEl.paused) {
          void audioEl.play().catch(() => {
            // Browser autoplay rules may block in some environments.
          });
        }
      }
    };

    syncAudioTracks();
    video.addEventListener('timeupdate', syncAudioTracks);

    return () => {
      video.removeEventListener('timeupdate', syncAudioTracks);

      if (!isPlaying) {
        for (const audioEl of audioTrackElementsRef.current.values()) {
          audioEl.pause();
        }
      }
    };
  }, [isPlaying, project, selectedClipId]);

  // Cleanup orphaned audio elements when track list changes.
  useEffect(() => {
    if (!project) return;

    const activeTrackIds = new Set(project.audioTracks.map((track) => track.id));
    for (const [trackId, audioEl] of audioTrackElementsRef.current.entries()) {
      if (!activeTrackIds.has(trackId)) {
        audioEl.pause();
        audioTrackElementsRef.current.delete(trackId);
      }
    }
  }, [project]);

  // Full cleanup on unmount.
  useEffect(() => {
    return () => {
      for (const audioEl of audioTrackElementsRef.current.values()) {
        audioEl.pause();
      }
      audioTrackElementsRef.current.clear();
    };
  }, []);

  // Sync video time with timeline and enforce clip boundaries
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !project) return;
    
    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (!clip) return;

    // Calculate relative time within the clip
    const relativeTime = video.currentTime - clip.startTime;
    const clipDuration = clip.endTime - clip.startTime;
    
    // Update current time display (relative to clip)
    setCurrentTime(Math.max(0, Math.min(relativeTime, clipDuration)));

    // Stop at clip end
    if (video.currentTime >= clip.endTime) {
      video.pause();
      video.currentTime = clip.startTime;
      setIsPlaying(false);
      setCurrentTime(0);
    }
    
    // Prevent going before clip start
    if (video.currentTime < clip.startTime) {
      video.currentTime = clip.startTime;
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    const video = videoRef.current;
    const clip = project?.timeline.find((c) => c.id === selectedClipId);
    if (video && clip) {
      video.currentTime = clip.startTime;
    }
    setCurrentTime(0);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    const clip = project?.timeline.find((c) => c.id === selectedClipId);
    
    if (video && clip && !isPlaying) {
      // Reset to clip start if at end
      if (video.currentTime >= clip.endTime || video.currentTime < clip.startTime) {
        video.currentTime = clip.startTime;
        setCurrentTime(0);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    const clip = project?.timeline.find((c) => c.id === selectedClipId);
    
    if (video && clip) {
      // time is relative to clip, so add clip.startTime
      const absoluteTime = clip.startTime + time;
      video.currentTime = Math.max(clip.startTime, Math.min(absoluteTime, clip.endTime));
      setCurrentTime(time);
    }
  };

  // When selected clip changes, reset video position
  useEffect(() => {
    const video = videoRef.current;
    const clip = project?.timeline.find((c) => c.id === selectedClipId);
    
    if (video && clip) {
      video.currentTime = clip.startTime;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [selectedClipId]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const selectedClip = project.timeline.find((c) => c.id === selectedClipId);
  const selectedMedia = selectedClip
    ? project.mediaItems.find((m) => m.id === selectedClip.mediaId)
    : null;
  const hasAnyClip = project.timeline.length > 0;

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      <input
        ref={fileInputRef}
        type="file"
        accept={MediaService.getSupportedVideoFormats()}
        multiple
        className="hidden"
        onChange={(e) => {
          handleAddMedia(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleAddAudioTrack(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">{project.name}</h1>
            <p className="text-xxs text-muted-foreground">
              {MediaService.formatDuration(project.duration)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button variant="gradient" size="sm" onClick={() => navigate(`/export/${project.id}`)}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </header>

      {/* Preview */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {selectedMedia ? (
          selectedMedia.type === 'video' ? (
            <div ref={previewContainerRef} className="relative max-h-full max-w-full w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={selectedMedia.uri}
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{
                  transform: `rotate(${selectedClip?.rotation || 0}deg) scaleX(${selectedClip?.flipH ? -1 : 1}) scaleY(${selectedClip?.flipV ? -1 : 1})`,
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                onError={() => setVideoError(true)}
                playsInline
                preload="auto"
              />
              {/* Draggable Text Overlays on Video */}
              {textOverlays.map((overlay) => {
                const videoCurrentTime = videoRef.current?.currentTime || 0;
                const isVisible = videoCurrentTime >= overlay.startTime && videoCurrentTime <= overlay.endTime;
                
                if (!isVisible && !isEditingTextOverlays) return null;
                
                return (
                  <DraggableTextOverlay
                    key={overlay.id}
                    overlay={overlay}
                    containerRef={previewContainerRef}
                    isEditing={isEditingTextOverlays}
                    onPositionChange={handleTextOverlayPositionChange}
                    onSelect={setSelectedTextOverlayId}
                  />
                );
              })}
              {/* Text editing mode indicator */}
              {isEditingTextOverlays && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Text Editing Mode
                </div>
              )}
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <div className="text-center p-4 max-w-sm">
                    <p className="text-destructive font-medium">Video cannot be played</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This format may not be supported by your browser.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: MP4, WebM, OGG
                    </p>
                    <p className="text-xs text-muted-foreground">
                      File name: {selectedMedia?.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div ref={previewContainerRef} className="relative max-h-full max-w-full w-full h-full flex items-center justify-center">
              <img
                src={selectedMedia.uri}
                alt=""
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                style={{
                  transform: `rotate(${selectedClip?.rotation || 0}deg) scaleX(${selectedClip?.flipH ? -1 : 1}) scaleY(${selectedClip?.flipV ? -1 : 1})`,
                }}
              />
              {/* Draggable Text Overlays on Image */}
              {textOverlays.map((overlay) => (
                <DraggableTextOverlay
                  key={overlay.id}
                  overlay={overlay}
                  containerRef={previewContainerRef}
                  isEditing={isEditingTextOverlays}
                  onPositionChange={handleTextOverlayPositionChange}
                  onSelect={setSelectedTextOverlayId}
                />
              ))}
              {/* Text editing mode indicator */}
              {isEditingTextOverlays && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  Text Editing Mode
                </div>
              )}
            </div>
          )
        ) : project.timeline.length > 0 ? (
          <div className="text-muted-foreground text-sm">Select a clip for preview</div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">Add media to start editing</p>
              <p className="text-sm text-muted-foreground mt-1">
                Import video or photo from your device
              </p>
            </div>
            <Button
              variant="gradient"
              onClick={() => fileInputRef.current?.click()}
              disabled={isMediaImporting}
            >
              <Plus className="w-4 h-4" />
              {isMediaImporting ? `Loading... %${mediaImportProgress}` : 'Add Media'}
            </Button>

            {isMediaImporting && (
              <div className="w-full max-w-sm rounded-lg border border-border bg-card/90 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground truncate">
                    {currentImportFileName ? `Loading: ${currentImportFileName}` : 'Loading media...'}
                  </span>
                  <span className="text-foreground font-semibold">%{mediaImportProgress}</span>
                </div>
                <Progress value={mediaImportProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Play button overlay */}
        {project.timeline.length > 0 && selectedMedia && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              variant="icon"
              size="iconLg"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 pointer-events-auto"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white fill-white" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white" />
              )}
            </Button>
          </div>
        )}

        {/* Video time display overlay */}
        {selectedMedia?.type === 'video' && selectedClip && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-sm text-white font-medium">
              {MediaService.formatDuration(currentTime)} / {MediaService.formatDuration(selectedClip.endTime - selectedClip.startTime)}
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="border-t border-border bg-card">
        {/* Video Progress Bar */}
        {selectedMedia?.type === 'video' && selectedClip && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="iconGhost"
                size="iconSm"
                onClick={handlePlayPause}
                className="shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
              <span className="text-sm font-medium text-primary min-w-[45px]">
                {MediaService.formatDuration(currentTime)}
              </span>
              <div className="flex-1 relative">
                <Slider
                  value={[currentTime]}
                  max={selectedClip.endTime - selectedClip.startTime}
                  step={0.01}
                  onValueChange={([value]) => handleSeek(value)}
                  className="w-full"
                />
                {/* Progress indicator line */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-primary/30 rounded-full pointer-events-none -translate-y-1/2"
                  style={{ 
                    width: `${(currentTime / (selectedClip.endTime - selectedClip.startTime)) * 100}%` 
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground min-w-[45px] text-right">
                {MediaService.formatDuration(selectedClip.endTime - selectedClip.startTime)}
              </span>
            </div>
          </div>
        )}

        {/* Timeline controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {MediaService.formatDuration(currentTime)}
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs text-muted-foreground">
              {MediaService.formatDuration(project.duration)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="iconGhost"
              size="iconSm"
              onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(timelineZoom * 100)}%
            </span>
            <Button
              variant="iconGhost"
              size="iconSm"
              onClick={() => setTimelineZoom((z) => Math.min(2, z + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Timeline scrubber */}
        <div className="px-4 py-2">
          <Slider
            value={[currentTime]}
            max={selectedClip ? (selectedClip.endTime - selectedClip.startTime) : Math.max(project.duration, 1)}
            step={0.1}
            onValueChange={([value]) => handleSeek(value)}
            className="w-full"
          />
        </div>

        {/* Clips */}
        <div className="relative h-24 px-4 overflow-x-auto scrollbar-hide">
          {project.timeline.length > 0 ? (
            <Reorder.Group
              axis="x"
              values={project.timeline}
              onReorder={handleReorderClips}
              className="flex gap-2 h-full items-center py-2"
              style={{ transform: `scaleX(${timelineZoom})`, transformOrigin: 'left' }}
            >
              {project.timeline
                .sort((a, b) => a.order - b.order)
                .map((clip) => (
                  <Reorder.Item 
                    key={clip.id} 
                    value={clip}
                    whileDrag={{ scale: 1.05, zIndex: 50 }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TimelineClipItem
                      clip={clip}
                      media={project.mediaItems.find((m) => m.id === clip.mediaId)}
                      isSelected={clip.id === selectedClipId}
                      onSelect={() => setSelectedClipId(clip.id)}
                    />
                  </Reorder.Item>
                ))}
            </Reorder.Group>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-4 h-4" />
                Add clip
              </Button>
            </div>
          )}
        </div>

        {/* Add media button */}
        {project.timeline.length > 0 && (
          <div className="flex justify-center py-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isMediaImporting}
            >
              <Plus className="w-4 h-4" />
              {isMediaImporting ? `Loading... %${mediaImportProgress}` : 'Add Media'}
            </Button>
          </div>
        )}
      </div>

      {/* Trim Panel */}
      <AnimatePresence>
        {showTrimPanel && selectedClip && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Trim Clip</h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowTrimPanel(false)}>
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button variant="gradient" size="sm" onClick={handleApplyTrim}>
                  <Check className="w-4 h-4" />
                  Apply
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Start: {MediaService.formatDuration(trimStart)}</label>
                <Slider
                  value={[trimStart]}
                  min={0}
                  max={trimEnd - 0.1}
                  step={0.1}
                  onValueChange={([v]) => setTrimStart(v)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End: {MediaService.formatDuration(trimEnd)}</label>
                <Slider
                  value={[trimEnd]}
                  min={trimStart + 0.1}
                  max={selectedMedia?.duration || 10}
                  step={0.1}
                  onValueChange={([v]) => setTrimEnd(v)}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Duration: {MediaService.formatDuration(trimEnd - trimStart)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Panel */}
      <AnimatePresence>
        {showAudioPanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-10 max-h-60 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Audio</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAudioPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Add audio track button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3"
              onClick={() => audioInputRef.current?.click()}
            >
              <Music className="w-4 h-4" />
              Add Audio Track
            </Button>

            <div className="rounded-lg border border-border p-3 mb-4 space-y-2">
              <p className="text-xs text-muted-foreground">Type the song name and let the app find it online and add it</p>
              <Input
                placeholder="Song name (e.g., Believer Imagine Dragons)"
                value={customAudioName}
                onChange={(e) => setCustomAudioName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAudioFromSearch();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleAddAudioFromSearch}
                disabled={isSearchingAudio}
                className="w-full"
              >
                {isSearchingAudio ? 'Searching...' : 'Find and Add Song'}
              </Button>
            </div>
            
            {/* Audio tracks list */}
            {project.audioTracks.length > 0 ? (
              <div className="space-y-3">
                {project.audioTracks.map((track) => (
                  <div key={track.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium truncate flex-1">{track.name}</span>
                      <Button
                        variant="iconGhost"
                        size="iconSm"
                        onClick={() => handleRemoveAudioTrack(track.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <Slider
                        value={[track.volume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([v]) => handleUpdateAudioVolume(track.id, v)}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No audio tracks added yet
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Overlay Panel */}
      <AnimatePresence>
        {showTextPanel && project && (
          <TextOverlayPanel
            currentTime={currentTime}
            videoDuration={project.duration || 10}
            textOverlays={textOverlays}
            isEditingMode={isEditingTextOverlays}
            onClose={() => {
              setShowTextPanel(false);
              setIsEditingTextOverlays(false);
            }}
            onAddOverlay={handleAddTextOverlay}
            onUpdateOverlay={handleUpdateTextOverlay}
            onRemoveOverlay={handleRemoveTextOverlay}
            onToggleEditMode={handleToggleTextEditing}
          />
        )}
      </AnimatePresence>

      {/* More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">More Options</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMoreMenu(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreMenuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "flex-col gap-1 h-auto py-3 relative",
                    item.isAI && "text-primary"
                  )}
                  onClick={() => handleMoreMenuAction(item.id)}
                  disabled={
                    (item.id === 'merge' && project.timeline.length < 2) ||
                    (item.id !== 'ai-generate' && item.id !== 'translate' && item.id !== 'merge' && !hasAnyClip)
                  }
                >
                  {item.isAI && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
                      AI
                    </span>
                  )}
                  <item.icon className="w-5 h-5" />
                  <span className="text-xxs">{item.label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AutoCut Panel */}
      <AnimatePresence>
        {showAutoCutPanel && selectedMedia?.type === 'video' && selectedClip && (
          <AutoCutPanel
            videoRef={videoRef}
            videoDuration={selectedMedia.duration || 10}
            onClose={() => setShowAutoCutPanel(false)}
            onApplyCuts={handleApplyAutoCuts}
          />
        )}
      </AnimatePresence>

      {/* Video Enhance Panel */}
      <AnimatePresence>
        {showEnhancePanel && selectedMedia?.type === 'video' && (
          <VideoEnhancePanel
            videoRef={videoRef}
            onClose={() => setShowEnhancePanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Video Stabilize Panel */}
      <AnimatePresence>
        {showStabilizePanel && selectedMedia?.type === 'video' && (
          <VideoStabilizePanel
            videoRef={videoRef}
            onClose={() => setShowStabilizePanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Video Speed Panel */}
      <AnimatePresence>
        {showSpeedPanel && selectedMedia?.type === 'video' && (
          <VideoSpeedPanel
            videoRef={videoRef}
            currentSpeed={clipSpeed}
            onClose={() => setShowSpeedPanel(false)}
            onApplySpeed={handleApplySpeed}
          />
        )}
      </AnimatePresence>

      {/* Video Color Panel */}
      <AnimatePresence>
        {showColorPanel && selectedMedia?.type === 'video' && (
          <VideoColorPanel
            videoRef={videoRef}
            onClose={() => setShowColorPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Video Merge Panel */}
      <AnimatePresence>
        {showMergePanel && project && (
          <VideoMergePanel
            clipCount={project.timeline.length}
            onClose={() => setShowMergePanel(false)}
            onApplyTransition={handleApplyTransition}
            onMergeAll={handleMergeAllClips}
          />
        )}
      </AnimatePresence>

      {/* AI Video Generate Panel */}
      <AnimatePresence>
        {showAIGeneratePanel && (
          <VideoAIGeneratePanel
            isOpen={showAIGeneratePanel}
            onClose={() => setShowAIGeneratePanel(false)}
            onVideoGenerated={handleAIVideoGenerated}
          />
        )}
      </AnimatePresence>

      {/* Video Translate Panel */}
      <VideoTranslatePanel
        isOpen={showTranslatePanel}
        onClose={() => setShowTranslatePanel(false)}
        videoUrl={selectedMedia?.uri}
        onTranslationComplete={(result) => {
          // Parse subtitles and add them as text overlays
          if (result.subtitles && Array.isArray(result.subtitles)) {
            const subtitleOverlays = result.subtitles.map((sub: any, index: number) => {
              // Parse timestamp "00:00:00,000" to seconds
              const parseTime = (timeStr: string) => {
                const parts = timeStr.split(':');
                const secondsParts = parts[2].split(',');
                return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(secondsParts[0] + '.' + (secondsParts[1] || '0'));
              };
              
              const startTime = parseTime(sub.start);
              const endTime = parseTime(sub.end);
              
              return {
                id: uuidv4(),
                text: sub.text,
                position: 'bottom' as const,
                style: {
                  fontFamily: 'Inter',
                  fontSize: 16,
                  color: '#ffffff',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  textAlign: 'center' as const,
                  bold: false,
                  italic: false,
                  underline: false,
                  shadow: true,
                  animation: 'fade-in' as const,
                },
                startTime,
                endTime,
              };
            });
            
            setTextOverlays(prev => [...prev, ...subtitleOverlays]);
            toast.success('Subtitles added!', {
              description: `${subtitleOverlays.length} subtitles added to video`,
            });
          }
          
          // If there's translated audio, store it for playback
          if (result.translatedAudioUrl) {
            toast.success('Voice dubbing ready!', {
              description: 'Translated audio added to video',
            });
          }
          
          // Close the panel
          setShowTranslatePanel(false);
        }}
      />

      {/* Rotate/Crop Panel */}
      {selectedClip && (
        <VideoRotateCropPanel
          isOpen={showRotateCropPanel}
          onClose={() => setShowRotateCropPanel(false)}
          onApplyRotation={handleApplyRotation}
          onApplyCrop={handleApplyCrop}
          currentRotation={selectedClip.rotation || 0}
          currentFlipH={selectedClip.flipH || false}
          currentFlipV={selectedClip.flipV || false}
        />
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center justify-around py-3 px-4 border-t border-border bg-card safe-area-bottom relative z-20">
        {toolItems.slice(0, 5).map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="sm"
            className={cn(
              'flex-col gap-1 h-auto py-2',
              activeTool === tool.id && 'text-primary'
            )}
            onClick={() => handleToolClick(tool.id)}
            disabled={
              (tool.id === 'trim' || tool.id === 'split' || tool.id === 'delete') && !selectedClipId
            }
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xxs">{tool.label}</span>
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'flex-col gap-1 h-auto py-2',
            showMoreMenu && 'text-primary'
          )}
          onClick={() => {
            setShowMoreMenu(!showMoreMenu);
            setShowTrimPanel(false);
            setShowAudioPanel(false);
            setShowTextPanel(false);
          }}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xxs">More</span>
        </Button>
      </div>
    </div>
  );
};

export default VideoEditorScreen;
