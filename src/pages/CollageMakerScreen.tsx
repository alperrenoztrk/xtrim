import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Grid,
  LayoutGrid,
  Image,
  Palette,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface CollageLayout {
  id: string;
  name: string;
  cells: number;
  gridTemplate: string;
  areas: string[];
}

interface CollagePhoto {
  id: string;
  url: string;
  cellId: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

const collageLayouts: CollageLayout[] = [
  {
    id: '2-horizontal',
    name: '2 Horizontal',
    cells: 2,
    gridTemplate: 'repeat(1, 1fr) / repeat(2, 1fr)',
    areas: ['a', 'b'],
  },
  {
    id: '2-vertical',
    name: '2 Vertical',
    cells: 2,
    gridTemplate: 'repeat(2, 1fr) / repeat(1, 1fr)',
    areas: ['a', 'b'],
  },
  {
    id: '3-left',
    name: '3 Left Focus',
    cells: 3,
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    areas: ['a a', 'b c'],
  },
  {
    id: '3-right',
    name: '3 Right Focus',
    cells: 3,
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    areas: ['a b', 'c c'],
  },
  {
    id: '3-horizontal',
    name: '3 Horizontal',
    cells: 3,
    gridTemplate: 'repeat(1, 1fr) / repeat(3, 1fr)',
    areas: ['a', 'b', 'c'],
  },
  {
    id: '4-grid',
    name: '4 Grid',
    cells: 4,
    gridTemplate: 'repeat(2, 1fr) / repeat(2, 1fr)',
    areas: ['a', 'b', 'c', 'd'],
  },
  {
    id: '4-horizontal',
    name: '4 Horizontal',
    cells: 4,
    gridTemplate: 'repeat(1, 1fr) / repeat(4, 1fr)',
    areas: ['a', 'b', 'c', 'd'],
  },
  {
    id: '5-center',
    name: '5 Center',
    cells: 5,
    gridTemplate: 'repeat(2, 1fr) / repeat(4, 1fr)',
    areas: ['a a b b', 'c d d e'],
  },
  {
    id: '6-grid',
    name: '6 Grid',
    cells: 6,
    gridTemplate: 'repeat(2, 1fr) / repeat(3, 1fr)',
    areas: ['a', 'b', 'c', 'd', 'e', 'f'],
  },
  {
    id: '9-grid',
    name: '9 Grid',
    cells: 9,
    gridTemplate: 'repeat(3, 1fr) / repeat(3, 1fr)',
    areas: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
  },
];

const backgroundColors = [
  { id: 'black', color: 'hsl(220, 20%, 6%)', name: 'Black' },
  { id: 'white', color: 'hsl(0, 0%, 100%)', name: 'White' },
  { id: 'gray', color: 'hsl(220, 10%, 40%)', name: 'Gray' },
  { id: 'primary', color: 'hsl(174, 72%, 50%)', name: 'Teal' },
  { id: 'accent', color: 'hsl(280, 70%, 55%)', name: 'Purple' },
  { id: 'warm', color: 'hsl(25, 80%, 50%)', name: 'Orange' },
  { id: 'cool', color: 'hsl(210, 80%, 50%)', name: 'Blue' },
  { id: 'nature', color: 'hsl(145, 60%, 40%)', name: 'Green' },
];

const borderWidths = [0, 2, 4, 8, 12, 16];
const borderRadii = [0, 4, 8, 12, 16, 24];

type EditorTab = 'layout' | 'style';

const CollageMakerScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<string | null>(null);

  const [selectedLayout, setSelectedLayout] = useState<CollageLayout>(collageLayouts[5]);
  const [photos, setPhotos] = useState<CollagePhoto[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(backgroundColors[0]);
  const [borderWidth, setBorderWidth] = useState(4);
  const [borderRadius, setBorderRadius] = useState(8);
  const [activeTab, setActiveTab] = useState<EditorTab>('layout');

  useEffect(() => {
    const rawImages = sessionStorage.getItem('collageSeedImages');
    if (!rawImages) return;

    try {
      const images = JSON.parse(rawImages) as string[];
      if (!Array.isArray(images) || images.length < 2) return;

      const seededLayout = collageLayouts.find((layout) => layout.cells >= images.length) ?? collageLayouts[collageLayouts.length - 1];
      setSelectedLayout(seededLayout);

      const seededCellIds = Array.from({ length: seededLayout.cells }, (_, i) => String.fromCharCode(97 + i));
      setPhotos(
        images.slice(0, seededLayout.cells).map((url, index) => ({
          id: uuidv4(),
          url,
          cellId: seededCellIds[index],
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        }))
      );
    } catch (error) {
      console.error('Failed to load collage seed images', error);
    } finally {
      sessionStorage.removeItem('collageSeedImages');
    }
  }, []);

  const cellIds = Array.from({ length: selectedLayout.cells }, (_, i) => 
    String.fromCharCode(97 + i)
  );

  const handleLayoutChange = (layout: CollageLayout) => {
    setSelectedLayout(layout);
    // Keep existing photos but remap to new layout
    const newCellIds = Array.from({ length: layout.cells }, (_, i) => 
      String.fromCharCode(97 + i)
    );
    setPhotos((prev) => 
      prev.filter((p) => newCellIds.includes(p.cellId))
    );
    setSelectedCellId(null);
  };

  const handleAddPhoto = (cellId: string) => {
    activeInputRef.current = cellId;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeInputRef.current) return;

    const url = URL.createObjectURL(file);
    const cellId = activeInputRef.current;

    setPhotos((prev) => {
      const existing = prev.find((p) => p.cellId === cellId);
      if (existing) {
        return prev.map((p) =>
          p.cellId === cellId ? { ...p, url, zoom: 1, offsetX: 0, offsetY: 0 } : p
        );
      }
      return [
        ...prev,
        {
          id: uuidv4(),
          url,
          cellId,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        },
      ];
    });

    activeInputRef.current = null;
    e.target.value = '';
  };

