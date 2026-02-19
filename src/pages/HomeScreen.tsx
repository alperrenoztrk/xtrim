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
    size: 'w-[19rem] h-[8rem] md:w-[25rem] md:h-[10rem]',
    className: 'top-[12%]',
    duration: 30,
    delay: 0,
    opacity: 0.42,
    bodyFrom: 'hsl(111 72% 62% / 0.92)',
    bodyTo: 'hsl(188 70% 42% / 0.86)',
    glow: 'hsl(146 95% 65% / 0.34)',
    mane: 'hsl(338 88% 56% / 0.72)',
    flame: 'hsl(22 95% 56% / 0.76)',
    horn: 'hsl(41 95% 81% / 0.92)',
    belly: 'hsl(67 83% 69% / 0.78)',
  },
  {
    id: 'violet-dragon',
    size: 'w-[15rem] h-[6.5rem] md:w-[21rem] md:h-[8rem]',
    className: 'top-[42%]',
    duration: 24,
    delay: 4,
    opacity: 0.34,
    bodyFrom: 'hsl(208 74% 60% / 0.9)',
    bodyTo: 'hsl(264 60% 48% / 0.82)',
    glow: 'hsl(255 100% 70% / 0.28)',
    mane: 'hsl(311 84% 64% / 0.62)',
    flame: 'hsl(13 93% 60% / 0.7)',
    horn: 'hsl(47 88% 84% / 0.88)',
    belly: 'hsl(84 68% 74% / 0.72)',
  },
  {
    id: 'mist-dragon',
    size: 'w-[17rem] h-[7rem] md:w-[23rem] md:h-[9rem]',
    className: 'top-[70%]',
    duration: 34,
    delay: 2,
    opacity: 0.3,
    bodyFrom: 'hsl(92 55% 69% / 0.82)',
    bodyTo: 'hsl(191 52% 44% / 0.72)',
    glow: 'hsl(192 95% 78% / 0.23)',
    mane: 'hsl(355 78% 70% / 0.54)',
    flame: 'hsl(25 90% 67% / 0.62)',
    horn: 'hsl(46 77% 85% / 0.82)',
    belly: 'hsl(74 62% 78% / 0.67)',
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
              d="M83 130C94 92 135 65 182 57C234 48 288 59 335 88C361 104 384 126 405 138C429 152 451 158 476 154C498 150 515 139 529 121C516 114 510 104 512 93C514 81 526 72 544 70C531 56 508 50 485 54C463 58 445 71 432 89C417 79 401 70 383 62C333 41 275 33 221 38C160 44 109 72 84 111L83 130Z"
              fill={`url(#dragon-body-${layer.id})`}
            />
            <path
              d="M196 64C208 74 221 79 237 81C257 84 279 81 296 69C288 87 284 100 286 115C288 132 301 145 322 151C282 157 247 156 216 144C192 133 181 113 182 89C183 80 187 70 196 64Z"
              fill={layer.belly}
            />
            <path
              d="M196 64C196 96 212 122 237 138"
              stroke="hsl(48 94% 88% / 0.56)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M220 63C219 94 232 121 252 140"
              stroke="hsl(44 92% 73% / 0.42)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M82 123C61 128 43 118 40 103C37 87 48 73 68 69C62 82 63 94 71 104C75 109 79 116 82 123Z"
              fill="hsl(20 84% 62% / 0.8)"
            />
            <path
              d="M64 108C54 107 48 99 50 91C52 84 61 79 71 82C65 88 63 97 64 108Z"
              fill="hsl(24 95% 70% / 0.86)"
            />
            <path
              d="M78 73L96 50L107 77"
              stroke={layer.horn}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <path
              d="M94 74L112 53L121 78"
              stroke="hsl(45 95% 84% / 0.74)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M92 74C109 64 121 63 132 71C145 80 150 96 151 112C140 97 127 90 112 90C102 90 92 93 81 99C82 89 84 80 92 74Z"
              fill={layer.mane}
            />
            <path
              d="M151 112C165 109 174 101 179 90C184 100 186 110 183 121C179 134 170 142 159 145"
              stroke={layer.flame}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <ellipse cx="73" cy="99" rx="4.4" ry="3.5" fill="hsl(181 96% 76% / 0.95)" />
            <circle cx="74" cy="99" r="1.4" fill="hsl(210 62% 16% / 0.95)" />
            <path
              d="M214 38C242 27 281 27 317 39C349 49 376 66 396 89C377 80 359 79 340 85C319 92 299 106 278 125C260 106 237 95 210 92C195 90 180 92 165 98C176 74 191 50 214 38Z"
              fill="hsl(202 78% 94% / 0.24)"
            />
            <path
              d="M196 130C219 143 247 151 278 153C308 155 343 151 376 141"
              stroke="hsl(50 100% 90% / 0.48)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M359 112C381 111 399 103 412 92"
              stroke={layer.flame}
              strokeWidth="3.1"
              strokeLinecap="round"
            />
            <path
              d="M427 146C443 126 451 104 452 82"
              stroke="hsl(43 98% 82% / 0.42)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M434 82C456 94 473 111 485 134"
              stroke="hsl(198 70% 90% / 0.3)"
              strokeWidth="8.2"
              strokeLinecap="round"
            />
            {Array.from({ length: 14 }).map((_, index) => {
              const x = 168 + index * 18;
              const y = 112 + Math.sin(index / 1.5) * 15;
              return (
                <circle
                  key={`${layer.id}-scale-${index}`}
                  cx={x}
                  cy={y}
                  r="6.1"
                  fill="hsl(83 68% 58% / 0.3)"
                  stroke="hsl(91 88% 76% / 0.35)"
                  strokeWidth="1.3"
                />
              );
            })}
          </g>
          <defs>
            <linearGradient id={`dragon-body-${layer.id}`} x1="56" y1="30" x2="533" y2="168" gradientUnits="userSpaceOnUse">
              <stop stopColor={layer.bodyFrom} />
              <stop offset="0.43" stopColor="hsl(128 60% 34% / 0.76)" />
              <stop offset="1" stopColor={layer.bodyTo} />
            </linearGradient>
            <filter id={`dragon-soft-shadow-${layer.id}`} x="10" y="10" width="540" height="200" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="2.3" result="blur" />
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
