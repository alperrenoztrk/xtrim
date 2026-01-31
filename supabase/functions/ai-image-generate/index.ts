import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing AI generation: ${type}`);

    let fullPrompt = prompt;
    let messages: any[] = [];

    switch (type) {
      case 'text-to-image':
        fullPrompt = `Generate a high-quality image based on this description: ${prompt}. Make it visually stunning and professional.`;
        messages = [{ role: "user", content: fullPrompt }];
        break;
      
      case 'expand':
        if (!inputImage) {
          throw new Error("Input image is required for expansion");
        }
        fullPrompt = `Expand this image beyond its current boundaries. ${prompt}. Seamlessly extend the content while maintaining consistency with the original image style and content.`;
        messages = [{
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            {
              type: "image_url",
              image_url: {
                url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}`
              }
            }
          ]
        }];
        break;
      
      case 'avatar':
        fullPrompt = `Create a professional AI avatar: ${prompt}. The avatar should be high-quality, suitable for profile pictures, with good lighting and a clean background.`;
        if (inputImage) {
          messages = [{
            role: "user",
            content: [
              { type: "text", text: `Transform this photo into a stylized avatar. ${fullPrompt}` },
              {
                type: "image_url",
                image_url: {
                  url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}`
                }
              }
            ]
          }];
        } else {
          messages = [{ role: "user", content: fullPrompt }];
        }
        break;
      
      case 'poster':
        fullPrompt = `Design a professional poster: ${prompt}. Include appropriate typography placement areas, balanced composition, and eye-catching visual elements.`;
        if (inputImage) {
          messages = [{
            role: "user",
            content: [
              { type: "text", text: `Create a poster design incorporating this image. ${fullPrompt}` },
              {
                type: "image_url",
                image_url: {
                  url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}`
                }
              }
            ]
          }];
        } else {
          messages = [{ role: "user", content: fullPrompt }];
        }
        break;
      
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // IMPORTANT:
      // supabase.functions.invoke treats non-2xx responses as `error`, which can surface
      // as "Edge function returned 402" in the client and may crash flows if not handled.
      // For quota/payment/rate-limit cases we return HTTP 200 + success:false so the UI
      // can show a friendly message without hard-failing.
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!generatedImage) {
      console.log("No image generated, text response:", textResponse);
      throw new Error("Image generation failed");
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        imageUrl: generatedImage,
        message: `${type} generation completed successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in AI generation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
