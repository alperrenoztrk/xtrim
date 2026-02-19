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

      const hasPublicStoragePermission = await this.checkPermissions();

      const result = await this.writeVideoWithFallback(videoBlob, safeFileName, hasPublicStoragePermission);

      // For Android, attempt additional gallery copy only when permission is available.
      if (this.getPlatform() === 'android' && hasPublicStoragePermission && result.filePath) {
        const fileExtensionMatch = safeFileName.match(/(\.[^./]+)$/);
        const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : '';
        await this.copyToGallery(result.filePath, result.fileName, fileExtension);
      }

      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('Save video error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save error',
      };
    }
  }

  private async writeVideoWithFallback(
    videoBlob: Blob,
    safeFileName: string,
    hasPublicStoragePermission: boolean
  ): Promise<{ filePath: string; fileName: string }> {
    const platform = this.getPlatform();
    const directoryCandidates: Directory[] = platform === 'ios'
      ? [Directory.Documents]
      : hasPublicStoragePermission
        ? [Directory.Documents, Directory.External, Directory.ExternalStorage]
        : [Directory.Documents];

    let lastError: unknown;

    for (const directory of directoryCandidates) {
      try {
        return await this.writeVideoFile(videoBlob, safeFileName, directory);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Unable to write export file');
  }

  private async writeVideoFile(
    videoBlob: Blob,
    safeFileName: string,
    directory: Directory
  ): Promise<{ filePath: string; fileName: string }> {
    const base64Data = await this.blobToBase64(videoBlob);

    try {
      await Filesystem.mkdir({
        path: 'Xtrim',
        directory,
        recursive: true,
      });
    } catch {
      // Directory may already exist.
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtensionMatch = safeFileName.match(/(\.[^./]+)$/);
    const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : '';
    const fileBaseName = fileExtension ? safeFileName.slice(0, -fileExtension.length) : safeFileName;
    const uniqueFileName = `${fileBaseName}_${timestamp}${fileExtension}`;

    const result = await Filesystem.writeFile({
      path: `Xtrim/${uniqueFileName}`,
      data: base64Data,
      directory,
      recursive: true,
    });

    return {
      filePath: result.uri,
      fileName: uniqueFileName,
    };
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

      const sharePayload = {
        title,
        text: 'Created with Xtrim',
        dialogTitle: 'Share Video',
      };

      const localFilePath = this.resolveNativeFilePath(videoPath);

      try {
        await Share.share({
          ...sharePayload,
          files: [localFilePath],
        });
      } catch {
        // Older plugin/platform combinations may only support url.
        await Share.share({
          ...sharePayload,
          url: localFilePath,
        });
      }

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
        const downloadResult = this.downloadForWeb(videoBlob, fileName);
        return downloadResult.success;
      }

      const fileToShare = this.createShareFile(videoBlob, fileName);
      const sharePayload: ShareData = {
        title: fileName,
        text: 'Created with Xtrim',
      };

      const canShareResult = navigator.canShare?.({ files: [fileToShare] });
      const shouldAttachFile = canShareResult !== false;

      if (shouldAttachFile) {
        try {
          await navigator.share({
            ...sharePayload,
            files: [fileToShare],
          });
          return true;
        } catch {
          // Fallback to text-only share for browsers that reject file payloads at runtime.
        }
      }

      await navigator.share(sharePayload);
      return true;
    } catch (error) {
      console.error('Web share error:', error);
      const downloadResult = this.downloadForWeb(videoBlob, fileName);
      if (downloadResult.success) {
        return true;
      }
      return false;
    }
  }

  private resolveNativeFilePath(filePath: string): string {
    if (filePath.startsWith('file://') || filePath.startsWith('content://')) {
      return filePath;
    }

    return `file://${filePath}`;
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
      link.style.display = 'none';
      // Add Xtrim prefix for web downloads to indicate the app source
      const safeFileName = this.sanitizeFileName(fileName);
      const xtrimFileName = safeFileName.startsWith('Xtrim_') ? safeFileName : `Xtrim_${safeFileName}`;
      link.download = xtrimFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Safari/WebKit may cancel downloads if we revoke immediately.
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      
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

    // Keep file names portable across Android/iOS/web by reducing locale-specific characters.
    const normalizedBaseName = fileBaseName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');

    // Remove characters that are invalid in common file systems and paths.
    const sanitizedBaseName = normalizedBaseName
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_')
      .replace(/[^A-Za-z0-9._ -]/g, '_')
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

      // iOS exports to app Documents and does not require public storage permission.
      if (this.getPlatform() === 'ios') {
        return true;
      }

      const status = await Filesystem.checkPermissions();
      const publicStorage = (status as { publicStorage?: string }).publicStorage;
      
      // Some platforms/plugins may not expose publicStorage; treat as granted.
      if (!publicStorage || publicStorage === 'granted') {
        return true;
      }

      if (publicStorage !== 'granted') {
        const result = await Filesystem.requestPermissions();
        return (result as { publicStorage?: string }).publicStorage === 'granted';
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
