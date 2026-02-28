import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const renderPageToImage = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  scale = 2
): Promise<{ base64: string; width: number; height: number }> => {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context oluşturulamadı.');

  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  // Get pure base64 (no data: prefix)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.split(',')[1];
  return { base64, width: viewport.width, height: viewport.height };
};

export const convertPdfToWord = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  const images: { base64: string; cid: string; ptW: number; ptH: number }[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const { base64, width, height } = await renderPageToImage(pdf, i);
    images.push({
      base64,
      cid: `page${i}@pdf`,
      ptW: Math.round(width / 2),
      ptH: Math.round(height / 2),
    });
  }

  const boundary = '----=_NextPart_WordDoc';

  const htmlBody = images
    .map(
      (img) =>
        `<div style="page-break-after:always;margin:0;padding:0;text-align:center;">` +
        `<img src="cid:${img.cid}" width="${img.ptW}" height="${img.ptH}" />` +
        `</div>`
    )
    .join('\n');

  const htmlPart = `Content-Type: text/html; charset="utf-8"\nContent-Transfer-Encoding: quoted-printable\n\n` +
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"/>` +
    `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->` +
    `<style>@page{margin:0;}body{margin:0;padding:0;}</style></head>` +
    `<body>${htmlBody}</body></html>`;

  const imageParts = images
    .map(
      (img) =>
        `--${boundary}\n` +
        `Content-Type: image/jpeg\n` +
        `Content-Transfer-Encoding: base64\n` +
        `Content-ID: <${img.cid}>\n\n` +
        img.base64
    )
    .join('\n');

  const mhtml =
    `MIME-Version: 1.0\n` +
    `Content-Type: multipart/related; boundary="${boundary}"\n\n` +
    `--${boundary}\n` +
    htmlPart +
    `\n${imageParts}\n` +
    `--${boundary}--`;

  return new Blob([mhtml], { type: 'application/msword' });
};
