import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Image, Loader2, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AIToolsService } from '@/services/AIToolsService';
import { useToast } from '@/hooks/use-toast';

interface TextToImagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageUrl: string) => void;
}

const stylePresets = [
  { id: 'realistic', name: 'Gerçekçi', prompt: 'photorealistic, high quality, detailed' },
  { id: 'artistic', name: 'Sanatsal', prompt: 'artistic, painterly, creative' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant colors, japanese animation' },
  { id: 'cinematic', name: 'Sinematik', prompt: 'cinematic, dramatic lighting, movie still' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist, clean, simple, modern' },
  { id: '3d', name: '3D Render', prompt: '3D render, octane render, high quality CGI' },
];

const aspectRatios = [
  { id: '1:1', name: '1:1', icon: '◻️' },
  { id: '16:9', name: '16:9', icon: '▬' },
  { id: '9:16', name: '9:16', icon: '▮' },
  { id: '4:3', name: '4:3', icon: '▭' },
];

const TextToImagePanel = ({ isOpen, onClose, onImageGenerated }: TextToImagePanelProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir açıklama girin',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const style = stylePresets.find(s => s.id === selectedStyle);
      const fullPrompt = `${prompt}. ${style?.prompt || ''}`;

      const result = await AIToolsService.generateImage(
        'text-to-image',
        fullPrompt,
        undefined,
        { style: selectedStyle, aspectRatio: selectedRatio }
      );

      if (result.success && result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        toast({
          title: 'Başarılı',
          description: 'Görsel oluşturuldu!',
        });
        onImageGenerated?.(result.imageUrl);
      } else {
        throw new Error(result.error || 'Görsel oluşturulamadı');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Görsel oluşturulurken bir hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'İndirildi',
        description: 'Görsel indirildi',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'İndirme başarısız oldu',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Kopyalandı',
        description: 'Görsel panoya kopyalandı',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Kopyalama başarısız oldu',
        variant: 'destructive',
      });
    }
  };

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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Metinden Resim Oluştur</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Açıklama</label>
              <Textarea
                placeholder="Oluşturmak istediğiniz görseli detaylı bir şekilde açıklayın... Örn: Gün batımında deniz kenarında yürüyen bir kadın"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Ne kadar detaylı açıklarsanız, sonuç o kadar iyi olur
              </p>
            </div>

            {/* Style Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Stil</label>
              <div className="grid grid-cols-3 gap-2">
                {stylePresets.map((style) => (
                  <motion.button
                    key={style.id}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedStyle === style.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedStyle(style.id)}
                    disabled={isGenerating}
                  >
                    <span className={`text-sm font-medium ${
                      selectedStyle === style.id ? 'text-primary' : 'text-foreground'
                    }`}>
                      {style.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">En Boy Oranı</label>
              <div className="flex gap-2">
                {aspectRatios.map((ratio) => (
                  <motion.button
                    key={ratio.id}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                      selectedRatio === ratio.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/30 hover:bg-muted/50'
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRatio(ratio.id)}
                    disabled={isGenerating}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{ratio.icon}</span>
                      <span className={`text-xs font-medium ${
                        selectedRatio === ratio.id ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {ratio.name}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Generated Image Preview */}
            {(generatedImage || isGenerating) && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Sonuç</label>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Görsel oluşturuluyor...</p>
                    </div>
                  ) : generatedImage ? (
                    <>
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={handleCopy}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-background/80 backdrop-blur-sm"
                          onClick={handleDownload}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Example Prompts */}
            {!generatedImage && !isGenerating && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Örnek Açıklamalar</label>
                <div className="space-y-2">
                  {[
                    'Karlı dağların arasında ahşap bir kulübe, gece gökyüzü ve kuzey ışıkları',
                    'Neon ışıklarla aydınlatılmış fütüristik bir şehir, yağmurlu gece',
                    'Pastel renklerde çiçeklerle çevrili antik bir tapınak',
                  ].map((example, index) => (
                    <motion.button
                      key={index}
                      className="w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 text-left transition-colors"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPrompt(example)}
                    >
                      <p className="text-sm text-muted-foreground">{example}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              className="w-full h-14 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <Image className="h-5 w-5 mr-2" />
                  Görsel Oluştur
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TextToImagePanel;
