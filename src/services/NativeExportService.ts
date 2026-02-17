import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

class NativeExportService {
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
      if (!this.isNativePlatform()) {
        // Web fallback: trigger download
        return this.downloadForWeb(videoBlob, fileName);
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
      const fileExtensionMatch = fileName.match(/(\.[^./]+)$/);
      const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : '';
      const fileBaseName = fileExtension ? fileName.slice(0, -fileExtension.length) : fileName;
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
      // First save to temp location
      const saveResult = await this.saveToTemp(videoBlob, fileName);
      
      if (!saveResult.success || !saveResult.filePath) {
        return false;
      }

      return await this.shareVideo(saveResult.filePath, fileName);
    } catch (error) {
      console.error('Share blob error:', error);
      return false;
    }
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
      const xtrimFileName = fileName.startsWith('Xtrim_') ? fileName : `Xtrim_${fileName}`;
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
