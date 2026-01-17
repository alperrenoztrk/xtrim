import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  ArrowLeft,
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
  Plus,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Copy,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { cn } from '@/lib/utils';
import type { Project, TimelineClip, MediaItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type EditorTool = 'trim' | 'split' | 'delete' | 'audio' | 'text' | 'effects' | 'layers';

const toolItems: { id: EditorTool; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'trim', icon: Scissors, label: 'Trim' },
  { id: 'split', icon: Scissors, label: 'Split' },
  { id: 'delete', icon: Trash2, label: 'Delete' },
  { id: 'audio', icon: Volume2, label: 'Audio' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'effects', icon: Sparkles, label: 'Effects' },
  { id: 'layers', icon: Layers, label: 'Layers' },
];

const TimelineClipItem = ({
  clip,
  media,
  isSelected,
  onSelect,
}: {
  clip: TimelineClip;
  media?: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const duration = clip.endTime - clip.startTime;
  const width = Math.max(80, duration * 50); // 50px per second, min 80px

  return (
    <motion.div
      className={cn(
        'relative h-16 rounded-lg overflow-hidden cursor-pointer transition-all border-2',
        isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
      )}
      style={{ width }}
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail background */}
      <div className="absolute inset-0 bg-secondary">
        {media?.thumbnail && (
          <img
            src={media.thumbnail}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20" />

      {/* Duration label */}
      <div className="absolute bottom-1 left-2 text-xxs font-medium text-white bg-black/50 px-1 rounded">
        {MediaService.formatDuration(duration)}
      </div>

      {/* Drag handles */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/50 rounded" />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize flex items-center justify-center">
            <div className="w-0.5 h-6 bg-white/50 rounded" />
          </div>
        </>
      )}
    </motion.div>
  );
};

const VideoEditorScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const playbackStartRef = useRef<number | null>(null);

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

  const orderedTimeline = useMemo(
    () => [...project.timeline].sort((a, b) => a.order - b.order),
    [project.timeline]
  );

  const timelineSegments = useMemo(() => {
    let cursor = 0;
    return orderedTimeline.map((clip) => {
      const duration = clip.endTime - clip.startTime;
      const segment = {
        clip,
        start: cursor,
        end: cursor + duration,
      };
      cursor += duration;
      return segment;
    });
  }, [orderedTimeline]);

  const getClipAtTime = useCallback(
    (time: number) => {
      if (timelineSegments.length === 0) return null;
      const clampedTime = Math.min(Math.max(time, 0), project.duration);
      const segment =
        timelineSegments.find(
          (entry) => clampedTime >= entry.start && clampedTime < entry.end
        ) ?? timelineSegments[timelineSegments.length - 1];
      return segment?.clip ?? null;
    },
    [project.duration, timelineSegments]
  );

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

    const newMediaItems: MediaItem[] = [];
    const newClips: TimelineClip[] = [];

    for (const file of Array.from(files)) {
      const mediaItem = await MediaService.createMediaItem(file);
      newMediaItems.push(mediaItem);

      if (mediaItem.type !== 'audio') {
        const clip: TimelineClip = {
          id: uuidv4(),
          mediaId: mediaItem.id,
          startTime: 0,
          endTime: mediaItem.duration || 5,
          order: project.timeline.length + newClips.length,
        };
        newClips.push(clip);
      }
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
  };

  useEffect(() => {
    if (!isPlaying || project.duration === 0) return;

    const step = (timestamp: number) => {
      if (playbackStartRef.current === null) {
        playbackStartRef.current = timestamp;
      }

      const deltaSeconds = (timestamp - playbackStartRef.current) / 1000;
      playbackStartRef.current = timestamp;

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSeconds;
        if (nextTime >= project.duration) {
          setIsPlaying(false);
          playbackStartRef.current = null;
          return project.duration;
        }
        return nextTime;
      });

      playbackFrameRef.current = requestAnimationFrame(step);
    };

    playbackFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (playbackFrameRef.current !== null) {
        cancelAnimationFrame(playbackFrameRef.current);
      }
      playbackFrameRef.current = null;
      playbackStartRef.current = null;
    };
  }, [isPlaying, project.duration]);

  useEffect(() => {
    if (!isPlaying) return;
    const clipAtTime = getClipAtTime(currentTime);
    if (clipAtTime && clipAtTime.id !== selectedClipId) {
      setSelectedClipId(clipAtTime.id);
    }
  }, [currentTime, getClipAtTime, isPlaying, selectedClipId]);

  const handleTogglePlay = () => {
    if (project.duration === 0) return;
    if (!isPlaying && currentTime >= project.duration) {
      setCurrentTime(0);
    }
    setIsPlaying((prev) => !prev);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const selectedClip = project.timeline.find((c) => c.id === selectedClipId);
  const clipForPreview = isPlaying ? getClipAtTime(currentTime) : selectedClip;
  const selectedMedia = clipForPreview
    ? project.mediaItems.find((m) => m.id === clipForPreview.mediaId)
    : null;

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => handleAddMedia(e.target.files)}
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
        {selectedMedia?.thumbnail ? (
          <img
            src={selectedMedia.thumbnail}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : project.timeline.length > 0 ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <span className="text-xs uppercase tracking-[0.2em]">Preview Time</span>
            <span className="text-lg font-semibold text-foreground">
              {MediaService.formatDuration(currentTime)}
            </span>
            <span className="text-xs text-muted-foreground">
              Scrub the timeline or press play to preview clips
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">Add media to start editing</p>
              <p className="text-sm text-muted-foreground mt-1">
                Import videos or photos from your device
              </p>
            </div>
            <Button variant="gradient" onClick={() => fileInputRef.current?.click()}>
              <Plus className="w-4 h-4" />
              Add Media
            </Button>
          </div>
        )}

        {/* Play button overlay */}
        {project.timeline.length > 0 && (
          <Button
            variant="icon"
            size="iconLg"
            className="absolute bg-white/10 backdrop-blur-sm hover:bg-white/20"
            onClick={handleTogglePlay}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white" />
            )}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="border-t border-border bg-card">
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
            max={Math.max(project.duration, 1)}
            step={0.1}
            onValueChange={([value]) => setCurrentTime(value)}
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
                  <Reorder.Item key={clip.id} value={clip}>
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
            >
              <Plus className="w-4 h-4" />
              Add Media
            </Button>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-around py-3 px-4 border-t border-border bg-card safe-area-bottom">
        {toolItems.slice(0, 5).map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="sm"
            className={cn(
              'flex-col gap-1 h-auto py-2',
              activeTool === tool.id && 'text-primary'
            )}
            onClick={() => {
              setActiveTool(activeTool === tool.id ? null : tool.id);
              if (tool.id === 'delete' && selectedClipId) {
                handleDeleteClip();
              } else if (tool.id === 'split' && selectedClipId) {
                handleSplitClip();
              }
            }}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-xxs">{tool.label}</span>
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="flex-col gap-1 h-auto py-2">
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-xxs">More</span>
        </Button>
      </div>
    </div>
  );
};

export default VideoEditorScreen;
