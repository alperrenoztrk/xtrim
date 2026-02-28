import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const renderPageToDataUrl = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 2
): Promise<{ dataUrl: string; width: number; height: number }> => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context oluşturulamadı.');

  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, width: viewport.width, height: viewport.height };
};

export const convertPdfToWord = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  const pages: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const { dataUrl, width, height } = await renderPageToDataUrl(pdf, i);
    // Convert pixel dimensions to points (roughly 72 DPI from our 2x scale ≈ 144 DPI render)
    const ptWidth = Math.round(width / 2); // back to 1x in points
    const ptHeight = Math.round(height / 2);

    pages.push(`
      <div style="page-break-after: always; text-align: center; margin: 0; padding: 0;">
        <img src="${dataUrl}" width="${ptWidth}" height="${ptHeight}" style="display: block; margin: 0 auto;" />
      </div>
    `);
  }

  const htmlDoc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page { margin: 0; }
        body { margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      ${pages.join('\n')}
    </body>
    </html>
  `;

  return new Blob(['\uFEFF' + htmlDoc], { type: 'application/msword;charset=utf-8' });
};
