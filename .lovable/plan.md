

## Problem
OCR output has broken Turkish characters (e.g., "BELGESİ" → "BELGESİ°", "ÇAKMAK" → "Ã‡AKMAK"). This is a UTF-8 encoding issue — either the model is misreading characters or the downloaded file lacks proper encoding markers.

## Plan

### 1. Add UTF-8 BOM to downloaded text file (`src/pages/ConvertScreen.tsx`)
- Prepend `\uFEFF` (UTF-8 BOM) to the text blob so text editors on Android/Windows correctly detect UTF-8 encoding
- Change: `new Blob(['\uFEFF' + extractedText], { type: 'text/plain;charset=utf-8' })`

### 2. Use stronger model for OCR (`supabase/functions/ocr-extract/index.ts`)
- In `extractWithGeminiNative`: move `gemini-2.5-pro` to the front of the models array (better at Turkish character recognition)
- In `extractWithLovableAI`: switch model from `google/gemini-3-flash-preview` to `google/gemini-2.5-pro` for higher accuracy

### 3. Show OCR result on screen before download (`src/pages/ConvertScreen.tsx`)
- Instead of auto-downloading, display the extracted text in a textarea/dialog so the user can verify correctness before copying or downloading
- Add a "Kopyala" (Copy) button and a "İndir" (Download) button