  const handleRemovePhoto = (cellId: string) => {
    setPhotos((prev) => prev.filter((p) => p.cellId !== cellId));
    setSelectedCellId(null);
  };

  const handleUpdatePhoto = (cellId: string, updates: Partial<CollagePhoto>) => {
    setPhotos((prev) =>
      prev.map((p) => (p.cellId === cellId ? { ...p, ...updates } : p))
    );
  };

  const handleReset = () => {
    setPhotos([]);
    setSelectedCellId(null);
    setBackgroundColor(backgroundColors[0]);
    setBorderWidth(4);
    setBorderRadius(8);
  };

  const selectedPhoto = photos.find((p) => p.cellId === selectedCellId);

  const drawRoundedRectPath = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  };

  const parseGridDimensions = (layout: CollageLayout) => {
    const hasComplexLayout = layout.areas[0]?.includes(' ');
    if (hasComplexLayout) {
      return {
        rows: layout.areas.length,
        cols: layout.areas[0].split(' ').length,
      };
    }

    const [rowsPart, colsPart] = layout.gridTemplate.split('/').map((part) => part.trim());
    const rowsMatch = rowsPart.match(/repeat\((\d+),/);
    const colsMatch = colsPart.match(/repeat\((\d+),/);
    return {
      rows: rowsMatch ? Number(rowsMatch[1]) : Math.max(1, Math.round(Math.sqrt(layout.cells))),
      cols: colsMatch ? Number(colsMatch[1]) : Math.max(1, Math.ceil(layout.cells / Math.max(1, Math.round(Math.sqrt(layout.cells))))),
    };
  };

  const getCellBounds = (layout: CollageLayout, cellId: string, canvasSize: number) => {
    const padding = borderWidth;
    const contentSize = canvasSize - padding * 2;
    const gap = borderWidth;
    const hasComplexLayout = layout.areas[0]?.includes(' ');
    const { rows, cols } = parseGridDimensions(layout);

    const totalGapX = Math.max(0, cols - 1) * gap;
    const totalGapY = Math.max(0, rows - 1) * gap;
    const unitWidth = (contentSize - totalGapX) / cols;
    const unitHeight = (contentSize - totalGapY) / rows;

    if (!hasComplexLayout) {
      const index = layout.areas.indexOf(cellId);
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        x: padding + col * (unitWidth + gap),
        y: padding + row * (unitHeight + gap),
        width: unitWidth,
        height: unitHeight,
      };
    }

    const matrix = layout.areas.map((row) => row.split(' '));
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;

    matrix.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value !== cellId) return;
        minRow = Math.min(minRow, rowIndex);
        maxRow = Math.max(maxRow, rowIndex);
        minCol = Math.min(minCol, colIndex);
        maxCol = Math.max(maxCol, colIndex);
      });
    });

    if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
      return null;
    }

    return {
      x: padding + minCol * (unitWidth + gap),
      y: padding + minRow * (unitHeight + gap),
      width: unitWidth * (maxCol - minCol + 1) + gap * (maxCol - minCol),
      height: unitHeight * (maxRow - minRow + 1) + gap * (maxRow - minRow),
    };
  };

  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });

  const handleSaveCollage = async () => {
    if (photos.length === 0) return;

    try {
      const size = 2048;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.fillStyle = backgroundColor.color;
      drawRoundedRectPath(ctx, 0, 0, size, size, borderRadius + borderWidth);
      ctx.fill();

      const loadedPhotos = await Promise.all(
        photos.map(async (photo) => {
          try {
            const image = await loadImage(photo.url);
            return { cellId: photo.cellId, photo, image };
          } catch {
            return { cellId: photo.cellId, photo, image: null };
          }
        })
      );

      loadedPhotos.forEach(({ cellId, photo, image }) => {
        if (!image) return;

        const bounds = getCellBounds(selectedLayout, cellId, size);
        if (!bounds) return;

        ctx.save();
        drawRoundedRectPath(ctx, bounds.x, bounds.y, bounds.width, bounds.height, borderRadius);
        ctx.clip();

        const baseScale = Math.max(bounds.width / image.width, bounds.height / image.height);
        const scale = baseScale * photo.zoom;
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;

        const maxShiftX = Math.max(0, (drawWidth - bounds.width) / 2);
        const maxShiftY = Math.max(0, (drawHeight - bounds.height) / 2);

        const x = bounds.x + (bounds.width - drawWidth) / 2 + (photo.offsetX / 50) * maxShiftX;
        const y = bounds.y + (bounds.height - drawHeight) / 2 + (photo.offsetY / 50) * maxShiftY;

        ctx.drawImage(image, x, y, drawWidth, drawHeight);
        ctx.restore();
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `collage-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: 'Collage indirildi', description: 'Görsel başarıyla cihazınıza kaydedildi.' });
    } catch (error) {
      console.error('Collage save error:', error);
      toast({
        title: 'Kaydetme başarısız',
        description: 'Kolaj indirilemedi. Lütfen tekrar deneyin.',
        variant: 'destructive',
      });
    }
  };

  const getGridStyle = (): React.CSSProperties => {
    const layout = selectedLayout;
    
    if (layout.areas.length === layout.cells && !layout.areas[0].includes(' ')) {
      // Simple grid without named areas
      return {
        display: 'grid',
        gridTemplate: layout.gridTemplate,
        gap: `${borderWidth}px`,
      };
    }
    
    // Complex grid with named areas
    const areaRows = layout.areas.join("' '");
    return {
      display: 'grid',
      gridTemplate: layout.gridTemplate,
      gridTemplateAreas: `'${areaRows}'`,
      gap: `${borderWidth}px`,
    };
  };

  return (
    <div className="h-screen flex flex-col bg-background safe-area-top">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass">
        <div className="flex items-center gap-3">
          <Button variant="iconGhost" size="iconSm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Collage Maker</h1>
            <p className="text-xxs text-muted-foreground">
              {photos.length} / {selectedLayout.cells} photos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="iconGhost" size="iconSm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="gradient"
            size="sm"
            disabled={photos.length === 0}
            onClick={handleSaveCollage}
          >
            <Download className="w-4 h-4" />
            Save
          </Button>
        </div>
      </header>

      {/* Collage preview */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          className="w-full max-w-md aspect-square rounded-xl overflow-hidden"
          style={{
            backgroundColor: backgroundColor.color,
            padding: `${borderWidth}px`,
            borderRadius: `${borderRadius + borderWidth}px`,
          }}
          layout
        >
          <div
            className="w-full h-full"
            style={{
              ...getGridStyle(),
              borderRadius: `${borderRadius}px`,
              overflow: 'hidden',
            }}
          >
            {cellIds.map((cellId, index) => {
              const photo = photos.find((p) => p.cellId === cellId);
              const isSelected = selectedCellId === cellId;
              const hasComplexLayout = selectedLayout.areas[0]?.includes(' ');
              
              return (
                <motion.div
                  key={cellId}
                  className={cn(
                    'relative overflow-hidden cursor-pointer transition-all',
                    isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                  style={{
                    borderRadius: `${borderRadius}px`,
                    gridArea: hasComplexLayout ? cellId : undefined,
                    backgroundColor: 'hsl(220, 15%, 15%)',
                  }}
                  onClick={() => setSelectedCellId(cellId)}
                  whileTap={{ scale: 0.98 }}
                  layout
                >
                  {photo ? (
                    <>
                      <img
                        src={photo.url}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          transform: `scale(${photo.zoom}) translate(${photo.offsetX}%, ${photo.offsetY}%)`,
                        }}
                        draggable={false}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button
                              variant="icon"
                              size="iconSm"
                              className="bg-white/20 backdrop-blur-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPhoto(cellId);
                              }}
                            >
                              <Image className="w-4 h-4 text-white" />
                            </Button>
                            <Button
                              variant="icon"
                              size="iconSm"
                              className="bg-white/20 backdrop-blur-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(cellId);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-secondary/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPhoto(cellId);
                      }}
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xxs text-muted-foreground">Add Photo</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Photo adjustment controls */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-card overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Adjust Photo</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCellId(null)}
                >
                  Done
                </Button>
              </div>
              
              <div className="space-y-3">
                {/* Zoom */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ZoomIn className="w-4 h-4" />
                      <span>Zoom</span>
                    </div>
                    <span className="text-foreground">{Math.round(selectedPhoto.zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[selectedPhoto.zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={([value]) =>
                      handleUpdatePhoto(selectedPhoto.cellId, { zoom: value })
                    }
                  />
                </div>

                {/* Position X */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Move className="w-4 h-4" />
                      <span>Position X</span>
                    </div>
                    <span className="text-foreground">{selectedPhoto.offsetX}%</span>
                  </div>
                  <Slider
                    value={[selectedPhoto.offsetX]}
                    min={-50}
                    max={50}
                    step={1}
                    onValueChange={([value]) =>
                      handleUpdatePhoto(selectedPhoto.cellId, { offsetX: value })
                    }
                  />
                </div>

                {/* Position Y */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Move className="w-4 h-4 rotate-90" />
                      <span>Position Y</span>
                    </div>
                    <span className="text-foreground">{selectedPhoto.offsetY}%</span>
                  </div>
                  <Slider
                    value={[selectedPhoto.offsetY]}
                    min={-50}
                    max={50}
                    step={1}
                    onValueChange={([value]) =>
                      handleUpdatePhoto(selectedPhoto.cellId, { offsetY: value })
                    }
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab selector */}
      {!selectedPhoto && (
        <div className="flex border-t border-border bg-card">
          {[
            { id: 'layout', label: 'Layout', icon: LayoutGrid },
            { id: 'style', label: 'Style', icon: Palette },
          ].map((tab) => (
            <button
              key={tab.id}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
              onClick={() => setActiveTab(tab.id as EditorTab)}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Controls panel */}
      {!selectedPhoto && (
        <div className="bg-card border-t border-border">
          <AnimatePresence mode="wait">
            {activeTab === 'layout' && (
              <motion.div
                key="layout"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4"
              >
                <div className="grid grid-cols-5 gap-2">
                  {collageLayouts.map((layout) => (
                    <button
                      key={layout.id}
                      className={cn(
                        'aspect-square rounded-lg border-2 p-1.5 transition-all',
                        selectedLayout.id === layout.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                      onClick={() => handleLayoutChange(layout)}
                    >
                      <LayoutPreview layout={layout} />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'style' && (
              <motion.div
                key="style"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 space-y-4"
              >
                {/* Background color */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Background</span>
                  <div className="flex gap-2 flex-wrap">
                    {backgroundColors.map((color) => (
                      <button
                        key={color.id}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                          backgroundColor.id === color.id
                            ? 'border-primary scale-110'
                            : 'border-transparent'
                        )}
                        style={{ backgroundColor: color.color }}
                        onClick={() => setBackgroundColor(color)}
                      >
                        {backgroundColor.id === color.id && (
                          <Check className={cn(
                            'w-4 h-4',
                            color.id === 'white' ? 'text-black' : 'text-white'
                          )} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border width */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Border Width</span>
                    <span className="text-foreground">{borderWidth}px</span>
                  </div>
                  <div className="flex gap-2">
                    {borderWidths.map((width) => (
                      <button
                        key={width}
                        className={cn(
                          'flex-1 py-2 rounded-lg border text-xs font-medium transition-all',
                          borderWidth === width
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                        onClick={() => setBorderWidth(width)}
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border radius */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Corner Radius</span>
                    <span className="text-foreground">{borderRadius}px</span>
                  </div>
                  <div className="flex gap-2">
                    {borderRadii.map((radius) => (
                      <button
                        key={radius}
                        className={cn(
                          'flex-1 py-2 rounded-lg border text-xs font-medium transition-all',
                          borderRadius === radius
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        )}
                        onClick={() => setBorderRadius(radius)}
                      >
                        {radius}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Safe area bottom padding */}
      <div className="safe-area-bottom bg-card" />
    </div>
  );
};

// Layout preview component
const LayoutPreview = ({ layout }: { layout: CollageLayout }) => {
  const cellIds = Array.from({ length: layout.cells }, (_, i) =>
    String.fromCharCode(97 + i)
  );
  const hasComplexLayout = layout.areas[0]?.includes(' ');

  const getPreviewStyle = (): React.CSSProperties => {
    if (!hasComplexLayout) {
      return {
        display: 'grid',
        gridTemplate: layout.gridTemplate,
        gap: '2px',
      };
    }

    const areaRows = layout.areas.join("' '");
    return {
      display: 'grid',
      gridTemplate: layout.gridTemplate,
      gridTemplateAreas: `'${areaRows}'`,
      gap: '2px',
    };
  };

  return (
    <div className="w-full h-full" style={getPreviewStyle()}>
      {cellIds.map((cellId) => (
        <div
          key={cellId}
          className="bg-muted-foreground/30 rounded-sm"
          style={{
            gridArea: hasComplexLayout ? cellId : undefined,
          }}
        />
      ))}
    </div>
  );
};

export default CollageMakerScreen;
