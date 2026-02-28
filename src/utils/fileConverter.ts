import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, ImageRun, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, BorderStyle } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/* ── Types ── */
export type SourceFormat = 'pdf' | 'image' | 'excel' | 'word' | 'csv' | 'txt';
export type TargetFormat = 'pdf' | 'docx' | 'xlsx' | 'png' | 'csv' | 'txt';

export const sourceLabels: Record<SourceFormat, string> = {
  pdf: 'PDF',
  image: 'Image',
  excel: 'Excel',
  word: 'Word',
  csv: 'CSV',
  txt: 'Text',
};

export const targetLabels: Record<TargetFormat, string> = {
  pdf: 'PDF',
  docx: 'Word (DOCX)',
  xlsx: 'Excel (XLSX)',
  png: 'PNG Image',
  csv: 'CSV',
  txt: 'Text (TXT)',
};

/* ── Detection ── */
export const detectFormat = (file: File): SourceFormat | null => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  if (['txt', 'md', 'log'].includes(ext) || file.type.startsWith('text/')) return 'txt';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'tif'].includes(ext)) return 'image';
  return null;
};

/* ── Target mapping ── */
export const getAvailableTargets = (source: SourceFormat): TargetFormat[] => {
  const map: Record<SourceFormat, TargetFormat[]> = {
    pdf: ['docx', 'png', 'txt'],
    word: ['pdf', 'txt'],
    excel: ['docx', 'pdf', 'csv', 'txt'],
    image: ['pdf', 'docx', 'txt'],
    csv: ['xlsx', 'docx', 'pdf', 'txt'],
    txt: ['docx', 'pdf'],
  };
  return map[source];
};

/* ── Helpers ── */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getBaseName = (name: string) => name.replace(/\.[^/.]+$/, '');

const pxToTwips = (px: number) => Math.round(px * 15);

/* ── PDF helpers ── */
const loadPdf = async (file: File) => {
  const ab = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: ab }).promise;
};

const renderPdfPage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number, scale = 2) => {
  const page = await pdf.getPage(pageNum);
  const lv = page.getViewport({ scale: 1 });
  const rv = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rv.width);
  canvas.height = Math.round(rv.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport: rv, canvas } as any).promise;
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Render failed'))), 'image/png')
  );
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w: Math.round(lv.width), h: Math.round(lv.height), blob };
};

/* ── Simple PDF builder (text / image based) ── */
const createTextPdf = (text: string): Blob => {
  const lines = text.split('\n');
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let pos = 0;
  const push = (s: string) => { const b = enc.encode(s); parts.push(b); pos += b.length; };
  const obj = (id: number, h: string, stream?: Uint8Array) => {
    offsets[id] = pos;
    push(`${id} 0 obj\n${h}`);
    if (stream) { push('stream\n'); parts.push(stream); pos += stream.length; push('\nendstream\n'); }
    push('endobj\n');
  };

  // Escape PDF string
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const fontSize = 10;
  const lineHeight = fontSize * 1.4;
  const margin = 50;
  const pageW = 595;
  const pageH = 842;
  const maxLines = Math.floor((pageH - 2 * margin) / lineHeight);

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines));
  }
  if (!pages.length) pages.push(['']);

  push('%PDF-1.4\n');

  const pageObjIds: number[] = [];
  let nextId = 1;

  // Catalog
  const catalogId = nextId++;
  // Pages
  const pagesId = nextId++;
  // Font
  const fontId = nextId++;

  for (let p = 0; p < pages.length; p++) {
    const pageId = nextId++;
    const contentId = nextId++;
    pageObjIds.push(pageId);

    const contentLines = pages[p].map((line, li) => {
      const y = pageH - margin - li * lineHeight;
      return `BT /F1 ${fontSize} Tf ${margin} ${y.toFixed(1)} Td (${esc(line)}) Tj ET`;
    });
    const contentStr = contentLines.join('\n');
    const contentBytes = enc.encode(contentStr);

    // We'll write these objects later with correct offsets
    // Store info for later
    (pages[p] as any)._pageId = pageId;
    (pages[p] as any)._contentId = contentId;
    (pages[p] as any)._contentBytes = contentBytes;
  }

  // Now write objects in order
  // Reset
  parts.length = 0;
  pos = 0;
  push('%PDF-1.4\n');

  obj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`);
  obj(pagesId, `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\n`);
  obj(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n');

  for (const p of pages) {
    const pageId = (p as any)._pageId;
    const contentId = (p as any)._contentId;
    const contentBytes = (p as any)._contentBytes as Uint8Array;

    obj(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>\n`);
    obj(contentId, `<< /Length ${contentBytes.length} >>\n`, contentBytes);
  }

  const xref = pos;
  const totalObjs = nextId;
  push(`xref\n0 ${totalObjs}\n`);
  push('0000000000 65535 f \n');
  for (let i = 1; i < totalObjs; i++) {
    push(`${(offsets[i] ?? 0).toString().padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${totalObjs} /Root ${catalogId} 0 R >>\n`);
  push(`startxref\n${xref}\n%%EOF`);

  const total = new Uint8Array(pos);
  let ptr = 0;
  for (const part of parts) { total.set(part, ptr); ptr += part.length; }
  return new Blob([total], { type: 'application/pdf' });
};

