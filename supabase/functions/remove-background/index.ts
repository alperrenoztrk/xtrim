import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, customPrompt } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing background removal request...");

    const trimmedPrompt = customPrompt?.trim();
    const userInstruction = trimmedPrompt
      ? `User request: "${trimmedPrompt}"`
      : "No extra user request was provided.";

    // Use Gemini image generation model for background removal
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a precise image background-removal assistant. Always produce an edited version of the input image, preserving original proportions and perspective. Parse the user request literally and prioritize explicit keep/remove instructions. If the request is ambiguous, preserve the most likely main subject (usually the largest foreground person/object). Keep edges natural (hair/fur/detail), avoid cutting subject parts, and remove requested regions only. Output a single PNG image with a solid pure white background (#FFFFFF). Never output transparent, checkerboard, gradient, textured, or shadowed backgrounds.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Task: Remove background from this image.",
                  userInstruction,
                  "Required output: keep requested subject(s) sharp and natural; removed regions must become solid pure white (#FFFFFF).",
                  "Never return transparency. Return PNG image output only.",
                ].join("\n")
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
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
          JSON.stringify({ error: "API credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image from the response
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      // If no image was generated, return text response for debugging
      const textResponse = data.choices?.[0]?.message?.content;
      console.log("No image generated, text response:", textResponse);
      throw new Error("Background removal failed - no image generated");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: generatedImage,
        message: "Background removed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
