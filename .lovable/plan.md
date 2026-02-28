

## Plan: Redesign VideoColorPanel to match Google Photos style

Based on the reference screenshots, the current panel needs a complete UI overhaul to match Google Photos' video filter/adjust editor.

### Key Design Changes

**1. Filters Tab - Horizontal thumbnail carousel**
- Replace the 5-column gradient grid with a horizontally scrollable row of actual video thumbnail previews
- Each filter shows the video frame with the CSS filter applied on the thumbnail
- Capture a frame from the video as a thumbnail using canvas
- Add a vertical divider after "Yok" (None) filter
- Selected filter gets a rounded border highlight
- Expand filter list: Yok, Vivid, Playa, Honey, Isla, Desert, Clay, Palma, Blush, Bazaar, Ollie, Onyx, Eiffel, Vogue

**2. Adjust Tab - Icon button carousel with shared slider**
- Replace vertical stacked sliders with a horizontal scrollable row of square icon buttons
- Labels above each icon (Parlaklık, Kontrast, Ton, Beyaz nokta, Parlak alanlar, Gölgeler, Siyah nokta, Vinyet, Doygunluk, Sıcaklık, Tonlama, Cilt tonu, Mavi ton)
- A single shared slider between the video and the icon row
- Tapping an icon selects it and the slider controls that parameter
- Expand adjustment controls to include: brightness, contrast, tone, white point, highlights, shadows, black point, vignette, saturation, temperature, tint, skin tone, blue tone

**3. Bottom Footer - Google Photos style**
- Round dark X button on the left
- Title in center ("Filtreler" or "Ayarla")
- Round dark checkmark button on the right
- Remove the Reset button and Cancel text button

**4. Remove the header and tab buttons**
- No top header with Palette icon
- Bottom footer shows which mode is active via the center title
- Tab switching happens via the footer title or by keeping the two tab buttons but styling them differently

### Implementation Steps

1. **Update `VideoColorPanel.tsx`**:
   - Add video thumbnail capture (canvas-based) on mount
   - Restructure filters as horizontal scrollable with thumbnail previews and CSS filters on each
   - Restructure adjust tab with icon grid + shared slider
   - Expand filter presets to ~15 named filters matching Google Photos
   - Expand adjustment controls to ~13 parameters
   - Redesign footer to match Google Photos (round buttons + center title)
   - Add `ColorSettings` fields: `tone`, `whitePoint`, `highlights`, `shadows`, `blackPoint`, `vignette`, `skinTone`, `blueTone`

2. **Update `ColorSettings` interface** and related types to support the new parameters

### Technical Details

- Video thumbnail captured via `canvas.drawImage(video, ...)` → `toDataURL()`
- Each filter preset thumbnail rendered as `<img>` with inline CSS `filter:` matching the preset's color settings
- Adjust icons use lucide-react icons in dark square buttons
- Shared slider positioned between video area and icon row
- Horizontal scroll via `overflow-x-auto` with `scrollbar-hide`

