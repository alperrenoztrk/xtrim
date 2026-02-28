

## Problem
The HomeScreen has two duplicate "Convert" entries in the `tools` array, and the `handleToolClick` function routes `convert` to the tools menu sheet (video editor) instead of the dedicated `/convert` page.

## Plan

### 1. Fix `src/pages/HomeScreen.tsx`
- **Remove the duplicate Convert entry** (second one at ~lines 56-61 that routes to `/editor`)
- **Update `handleToolClick`**: Remove `'convert'` from the condition that opens the menu sheet (`tool.id === 'video' || tool.id === 'photo' || tool.id === 'convert'`), so clicking Convert navigates directly to `/convert` via the tool's `route` property (already set correctly on the first Convert entry)

### 2. Fix `src/pages/ConvertScreen.tsx` build error
- Line 132: Cast `pdfBytes` with `as BlobPart` or wrap in `new Blob([pdfBytes.buffer])` to fix the TypeScript error about `Uint8Array<ArrayBufferLike>` not being assignable to `BlobPart`

