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

    const apiKey = getGoogleApiKey();
    console.log("Processing background removal (using Google Gemini native API)...");

    const trimmedPrompt = customPrompt?.trim();
    const userInstruction = trimmedPrompt ? `User request: "${trimmedPrompt}"` : "No extra user request was provided.";

    const prompt = [
      "Task: Remove background from this image.",
      userInstruction,
      "Required output: keep requested subject(s) sharp and natural; removed regions must be fully transparent (alpha 0).",
      "Return PNG image output with transparency only.",
    ].join("\n");

    // Extract base64 data
    let imageData = imageBase64;
    let mimeType = "image/png";
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        imageData = match[2];
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageData } }
          ]
        }],
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
    console.log("AI response received");

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

    if (!generatedImage) {
      console.log("No image generated, response:", JSON.stringify(data).slice(0, 500));
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
