// Permission utilities for media access
// Ready for Capacitor integration

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'limited';

export interface PermissionResult {
  photos: PermissionStatus;
  camera: PermissionStatus;
  microphone: PermissionStatus;
}

class PermissionService {
  private permissionState: PermissionResult = {
    photos: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  };

  // Check current permission status
  async checkPermissions(): Promise<PermissionResult> {
    // In web environment, we simulate permissions
    // In Capacitor, this would use native permission APIs
    
    try {
      // Check camera permission (if available)
      if (navigator.permissions) {
        try {
          const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
          this.permissionState.camera = this.mapPermissionState(cameraResult.state);
        } catch {
          // Camera permission query not supported
        }

        try {
          const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          this.permissionState.microphone = this.mapPermissionState(micResult.state);
        } catch {
          // Microphone permission query not supported
        }
      }
    } catch (error) {
      console.log('Permission check not supported:', error);
    }

    return this.permissionState;
  }

  // Request specific permission
  async requestPermission(type: 'photos' | 'camera' | 'microphone'): Promise<PermissionStatus> {
    try {
      if (type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        this.permissionState.camera = 'granted';
        return 'granted';
      }

      if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        this.permissionState.microphone = 'granted';
        return 'granted';
      }

      // Photos permission - in web, this is always granted via file input
      // In Capacitor, this would use @capacitor/photos
      this.permissionState.photos = 'granted';
      return 'granted';
    } catch (error) {
      console.error('Permission request failed:', error);
      if (type === 'camera') this.permissionState.camera = 'denied';
      if (type === 'microphone') this.permissionState.microphone = 'denied';
      if (type === 'photos') this.permissionState.photos = 'denied';
      return 'denied';
    }
  }

  // Request all media permissions
  async requestAllPermissions(): Promise<PermissionResult> {
    await Promise.all([
      this.requestPermission('photos'),
      this.requestPermission('camera'),
      this.requestPermission('microphone'),
    ]);
    return this.permissionState;
  }

  // Map browser permission state to our status
  private mapPermissionState(state: PermissionState): PermissionStatus {
    switch (state) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
      default:
        return 'prompt';
    }
  }

  // Open device settings (for Capacitor)
  async openSettings(): Promise<void> {
    // In Capacitor, this would open native settings
    // For web, we just log a message
    console.log('Opening settings... (not available in web)');
    
    // Capacitor implementation would be:
    // import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
    // await NativeSettings.open({
    //   optionAndroid: AndroidSettings.ApplicationDetails,
    //   optionIOS: IOSSettings.App
    // });
  }

  // Get permission description for UI
  getPermissionDescription(type: 'photos' | 'camera' | 'microphone'): {
    title: string;
    description: string;
    icon: string;
  } {
    switch (type) {
      case 'photos':
        return {
          title: 'Photo Library Access',
          description: 'Access your photos and videos to import them into your projects.',
          icon: 'image',
        };
      case 'camera':
        return {
          title: 'Camera Access',
          description: 'Use your camera to capture photos and videos directly in the app.',
          icon: 'camera',
        };
      case 'microphone':
        return {
          title: 'Microphone Access',
          description: 'Record voiceovers and audio for your video projects.',
          icon: 'mic',
        };
    }
  }
}

export const permissionService = new PermissionService();
export default permissionService;
