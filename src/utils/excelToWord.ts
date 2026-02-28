import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx';

export const convertExcelToWord = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sections: { children: (Paragraph | Table)[] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as string[][];

    if (!rows.length) continue;

    // Determine column count from the widest row
    const colCount = Math.max(...rows.map((r) => r.length));

    const defaultBorder = {
      style: BorderStyle.SINGLE,
      size: 1,
      color: '999999',
    };
    const borders = {
      top: defaultBorder,
      bottom: defaultBorder,
      left: defaultBorder,
      right: defaultBorder,
    };

    const tableRows = rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: Array.from({ length: colCount }, (_, ci) => {
            const cellText = String(row[ci] ?? '');
            const isHeader = rowIndex === 0;
            return new TableCell({
              borders,
              width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText,
                      bold: isHeader,
                      size: 20, // 10pt
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            });
          }),
        })
    );

    const children: (Paragraph | Table)[] = [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: sheetName, bold: true, size: 28, font: 'Calibri' }),
        ],
      }),
      new Table({ rows: tableRows }),
    ];

    sections.push({ children });
  }

  if (!sections.length) {
    throw new Error('Excel dosyasında veri bulunamadı.');
  }

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
};
