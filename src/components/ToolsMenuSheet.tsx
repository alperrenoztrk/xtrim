import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToolsMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'video' | 'photo';
  onToolSelect: (toolId: string) => void;
}

const ToolsMenuSheet = ({ isOpen, onClose, type, onToolSelect }: ToolsMenuSheetProps) => {
  const title = type === 'video' ? 'Video' : 'Fotoğraf';

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

          {/* Content - Centered New Project Button */}
          <div className="flex-1 flex items-center justify-center p-6">
            <Button
              variant="gradient"
              size="lg"
              className="w-full max-w-sm h-14 bg-gradient-to-r from-primary to-accent"
              onClick={() => onToolSelect('new-project')}
            >
              Yeni proje
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToolsMenuSheet;
