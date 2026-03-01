import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TTSRequest {
  text: string;
  voiceId?: string;
  language?: string;
}

// Voice IDs optimized for different languages
const languageVoices: Record<string, string> = {
  'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah - natural English
  'tr': 'onwK4e9ZLuTAKqWW03F9', // Daniel - works well for Turkish
  'ro': 'N2lVS1w4EtoT3dr4eOWO', // Callum - multilingual fallback for Romanian
  'es': 'FGY2WhTYpPnrIDTdsKH5', // Laura - great for Spanish
  'fr': 'XrExE9yKIg1WjnnlVkGX', // Matilda - elegant for French
  'de': 'JBFqnCBsd6RMkjVDRZzb', // George - clear German
  'it': 'pFZP5JQG7iQjIQuC4Bku', // Lily - expressive Italian
  'pt': 'N2lVS1w4EtoT3dr4eOWO', // Callum - Portuguese
  'ru': 'TX3LPaxmHKxFdv7VOQHJ', // Liam - Russian
  'ja': 'cgSgspJ2msm6clMCkdW9', // Jessica - Japanese
  'ko': 'iP95p4xoKVk53GoZ742B', // Chris - Korean
  'zh': 'Xb7hH8MSUJpSbSDYk0k2', // Alice - Chinese
  'ar': 'bIHbv24MWmeRgasZH58o', // Will - Arabic
  'hi': 'cjVigY5qzO86Huf0OWal', // Eric - Hindi
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, language }: TTSRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select voice based on language or use provided voiceId
    const selectedVoiceId = voiceId || languageVoices[language || 'en'] || languageVoices['en'];

    console.log(`Generating TTS for language: ${language}, voice: ${selectedVoiceId}`);
    console.log(`Text length: ${text.length} characters`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      // NOTE: We can only consume the body once. Read as text and parse JSON safely.
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);

      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = null;
      }

      const detail = errorJson?.detail;

      if (response.status === 401) {
        // Check for unusual activity / free tier restriction
        if (detail?.status === "detected_unusual_activity") {
          return new Response(
            JSON.stringify({
              error:
                "ElevenLabs free plan restriction (unusual activity). Voice dubbing requires a paid plan or a different ElevenLabs account/API key.",
              code: "FREE_TIER_RESTRICTED",
              provider_status: detail?.status,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            error: "Invalid ElevenLabs API key",
            code: "INVALID_API_KEY",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log(`Generated audio: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (error) {
    console.error("Error generating TTS:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
