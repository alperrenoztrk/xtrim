// Xtrim Core Types

export interface MediaItem {
  id: string;
  type: 'video' | 'photo' | 'audio';
  uri: string;
  name: string;
  duration?: number; // in seconds
  thumbnail?: string;
  width?: number;
  height?: number;
  size?: number; // in bytes
  createdAt: Date;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  name?: string;
  startTime: number; // trim start in source media
  endTime: number;   // trim end in source media
  order: number;
  filters?: string[];
  speed?: number;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  cropRatio?: string;
  originalDuration?: number;
  transition?: string;
  animatedFilter?: 'none' | 'snow' | 'rain' | 'sparkles';
}

export interface AudioTrack {
  id: string;
  uri: string;
  name: string;
  startTime: number;    // when it starts in timeline
  endTime: number;      // when it ends in timeline
  trimStart: number;    // trim of audio file itself
  trimEnd: number;
  sourceDuration?: number; // full source duration in seconds
  volume: number;       // 0-1
  fadeIn: number;       // duration in seconds
  fadeOut: number;
  isMuted: boolean;
}

export interface ExportSettings {
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  bitrate: 'low' | 'medium' | 'high';
  format: 'mp4' | 'webm' | 'mov' | 'gif';
  fastStart?: boolean;
  hdr?: boolean;
  removeAudio?: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  mediaItems: MediaItem[];
  timeline: TimelineClip[];
  audioTracks: AudioTrack[];
  exportSettings: ExportSettings;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  duration: number; // total duration in seconds
}

export interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  description: string;
  mediaSlots: number;
  isPremium: boolean;
  config: TemplateConfig;
}

export interface TemplateConfig {
  clips: TemplateClip[];
  transitions: string[];
  music?: string;
  textOverlays?: TemplateTextOverlay[];
}

export interface TemplateClip {
  duration: number;
  effect?: string;
  transition?: string;
  animatedFilter?: 'none' | 'snow' | 'rain' | 'sparkles';
}

export interface TemplateTextOverlay {
  text: string;
  position: 'top' | 'center' | 'bottom';
  style: 'bold' | 'light' | 'accent';
  startTime: number;
  duration: number;
}

export interface CollageLayout {
  id: string;
  name: string;
  cells: number;
  preview: string;
  gridTemplate: string;
}

export interface AppSettings {
  language: 'auto' | 'tr' | 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'zh';
  theme: 'auto' | 'dark' | 'light';
  soundEffects: boolean;
  autoSave: boolean;
  exportQuality: 'balanced' | 'quality' | 'speed';
}

export type ToolType = 
  | 'new-project'
  | 'templates'
  | 'ai-enhance'
  | 'video-editor'
  | 'audio-music'
  | 'photo-editor'
  | 'collage'
  | 'photo-audio'
  | 'settings';

export interface Tool {
  id: ToolType;
  name: string;
  icon: string;
  description: string;
  route: string;
  gradient?: string;
  isNew?: boolean;
  isBeta?: boolean;
}
