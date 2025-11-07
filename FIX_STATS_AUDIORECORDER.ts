// ============================================
// CORRECTION : AudioRecorder.tsx
// Sections à corriger pour la mise à jour des stats
// ============================================

// 1. CORRECTION : saveSamples() - Ajouter recalcul des stats après sauvegarde
const saveSamples = async (newSamples: AudioSample[], sampleId?: string) => {
  try {
    if (userId) {
      const sampleToSave = sampleId 
        ? newSamples.find(s => s.id === sampleId) || newSamples[newSamples.length - 1]
        : newSamples[newSamples.length - 1];
        
      const { error } = await supabase.from('samples').upsert({
        id: sampleToSave.id,
        user_id: userId,
        name: sampleToSave.name,
        duration: sampleToSave.duration,
        timestamp: sampleToSave.timestamp,
        is_favorite: sampleToSave.isFavorite || false,
        effects: sampleToSave.effects || [],
        blob_data: await blobToBase64(sampleToSave.blob),
      });
      
      if (error) {
        console.error('Error saving to cloud:', error);
        toast.error('Sauvegarde cloud échouée', {
          description: 'Vos données sont sauvegardées localement'
        });
        setCloudSync(false);
      } else {
        setCloudSync(true);
        if (!cloudSync) {
          toast.success('Synchronisation activée');
        }
        
        // ✅ CORRECTION : Recalculer les stats après sauvegarde
        await recalculateStats();
      }
    }
  } catch (error) {
    console.error('Error saving samples:', error);
    toast.error('Erreur de sauvegarde', {
      description: 'Impossible de sauvegarder vos données'
    });
    setCloudSync(false);
  }
};

// 2. CORRECTION : recalculateStats() - Améliorer la gestion d'erreur
const recalculateStats = async () => {
  if (!userId) return;

  try {
    // Count actual samples
    const { count: samplesCount, error: countError } = await supabase
      .from('samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;

    // Count favorites
    const { count: favoritesCount, error: favoritesError } = await supabase
      .from('samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_favorite', true);

    if (favoritesError) throw favoritesError;

    // Sum effects from all samples
    const { data: samplesData, error: effectsError } = await supabase
      .from('samples')
      .select('effects')
      .eq('user_id', userId);

    if (effectsError) throw effectsError;

    const totalEffects = samplesData?.reduce((sum, s) => sum + (s.effects?.length || 0), 0) || 0;

    // Update stats with real counts
    const { data: currentStats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (statsError) throw statsError;

    const updated = {
      total_samples: samplesCount || 0,
      total_effects: totalEffects,
      favorites: favoritesCount || 0,
      level: currentStats?.level || 1,
      xp: currentStats?.xp || 0,
    };

    setUserStats({
      totalSamples: updated.total_samples,
      totalEffects: updated.total_effects,
      favorites: updated.favorites,
      level: updated.level,
      xp: updated.xp,
    });

    // ✅ CORRECTION : Utiliser snake_case pour la DB
    const { error } = await supabase.from('user_stats').upsert(
      {
        user_id: userId,
        total_samples: updated.total_samples,
        total_effects: updated.total_effects,
        favorites: updated.favorites,
        level: updated.level,
        xp: updated.xp,
      },
      { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      }
    );
    
    if (error) {
      console.error('Stats update failed:', error);
      toast.error('Erreur de mise à jour des statistiques', {
        description: error.message || 'Impossible de synchroniser les stats'
      });
    }
  } catch (error: any) {
    console.error('Error recalculating stats:', error);
    toast.error('Erreur lors du recalcul des statistiques', {
      description: error?.message || 'Veuillez réessayer plus tard'
    });
  }
};

// 3. CORRECTION : updateStats() - Utiliser snake_case
const updateStats = async (newStats: Partial<UserStats>) => {
  const updated = { ...userStats, ...newStats };
  setUserStats(updated);

  if (userId) {
    // ✅ CORRECTION : Convertir camelCase → snake_case
    const dbStats: any = {
      user_id: userId,
    };
    
    if ('totalSamples' in updated) dbStats.total_samples = updated.totalSamples;
    if ('totalEffects' in updated) dbStats.total_effects = updated.totalEffects;
    if ('favorites' in updated) dbStats.favorites = updated.favorites;
    if ('level' in updated) dbStats.level = updated.level;
    if ('xp' in updated) dbStats.xp = updated.xp;

    const { error } = await supabase
      .from('user_stats')
      .upsert(
        dbStats,
        { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Error updating stats:', error);
      toast.error('Erreur de mise à jour des statistiques', {
        description: error.message || 'Impossible de sauvegarder les stats'
      });
    }
  }
};

// 4. CORRECTION : deleteSample() - Recalculer les stats après suppression
const deleteSample = async (id: string) => {
  if (!userId) return;

  try {
    const sample = samples.find(s => s.id === id);
    
    const { error } = await supabase
      .from('samples')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    const updatedSamples = samples.filter((s) => s.id !== id);
    setSamples(updatedSamples);
    
    // ✅ CORRECTION : Recalculer les stats depuis la DB au lieu d'incrémenter/décrémenter
    await recalculateStats();
    
    toast.success('Sample supprimé', {
      description: 'Le sample a été retiré de votre bibliothèque',
    });
  } catch (error: any) {
    console.error('Error deleting sample:', error);
    toast.error('Erreur lors de la suppression', {
      description: error?.message || 'Impossible de supprimer le sample'
    });
  }
};

// 5. CORRECTION : toggleFavorite() - Recalculer les stats après toggle
const toggleFavorite = async (id: string) => {
  if (!userId) return;

  try {
    const sample = samples.find(s => s.id === id);
    if (!sample) return;

    const newFavoriteStatus = !sample.isFavorite;

    const { error } = await supabase
      .from('samples')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    const updatedSamples = samples.map((s) =>
      s.id === id ? { ...s, isFavorite: newFavoriteStatus } : s
    );
    setSamples(updatedSamples);
    
    // ✅ CORRECTION : Recalculer les stats depuis la DB au lieu de compter localement
    await recalculateStats();
    
    if (newFavoriteStatus) {
      toast.success('Ajouté aux favoris !');
      addXP(5);
    } else {
      toast.success('Retiré des favoris');
    }
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    toast.error('Erreur lors de la modification', {
      description: error?.message || 'Impossible de modifier le favori'
    });
  }
};

// 6. CORRECTION : Après création d'un sample (ligne ~456)
// Remplacer :
//   updateStats({ totalSamples: userStats.totalSamples + 1 });
// Par :
//   await recalculateStats(); // Plus fiable car recalcule depuis la DB

