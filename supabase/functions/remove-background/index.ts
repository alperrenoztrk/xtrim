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

serve(async (req) => {
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

    const config = getAIConfig();
    console.log(`Processing background removal (using ${config.stripPrefix ? 'Google Cloud' : 'Lovable'} API)...`);

    const trimmedPrompt = customPrompt?.trim();
    const userInstruction = trimmedPrompt ? `User request: "${trimmedPrompt}"` : "No extra user request was provided.";

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel("google/gemini-2.5-flash-image-preview", config.stripPrefix),
        messages: [
          {
            role: "system",
            content: "You are a precise image background-removal assistant. Always produce an edited version of the input image, preserving original proportions and perspective. Parse the user request literally and prioritize explicit keep/remove instructions. If the request is ambiguous, preserve the most likely main subject (usually the largest foreground person/object). Keep edges natural (hair/fur/detail), avoid cutting subject parts, and remove requested regions only. Output a single PNG image with a fully transparent background (alpha 0) around the kept subject. Never output white, checkerboard, gradient, textured, or shadowed backgrounds.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Task: Remove background from this image.",
                  userInstruction,
                  "Required output: keep requested subject(s) sharp and natural; removed regions must be fully transparent (alpha 0).",
                  "Return PNG image output with transparency only.",
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
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      const textResponse = data.choices?.[0]?.message?.content;
      console.log("No image generated, text response:", textResponse);
      throw new Error("Background removal failed - no image generated");
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: generatedImage, message: "Background removed successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
