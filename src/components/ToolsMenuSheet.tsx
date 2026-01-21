import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Scissors, Gauge, Mic, Monitor, Sparkles, Bot, Languages, MessageSquare, Image, Eraser, Expand, Type, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tool {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  isPro?: boolean;
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
      { id: 'autocut', name: 'AutoCut', icon: Sparkles },
      { id: 'avatars', name: 'YZ avatarlar', icon: Bot, isPro: true },
      { id: 'translate', name: 'Video çevirmeni', icon: Languages, isPro: true },
      { id: 'dialogue', name: 'YZ diyalog sahne', icon: MessageSquare, isPro: true },
    ],
  },
];

const photoCategories: ToolCategory[] = [
  {
    title: 'Fotoğraf düzenleme',
    tools: [
      { id: 'editor', name: 'Fotoğraf düzenleyici', icon: Image },
      { id: 'background', name: 'Arka planı kaldır', icon: Eraser },
      { id: 'expand', name: 'YZ ile genişletme', icon: Expand, isPro: true },
      { id: 'generate', name: 'Metinden resim', icon: Type, isPro: true },
    ],
  },
  {
    title: 'Yapay zeka araçları',
    tools: [
      { id: 'enhance', name: 'Kaliteyi iyileştir', icon: Sparkles },
      { id: 'avatars', name: 'YZ avatarlar', icon: Bot, isPro: true },
      { id: 'poster', name: 'YZ poster', icon: Image, isPro: true },
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
                    return (
                      <motion.button
                        key={tool.id}
                        className="relative flex flex-col items-center p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onToolSelect(tool.id)}
                      >
                        {tool.isPro && (
                          <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-primary to-accent text-white font-medium">
                            PRO
                          </span>
                        )}
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center mb-2">
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <span className="text-xs text-center text-foreground leading-tight">
                          {tool.name}
                        </span>
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
