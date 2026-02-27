import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getApiConfig(): { apiKey: string; useLovable: boolean } {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return { apiKey: lovableKey, useLovable: true };
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (geminiKey) return { apiKey: geminiKey, useLovable: false };
  throw new Error("No API key configured");
}

interface GenerateRequest {
  type: 'text-to-image' | 'expand' | 'avatar' | 'poster';
  prompt: string;
  inputImage?: string;
  options?: { style?: string; aspectRatio?: string };
}

async function generateImageWithGeminiNative(
  apiKey: string,
  fullPrompt: string,
  inputImage?: string,
  type: GenerateRequest['type'] = 'text-to-image'
): Promise<string> {
  const candidateModels = [
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-1.5-flash",
  ];

  let lastError = "No compatible model returned image output";

  for (const model of candidateModels) {
    const parts: any[] = [{ text: fullPrompt }];

    if (inputImage && type !== 'text-to-image') {
      let imageData = inputImage;
      let mimeType = "image/png";

      if (inputImage.startsWith("data:")) {
        const match = inputImage.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          imageData = match[2];
        }
      }

      parts.push({ inlineData: { mimeType, data: imageData } });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (response.status === 404) {
      const body = await response.text();
      console.warn(`Gemini model not available: ${model}`, body);
      lastError = body || `Model not found: ${model}`;
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) throw new Error("Rate limit exceeded.");
      throw new Error(`Gemini API error (${model}): ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    lastError = `Model ${model} did not return image data`;
  }

  throw new Error(`Gemini API error: 404 (${lastError})`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, prompt, inputImage, options }: GenerateRequest = await req.json();

    if (!type || !prompt) {
      return new Response(JSON.stringify({ error: "Type and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { apiKey, useLovable } = getApiConfig();
    console.log(`Processing AI generation: ${type}, useLovable=${useLovable}`);

    let fullPrompt = "";
    switch (type) {
      case 'text-to-image': fullPrompt = `Generate a high-quality image: ${prompt}. Visually stunning and professional.`; break;
      case 'expand': fullPrompt = `Expand this image beyond its current boundaries. ${prompt}. Seamlessly extend content.`; break;
      case 'avatar': fullPrompt = `Create a professional AI avatar: ${prompt}. High-quality, good lighting, clean background.`; break;
      case 'poster': fullPrompt = `Design a professional poster: ${prompt}. Balanced composition, eye-catching visuals.`; break;
      default: throw new Error(`Unknown type: ${type}`);
    }

    let generatedImage: string | null = null;

    if (useLovable) {
      const content: any[] = [{ type: "text", text: fullPrompt }];
      if (inputImage && type !== 'text-to-image') {
        content.push({ type: "image_url", image_url: { url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}` } });
      }
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-pro-image-preview", messages: [{ role: "user", content }], modalities: ["image", "text"] }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ success: false, error: "AI credits exhausted." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${response.status}`);
      }
      const data = await response.json();
      generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } else {
      generatedImage = await generateImageWithGeminiNative(apiKey, fullPrompt, inputImage, type);
    }

    if (!generatedImage) throw new Error("Image generation failed");

    return new Response(
      JSON.stringify({ success: true, type, imageUrl: generatedImage, message: `${type} generation completed` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in AI generation:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
