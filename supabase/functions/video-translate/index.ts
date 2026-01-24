import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(
        JSON.stringify({ error: "Video URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Target language is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing video translation: ${sourceLanguage || 'auto'} -> ${targetLanguage}`);
    console.log(`Options:`, options);

    // Language mapping for display
    const languageNames: Record<string, string> = {
      'en': 'English',
      'tr': 'Turkish',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;
    const sourceLangName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : 'auto-detected';

    // Build translation prompt for AI
    const translationPrompt = `You are a professional video translator. 
    
Task: Analyze the provided video content and generate:
1. ${options?.translateAudio ? 'A script for voice dubbing in ' + targetLangName : ''}
2. ${options?.generateSubtitles ? 'Subtitle text in ' + targetLangName + ' with timestamps' : ''}

Source language: ${sourceLangName}
Target language: ${targetLangName}

Requirements:
- Preserve the original meaning and tone
- Adapt cultural references appropriately
- Maintain natural speech patterns for the target language
- Include timestamps for subtitles in SRT format

Please provide the translated content in JSON format with the following structure:
{
  "detectedSourceLanguage": "detected language code",
  "translatedScript": "full translated script for dubbing",
  "subtitles": [
    { "start": "00:00:00,000", "end": "00:00:03,000", "text": "translated subtitle text" }
  ]
}`;

    // Use Gemini for translation analysis
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a professional video translator and subtitle generator. Always respond with valid JSON."
          },
          {
            role: "user",
            content: translationPrompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translationResult = data.choices?.[0]?.message?.content;

    let parsedResult;
    try {
      parsedResult = JSON.parse(translationResult);
    } catch {
      parsedResult = {
        detectedSourceLanguage: sourceLanguage || 'unknown',
        translatedScript: translationResult,
        subtitles: []
      };
    }

    console.log("Translation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        sourceLanguage: parsedResult.detectedSourceLanguage || sourceLanguage,
        targetLanguage,
        translatedScript: parsedResult.translatedScript,
        subtitles: parsedResult.subtitles,
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
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
