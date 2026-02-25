import { v4 as uuidv4 } from 'uuid';
import type { MediaItem } from '@/types';
import { MediaStorageService } from '@/services/MediaStorageService';

// Supported video formats with MIME types
const VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v', '.avi', '.mkv', 
  '.wmv', '.flv', '.3gp', '.3g2', '.ts', '.mts', '.m2ts', '.vob',
  '.mpg', '.mpeg', '.divx', '.xvid', '.asf', '.rm', '.rmvb'
];

const VIDEO_MIME_TYPES = [
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
  'video/x-msvideo', 'video/x-matroska', 'video/x-ms-wmv',
  'video/x-flv', 'video/3gpp', 'video/3gpp2', 'video/mp2t',
  'video/mpeg', 'video/x-m4v', 'application/x-mpegURL'
];

export class MediaService {
  private static readonly persistedUriPrefix = 'media://';
  private static uriCache = new Map<string, string>();

  // Check if file is a video based on extension or MIME type
  static isVideoFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // Check by extension first (more reliable for some formats)
    if (VIDEO_EXTENSIONS.includes(extension)) {
      return true;
    }
    
    // Check by MIME type
    if (mimeType.startsWith('video/') || VIDEO_MIME_TYPES.includes(mimeType)) {
      return true;
    }
    
    return false;
  }

  // Check if file is an audio file
  static isAudioFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.aiff'];
    
    return file.type.startsWith('audio/') || audioExtensions.includes(extension);
  }

  // Check if file is an image
  static isImageFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.heic', '.heif'];
    
    return file.type.startsWith('image/') || imageExtensions.includes(extension);
  }

  // Get supported video formats string for file input
  static getSupportedVideoFormats(): string {
    return 'video/*,' + VIDEO_EXTENSIONS.join(',');
  }

  // Get supported image formats string for file input
  static getSupportedImageFormats(): string {
    return 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.heic,.heif';
  }

  // Get all media formats string for file input
  static getSupportedMediaFormats(): string {
    return 'video/*,image/*,.mp4,.webm,.mov,.avi,.mkv,.wmv,.flv,.3gp,.m4v,.mpg,.mpeg';
  }

  // Create a MediaItem from a File
  static async createMediaItem(file: File): Promise<MediaItem> {
    const isVideo = this.isVideoFile(file);
    const isAudio = this.isAudioFile(file);
    const isPhoto = this.isImageFile(file);

    const type = isVideo ? 'video' : isAudio ? 'audio' : 'photo';
    const mediaId = uuidv4();
    const objectUri = URL.createObjectURL(file);
    let mediaUri = `${this.persistedUriPrefix}${mediaId}`;
    let shouldRevokeObjectUri = true;

    try {
      await MediaStorageService.saveMediaBlob(mediaId, file);
    } catch (error) {
      // iOS Safari can fail to persist larger blobs in IndexedDB. Keep the file available
      // through an object URL so users can still edit within the current session.
      console.warn('Failed to persist media blob, falling back to in-memory URL:', error);
      mediaUri = objectUri;
      shouldRevokeObjectUri = false;
    }

    const mediaItem: MediaItem = {
      id: mediaId,
      type,
      uri: mediaUri,
      name: file.name,
      size: file.size,
      createdAt: new Date(),
    };

    // Get additional metadata
    if (isVideo || isAudio) {
      const duration = await this.getMediaDuration(objectUri, isVideo ? 'video' : 'audio');
      mediaItem.duration = duration;
    }

    if (isVideo || isPhoto) {
      const dimensions = await this.getMediaDimensions(objectUri, type as 'video' | 'photo');
      mediaItem.width = dimensions.width;
      mediaItem.height = dimensions.height;

      if (isVideo) {
        mediaItem.thumbnail = await this.generateVideoThumbnail(objectUri);
      } else {
        mediaItem.thumbnail = await this.createImageDataUrl(file);
      }
    }

    if (shouldRevokeObjectUri) {
      URL.revokeObjectURL(objectUri);
    }

    return mediaItem;
  }

  static async resolveMediaUri(uri: string): Promise<string> {
    if (!uri.startsWith(this.persistedUriPrefix)) {
      return uri;
    }

    const mediaId = uri.slice(this.persistedUriPrefix.length);
    if (!mediaId) {
      return uri;
    }

    const cached = this.uriCache.get(mediaId);
    if (cached) {
      return cached;
    }

    try {
      const blob = await MediaStorageService.getMediaBlob(mediaId);
      if (!blob) {
        return uri;
      }

      const blobUrl = URL.createObjectURL(blob);
      this.uriCache.set(mediaId, blobUrl);
      return blobUrl;
    } catch (error) {
      console.error('Failed to resolve persisted media URI:', error);
      return uri;
    }
  }

  private static createImageDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }

  // Get duration of video/audio
  private static getMediaDuration(uri: string, type: 'video' | 'audio'): Promise<number> {
    return new Promise((resolve) => {
      const media = document.createElement(type === 'video' ? 'video' : 'audio');
      media.preload = 'metadata';
      
      const timeout = setTimeout(() => {
        resolve(0);
      }, 10000); // 10 second timeout
      
      media.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = isNaN(media.duration) ? 0 : media.duration;
        resolve(duration);
      };
      
      media.onerror = () => {
        clearTimeout(timeout);
        resolve(0);
      };
      
      media.src = uri;
    });
  }

  // Get dimensions of video/image
  private static getMediaDimensions(
    uri: string,
    type: 'video' | 'photo'
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ width: 0, height: 0 });
      }, 10000); // 10 second timeout

      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve({ width: video.videoWidth, height: video.videoHeight });
        };
        video.onerror = () => {
          clearTimeout(timeout);
          resolve({ width: 0, height: 0 });
        };
        video.src = uri;
      } else {
        const img = new Image();
        img.onload = () => {
          clearTimeout(timeout);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve({ width: 0, height: 0 });
        };
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

      const timeout = setTimeout(() => {
        resolve('');
      }, 15000); // 15 second timeout

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration / 4);
      };

      video.onseeked = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch (e) {
          resolve('');
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve('');
      };
      
      video.src = uri;
    });
  }

  // Check browser video format support
  static checkVideoSupport(mimeType: string): boolean {
    const video = document.createElement('video');
    return video.canPlayType(mimeType) !== '';
  }

  // Get supported formats info
  static getSupportedFormatsInfo(): { format: string; supported: boolean }[] {
    const formats = [
      { format: 'MP4 (H.264)', mime: 'video/mp4; codecs="avc1.42E01E"' },
      { format: 'WebM (VP8)', mime: 'video/webm; codecs="vp8"' },
      { format: 'WebM (VP9)', mime: 'video/webm; codecs="vp9"' },
      { format: 'OGG (Theora)', mime: 'video/ogg; codecs="theora"' },
      { format: 'MOV (QuickTime)', mime: 'video/quicktime' },
      { format: 'AVI', mime: 'video/x-msvideo' },
      { format: 'MKV', mime: 'video/x-matroska' },
    ];

    return formats.map(f => ({
      format: f.format,
      supported: this.checkVideoSupport(f.mime)
    }));
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
