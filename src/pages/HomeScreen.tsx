import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  Sparkles,
  Video,
  Music,
  Image,
  Grid3X3,
  ImagePlay,
  Settings,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/ProjectService';
import { cn } from '@/lib/utils';
import { tools } from '@/data/tools';
import type { Tool } from '@/types';

const iconComponents: Record<string, React.ComponentType<any>> = {
  Plus,
  LayoutGrid,
  Sparkles,
  Video,
  Music,
  Image,
  Grid3X3,
  ImagePlay,
  Settings,
};

const ToolButton = ({
  tool,
  index,
  onClick,
}: {
  tool: Tool;
  index: number;
  onClick: () => void;
}) => {
  const Icon = iconComponents[tool.icon];
  const isNewProject = tool.id === 'new-project';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 + 0.2, duration: 0.3 }}
    >
      <Button
        variant={isNewProject ? 'gradient' : 'tool'}
        className={cn(
          'w-full aspect-square relative overflow-hidden',
          isNewProject && 'aspect-auto min-h-[100px]'
        )}
        onClick={onClick}
      >
        {isNewProject && (
          <div className="absolute inset-0 animate-shimmer opacity-50" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <Icon
            className={cn(
              'h-7 w-7',
              isNewProject ? 'text-primary-foreground' : 'text-primary'
            )}
          />
          <span
            className={cn(
              'text-xs font-medium',
              isNewProject ? 'text-primary-foreground' : 'text-foreground'
            )}
          >
            {tool.name}
          </span>
          {tool.isBeta && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xxs font-bold bg-accent text-accent-foreground rounded-full">
              BETA
            </span>
          )}
        </div>
      </Button>
    </motion.div>
  );
};

const RecentProjectCard = ({
  project,
  onClick,
}: {
  project: ReturnType<typeof ProjectService.getProjects>[0];
  onClick: () => void;
}) => {
  return (
    <motion.button
      className="flex-shrink-0 w-36 overflow-hidden rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="aspect-video bg-secondary flex items-center justify-center">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Video className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-2 text-left">
        <p className="text-xs font-medium text-foreground truncate">
          {project.name}
        </p>
        <p className="text-xxs text-muted-foreground">
          {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </motion.button>
  );
};

const HomeScreen = () => {
  const navigate = useNavigate();
  const recentProjects = ProjectService.getProjects().slice(0, 5);

  const handleToolClick = (tool: Tool) => {
    if (tool.id === 'new-project') {
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}`);
    } else {
      navigate(tool.route);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <motion.header
        className="px-5 pt-4 pb-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold xtrim-gradient-text">Xtrim</h1>
            <p className="text-sm text-muted-foreground">What will you create?</p>
          </div>
          <Button
            variant="iconGhost"
            size="icon"
            onClick={() => navigate('/projects')}
          >
            <Clock className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </motion.header>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <motion.section
          className="mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => navigate('/projects')}
            >
              See All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide pb-2">
            {recentProjects.map((project) => (
              <RecentProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/editor/${project.id}`)}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Tool Grid */}
      <section className="px-5 mt-6">
        <motion.h2
          className="text-sm font-semibold text-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Create
        </motion.h2>
        <div className="grid grid-cols-3 gap-3">
          {tools.map((tool, index) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              index={index}
              onClick={() => handleToolClick(tool)}
            />
          ))}
        </div>
      </section>

      {/* Bottom padding for mobile */}
      <div className="h-8" />
    </div>
  );
};

export default HomeScreen;
