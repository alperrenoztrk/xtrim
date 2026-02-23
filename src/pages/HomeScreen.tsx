import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Video, Image, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectService } from '@/services/ProjectService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ToolsMenuSheet from '@/components/ToolsMenuSheet';
import TextToImagePanel from '@/components/TextToImagePanel';

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
    name: 'Photo',
    description: 'Edit and enhance photos',
    icon: Image,
    route: '/photo-editor',
    gradient: 'from-primary to-accent',
  },
  {
    id: 'edits',
    name: 'Edits',
    description: 'Create AI edits with ready templates',
    icon: Sparkles,
    route: '/home',
    gradient: 'from-primary to-accent',
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'App preferences',
    icon: Settings,
    route: '/settings',
  },
];

const HomeScreen = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuType, setMenuType] = useState<'video' | 'photo'>('video');
  const [textToImageOpen, setTextToImageOpen] = useState(false);

  const handleToolClick = (tool: Tool) => {
    if (tool.id === 'video' || tool.id === 'photo') {
      setMenuType(tool.id);
      setMenuOpen(true);
    } else if (tool.id === 'edits') {
      setTextToImageOpen(true);
    } else {
      navigate(tool.route);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setMenuOpen(false);
    
    // Handle named project creation
    if (toolId.startsWith('new-project-named:')) {
      const projectName = toolId.replace('new-project-named:', '');
      if (menuType === 'video') {
        const project = ProjectService.createProject(projectName);
        ProjectService.saveProject(project);
        navigate(`/editor/${project.id}`);
      } else {
        navigate('/photo-editor');
      }
      return;
    }
    
    // Video tools
    if (toolId === 'new-project') {
      if (menuType === 'video') {
        const project = ProjectService.createProject();
        ProjectService.saveProject(project);
        navigate(`/editor/${project.id}`);
      } else {
        navigate('/photo-editor');
      }
    } else if (toolId === 'trim' || toolId === 'speed') {
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}`);
    } else if (toolId === 'record') {
      toast.info('Voice recording feature', { description: 'You can add voice recording from the video editor.' });
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}`);
    } else if (toolId === 'desktop') {
      toast.info('Desktop editor', { description: 'This feature is available in the desktop app.' });
    }
    // Video AI tools
    else if (toolId === 'autocut') {
      toast.success('AutoCut', { description: 'You can auto-cut with AI in the video editor.' });
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}?tool=autocut`);
    } else if (toolId === 'ai-enhance-video') {
      toast.success('AI Enhancement', { description: 'You can improve video quality with AI.' });
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}?tool=enhance`);
    } else if (toolId === 'avatars') {
      toast.info('AI Avatars', { description: 'AI avatar creation feature.' });
      navigate('/photo-editor?tool=avatar');
    } else if (toolId === 'ai-generate') {
      toast.success('AI Video Generate', { description: 'You can create videos with text.' });
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}?tool=ai-generate`);
    }
    // Photo tools
    else if (toolId === 'editor') {
      navigate('/photo-editor');
    } else if (toolId === 'background') {
      navigate('/photo-editor?tool=background');
    } else if (toolId === 'expand') {
      toast.success('AI Expand', { description: 'Your photo can be expanded with AI.' });
      navigate('/photo-editor?tool=expand');
    } else if (toolId === 'generate') {
      setMenuOpen(false);
      setTextToImageOpen(true);
    } else if (toolId === 'enhance') {
      toast.success('AI Quality Enhancement', { description: 'You can improve photo quality with AI.' });
      navigate('/photo-editor?tool=enhance');
    } else if (toolId === 'ai-avatars') {
      toast.success('AI Avatars', { description: 'AI avatar creation feature.' });
      navigate('/photo-editor?tool=avatar');
    } else if (toolId === 'poster') {
      toast.success('AI Poster', { description: 'You can design professional posters with AI.' });
      navigate('/photo-editor?tool=poster');
    }
    // Video Translate
    else if (toolId === 'translate') {
      toast.success('Video Translator', { description: 'You can translate the video into different languages.' });
      const project = ProjectService.createProject();
      ProjectService.saveProject(project);
      navigate(`/editor/${project.id}?tool=translate`);
    }
    // Inactive AI tools
    else if (toolId === 'dialogue') {
      toast.info('Coming soon', { description: 'This feature will be active very soon.' });
    }
  };

  const handleProjectOpen = (projectId: string) => {
    setMenuOpen(false);
    navigate(`/editor/${projectId}`);
  };

  return (
    <div className="relative min-h-screen bg-background safe-area-top safe-area-bottom flex flex-col overflow-hidden">
      {/* Animated dragon background */}
      <div className="absolute inset-0 pointer-events-none">
        <video
          src="/videos/dragon-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-background/40" />
      </div>
      {/* Header */}
      <motion.header
        className="relative z-10 px-6 pt-12 pb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold xtrim-gradient-text mb-2">Xtrim</h1>
        <p className="text-muted-foreground">Video & Photo Editor</p>
      </motion.header>

      {/* Main Tools */}
      <section className="relative z-10 flex-1 flex flex-col justify-center px-6 pb-12">
        <div className="space-y-4 max-w-sm mx-auto w-full">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const isMainTool = tool.id === 'video' || tool.id === 'photo' || tool.id === 'edits';

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
                  <div className="relative z-10 flex items-center gap-4 w-full px-2 [&_svg]:h-6 [&_svg]:w-6">
                    <div className={cn(
                      'w-12 h-12 shrink-0 rounded-xl flex items-center justify-center',
                      isMainTool ? 'bg-white/20' : 'bg-primary/10'
                    )}>
                      <Icon className={cn(isMainTool ? 'text-white' : 'text-primary')} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
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

      {/* Tools Menu Sheet */}
      <ToolsMenuSheet
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        type={menuType}
        onToolSelect={handleToolSelect}
        onProjectOpen={handleProjectOpen}
      />

      {/* Text to Image Panel */}
      <TextToImagePanel
        isOpen={textToImageOpen}
        onClose={() => setTextToImageOpen(false)}
        onImageGenerated={(imageUrl) => {
          toast.success('Image created!', { description: 'You can download or edit the image.' });
        }}
        onEditInPhotoEditor={(imageUrl) => {
          setTextToImageOpen(false);
          // Store the generated image in sessionStorage for the photo editor
          sessionStorage.setItem('generatedImage', imageUrl);
          navigate('/photo-editor?source=generated');
        }}
      />
    </div>
  );
};

export default HomeScreen;
