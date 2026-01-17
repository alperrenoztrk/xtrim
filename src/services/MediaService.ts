import { v4 as uuidv4 } from 'uuid';
import type { MediaItem } from '@/types';

export class MediaService {
  // Create a MediaItem from a File
  static async createMediaItem(file: File): Promise<MediaItem> {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isPhoto = file.type.startsWith('image/');

    const type = isVideo ? 'video' : isAudio ? 'audio' : 'photo';
    const uri = URL.createObjectURL(file);

    const mediaItem: MediaItem = {
      id: uuidv4(),
      type,
      uri,
      name: file.name,
      size: file.size,
      createdAt: new Date(),
    };

    // Get additional metadata
    if (isVideo || isAudio) {
      const duration = await this.getMediaDuration(uri);
      mediaItem.duration = duration;
    }

    if (isVideo || isPhoto) {
      const dimensions = await this.getMediaDimensions(uri, type as 'video' | 'photo');
      mediaItem.width = dimensions.width;
      mediaItem.height = dimensions.height;

      if (isVideo) {
        mediaItem.thumbnail = await this.generateVideoThumbnail(uri);
      } else {
        mediaItem.thumbnail = uri;
      }
    }

    return mediaItem;
  }

  // Get duration of video/audio
  private static getMediaDuration(uri: string): Promise<number> {
    return new Promise((resolve) => {
      const media = document.createElement('video');
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        resolve(media.duration);
        URL.revokeObjectURL(uri);
      };
      media.onerror = () => resolve(0);
      media.src = uri;
    });
  }

  // Get dimensions of video/image
  private static getMediaDimensions(
    uri: string,
    type: 'video' | 'photo'
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => resolve({ width: 0, height: 0 });
        video.src = uri;
      } else {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = uri;
      }
    });
  }

  // Generate video thumbnail
  private static generateVideoThumbnail(uri: string): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 4);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      video.onerror = () => resolve('');
      video.src = uri;
    });
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Format duration
  static formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
