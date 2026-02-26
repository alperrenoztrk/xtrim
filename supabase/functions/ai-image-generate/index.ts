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

    const config = getAIConfig();
    console.log(`Processing AI generation: ${type} (using ${config.stripPrefix ? 'Google Cloud' : 'Lovable'} API)`);

    let fullPrompt = prompt;
    let messages: any[] = [];

    switch (type) {
      case 'text-to-image':
        fullPrompt = `Generate a high-quality image based on this description: ${prompt}. Make it visually stunning and professional.`;
        messages = [{ role: "user", content: fullPrompt }];
        break;
      case 'expand':
        if (!inputImage) throw new Error("Input image is required for expansion");
        fullPrompt = `Expand this image beyond its current boundaries. ${prompt}. Seamlessly extend the content while maintaining consistency with the original image style and content.`;
        messages = [{ role: "user", content: [
          { type: "text", text: fullPrompt },
          { type: "image_url", image_url: { url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}` } }
        ]}];
        break;
      case 'avatar':
        fullPrompt = `Create a professional AI avatar: ${prompt}. The avatar should be high-quality, suitable for profile pictures, with good lighting and a clean background.`;
        if (inputImage) {
          messages = [{ role: "user", content: [
            { type: "text", text: `Transform this photo into a stylized avatar. ${fullPrompt}` },
            { type: "image_url", image_url: { url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}` } }
          ]}];
        } else {
          messages = [{ role: "user", content: fullPrompt }];
        }
        break;
      case 'poster':
        fullPrompt = `Design a professional poster: ${prompt}. Include appropriate typography placement areas, balanced composition, and eye-catching visual elements.`;
        if (inputImage) {
          messages = [{ role: "user", content: [
            { type: "text", text: `Create a poster design incorporating this image. ${fullPrompt}` },
            { type: "image_url", image_url: { url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}` } }
          ]}];
        } else {
          messages = [{ role: "user", content: fullPrompt }];
        }
        break;
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveModel("google/gemini-2.5-flash-image-preview", config.stripPrefix),
        messages,
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "API credits exhausted. Please add funds." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!generatedImage) {
      console.log("No image generated, text response:", textResponse);
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
