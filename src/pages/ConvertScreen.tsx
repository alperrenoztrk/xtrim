import { ChangeEvent, MouseEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  detectFormat,
  getAvailableTargets,
  convertFile,
  downloadBlob,
  sourceLabels,
  targetLabels,
  type SourceFormat,
  type TargetFormat,
} from '@/utils/fileConverter';

const ConvertScreen = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<SourceFormat | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const availableTargets = useMemo(
    () => (detectedFormat ? getAvailableTargets(detectedFormat) : []),
    [detectedFormat]
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      setDetectedFormat(null);
      setTargetFormat(null);
      return;
    }

    const format = detectFormat(file);
    if (!format) {
      toast.error('This file type is not supported.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setDetectedFormat(format);
    const targets = getAvailableTargets(format);
    setTargetFormat(targets[0] ?? null);
  };

  const handleFileInputClick = (e: MouseEvent<HTMLInputElement>) => {
    e.currentTarget.value = '';
  };

  const handleChooseFile = () => {
    document.getElementById('converter-file')?.click();
  };

  const handleConvert = async () => {
    if (!selectedFile || !detectedFormat || !targetFormat) {
      toast.error('Please select a file and choose a target format.');
      return;
    }

    setIsConverting(true);
    try {
      const { blob, filename } = await convertFile(selectedFile, detectedFormat, targetFormat);
      downloadBlob(blob, filename);
      toast.success('Conversion completed!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'An error occurred during conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>File Converter</CardTitle>
            <CardDescription>
              Upload your file, let the format be detected automatically, then choose a target format
              and convert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* File input */}
            <div className="space-y-2">
              <Label htmlFor="converter-file">
                <Upload className="inline h-4 w-4 mr-1 -mt-0.5" />
                Select a file
              </Label>
              <div className="flex items-center gap-3 rounded-md border border-input px-3 py-2">
                <Input
                  id="converter-file"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.log,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tiff,.tif,.ppt,.pptx"
                  onClick={handleFileInputClick}
                  onChange={handleFileChange}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleChooseFile}>
                  Choose file
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedFile?.name ?? 'No file selected'}
                </span>
              </div>
              {selectedFile && detectedFormat && (
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedFile.name}</strong> — Detected format:{' '}
                  <span className="font-semibold text-foreground">{sourceLabels[detectedFormat]}</span>
                </p>
              )}
            </div>

            {/* Target format selector */}
            {availableTargets.length > 0 && (
              <div className="space-y-2">
                <Label>Target format</Label>
                <div className="flex flex-wrap gap-2">
                  {availableTargets.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={targetFormat === t ? 'default' : 'outline'}
                      onClick={() => setTargetFormat(t)}
                    >
                      {targetLabels[t]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Convert button */}
            <Button
              onClick={handleConvert}
              disabled={!selectedFile || !targetFormat || isConverting}
              className="w-full"
              size="lg"
            >
              {isConverting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  {detectedFormat && targetFormat
                    ? `Convert ${sourceLabels[detectedFormat]} → ${targetLabels[targetFormat]}`
                    : 'Convert and download'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConvertScreen;
