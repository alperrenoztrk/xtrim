import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Play,
  Pause,
  Undo2,
  Redo2,
  Scissors,
  Trash2,
  Volume2,
  Music,
  Type,
  Layers,
  Sparkles,
  Download,
  Share2,
  Plus,
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
  Captions,
  Maximize,
  Minimize,
  Eye,
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
import { AITranscriptPanel } from '@/components/AITranscriptPanel';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { ffmpegService, type FFmpegProgress } from '@/services/FFmpegService';
import { cn } from '@/lib/utils';
import type { Project, TimelineClip, MediaItem, AudioTrack } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type EditorTool = 'trim' | 'split' | 'audio' | 'text' | 'effects' | 'layers' | 'autocut';

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
  { id: 'split', icon: SplitBracketIcon, label: 'Split' },
  { id: 'effects', icon: Wand2, label: 'AI Tools' },
  { id: 'layers', icon: Layers, label: 'Layers' },
];


const parseCropAspectRatio = (cropRatio?: string) => {
  if (!cropRatio || cropRatio === 'free') return null;

  const [width, height] = cropRatio.split(':').map(Number);
  if (!width || !height) return null;

  return width / height;
};

function SplitBracketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 5h3v14H9" />
      <path d="M15 5h-3v14h3" />
    </svg>
  );
}

const moreMenuItems = [
  { id: 'merge', icon: Layers, label: 'Merge' },
  { id: 'speed', icon: SlidersHorizontal, label: 'Speed' },
  { id: 'filters', icon: Filter, label: 'Filters' },
  { id: 'crop', icon: Crop, label: 'Crop' },
  { id: 'rotate', icon: RotateCcw, label: 'Rotate' },
  { id: 'color', icon: Palette, label: 'Color' },
  { id: 'delete', icon: Trash2, label: 'Delete' },
  { id: 'duplicate', icon: Copy, label: 'Duplicate' },
];

const aiToolsMenuItems = [
  { id: 'ai-generate', icon: Wand2, label: 'AI Video Generate', isAI: true, isPro: true },
  { id: 'translate', icon: Languages, label: 'Video Translator', isAI: true, isPro: true },
  { id: 'ai-transcript', icon: Captions, label: 'AI Transcript', isAI: true },
  { id: 'autocut', icon: Zap, label: 'AutoCut', isAI: true },
  { id: 'enhance', icon: Wand2, label: 'AI Enhance', isAI: true },
  { id: 'stabilize', icon: Sparkles, label: 'Stabilize', isAI: true },
];

interface SearchSongResult {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
}

const normalizeSearchText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreSongMatch = (query: string, song: SearchSongResult) => {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1);
  const songText = normalizeSearchText(`${song.trackName ?? ''} ${song.artistName ?? ''}`);

  if (!songText) {
    return 0;
  }

  let score = 0;
  for (const token of queryTokens) {
    if (songText.includes(token)) {
      score += token.length;
    }
  }

  if (normalizedQuery && songText.includes(normalizedQuery)) {
    score += normalizedQuery.length * 2;
  }

  return score;
};

