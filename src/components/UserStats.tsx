import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Music, Award } from 'lucide-react';

interface Stats {
  totalSamples: number;
  totalEffects: number;
  favorites: number;
  level: number;
  xp: number;
}

interface UserStatsProps {
  stats: Stats;
}

const badges = [
  { id: 'first_sample', name: 'Premier Sample', icon: Music, requirement: 1, type: 'samples' },
  { id: 'ten_samples', name: '10 Samples', icon: Trophy, requirement: 10, type: 'samples' },
  { id: 'fifty_samples', name: '50 Samples', icon: Award, requirement: 50, type: 'samples' },
  { id: 'effect_master', name: 'Maître des Effets', icon: Zap, requirement: 5, type: 'effects' },
];

export const UserStats = ({ stats }: UserStatsProps) => {
  const xpForNextLevel = stats.level * 100;
  const progressPercent = (stats.xp / xpForNextLevel) * 100;

  const unlockedBadges = badges.filter(badge => {
    if (badge.type === 'samples') return stats.totalSamples >= badge.requirement;
    if (badge.type === 'effects') return stats.totalEffects >= badge.requirement;
    return false;
  });

  return (
    <Card className="p-6 space-y-6 border-2 border-border bg-card/80 backdrop-blur">
      {/* Niveau et Progression */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Niveau {stats.level}</h3>
          </div>
          <span className="text-sm text-muted-foreground">{stats.xp} / {xpForNextLevel} XP</span>
        </div>
        <Progress value={progressPercent} className="h-2" aria-label={`Progression vers le niveau ${stats.level + 1}: ${Math.round(progressPercent)}%`} />
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-primary">{stats.totalSamples}</div>
          <div className="text-xs text-muted-foreground">Samples</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-accent">{stats.totalEffects}</div>
          <div className="text-xs text-muted-foreground">Effets</div>
        </div>
        <div className="text-center space-y-1">
          <div className="text-2xl font-bold text-foreground">{stats.favorites}</div>
          <div className="text-xs text-muted-foreground">Favoris</div>
        </div>
      </div>

      {/* Badges */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Badges débloqués</h3>
        <div className="flex flex-wrap gap-2">
          {unlockedBadges.length > 0 ? (
            unlockedBadges.map(badge => (
              <Badge 
                key={badge.id} 
                variant="secondary"
                className="px-3 py-1 bg-primary/20 text-primary border-primary/30"
              >
                <badge.icon className="h-3 w-3 mr-1" />
                {badge.name}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Enregistrez votre premier sample pour débloquer des badges !</p>
          )}
        </div>
      </div>
    </Card>
  );
};
