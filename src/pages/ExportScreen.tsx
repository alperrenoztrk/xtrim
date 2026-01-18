import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Download, Share2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/sonner';
import { ExportService, type ExportProgress } from '@/services/ExportService';
import { ProjectService } from '@/services/ProjectService';
import type { Project } from '@/types';

const ExportScreen = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const percent = useMemo(() => Math.round(progress?.progress ?? 0), [progress]);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }
    setProject(ProjectService.getProject(projectId));
  }, [projectId]);

  const startExport = useCallback(async () => {
    if (!project) return;
    setIsExporting(true);
    setOutputUri(null);
    setErrorMessage(null);
    setProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });

    const result = await ExportService.exportProject(
      project,
      project.exportSettings,
      (nextProgress) => setProgress(nextProgress)
    );

    setIsExporting(false);

    if (result.success && result.outputUri) {
      setOutputUri(result.outputUri);
      toast.success('Export complete', {
        description: 'Your project is ready to share or download.',
      });
    } else {
      const message = result.error || 'Export failed. Please try again.';
      setErrorMessage(message);
      toast.error('Export failed', {
        description: message,
      });
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      startExport();
    }
  }, [project, startExport]);

  const handleCopy = async () => {
    if (!outputUri) return;
    try {
      await navigator.clipboard.writeText(outputUri);
      toast.success('Copied output URI');
    } catch (error) {
      toast.error('Copy failed', {
        description: error instanceof Error ? error.message : 'Unable to copy URI.',
      });
    }
  };

  const handleShare = async () => {
    if (!outputUri) return;
    if (!navigator.share) {
      handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: `${project?.name || 'Project'} export`,
        text: 'Exported project video',
        url: outputUri,
      });
      toast.success('Share sheet opened');
    } catch (error) {
      toast.error('Share failed', {
        description: error instanceof Error ? error.message : 'Unable to share export.',
      });
    }
  };

  const handleDownload = () => {
    if (!outputUri) return;
    const link = document.createElement('a');
    link.href = outputUri;
    link.download = outputUri.split('/').pop() || 'export.mp4';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col items-center justify-center p-6 text-center">
        <Video className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-lg font-semibold mb-2">Project not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We could not locate the project you are trying to export.
        </p>
        <Button variant="gradient" onClick={() => navigate('/projects')}>
          Back to projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-xs text-muted-foreground">Export</p>
          <h1 className="text-lg font-semibold truncate">{project.name}</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-base font-semibold">
                {progress?.message || (isExporting ? 'Preparing export...' : 'Ready')}
              </p>
            </div>
            {outputUri ? (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Complete
              </div>
            ) : null}
          </div>

          <Progress value={percent} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress?.stage ? `Stage: ${progress.stage}` : 'Stage: --'}</span>
            <span>{percent}%</span>
          </div>

          {errorMessage ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={startExport} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Restart export'}
            </Button>
            <Button variant="ghost" onClick={() => navigate(`/editor/${project.id}`)}>
              Back to editor
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Output</p>
              <p className="text-base font-semibold">Export file</p>
            </div>
            {outputUri ? (
              <span className="text-xs text-emerald-500">Ready</span>
            ) : (
              <span className="text-xs text-muted-foreground">Waiting</span>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground break-all">
            {outputUri || 'Export output will appear here after completion.'}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="gradient" onClick={handleDownload} disabled={!outputUri}>
              <Download className="w-4 h-4" /> Download
            </Button>
            <Button variant="secondary" onClick={handleShare} disabled={!outputUri}>
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="ghost" onClick={handleCopy} disabled={!outputUri}>
              <Copy className="w-4 h-4" /> Copy URI
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ExportScreen;
