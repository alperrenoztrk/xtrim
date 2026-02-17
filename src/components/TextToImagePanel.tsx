import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Image, Loader2, Download, Copy, Check, Edit, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AIToolsService } from '@/services/AIToolsService';
import { useToast } from '@/hooks/use-toast';

interface TextToImagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (imageUrl: string) => void;
  onEditInPhotoEditor?: (imageUrl: string) => void;
}

const stylePresets = [
  { id: 'realistic', name: 'Realistic', prompt: 'photorealistic, high quality, detailed' },
  { id: 'artistic', name: 'Artistic', prompt: 'artistic, painterly, creative' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant colors, japanese animation' },
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic, dramatic lighting, movie still' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist, clean, simple, modern' },
  { id: '3d', name: '3D Render', prompt: '3D render, octane render, high quality CGI' },
];

const aspectRatios = [
  { id: '1:1', name: '1:1', icon: '◻️' },
  { id: '16:9', name: '16:9', icon: '▬' },
  { id: '9:16', name: '9:16', icon: '▮' },
  { id: '4:3', name: '4:3', icon: '▭' },
];

const readyTemplates = [
  {
    id: 'comic-trend',
    name: 'Cartoon Trend',
    style: 'artistic',
    prompt: 'Turn this portrait into a colorful trendy cartoon character, playful details, vibrant style',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'petal',
    name: 'Petals',
    style: 'artistic',
    prompt: 'Create a dreamy portrait made of soft flower petals, pastel palette, delicate skin texture',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'gold',
    name: 'Gold',
    style: 'cinematic',
    prompt: 'Luxury gold statue portrait with rich reflections, elegant clothing, dramatic shadows',
    image:
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'pastel',
    name: 'Pastel Painting',
    style: 'anime',
    prompt: 'Cute pastel hand-drawn illustration, warm cozy atmosphere, soft textured paper style',
    image:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'kawaii-neon',
    name: 'Kawaii Neon',
    style: 'anime',
    prompt: 'Turn the portrait into a kawaii neon pop-art character, candy colors, glossy stickers, playful sparkles',
    image:
      'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'cloud-princess',
    name: 'Cloud Princess',
    style: 'artistic',
    prompt: 'Create a dreamy cloud princess portrait with fluffy textures, iridescent makeup, floating stars and moonlight',
    image:
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'miniature-planet',
    name: 'Mini Planet',
    style: '3d',
    prompt: 'Place the person on a tiny fantasy planet, miniature world effect, surreal details, cinematic depth',
    image:
      'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'jelly-sculpture',
    name: 'Jelly Sculpture',
    style: '3d',
    prompt: 'Transform into a translucent jelly sculpture, colorful refractions, soft studio lighting, surreal glossy texture',
    image:
      'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'origami-hero',
    name: 'Origami Hero',
    style: 'minimalist',
    prompt: 'Recreate portrait as an origami hero, folded paper geometry, clean background, imaginative handcrafted look',
    image:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'toy-box-adventure',
    name: 'Toy Box Adventure',
    style: 'cinematic',
    prompt: 'Convert into a tiny toy-box adventurer with oversized objects, cinematic storytelling, whimsical composition',
    image:
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'butterfly-guardian',
    name: 'Butterfly Guardian',
    style: 'artistic',
    prompt: 'Create an enchanted butterfly guardian portrait, iridescent wings, magical forest glow, elegant fantasy armor',
    image:
      'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'pixel-dream',
    name: 'Pixel Dream',
    style: 'anime',
    prompt: 'Turn the person into a retro pixel-art game hero, bright 8-bit palette, expressive sprite style, cute vibe',
    image:
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'stardust-chef',
    name: 'Stardust Chef',
    style: 'cinematic',
    prompt: 'Create a cosmic pastry chef portrait, galaxy kitchen, glowing desserts, whimsical cinematic lighting',
    image:
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'crystal-queen',
    name: 'Crystal Queen',
    style: 'realistic',
    prompt: 'Design a crystal queen portrait with transparent gemstones, icy elegance, high-detail beauty photography',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mushroom-village',
    name: 'Mushroom Village Tale',
    style: 'artistic',
    prompt: 'Imagine a whimsical portrait in a mushroom village, fairy lanterns, soft storybook style, cozy fantasy details',
    image:
      'https://images.unsplash.com/photo-1470163395405-d2b80e7450ed?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'underwater-popstar',
    name: 'Underwater Popstar',
    style: 'cinematic',
    prompt: 'Create an underwater popstar portrait, bioluminescent coral stage, flowing hair, vibrant music video mood',
    image:
      'https://images.unsplash.com/photo-1518544866330-95a2c9db48dd?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'cat-cafe-witch',
    name: 'Cat Cafe Witch',
    style: 'anime',
    prompt: 'Turn into a cute cat-cafe witch character, cozy magical interior, warm tones, charming whimsical details',
    image:
      'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'paper-cut-museum',
    name: 'Paper Cut Museum',
    style: 'minimalist',
    prompt: 'Stylize portrait as layered paper-cut museum artwork, depth shadows, refined color harmony, gallery aesthetic',
    image:
      'https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'dreamy-balloon-rider',
    name: 'Dream Balloon Rider',
    style: 'artistic',
    prompt: 'Create a surreal hot-air-balloon rider portrait above candy clouds, pastel fantasy palette, joyful cinematic scene',
    image:
      'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'retro-magazine',
    name: 'Retro Cover Star',
    style: 'realistic',
    prompt: 'Generate a retro 80s magazine cover portrait, bold styling, analog grain, iconic fashion editorial look',
    image:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=500&q=80',
  },
];

