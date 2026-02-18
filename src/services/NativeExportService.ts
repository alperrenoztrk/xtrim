import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

class NativeExportService {
  private readonly mimeTypeByExtension: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    gif: 'image/gif',
  };

  // Check if running on native platform
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Get platform name
  getPlatform(): 'ios' | 'android' | 'web' {
    return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
  }

  // Save video to device
  async saveVideoToDevice(
    videoBlob: Blob,
    fileName: string
  ): Promise<ExportResult> {
    try {
      const safeFileName = this.sanitizeFileName(fileName);

      if (!this.isNativePlatform()) {
        // Web fallback: trigger download
        return this.downloadForWeb(videoBlob, safeFileName);
      }

      // Convert blob to base64
      const base64Data = await this.blobToBase64(videoBlob);

      // Determine directory based on platform
      const directory = this.getPlatform() === 'ios' 
        ? Directory.Documents 
        : Directory.External;

      // Create Xtrim folder if it doesn't exist
      try {
        await Filesystem.mkdir({
          path: 'Xtrim',
          directory,
          recursive: true,
        });
      } catch (e) {
        // Directory might already exist, that's fine
      }

      // Generate unique filename with timestamp while preserving extension
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtensionMatch = safeFileName.match(/(\.[^./]+)$/);
      const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : '';
      const fileBaseName = fileExtension ? safeFileName.slice(0, -fileExtension.length) : safeFileName;
      const uniqueFileName = `${fileBaseName}_${timestamp}${fileExtension}`;

      // Write file
      const result = await Filesystem.writeFile({
        path: `Xtrim/${uniqueFileName}`,
        data: base64Data,
        directory,
        recursive: true,
      });

      // For Android, also save to gallery
      if (this.getPlatform() === 'android') {
        await this.copyToGallery(result.uri, uniqueFileName, fileExtension);
      }

      return {
        success: true,
        filePath: result.uri,
      };
    } catch (error) {
      console.error('Save video error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save error',
      };
    }
  }

  // Share video using native share sheet
  async shareVideo(videoPath: string, title: string): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        // Web fallback
        if (navigator.share) {
          await navigator.share({
            title,
            text: 'Created with Xtrim',
          });
          return true;
        }
        return false;
      }

      await Share.share({
        title,
        text: 'Created with Xtrim',
        url: videoPath,
        dialogTitle: 'Share Video',
      });

      return true;
    } catch (error) {
      console.error('Share error:', error);
      return false;
    }
  }

  // Share video from blob
  async shareVideoBlob(videoBlob: Blob, fileName: string): Promise<boolean> {
    try {
      const safeFileName = this.sanitizeFileName(fileName);

      if (!this.isNativePlatform()) {
        return await this.shareBlobOnWeb(videoBlob, safeFileName);
      }

      // First save to temp location
      const saveResult = await this.saveToTemp(videoBlob, safeFileName);
      
      if (!saveResult.success || !saveResult.filePath) {
        return false;
      }

      return await this.shareVideo(saveResult.filePath, safeFileName);
    } catch (error) {
      console.error('Share blob error:', error);
      return false;
    }
  }

  private async shareBlobOnWeb(videoBlob: Blob, fileName: string): Promise<boolean> {
    try {
      if (!navigator.share) {
        return false;
      }

      const fileToShare = this.createShareFile(videoBlob, fileName);
      const sharePayload: ShareData = {
        title: fileName,
        text: 'Created with Xtrim',
      };

      if (navigator.canShare?.({ files: [fileToShare] })) {
        sharePayload.files = [fileToShare];
      }

      await navigator.share(sharePayload);
      return true;
    } catch (error) {
      console.error('Web share error:', error);
      return false;
    }
  }

  private createShareFile(videoBlob: Blob, fileName: string): File {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const fallbackMimeType = extension ? this.mimeTypeByExtension[extension] : undefined;
    const mimeType = videoBlob.type || fallbackMimeType || 'application/octet-stream';

    return new File([videoBlob], fileName, { type: mimeType });
  }

  // Save to temp directory for sharing
  private async saveToTemp(videoBlob: Blob, fileName: string): Promise<ExportResult> {
    try {
      if (!this.isNativePlatform()) {
        return { success: false, error: 'Not on native platform' };
      }

      const base64Data = await this.blobToBase64(videoBlob);
      const timestamp = Date.now();

      const result = await Filesystem.writeFile({
        path: `temp_${timestamp}_${fileName}`,
        data: base64Data,
        directory: Directory.Cache,
      });

      return {
        success: true,
        filePath: result.uri,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Temp save error',
      };
    }
  }

  // Android: Copy to gallery (MediaStore)
  private async copyToGallery(sourcePath: string, fileName: string, fileExtension = ''): Promise<void> {
    try {
      // Read the file
      const contents = await Filesystem.readFile({
        path: sourcePath,
      });

      // Write to external storage which Android's MediaStore will pick up
      const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(fileExtension.toLowerCase());
      const mediaFolder = isImage ? 'Pictures' : 'Movies';
      await Filesystem.writeFile({
        path: `${mediaFolder}/Xtrim/${fileName}`,
        data: contents.data as string,
        directory: Directory.ExternalStorage,
        recursive: true,
      });
    } catch (error) {
      console.log('Gallery copy skipped:', error);
      // Not critical if this fails
    }
  }

  // Convert blob to base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Web fallback: trigger download
  private downloadForWeb(blob: Blob, fileName: string): ExportResult {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Add Xtrim prefix for web downloads to indicate the app source
      const safeFileName = this.sanitizeFileName(fileName);
      const xtrimFileName = safeFileName.startsWith('Xtrim_') ? safeFileName : `Xtrim_${safeFileName}`;
      link.download = xtrimFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, filePath: xtrimFileName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download error',
      };
    }
  }

  private sanitizeFileName(fileName: string): string {
    const trimmedFileName = fileName.trim();
    const fileExtensionMatch = trimmedFileName.match(/(\.[A-Za-z0-9]+)$/);
    const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : '';
    const fileBaseName = fileExtension
      ? trimmedFileName.slice(0, -fileExtension.length)
      : trimmedFileName;

    // Remove characters that are invalid in common file systems and paths.
    const sanitizedBaseName = fileBaseName
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
      .replace(/\s+/g, ' ')
      .replace(/_+/g, '_')
      .trim()
      .replace(/[. ]+$/g, '');

    const fallbackBaseName = sanitizedBaseName || 'xtrim_export';
    return `${fallbackBaseName}${fileExtension}`;
  }

  // Check and request storage permissions
  async checkPermissions(): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        return true; // Web doesn't need permissions
      }

      const status = await Filesystem.checkPermissions();
      
      if (status.publicStorage !== 'granted') {
        const result = await Filesystem.requestPermissions();
        return result.publicStorage === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  // Get saved videos list
  async getSavedVideos(): Promise<string[]> {
    try {
      if (!this.isNativePlatform()) {
        return [];
      }

      const directory = this.getPlatform() === 'ios' 
        ? Directory.Documents 
        : Directory.External;

      const result = await Filesystem.readdir({
        path: 'Xtrim',
        directory,
      });

      return result.files
        .filter(file => file.name.endsWith('.mp4'))
        .map(file => file.name);
    } catch (error) {
      return [];
    }
  }

  // Delete exported video
  async deleteVideo(fileName: string): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        return false;
      }

      const directory = this.getPlatform() === 'ios' 
        ? Directory.Documents 
        : Directory.External;

      await Filesystem.deleteFile({
        path: `Xtrim/${fileName}`,
        directory,
      });

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
}

export const nativeExportService = new NativeExportService();
export default nativeExportService;
