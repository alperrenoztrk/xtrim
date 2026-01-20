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
  Smartphone as PhoneIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProjectService } from '@/services/ProjectService';
import { MediaService } from '@/services/MediaService';
import { nativeExportService } from '@/services/NativeExportService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project, ExportSettings } from '@/types';

type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'finalizing' | 'complete' | 'error';

interface ResolutionOption {
  id: ExportSettings['resolution'];
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface FpsOption {
  value: ExportSettings['fps'];
  label: string;
}

interface QualityOption {
  id: ExportSettings['bitrate'];
  label: string;
  description: string;
}

const resolutionOptions: ResolutionOption[] = [
  { id: '720p', label: 'HD 720p', description: '1280 × 720', icon: Smartphone },
  { id: '1080p', label: 'Full HD 1080p', description: '1920 × 1080', icon: Monitor },
  { id: '4k', label: '4K Ultra HD', description: '3840 × 2160', icon: Film },
];

const fpsOptions: FpsOption[] = [
  { value: 24, label: '24 FPS' },
  { value: 30, label: '30 FPS' },
  { value: 60, label: '60 FPS' },
];

const qualityOptions: QualityOption[] = [
  { id: 'low', label: 'Düşük', description: 'Küçük dosya boyutu' },
  { id: 'medium', label: 'Orta', description: 'Dengeli' },
  { id: 'high', label: 'Yüksek', description: 'En iyi kalite' },
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

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedSize, setEstimatedSize] = useState('0 MB');
  const [exportedVideoBlob, setExportedVideoBlob] = useState<Blob | null>(null);
  const [isNative] = useState(nativeExportService.isNativePlatform());
  const [platform] = useState(nativeExportService.getPlatform());

  // Calculate estimated file size
  useEffect(() => {
    if (!project) return;

    const duration = project.duration;
    let bitrateMultiplier = 1;
    let resolutionMultiplier = 1;

    switch (settings.bitrate) {
      case 'low': bitrateMultiplier = 0.5; break;
      case 'medium': bitrateMultiplier = 1; break;
      case 'high': bitrateMultiplier = 2; break;
    }

    switch (settings.resolution) {
      case '720p': resolutionMultiplier = 1; break;
      case '1080p': resolutionMultiplier = 2.25; break;
      case '4k': resolutionMultiplier = 9; break;
    }

    // Base: ~5MB per minute at 1080p medium quality
    const baseMBPerMinute = 5;
    const estimatedMB = (duration / 60) * baseMBPerMinute * bitrateMultiplier * resolutionMultiplier;

    if (estimatedMB < 1) {
      setEstimatedSize(`${Math.round(estimatedMB * 1024)} KB`);
    } else if (estimatedMB >= 1024) {
      setEstimatedSize(`${(estimatedMB / 1024).toFixed(1)} GB`);
    } else {
      setEstimatedSize(`${Math.round(estimatedMB)} MB`);
    }
  }, [project, settings]);

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
    setProgressMessage('Proje hazırlanıyor...');

    // Simulate export process
    const steps = [
      { status: 'preparing' as ExportStatus, message: 'Medya dosyaları analiz ediliyor...', duration: 1000 },
      { status: 'exporting' as ExportStatus, message: 'Video işleniyor...', duration: 3000 },
      { status: 'exporting' as ExportStatus, message: 'Ses ekleniyor...', duration: 1500 },
      { status: 'exporting' as ExportStatus, message: 'Efektler uygulanıyor...', duration: 2000 },
      { status: 'finalizing' as ExportStatus, message: 'Dosya oluşturuluyor...', duration: 1500 },
      { status: 'complete' as ExportStatus, message: 'Dışa aktarma tamamlandı!', duration: 0 },
    ];

    let currentProgress = 0;
    const progressPerStep = 100 / steps.length;

