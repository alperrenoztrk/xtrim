

## Plan: Make Sticker Feature Work Like iPhone

### Problem
The current sticker feature only removes the background, producing a flat cutout. iPhone's sticker feature adds a distinctive white outline/stroke around the subject, giving it a proper "sticker" appearance that pops.

### Solution
Enhance the sticker creation pipeline to add a white outline stroke around the subject after background removal, mimicking the iPhone sticker effect.

### Changes

**1. `src/pages/PhotoEditorScreen.tsx` — Post-process sticker with outline**
After receiving the background-removed image from the AI, add a canvas post-processing step:
- Load the transparent PNG result onto a canvas
- Extract the alpha channel to create a silhouette
- Dilate the silhouette by ~6-8px to create an outline mask
- Draw the white outline first, then draw the original transparent image on top
- This produces the classic iPhone "lift subject" sticker look with a clean white border

Specifically in `handleCreateSticker`:
- After getting `stickerResult.imageUrl`, load it into a temporary canvas
- Apply the outline algorithm (alpha dilation + white fill)
- Convert the final canvas to a data URL
- Use that as the sticker result

**2. `src/pages/PhotoEditorScreen.tsx` — Add share option**
Instead of only copying to clipboard (which fails on many browsers), also offer a "Share" fallback using the Web Share API, and a "Save" option that downloads the sticker as PNG.

### Outline Algorithm (canvas-based, no external deps)
```text
1. Draw transparent image → extract alpha channel
2. Create dilated alpha (expand opaque pixels by N px in all directions)
3. New canvas: fill dilated area with white → draw original image on top
4. Result: subject with white stroke border
```

### Files Modified
- `src/pages/PhotoEditorScreen.tsx` — add sticker outline post-processing and improved share/save

