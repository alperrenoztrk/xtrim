import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAIConfig() {
  const googleKey = Deno.env.get("GOOGLE_CLOUD_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (googleKey) {
    return { apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey: googleKey, stripPrefix: true };
  }
  if (lovableKey) {
    return { apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions", apiKey: lovableKey, stripPrefix: false };
  }
  throw new Error("No AI API key configured (GOOGLE_CLOUD_API_KEY or LOVABLE_API_KEY)");
}

function resolveModel(model: string, strip: boolean): string {
  return strip ? model.replace("google/", "") : model;
}

interface VideoGenerateRequest {
  prompt: string;
  style: string;
  duration: number;
  quality: number;
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

    const config = getAIConfig();
    console.log(`Generating AI video: style=${style}, duration=${duration}s, quality=${quality}% (using ${config.stripPrefix ? 'Google Cloud' : 'Lovable'} API)`);

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

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel("google/gemini-2.5-flash-image", config.stripPrefix),
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) throw new Error("Failed to generate video frame");

    console.log("Video frame generated successfully");

    return new Response(
      JSON.stringify({ success: true, frameUrl: generatedImage, duration, style, message: "Video frame generated successfully. Ready to add to timeline." }),
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
