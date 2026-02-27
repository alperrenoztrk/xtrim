import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getApiConfig(): { apiKey: string; useLovable: boolean } {
  // Prioritize Lovable AI Gateway for image generation (native Gemini models often 404)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return { apiKey: lovableKey, useLovable: true };
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (geminiKey) return { apiKey: geminiKey, useLovable: false };
  throw new Error("No API key configured");
}

const CANDIDATE_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.0-flash-exp",
];

async function generateWithFallback(apiKey: string, prompt: string, mimeType: string, imageData: string): Promise<string | null> {
  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log(`Trying model: ${model}`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageData } }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      if (response.status === 404) {
        console.log(`Model ${model} returned 404, trying next...`);
        await response.text();
        continue;
      }
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (!response.ok) {
        const errText = await response.text();
        console.log(`Model ${model} error ${response.status}: ${errText}`);
        continue;
      }
      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      console.log(`Model ${model} returned no image data`);
    } catch (e) {
      if (e.message === "RATE_LIMIT") throw e;
      console.log(`Model ${model} fetch error: ${e.message}`);
    }
  }
  return null;
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
      try {
        generatedImage = await generateWithFallback(apiKey, prompt, mimeType, imageData);
      } catch (e) {
        if (e.message === "RATE_LIMIT") {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw e;
      }
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
