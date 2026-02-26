import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getGoogleApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (key) return key;
  throw new Error("GEMINI_API_KEY is not configured");
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

    const apiKey = getGoogleApiKey();
    console.log(`Generating AI video: style=${style}, duration=${duration}s, quality=${quality}% (using Google Gemini native API)`);

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedImage: string | null = null;
    const candidate = data.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

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
