import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getGoogleApiKey(): string {
  const key = Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (key) return key;
  throw new Error("GOOGLE_CLOUD_API_KEY is not configured");
}

interface TranscriptRequest {
  videoUrl: string;
  includeEmptySeconds?: boolean;
}

interface TranscriptLine {
  second: number;
  text: string;
}

const normalizeTranscript = (input: unknown): TranscriptLine[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((line) => {
      if (!line || typeof line !== "object") return null;
      const second = Number((line as Record<string, unknown>).second);
      const text = String((line as Record<string, unknown>).text ?? "").trim();
      if (!Number.isFinite(second) || second < 0 || !text) return null;
      return { second: Math.floor(second), text };
    })
    .filter((line): line is TranscriptLine => Boolean(line))
    .sort((a, b) => a.second - b.second);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, includeEmptySeconds }: TranscriptRequest = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Video URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = getGoogleApiKey();

    const prompt = `Analyze the speech in this video and create a second-by-second transcript.

Video URL: ${videoUrl}

Requirements:
- Return valid JSON only
- JSON schema:
  {
    "detectedLanguage": "language code",
    "durationSeconds": 0,
    "transcript": [
      { "second": 0, "text": "spoken words in this second" }
    ]
  }
- "second" must be integer and start from 0
- Keep each entry concise and aligned with spoken content of that second
- ${includeEmptySeconds ? "Include empty seconds with text '[silence]' when nobody speaks." : "Skip seconds with no speech."}
- If video cannot be processed, include an "error" field`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert speech-to-text assistant. Always return strictly valid JSON with no markdown wrapper." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawResult = data.choices?.[0]?.message?.content;

    if (!rawResult) throw new Error("AI response did not include transcript content");

    let parsedResult: Record<string, unknown>;
    try { parsedResult = JSON.parse(rawResult); } catch { throw new Error("AI response was not valid JSON"); }

    if (parsedResult.error) {
      return new Response(JSON.stringify({ error: String(parsedResult.error) }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = normalizeTranscript(parsedResult.transcript);

    return new Response(
      JSON.stringify({
        success: true,
        detectedLanguage: parsedResult.detectedLanguage ?? "unknown",
        durationSeconds: typeof parsedResult.durationSeconds === "number" ? Math.max(0, Math.floor(parsedResult.durationSeconds)) : null,
        transcript,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating transcript:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
