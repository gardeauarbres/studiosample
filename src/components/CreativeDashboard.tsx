import { useState, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Award,
  Brain,
  Trophy,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ComingSoonDialog } from './ComingSoonDialog';
import { useUserStats } from '@/hooks/useUserStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreativeInsights {
  summary: string;
  strengths: string[];
  suggestions: string[];
  nextSteps: string[];
  styleDescription: string;
  productivityScore: number;
}

export const CreativeDashboard = memo(() => {
  const navigate = useNavigate();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [insights, setInsights] = useState<CreativeInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insightsTimestamp, setInsightsTimestamp] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const { userStats, isLoading } = useUserStats(userId);

  // Memoize stats calculation to prevent unnecessary recalculations
  const stats = useMemo(() => ({
    totalSamples: userStats?.total_samples ?? 0,
    favorites: userStats?.favorites ?? 0,
    totalEffects: userStats?.total_effects ?? 0,
    level: userStats?.level ?? 1,
    xp: userStats?.xp ?? 0,
  }), [userStats]);

  const fetchCreativeInsights = async () => {
    if (stats.level < 2) {
      toast.error('Cette fonctionnalité est disponible à partir du niveau 2');
      return;
    }

    setIsLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('creative-insights');

      if (error) {
        console.error('Error fetching insights:', error);
        // Provide more detailed error messages
        let errorMessage = 'Impossible de récupérer les insights créatifs';
        if (error.message?.includes('non-2xx')) {
          errorMessage = 'Le serveur a renvoyé une erreur. Vérifiez que la fonction Edge est bien déployée.';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast.error('Erreur lors du chargement des insights', {
          description: errorMessage
        });
        return;
      }

      if (data && data.insights) {
        setInsights(data.insights);
        setInsightsTimestamp(data.timestamp || new Date().toISOString());
        toast.success('Insights actualisés avec succès !');
      } else if (data && data.error) {
        toast.error('Erreur du serveur', {
          description: data.error || 'Une erreur est survenue lors du traitement'
        });
      } else {
        toast.warning('Aucune donnée reçue', {
          description: 'La fonction a répondu mais sans données. Vous pouvez réessayer.'
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      let errorMessage = 'Une erreur est survenue';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error('Erreur lors du chargement des insights', {
        description: errorMessage
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  // Auto-load insights if level >= 2 and no insights yet
  useEffect(() => {
    if (stats.level >= 2 && !insights && !isLoadingInsights && userId) {
      fetchCreativeInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.level, userId]);

  // Memoize defaultInsights calculation
  const defaultInsights = useMemo(() => ({
    timestamp: insightsTimestamp || new Date().toISOString(),
    productivityScore: Math.min(100, Math.floor((stats.totalSamples * 5) + (stats.totalEffects * 3))),
  }), [insightsTimestamp, stats.totalSamples, stats.totalEffects]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Dashboard Créatif
          </h2>
          <p className="text-muted-foreground mt-1">
            {insights 
              ? `Analysé par IA • Dernière mise à jour: ${new Date(insightsTimestamp || defaultInsights.timestamp).toLocaleString('fr-FR')}`
              : stats.level >= 2 
                ? 'Analysé par IA • Cliquez pour charger les insights'
                : 'Disponible à partir du niveau 2'
            }
          </p>
        </div>
        {stats.level >= 2 ? (
          <Button 
            onClick={fetchCreativeInsights} 
            variant="outline"
            disabled={isLoadingInsights}
          >
            {isLoadingInsights ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {insights ? 'Actualiser Insights' : 'Charger Insights'}
              </>
            )}
          </Button>
        ) : (
          <Button onClick={() => setComingSoonOpen(true)} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            En savoir plus
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Samples Créés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalSamples}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalSamples === 0 ? 'aucun sample créé' : `${stats.totalSamples} sample${stats.totalSamples > 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Niveau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.level}</div>
            <Progress value={(stats.xp % 1000) / 10} className="mt-2" aria-label={`Progression XP: ${Math.round((stats.xp % 1000) / 10)}%`} />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.xp % 1000} / 1000 XP
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Favoris</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.favorites}</div>
            <p className="text-xs text-muted-foreground mt-1">
              samples sauvegardés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productivité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(insights?.productivityScore ?? defaultInsights.productivityScore)}%</div>
            <Progress value={insights?.productivityScore ?? defaultInsights.productivityScore} className="mt-2" aria-label={`Score de productivité: ${insights?.productivityScore ?? defaultInsights.productivityScore}%`} />
          </CardContent>
        </Card>
      </div>

      {/* Badges & Rewards Card */}
      <Card 
        className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border-2 border-primary/30 cursor-pointer hover:border-primary/50 transition-all"
        onClick={() => navigate('/badges')}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Badges & Récompenses
          </CardTitle>
          <CardDescription>Consultez tous vos badges et votre classement</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline">
            <Award className="w-4 h-4 mr-2" />
            Voir tous les badges
          </Button>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Insights IA Personnalisés
          </CardTitle>
          <CardDescription>
            {stats.level >= 2 
              ? 'Analyses créatives propulsées par l\'IA Gemini'
              : 'Disponible à partir du niveau 2'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {stats.level < 2 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Atteignez le niveau 2 pour débloquer les insights créatifs personnalisés !
              </p>
              <Button onClick={() => setComingSoonOpen(true)} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                En savoir plus
              </Button>
            </div>
          ) : isLoadingInsights && !insights ? (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">
                Chargement des insights créatifs...
              </p>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Summary */}
              {insights.summary && (
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <h3 className="font-semibold text-foreground mb-2">Résumé</h3>
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                </div>
              )}

              {/* Strengths */}
              {insights.strengths && insights.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Points Forts</h3>
                  <ul className="space-y-2">
                    {insights.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {insights.suggestions && insights.suggestions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Suggestions</h3>
                  <ul className="space-y-2">
                    {insights.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-accent mt-1">💡</span>
                        <span className="text-muted-foreground">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {insights.nextSteps && insights.nextSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Prochaines Étapes</h3>
                  <ul className="space-y-2">
                    {insights.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">→</span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Style Description */}
              {insights.styleDescription && (
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h3 className="font-semibold text-foreground mb-2">Style de Production</h3>
                  <p className="text-sm text-muted-foreground">{insights.styleDescription}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Cliquez sur "Charger Insights" pour générer vos insights créatifs personnalisés
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ComingSoonDialog 
        open={comingSoonOpen} 
        onOpenChange={setComingSoonOpen}
        featureName="Insights Créatifs IA"
      />
    </div>
  );
});

CreativeDashboard.displayName = 'CreativeDashboard';
