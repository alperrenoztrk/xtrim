import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Move } from 'lucide-react';

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
  animation: 'none' | 'fade-in' | 'slide-up' | 'slide-down' | 'scale' | 'typewriter' | 'bounce' | 'glow';
}

interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  x?: number;
  y?: number;
  style: TextStyle;
  startTime: number;
  endTime: number;
}

interface DraggableTextOverlayProps {
  overlay: TextOverlay;
  containerRef: React.RefObject<HTMLDivElement>;
  isEditing: boolean;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect?: (id: string) => void;
}

export const DraggableTextOverlay = ({
  overlay,
  containerRef,
  isEditing,
  onPositionChange,
  onSelect,
}: DraggableTextOverlayProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getPositionStyle = useCallback(() => {
    if (overlay.position === 'custom' && overlay.x !== undefined && overlay.y !== undefined) {
      return {
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        transform: 'translate(-50%, -50%)',
      };
    }
    
    switch (overlay.position) {
      case 'top':
        return { top: '8%', left: '50%', transform: 'translateX(-50%)' };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottom':
        return { bottom: '8%', left: '50%', transform: 'translateX(-50%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  }, [overlay.position, overlay.x, overlay.y]);

  const animationClasses: Record<string, string> = {
    none: '',
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    scale: 'animate-scale-in',
    typewriter: 'animate-typewriter',
    bounce: 'animate-bounce',
    glow: 'animate-pulse',
  };

  const handleDragStart = () => {
    if (!isEditing) return;
    setIsDragging(true);
  };

  const handleDrag = useCallback((event: any, info: any) => {
    if (!isEditing || !containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate percentage position
    const xPercent = ((info.point.x - rect.left) / rect.width) * 100;
    const yPercent = ((info.point.y - rect.top) / rect.height) * 100;
    
    // Clamp values
    const clampedX = Math.max(5, Math.min(95, xPercent));
    const clampedY = Math.max(5, Math.min(95, yPercent));
    
    onPositionChange(overlay.id, clampedX, clampedY);
  }, [isEditing, containerRef, overlay.id, onPositionChange]);

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEditing && onSelect) {
      e.stopPropagation();
      onSelect(overlay.id);
    }
  };

  return (
    <motion.div
      ref={overlayRef}
      drag={isEditing}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`absolute px-3 py-1.5 rounded z-10 select-none ${
        animationClasses[overlay.style.animation]
      } ${isEditing ? 'cursor-move' : 'pointer-events-none'} ${
        isDragging ? 'ring-2 ring-primary shadow-lg' : ''
      } ${isEditing ? 'ring-1 ring-primary/50 hover:ring-2 hover:ring-primary' : ''}`}
      style={{
        ...getPositionStyle(),
        fontFamily: overlay.style.fontFamily,
        fontSize: `${overlay.style.fontSize}px`,
        color: overlay.style.color,
        backgroundColor: overlay.style.backgroundColor,
        textAlign: overlay.style.textAlign,
        fontWeight: overlay.style.bold ? 'bold' : 'normal',
        fontStyle: overlay.style.italic ? 'italic' : 'normal',
        textDecoration: overlay.style.underline ? 'underline' : 'none',
        textShadow: overlay.style.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
      }}
    >
      {isEditing && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs flex items-center gap-1 whitespace-nowrap">
          <Move className="w-3 h-3" />
          Drag
        </div>
      )}
      {overlay.text}
    </motion.div>
  );
};

export default DraggableTextOverlay;
