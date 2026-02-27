import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIToolRequest {
  tool: 'autocut' | 'enhance' | 'stabilize' | 'denoise' | 'upscale';
  videoBase64?: string;
  imageBase64?: string;
  options?: {
    style?: string;
    strength?: number;
    targetFps?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, videoBase64, imageBase64, options }: AIToolRequest = await req.json();

    if (!tool) {
      return new Response(
        JSON.stringify({ error: "Tool type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    console.log(`Processing AI tool: ${tool}`);

    let prompt = "";
    const inputData = imageBase64 || videoBase64;

    switch (tool) {
      case 'autocut':
        prompt = "Analyze this video frame and identify the best cut points. Look for scene changes, significant motion changes, and natural pause points. Return a JSON with suggested timestamps for cuts.";
        break;
      case 'enhance':
        prompt = "Enhance this image quality. Improve sharpness, reduce noise, enhance colors and make it look more professional. Keep the original composition and content intact.";
        break;
      case 'stabilize':
        prompt = "Analyze this video frame for camera shake and motion blur. Describe the stabilization needed and any corrections required.";
        break;
      case 'denoise':
        prompt = "Remove noise and grain from this image while preserving details and sharpness. Output a clean, high-quality version.";
        break;
      case 'upscale':
        prompt = "Upscale and enhance the resolution of this image. Add fine details, improve clarity, and make it suitable for larger displays while maintaining natural appearance.";
        break;
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }

    // Image processing tools use Lovable AI Gateway with image generation
    if (tool === 'enhance' || tool === 'denoise' || tool === 'upscale') {
      if (!inputData) {
        throw new Error("Image data is required for this tool");
      }

      const imageUrl = inputData.startsWith("data:") ? inputData : `data:image/png;base64,${inputData}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImage) throw new Error(`${tool} processing failed - no output generated`);

      return new Response(
        JSON.stringify({ success: true, tool, outputUrl: generatedImage, message: `${tool} completed successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Text-based analysis tools (autocut, stabilize)
    const content: any[] = [{ type: "text", text: prompt }];
    if (inputData) {
      content.push({ type: "image_url", image_url: { url: inputData.startsWith("data:") ? inputData : `data:image/png;base64,${inputData}` } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({ success: true, tool, analysis: analysisResult, message: `${tool} analysis completed` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing AI tool:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
