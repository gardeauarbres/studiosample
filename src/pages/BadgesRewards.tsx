import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Zap, Music, Award, Crown, Star, Target, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserStats } from '@/hooks/useUserStats';
import { useLeaderboard } from '@/hooks/useLeaderboard';

const allBadges = [
  { id: 'first_sample', name: 'Premier Sample', icon: Music, requirement: 1, type: 'samples', description: 'Enregistrez votre premier sample', rarity: 'common' },
  { id: 'ten_samples', name: '10 Samples', icon: Trophy, requirement: 10, type: 'samples', description: 'Créez 10 samples', rarity: 'common' },
  { id: 'fifty_samples', name: '50 Samples', icon: Award, requirement: 50, type: 'samples', description: 'Atteignez 50 samples', rarity: 'rare' },
  { id: 'hundred_samples', name: '100 Samples', icon: Crown, requirement: 100, type: 'samples', description: 'Un siècle de samples !', rarity: 'epic' },
  { id: 'effect_master', name: 'Maître des Effets', icon: Zap, requirement: 5, type: 'effects', description: 'Appliquez 5 effets', rarity: 'common' },
  { id: 'effect_guru', name: 'Gourou des Effets', icon: Star, requirement: 25, type: 'effects', description: 'Appliquez 25 effets', rarity: 'rare' },
  { id: 'effect_legend', name: 'Légende des Effets', icon: Crown, requirement: 100, type: 'effects', description: 'Maîtrisez 100 effets !', rarity: 'epic' },
  { id: 'level_5', name: 'Niveau 5', icon: Target, requirement: 5, type: 'level', description: 'Atteignez le niveau 5', rarity: 'common' },
  { id: 'level_10', name: 'Niveau 10', icon: Target, requirement: 10, type: 'level', description: 'Atteignez le niveau 10', rarity: 'rare' },
  { id: 'level_20', name: 'Niveau 20', icon: Crown, requirement: 20, type: 'level', description: 'Atteignez le niveau 20', rarity: 'epic' },
];

const rarityColors = {
  common: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  rare: 'bg-primary/20 text-primary border-primary/30',
  epic: 'bg-accent/20 text-accent-foreground border-accent/30',
};

const BadgesRewards = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Use optimized hooks with caching
  const { userStats: currentUserStats, isLoading: statsLoading } = useUserStats(userId);
  const { data: topUsers, isLoading: leaderboardLoading } = useLeaderboard(10);

  const loading = statsLoading || leaderboardLoading;

  const isUnlocked = (badge: typeof allBadges[0]) => {
    if (!currentUserStats) return false;
    if (badge.type === 'samples') return (currentUserStats.total_samples ?? 0) >= badge.requirement;
    if (badge.type === 'effects') return (currentUserStats.total_effects ?? 0) >= badge.requirement;
    if (badge.type === 'level') return (currentUserStats.level ?? 0) >= badge.requirement;
    return false;
  };

  const getProgress = (badge: typeof allBadges[0]) => {
    if (!currentUserStats) return 0;
    let current = 0;
    if (badge.type === 'samples') current = currentUserStats.total_samples ?? 0;
    if (badge.type === 'effects') current = currentUserStats.total_effects ?? 0;
    if (badge.type === 'level') current = currentUserStats.level ?? 0;
    return Math.min((current / badge.requirement) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au Dashboard
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Badges & Récompenses</h1>
          <p className="text-muted-foreground">Débloquez tous les badges et grimpez dans le classement !</p>
        </div>

        {/* User Progress Overview */}
        {currentUserStats && (
          <Card className="p-6 bg-card/80 backdrop-blur border-2 border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Niveau {currentUserStats.level}</h2>
                <p className="text-sm text-muted-foreground">{currentUserStats.xp} XP</p>
              </div>
              <Trophy className="h-12 w-12 text-primary" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{currentUserStats.total_samples}</div>
                <div className="text-sm text-muted-foreground">Samples</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">{currentUserStats.total_effects}</div>
                <div className="text-sm text-muted-foreground">Effets</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{currentUserStats.favorites}</div>
                <div className="text-sm text-muted-foreground">Favoris</div>
              </div>
            </div>
            {currentUserStats.total_samples === 0 && currentUserStats.total_effects === 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Commencez à créer des samples et appliquez des effets pour débloquer des badges !
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                >
                  Aller à l'enregistreur
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* All Badges */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Tous les badges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allBadges.map(badge => {
              const unlocked = isUnlocked(badge);
              const progress = getProgress(badge);
              const Icon = badge.icon;

              return (
                <Card 
                  key={badge.id} 
                  className={`p-6 transition-all ${
                    unlocked 
                      ? 'bg-card/90 backdrop-blur border-2 border-primary' 
                      : 'bg-card/50 backdrop-blur border border-border opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${unlocked ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`h-6 w-6 ${unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{badge.name}</h3>
                          <p className="text-sm text-muted-foreground">{badge.description}</p>
                        </div>
                        <Badge className={rarityColors[badge.rarity as keyof typeof rarityColors]}>
                          {badge.rarity}
                        </Badge>
                      </div>
                      {!unlocked && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progression</span>
                            <span>
                              {badge.type === 'samples' && `${currentUserStats?.total_samples || 0}/${badge.requirement}`}
                              {badge.type === 'effects' && `${currentUserStats?.total_effects || 0}/${badge.requirement}`}
                              {badge.type === 'level' && `${currentUserStats?.level || 1}/${badge.requirement}`}
                              {' '}({Math.round(progress)}%)
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" aria-label={`Progression pour ${badge.name}: ${Math.round(progress)}%`} />
                        </div>
                      )}
                      {unlocked && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                          ✓ Débloqué
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Classement des meilleurs</h2>
          <Card className="p-6 bg-card/80 backdrop-blur border-2 border-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : topUsers && topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div 
                    key={user.user_id}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      currentUserStats?.user_id === user.user_id 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                      {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                      {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                      {index === 2 && <Award className="h-5 w-5 text-amber-700" />}
                      {index > 2 && <span className="font-bold text-foreground">#{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{user.username}</div>
                      <div className="text-sm text-muted-foreground">
                        Niveau {user.level} • {user.total_samples} samples • {user.total_effects} effets
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{user.xp} XP</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun utilisateur dans le classement pour le moment.</p>
                <p className="text-sm text-muted-foreground mt-2">Soyez le premier à créer des samples !</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BadgesRewards;