const discoverPrompts = [
  {
    id: 'future-partner',
    title: 'What does my future partner look like?',
    prompt: 'Create a realistic portrait of a future partner with warm smile, natural look, lifestyle photo',
    image:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'emperor-version',
    title: 'My emperor version',
    prompt: 'Turn this person into an emperor portrait with royal outfit, cinematic lighting, epic atmosphere',
    image:
      'https://images.unsplash.com/photo-1615818499660-30bb5816e1c7?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 'pet-human',
    title: 'Interpret my pet as a human',
    prompt: 'Transform my pet into a human portrait while keeping personality traits, detailed and realistic',
    image:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=200&q=80',
  },
];

const TextToImagePanel = ({ isOpen, onClose, onImageGenerated, onEditInPhotoEditor }: TextToImagePanelProps) => {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateSelect = (template: (typeof readyTemplates)[number]) => {
    setSelectedTemplateId(template.id);
    setPrompt(template.prompt);
    setSelectedStyle(template.style);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setUploadedImageBase64(result);
        setUploadedImagePreview(result);
        toast({
          title: 'Photo uploaded',
          description: 'Now you can choose a template and blend the image.',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a description',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const style = stylePresets.find(s => s.id === selectedStyle);
      const fullPrompt = `${prompt}. ${style?.prompt || ''}`;

      const generationType = uploadedImageBase64 ? 'avatar' : 'text-to-image';

      const result = await AIToolsService.generateImage(
        generationType,
        fullPrompt,
        uploadedImageBase64 ?? undefined,
        { style: selectedStyle, aspectRatio: selectedRatio }
      );

      if (result.success && result.imageUrl) {
        setGeneratedImage(result.imageUrl);
        toast({
          title: 'Success',
          description: 'Image created!',
        });
        onImageGenerated?.(result.imageUrl);
      } else {
        throw new Error(result.error || 'Image could not be created');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while creating the image',
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
        title: 'Downloaded',
        description: 'Image downloaded',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Download failed',
        variant: 'destructive',
      });
    }
  };

  const handleEditInPhotoEditor = () => {
    if (!generatedImage) return;
    onEditInPhotoEditor?.(generatedImage);
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
        title: 'Copied',
        description: 'Image copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Copy failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 bg-background flex flex-col h-full"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Create Image from Text</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content - Scrollable Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-28 space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="Describe the image you want to create in detail... e.g.: A woman walking by the sea at sunset"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                The more detailed your description, the better the result.
              </p>
            </div>

            {/* Style Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Style</label>
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

            {/* Ready Templates */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Add photo</p>
                    <p className="text-xs text-muted-foreground">
                      Upload your own photo and blend it with the template you choose.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {uploadedImagePreview && (
                  <img
                    src={uploadedImagePreview}
                    alt="Uploaded"
                    className="mt-3 h-24 w-24 rounded-xl object-cover border border-border"
                  />
                )}
              </div>

              <label className="text-sm font-medium text-foreground">Try a style on the image</label>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {readyTemplates.map((template) => (
                  <motion.button
                    key={template.id}
                    className={`min-w-[120px] space-y-2 text-left rounded-2xl p-1 transition-colors ${
                      selectedTemplateId === template.id ? 'bg-primary/10' : ''
                    }`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={isGenerating}
                  >
                    <img
                      src={template.image}
                      alt={template.name}
                      className="w-[120px] h-[160px] object-cover rounded-2xl border border-border"
                    />
                    <p className="text-sm text-center text-muted-foreground leading-tight">{template.name}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Discover Prompts */}
            {!generatedImage && !isGenerating && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Discover something new</label>
                <div className="space-y-2">
                  {discoverPrompts.map((item) => (
                    <motion.button
                      key={item.id}
                      className="w-full p-2 rounded-xl bg-muted/30 hover:bg-muted/50 text-left transition-colors flex items-center gap-3"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPrompt(item.prompt)}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-14 h-14 rounded-xl object-cover border border-border"
                      />
                      <p className="text-base text-foreground">{item.title}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
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
                <label className="text-sm font-medium text-foreground">Result</label>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/30 border border-border">
                  {isGenerating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Creating image...</p>
                    </div>
                  ) : generatedImage ? (
                    <>
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-primary to-accent text-primary-foreground"
                          onClick={handleEditInPhotoEditor}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <div className="flex gap-2">
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
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Example Prompts */}
            {!generatedImage && !isGenerating && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Example Prompts</label>
                <div className="space-y-2">
                  {[
                    'A wooden cabin among snowy mountains, night sky and northern lights',
                    'A futuristic city lit with neon lights, rainy night',
                    'An ancient temple surrounded by pastel-colored flowers',
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

          {/* Bottom Button - Fixed */}
          <div className="flex-shrink-0 p-4 bg-gradient-to-t from-background via-background to-transparent border-t border-border/50">
            <Button
              className="w-full h-14 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Image className="h-5 w-5 mr-2" />
                  Generate Image
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