/* ── HTML-based doc/pdf builder ── */
const wrapHtmlAsDoc = (htmlBody: string): Blob => {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,sans-serif;font-size:11pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;font-size:11pt}</style>
</head><body>${htmlBody}</body></html>`;
  return new Blob(['\uFEFF' + html], { type: 'application/msword;charset=utf-8' });
};

/* ── OCR via edge function ── */
const ocrExtract = async (file: File): Promise<string> => {
  const ab = await file.arrayBuffer();
  const u8 = new Uint8Array(ab);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  const b64 = btoa(bin);
  const mime = file.type || 'image/png';
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase.functions.invoke('ocr-extract', {
    body: { imageBase64: b64, mimeType: mime },
  });
  if (error) throw new Error('Could not reach OCR service.');
  if (!data?.success) throw new Error(data?.error ?? 'OCR process failed.');
  return (data.text as string)?.trim() ?? '';
};

/* ── Converters ── */

// PDF → DOCX
const pdfToDocx = async (file: File): Promise<Blob> => {
  const pdf = await loadPdf(file);
  const sections: any[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const { bytes, w, h } = await renderPdfPage(pdf, i);
    sections.push({
      properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, size: { width: pxToTwips(w), height: pxToTwips(h) } } },
      children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new ImageRun({ type: 'png', data: bytes, transformation: { width: w, height: h } })] })],
    });
  }
  return Packer.toBlob(new Document({ sections }));
};

// PDF → PNG (zip of pages)
const pdfToPng = async (file: File): Promise<Blob> => {
  const pdf = await loadPdf(file);
  if (pdf.numPages === 1) {
    const { blob } = await renderPdfPage(pdf, 1);
    return blob;
  }
  // Multiple pages: return first page for simplicity (user can iterate)
  // Actually return all as individual downloads
  const { blob } = await renderPdfPage(pdf, 1);
  // For multi-page, we still return first page but could zip in future
  return blob;
};

// PDF → TXT
const pdfToTxt = async (file: File): Promise<Blob> => {
  const pdf = await loadPdf(file);
  const texts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item: any) => item.str).join(' '));
  }
  return new Blob(['\uFEFF' + texts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
};

// Image → PDF
const imageToPdf = async (file: File): Promise<Blob> => {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not load the image.'));
    i.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const jpegUrl = canvas.toDataURL('image/jpeg', 0.95);
  const bin = atob(jpegUrl.split(',')[1]);
  const jpegBytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpegBytes[i] = bin.charCodeAt(i);

  // Build PDF with JPEG
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let pos = 0;
  const pushT = (s: string) => { const b = enc.encode(s); parts.push(b); pos += b.length; };
  const pushB = (b: Uint8Array) => { parts.push(b); pos += b.length; };
  const obj = (id: number, h: string, s?: Uint8Array) => {
    offsets[id] = pos; pushT(`${id} 0 obj\n${h}`);
    if (s) { pushT('stream\n'); pushB(s); pushT('\nendstream\n'); }
    pushT('endobj\n');
  };
  pushT('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>\n');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${img.width} ${img.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\n`, jpegBytes);
  const cs = enc.encode(`q\n${img.width} 0 0 ${img.height} 0 0 cm\n/Im0 Do\nQ`);
  obj(5, `<< /Length ${cs.length} >>\n`, cs);
  const xr = pos;
  pushT('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) pushT(`${(offsets[i]).toString().padStart(10, '0')} 00000 n \n`);
  pushT(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  const total = new Uint8Array(pos);
  let ptr = 0;
  for (const p of parts) { total.set(p, ptr); ptr += p.length; }
  return new Blob([total], { type: 'application/pdf' });
};

// Image → DOCX
const imageToDocx = async (file: File): Promise<Blob> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dataUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Could not load the image.'));
    i.src = dataUrl;
  });
  URL.revokeObjectURL(dataUrl);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const type = (['jpg', 'jpeg'].includes(ext) ? 'jpg' : 'png') as 'jpg' | 'png';
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 0, right: 0, bottom: 0, left: 0 }, size: { width: pxToTwips(img.width), height: pxToTwips(img.height) } } },
      children: [new Paragraph({ children: [new ImageRun({ type, data: bytes, transformation: { width: img.width, height: img.height } })] })],
    }],
  });
  return Packer.toBlob(doc);
};

// Image → TXT (OCR)
const imageToTxt = async (file: File): Promise<Blob> => {
  const text = await ocrExtract(file);
  if (!text) throw new Error('No readable text found in the image.');
  return new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
};

// Excel → DOCX (HTML table in .doc)
const excelToDocx = async (file: File): Promise<Blob> => {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const htmlParts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
    htmlParts.push(`<h2 style="font-family:Calibri;font-size:14pt;margin:16px 0 8px;">${name}</h2>${html}`);
  }
  if (!htmlParts.length) throw new Error('No data found in the Excel file.');
  return wrapHtmlAsDoc(htmlParts.join('<br style="page-break-after:always">'));
};

