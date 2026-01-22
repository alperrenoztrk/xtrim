import { motion, AnimatePresence } from 'framer-motion';
import { X, Scissors, Gauge, Mic, Monitor, Sparkles, Bot, Languages, MessageSquare, Image, Eraser, Expand, Type, Plus, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  isPro?: boolean;
  isAI?: boolean;
  isActive?: boolean; // New flag for active AI tools
}

interface ToolCategory {
  title: string;
  tools: Tool[];
}

interface ToolsMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'video' | 'photo';
  onToolSelect: (toolId: string) => void;
}

// AI tools with isActive: true are now functional
const videoCategories: ToolCategory[] = [
  {
    title: 'Hızlı eylemler',
    tools: [
      { id: 'trim', name: 'Kes', icon: Scissors },
      { id: 'speed', name: 'Hızı ayarla', icon: Gauge },
      { id: 'record', name: 'Kayıt', icon: Mic },
      { id: 'desktop', name: 'Masaüstü düzenleyici', icon: Monitor },
    ],
  },
  {
    title: 'Yapay zeka araçları',
    tools: [
      { id: 'autocut', name: 'AutoCut', icon: Sparkles, isAI: true, isActive: true },
      { id: 'ai-enhance-video', name: 'AI İyileştir', icon: Sparkles, isAI: true, isActive: true },
      { id: 'avatars', name: 'YZ avatarlar', icon: Bot, isPro: true, isAI: true, isActive: true },
      { id: 'translate', name: 'Video çevirmeni', icon: Languages, isPro: true, isAI: true },
      { id: 'dialogue', name: 'YZ diyalog sahne', icon: MessageSquare, isPro: true, isAI: true },
    ],
  },
];

const photoCategories: ToolCategory[] = [
  {
    title: 'Fotoğraf düzenleme',
    tools: [
      { id: 'editor', name: 'Fotoğraf düzenleyici', icon: Image },
      { id: 'background', name: 'Arka planı kaldır', icon: Eraser, isAI: true, isActive: true },
      { id: 'expand', name: 'YZ ile genişletme', icon: Expand, isPro: true, isAI: true, isActive: true },
      { id: 'generate', name: 'Metinden resim', icon: Type, isPro: true, isAI: true, isActive: true },
    ],
  },
  {
    title: 'Yapay zeka araçları',
    tools: [
      { id: 'enhance', name: 'Kaliteyi iyileştir', icon: Sparkles, isAI: true, isActive: true },
      { id: 'ai-avatars', name: 'YZ avatarlar', icon: Bot, isPro: true, isAI: true, isActive: true },
      { id: 'poster', name: 'YZ poster', icon: Image, isPro: true, isAI: true, isActive: true },
    ],
  },
];

const ToolsMenuSheet = ({ isOpen, onClose, type, onToolSelect }: ToolsMenuSheetProps) => {
  const categories = type === 'video' ? videoCategories : photoCategories;
  const title = type === 'video' ? 'Video Araçları' : 'Fotoğraf Araçları';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-background"
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
          <div className="flex-1 overflow-y-auto p-6 pb-32">
            {categories.map((category, categoryIndex) => (
              <div key={category.title} className={categoryIndex > 0 ? 'mt-8' : ''}>
                <h2 className="text-base font-semibold text-foreground mb-4">
                  {category.title}
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {category.tools.map((tool) => {
                    const Icon = tool.icon;
                    const isDisabled = tool.isAI && !tool.isActive;
                    const isProFeature = tool.isPro;
                    return (
                      <motion.button
                        key={tool.id}
                        className={`relative flex flex-col items-center p-3 rounded-xl transition-colors ${
                          isDisabled 
                            ? 'bg-muted/30 opacity-60 cursor-not-allowed' 
                            : 'bg-muted/50 hover:bg-muted active:scale-95'
                        }`}
                        whileTap={isDisabled ? {} : { scale: 0.95 }}
                        onClick={() => !isDisabled && onToolSelect(tool.id)}
                        disabled={isDisabled}
                      >
                        {isProFeature && (
                          <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center gap-0.5">
                            <Crown className="h-2.5 w-2.5" />
                            PRO
                          </span>
                        )}
                        {tool.isAI && tool.isActive && !isProFeature && (
                          <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-accent text-white font-medium">
                            AI
                          </span>
                        )}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                          tool.isAI && tool.isActive 
                            ? 'bg-gradient-to-br from-primary/20 to-accent/20' 
                            : 'bg-background'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isDisabled 
                              ? 'text-muted-foreground' 
                              : tool.isAI && tool.isActive 
                                ? 'text-primary' 
                                : 'text-foreground'
                          }`} />
                        </div>
                        <span className={`text-xs text-center leading-tight ${
                          isDisabled ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {tool.name}
                        </span>
                        {isDisabled && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">Yakında</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Button */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              variant="gradient"
              size="lg"
              className="w-full h-14 bg-gradient-to-r from-primary to-accent"
              onClick={() => onToolSelect('new-project')}
            >
              <Plus className="h-5 w-5 mr-2" />
              Yeni proje
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToolsMenuSheet;
