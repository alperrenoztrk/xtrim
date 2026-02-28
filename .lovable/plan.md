

## Problem Analysis

The AI video generation feature appears structurally complete (panel, edge function, config.toml entry all exist), but there are two likely issues:

1. **Model name `gemini-3.1-flash-image-preview` does not exist** - This has been causing 404 errors across other functions too. Google does not have a model called `gemini-3.1-flash-image-preview`. The correct model for image generation via the Lovable AI gateway is `google/gemini-2.5-flash-image` (also known as "Nano banana").

2. **CORS headers incomplete** - The edge function's CORS headers are missing headers that the Supabase client sends (e.g., `x-supabase-client-platform`), which could cause preflight failures.

3. **Direct Gemini API vs Lovable AI Gateway** - The function calls Google's native `generateContent` API directly with `GEMINI_API_KEY`. Since the project has `GEMINI_API_KEY` configured, this approach should work, but the model name is wrong.

## Plan

### Step 1: Fix edge function model and CORS

Update `supabase/functions/ai-video-generate/index.ts`:
- Fix CORS headers to include all required Supabase client headers
- Switch model from `gemini-3.1-flash-image-preview` to `gemini-2.0-flash-exp` (which is a known working model that supports `responseModalities: ["IMAGE"]`)
- Alternatively, use Lovable AI Gateway with `google/gemini-3-pro-image-preview` model for image generation, which avoids model name guessing

### Step 2: Fix other affected edge functions

Apply the same model fix to:
- `supabase/functions/ai-video-tools/index.ts`
- `supabase/functions/remove-background/index.ts`  
- `supabase/functions/ai-image-generate/index.ts`

All currently use the non-existent `gemini-3.1-flash-image-preview`.

### Step 3: Add missing config.toml entries

Add entries for `ai-transcript`, `elevenlabs-tts`, and `video-translate` functions that are missing from `supabase/config.toml`.

### Recommended Approach

Since the native Gemini model names have been unreliable, the most robust fix is to switch image generation functions to use the **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) with the `google/gemini-3-pro-image-preview` model. The `LOVABLE_API_KEY` is already configured. This avoids the recurring model-name 404 issues entirely.

