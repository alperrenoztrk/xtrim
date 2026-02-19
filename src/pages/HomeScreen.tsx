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

const dragonLayers = [
  {
    id: 'jade-dragon',
    size: 'w-[18rem] h-[7rem] md:w-[24rem] md:h-[9rem]',
    className: 'top-[12%]',
    duration: 26,
    delay: 0,
    opacity: 0.3,
    bodyFrom: 'hsl(160 48% 56% / 0.9)',
    bodyTo: 'hsl(204 42% 38% / 0.8)',
    glow: 'hsl(168 90% 64% / 0.3)',
  },
  {
    id: 'violet-dragon',
    size: 'w-[14rem] h-[5.5rem] md:w-[20rem] md:h-[7.5rem]',
    className: 'top-[42%]',
    duration: 20,
    delay: 4,
    opacity: 0.24,
    bodyFrom: 'hsl(271 60% 66% / 0.85)',
    bodyTo: 'hsl(300 46% 42% / 0.72)',
    glow: 'hsl(284 100% 70% / 0.24)',
  },
  {
    id: 'mist-dragon',
    size: 'w-[16rem] h-[6rem] md:w-[22rem] md:h-[8rem]',
    className: 'top-[70%]',
    duration: 30,
    delay: 2,
    opacity: 0.22,
    bodyFrom: 'hsl(205 38% 76% / 0.78)',
    bodyTo: 'hsl(226 30% 44% / 0.65)',
    glow: 'hsl(213 94% 78% / 0.2)',
  },
];

const DragonWallpaper = () => (
  <div className="dragon-wallpaper pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_55%),radial-gradient(circle_at_85%_80%,hsl(var(--accent)/0.1),transparent_50%)]" />

    {dragonLayers.map((layer) => (
      <motion.div
        key={layer.id}
        className={cn('absolute left-[-35%]', layer.className, layer.size)}
        initial={{ x: '-10vw', y: 0 }}
        animate={{ x: ['0vw', '130vw'], y: [0, -18, 0, 14, 0] }}
        transition={{
          duration: layer.duration,
          delay: layer.delay,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'linear',
          times: [0, 1],
        }}
        style={{ opacity: layer.opacity }}
      >
        <svg viewBox="0 0 560 220" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter={`url(#dragon-soft-shadow-${layer.id})`}>
            <path
              d="M78 132C95 89 148 55 205 56C250 58 309 90 341 118C373 147 401 161 444 162C484 163 509 149 530 128C504 122 491 109 490 95C489 80 500 67 522 61C497 49 468 47 447 56C423 66 410 86 402 103C392 91 379 80 364 70C322 41 257 23 201 30C123 40 78 89 56 131L78 132Z"
              fill={`url(#dragon-body-${layer.id})`}
            />
            <path
              d="M206 62C195 82 196 106 211 120C228 136 262 138 284 121"
              stroke="hsl(45 94% 80% / 0.45)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M236 62C224 83 223 104 235 116"
              stroke="hsl(43 93% 72% / 0.4)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M68 131C44 128 32 109 38 95C44 80 62 73 85 82C69 90 61 103 61 115C61 121 64 127 68 131Z"
              fill="hsl(14 77% 67% / 0.7)"
            />
            <path
              d="M71 119C54 117 48 106 50 98C53 90 64 86 78 91C69 96 67 109 71 119Z"
              fill="hsl(14 88% 74% / 0.8)"
            />
            <path
              d="M86 90L99 71L112 90"
              stroke="hsl(46 90% 86% / 0.66)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M100 89L115 72L126 94"
              stroke="hsl(48 92% 82% / 0.55)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <ellipse cx="72" cy="102" rx="4.3" ry="3.4" fill="hsl(188 95% 74% / 0.92)" />
            <circle cx="73" cy="102" r="1.3" fill="hsl(210 62% 16% / 0.95)" />
            <path
              d="M205 53C251 28 294 41 328 78C347 98 353 114 351 138C334 113 311 96 272 95C240 95 214 103 184 118C186 92 192 72 205 53Z"
              fill="hsl(205 48% 92% / 0.2)"
            />
            <path
              d="M196 130C222 146 268 155 304 154C336 154 367 146 392 131"
              stroke="hsl(45 100% 88% / 0.45)"
              strokeWidth="3.4"
              strokeLinecap="round"
            />
            <path
              d="M344 116C362 124 380 126 396 124"
              stroke="hsl(49 98% 83% / 0.42)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M427 149C445 136 456 120 460 104"
              stroke="hsl(48 97% 81% / 0.38)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M438 84C458 95 473 113 478 133"
              stroke="hsl(201 67% 88% / 0.28)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>
          <defs>
            <linearGradient id={`dragon-body-${layer.id}`} x1="56" y1="30" x2="533" y2="168" gradientUnits="userSpaceOnUse">
              <stop stopColor={layer.bodyFrom} />
              <stop offset="0.48" stopColor="hsl(202 45% 20% / 0.65)" />
              <stop offset="1" stopColor={layer.bodyTo} />
            </linearGradient>
            <filter id={`dragon-soft-shadow-${layer.id}`} x="10" y="10" width="540" height="200" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="2.8" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .72 0"
                result="soft"
              />
              <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor={layer.glow} />
              <feBlend in="SourceGraphic" in2="soft" mode="normal" />
            </filter>
          </defs>
        </svg>
      </motion.div>
    ))}
  </div>
);

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
      <DragonWallpaper />

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
