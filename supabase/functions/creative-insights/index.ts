import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('Fetching creative insights for user:', user.id);

    // Fetch user samples
    const { data: samples, error: samplesError } = await supabaseClient
      .from('samples')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (samplesError) throw samplesError;

    // Fetch user stats
    const { data: stats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') throw statsError;

    // Fetch analytics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('user_analytics')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (analyticsError && analyticsError.code !== 'PGRST116') throw analyticsError;

    // Prepare data for AI analysis
    const aiSamples = samples?.filter(s => s.ai_generated) || [];
    const totalSamples = samples?.length || 0;
    const recentSamples = samples?.slice(0, 10) || [];
    
    const allEffects = samples?.flatMap((s: any) => s.effects || []) || [];
    const effectCounts = allEffects.reduce((acc: Record<string, number>, effect: string) => {
      acc[effect] = (acc[effect] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allGenres = samples?.flatMap((s: any) => s.genre_tags || []) || [];
    const genreCounts = allGenres.reduce((acc: Record<string, number>, genre: string) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Call Google Gemini API for insights (or use default if not configured)
    const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    
    let insights;
    
    if (!GOOGLE_GEMINI_API_KEY) {
      // Generate default insights without AI if API key not configured
      console.log('GOOGLE_GEMINI_API_KEY not configured, using default insights');
      insights = {
        summary: `Vous avez créé ${totalSamples} samples avec ${stats?.total_effects || 0} effets appliqués. ${totalSamples > 10 ? 'Continuez à explorer de nouveaux sons !' : 'Votre parcours créatif commence !'}`,
        strengths: [
          totalSamples > 10 ? "Production régulière" : "Début de votre parcours créatif",
          (stats?.total_effects || 0) > 5 ? "Expérimentation avec les effets" : "Exploration des effets",
          (stats?.favorites || 0) > 0 ? "Samples favoris identifiés" : "Construction de votre style"
        ],
        suggestions: [
          "Essayez de nouveaux effets pour diversifier votre son",
          "Créez des samples dans différents genres",
          "Explorez les combinaisons d'effets"
        ],
        nextSteps: [
          "Continuez à créer régulièrement",
          "Expérimentez avec différents styles"
        ],
        styleDescription: totalSamples > 20 ? "Producteur actif" : totalSamples > 5 ? "Producteur émergent" : "Producteur débutant",
        productivityScore: Math.min(100, Math.floor((totalSamples * 5) + (stats?.total_effects || 0) * 3))
      };
    } else {

    const prompt = `Analyze this music producer's creative patterns and provide personalized insights:

**Stats:**
- Total samples created: ${totalSamples}
- AI-generated samples: ${aiSamples.length}
- Favorite count: ${stats?.favorites || 0}
- Total effects applied: ${stats?.total_effects || 0}
- Level: ${stats?.level || 1}

**Most used effects:** ${Object.entries(effectCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([e, c]) => `${e} (${c}x)`).join(', ') || 'None yet'}

**Genre preferences:** ${Object.entries(genreCounts).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5).map(([g, c]) => `${g} (${c}x)`).join(', ') || 'Not tagged yet'}

**Recent activity:** ${analytics?.length || 0} sessions in last 30 days

Provide a JSON response with these fields:
{
  "summary": "Brief overview of their creative style (2-3 sentences)",
  "strengths": ["strength1", "strength2", "strength3"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "nextSteps": ["step1", "step2"],
  "styleDescription": "Description of their musical style",
  "productivityScore": 85
}

Be encouraging, specific, and creative. Focus on their unique patterns.`;

    const systemPrompt = 'You are a creative music production coach analyzing user patterns. Always respond with valid JSON.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      // Call Google Gemini API
      const aiResponse = await fetch(
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

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI API error:', aiResponse.status, errorText);
        // Fallback to default insights if API fails
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      console.log('AI Response:', aiContent);

      // Parse AI response (handle potential JSON in markdown)
      try {
        const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiContent;
        insights = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback to default insights
        insights = {
          summary: `Vous avez créé ${totalSamples} samples. Continuez à explorer !`,
          strengths: ["Consistent practice", "Exploring different sounds"],
          suggestions: ["Try new effects", "Experiment with genres"],
          nextSteps: ["Create more samples", "Build a unique style"],
          styleDescription: "Emerging producer",
          productivityScore: Math.min(100, Math.floor((totalSamples * 5) + (stats?.total_effects || 0) * 3))
        };
      }
    }

    // Compile complete analytics
    const result = {
      stats: {
        totalSamples,
        aiSamples: aiSamples.length,
        favorites: stats?.favorites || 0,
        totalEffects: stats?.total_effects || 0,
        level: stats?.level || 1,
        xp: stats?.xp || 0,
      },
      topEffects: Object.entries(effectCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count: count as number })),
      topGenres: Object.entries(genreCounts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count: count as number })),
      recentActivity: analytics || [],
      insights,
      timestamp: new Date().toISOString(),
    };

    console.log('Insights generated successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in creative-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
