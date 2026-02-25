import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import type { Project, ExportSettings } from '@/types';

const PROJECTS_STORAGE_PREFIX = 'xtrim_projects';

const defaultExportSettings: ExportSettings = {
  resolution: '1080p',
  fps: 30,
  bitrate: 'medium',
  format: 'mp4',
  fastStart: true,
  hdr: false,
  removeAudio: false,
};

export class ProjectService {
  private static async getUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  }

  private static getStorageKey(userId: string | null): string {
    return userId ? `${PROJECTS_STORAGE_PREFIX}_${userId}` : PROJECTS_STORAGE_PREFIX;
  }

  static createProject(name: string = 'Untitled Project'): Project {
    const project: Project = {
      id: uuidv4(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      mediaItems: [],
      timeline: [],
      audioTracks: [],
      exportSettings: { ...defaultExportSettings },
      aspectRatio: '16:9',
      duration: 0,
    };
    return project;
  }

  static getProjectsSync(userId: string | null): Project[] {
    try {
      const stored = localStorage.getItem(this.getStorageKey(userId));
      if (!stored) return [];
      const projects = JSON.parse(stored);
      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }));
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  static getProjects(): Project[] {
    // Fallback sync version — tries to read cached userId
    const cachedUserId = localStorage.getItem('xtrim_current_user_id');
    return this.getProjectsSync(cachedUserId);
  }

  static async getProjectsAsync(): Promise<Project[]> {
    const userId = await this.getUserId();
    if (userId) localStorage.setItem('xtrim_current_user_id', userId);
    return this.getProjectsSync(userId);
  }

  static saveProject(project: Project): void {
    const cachedUserId = localStorage.getItem('xtrim_current_user_id');
    const key = this.getStorageKey(cachedUserId);
    const projects = this.getProjectsSync(cachedUserId);
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    
    project.updatedAt = new Date();
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.unshift(project);
    }
    
    localStorage.setItem(key, JSON.stringify(projects));
  }

  static deleteProject(projectId: string): void {
    const cachedUserId = localStorage.getItem('xtrim_current_user_id');
    const key = this.getStorageKey(cachedUserId);
    const projects = this.getProjectsSync(cachedUserId).filter((p) => p.id !== projectId);
    localStorage.setItem(key, JSON.stringify(projects));
  }

  static getProject(projectId: string): Project | null {
    const projects = this.getProjects();
    return projects.find((p) => p.id === projectId) || null;
  }

  static duplicateProject(projectId: string): Project | null {
    const original = this.getProject(projectId);
    if (!original) return null;

    const duplicate: Project = {
      ...original,
      id: uuidv4(),
      name: `${original.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.saveProject(duplicate);
    return duplicate;
  }
}
