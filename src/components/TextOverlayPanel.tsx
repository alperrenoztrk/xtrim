import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Plus,
  Trash2,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Move,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  shadow: boolean;
  animation: TextAnimation;
}

type TextAnimation = 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'scale' | 'typewriter' | 'bounce' | 'glow';

interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  x?: number; // percentage 0-100 for custom position
  y?: number; // percentage 0-100 for custom position
  style: TextStyle;
  startTime: number;
  endTime: number;
}

interface TextOverlayPanelProps {
  currentTime: number;
  videoDuration: number;
  textOverlays: TextOverlay[];
  isEditingMode?: boolean;
  onClose: () => void;
  onAddOverlay: (overlay: TextOverlay) => void;
  onUpdateOverlay: (id: string, overlay: Partial<TextOverlay>) => void;
  onRemoveOverlay: (id: string) => void;
  onToggleEditMode?: () => void;
}

const fonts = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display, serif' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { id: 'oswald', name: 'Oswald', family: 'Oswald, sans-serif' },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script, cursive' },
  { id: 'bebas', name: 'Bebas Neue', family: 'Bebas Neue, sans-serif' },
  { id: 'pacifico', name: 'Pacifico', family: 'Pacifico, cursive' },
];

const colors = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DFE6E9', '#6C5CE7',
  '#FD79A8', '#00B894', '#E17055', '#74B9FF', '#A29BFE',
];

const animations: { id: TextAnimation; name: string; icon?: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'fade-in', name: 'Fade In' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'slide-down', name: 'Slide Down' },
  { id: 'scale', name: 'Grow' },
  { id: 'typewriter', name: 'Daktilo' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'glow', name: 'Parlama' },
];

const presets = [
  {
    id: 'title',
    name: 'Title',
    style: {
      fontFamily: 'Bebas Neue, sans-serif',
      fontSize: 48,
      color: '#FFFFFF',
      backgroundColor: 'transparent',
      textAlign: 'center' as const,
      bold: true,
      italic: false,
      underline: false,
      shadow: true,
      animation: 'scale' as TextAnimation,
    },
  },
  {
    id: 'subtitle',
    name: 'Subtitle',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 20,
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.7)',
      textAlign: 'center' as const,
      bold: false,
      italic: false,
      underline: false,
      shadow: false,
      animation: 'fade-in' as TextAnimation,
    },
  },
  {
    id: 'caption',
    name: 'Description',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      color: '#FFFFFF',
      backgroundColor: 'transparent',
      textAlign: 'left' as const,
      bold: false,
      italic: true,
      underline: false,
      shadow: true,
      animation: 'slide-up' as TextAnimation,
    },
  },
  {
    id: 'quote',
    name: 'Quote',
    style: {
      fontFamily: 'Playfair Display, serif',
      fontSize: 28,
      color: '#FFEAA7',
      backgroundColor: 'transparent',
      textAlign: 'center' as const,
      bold: false,
      italic: true,
      underline: false,
      shadow: true,
      animation: 'fade-in' as TextAnimation,
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 32,
      color: '#4ECDC4',
      backgroundColor: 'transparent',
      textAlign: 'center' as const,
      bold: true,
      italic: false,
      underline: false,
      shadow: false,
      animation: 'typewriter' as TextAnimation,
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    style: {
      fontFamily: 'Oswald, sans-serif',
      fontSize: 36,
      color: '#FF00FF',
      backgroundColor: 'transparent',
      textAlign: 'center' as const,
      bold: true,
      italic: false,
      underline: false,
      shadow: true,
      animation: 'glow' as TextAnimation,
    },
  },
];

