import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getApiConfig(): { apiKey: string; useLovable: boolean } {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (geminiKey) return { apiKey: geminiKey, useLovable: false };
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return { apiKey: lovableKey, useLovable: true };
  throw new Error("No API key configured");
}

interface AIToolRequest {
  tool: 'autocut' | 'enhance' | 'stabilize' | 'denoise' | 'upscale' | 'watermark-remove';
  videoBase64?: string;
  imageBase64?: string;
  options?: { style?: string; strength?: number; targetFps?: number };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, videoBase64, imageBase64, options }: AIToolRequest = await req.json();

    if (!tool) {
      return new Response(JSON.stringify({ error: "Tool type is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { apiKey, useLovable } = getApiConfig();
    console.log(`Processing AI tool: ${tool}, useLovable=${useLovable}`);

    let prompt = "";
    const inputData = imageBase64 || videoBase64;

    switch (tool) {
      case 'autocut': prompt = "Analyze this video frame and identify the best cut points. Look for scene changes, significant motion changes, and natural pause points. Return a JSON with suggested timestamps for cuts."; break;
      case 'enhance': prompt = "Enhance this image quality. Improve sharpness, reduce noise, enhance colors and make it look more professional. Keep the original composition intact."; break;
      case 'stabilize': prompt = "Analyze this video frame for camera shake and motion blur. Describe the stabilization needed and corrections required."; break;
      case 'denoise': prompt = "Remove noise and grain from this image while preserving details and sharpness. Output a clean, high-quality version."; break;
      case 'upscale': prompt = "Upscale and enhance the resolution of this image. Add fine details, improve clarity while maintaining natural appearance."; break;
      case 'watermark-remove': prompt = "Remove visible watermark/logo/text overlays from this visual. Fill the removed area naturally by matching nearby texture, color and lighting. Preserve original composition and quality."; break;
      default: throw new Error(`Unknown tool: ${tool}`);
    }

    // Image processing tools
    if (tool === 'enhance' || tool === 'denoise' || tool === 'upscale' || tool === 'watermark-remove') {
      if (!inputData) throw new Error("Image data is required for this tool");

      let generatedImage: string | null = null;

      if (useLovable) {
        const imageUrl = inputData.startsWith("data:") ? inputData : `data:image/png;base64,${inputData}`;
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }],
            modalities: ["image", "text"],
          }),
        });
        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`AI error: ${response.status}`);
        }
        const data = await response.json();
        generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      } else {
        let imageData = inputData, mimeType = "image/png";
        if (inputData.startsWith("data:")) {
          const match = inputData.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) { mimeType = match[1]; imageData = match[2]; }
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: imageData } }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        });
        if (!response.ok) {
          if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          throw new Error(`Gemini API error: ${response.status}`);
        }
        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) { generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; break; }
          }
        }
      }

      if (!generatedImage) throw new Error(`${tool} processing failed - no output generated`);

      return new Response(
        JSON.stringify({ success: true, tool, outputUrl: generatedImage, message: `${tool} completed successfully` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Text-based analysis tools (autocut, stabilize)
    if (useLovable) {
      const content: any[] = [{ type: "text", text: prompt }];
      if (inputData) content.push({ type: "image_url", image_url: { url: inputData.startsWith("data:") ? inputData : `data:image/png;base64,${inputData}` } });
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content }] }),
      });
      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      const analysisResult = data.choices?.[0]?.message?.content;
      return new Response(JSON.stringify({ success: true, tool, analysis: analysisResult, message: `${tool} analysis completed` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      const openaiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      const content: any[] = inputData ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: inputData.startsWith("data:") ? inputData : `data:image/png;base64,${inputData}` } }] : [{ type: "text", text: prompt }];
      const response = await fetch(openaiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gemini-2.5-flash", messages: [{ role: "user", content }] }),
      });
      if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
      const data = await response.json();
      const analysisResult = data.choices?.[0]?.message?.content;
      return new Response(JSON.stringify({ success: true, tool, analysis: analysisResult, message: `${tool} analysis completed` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    console.error("Error processing AI tool:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
