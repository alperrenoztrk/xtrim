

## Plan: Absolute Visual Fidelity for All Conversions

### Problem
Several converters lose formatting:
- `excelToDocx`, `csvToDocx`, `txtToDocx` use HTML-wrapped `.doc` files which render differently across Word versions
- Text extraction paths (`*ToTxt`) strip all visual formatting
- Missing conversion paths (e.g. Word→PNG, Excel→PNG)

### Approach
Every conversion will use a **"render as image, embed in target"** pipeline:

1. **Source → high-res canvas** (via `html2canvas` or `pdfjs-dist`)
2. **Canvas → target format** (embed image into PDF/DOCX/PNG)

For text-based outputs (TXT/CSV), text extraction is unavoidable since those formats cannot carry visual data -- these will remain as-is.

### Changes to `src/utils/fileConverter.ts`

**1. Fix `excelToDocx`, `csvToDocx`, `txtToDocx`** -- Replace `wrapHtmlAsDoc` (lossy HTML `.doc`) with the same image-in-DOCX approach used by `pdfToDocx`:
- Render HTML content via `html2canvas` at 2x scale
- Slice into pages
- Embed each page as a PNG `ImageRun` inside a native `.docx` Document
- Remove `specialExtMap` entries (all produce real `.docx` now)

**2. Add new helper: `htmlToImageDocx`** -- Mirrors `htmlToImagePdf` but outputs a `.docx` with embedded page images instead of a PDF.

**3. Add missing image output paths:**
- `word→png`: mammoth HTML → html2canvas → PNG
- `excel→png`: sheet HTML → html2canvas → PNG  
- `csv→png`: parsed HTML → html2canvas → PNG
- `txt→png`: pre-formatted HTML → html2canvas → PNG

**4. Expand `getAvailableTargets`** to include `png` for word, excel, csv, txt sources.

**5. Remove `wrapHtmlAsDoc`** helper entirely (no longer used).

**6. Remove `specialExtMap`** since all DOCX targets now produce real `.docx`.

### Summary of conversion strategy per target

| Target | Method |
|--------|--------|
| PDF | Render as image slices, embed JPEG in hand-built PDF |
| DOCX | Render as image slices, embed PNG via `docx` library |
| PNG | Render as single high-res canvas, export as PNG |
| XLSX | Data-level conversion (XLSX lib) |
| CSV | Data-level extraction |
| TXT | Text extraction (unavoidable) |

### Files Modified
- `src/utils/fileConverter.ts` -- all changes in this single file