const findBestSongMatch = async (query: string): Promise<SearchSongResult | null> => {
  const songCandidates: SearchSongResult[] = [];
  const searchTimeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    searchTimeoutController.abort();
  }, 15_000);

  try {
    const itunesUrl = new URL('https://itunes.apple.com/search');
    itunesUrl.searchParams.set('term', query);
    itunesUrl.searchParams.set('entity', 'song');
    itunesUrl.searchParams.set('limit', '8');

    const itunesResponse = await fetch(itunesUrl.toString(), {
      signal: searchTimeoutController.signal,
    });
    if (itunesResponse.ok) {
      const itunesData = (await itunesResponse.json()) as {
        results?: SearchSongResult[];
      };

      songCandidates.push(...(itunesData.results ?? []).filter((item) => item.previewUrl));
    }

    if (!songCandidates.length) {
      const lyricsSuggestResponse = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`, {
        signal: searchTimeoutController.signal,
      });
      if (lyricsSuggestResponse.ok) {
        const lyricsSuggestData = (await lyricsSuggestResponse.json()) as {
          data?: Array<{
            title?: string;
            artist?: { name?: string };
            preview?: string;
          }>;
        };

        for (const item of lyricsSuggestData.data ?? []) {
          if (!item.preview) continue;
          songCandidates.push({
            trackName: item.title,
            artistName: item.artist?.name,
            previewUrl: item.preview,
          });
        }
      }
    }

    if (!songCandidates.length) {
      return null;
    }

    return songCandidates
      .sort((a, b) => scoreSongMatch(query, b) - scoreSongMatch(query, a))[0] ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const TimelineClipItem = ({
  clip,
  media,
  isSelected,
  onSelect,
  isDragging,
  pixelsPerSecond,
}: {
  clip: TimelineClip;
  media?: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  isDragging?: boolean;
  pixelsPerSecond: number;
}) => {
  const duration = clip.endTime - clip.startTime;
  const width = Math.max(duration * pixelsPerSecond, 12);
  const isVideo = media?.type === 'video';
  const thumbnailTiles = Math.max(1, Math.round(width / 70));
  
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
        {media?.thumbnail ? (
          <div className="flex h-full w-full pointer-events-none">
            {Array.from({ length: thumbnailTiles }).map((_, tileIdx) => (
              <img
                key={`${clip.id}-thumb-${tileIdx}`}
                src={media.thumbnail}
                alt=""
                className="h-full flex-1 min-w-[56px] object-cover opacity-90"
              />
            ))}
          </div>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>

      {/* Subtle tint for media type */}
      <div className={cn(
        'absolute inset-0 pointer-events-none',
        !isVideo ? 'bg-gradient-to-r from-accent/35 to-primary/15' : 'bg-gradient-to-r from-primary/20 via-transparent to-accent/20'
      )} />

      {/* Media type indicator */}
      <div className="absolute top-1 left-1 pointer-events-none">
        {!isVideo ? (
          <div className="w-4 h-4 rounded bg-accent/90 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="w-4 h-4 rounded bg-primary/85 flex items-center justify-center border border-white/20">
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
      <div className="absolute bottom-1 left-2 text-xxs font-medium text-white bg-black/60 px-1 rounded pointer-events-none">
        {MediaService.formatDuration(duration)}
      </div>

      <div className="absolute bottom-1 right-2 max-w-[70%] text-xxs font-medium text-white/90 bg-black/60 px-1 rounded truncate pointer-events-none">
        {clip.name || media?.name || 'Clip'}
      </div>

      {/* Trim handles - only shown when selected */}
      {isSelected && !isDragging && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/95 cursor-ew-resize flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/50 rounded" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/95 cursor-ew-resize flex items-center justify-center">
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
  const timelineScrubRef = useRef<HTMLDivElement>(null);
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
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0);
  const [isTimelineScrubbing, setIsTimelineScrubbing] = useState(false);
  const isPanelCollapsed = false;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const videoControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoStack, setUndoStack] = useState<Project[]>([]);
  const [redoStack, setRedoStack] = useState<Project[]>([]);
  const [videoError, setVideoError] = useState(false);
  const [resolvedSelectedMediaUri, setResolvedSelectedMediaUri] = useState<string>('');
  const [resolvedAudioTrackUris, setResolvedAudioTrackUris] = useState<Record<string, string>>({});
  const [isMediaImporting, setIsMediaImporting] = useState(false);
  const [mediaImportProgress, setMediaImportProgress] = useState(0);
  const [currentImportFileName, setCurrentImportFileName] = useState<string | null>(null);

  useEffect(() => {
    const timelineNode = timelineScrubRef.current;
    if (!timelineNode) return;

    const updateWidth = () => {
      const measuredWidth = timelineNode.clientWidth;
      setTimelineViewportWidth((previousWidth) => {
        if (measuredWidth > 0) return measuredWidth;
        return previousWidth > 0 ? previousWidth : window.innerWidth;
      });
    };

    const frame = requestAnimationFrame(updateWidth);

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(timelineNode);

    window.addEventListener('resize', updateWidth);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [project?.id, project?.duration, isFullscreen, isPanelCollapsed]);

  
  // Panel states
  const [showTrimPanel, setShowTrimPanel] = useState(false);
  const [showSplitPanel, setShowSplitPanel] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [customAudioName, setCustomAudioName] = useState('');
  const [isSearchingAudio, setIsSearchingAudio] = useState(false);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAIToolsMenu, setShowAIToolsMenu] = useState(false);
  const [showAutoCutPanel, setShowAutoCutPanel] = useState(false);
  const [showEnhancePanel, setShowEnhancePanel] = useState(false);
  const [showStabilizePanel, setShowStabilizePanel] = useState(false);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [mergeProgress, setMergeProgress] = useState<FFmpegProgress | null>(null);
  const [showAIGeneratePanel, setShowAIGeneratePanel] = useState(false);
  const [showTranslatePanel, setShowTranslatePanel] = useState(false);
  const [showTranscriptPanel, setShowTranscriptPanel] = useState(false);
  const [showRotateCropPanel, setShowRotateCropPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isFeaturePanelOpen =
    showTrimPanel ||
    showSplitPanel ||
    showAudioPanel ||
    showTextPanel ||
    showMoreMenu ||
    showAIToolsMenu ||
    showAutoCutPanel ||
    showEnhancePanel ||
    showStabilizePanel ||
    showSpeedPanel ||
    showColorPanel ||
    showMergePanel ||
    showAIGeneratePanel ||
    showTranslatePanel ||
    showTranscriptPanel ||
    showRotateCropPanel;

  const closeAllToolPanels = () => {
    setShowTrimPanel(false);
    setShowSplitPanel(false);
    setShowAudioPanel(false);
    setShowTextPanel(false);
    setShowPreviewPanel(false);
    setShowMoreMenu(false);
    setShowAIToolsMenu(false);
    setShowAutoCutPanel(false);
    setShowEnhancePanel(false);
    setShowStabilizePanel(false);
    setShowSpeedPanel(false);
    setShowColorPanel(false);
    setShowMergePanel(false);
    setShowAIGeneratePanel(false);
    setShowTranslatePanel(false);
    setShowTranscriptPanel(false);
    setShowRotateCropPanel(false);
  };

  const closeAIToolsMenu = () => {
    setShowAIToolsMenu(false);
    setActiveTool((currentTool) => (currentTool === 'effects' ? null : currentTool));
  };
  
  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [splitTime, setSplitTime] = useState('0');
  
  // Audio state
  const [clipVolume, setClipVolume] = useState(100);
  const [clipSpeed, setClipSpeed] = useState(1);
  
  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [isEditingTextOverlays, setIsEditingTextOverlays] = useState(false);
  const [selectedTextOverlayId, setSelectedTextOverlayId] = useState<string | null>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [requestedToolFromUrl, setRequestedToolFromUrl] = useState<string | null>(null);

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

  // Read URL tool parameter; defer opening panels until timeline/media selection is ready.
  useEffect(() => {
    const tool = searchParams.get('tool');
    if (tool === 'ai-generate' || tool === 'autocut' || tool === 'enhance' || tool === 'translate' || tool === 'ai-transcript') {
      setRequestedToolFromUrl(tool);
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
    const videoFiles = selectedFiles.filter((file) => MediaService.isVideoFile(file));
    const ignoredFilesCount = selectedFiles.length - videoFiles.length;

    if (videoFiles.length === 0) {
      toast.error('Only video files are allowed');
      return;
    }

    if (ignoredFilesCount > 0) {
      toast.warning(`${ignoredFilesCount} non-video file(s) were skipped`);
    }

    setIsMediaImporting(true);
    setMediaImportProgress(0);
    setCurrentImportFileName(null);

    const newMediaItems: MediaItem[] = [];
    const newClips: TimelineClip[] = [];
    let videoCount = 0;
    let photoCount = 0;

    try {
      for (const [index, file] of videoFiles.entries()) {
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

        setMediaImportProgress(Math.round(((index + 1) / videoFiles.length) * 100));
      }

      let clipsToAppend = newClips;
      let mediaItemsToAppend = [...newMediaItems];

      if (newClips.length > 1) {
        const clipsTotalDuration = newClips.reduce((acc, clip) => acc + (clip.endTime - clip.startTime), 0);
        const mergeProject: Project = {
          ...project,
          mediaItems: [...project.mediaItems, ...newMediaItems],
          timeline: newClips.map((clip, index) => ({
            ...clip,
            order: index,
          })),
          duration: clipsTotalDuration,
        };

        try {
          const mergedBlob = await ffmpegService.mergeAndExport(
            mergeProject,
            {
              resolution: project.exportSettings?.resolution ?? '1080p',
              fps: project.exportSettings?.fps ?? 30,
              bitrate: project.exportSettings?.bitrate ?? 'medium',
              format: 'mp4',
              fastStart: true,
              removeAudio: false,
            },
            'mp4',
            (p) => setMergeProgress(p)
          );

          const firstImportedVideo = newMediaItems.find((item) => item.type === 'video') ?? newMediaItems[0];
          const mergedMediaId = uuidv4();
          const mergedMedia: MediaItem = {
            id: mergedMediaId,
            type: 'video',
            uri: URL.createObjectURL(mergedBlob),
            name: `Merged Video (${newClips.length} clips)`,
            duration: clipsTotalDuration,
            thumbnail: firstImportedVideo?.thumbnail,
            width: firstImportedVideo?.width,
            height: firstImportedVideo?.height,
            size: mergedBlob.size,
            createdAt: new Date(),
          };

          mediaItemsToAppend = [...newMediaItems, mergedMedia];
          clipsToAppend = [
            {
              id: uuidv4(),
              mediaId: mergedMediaId,
              startTime: 0,
              endTime: clipsTotalDuration,
              order: project.timeline.length,
            },
          ];

          toast.success('Videos merged automatically', {
            description: `${newClips.length} videos were merged and added as a single clip.`,
          });
        } catch (error) {
          toast.warning('Automatic merge failed', {
            description: 'Videos were added separately to the timeline.',
          });
        } finally {
          setMergeProgress(null);
        }
      }

      const appendedTimeline = [
        ...project.timeline,
        ...clipsToAppend.map((clip, index) => ({
          ...clip,
          order: project.timeline.length + index,
        })),
      ];

      const updatedProject = {
        ...project,
        mediaItems: [...project.mediaItems, ...mediaItemsToAppend],
        timeline: appendedTimeline,
        duration: appendedTimeline.reduce((acc, clip) => acc + (clip.endTime - clip.startTime), 0),
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

  const handleConfirmDeleteClip = () => {
    handleDeleteClip();
    setShowDeleteConfirm(false);
  };

  const handleSplitClip = (customSplitPoint?: number) => {
    if (!selectedClipId || !project) return;

    const clipIndex = project.timeline.findIndex((c) => c.id === selectedClipId);
    if (clipIndex === -1) return;

    const clip = project.timeline[clipIndex];
    const splitPoint = customSplitPoint ?? (clip.startTime + clip.endTime) / 2;

    if (splitPoint <= clip.startTime || splitPoint >= clip.endTime) {
      toast.error('Invalid split time', {
        description: `Please enter a value between ${clip.startTime.toFixed(1)} and ${clip.endTime.toFixed(1)} seconds.`,
      });
      return;
    }

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
    setShowSplitPanel(false);
  };

  const handleOpenSplit = () => {
    if (!selectedClipId || !project) return;
    const clip = project.timeline.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const playbackSplitPoint = videoRef.current?.currentTime;
    const defaultSplitPoint =
      playbackSplitPoint !== undefined &&
      playbackSplitPoint > clip.startTime &&
      playbackSplitPoint < clip.endTime
        ? playbackSplitPoint
        : (clip.startTime + clip.endTime) / 2;

    setSplitTime(defaultSplitPoint.toFixed(1));
    closeAllToolPanels();
    setShowSplitPanel(true);
  };

  const handleApplySplit = () => {
    const parsedSplitTime = Number(splitTime);
    if (Number.isNaN(parsedSplitTime)) {
      toast.error('Invalid split time', {
        description: 'Please enter a valid second value.',
      });
      return;
    }

    handleSplitClip(parsedSplitTime);
  };

  const handleSplitAtCurrentMoment = () => {
    if (!selectedClip || !videoRef.current) return;

    const currentPlaybackTime = videoRef.current.currentTime;
    if (currentPlaybackTime <= selectedClip.startTime || currentPlaybackTime >= selectedClip.endTime) {
      toast.error('Geçersiz bölme zamanı', {
        description: 'Videoyu klibin içinde bir ana getirip tekrar deneyin.',
      });
      return;
    }

    handleSplitClip(currentPlaybackTime);
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
    closeAllToolPanels();
    setShowTrimPanel(true);
  };

  const handleApplyTrim = () => {
    if (!selectedClipId || !project) return;

    const video = videoRef.current;
    
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

    const updatedSelectedClip = updatedTimeline.find((clip) => clip.id === selectedClipId);
    if (video && updatedSelectedClip) {
      const clampedAbsoluteTime = Math.max(
        updatedSelectedClip.startTime,
        Math.min(video.currentTime, updatedSelectedClip.endTime)
      );
      video.currentTime = clampedAbsoluteTime;
      setCurrentTime(clampedAbsoluteTime - updatedSelectedClip.startTime);
    }
    
    saveProject({ ...project, timeline: updatedTimeline, duration: newDuration });
    setShowTrimPanel(false);
  };

  // Handle Audio settings
  const handleOpenAudio = () => {
    closeAllToolPanels();
    setShowAudioPanel(true);
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
          sourceDuration: mediaItem.duration || 10,
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

      const bestMatch = await findBestSongMatch(query);
      if (!bestMatch?.previewUrl) {
        toast.error('No matching song found from this name or lyrics');
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
        sourceDuration: project.duration || 10,
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

  const handleUpdateAudioTrim = (trackId: string, values: number[]) => {
    if (!project || values.length !== 2) return;

    const [rawStart, rawEnd] = values;
    const minGap = 0.1;

    saveProject({
      ...project,
      audioTracks: project.audioTracks.map((track) => {
        if (track.id !== trackId) return track;

        const sourceDuration = track.sourceDuration ?? Math.max(track.trimEnd, track.trimStart + minGap);
        const start = Math.max(0, Math.min(rawStart, sourceDuration - minGap));
        const end = Math.max(start + minGap, Math.min(rawEnd, sourceDuration));

        return {
          ...track,
          trimStart: start,
          trimEnd: end,
        };
      }),
    });
  };

  // Handle Text Overlay
  const handleOpenText = () => {
    closeAllToolPanels();
    setShowTextPanel(true);
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

  useEffect(() => {
    let cancelled = false;

    const resolveSelectedMedia = async () => {
      if (!project || !selectedClipId) {
        setResolvedSelectedMediaUri('');
        return;
      }

      const selectedClip = project.timeline.find((clip) => clip.id === selectedClipId);
      const selectedMedia = selectedClip
        ? project.mediaItems.find((media) => media.id === selectedClip.mediaId)
        : null;

      if (!selectedMedia) {
        setResolvedSelectedMediaUri('');
        return;
      }

      const resolvedUri = await MediaService.resolveMediaUri(selectedMedia.uri);
      if (!cancelled) {
        setResolvedSelectedMediaUri(resolvedUri);
      }
    };

    resolveSelectedMedia();

    return () => {
      cancelled = true;
    };
  }, [project, selectedClipId]);

  useEffect(() => {
    setVideoError(false);
  }, [selectedClipId, resolvedSelectedMediaUri]);

  useEffect(() => {
    let cancelled = false;

    const resolveAudioTracks = async () => {
      if (!project?.audioTracks?.length) {
        setResolvedAudioTrackUris({});
        return;
      }

      const entries = await Promise.all(
        project.audioTracks.map(async (track) => [track.id, await MediaService.resolveMediaUri(track.uri)] as const)
      );

      if (!cancelled) {
        setResolvedAudioTrackUris(Object.fromEntries(entries));
      }
    };

    resolveAudioTracks();

    return () => {
      cancelled = true;
    };
  }, [project?.audioTracks]);

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
    closeAllToolPanels();
    setShowAutoCutPanel(true);
  };

  // Handle Enhance Panel
  const handleOpenEnhance = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    closeAllToolPanels();
    setShowEnhancePanel(true);
  };

  // Handle Stabilize Panel
  const handleOpenStabilize = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    closeAllToolPanels();
    setShowStabilizePanel(true);
  };

  // Handle Speed Panel
  const handleOpenSpeed = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }
    closeAllToolPanels();
    setShowSpeedPanel(true);
  };

  useEffect(() => {
    if (!requestedToolFromUrl) return;

    switch (requestedToolFromUrl) {
      case 'ai-generate':
        handleOpenAIGenerate();
        break;
      case 'autocut':
        handleOpenAutoCut();
        break;
      case 'enhance':
        handleOpenEnhance();
        break;
      case 'translate':
        handleOpenTranslate();
        break;
      case 'ai-transcript':
        handleOpenTranscript();
        break;
      default:
        break;
    }

    setRequestedToolFromUrl(null);
  }, [requestedToolFromUrl, project, selectedClipId]);

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
    closeAllToolPanels();
    setShowColorPanel(true);
  };

  // Handle Merge Panel
  const handleOpenMerge = () => {
    if (!project || project.timeline.length < 2) {
      toast.error('At least 2 clips are required to merge');
      return;
    }
    closeAllToolPanels();
    setShowMergePanel(true);
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
    if (!project || project.timeline.length < 2) {
      throw new Error('At least 2 clips are required to merge');
    }

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
      throw new Error('No suitable media found for merge');
    }

    let mergedUri = mergedMediaSource.uri;
    let mergedSize = mergedMediaSource.size;

    try {
      const mergedBlob = await ffmpegService.mergeTimelineClips(project, (p) => {
        setMergeProgress(p);
      });
      mergedUri = URL.createObjectURL(mergedBlob);
      mergedSize = mergedBlob.size;
    } catch (error) {
      console.error('Merge failed:', error);
      throw new Error('Merge failed. Timeline has been kept unchanged.');
    } finally {
      setMergeProgress(null);
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
    closeAllToolPanels();
    setShowAIGeneratePanel(true);
  };

  // Handle Translate Panel
  const handleOpenTranslate = () => {
    closeAllToolPanels();
    setShowTranslatePanel(true);
  };

  const handleOpenTranscript = () => {
    if (!ensureVideoClipSelection()) {
      return;
    }

    closeAllToolPanels();
    setShowTranscriptPanel(true);
  };

  // Handle Rotate/Crop Panel
  const handleOpenRotateCrop = () => {
    if (!selectedClipId || !project) {
      toast.error('Please select a clip');
      return;
    }
    closeAllToolPanels();
    setShowRotateCropPanel(true);
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
  const handleApplyCrop = (cropRatio: string) => {
    if (!selectedClipId || !project) return;

    const updatedTimeline = project.timeline.map((clip) => {
      if (clip.id === selectedClipId) {
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
      case 'effects':
        closeAllToolPanels();
        setShowAIToolsMenu(true);
        return;
      case 'merge':
        handleOpenMerge();
        break;
      case 'ai-generate':
        handleOpenAIGenerate();
        break;
      case 'translate':
        handleOpenTranslate();
        break;
      case 'ai-transcript':
        handleOpenTranscript();
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
      case 'delete':
        if (selectedClipId) setShowDeleteConfirm(true);
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
    closeAIToolsMenu();
  };

  // Tool click handler
  const handleToolClick = (toolId: EditorTool) => {
    const hasVideoClip = Boolean(
      project?.timeline.some((clip) => {
        const media = project.mediaItems.find((item) => item.id === clip.mediaId);
        return media?.type === 'video';
      })
    );

    if ((toolId === 'audio' || toolId === 'text' || toolId === 'effects') && !hasVideoClip) {
      return;
    }

    const isCurrentlyActive = activeTool === toolId;

    if (isCurrentlyActive) {
      setActiveTool(null);
      closeAllToolPanels();
      closeAIToolsMenu();
      return;
    }

    setActiveTool(toolId);
    
    switch (toolId) {
      case 'trim':
        handleOpenTrim();
        break;
      case 'split':
        if (selectedClipId) handleOpenSplit();
        break;
      case 'audio':
        handleOpenAudio();
        break;
      case 'text':
        handleOpenText();
        break;
      case 'effects':
        closeAllToolPanels();
        setShowAIToolsMenu(true);
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
        const trimDuration = Math.max(0, track.trimEnd - track.trimStart);
        const trackPlayableEnd = Math.min(track.endTime, track.startTime + trimDuration);
        const trackStart = Math.max(track.startTime, clip.startTime);
        const trackEnd = Math.min(trackPlayableEnd, clip.endTime);
        const shouldPlayTrack =
          isPlaying &&
          !track.isMuted &&
          track.volume > 0 &&
          now >= trackStart &&
          now <= trackEnd;

        let audioEl = audioTrackElementsRef.current.get(track.id);

        if (!audioEl) {
          const audioUri = resolvedAudioTrackUris[track.id] || track.uri;
          audioEl = new Audio(audioUri);
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

        const desiredTime = Math.min(
          track.trimEnd,
          Math.max(track.trimStart, now - track.startTime + track.trimStart)
        );
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
  }, [isPlaying, project, selectedClipId, resolvedAudioTrackUris]);

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

  const handleTimelineScrub = useCallback((clientX: number) => {
    if (!timelineScrubRef.current || !project || !selectedClipId) return;

    const selectedTimelineClip = project.timeline.find((clip) => clip.id === selectedClipId);
    if (!selectedTimelineClip) return;

    const orderedTimeline = [...project.timeline].sort((a, b) => a.order - b.order);
    const selectedClipIndex = orderedTimeline.findIndex((clip) => clip.id === selectedClipId);
    if (selectedClipIndex < 0) return;

    const selectedClipOffset = orderedTimeline
      .slice(0, selectedClipIndex)
      .reduce((sum, clip) => sum + (clip.endTime - clip.startTime), 0);

    const selectedClipDuration = selectedTimelineClip.endTime - selectedTimelineClip.startTime;
    const timelineTotalDuration = Math.max(project.duration, 1);
    const rect = timelineScrubRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((clientX - rect.left) / Math.max(rect.width, 1), 1));
    const absoluteTime = ratio * timelineTotalDuration;
    const relativeTime = absoluteTime - selectedClipOffset;

    handleSeek(Math.max(0, Math.min(relativeTime, selectedClipDuration)));
  }, [handleSeek, project, selectedClipId]);

  const handleTimelinePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedClipId) return;
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('[data-timeline-item="true"]')) return;

    setIsTimelineScrubbing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    handleTimelineScrub(event.clientX);
  };

  const handleTimelinePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTimelineScrubbing) return;
    handleTimelineScrub(event.clientX);
  };

  const handleTimelinePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsTimelineScrubbing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleVideoTap = () => {
    setShowVideoControls(true);
    if (videoControlsTimeoutRef.current) {
      clearTimeout(videoControlsTimeoutRef.current);
    }
    videoControlsTimeoutRef.current = setTimeout(() => {
      setShowVideoControls(false);
    }, 3000);
  };

  const handleToggleFullscreen = () => {
    const toggle = async () => {
      const previewStage = previewStageRef.current;
      if (!previewStage) return;

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          toast.error('Failed to close fullscreen mode');
        }
        return;
      }

      if (typeof previewStage.requestFullscreen === 'function') {
        try {
          await previewStage.requestFullscreen();
          return;
        } catch {
          toast.error('Failed to open fullscreen mode');
          return;
        }
      }

      const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
      if (video && typeof video.webkitEnterFullscreen === 'function') {
        video.webkitEnterFullscreen();
        setIsFullscreen(true);
      }
    };

    void toggle();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleTrimPreviewSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, selectedMedia?.duration || time));
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
  const selectedCropAspectRatio = parseCropAspectRatio(selectedClip?.cropRatio);
  const orderedTimeline = [...project.timeline].sort((a, b) => a.order - b.order);
  const fixedTimelinePlayheadPercent = 50;
  const selectedMedia = selectedClip
    ? project.mediaItems.find((m) => m.id === selectedClip.mediaId)
    : null;
  const hasAnyClip = project.timeline.length > 0;
  const hasVideoInTimeline = project.timeline.some((clip) => {
    const media = project.mediaItems.find((item) => item.id === clip.mediaId);
    return media?.type === 'video';
  });

  const timelinePixelsPerSecond = (Math.max(timelineViewportWidth, 1) / Math.max(project.duration, 1)) * timelineZoom;

  return (
    <div className="h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white safe-area-top overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
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
      {!isFullscreen && (
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="iconSm" onClick={() => navigate('/home')}>
            <X className="w-5 h-5" />
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="gradient" size="sm">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate(`/export/${project.id}?mode=share`)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/export/${project.id}?mode=download`)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      )}

      {/* Preview */}
      <div
        ref={previewStageRef}
        className={cn(
          'relative bg-white dark:bg-black flex items-center justify-center overflow-hidden',
          !isFullscreen ? 'h-1/2 min-h-0 flex-none' : 'flex-1'
        )}
        onClick={handleVideoTap}
      >
        {selectedMedia ? (
          selectedMedia.type === 'video' ? (
            <div ref={previewContainerRef} className="relative max-h-full max-w-full w-full h-full flex items-center justify-center">
              <div
                className="relative flex items-center justify-center overflow-hidden max-h-full max-w-full w-full h-full"
                style={selectedCropAspectRatio ? { aspectRatio: `${selectedCropAspectRatio}` } : undefined}
              >
                <video
                  ref={videoRef}
                  src={resolvedSelectedMediaUri || selectedMedia.uri}
                  className={cn(
                    'max-h-full max-w-full transition-transform duration-200',
                    selectedClip?.cropRatio ? 'w-full h-full object-cover' : 'object-contain'
                  )}
                  onContextMenu={(event) => event.preventDefault()}
                  style={{
                    transform: `rotate(${selectedClip?.rotation || 0}deg) scaleX(${selectedClip?.flipH ? -1 : 1}) scaleY(${selectedClip?.flipV ? -1 : 1})`,
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={() => setVideoError(true)}
                  onCanPlay={() => setVideoError(false)}
                  onPlaying={() => setVideoError(false)}
                  playsInline
                  preload="auto"
                />
              </div>
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
                    <p className="text-sm text-muted-foreground mt-1">This format may not be supported by your browser.</p>
                    <p className="text-xs text-muted-foreground mt-2">Supported formats: MP4, WebM, OGG</p>
                    <p className="text-xs text-muted-foreground">File name: {selectedMedia?.name}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div ref={previewContainerRef} className="relative max-h-full max-w-full w-full h-full flex items-center justify-center">
              <img
                src={resolvedSelectedMediaUri || selectedMedia.uri}
                alt=""
                className="max-h-full max-w-full object-contain transition-transform duration-200"
                onContextMenu={(event) => event.preventDefault()}
                style={{
                  transform: `rotate(${selectedClip?.rotation || 0}deg) scaleX(${selectedClip?.flipH ? -1 : 1}) scaleY(${selectedClip?.flipV ? -1 : 1})`,
                }}
              />
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
            <Button
              variant="gradient"
              onClick={() => fileInputRef.current?.click()}
              disabled={isMediaImporting}
            >
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
        {/* Play button overlay - shown when video controls are visible */}
        {project.timeline.length > 0 && selectedMedia && showVideoControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              variant="icon"
              size="iconLg"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 pointer-events-auto"
              onClick={(e) => { e.stopPropagation(); handlePlayPause(); }}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white fill-white" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white" />
              )}
            </Button>
          </div>
        )}

        {/* Fullscreen button - appears on tap at bottom right */}
        {project.timeline.length > 0 && selectedMedia && showVideoControls && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0 }}
            className="absolute bottom-4 right-4"
          >
            <Button
              variant="icon"
              size="iconSm"
              className="bg-black/50 backdrop-blur-sm hover:bg-black/70"
              onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-white" />
              ) : (
                <Maximize className="w-4 h-4 text-white" />
              )}
            </Button>
          </motion.div>
        )}

        {/* Video time display overlay */}
        {selectedMedia?.type === 'video' && selectedClip && showVideoControls && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-sm text-white font-medium">
              {MediaService.formatDuration(currentTime)} / {MediaService.formatDuration(selectedClip.endTime - selectedClip.startTime)}
            </span>
          </div>
        )}

        {/* Fullscreen timeline overlay - shown on tap */}
        {isFullscreen && selectedClip && showVideoControls && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 bg-gradient-to-t from-black/85 via-black/60 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/90 min-w-[40px]">
                {MediaService.formatDuration(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={selectedClip.endTime - selectedClip.startTime}
                step={0.01}
                onValueChange={([value]) => handleSeek(value)}
                onValueCommit={([value]) => handleSeek(value)}
                className="w-full"
              />
              <span className="text-xs text-white/90 min-w-[40px] text-right">
                {MediaService.formatDuration(selectedClip.endTime - selectedClip.startTime)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Timeline + Toolbar Panel */}
      {!isFullscreen && !isFeaturePanelOpen && (
      <motion.div
        className="h-1/2 min-h-0 flex flex-col overflow-hidden border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
        animate={{ height: isPanelCollapsed ? 'auto' : 'auto' }}
      >
        {/* Tool selector */}
        <div className="flex items-center justify-around px-3 py-2 border-b border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-black/95 overflow-x-auto scrollbar-hide">
          <Button
            variant="ghost"
            size="sm"
            className={cn('flex-col gap-1 h-auto py-2 min-w-14', showPreviewPanel && 'text-primary')}
            onClick={() => {
              const nextOpenState = !showPreviewPanel;
              if (nextOpenState) {
                closeAllToolPanels();
                setActiveTool(null);
                setShowPreviewPanel(true);
              } else {
                setShowPreviewPanel(false);
              }
            }}
          >
            <Eye className="w-5 h-5" />
            <span className="text-xxs">Preview</span>
          </Button>
          {toolItems.slice(0, 5).map((tool) => (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              className={cn(
                'flex-col gap-1 h-auto py-2 min-w-14',
                !showPreviewPanel && activeTool === tool.id && 'text-primary'
              )}
              onClick={() => handleToolClick(tool.id)}
              disabled={
                ((tool.id === 'trim' || tool.id === 'split') && !selectedClipId) ||
                ((tool.id === 'audio' || tool.id === 'text' || tool.id === 'effects') && !hasVideoInTimeline)
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
              'flex-col gap-1 h-auto py-2 min-w-14',
              (showMoreMenu || showAIToolsMenu) && 'text-primary'
            )}
            onClick={() => {
              const nextOpenState = !showMoreMenu;
              if (nextOpenState) {
                closeAllToolPanels();
                setShowMoreMenu(true);
              } else {
                setShowMoreMenu(false);
              }
            }}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-xxs">More</span>
          </Button>
        </div>

        {/* Timeline content - collapsible */}
        <AnimatePresence>
        {!isPanelCollapsed && (
          <motion.div
            initial={false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0 }}
            className="flex-1 min-h-0 overflow-y-auto"
          >
        {/* Timeline controls */}
        <AnimatePresence>
          {showPreviewPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
                      {MediaService.formatDuration(currentTime)}
                    </span>
                    <span>/</span>
                    <span className="tabular-nums">{MediaService.formatDuration(project.duration)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={handlePlayPause}
                      title={isPlaying ? 'Durdur' : 'Oynat'}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => handleSeek(0)}
                      title="Başa git"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => setTimelineZoom((z) => Math.max(0.25, z - 0.25))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
                      {Math.round(timelineZoom * 100)}%
                    </span>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => setTimelineZoom((z) => Math.min(2, z + 0.25))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTimelineZoom(1)}
                      className="h-8 px-2 text-[11px]"
                    >
                      Fit
                    </Button>
                    <Button
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => handleSeek(Math.max(project.duration, 0))}
                      title="Sona git"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Slider
                  value={[currentTime]}
                  max={selectedClip ? (selectedClip.endTime - selectedClip.startTime) : Math.max(project.duration, 1)}
                  step={0.1}
                  onValueChange={([value]) => handleSeek(value)}
                  onValueCommit={([value]) => handleSeek(value)}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clips */}
        <div
          ref={timelineScrubRef}
          className={cn(
            'relative px-4 pb-2 overflow-x-auto scrollbar-hide touch-pan-x bg-gradient-to-b from-emerald-950/95 to-green-950/95 border-y border-emerald-800/60',
            selectedClipId && 'cursor-ew-resize'
          )}
          onPointerDown={handleTimelinePointerDown}
          onPointerMove={handleTimelinePointerMove}
          onPointerUp={handleTimelinePointerUp}
          onPointerCancel={handleTimelinePointerUp}
        >
          <div className="sticky top-0 z-10 flex h-9 min-w-max items-center gap-5 border-b border-emerald-800/55 bg-emerald-950/90 px-1 text-xs text-emerald-200/80 backdrop-blur-sm">
            {Array.from({ length: Math.max(4, Math.ceil(Math.max(project.duration, 1))) }).map((_, second) => (
              <span key={`timeline-second-${second}`} className="flex items-center gap-3 whitespace-nowrap tabular-nums">
                <span>{`00:${second.toString().padStart(2, '0')}`}</span>
                <span className="text-emerald-300/45">•</span>
              </span>
            ))}
          </div>
          <div
            className="absolute top-9 bottom-0 left-4 w-[3px] rounded-full bg-white pointer-events-none z-20"
          />
          <div
            className="absolute top-9 bottom-0 w-px bg-emerald-100 pointer-events-none z-20"
            style={{
              left: `${fixedTimelinePlayheadPercent}%`,
            }}
          />
          <div
            className="absolute top-[31px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-emerald-100 border border-emerald-950 shadow pointer-events-none z-20"
            style={{ left: `${fixedTimelinePlayheadPercent}%` }}
          />
          {project.timeline.length > 0 ? (
            <Reorder.Group
              axis="x"
              values={orderedTimeline}
              onReorder={handleReorderClips}
              className="flex h-20 items-center py-3 w-max min-w-full"
            >
              {orderedTimeline.map((clip) => (
                  <Reorder.Item 
                    key={clip.id} 
                    value={clip}
                    whileDrag={{ scale: 1.05, zIndex: 50 }}
                    className="cursor-grab active:cursor-grabbing"
                    data-timeline-item="true"
                  >
                    <TimelineClipItem
                      clip={clip}
                      media={project.mediaItems.find((m) => m.id === clip.mediaId)}
                      isSelected={clip.id === selectedClipId}
                      onSelect={() => setSelectedClipId(clip.id)}
                      pixelsPerSecond={timelinePixelsPerSecond}
                    />
                  </Reorder.Item>
                ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 h-14 w-14 shrink-0 rounded-xl border border-emerald-400/60 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 flex items-center justify-center"
                disabled={isMediaImporting}
                aria-label="Add Media"
              >
                <Plus className="w-8 h-8" />
              </button>
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

        {/* Audio/Text lanes */}
        {project.timeline.length > 0 && (
          <div className="px-4 pb-3 space-y-2 border-t border-emerald-800/60 bg-emerald-950/85">
            <div className="grid grid-cols-[56px_1fr] gap-2 items-stretch">
              <Button
                variant="ghost"
                size="sm"
                className="h-full flex-col gap-1 text-emerald-200/80 hover:text-emerald-50 hover:bg-emerald-900/60"
                onClick={() => handleToolClick('audio')}
                disabled={!hasVideoInTimeline}
              >
                <Music className="w-4 h-4" />
                <span className="text-xxs">Ses</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-12 rounded-none border border-emerald-800/60 bg-emerald-900/45 text-emerald-100/90 hover:bg-emerald-900/70"
                onClick={() => handleToolClick('audio')}
                disabled={!hasVideoInTimeline}
              >
                + Ses ekle
              </Button>
            </div>

            <div className="grid grid-cols-[56px_1fr] gap-2 items-stretch">
              <Button
                variant="ghost"
                size="sm"
                className="h-full flex-col gap-1 text-emerald-200/80 hover:text-emerald-50 hover:bg-emerald-900/60"
                onClick={() => handleToolClick('text')}
                disabled={!hasVideoInTimeline}
              >
                <Type className="w-4 h-4" />
                <span className="text-xxs">Metin</span>
              </Button>
              <Button
                variant="ghost"
                className="justify-start h-12 rounded-none border border-emerald-800/60 bg-emerald-900/45 text-emerald-100/90 hover:bg-emerald-900/70"
                onClick={() => handleToolClick('text')}
                disabled={!hasVideoInTimeline}
              >
                + Metin ekle
              </Button>
            </div>
          </div>
        )}
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Trim Panel */}
      <AnimatePresence>
        {showTrimPanel && selectedClip && (
          <motion.div
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
            className="border-t border-zinc-200 bg-white p-4 pt-6 z-30 max-h-[50vh] overflow-y-auto dark:border-zinc-800 dark:bg-black"
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
                  max={selectedMedia?.duration || 10}
                  step={0.1}
                  onValueChange={([v]) => {
                    const nextStart = Math.max(0, Math.min(v, trimEnd - 0.1));
                    setTrimStart(nextStart);
                    handleTrimPreviewSeek(nextStart);
                  }}
                  onValueCommit={([v]) => handleTrimPreviewSeek(Math.max(0, Math.min(v, trimEnd - 0.1)))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End: {MediaService.formatDuration(trimEnd)}</label>
                <Slider
                  value={[trimEnd]}
                  min={0}
                  max={selectedMedia?.duration || 10}
                  step={0.1}
                  onValueChange={([v]) => {
                    const maxEnd = selectedMedia?.duration || 10;
                    const nextEnd = Math.min(maxEnd, Math.max(v, trimStart + 0.1));
                    setTrimEnd(nextEnd);
                    handleTrimPreviewSeek(nextEnd);
                  }}
                  onValueCommit={([v]) => handleTrimPreviewSeek(Math.min(selectedMedia?.duration || 10, Math.max(v, trimStart + 0.1)))}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Duration: {MediaService.formatDuration(trimEnd - trimStart)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split Panel */}
      <AnimatePresence>
        {showSplitPanel && selectedClip && (
          <motion.div
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
            className="border-t border-zinc-200 bg-white p-4 pt-6 z-30 max-h-[50vh] overflow-y-auto dark:border-zinc-800 dark:bg-black"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Split Clip</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSplitPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-2">
                  At which second should it be cut?
                </label>
                <Input
                  type="number"
                  min={selectedClip.startTime + 0.1}
                  max={selectedClip.endTime - 0.1}
                  step={0.1}
                  value={splitTime}
                  onChange={(e) => setSplitTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Range: {selectedClip.startTime.toFixed(1)}s - {selectedClip.endTime.toFixed(1)}s
                </p>
              </div>
              <Button variant="gradient" size="sm" onClick={handleApplySplit} className="w-full">
                <Scissors className="w-4 h-4" />
                Apply
              </Button>
              <Button variant="outline" size="sm" onClick={handleSplitAtCurrentMoment} className="w-full">
                <Scissors className="w-4 h-4" />
                Split at current moment
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Panel */}
      <AnimatePresence>
        {showAudioPanel && (
          <motion.div
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
            className="border-t border-zinc-200 bg-white p-4 pt-6 z-30 max-h-[50vh] overflow-y-auto dark:border-zinc-800 dark:bg-black"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Audio</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAudioPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Add local audio track button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-3"
              onClick={() => audioInputRef.current?.click()}
            >
              <Music className="w-4 h-4" />
              Add Audio from Device
            </Button>

            <p className="text-xs text-muted-foreground mb-3">
              You can upload local audio files (MP3, WAV, M4A...) from your device or search songs online below.
            </p>

            <div className="rounded-lg border border-border p-3 mb-4 space-y-2">
              <p className="text-xs text-muted-foreground">Type the song name or a lyric line and let the app find it online and add it</p>
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

                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Music timeline</span>
                        <span>
                          {MediaService.formatDuration(track.trimStart)} - {MediaService.formatDuration(track.trimEnd)}
                        </span>
                      </div>
                      <Slider
                        value={[track.trimStart, track.trimEnd]}
                        min={0}
                        max={track.sourceDuration ?? Math.max(track.trimEnd, track.trimStart + 0.1)}
                        step={0.1}
                        onValueChange={(values) => handleUpdateAudioTrim(track.id, values)}
                      />
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
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
            className="border-t border-zinc-200 bg-white p-4 pt-6 z-30 max-h-[50vh] overflow-y-auto dark:border-zinc-800 dark:bg-black"
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
                    "flex-col gap-1 h-auto py-3 relative"
                  )}
                  onClick={() => handleMoreMenuAction(item.id)}
                  disabled={
                    (item.id === 'merge' && project.timeline.length < 2) ||
                    (item.id !== 'merge' && !hasAnyClip)
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xxs">{item.label}</span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Tools Menu */}
      <AnimatePresence>
        {showAIToolsMenu && (
          <motion.div
            initial={false}
            animate={{ y: 0 }}
            exit={{ y: 0 }}
            transition={{ duration: 0 }}
            className="border-t border-zinc-200 bg-white p-4 pt-6 z-30 max-h-[50vh] overflow-y-auto dark:border-zinc-800 dark:bg-black"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">AI Tools</h3>
              <Button variant="ghost" size="sm" onClick={closeAIToolsMenu}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {aiToolsMenuItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="flex-col gap-1 h-auto py-3 relative text-primary"
                  onClick={() => handleMoreMenuAction(item.id)}
                >
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
                    AI
                  </span>
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
            mergeProgress={mergeProgress}
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

      <AnimatePresence>
        {showTranscriptPanel && selectedMedia?.type === 'video' && (
          <AITranscriptPanel
            isOpen={showTranscriptPanel}
            onClose={() => setShowTranscriptPanel(false)}
            videoUrl={resolvedSelectedMediaUri || selectedMedia?.uri}
            videoName={selectedMedia?.name}
          />
        )}
      </AnimatePresence>

      {/* Video Translate Panel */}
      <VideoTranslatePanel
        isOpen={showTranslatePanel}
        onClose={() => setShowTranslatePanel(false)}
        videoUrl={resolvedSelectedMediaUri || selectedMedia?.uri}
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This clip will be deleted from the timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteClip}>Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VideoEditorScreen;
