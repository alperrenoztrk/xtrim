import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Film,
  Monitor,
  Smartphone,
  Settings2,
  Loader2,
  CheckCircle2,
  XCircle,
  Share2,
  FolderDown,
  Play,
  FileVideo,
  ChevronDown,
  ChevronUp,
  Instagram,
  Youtube,
  Clapperboard,
  HardDrive,
  Zap,
  Clock,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { nativeExportService } from '@/services/NativeExportService';
import { ffmpegService } from '@/services/FFmpegService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project, ExportSettings } from '@/types';

type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'finalizing' | 'complete' | 'error';
type ExportFormat = 'mp4' | 'webm' | 'mov' | 'gif';

interface ResolutionOption {
  id: ExportSettings['resolution'];
  label: string;
  description: string;
  width: number;
  height: number;
  icon: React.ComponentType<any>;
}

interface FpsOption {
  value: ExportSettings['fps'];
  label: string;
  description: string;
}

interface QualityOption {
  id: ExportSettings['bitrate'];
  label: string;
  description: string;
  bitrateMbps: number;
}

interface FormatOption {
  id: ExportFormat;
  label: string;
  codec: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface SocialPreset {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  resolution: ExportSettings['resolution'];
  fps: ExportSettings['fps'];
  aspectRatio: string;
  maxDuration?: number;
}

const resolutionOptions: ResolutionOption[] = [
  { id: '720p', label: 'HD', description: '1280 × 720', width: 1280, height: 720, icon: Smartphone },
  { id: '1080p', label: 'Full HD', description: '1920 × 1080', width: 1920, height: 1080, icon: Monitor },
  { id: '4k', label: '4K UHD', description: '3840 × 2160', width: 3840, height: 2160, icon: Film },
];

const fpsOptions: FpsOption[] = [
  { value: 24, label: '24', description: 'Cinematic' },
  { value: 30, label: '30', description: 'Standart' },
  { value: 60, label: '60', description: 'Smooth' },
];

const qualityOptions: QualityOption[] = [
  { id: 'low', label: 'Economy', description: 'Small size', bitrateMbps: 4 },
  { id: 'medium', label: 'Balanced', description: 'Recommended', bitrateMbps: 8 },
  { id: 'high', label: 'Maksimum', description: 'En iyi kalite', bitrateMbps: 16 },
];

const formatOptions: FormatOption[] = [
  { id: 'mp4', label: 'MP4', codec: 'H.264/AAC', description: 'En uyumlu format', icon: FileVideo },
  { id: 'webm', label: 'WebM', codec: 'VP9/Opus', description: 'Optimized for web', icon: Clapperboard },
  { id: 'mov', label: 'MOV', codec: 'ProRes', description: 'Apple cihazlar', icon: Film },
  { id: 'gif', label: 'GIF', codec: 'Animation', description: 'For short clips', icon: Zap },
];

const socialPresets: SocialPreset[] = [
  { id: 'instagram-reel', name: 'Instagram Reels', icon: Instagram, resolution: '1080p', fps: 30, aspectRatio: '9:16', maxDuration: 90 },
  { id: 'instagram-post', name: 'Instagram Post', icon: Instagram, resolution: '1080p', fps: 30, aspectRatio: '1:1', maxDuration: 60 },
  { id: 'youtube', name: 'YouTube', icon: Youtube, resolution: '1080p', fps: 30, aspectRatio: '16:9' },
  { id: 'youtube-shorts', name: 'YouTube Shorts', icon: Youtube, resolution: '1080p', fps: 30, aspectRatio: '9:16', maxDuration: 60 },
  { id: 'tiktok', name: 'TikTok', icon: Clapperboard, resolution: '1080p', fps: 30, aspectRatio: '9:16', maxDuration: 180 },
];

const ExportScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(() => {
    return projectId ? ProjectService.getProject(projectId) : null;
  });

  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '1080p',
    fps: 30,
    bitrate: 'medium',
    format: 'mp4',
  });

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('mp4');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [enableHDR, setEnableHDR] = useState(false);
  const [enableFastStart, setEnableFastStart] = useState(true);
  const [removeAudio, setRemoveAudio] = useState(false);

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedSize, setEstimatedSize] = useState('0 MB');
  const [estimatedTime, setEstimatedTime] = useState('0 dk');
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [isNative] = useState(nativeExportService.isNativePlatform());

  // Calculate estimated file size and time
  useEffect(() => {
    if (!project) return;

    const duration = project.duration;
    const quality = qualityOptions.find(q => q.id === settings.bitrate);
    const resolution = resolutionOptions.find(r => r.id === settings.resolution);
    
    let bitrateMultiplier = quality?.bitrateMbps || 8;
    let resolutionMultiplier = 1;

    switch (settings.resolution) {
      case '720p': resolutionMultiplier = 0.5; break;
      case '1080p': resolutionMultiplier = 1; break;
      case '4k': resolutionMultiplier = 4; break;
    }

    // Format affects size
    let formatMultiplier = 1;
    switch (selectedFormat) {
      case 'mp4': formatMultiplier = 1; break;
      case 'webm': formatMultiplier = 0.8; break;
      case 'mov': formatMultiplier = 1.5; break;
      case 'gif': formatMultiplier = 3; break;
    }

    // FPS affects size
    let fpsMultiplier = settings.fps / 30;

    // Calculate size in MB: (duration in seconds * bitrate in Mbps) / 8
    const estimatedMB = (duration * bitrateMultiplier * resolutionMultiplier * formatMultiplier * fpsMultiplier) / 8;

    if (estimatedMB < 1) {
      setEstimatedSize(`${Math.round(estimatedMB * 1024)} KB`);
    } else if (estimatedMB >= 1024) {
      setEstimatedSize(`${(estimatedMB / 1024).toFixed(1)} GB`);
    } else {
      setEstimatedSize(`${Math.round(estimatedMB)} MB`);
    }

    // Estimate export time (roughly 2x realtime for 1080p medium)
    const timeMultiplier = resolutionMultiplier * (settings.fps / 30) * (bitrateMultiplier / 8);
    const estimatedSeconds = duration * timeMultiplier * 0.5;
    
    if (estimatedSeconds < 60) {
      setEstimatedTime(`~${Math.max(5, Math.round(estimatedSeconds))} sn`);
    } else {
      setEstimatedTime(`~${Math.round(estimatedSeconds / 60)} dk`);
    }
  }, [project, settings, selectedFormat]);

  const handlePresetSelect = (preset: SocialPreset) => {
    setSelectedPreset(preset.id);
    setSettings(prev => ({
      ...prev,
      resolution: preset.resolution,
      fps: preset.fps,
    }));
  };

  const handleStartExport = async () => {
    if (!project) return;

    // Check permissions first on native
    if (isNative) {
      const hasPermission = await nativeExportService.checkPermissions();
      if (!hasPermission) {
        toast.error('Dosya kaydetme izni gerekli');
        return;
      }
    }

    setExportStatus('preparing');
    setProgress(0);
    setProgressMessage('Loading FFmpeg...');

    try {
      const videoBlob = await ffmpegService.mergeAndExport(
        project,
        { ...settings, format: selectedFormat },
        selectedFormat,
        (p) => {
          setProgress(p.progress);
          setProgressMessage(p.message);
          if (p.stage === 'encoding') setExportStatus('exporting');
          else if (p.stage === 'finalizing') setExportStatus('finalizing');
        }
      );

      setExportedVideoBlob(videoBlob);
      setExportStatus('complete');
      setProgress(100);
      setProgressMessage('Export completed!');

      // Save export settings to project
      const updatedProject = { ...project, exportSettings: { ...settings, format: selectedFormat } };
      ProjectService.saveProject(updatedProject);

      toast.success('Video created successfully!');
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      setProgressMessage(error instanceof Error ? error.message : 'Export error');
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  };

  const handleCancelExport = () => {
    setExportStatus('idle');
    setProgress(0);
    setProgressMessage('');
    setExportedVideoBlob(null);
  };

  const handleShare = async () => {
    if (!project) return;

    const ext = selectedFormat === 'gif' ? 'gif' : selectedFormat;
    const fileName = `${project.name.replace(/\s+/g, '_')}.${ext}`;

    if (exportedVideoBlob) {
      const success = await nativeExportService.shareVideoBlob(exportedVideoBlob, fileName);
      if (success) {
        toast.success('Sharing successful!');
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: project.name,
            text: 'Created with Xtrim',
          });
        } catch (e) {
          // User cancelled
        }
      } else {
        toast.error('Sharing is not supported');
      }
    }
  };

  const handleSaveToDevice = async () => {
    if (!project || !exportedVideoBlob) return;

    const ext = selectedFormat === 'gif' ? 'gif' : selectedFormat;
    const fileName = `${project.name.replace(/\s+/g, '_')}.${ext}`;

    const result = await nativeExportService.saveVideoToDevice(exportedVideoBlob, fileName);

    if (result.success) {
      toast.success(
        isNative 
          ? `Xtrim saved to Xtrim folder: ${result.filePath?.split('/').pop() || fileName}`
          : `Xtrim_${fileName} olarak indirildi!`
      );
    } else {
      toast.error(result.error || 'Save error');
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const isExporting = exportStatus !== 'idle' && exportStatus !== 'complete' && exportStatus !== 'error';
  const currentResolution = resolutionOptions.find(r => r.id === settings.resolution);
  const currentFormat = formatOptions.find(f => f.id === selectedFormat);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="iconGhost"
            size="iconSm"
            onClick={() => navigate(-1)}
            disabled={isExporting}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Export</h1>
            <p className="text-xxs text-muted-foreground">{project.name}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
        {/* Preview */}
        <div className="aspect-video bg-secondary rounded-xl overflow-hidden relative">
          {project.mediaItems[0]?.thumbnail ? (
            <img
              src={project.mediaItems[0].thumbnail}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {MediaService.formatDuration(project.duration)}
          </div>
          <div className="absolute bottom-2 right-2 bg-primary/90 px-2 py-1 rounded text-xs text-primary-foreground font-medium">
            {currentResolution?.description}
          </div>
        </div>

        {/* Export Status */}
        <AnimatePresence mode="wait">
          {exportStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center gap-3">
                {exportStatus === 'complete' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : exportStatus === 'error' ? (
                  <XCircle className="w-6 h-6 text-destructive" />
                ) : (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{progressMessage}</p>
                  <p className="text-xs text-muted-foreground">
                    {exportStatus === 'complete'
                      ? `${currentFormat?.label} ready in format`
                      : `${Math.round(progress)}% completed`}
                  </p>
                </div>
                {isExporting && (
                  <Button variant="ghost" size="sm" onClick={handleCancelExport}>
                    Cancel
                  </Button>
                )}
              </div>

              <Progress value={progress} className="h-2" />

              {exportStatus === 'complete' && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={handleSaveToDevice}>
                    <FolderDown className="w-4 h-4" />
                    Save
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        {exportStatus === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Social Media Presets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Fast Presetler</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {socialPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-w-[80px]',
                      selectedPreset === preset.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <preset.icon className={cn(
                      'w-5 h-5',
                      selectedPreset === preset.id ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-[10px] font-medium text-center leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Format</h3>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {formatOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedFormat(option.id);
                      setSelectedPreset(null);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                      selectedFormat === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <option.icon className={cn(
                      'w-5 h-5',
                      selectedFormat === option.id ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-xs font-bold">{option.label}</span>
                    <span className="text-[9px] text-muted-foreground">{option.codec}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Resolution</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {resolutionOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSettings({ ...settings, resolution: option.id });
                      setSelectedPreset(null);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                      settings.resolution === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <option.icon className={cn(
                      'w-5 h-5',
                      settings.resolution === option.id ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-xxs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FPS & Quality Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* FPS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-foreground text-sm">Frame Rate</h3>
                </div>
                <div className="flex gap-1">
                  {fpsOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSettings({ ...settings, fps: option.value });
                        setSelectedPreset(null);
                      }}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg border-2 transition-all',
                        settings.fps === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <span className={cn(
                        'text-sm font-bold block',
                        settings.fps === option.value ? 'text-primary' : 'text-foreground'
                      )}>{option.label}</span>
                      <span className="text-[9px] text-muted-foreground">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-foreground text-sm">Kalite</h3>
                </div>
                <div className="flex gap-1">
                  {qualityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSettings({ ...settings, bitrate: option.id })}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg border-2 transition-all',
                        settings.bitrate === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-bold block',
                        settings.bitrate === option.id ? 'text-primary' : 'text-foreground'
                      )}>{option.label}</span>
                      <span className="text-[8px] text-muted-foreground">{option.bitrateMbps}Mbps</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-3 px-4 bg-secondary/50 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Advanced Settings</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Advanced Settings */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                    {/* Fast Start */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Fast Start</p>
                          <p className="text-xs text-muted-foreground">Fast-start playback for web</p>
                        </div>
                      </div>
                      <Switch checked={enableFastStart} onCheckedChange={setEnableFastStart} />
                    </div>

                    {/* HDR */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">HDR</p>
                          <p className="text-xs text-muted-foreground">High dynamic range (if available)</p>
                        </div>
                      </div>
                      <Switch checked={enableHDR} onCheckedChange={setEnableHDR} />
                    </div>

                    {/* Remove Audio */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Film className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Sessiz Video</p>
                          <p className="text-xs text-muted-foreground">Export without audio</p>
                        </div>
                      </div>
                      <Switch checked={removeAudio} onCheckedChange={setRemoveAudio} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Export Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Export Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{currentFormat?.label} ({currentFormat?.codec})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Resolution:</span>
                  <span className="font-medium">{currentResolution?.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">FPS:</span>
                  <span className="font-medium">{settings.fps}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Bitrate:</span>
                  <span className="font-medium">{qualityOptions.find(q => q.id === settings.bitrate)?.bitrateMbps} Mbps</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-primary/10">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tahmini Boyut:</span>
                  <span className="text-sm font-bold text-primary">{estimatedSize}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button
              variant="gradient"
              size="lg"
              className="w-full"
              onClick={handleStartExport}
            >
              <Download className="w-5 h-5" />
              Export
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExportScreen;
