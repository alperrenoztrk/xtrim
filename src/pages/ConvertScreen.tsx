import { ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileImage, FileSpreadsheet, FileText, FileType2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type ConverterType = 'png-to-pdf' | 'pdf-to-word' | 'excel-to-word' | 'image-to-text-ocr';

const converterConfig: Record<ConverterType, { accept: string; allowedExtensions: string[] }> = {
  'png-to-pdf': {
    accept: '.png,image/png',
    allowedExtensions: ['png'],
  },
  'pdf-to-word': {
    accept: '.pdf,application/pdf',
    allowedExtensions: ['pdf'],
  },
  'excel-to-word': {
    accept: '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    allowedExtensions: ['xls', 'xlsx'],
  },
  'image-to-text-ocr': {
    accept: '*/*',
    allowedExtensions: [],
  },
};

const getFileBaseName = (fileName: string) => fileName.replace(/\.[^/.]+$/, '');

const ocrApiCompatibleExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf', 'bmp', 'gif', 'tif', 'tiff']);

const mojibakeTurkishReplacements: Array<[string, string]> = [
  ['Ã§', 'ç'],
  ['Ã‡', 'Ç'],
  ['ÄŸ', 'ğ'],
  ['Äž', 'Ğ'],
  ['Ä±', 'ı'],
  ['Ä°', 'İ'],
  ['Ã¶', 'ö'],
  ['Ã–', 'Ö'],
  ['ÅŸ', 'ş'],
  ['Åž', 'Ş'],
  ['Ã¼', 'ü'],
  ['Ãœ', 'Ü'],
];

const normalizeTurkishOcrText = (text: string) => {
  let normalized = text.normalize('NFC').replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n').trim();

  for (const [broken, fixed] of mojibakeTurkishReplacements) {
    normalized = normalized.replaceAll(broken, fixed);
  }

  return normalized;
};

const createPdfFromJpeg = (jpegBytes: Uint8Array, width: number, height: number): Uint8Array => {
  const contentStream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;

  const objects: Uint8Array[] = [];
  const offsets: number[] = [0];
  let position = 0;

  const encoder = new TextEncoder();
  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    objects.push(bytes);
    position += bytes.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    objects.push(bytes);
    position += bytes.length;
  };

  pushText('%PDF-1.4\n');

  const appendObject = (id: number, header: string, stream?: Uint8Array) => {
    offsets[id] = position;
    pushText(`${id} 0 obj\n${header}`);
    if (stream) {
      pushText('stream\n');
      pushBytes(stream);
      pushText('\nendstream\n');
    }
    pushText('endobj\n');
  };

  appendObject(1, '<< /Type /Catalog /Pages 2 0 R >>\n');
  appendObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  appendObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`
  );
  appendObject(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\n`,
    jpegBytes
  );

  const contentBytes = encoder.encode(contentStream);
  appendObject(5, `<< /Length ${contentBytes.length} >>\n`, contentBytes);

  const xrefStart = position;
  pushText('xref\n0 6\n');
  pushText('0000000000 65535 f \n');
  for (let i = 1; i <= 5; i += 1) {
    pushText(`${offsets[i].toString().padStart(10, '0')} 00000 n \n`);
  }
  pushText('trailer\n<< /Size 6 /Root 1 0 R >>\n');
  pushText(`startxref\n${xrefStart}\n%%EOF`);

  const total = new Uint8Array(position);
  let pointer = 0;
  for (const part of objects) {
    total.set(part, pointer);
    pointer += part.length;
  }
  return total;
};

const convertPngToPdf = async (file: File) => {
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('PNG dosyası okunamadı.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('PNG görseli yüklenemedi.'));
    img.src = imageDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context oluşturulamadı.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = jpegDataUrl.split(',')[1];
  const binary = atob(base64);
  const jpegBytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    jpegBytes[i] = binary.charCodeAt(i);
  }

  const pdfBytes = createPdfFromJpeg(jpegBytes, image.width, image.height);
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const extractTextWithOcrApi = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', 'tur');
  formData.append('isOverlayRequired', 'false');
  formData.append('OCREngine', '2');
  formData.append('scale', 'true');

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: 'helloworld',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('OCR servisine ulaşılamadı.');
  }

  const result = (await response.json()) as {
    IsErroredOnProcessing?: boolean;
    ErrorMessage?: string[];
    ParsedResults?: Array<{ ParsedText?: string }>;
  };

  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.[0] ?? 'OCR işlemi başarısız oldu.');
  }

  const parsedText = result.ParsedResults?.map((item) => item.ParsedText ?? '').join('\n').trim() ?? '';

  return normalizeTurkishOcrText(parsedText);
};

