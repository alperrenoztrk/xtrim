

# Timeline Redesign: Fixed Center Playhead with Scrollable Clips

## Current Behavior
- The playhead is fixed at the left edge (`fixedTimelinePlayheadOffsetPx = 16`)
- Timeline clips are laid out horizontally and can be reordered via drag-and-drop
- Scrubbing works by pointer events on the timeline area
- The timeline auto-scrolls to keep the current position visible

## What Changes (CapCut-style timeline)

### 1. Center the Playhead
Move the playhead line from the left edge (16px) to the horizontal center of the timeline viewport. The playhead remains visually fixed; clips scroll underneath it.

- `fixedTimelinePlayheadOffsetPx` changes from `16` to `timelineViewportWidth / 2`
- The playhead vertical line and dot are repositioned to the center

### 2. Add Padding to Clips Container
To allow the first clip's start and last clip's end to reach the center playhead, add horizontal padding equal to half the viewport width on both sides of the clip list.

- Wrap the `Reorder.Group` content with left/right padding spacers (`width: viewportWidth / 2`)
- This ensures the timeline can scroll so that any point in the video aligns with the center playhead

### 3. Update Scroll Logic
The auto-scroll `useEffect` that keeps the current time visible will be updated:
- Calculate the pixel position of the current playback time
- Scroll so that position aligns with the center of the viewport
- Formula: `scrollLeft = clipPixelPosition + leftPadding - (viewportWidth / 2)`

### 4. Update Scrubbing Logic
`handleTimelineScrub` needs to account for the center playhead:
- The pointer position relative to the center determines the time offset
- Account for the new padding spacers in the scroll width calculation

### 5. Video Playback Starts from Playhead Position
This already works — `handleSeek` sets `video.currentTime` based on the timeline position. The centered playhead just changes where visually "current time" is shown, but the underlying logic remains the same.

### 6. Keep Existing Features
- Drag-and-drop reordering stays the same
- The `+` add media button at the end of clips stays the same style
- Zoom controls, time markers, and audio/text lanes remain unchanged
- Trim handles on selected clips remain

## Files to Modify
- **`src/pages/VideoEditorScreen.tsx`** — All changes are in this single file:
  - Update `fixedTimelinePlayheadOffsetPx` to use center calculation
  - Add left/right padding spacers around the clips
  - Update the auto-scroll `useEffect`
  - Update `handleTimelineScrub` for center-based calculation
  - Update the time ruler to also have padding spacers

## Technical Details

```text
Before:
|P clips...                    |
 ^ playhead at 16px

After:
|    padding    |P|   clips...   |    padding    |
                 ^ playhead at center (viewportWidth/2)
```

The padding spacers ensure clips can scroll fully so the start of the first clip and end of the last clip can both reach the center playhead position.

