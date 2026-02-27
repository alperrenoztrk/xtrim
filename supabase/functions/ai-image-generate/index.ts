import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    console.log(`Processing AI generation: ${type}`);

    let fullPrompt = "";
    switch (type) {
      case 'text-to-image':
        fullPrompt = `Generate a high-quality image based on this description: ${prompt}. Make it visually stunning and professional.`;
        break;
      case 'expand':
        fullPrompt = `Expand this image beyond its current boundaries. ${prompt}. Seamlessly extend the content while maintaining consistency.`;
        break;
      case 'avatar':
        fullPrompt = `Create a professional AI avatar: ${prompt}. High-quality, suitable for profile pictures, good lighting, clean background.`;
        break;
      case 'poster':
        fullPrompt = `Design a professional poster: ${prompt}. Include typography placement areas, balanced composition, eye-catching visuals.`;
        break;
      default:
        throw new Error(`Unknown generation type: ${type}`);
    }

    // Build message content
    const content: any[] = [{ type: "text", text: fullPrompt }];
    if (inputImage && (type === 'expand' || type === 'avatar' || type === 'poster')) {
      content.push({ type: "image_url", image_url: { url: inputImage.startsWith("data:") ? inputImage : `data:image/png;base64,${inputImage}` } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI credits exhausted." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

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
