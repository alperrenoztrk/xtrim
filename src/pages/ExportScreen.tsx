import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Download, Share2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { ExportService, type ExportProgress } from '@/services/ExportService';
import { ProjectService } from '@/services/ProjectService';
import type { Project } from '@/types';

const stageLabels: Record<ExportProgress['stage'], string> = {
  preparing: 'Preparing',
  processing: 'Processing',
  encoding: 'Encoding',
  finalizing: 'Finalizing',
  complete: 'Complete',
};

const ExportScreen = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    stage: 'preparing',
    progress: 0,
    message: 'Starting export...',
  });
  const [status, setStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const estimatedTime = useMemo(() => {
    if (!project) return null;
    return ExportService.getEstimatedTime(project, project.exportSettings);
  }, [project]);

  const startExport = useCallback(
    async (currentProject: Project, isActive: () => boolean) => {
      setStatus('exporting');
      setErrorMessage(null);
      setOutputUri(null);
      setProgress({
        stage: 'preparing',
        progress: 0,
        message: 'Starting export...',
      });

      const result = await ExportService.exportProject(
        currentProject,
        currentProject.exportSettings,
        (nextProgress) => {
          if (!isActive()) return;
          setProgress(nextProgress);
        }
      );

      if (!isActive()) return;

      if (result.success) {
        setStatus('success');
        setOutputUri(result.outputUri ?? null);
        setProgress((prev) => ({
          ...prev,
          stage: 'complete',
          progress: 100,
          message: 'Export complete!',
        }));
        return;
      }

      setStatus('error');
      setErrorMessage(result.error ?? 'Export failed.');
    },
    []
  );

  useEffect(() => {
    if (!projectId) return;
    const foundProject = ProjectService.getProject(projectId);
    setProject(foundProject);
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    let active = true;
    const isActive = () => active;

    startExport(project, isActive);

    return () => {
      active = false;
    };
  }, [project, startExport]);

  const handleShare = async () => {
    if (!outputUri) return;
    const shareUrl = outputUri.startsWith('http')
      ? outputUri
      : `${window.location.origin}${outputUri}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${project?.name ?? 'Project'} export`,
          text: 'Your export is ready.',
          url: shareUrl,
        });
        return;
      } catch (error) {
        toast('Share cancelled.');
        return;
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      toast('Export link copied.');
    } else {
      toast('Copy not supported on this device.');
    }
  };

  const handleCopy = async () => {
    if (!outputUri) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(outputUri);
      toast('Export path copied.');
    } else {
      toast('Copy not supported on this device.');
    }
  };

  const handleRetry = () => {
    if (!project) return;
    startExport(project, () => true);
  };

  const progressPercent = Math.round(progress.progress);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Export</p>
            <h1 className="text-lg font-semibold">
              {project?.name ?? 'Project'}
            </h1>
          </div>
        </div>
        {status === 'success' && (
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        )}
      </header>

      <main className="p-5 space-y-6">
        {!project && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <TriangleAlert className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium">Project not found</p>
            <p className="text-sm text-muted-foreground">
              We couldn’t locate that project. Please return to your projects and try again.
            </p>
            <Button variant="gradient" onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </div>
        )}

        {project && (
          <motion.section
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{stageLabels[progress.stage]}</p>
                <p className="text-xs text-muted-foreground">{progress.message}</p>
              </div>
              <span className="text-sm font-semibold text-primary">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="font-medium text-foreground">Resolution</p>
                <p>{project.exportSettings.resolution}</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="font-medium text-foreground">Frame Rate</p>
                <p>{project.exportSettings.fps} fps</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="font-medium text-foreground">Bitrate</p>
                <p>{project.exportSettings.bitrate}</p>
              </div>
              <div className="rounded-lg bg-secondary/60 p-3">
                <p className="font-medium text-foreground">Estimate</p>
                <p>{estimatedTime ? `${estimatedTime}s` : '--'}</p>
              </div>
            </div>
          </motion.section>
        )}

        {project && status === 'success' && outputUri && (
          <motion.section
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold">Export Ready</p>
              <p className="text-xs text-muted-foreground break-all">{outputUri}</p>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                Copy Path
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="gradient" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share Export
              </Button>
              <Button asChild variant="outline">
                <a href={outputUri} download>
                  <Download className="w-4 h-4" /> Download
                </a>
              </Button>
            </div>
          </motion.section>
        )}

        {project && status === 'error' && (
          <motion.section
            className="rounded-2xl border border-destructive/50 bg-card p-5 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="w-5 h-5" />
              <p className="font-semibold">Export failed</p>
            </div>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={handleRetry}>
              Retry Export
            </Button>
          </motion.section>
        )}

        {project && status !== 'error' && (
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => navigate(`/editor/${project.id}`)}>
              Back to Editor
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExportScreen;