    for (const step of steps) {
      setExportStatus(step.status);
      setProgressMessage(step.message);

      if (step.duration > 0) {
        const startProgress = currentProgress;
        const endProgress = currentProgress + progressPerStep;
        const startTime = Date.now();

        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const stepProgress = Math.min(elapsed / step.duration, 1);
            setProgress(startProgress + (endProgress - startProgress) * stepProgress);

            if (elapsed >= step.duration) {
              clearInterval(interval);
              resolve();
            }
          }, 50);
        });
      }

      currentProgress += progressPerStep;
    }

    setProgress(100);

    // Create a simulated video blob (in real app, this would be actual rendered video)
    // For demo purposes, we create a sample blob
    const sampleVideoData = new Uint8Array([0, 0, 0, 32, 102, 116, 121, 112]); // MP4 header sample
    const videoBlob = new Blob([sampleVideoData], { type: 'video/mp4' });
    setExportedVideoBlob(videoBlob);

    // Save export settings to project
    const updatedProject = { ...project, exportSettings: settings };
    ProjectService.saveProject(updatedProject);

    toast.success('Video başarıyla oluşturuldu!');
  };

  const handleCancelExport = () => {
    setExportStatus('idle');
    setProgress(0);
    setProgressMessage('');
    setExportedVideoBlob(null);
  };

  const handleShare = async () => {
    if (!project) return;

    const fileName = `${project.name.replace(/\s+/g, '_')}.mp4`;

    if (exportedVideoBlob) {
      const success = await nativeExportService.shareVideoBlob(exportedVideoBlob, fileName);
      if (success) {
        toast.success('Paylaşım başarılı!');
      } else if (navigator.share) {
        // Web fallback
        try {
          await navigator.share({
            title: project.name,
            text: 'Xtrim ile oluşturuldu',
          });
        } catch (e) {
          // User cancelled
        }
      } else {
        toast.error('Paylaşım desteklenmiyor');
      }
    }
  };

  const handleSaveToDevice = async () => {
    if (!project || !exportedVideoBlob) return;

    const fileName = `${project.name.replace(/\s+/g, '_')}.mp4`;

    const result = await nativeExportService.saveVideoToDevice(exportedVideoBlob, fileName);

    if (result.success) {
      toast.success(
        isNative 
          ? `Video kaydedildi: ${result.filePath?.split('/').pop() || fileName}`
          : 'Video indirildi!'
      );
    } else {
      toast.error(result.error || 'Kaydetme hatası');
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Proje bulunamadı</p>
      </div>
    );
  }

  const isExporting = exportStatus !== 'idle' && exportStatus !== 'complete' && exportStatus !== 'error';

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
            <h1 className="text-sm font-semibold text-foreground">Dışa Aktar</h1>
            <p className="text-xxs text-muted-foreground">{project.name}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
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
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
            {MediaService.formatDuration(project.duration)}
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
                      ? 'Video hazır'
                      : `${Math.round(progress)}%`}
                  </p>
                </div>
                {isExporting && (
                  <Button variant="ghost" size="sm" onClick={handleCancelExport}>
                    İptal
                  </Button>
                )}
              </div>

              <Progress value={progress} className="h-2" />

              {exportStatus === 'complete' && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Paylaş
                  </Button>
                  <Button variant="gradient" className="flex-1" onClick={handleSaveToDevice}>
                    <FolderDown className="w-4 h-4" />
                    Kaydet
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
            {/* Resolution */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Çözünürlük</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {resolutionOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSettings({ ...settings, resolution: option.id })}
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

            {/* FPS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Kare Hızı (FPS)</h3>
              </div>
              <div className="flex gap-2">
                {fpsOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSettings({ ...settings, fps: option.value })}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium',
                      settings.fps === option.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:border-primary/50 text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality / Bitrate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Kalite</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {qualityOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSettings({ ...settings, bitrate: option.id })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                      settings.bitrate === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-medium',
                      settings.bitrate === option.id ? 'text-primary' : 'text-foreground'
                    )}>
                      {option.label}
                    </span>
                    <span className="text-xxs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Info */}
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="text-foreground font-medium">MP4 (H.264)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Süre</span>
                <span className="text-foreground font-medium">
                  {MediaService.formatDuration(project.duration)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tahmini Boyut</span>
                <span className="text-foreground font-medium">{estimatedSize}</span>
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
              Dışa Aktar
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExportScreen;