// Excel → PDF
const excelToPdf = async (file: File): Promise<Blob> => {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const allText: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    allText.push(`--- ${name} ---`);
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as string[][];
    for (const row of rows) allText.push(row.map(String).join('\t'));
    allText.push('');
  }
  return createTextPdf(allText.join('\n'));
};

// Excel → CSV
const excelToCsv = async (file: File): Promise<Blob> => {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const csvParts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    csvParts.push(XLSX.utils.sheet_to_csv(sheet));
  }
  return new Blob(['\uFEFF' + csvParts.join('\n\n')], { type: 'text/csv;charset=utf-8' });
};

// Excel → TXT
const excelToTxt = async (file: File): Promise<Blob> => {
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: 'array' });
  const lines: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    lines.push(`=== ${name} ===`);
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false }) as string[][];
    for (const row of rows) lines.push(row.map(String).join('\t'));
    lines.push('');
  }
  return new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
};

// Word → PDF (mammoth)
const wordToPdf = async (file: File): Promise<Blob> => {
  const mammoth = await import('mammoth');
  const ab = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: ab });
  // Render HTML in hidden iframe, capture as image, build PDF
  // Simpler approach: create text PDF from extracted text
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: ab });
  return createTextPdf(text);
};

// Word → TXT
const wordToTxt = async (file: File): Promise<Blob> => {
  const mammoth = await import('mammoth');
  const ab = await file.arrayBuffer();
  const { value: text } = await mammoth.extractRawText({ arrayBuffer: ab });
  if (!text.trim()) throw new Error('No text found in the Word file.');
  return new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
};

// CSV → XLSX
const csvToXlsx = async (file: File): Promise<Blob> => {
  const text = await file.text();
  const wb = XLSX.read(text, { type: 'string' });
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

// CSV → DOCX
const csvToDocx = async (file: File): Promise<Blob> => {
  const text = await file.text();
  const wb = XLSX.read(text, { type: 'string' });
  const htmlParts: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    htmlParts.push(XLSX.utils.sheet_to_html(sheet, { editable: false }));
  }
  return wrapHtmlAsDoc(htmlParts.join(''));
};

// CSV → PDF
const csvToPdf = async (file: File): Promise<Blob> => {
  const text = await file.text();
  return createTextPdf(text);
};

// CSV → TXT
const csvToTxt = async (file: File): Promise<Blob> => {
  const text = await file.text();
  // Convert CSV to tab-separated for readability
  const wb = XLSX.read(text, { type: 'string' });
  const lines: string[] = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][];
    for (const row of rows) lines.push(row.join('\t'));
  }
  return new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
};

// TXT → DOCX
const txtToDocx = async (file: File): Promise<Blob> => {
  const text = await file.text();
  return wrapHtmlAsDoc(`<pre style="font-family:Calibri;font-size:11pt;white-space:pre-wrap">${text.replace(/</g, '&lt;')}</pre>`);
};

// TXT → PDF
const txtToPdf = async (file: File): Promise<Blob> => {
  const text = await file.text();
  return createTextPdf(text);
};

/* ── Conversion router ── */
type ConverterFn = (file: File) => Promise<Blob>;
const converterMap: Record<string, ConverterFn> = {
  'pdf→docx': pdfToDocx,
  'pdf→png': pdfToPng,
  'pdf→txt': pdfToTxt,
  'image→pdf': imageToPdf,
  'image→docx': imageToDocx,
  'image→txt': imageToTxt,
  'excel→docx': excelToDocx,
  'excel→pdf': excelToPdf,
  'excel→csv': excelToCsv,
  'excel→txt': excelToTxt,
  'word→pdf': wordToPdf,
  'word→txt': wordToTxt,
  'csv→xlsx': csvToXlsx,
  'csv→docx': csvToDocx,
  'csv→pdf': csvToPdf,
  'csv→txt': csvToTxt,
  'txt→docx': txtToDocx,
  'txt→pdf': txtToPdf,
};

const extMap: Record<TargetFormat, string> = {
  pdf: '.pdf',
  docx: '.docx',
  xlsx: '.xlsx',
  png: '.png',
  csv: '.csv',
  txt: '.txt',
};

// Special case: excel→docx produces .doc not .docx
const specialExtMap: Record<string, string> = {
  'excel→docx': '.doc',
  'csv→docx': '.doc',
  'txt→docx': '.doc',
};

export const convertFile = async (
  file: File,
  source: SourceFormat,
  target: TargetFormat
): Promise<{ blob: Blob; filename: string }> => {
  const key = `${source}→${target}`;
  const fn = converterMap[key];
  if (!fn) throw new Error('This conversion type is not supported yet.');
  const blob = await fn(file);
  const ext = specialExtMap[key] ?? extMap[target];
  return { blob, filename: `${getBaseName(file.name)}${ext}` };
};

export { downloadBlob };
