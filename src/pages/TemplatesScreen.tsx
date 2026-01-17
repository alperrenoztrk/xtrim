import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Grid3X3,
  Play,
  Clock,
  Crown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateService, templates } from '@/services/TemplateService';
import { cn } from '@/lib/utils';
import type { Template } from '@/types';

// Generate placeholder gradients for templates
const templateGradients: Record<string, string> = {
  'travel-vlog': 'from-blue-500 to-cyan-400',
  'workout': 'from-red-500 to-orange-400',
  'before-after': 'from-purple-500 to-pink-400',
  'lyric-beat': 'from-indigo-500 to-purple-400',
  'minimal-promo': 'from-gray-600 to-gray-400',
  'cinematic': 'from-amber-600 to-yellow-500',
  'tiktok-story': 'from-pink-500 to-rose-400',
  'photo-montage': 'from-green-500 to-emerald-400',
};

const TemplateCard = ({
  template,
  onClick,
}: {
  template: Template;
  onClick: () => void;
}) => {
  const gradient = templateGradients[template.id] || 'from-primary to-accent';

  return (
    <motion.button
      className="relative overflow-hidden rounded-xl bg-card border border-border group"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'aspect-[9/16] bg-gradient-to-br flex items-center justify-center',
          gradient
        )}
      >
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
        
        {/* Template Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-sm font-semibold text-white text-left">{template.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/70">{template.aspectRatio}</span>
            <span className="text-xs text-white/70 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {template.duration}s
            </span>
          </div>
        </div>

        {/* Premium badge */}
        {template.isPremium && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-white" />
            <span className="text-xxs font-bold text-white">PRO</span>
          </div>
        )}
      </div>
    </motion.button>
  );
};

const TemplatePreviewModal = ({
  template,
  onClose,
  onApply,
}: {
  template: Template;
  onClose: () => void;
  onApply: () => void;
}) => {
  const gradient = templateGradients[template.id] || 'from-primary to-accent';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-card rounded-t-3xl overflow-hidden safe-area-bottom"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Preview */}
        <div
          className={cn(
            'aspect-video bg-gradient-to-br flex items-center justify-center relative',
            gradient
          )}
        >
          <Button
            variant="iconGhost"
            size="icon"
            className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-white" />
          </Button>
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{template.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {template.description}
              </p>
            </div>
            {template.isPremium && (
              <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center gap-1">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">PRO</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{template.duration}s</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {template.aspectRatio}
            </div>
            <div className="text-sm text-muted-foreground">
              {template.mediaSlots} media slots
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="gradient" className="flex-1" onClick={onApply}>
              Use Template
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const TemplatesScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const categories = TemplateService.getCategories();
  const filteredTemplates = searchQuery
    ? TemplateService.searchTemplates(searchQuery)
    : selectedCategory
    ? TemplateService.getTemplatesByCategory(selectedCategory)
    : templates;

  const handleApplyTemplate = () => {
    if (!previewTemplate) return;
    // Navigate to media picker with template context
    navigate(`/media-picker?template=${previewTemplate.id}`);
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="iconGhost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Templates</h1>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-10 bg-secondary border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </header>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TemplateCard
                template={template}
                onClick={() => setPreviewTemplate(template)}
              />
            </motion.div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates found</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onApply={handleApplyTemplate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplatesScreen;
