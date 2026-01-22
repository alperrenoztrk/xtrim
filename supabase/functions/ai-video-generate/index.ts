import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating AI video: style=${style}, duration=${duration}s, quality=${quality}%`);

    // Create an enhanced prompt for video frame generation
    const styleDescriptions: Record<string, string> = {
      cinematic: "cinematic film style, dramatic lighting, movie quality, 35mm film look, wide angle shot",
      anime: "anime style, vibrant colors, Japanese animation aesthetic, detailed backgrounds",
      realistic: "photorealistic, ultra high definition, lifelike details, natural lighting",
      artistic: "artistic interpretation, creative, painterly style, impressionist",
      "3d": "3D rendered, CGI quality, smooth surfaces, professional render, Pixar style",
      vintage: "vintage film look, retro aesthetic, film grain, nostalgic colors, 1970s style",
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.cinematic;
    
    // Generate multiple frames for video sequence
    const framePrompts = [
      `Create a stunning opening frame: ${prompt}. Style: ${styleDesc}. High quality, ${quality}% detail level. Ultra high resolution, professional cinematography. Wide establishing shot.`,
      `Create a dynamic middle frame with slight movement: ${prompt}. Style: ${styleDesc}. High quality, ${quality}% detail level. Ultra high resolution. Medium shot with subtle motion blur.`,
      `Create a closing frame with depth: ${prompt}. Style: ${styleDesc}. High quality, ${quality}% detail level. Ultra high resolution. Close-up detail shot.`
    ];

    // Generate key frames
    const frameResults = [];
    
    for (let i = 0; i < Math.min(3, Math.ceil(duration / 3)); i++) {
      const framePrompt = framePrompts[i % framePrompts.length];
      
      console.log(`Generating frame ${i + 1}...`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: framePrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "API credits exhausted. Please add funds." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (generatedImage) {
        frameResults.push({
          frameIndex: i,
          imageUrl: generatedImage,
          timestamp: (i * duration) / Math.min(3, Math.ceil(duration / 3))
        });
      }
    }

    if (frameResults.length === 0) {
      throw new Error("Failed to generate any video frames");
    }

    console.log(`Generated ${frameResults.length} frames successfully`);

    // Return frames with animation metadata for client-side video composition
    return new Response(
      JSON.stringify({
        success: true,
        type: "animated-sequence",
        frames: frameResults,
        primaryFrame: frameResults[0].imageUrl,
        frameUrl: frameResults[0].imageUrl, // For backward compatibility
        duration,
        style,
        quality,
        animationSettings: {
          type: getAnimationType(style),
          easing: "easeInOut",
          fps: quality >= 80 ? 30 : 24,
          transitions: ["fade", "zoom", "pan"]
        },
        message: `Video sequence generated with ${frameResults.length} key frames. Ready for animation.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating video:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getAnimationType(style: string): string {
  const animationTypes: Record<string, string> = {
    cinematic: "slow-zoom-pan",
    anime: "dynamic-motion",
    realistic: "subtle-parallax",
    artistic: "brush-reveal",
    "3d": "rotate-orbit",
    vintage: "film-flicker"
  };
  return animationTypes[style] || "slow-zoom-pan";
}
