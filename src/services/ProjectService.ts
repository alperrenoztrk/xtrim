import { v4 as uuidv4 } from 'uuid';
import type { Project, ExportSettings } from '@/types';

const PROJECTS_STORAGE_KEY = 'xtrim_projects';

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

  static getProjects(): Project[] {
    try {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
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

  static saveProject(project: Project): void {
    const projects = this.getProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);
    
    project.updatedAt = new Date();
    
    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.unshift(project);
    }
    
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }

  static deleteProject(projectId: string): void {
    const projects = this.getProjects().filter((p) => p.id !== projectId);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
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