export const TextOverlayPanel = ({
  currentTime,
  videoDuration,
  textOverlays,
  isEditingMode = false,
  onClose,
  onAddOverlay,
  onUpdateOverlay,
  onRemoveOverlay,
  onToggleEditMode,
}: TextOverlayPanelProps) => {
  const [activeTab, setActiveTab] = useState<'add' | 'list'>('add');
  const [newText, setNewText] = useState('');
  const [position, setPosition] = useState<'top' | 'center' | 'bottom' | 'custom'>('center');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  
  const [style, setStyle] = useState<TextStyle>({
    fontFamily: 'Inter, sans-serif',
    fontSize: 24,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    textAlign: 'center',
    bold: false,
    italic: false,
    underline: false,
    shadow: true,
    animation: 'fade-in',
  });

  const [timing, setTiming] = useState({
    startTime: currentTime,
    duration: 3,
  });

  useEffect(() => {
    setTiming(prev => ({ ...prev, startTime: currentTime }));
  }, [currentTime]);

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.id);
    setStyle(preset.style);
  };

  const handleAddText = () => {
    if (!newText.trim()) return;

    const overlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newText,
      position,
      style,
      startTime: timing.startTime,
      endTime: Math.min(timing.startTime + timing.duration, videoDuration),
    };

    onAddOverlay(overlay);
    setNewText('');
    setActiveTab('list');
  };

  const handleEditOverlay = (overlay: TextOverlay) => {
    setEditingOverlayId(overlay.id);
    setNewText(overlay.text);
    setPosition(overlay.position);
    setStyle(overlay.style);
    setTiming({
      startTime: overlay.startTime,
      duration: overlay.endTime - overlay.startTime,
    });
    setActiveTab('add');
    setShowStyleEditor(true);
  };

  const handleUpdateText = () => {
    if (!editingOverlayId || !newText.trim()) return;

    onUpdateOverlay(editingOverlayId, {
      text: newText,
      position,
      style,
      startTime: timing.startTime,
      endTime: Math.min(timing.startTime + timing.duration, videoDuration),
    });

    setEditingOverlayId(null);
    setNewText('');
    setActiveTab('list');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnimationClass = (animation: TextAnimation) => {
    switch (animation) {
      case 'fade-in': return 'animate-fade-in';
      case 'slide-up': return 'animate-slide-up';
      case 'scale': return 'animate-scale-in';
      case 'bounce': return 'animate-bounce';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="border-t border-border bg-card z-20 max-h-[50vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Type className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Add Text</h3>
            <p className="text-xs text-muted-foreground">
              {textOverlays.length} text overlays added
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleEditMode && textOverlays.length > 0 && (
            <Button
              variant={isEditingMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={onToggleEditMode}
              className="gap-1"
            >
              <Move className="w-4 h-4" />
              {isEditingMode ? 'Done' : 'Move'}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab('add')}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === 'add'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          )}
        >
          {editingOverlayId ? 'Edit' : 'Add New'}
        </button>
        <button
          onClick={() => {
            setActiveTab('list');
            setEditingOverlayId(null);
          }}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-colors',
            activeTab === 'list'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          )}
        >
          Texts ({textOverlays.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'add' ? (
          <div className="space-y-4">
            {/* Text Input */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Text</label>
              <Input
                placeholder="Enter your text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Preview */}
            {newText && (
              <div className="bg-black/80 rounded-lg p-4 min-h-[100px] flex items-center justify-center relative">
                <div
                  className={cn(
                    'text-center px-4 py-2 rounded transition-all',
                    getAnimationClass(style.animation)
                  )}
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: `${Math.min(style.fontSize, 32)}px`,
                    color: style.color,
                    backgroundColor: style.backgroundColor,
                    fontWeight: style.bold ? 'bold' : 'normal',
                    fontStyle: style.italic ? 'italic' : 'normal',
                    textDecoration: style.underline ? 'underline' : 'none',
                    textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                    textAlign: style.textAlign,
                  }}
                >
                  {newText}
                </div>
              </div>
            )}

            {/* Presets */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Preset Styles</label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={cn(
                      'p-3 rounded-lg border text-center transition-all',
                      selectedPreset === preset.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <span
                      className="block text-sm truncate"
                      style={{
                        fontFamily: preset.style.fontFamily,
                        color: preset.style.color,
                        fontWeight: preset.style.bold ? 'bold' : 'normal',
                      }}
                    >
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Konum</label>
              <div className="grid grid-cols-3 gap-2">
                {(['top', 'center', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    className={cn(
                      'p-3 rounded-lg border transition-all flex items-center justify-center gap-2',
                      position === pos
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted/50'
                    )}
                  >
                    <Move className="w-4 h-4" />
                    <span className="text-sm capitalize">
                      {pos === 'top' ? 'Top' : pos === 'center' ? 'Middle' : 'Bottom'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Editor Toggle */}
            <button
              onClick={() => setShowStyleEditor(!showStyleEditor)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium">Advanced Style</span>
              {showStyleEditor ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Advanced Style Editor */}
            <AnimatePresence>
              {showStyleEditor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Font Family */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Font</label>
                    <div className="grid grid-cols-4 gap-2">
                      {fonts.map((font) => (
                        <button
                          key={font.id}
                          onClick={() => setStyle(s => ({ ...s, fontFamily: font.family }))}
                          className={cn(
                            'p-2 rounded-lg border text-xs transition-all truncate',
                            style.fontFamily === font.family
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/50'
                          )}
                          style={{ fontFamily: font.family }}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex justify-between">
                      <span>Font Size</span>
                      <span className="text-primary">{style.fontSize}px</span>
                    </label>
                    <Slider
                      value={[style.fontSize]}
                      min={12}
                      max={72}
                      step={1}
                      onValueChange={([v]) => setStyle(s => ({ ...s, fontSize: v }))}
                    />
                  </div>

                  {/* Text Formatting */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Formatting</label>
                    <div className="flex gap-2">
                      <Button
                        variant={style.bold ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, bold: !s.bold }))}
                      >
                        <Bold className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={style.italic ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, italic: !s.italic }))}
                      >
                        <Italic className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={style.underline ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, underline: !s.underline }))}
                      >
                        <Underline className="w-4 h-4" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant={style.textAlign === 'left' ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, textAlign: 'left' }))}
                      >
                        <AlignLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={style.textAlign === 'center' ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, textAlign: 'center' }))}
                      >
                        <AlignCenter className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={style.textAlign === 'right' ? 'secondary' : 'outline'}
                        size="icon"
                        onClick={() => setStyle(s => ({ ...s, textAlign: 'right' }))}
                      >
                        <AlignRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Text Color</label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setStyle(s => ({ ...s, color }))}
                          className={cn(
                            'w-8 h-8 rounded-lg border-2 transition-all',
                            style.color === color ? 'border-primary scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Background</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setStyle(s => ({ ...s, backgroundColor: 'transparent' }))}
                        className={cn(
                          'w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center text-xs',
                          style.backgroundColor === 'transparent' ? 'border-primary' : 'border-border'
                        )}
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => setStyle(s => ({ ...s, backgroundColor: 'rgba(0,0,0,0.7)' }))}
                        className={cn(
                          'w-8 h-8 rounded-lg border-2 transition-all',
                          style.backgroundColor === 'rgba(0,0,0,0.7)' ? 'border-primary' : 'border-transparent'
                        )}
                        style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                      />
                      {colors.slice(0, 10).map((color) => (
                        <button
                          key={`bg-${color}`}
                          onClick={() => setStyle(s => ({ ...s, backgroundColor: color + '99' }))}
                          className={cn(
                            'w-8 h-8 rounded-lg border-2 transition-all',
                            style.backgroundColor === color + '99' ? 'border-primary' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color + '99' }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Shadow Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <span className="text-sm">Shadow Effect</span>
                    <Button
                      variant={style.shadow ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setStyle(s => ({ ...s, shadow: !s.shadow }))}
                    >
                      {style.shadow ? 'Light' : 'Off'}
                    </Button>
                  </div>

                  {/* Animation */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Animation
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {animations.map((anim) => (
                        <button
                          key={anim.id}
                          onClick={() => setStyle(s => ({ ...s, animation: anim.id }))}
                          className={cn(
                            'p-2 rounded-lg border text-xs transition-all',
                            style.animation === anim.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          {anim.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timing */}
            <div className="space-y-3 p-3 rounded-lg border border-border">
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex justify-between">
                  <span>Start</span>
                  <span className="text-primary">{formatTime(timing.startTime)}</span>
                </label>
                <Slider
                  value={[timing.startTime]}
                  min={0}
                  max={videoDuration - 1}
                  step={0.1}
                  onValueChange={([v]) => setTiming(t => ({ ...t, startTime: v }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex justify-between">
                  <span>Duration</span>
                  <span className="text-primary">{timing.duration.toFixed(1)}s</span>
                </label>
                <Slider
                  value={[timing.duration]}
                  min={0.5}
                  max={Math.min(10, videoDuration - timing.startTime)}
                  step={0.1}
                  onValueChange={([v]) => setTiming(t => ({ ...t, duration: v }))}
                />
              </div>
            </div>

            {/* Add/Update Button */}
            <Button
              variant="gradient"
              className="w-full"
              onClick={editingOverlayId ? handleUpdateText : handleAddText}
              disabled={!newText.trim()}
            >
              {editingOverlayId ? (
                <>
                  <Check className="w-4 h-4" />
                  Update
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Text
                </>
              )}
            </Button>

            {editingOverlayId && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setEditingOverlayId(null);
                  setNewText('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          /* Text Overlays List */
          <div className="space-y-3">
            {textOverlays.length === 0 ? (
              <div className="text-center py-8">
                <Type className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No text added yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setActiveTab('add')}
                >
                  <Plus className="w-4 h-4" />
                  Add Text
                </Button>
              </div>
            ) : (
              textOverlays.map((overlay) => (
                <motion.div
                  key={overlay.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-secondary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium truncate mb-1"
                        style={{
                          fontFamily: overlay.style.fontFamily,
                          color: overlay.style.color === '#FFFFFF' ? 'inherit' : overlay.style.color,
                        }}
                      >
                        {overlay.text}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">
                          {overlay.position === 'top' ? 'Top' : overlay.position === 'center' ? 'Middle' : 'Bottom'}
                        </span>
                        <span>•</span>
                        <span>{formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}</span>
                        {overlay.style.animation !== 'none' && (
                          <>
                            <span>•</span>
                            <Sparkles className="w-3 h-3 text-primary" />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditOverlay(overlay)}
                      >
                        <Type className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveOverlay(overlay.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TextOverlayPanel;
