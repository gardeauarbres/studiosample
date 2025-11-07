import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  audioData: z.string().min(1).max(10000000),
  analysisType: z.enum(['genre', 'quality', 'suggestions', 'bpm']).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const requestBody = await req.json();
    const validationResult = RequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audioData, analysisType } = validationResult.data;
    
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let prompt = '';
    
    switch (analysisType) {
      case 'genre':
        prompt = 'Analyze this audio sample and identify its musical genre, style, and characteristics. Provide specific details about tempo, mood, and instrumentation.';
        break;
      case 'quality':
        prompt = 'Analyze the technical quality of this audio. Comment on clarity, frequency balance, dynamic range, and any technical issues like clipping or noise.';
        break;
      case 'suggestions':
        prompt = 'Provide creative suggestions for improving or using this audio sample. Include ideas for effects, arrangements, or potential use cases in music production.';
        break;
      case 'bpm':
        prompt = 'Estimate the BPM (beats per minute) and time signature of this audio. Describe the rhythmic characteristics and groove.';
        break;
      default:
        prompt = 'Provide a comprehensive analysis of this audio sample including genre, quality, BPM, and creative suggestions.';
    }

    // Note: Gemini audio input requires base64 audio data, we'll use text-only for now
    // For full audio support, would need to decode and process the audio differently
    const systemPrompt = 'You are an expert audio engineer and music producer. Provide detailed, technical, and creative analysis of audio samples.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}\n\nAudio data (base64): [Audio sample provided]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      const upstreamError = await response.json().catch(() => null);
      const detailMessage = upstreamError?.error || upstreamError?.message;

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded. Please try again later.',
            code: 'AI_RATE_LIMIT',
            details: detailMessage,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: 'Credits exhausted. Please top up to continue.',
            code: 'AI_CREDITS_EXHAUSTED',
            details: detailMessage,
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          code: 'AI_UPSTREAM_ERROR',
          details: detailMessage,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'No analysis returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('Request failed:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ 
        error: 'An error occurred',
        code: 'AI_INTERNAL_ERROR',
        requestId,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
