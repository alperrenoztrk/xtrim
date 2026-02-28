import * as pdfjsLib from 'pdfjs-dist';
import { Document, ImageRun, Packer, Paragraph } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const pxToTwips = (px: number) => Math.round(px * 15);

const renderPdfPage = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  renderScale = 2
): Promise<{ imageBytes: Uint8Array; pageWidthPx: number; pageHeightPx: number }> => {
  const page = await pdf.getPage(pageNum);

  const layoutViewport = page.getViewport({ scale: 1 });
  const renderViewport = page.getViewport({ scale: renderScale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(renderViewport.width);
  canvas.height = Math.round(renderViewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create canvas context.');

  await page.render({ canvasContext: ctx, viewport: renderViewport, canvas } as any).promise;

  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to convert PDF page to image.'))),
      'image/png'
    );
  });

  const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());

  return {
    imageBytes,
    pageWidthPx: Math.round(layoutViewport.width),
    pageHeightPx: Math.round(layoutViewport.height),
  };
};

export const convertPdfToWord = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const sections: {
    properties: {
      page: {
        margin: { top: number; right: number; bottom: number; left: number };
        size: { width: number; height: number };
      };
    };
    children: Paragraph[];
  }[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const { imageBytes, pageWidthPx, pageHeightPx } = await renderPdfPage(pdf, i);

    sections.push({
      properties: {
        page: {
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          size: {
            width: pxToTwips(pageWidthPx),
            height: pxToTwips(pageHeightPx),
          },
        },
      },
      children: [
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              type: 'png',
              data: imageBytes,
              transformation: {
                width: pageWidthPx,
                height: pageHeightPx,
              },
            }),
          ],
        }),
      ],
    });
  }

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
};
