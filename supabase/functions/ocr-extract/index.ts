import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Gemini API key first, then Lovable AI gateway
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    let extractedText = "";

    if (geminiKey) {
      extractedText = await extractWithGeminiNative(geminiKey, imageBase64, mimeType);
    } else if (lovableKey) {
      extractedText = await extractWithLovableAI(lovableKey, imageBase64, mimeType);
    } else {
      throw new Error("No API key configured for OCR");
    }

    return new Response(
      JSON.stringify({ success: true, text: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OCR error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    const status = message.includes("Rate limit") ? 429 : message.includes("credits") ? 402 : 500;

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractWithGeminiNative(
  apiKey: string,
  imageBase64: string,
  mimeType?: string
): Promise<string> {
  const mime = mimeType || "image/png";
  let base64Data = imageBase64;
  if (base64Data.startsWith("data:")) {
    base64Data = base64Data.split(",")[1];
  }

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Extract ALL text from this image. Return only the extracted text, nothing else. If there are multiple languages, preserve them. If no text is found, return an empty string.",
              },
              {
                inlineData: { mimeType: mime, data: base64Data },
              },
            ],
          },
        ],
      }),
    });

    if (response.status === 404) continue;
    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) throw new Error("Rate limit exceeded.");
      throw new Error(`Gemini API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  throw new Error("No compatible Gemini model available");
}

async function extractWithLovableAI(
  apiKey: string,
  imageBase64: string,
  mimeType?: string
): Promise<string> {
  const mime = mimeType || "image/png";
  let dataUrl = imageBase64;
  if (!dataUrl.startsWith("data:")) {
    dataUrl = `data:${mime};base64,${imageBase64}`;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this image. Return only the extracted text, nothing else. If there are multiple languages, preserve them. If no text is found, return an empty string.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}
