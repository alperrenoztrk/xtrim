import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Video,
  Image,
  Trash2,
  Clock,
  Wand2,
  Sparkles,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/ProjectService';
import { ProjectNameDialog } from './ProjectNameDialog';
import type { Project } from '@/types';

interface ToolsMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'video' | 'photo';
  onToolSelect: (toolId: string) => void;
  onProjectOpen?: (projectId: string) => void;
}

const photoTools = [
  { id: 'generate', label: 'Text-to-Image', icon: Wand2 },
  { id: 'background', label: 'Remove BG', icon: Image },
  { id: 'enhance', label: 'AI Enhance', icon: Sparkles },
  { id: 'ai-avatars', label: 'AI Avatars', icon: Palette },
] as const;

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
};

const ToolsMenuSheet = ({ isOpen, onClose, type, onToolSelect, onProjectOpen }: ToolsMenuSheetProps) => {
  const title = type === 'video' ? 'Video' : 'Photo';
  const [projects, setProjects] = useState<Project[]>([]);
  const [showNameDialog, setShowNameDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      ProjectService.getProjectsAsync().then((allProjects) => {
        setProjects(type === 'video' ? allProjects : []);
      });
    }
  }, [isOpen, type]);

  const handleNewProject = () => {
    setShowNameDialog(true);
  };

  const handleCreateProject = (name: string) => {
    setShowNameDialog(false);
    onToolSelect('new-project-named:' + name);
  };

  const handleOpenProject = (projectId: string) => {
    if (onProjectOpen) {
      onProjectOpen(projectId);
    }
    onClose();
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    ProjectService.deleteProject(projectId);
    setProjects(projects.filter(p => p.id !== projectId));
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background flex h-full flex-col"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pb-32">
              {/* New Project Button */}
              <Button
                variant="gradient"
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-primary to-accent mb-6"
                onClick={handleNewProject}
              >
                New project
              </Button>

              {type === 'photo' && (
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-foreground mb-3">Photo AI Tools</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {photoTools.map((tool) => {
                      const Icon = tool.icon;

                      return (
                        <Button
                          key={tool.id}
                          variant="outline"
                          className="h-auto min-h-20 p-3 flex flex-col items-start gap-2 bg-muted/30 hover:bg-muted/50"
                          onClick={() => onToolSelect(tool.id)}
                        >
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-left whitespace-normal leading-tight">
                            {tool.label}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Saved Projects */}
              {type === 'video' && projects.length > 0 && (
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-4">
                    Saved Projects
                  </h2>
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <motion.div
                        key={project.id}
                        className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => handleOpenProject(project.id)}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Project Icon */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                          <Video className="h-5 w-5 text-primary" />
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatDate(project.updatedAt)}</span>
                            {project.timeline.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{project.timeline.length} clip</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteProject(e, project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {type === 'video' && projects.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No saved projects yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Name Dialog */}
      <ProjectNameDialog
        isOpen={showNameDialog}
        onClose={() => setShowNameDialog(false)}
        onConfirm={handleCreateProject}
      />
    </>
  );
};

export default ToolsMenuSheet;
