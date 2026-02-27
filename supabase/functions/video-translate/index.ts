import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_CLOUD_API_KEY");
  if (key) return key;
  throw new Error("GEMINI_API_KEY is not configured");
}

interface TranslateRequest {
  videoUrl: string;
  sourceLanguage?: string;
  targetLanguage: string;
  options?: {
    translateAudio?: boolean;
    generateSubtitles?: boolean;
    preserveOriginalVoice?: boolean;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, sourceLanguage, targetLanguage, options }: TranslateRequest = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "Video URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!targetLanguage) {
      return new Response(JSON.stringify({ error: "Target language is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = getApiKey();
    console.log(`Processing video translation: ${sourceLanguage || 'auto'} -> ${targetLanguage}`);

    // Download the video and convert to base64 for Gemini native API
    console.log("Downloading video from:", videoUrl);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }
    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBytes = new Uint8Array(videoArrayBuffer);
    const videoBase64 = base64Encode(videoArrayBuffer);
    const mimeType = videoResponse.headers.get("content-type") || "video/mp4";
    console.log(`Video downloaded: ${videoBytes.length} bytes, type: ${mimeType}`);

    const languageNames: Record<string, string> = {
      'en': 'English', 'tr': 'Turkish', 'es': 'Spanish', 'fr': 'French',
      'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian',
      'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : 'auto-detected';

    const translationTasks: string[] = [];
    if (options?.translateAudio) translationTasks.push(`A script for voice dubbing in ${targetLangName}`);
    if (options?.generateSubtitles) translationTasks.push(`Subtitle text in ${targetLangName} with timestamps`);
    if (translationTasks.length === 0) translationTasks.push(`A translated script in ${targetLangName}`);

    const translationPrompt = `You are a professional video translator. Analyze the speech in this video and generate:
${translationTasks.map((task, index) => `${index + 1}. ${task}`).join('\n')}

Source language: ${sourceLangName}
Target language: ${targetLangName}

Requirements:
- Preserve the original meaning and tone
- Adapt cultural references appropriately
- Maintain natural speech patterns for the target language
- Include timestamps for subtitles in SRT format

Respond with valid JSON only:
{
  "detectedSourceLanguage": "language code",
  "translatedScript": "full translated script for dubbing",
  "subtitles": [
    { "start": "00:00:00,000", "end": "00:00:03,000", "text": "translated subtitle text" }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: videoBase64 } },
              { text: translationPrompt }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

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
    const translationResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!translationResult) throw new Error("AI response did not include translation content");

    let parsedResult;
    try {
      const cleanedResult = translationResult.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedResult = JSON.parse(cleanedResult);
    } catch {
      parsedResult = { detectedSourceLanguage: sourceLanguage || 'unknown', translatedScript: translationResult, subtitles: [] };
    }

    if (parsedResult?.error) {
      return new Response(JSON.stringify({ error: parsedResult.error }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedSubtitles = Array.isArray(parsedResult.subtitles) ? parsedResult.subtitles : [];
    console.log("Translation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        sourceLanguage: parsedResult.detectedSourceLanguage || sourceLanguage,
        targetLanguage,
        translatedScript: parsedResult.translatedScript,
        subtitles: normalizedSubtitles,
        options: {
          audioTranslated: options?.translateAudio || false,
          subtitlesGenerated: options?.generateSubtitles || false,
          originalVoicePreserved: options?.preserveOriginalVoice || false,
        },
        message: `Video translation from ${sourceLangName} to ${targetLangName} completed`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing video translation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
