import * as XLSX from 'xlsx';

export const convertExcelToWord = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });

  if (!workbook.SheetNames.length) {
    throw new Error('No data found in the Excel file.');
  }

  const sheetHtmlParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const html = XLSX.utils.sheet_to_html(sheet, { editable: false });

    sheetHtmlParts.push(
      `<h2 style="font-family:Calibri;font-size:14pt;margin:16px 0 8px;">${sheetName}</h2>${html}`
    );
  }

  if (!sheetHtmlParts.length) {
    throw new Error('No data found in the Excel file.');
  }

  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
</w:WordDocument>
</xml>
<![endif]-->
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #999; padding: 4px 6px; font-size: 11pt; }
</style>
</head>
<body>
${sheetHtmlParts.join('<br style="page-break-after:always">')}
</body>
</html>`;

  return new Blob(['\uFEFF' + fullHtml], { type: 'application/msword;charset=utf-8' });
};
