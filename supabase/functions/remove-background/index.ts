import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getApiConfig(): { apiKey: string; useLovable: boolean } {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (geminiKey) return { apiKey: geminiKey, useLovable: false };
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return { apiKey: lovableKey, useLovable: true };
  throw new Error("No API key configured");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, customPrompt } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { apiKey, useLovable } = getApiConfig();
    console.log(`Processing background removal, useLovable=${useLovable}`);

    const trimmedPrompt = customPrompt?.trim();
    const userInstruction = trimmedPrompt ? `User request: "${trimmedPrompt}"` : "";
    const prompt = ["Task: Remove background from this image.", userInstruction, "Keep subject(s) sharp and natural; removed regions must be fully transparent (alpha 0).", "Return PNG image with transparency only."].filter(Boolean).join("\n");

    let generatedImage: string | null = null;

    if (useLovable) {
      const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
          modalities: ["image", "text"],
        }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${response.status}`);
      }
      const data = await response.json();
      generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } else {
      let imageData = imageBase64, mimeType = "image/png";
      if (imageBase64.startsWith("data:")) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) { mimeType = match[1]; imageData = match[2]; }
      }
      const candidateModels = [
        "gemini-2.5-flash-image",
        "gemini-2.0-flash-exp-image-generation",
        "gemini-2.0-flash-preview-image-generation",
        "gemini-2.0-flash-exp",
      ];
      let lastError = "No compatible model returned image output";
      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageData } }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        });
        if (response.status === 404) {
          const body = await response.text();
          console.warn(`Model not available: ${model}`, body);
          lastError = body || `Model not found: ${model}`;
          continue;
        }
        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Gemini API error: ${response.status}`);
        }
        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) { generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
          }
        }
        if (generatedImage) break;
        lastError = `Model ${model} did not return image data`;
      }
      if (!generatedImage) throw new Error(`Background removal failed: ${lastError}`);
    }

    if (!generatedImage) throw new Error("Background removal failed - no image generated");

    return new Response(
      JSON.stringify({ success: true, imageUrl: generatedImage, message: "Background removed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
