import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Project, TimelineClip, MediaItem, ExportSettings } from '@/types';
import { MediaService } from '@/services/MediaService';

export interface FFmpegProgress {
  stage: 'loading' | 'preparing' | 'processing' | 'encoding' | 'finalizing' | 'complete';
  progress: number;
  message: string;
}

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;
  private readonly ffmpegVersion = '0.12.10';

  private async loadFromCDN(baseURL: string) {
    if (!this.ffmpeg) throw new Error('FFmpeg could not be initialized');

    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');

    await this.ffmpeg.load({ coreURL, wasmURL, workerURL });
  }

  async load(onProgress?: (p: FFmpegProgress) => void): Promise<void> {
    if (this.loaded) return;
    if (this.loading) {
      // Wait for existing load
      while (this.loading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }

    this.loading = true;
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading FFmpeg...' });

    try {
      this.ffmpeg = new FFmpeg();

      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress?.({
          stage: 'encoding',
          progress: Math.min(20 + progress * 70, 90),
          message: `Encoding... %${Math.round(progress * 100)}`,
        });
      });

      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      const cdnSources = [
        `https://unpkg.com/@ffmpeg/core@${this.ffmpegVersion}/dist/umd`,
        `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${this.ffmpegVersion}/dist/umd`,
      ];

      let lastError: unknown;
      for (const cdn of cdnSources) {
        try {
          await this.loadFromCDN(cdn);
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`FFmpeg core load failed from ${cdn}`, err);
        }
      }

      if (lastError) {
        throw lastError;
      }

      this.loaded = true;
      onProgress?.({ stage: 'loading', progress: 10, message: 'FFmpeg ready' });
    } catch (error) {
      console.error('FFmpeg load error:', error);
      throw new Error('FFmpeg could not be loaded. Check your internet connection and try again.');
    } finally {
      this.loading = false;
    }
  }

  async mergeAndExport(
    project: Project,
    settings: ExportSettings,
    format: string,
    onProgress?: (p: FFmpegProgress) => void
  ): Promise<Blob> {
    await this.load(onProgress);

    if (!this.ffmpeg) throw new Error('FFmpeg could not be initialized');

    const ffmpeg = this.ffmpeg;
    const sortedClips = [...project.timeline].sort((a, b) => a.order - b.order);
    const sourceBitrateMbps = this.estimateTimelineSourceBitrateMbps(project, sortedClips);

    if (sortedClips.length === 0) {
      throw new Error('Timeline is empty, no clips to export');
    }

    onProgress?.({ stage: 'preparing', progress: 12, message: 'Preparing media files...' });

    // Write all media files to FFmpeg virtual filesystem
    const tempFiles: string[] = [];
    const concatEntries: string[] = [];

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const media = project.mediaItems.find(m => m.id === clip.mediaId);
      if (!media) continue;

      const mediaUri = await MediaService.resolveMediaUri(media.uri);
      const ext = this.getExtension(mediaUri, media.name, media.type);
      const inputName = `input_${i}.${ext}`;

      onProgress?.({
        stage: 'preparing',
        progress: 12 + (i / sortedClips.length) * 8,
        message: `Uploading file (${i + 1}/${sortedClips.length})...`,
      });

      try {
        const fileData = await fetchFile(mediaUri);
        await ffmpeg.writeFile(inputName, fileData);
        tempFiles.push(inputName);

        if (media.type === 'photo') {
          // Convert photo to a short video clip
          const duration = clip.endTime - clip.startTime;
          const photoVideoName = `pv_${i}.mp4`;
          await ffmpeg.exec([
            '-y',
            '-loop', '1',
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-tune', 'stillimage',
            '-t', String(duration),
            ...(settings.removeAudio ? ['-an'] : []),
            '-pix_fmt', 'yuv420p',
            '-vf', this.getScaleFilter(settings),
            '-r', String(settings.fps),
            photoVideoName,
          ]);
          tempFiles.push(photoVideoName);
          concatEntries.push(`file '${photoVideoName}'`);
        } else {
          // Trim video clip if needed
          const clipDuration = clip.endTime - clip.startTime;
          const trimmedName = `trimmed_${i}.mp4`;
          
          const trimArgs = [
            '-y',
            '-ss', String(clip.startTime),
            '-i', inputName,
            '-t', String(clipDuration),
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            ...(settings.removeAudio ? ['-an'] : ['-c:a', 'aac']),
            '-pix_fmt', 'yuv420p',
            '-vf', this.getScaleFilter(settings),
            '-r', String(settings.fps),
            trimmedName,
          ];

          // Apply speed if set
          if (clip.speed && clip.speed !== 1) {
            const speedFilter = `setpts=${1 / clip.speed}*PTS`;
            trimArgs[trimArgs.indexOf('-vf') + 1] = 
              `${this.getScaleFilter(settings)},${speedFilter}`;
          }

          await ffmpeg.exec(trimArgs);
          tempFiles.push(trimmedName);
          concatEntries.push(`file '${trimmedName}'`);
        }
      } catch (err) {
        console.error(`Error processing clip ${i}:`, err);
        // Skip failed clips
      }
    }

    if (concatEntries.length === 0) {
      throw new Error('No clips could be processed');
    }

    onProgress?.({ stage: 'encoding', progress: 20, message: 'Merging videos...' });

    // Write concat list
    const concatList = concatEntries.join('\n');
    await ffmpeg.writeFile('concat.txt', concatList);

    // Get output settings
    const { outputExt, codecArgs } = this.getOutputSettings(format, settings, sourceBitrateMbps);
    const outputName = `output.${outputExt}`;

    // Concatenate all clips
    await ffmpeg.exec([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      ...codecArgs,
      outputName,
    ]);

    onProgress?.({ stage: 'finalizing', progress: 92, message: 'Creating file...' });

    // Read output
    const outputData = await ffmpeg.readFile(outputName);
    const mimeType = this.getMimeType(format);
    const blob = new Blob([new Uint8Array(outputData as Uint8Array)], { type: mimeType });

    // Cleanup virtual filesystem
    try {
      for (const file of tempFiles) {
        await ffmpeg.deleteFile(file).catch(() => {});
      }
      await ffmpeg.deleteFile('concat.txt').catch(() => {});
      await ffmpeg.deleteFile(outputName).catch(() => {});
    } catch {
      // Cleanup errors are non-critical
    }

    onProgress?.({ stage: 'complete', progress: 100, message: 'Export completed!' });

    return blob;
  }


  async mergeTimelineClips(
    project: Project,
    onProgress?: (p: FFmpegProgress) => void
  ): Promise<Blob> {
    return this.mergeAndExport(
      project,
      {
        resolution: project.exportSettings?.resolution ?? '1080p',
        fps: project.exportSettings?.fps ?? 30,
        bitrate: project.exportSettings?.bitrate ?? 'medium',
        format: 'mp4',
        fastStart: true,
        removeAudio: true,
      },
      'mp4',
      onProgress
    );
  }

  private getResolutionDimensions(resolution: ExportSettings['resolution']) {
    switch (resolution) {
      case '720p':
        return { width: 1280, height: 720 };
      case '4k':
        return { width: 3840, height: 2160 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  private getScaleFilter(settings: ExportSettings): string {
    const { width, height } = this.getResolutionDimensions(settings.resolution);
    return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }

  private getExtension(uri: string, name: string, type: string): string {
    const normalizedName = name.toLowerCase();

    if (type === 'photo') {
      if (uri.includes('image/png') || normalizedName.endsWith('.png') || uri.endsWith('.png')) return 'png';
      return 'jpg';
    }
    if (uri.includes('video/webm') || normalizedName.endsWith('.webm') || uri.endsWith('.webm')) return 'webm';
    if (uri.includes('video/quicktime') || normalizedName.endsWith('.mov') || uri.endsWith('.mov')) return 'mov';
    return 'mp4';
  }

  private getOutputSettings(format: string, settings: ExportSettings, sourceBitrateMbps?: number | null) {
    const qualityBitrateMap = {
      low: 2,
      medium: 4,
      high: 8,
    } as const;
    const crfMap = {
      low: 30,
      medium: 26,
      high: 23,
    } as const;

    const baseBitrateMbps = qualityBitrateMap[settings.bitrate] ?? qualityBitrateMap.medium;
    const adaptiveBitrateMbps = sourceBitrateMbps
      ? Math.min(baseBitrateMbps, Math.max(sourceBitrateMbps * 1.15, 1.2))
      : baseBitrateMbps;
    const bitrate = `${adaptiveBitrateMbps.toFixed(1)}M`;
    const maxRate = `${(adaptiveBitrateMbps * 1.25).toFixed(1)}M`;
    const bufferSize = `${(adaptiveBitrateMbps * 2).toFixed(1)}M`;
    const crf = String(crfMap[settings.bitrate] ?? crfMap.medium);

    switch (format) {
      case 'webm': {
        const codecArgs = ['-c:v', 'libvpx-vp9', '-b:v', bitrate, '-crf', crf, '-maxrate', maxRate, '-bufsize', bufferSize];
        if (settings.removeAudio) {
          codecArgs.push('-an');
        } else {
          codecArgs.push('-c:a', 'libopus', '-b:a', '128k');
        }
        return { outputExt: 'webm', codecArgs };
      }
      case 'gif':
        return {
          outputExt: 'gif',
          codecArgs: ['-vf', `fps=${Math.min(settings.fps, 15)},scale=480:-1:flags=lanczos`],
        };
      default: {
        const codecArgs = [
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-crf',
          crf,
          '-b:v',
          bitrate,
          '-maxrate',
          maxRate,
          '-bufsize',
          bufferSize,
        ];
        if (settings.hdr) {
          codecArgs.push('-color_primaries', 'bt2020', '-color_trc', 'smpte2084', '-colorspace', 'bt2020nc');
        }
        if (settings.removeAudio) {
          codecArgs.push('-an');
        } else {
          codecArgs.push('-c:a', 'aac', '-b:a', '128k');
        }
        if (settings.fastStart !== false) {
          codecArgs.push('-movflags', '+faststart');
        }
        return {
          outputExt: format === 'mov' ? 'mov' : 'mp4',
          codecArgs,
        };
      }
    }
  }

  private estimateTimelineSourceBitrateMbps(project: Project, clips: TimelineClip[]): number | null {
    let totalBytes = 0;
    let totalSeconds = 0;

    for (const clip of clips) {
      const media = project.mediaItems.find(item => item.id === clip.mediaId);
      if (!media || media.type !== 'video' || !media.size || !media.duration || media.duration <= 0) {
        continue;
      }

      const usedDuration = Math.max(clip.endTime - clip.startTime, 0.1);
      const ratio = Math.min(usedDuration / media.duration, 1);
      totalBytes += media.size * ratio;
      totalSeconds += usedDuration;
    }

    if (totalBytes <= 0 || totalSeconds <= 0) {
      return null;
    }

    const bitrateMbps = (totalBytes * 8) / (totalSeconds * 1_000_000);
    return Number.isFinite(bitrateMbps) ? bitrateMbps : null;
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'webm': return 'video/webm';
      case 'mov': return 'video/quicktime';
      case 'gif': return 'image/gif';
      default: return 'video/mp4';
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const ffmpegService = new FFmpegService();
export default ffmpegService;