const ConvertScreen = () => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<ConverterType>('png-to-pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const acceptedFileType = useMemo(() => {
    return converterConfig[activeType].accept;
  }, [activeType]);

  const handleTypeChange = (type: ConverterType) => {
    setActiveType(type);
    setSelectedFile(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const allowedExtensions = converterConfig[activeType].allowedExtensions;
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      toast.error('Seçilen dosya, aktif dönüştürme türüyle uyumlu değil.');
      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast.error('Lütfen önce dosya seçin.');
      return;
    }

    setIsConverting(true);

    try {
      if (activeType === 'png-to-pdf') {
        const pdfBlob = await convertPngToPdf(selectedFile);
        downloadBlob(pdfBlob, `${getFileBaseName(selectedFile.name)}.pdf`);
        toast.success('PNG başarıyla PDF dosyasına dönüştürüldü.');
        return;
      }

      if (activeType === 'image-to-text-ocr') {
        const extension = selectedFile.name.split('.').pop()?.toLowerCase() ?? '';

        const extractedText = ocrApiCompatibleExtensions.has(extension)
          ? await extractTextWithOcrApi(selectedFile)
          : (await selectedFile.text()).trim();

        if (!extractedText) {
          toast.warning('Dosyada okunabilir metin bulunamadı.');
          return;
        }

        const textBlob = new Blob(['\uFEFF', extractedText], { type: 'text/plain;charset=utf-8' });
        downloadBlob(textBlob, `${getFileBaseName(selectedFile.name)}-ocr.txt`);
        toast.success('OCR tamamlandı. Metin dosyası indirildi.');
        return;
      }

      const fileText = await selectedFile.text();
      const readableChunks = (fileText.match(/[\p{L}\p{N}][\p{L}\p{N}\s,.;:!?()\-]{3,}/gu) ?? [])
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 500);

      if (activeType === 'pdf-to-word') {
        const htmlDoc = `
          <html>
            <head><meta charset="utf-8" /></head>
            <body>
              <h2>PDF → Word Sonucu</h2>
              <p>Kaynak dosya: ${selectedFile.name}</p>
              <p>Bulunan metin parçaları:</p>
              ${readableChunks.length ? `<p>${readableChunks.join(' ').replace(/</g, '&lt;')}</p>` : '<p>Metin bulunamadı.</p>'}
            </body>
          </html>
        `;

        const wordBlob = new Blob([htmlDoc], { type: 'application/msword;charset=utf-8' });
        downloadBlob(wordBlob, `${getFileBaseName(selectedFile.name)}.doc`);
        toast.success('PDF dosyası Word formatına aktarıldı.');
        return;
      }

      const htmlDoc = `
        <html>
          <head><meta charset="utf-8" /></head>
          <body>
            <h2>Excel → Word Sonucu</h2>
            <p>Kaynak dosya: ${selectedFile.name}</p>
            <p>Bulunan metin parçaları:</p>
            ${readableChunks.length ? `<p>${readableChunks.join(' ').replace(/</g, '&lt;')}</p>` : '<p>Tablo metni bulunamadı.</p>'}
          </body>
        </html>
      `;

      const wordBlob = new Blob([htmlDoc], { type: 'application/msword;charset=utf-8' });
      downloadBlob(wordBlob, `${getFileBaseName(selectedFile.name)}.doc`);
      toast.success('Excel dosyası Word formatına aktarıldı.');
    } catch (error) {
      console.error(error);
      toast.error('Dönüştürme sırasında bir hata oluştu.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/home')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Anasayfaya dön
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Dosya Dönüştürücü</CardTitle>
            <CardDescription>
              PNG → PDF, PDF → Word, Excel → Word ve OCR ile tüm dosyalardan metin çıkarmayı tek sayfadan yapın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button variant={activeType === 'png-to-pdf' ? 'default' : 'outline'} onClick={() => handleTypeChange('png-to-pdf')}>
                <FileType2 className="mr-2 h-4 w-4" /> PNG → PDF
              </Button>
              <Button variant={activeType === 'pdf-to-word' ? 'default' : 'outline'} onClick={() => handleTypeChange('pdf-to-word')}>
                <FileText className="mr-2 h-4 w-4" /> PDF → Word
              </Button>
              <Button variant={activeType === 'excel-to-word' ? 'default' : 'outline'} onClick={() => handleTypeChange('excel-to-word')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel → Word
              </Button>
              <Button variant={activeType === 'image-to-text-ocr' ? 'default' : 'outline'} onClick={() => handleTypeChange('image-to-text-ocr')}>
                <FileImage className="mr-2 h-4 w-4" /> Dosya → OCR
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="converter-file">Dosya seçin</Label>
              <Input key={activeType} id="converter-file" type="file" accept={acceptedFileType} onChange={handleFileChange} />
              {selectedFile && <p className="text-sm text-muted-foreground">Seçilen dosya: {selectedFile.name}</p>}
            </div>

            <Button onClick={handleConvert} disabled={!selectedFile || isConverting} className="w-full md:w-auto">
              {isConverting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isConverting ? 'Dönüştürülüyor...' : 'Dönüştür ve indir'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConvertScreen;
