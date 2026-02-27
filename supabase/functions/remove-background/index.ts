import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return key;
}

const CANDIDATE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.0-flash-exp-image-generation",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.0-flash-exp",
];

async function generateWithGemini(apiKey: string, prompt: string, mimeType: string, imageData: string): Promise<{ image: string | null; lastError: string }> {
  let lastError = "";
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
        await response.text();
        lastError = `Model ${model} not found`;
        console.log(`${lastError}, trying next...`);
        continue;
      }
      if (response.status === 429) {
        await response.text();
        return { image: null, lastError: "RATE_LIMIT" };
      }
      if (!response.ok) {
        const errText = await response.text();
        lastError = `${model} error ${response.status}: ${errText.substring(0, 200)}`;
        console.log(lastError);
        continue;
      }
      const data = await response.json();
      const parts = data.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            console.log(`Success with model: ${model}`);
            return { image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, lastError: "" };
          }
        }
      }
      lastError = `${model} returned no image data`;
      console.log(lastError);
    } catch (e) {
      lastError = `${model} error: ${e.message}`;
      console.log(lastError);
    }
  }
  return { image: null, lastError };
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

    const apiKey = getApiKey();
    console.log("Processing background removal with Gemini API (strict mode)");

    const trimmedPrompt = customPrompt?.trim();
    const userInstruction = trimmedPrompt ? `User request: "${trimmedPrompt}"` : "";
    const prompt = ["Task: Remove background from this image.", userInstruction, "Keep subject(s) sharp and natural; removed regions must be fully transparent (alpha 0).", "Return PNG image with transparency only."].filter(Boolean).join("\n");

    let imageData = imageBase64, mimeType = "image/png";
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) { mimeType = match[1]; imageData = match[2]; }
    }

    const { image: generatedImage, lastError } = await generateWithGemini(apiKey, prompt, mimeType, imageData);

    if (lastError === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Gemini API rate limit exceeded. Please wait and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!generatedImage) {
      return new Response(
        JSON.stringify({ error: `Gemini image generation unavailable. ${lastError}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
