import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  sampleName: z.string().trim().min(1).max(200),
  duration: z.number().min(0).max(600), // Allow 0 duration for newly created samples
  action: z.enum(['analyze', 'suggest-effects', 'generate-name', 'find-similar']),
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

    const { sampleName, duration, action } = validationResult.data;
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

    if (!GOOGLE_GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'analyze':
        systemPrompt = `Tu es un expert en analyse audio et production musicale. Analyse les samples audio et fournis des insights détaillés sur le BPM estimé, la tonalité probable, le genre musical et l'ambiance. Sois précis et créatif.`;
        userPrompt = `Analyse ce sample audio nommé "${sampleName}" d'une durée de ${duration} secondes. Fournis:
1. BPM estimé (basé sur le nom et la durée)
2. Tonalité probable
3. Genre musical
4. Ambiance/mood
5. Suggestions d'utilisation

Format ta réponse en JSON: {"bpm": number, "key": string, "genre": string, "mood": string, "suggestions": string[]}`;
        break;

      case 'suggest-effects':
        systemPrompt = `Tu es un ingénieur du son expert. Suggère des effets audio pertinents et créatifs basés sur le contexte du sample.`;
        userPrompt = `Pour ce sample "${sampleName}" (${duration}s), suggère 3-5 effets audio qui amélioreraient le son. Sois créatif et explique pourquoi chaque effet fonctionnerait bien.

Format JSON: {"effects": [{"name": string, "reason": string, "parameters": string}]}`;
        break;

      case 'generate-name':
        systemPrompt = `Tu es un créatif spécialisé dans le naming audio. Génère des noms accrocheurs et évocateurs pour des samples audio.`;
        userPrompt = `Génère 5 noms créatifs et professionnels pour un sample audio actuellement nommé "${sampleName}" (${duration}s). Les noms doivent être courts, mémorables et évoquer le son.

Format JSON: {"names": [string]}`;
        break;

      case 'find-similar':
        systemPrompt = `Tu es un expert en sound design et classification audio. Identifie des caractéristiques sonores pour trouver des samples similaires.`;
        userPrompt = `Basé sur ce sample "${sampleName}" (${duration}s), décris 3-4 caractéristiques sonores clés qu'on pourrait rechercher dans d'autres samples similaires.

Format JSON: {"characteristics": [string], "searchTips": string}`;
        break;
    }

    // Combine system and user prompts for Gemini
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

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
            temperature: 0.8,
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
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: 'Credits exhausted. Please add credits to continue.',
            code: 'AI_CREDITS_EXHAUSTED',
            details: detailMessage,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
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
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response from service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('AI response parsing failed:', parseError);
      result = { raw: aiResponse };
    }

    return new Response(
      JSON.stringify({ success: true, result }),
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
