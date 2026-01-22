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

    const RUNWAY_API_KEY = Deno.env.get("RUNWAY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RUNWAY_API_KEY) {
      console.log("RUNWAY_API_KEY not found, falling back to image-based generation");
      // Fallback to image-based video generation
      return await generateImageBasedVideo(prompt, style, duration, quality, LOVABLE_API_KEY);
    }

    console.log(`Generating AI video with Runway: style=${style}, duration=${duration}s, quality=${quality}%`);

    // Style-enhanced prompt
    const styleDescriptions: Record<string, string> = {
      cinematic: "cinematic film style, dramatic lighting, movie quality, 35mm film look, professional cinematography",
      anime: "anime style, vibrant colors, Japanese animation aesthetic, detailed backgrounds, Studio Ghibli quality",
      realistic: "photorealistic, ultra high definition, lifelike details, natural lighting, 8K resolution",
      artistic: "artistic interpretation, creative, painterly style, impressionist, fine art quality",
      "3d": "3D rendered, CGI quality, smooth surfaces, professional render, Pixar style animation",
      vintage: "vintage film look, retro aesthetic, film grain, nostalgic colors, 1970s cinematography",
    };

    const styleDesc = styleDescriptions[style] || styleDescriptions.cinematic;
    const enhancedPrompt = `${prompt}. ${styleDesc}. High quality video, smooth motion, professional production.`;

    // Call Runway ML Text-to-Video API
    const runwayResponse = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06"
      },
      body: JSON.stringify({
        model: "gen4_turbo", // Latest Gen-4 Turbo model
        promptText: enhancedPrompt,
        duration: Math.min(duration, 10), // Runway supports up to 10 seconds
        ratio: "1280:720" // 16:9 HD resolution
      }),
    });

    if (!runwayResponse.ok) {
      const errorText = await runwayResponse.text();
      console.error("Runway API error:", runwayResponse.status, errorText);

      if (runwayResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Runway API key is invalid. Please check your API key." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (runwayResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (runwayResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Runway credits exhausted. Please add credits to your Runway account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback to image-based generation
      console.log("Falling back to image-based generation due to Runway error");
      return await generateImageBasedVideo(prompt, style, duration, quality, LOVABLE_API_KEY);
    }

    const runwayData = await runwayResponse.json();
    
    // Check if we got a task ID (async generation)
    if (runwayData.id) {
      // Poll for video completion
      const videoUrl = await pollForVideoCompletion(runwayData.id, RUNWAY_API_KEY);
      
      if (videoUrl) {
        return new Response(
          JSON.stringify({
            success: true,
            type: "real-video",
            videoUrl: videoUrl,
            format: "mp4",
            duration,
            style,
            quality,
            message: "Real AI video generated successfully!",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // If direct URL is returned
    if (runwayData.output?.url || runwayData.url) {
      return new Response(
        JSON.stringify({
          success: true,
          type: "real-video",
          videoUrl: runwayData.output?.url || runwayData.url,
          format: "mp4",
          duration,
          style,
          quality,
          message: "Real AI video generated successfully!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Unexpected Runway API response format");

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

// Poll Runway API for video completion
async function pollForVideoCompletion(taskId: string, apiKey: string, maxAttempts = 60): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls

    try {
      const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-Runway-Version": "2024-11-06"
        },
      });

      if (!response.ok) {
        console.error(`Poll error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`Poll attempt ${i + 1}: status = ${data.status}`);

      if (data.status === "SUCCEEDED" && data.output?.length > 0) {
        return data.output[0]; // Return the video URL
      }

      if (data.status === "FAILED") {
        console.error("Video generation failed:", data.failure);
        throw new Error(data.failure || "Video generation failed");
      }

    } catch (error) {
      console.error("Poll error:", error);
    }
  }

  return null;
}

// Fallback: Generate image-based animated video
async function generateImageBasedVideo(
  prompt: string,
  style: string,
  duration: number,
  quality: number,
  lovableApiKey: string | undefined
): Promise<Response> {
  if (!lovableApiKey) {
    return new Response(
      JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("Using image-based fallback video generation");

  const styleDescriptions: Record<string, string> = {
    cinematic: "cinematic film style, dramatic lighting, movie quality, 35mm film look, wide angle shot",
    anime: "anime style, vibrant colors, Japanese animation aesthetic, detailed backgrounds",
    realistic: "photorealistic, ultra high definition, lifelike details, natural lighting",
    artistic: "artistic interpretation, creative, painterly style, impressionist",
    "3d": "3D rendered, CGI quality, smooth surfaces, professional render, Pixar style",
    vintage: "vintage film look, retro aesthetic, film grain, nostalgic colors, 1970s style",
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.cinematic;
  
  // Generate multiple frames
  const framePrompts = [
    `Create a stunning opening frame: ${prompt}. Style: ${styleDesc}. Ultra high resolution.`,
    `Create a dynamic middle frame: ${prompt}. Style: ${styleDesc}. Different angle, subtle motion.`,
    `Create a closing frame: ${prompt}. Style: ${styleDesc}. Close-up detail shot.`
  ];

  const frames = [];
  
  for (let i = 0; i < Math.min(3, Math.ceil(duration / 3)); i++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: framePrompts[i % framePrompts.length] }],
          modalities: ["image", "text"],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl) {
          frames.push({ frameIndex: i, imageUrl, timestamp: (i * duration) / 3 });
        }
      }
    } catch (error) {
      console.error(`Frame ${i} generation error:`, error);
    }
  }

  if (frames.length === 0) {
    return new Response(
      JSON.stringify({ error: "Failed to generate any video frames" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      type: "animated-sequence",
      frames,
      primaryFrame: frames[0].imageUrl,
      frameUrl: frames[0].imageUrl,
      duration,
      style,
      quality,
      animationSettings: {
        type: getAnimationType(style),
        easing: "easeInOut",
        fps: quality >= 80 ? 30 : 24,
        transitions: ["fade", "zoom", "pan"]
      },
      message: `Video sequence generated with ${frames.length} key frames. Client-side animation will be applied.`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

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
