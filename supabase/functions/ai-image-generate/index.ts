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

interface GenerateRequest {
  type: 'text-to-image' | 'expand' | 'avatar' | 'poster';
  prompt: string;
  inputImage?: string;
  options?: {
    style?: string;
    aspectRatio?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, prompt, inputImage, options }: GenerateRequest = await req.json();

    if (!type || !prompt) {
      return new Response(
        JSON.stringify({ error: "Type and prompt are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = getGoogleApiKey();
    console.log(`Processing AI generation: ${type} (using Google Gemini native API)`);

    let fullPrompt = "";

    switch (type) {
      case 'text-to-image':
        fullPrompt = `Generate a high-quality image based on this description: ${prompt}. Make it visually stunning and professional.`;
        break;
      case 'expand':
        fullPrompt = `Expand this image beyond its current boundaries. ${prompt}. Seamlessly extend the content while maintaining consistency with the original image style and content.`;
        break;
      case 'avatar':
        fullPrompt = `Create a professional AI avatar: ${prompt}. The avatar should be high-quality, suitable for profile pictures, with good lighting and a clean background.`;
        if (inputImage) {
          fullPrompt = `Transform this photo into a stylized avatar. ${fullPrompt}`;
        }
        break;
      case 'poster':
        fullPrompt = `Design a professional poster: ${prompt}. Include appropriate typography placement areas, balanced composition, and eye-catching visual elements.`;
        if (inputImage) {
          fullPrompt = `Create a poster design incorporating this image. ${fullPrompt}`;
        }
        break;
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    // Build parts for Google native API
    const parts: any[] = [{ text: fullPrompt }];
    if (inputImage && (type === 'expand' || type === 'avatar' || type === 'poster')) {
      // Extract base64 data
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract image from native Gemini response
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
      throw new Error("Image generation failed");
    }

    return new Response(
      JSON.stringify({ success: true, type, imageUrl: generatedImage, message: `${type} generation completed successfully` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in AI generation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
