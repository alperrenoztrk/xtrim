import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Crop, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoRotateCropPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRotation: (rotation: number, flipH: boolean, flipV: boolean) => void;
  onApplyCrop: (aspectRatio: string) => void;
  initialTab?: 'rotate' | 'crop';
  currentRotation?: number;
  currentFlipH?: boolean;
  currentFlipV?: boolean;
  currentCropRatio?: string;
}

const cropRatios = [
  { id: 'free', name: 'Free', ratio: null },
  { id: '1:1', name: '1:1', ratio: 1 },
  { id: '4:3', name: '4:3', ratio: 4 / 3 },
  { id: '3:4', name: '3:4', ratio: 3 / 4 },
  { id: '16:9', name: '16:9', ratio: 16 / 9 },
  { id: '9:16', name: '9:16', ratio: 9 / 16 },
];

export const VideoRotateCropPanel = ({
  isOpen,
  onClose,
  onApplyRotation,
  onApplyCrop,
  initialTab = 'rotate',
  currentRotation = 0,
  currentFlipH = false,
  currentFlipV = false,
  currentCropRatio = 'free',
}: VideoRotateCropPanelProps) => {
  const [activeTab, setActiveTab] = useState<'rotate' | 'crop'>(initialTab);
  const [rotation, setRotation] = useState(currentRotation);
  const [flipH, setFlipH] = useState(currentFlipH);
  const [flipV, setFlipV] = useState(currentFlipV);
  const [selectedCropRatio, setSelectedCropRatio] = useState(currentCropRatio);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab(initialTab);
    setRotation(currentRotation);
    setFlipH(currentFlipH);
    setFlipV(currentFlipV);
    setSelectedCropRatio(currentCropRatio);
  }, [currentCropRatio, currentFlipH, currentFlipV, currentRotation, initialTab, isOpen]);

  const handleRotate = (direction: 'cw' | 'ccw') => {
    const newRotation = rotation + (direction === 'cw' ? 90 : -90);
    setRotation(newRotation);
  };

  const handleFlip = (axis: 'h' | 'v') => {
    if (axis === 'h') {
      setFlipH(!flipH);
    } else {
      setFlipV(!flipV);
    }
  };

  const handleApplyRotation = () => {
    onApplyRotation(rotation, flipH, flipV);
    onClose();
  };

  const handleApplyCrop = () => {
    onApplyCrop(selectedCropRatio);
    onClose();
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-zinc-200 dark:border-zinc-800 dark:bg-black rounded-t-2xl z-20"
          initial={false}
          animate={{ y: 0 }}
          exit={{ y: 0 }}
          transition={{ duration: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="iconSm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
              <span className="font-medium text-foreground">Rotate & Crop</span>
            </div>
          </div>

          {/* Tab selector */}
          <div className="flex border-b border-border">
            <button
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'rotate'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
              onClick={() => setActiveTab('rotate')}
            >
              <RotateCw className="w-4 h-4 inline mr-2" />
              Rotate
            </button>
            <button
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'crop'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
              onClick={() => setActiveTab('crop')}
            >
              <Crop className="w-4 h-4 inline mr-2" />
              Crop
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'rotate' ? (
              <div className="space-y-4">
                {/* Rotation preview indicator */}
                <div className="text-center text-sm text-muted-foreground">
                  Rotation: {((rotation % 360) + 360) % 360}° 
                  {flipH && ' | Flipped Horizontally'}
                  {flipV && ' | Flipped Vertically'}
                </div>

                {/* Transform buttons */}
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleRotate('ccw')}>
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleRotate('cw')}>
                    <RotateCw className="w-5 h-5" />
                  </Button>
                  <div className="w-px h-8 bg-border mx-2" />
                  <Button
                    variant={flipH ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleFlip('h')}
                  >
                    <FlipHorizontal className="w-5 h-5" />
                  </Button>
                  <Button
                    variant={flipV ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleFlip('v')}
                  >
                    <FlipVertical className="w-5 h-5" />
                  </Button>
                </div>

                {/* Reset button */}
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                  <Button variant="gradient" size="sm" onClick={handleApplyRotation}>
                    <Check className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Crop ratio buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {cropRatios.map((ratio) => (
                    <Button
                      key={ratio.id}
                      variant={selectedCropRatio === ratio.id ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCropRatio(ratio.id)}
                    >
                      {ratio.name}
                    </Button>
                  ))}
                </div>

                {selectedCropRatio === 'free' ? (
                  <p className="text-xs text-muted-foreground text-center">
                    Free mode keeps the original framing.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">
                    Selected ratio will crop from center.
                  </p>
                )}

                <div className="flex gap-2 mt-2 justify-center">
                  <Button variant="outline" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button variant="gradient" size="sm" onClick={handleApplyCrop}>
                    <Check className="w-4 h-4" />
                    Apply Crop
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoRotateCropPanel;
