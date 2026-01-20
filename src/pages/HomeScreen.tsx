import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Video, Image, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/ProjectService';
import { cn } from '@/lib/utils';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  gradient?: string;
}

const tools: Tool[] = [
  {
    id: 'video',
    name: 'Video',
    description: 'Edit and create videos',
    icon: Video,
    route: '/editor',
    gradient: 'from-primary to-accent',
  },
  {
    id: 'photo',
    name: 'Fotoğraf',
    description: 'Edit and enhance photos',
    icon: Image,
    route: '/photo-editor',
    gradient: 'from-accent to-primary',
  },
  {
    id: 'settings',
    name: 'Ayarlar',
    description: 'App preferences',
    icon: Settings,
    route: '/settings',
  },
];

const HomeScreen = () => {
  const navigate = useNavigate();

  const handleToolClick = (tool: Tool) => {
    if (tool.id === 'video') {
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}`);
    } else {
      navigate(tool.route);
    }
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col">
      {/* Header */}
      <motion.header
        className="px-6 pt-12 pb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold xtrim-gradient-text mb-2">Xtrim</h1>
        <p className="text-muted-foreground">Video & Fotoğraf Düzenleyici</p>
      </motion.header>

      {/* Main Tools */}
      <section className="flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="space-y-4 max-w-sm mx-auto w-full">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isMainTool = tool.id === 'video' || tool.id === 'photo';

            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
              >
                <Button
                  variant={isMainTool ? 'gradient' : 'outline'}
                  size="lg"
                  className={cn(
                    'w-full h-20 relative overflow-hidden',
                    isMainTool && 'bg-gradient-to-r',
                    tool.gradient
                  )}
                  onClick={() => handleToolClick(tool)}
                >
                  {isMainTool && (
                    <div className="absolute inset-0 animate-shimmer opacity-30" />
                  )}
                  <div className="relative z-10 flex items-center gap-4 w-full px-2">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      isMainTool ? 'bg-white/20' : 'bg-primary/10'
                    )}>
                      <Icon className={cn(
                        'h-6 w-6',
                        isMainTool ? 'text-white' : 'text-primary'
                      )} />
                    </div>
                    <div className="text-left">
                      <span className={cn(
                        'text-lg font-semibold block',
                        isMainTool ? 'text-white' : 'text-foreground'
                      )}>
                        {tool.name}
                      </span>
                      <span className={cn(
                        'text-sm',
                        isMainTool ? 'text-white/70' : 'text-muted-foreground'
                      )}>
                        {tool.description}
                      </span>
                    </div>
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default HomeScreen;
