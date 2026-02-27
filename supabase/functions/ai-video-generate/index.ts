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

interface VideoGenerateRequest {
  prompt: string;
  style: string;
  duration: number;
  quality: number;
}

async function generateImageWithGeminiNative(apiKey: string, prompt: string): Promise<string> {
  const candidateModels = [
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.5-flash-image",
    "gemini-1.5-flash",
  ];

  let lastError = "No compatible model found";

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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
  }

  throw new Error(`Gemini API error: 404 (${lastError})`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, style, duration, quality }: VideoGenerateRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { apiKey, useLovable } = getApiConfig();
    console.log(`Generating AI video frame: style=${style}, duration=${duration}s, quality=${quality}%, useLovable=${useLovable}`);

    const styleDescriptions: Record<string, string> = {
      cinematic: "cinematic film style, dramatic lighting, movie quality, 35mm film look",
      anime: "anime style, vibrant colors, Japanese animation aesthetic",
      realistic: "photorealistic, ultra high definition, lifelike details",
      artistic: "artistic interpretation, creative, painterly style",
      "3d": "3D rendered, CGI quality, smooth surfaces, professional render",
      vintage: "vintage film look, retro aesthetic, film grain, nostalgic colors",
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.cinematic;
    const enhancedPrompt = `Create a stunning video frame: ${prompt}. Style: ${styleDesc}. High quality, ${quality}% detail level. Ultra high resolution, professional cinematography.`;

    let generatedImage: string | null = null;

    if (useLovable) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: enhancedPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI error:", response.status, errorText);
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${response.status}`);
      }

      const data = await response.json();
      generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    } else {
      generatedImage = await generateImageWithGeminiNative(apiKey, enhancedPrompt);
    }

    if (!generatedImage) throw new Error("Failed to generate video frame");

    console.log("Video frame generated successfully");

    return new Response(
      JSON.stringify({ success: true, frameUrl: generatedImage, duration, style, message: "Video frame generated successfully." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating video:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
