

## Plan: Fix Word→PDF, Remove Word→Word, Add PowerPoint

### 1. Fix Word→PDF Bug
The console error `Cannot read properties of undefined (reading 'indexOf')` comes from `XLSX.utils.sheet_to_html` being called on sheets without a valid `!ref` property. This affects Excel/CSV conversions too. For Word→PDF specifically, `mammoth` may fail on `.doc` (non-DOCX) files.

**Fixes in `src/utils/fileConverter.ts`:**
- Add `!ref` guard before calling `sheet_to_html` on every sheet (skip empty sheets)
- Wrap `mammoth.convertToHtml` in try-catch for `.doc` files; fall back to reading raw text
- Add null-check on mammoth result before passing to `htmlToImagePdf`

### 2. Remove Word→Word Conversion
- Remove `'docx'` from `word` targets in `getAvailableTargets` (line 49)
- Remove `'word→docx': wordToDocx` from `converterMap` (line 778)
- Delete the `wordToDocx` function (lines 706-713)

### 3. Add PowerPoint (PPTX) Support
**New dependency:** `pptxgenjs` — browser-compatible PPTX generation library.

**New source format:** `'pptx'` — detect `.pptx` and `.ppt` files.

**Conversion approach:** Since there's no reliable browser-based PPTX *reader*, PowerPoint files will be treated as binary blobs for image-based conversions where possible. For *creating* PPTX from other formats, we render the source to images and embed each page/slice as a full-slide image in a PPTX.

**New conversions (output PPTX):**
- `pdf→pptx`: Render each PDF page as image → embed as slides
- `image→pptx`: Embed image as a single slide
- `word→pptx`: mammoth HTML → html2canvas → embed as slides
- `excel→pptx`: sheet HTML → html2canvas → embed as slides
- `csv→pptx`: parsed HTML → html2canvas → embed as slides
- `txt→pptx`: pre-formatted HTML → html2canvas → embed as slides

**New conversions (from PPTX):**
- `pptx→pdf`, `pptx→docx`, `pptx→png`, `pptx→txt`: Extract slides via ZIP parsing (PPTX is a ZIP), render slide XML to basic HTML, then use existing pipelines.

**Changes:**
- Add `'pptx'` to `SourceFormat` and `TargetFormat` types
- Add labels for pptx
- Update `detectFormat` to recognize `.ppt`/`.pptx`
- Update `getAvailableTargets` for all sources to include `pptx`, and for `pptx` source
- Add converter functions and register in `converterMap`
- Add `pptx: '.pptx'` to `extMap`

### Files Modified
- `src/utils/fileConverter.ts` — all conversion logic changes
- `src/pages/ConvertScreen.tsx` — add `.pptx,.ppt` to file input accept attribute
- `package.json` — add `pptxgenjs` dependency

