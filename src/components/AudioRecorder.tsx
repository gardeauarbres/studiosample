import { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mic, Square, Cloud, CloudOff, Star, Pause, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from './AppHeader';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioEffects } from './AudioEffects';
import { AdvancedEffects } from './AdvancedEffects';
import { UserStats } from './UserStats';
import { SampleWheel } from './SampleWheel';
import { SampleCard } from './SampleCard';
// Lazy load components that are not immediately needed
const VirtualizedSampleList = lazy(() => import('./VirtualizedSampleList'));
const InfiniteSampleList = lazy(() => import('./InfiniteSampleList').then(module => ({ default: module.InfiniteSampleList })));
const QRShareDialog = lazy(() => import('./QRShareDialog').then(module => ({ default: module.QRShareDialog })));
const AudioImporter = lazy(() => import('./AudioImporter').then(module => ({ default: module.AudioImporter })));
const CollaborativeSession = lazy(() => import('./CollaborativeSession').then(module => ({ default: module.CollaborativeSession })));
const EffectPreviewDialog = lazy(() => import('./EffectPreviewDialog').then(module => ({ default: module.EffectPreviewDialog })));
import { generateSampleName } from '@/utils/sampleNames';
import { supabase } from '@/integrations/supabase/client';
import { audioFeedback } from '@/utils/audioFeedback';
import { compressAudio } from '@/utils/audioOptimization';
import { uploadAudioToStorage, downloadAudioFromStorage, deleteAudioFromStorage } from '@/utils/storageUtils';

// Lazy load heavy components for better initial bundle size
const Sequencer = lazy(() => import('./Sequencer').then(module => ({ default: module.Sequencer })));
const AdvancedAudioEffects = lazy(() => import('./AdvancedAudioEffects').then(module => ({ default: module.AdvancedAudioEffects })));
const AdvancedAudioAnalysis = lazy(() => import('./AdvancedAudioAnalysis').then(module => ({ default: module.AdvancedAudioAnalysis })));
const AudioMorphing = lazy(() => import('./AudioMorphing').then(module => ({ default: module.AudioMorphing })));
const RealtimeCollaborativeStudio = lazy(() => import('./RealtimeCollaborativeStudio').then(module => ({ default: module.RealtimeCollaborativeStudio })));
const MultiTrackMixer = lazy(() => import('./MultiTrackMixer').then(module => ({ default: module.MultiTrackMixer })));
const PresetManager = lazy(() => import('./PresetManager').then(module => ({ default: module.PresetManager })));
const Metronome = lazy(() => import('./Metronome').then(module => ({ default: module.Metronome })));

const LazyComponentFallback = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface AudioSample {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  effects?: string[];
  isFavorite: boolean; // Rendre obligatoire pour éviter les erreurs de type
}

interface UserStats {
  totalSamples: number;
  totalEffects: number;
  favorites: number;
  level: number;
  xp: number;
}

export const AudioRecorder = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [samples, setSamples] = useState<AudioSample[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [currentRecordingBlob, setCurrentRecordingBlob] = useState<Blob | null>(null);
  const [showEffects, setShowEffects] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalSamples: 0,
    totalEffects: 0,
    favorites: 0,
    level: 1,
    xp: 0,
  });
  const [cloudSync, setCloudSync] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedSampleForQR, setSelectedSampleForQR] = useState<AudioSample | null>(null);
  const [selectedSampleForEffects, setSelectedSampleForEffects] = useState<AudioSample | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewEffectName, setPreviewEffectName] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = samples.findIndex((s) => s.id === active.id);
      const newIndex = samples.findIndex((s) => s.id === over.id);

      const newSamples = arrayMove(samples, oldIndex, newIndex);
      setSamples(newSamples);
      await saveSamples(newSamples);
      audioFeedback.playClick();
      toast.success('Ordre modifié !');
    }
  };

  const _base64ToBlob = (base64: string, type: string) => {
    // Si le base64 contient déjà le préfixe data URL, l'extraire
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Garder le data URL complet (data:audio/wav;base64,...)
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Removed localStorage loading for security - all data now stored in Supabase only

  const recalculateStats = useCallback(async () => {
    if (!userId) return;

    try {
      // Count actual samples
      const { count: samplesCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Count favorites
      const { count: favoritesCount } = await supabase
        .from('samples')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_favorite', true);

      // Sum effects from all samples
      const { data: samplesData } = await supabase
        .from('samples')
        .select('effects')
        .eq('user_id', userId);

      const totalEffects = samplesData?.reduce((sum, s) => sum + (s.effects?.length || 0), 0) || 0;

      // Update stats with real counts
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const updated = {
        totalSamples: samplesCount || 0,
        totalEffects,
        favorites: favoritesCount || 0,
        level: currentStats?.level || 1,
        xp: currentStats?.xp || 0,
      };

      setUserStats(updated);

      const { error } = await supabase.from('user_stats').upsert(
        {
          user_id: userId,
          total_samples: updated.totalSamples,
          total_effects: updated.totalEffects,
          favorites: updated.favorites,
          level: updated.level,
          xp: updated.xp,
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false,
        },
      );

      if (error) {
        console.error('Stats update failed:', error);
        toast.error('Erreur de mise à jour des statistiques', {
          description: error.message || 'Impossible de synchroniser les stats',
        });
      } else {
        // Invalider le cache React Query pour forcer le refresh des badges
        queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
      }
    } catch (error: any) {
      console.error('Error recalculating stats:', error);
      toast.error('Erreur lors du recalcul des statistiques', {
        description: error?.message || 'Veuillez réessayer plus tard',
      });
    }
  }, [queryClient, userId]);

  const loadFromCloud = useCallback(async () => {
    try {
      // Vérifier d'abord si storage_path existe en tentant une requête simple
      // Si la colonne n'existe pas, on utilisera une sélection sans storage_path
      let selectFields = 'id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type';
      
      // Essayer d'ajouter storage_path si la colonne existe
      try {
        const { error: testError } = await supabase
          .from('samples')
          .select('storage_path')
          .limit(1);
        
        if (!testError) {
          // La colonne existe, on peut l'utiliser
          selectFields += ', storage_path';
        }
      } catch (err) {
        // La colonne n'existe pas encore, on continue sans
        console.warn('Colonne storage_path non disponible, utilisation sans Storage');
      }

      const { data: cloudSamples, error: samplesError } = await supabase
        .from('samples')
        .select(selectFields)
        .order('created_at', { ascending: false });

      if (samplesError) {
        console.error('Error loading samples:', samplesError);
        // Si c'est une erreur de colonne manquante, essayer sans storage_path
        if (samplesError.message?.includes('storage_path') || samplesError.message?.includes('does not exist')) {
          console.warn('Retrying without storage_path...');
          const { error: retryError } = await supabase
            .from('samples')
            .select('id, user_id, name, duration, timestamp, created_at, is_favorite, effects, mime_type')
            .order('created_at', { ascending: false });
          
          if (retryError) {
            throw retryError;
          }
          
          // Si pas de storage_path, les samples ne peuvent pas être chargés (pas de blob_data non plus)
          setSamples([]);
          setCloudSync(false);
          toast.warning('La colonne storage_path n\'existe pas encore. Veuillez exécuter MIGRATE_TO_STORAGE.sql', {
            description: 'Les samples ne peuvent pas être chargés sans storage_path',
          });
          return;
        }
        throw samplesError;
      }

      if (cloudSamples && cloudSamples.length > 0) {
        // Vérifier si storage_path est disponible dans les données
        const hasStoragePath = cloudSamples.some((s: any) => 'storage_path' in s);
        
        if (!hasStoragePath) {
          // La colonne storage_path n'existe pas, on ne peut pas charger les samples
          setSamples([]);
          setCloudSync(false);
          toast.error('La colonne storage_path n\'existe pas dans la base de données', {
            description: 'Veuillez exécuter MIGRATE_TO_STORAGE.sql dans Supabase SQL Editor',
          });
          return;
        }
        
        // Charger les samples depuis Storage uniquement
        // Note: blob_data (bytea) ne peut pas être sérialisé en JSON par PostgREST
        const loadedSamples = await Promise.all(
          cloudSamples.map(async (s: any) => {
            // Charger uniquement depuis Storage
            if (!s.storage_path) {
              console.warn(`Sample ${s.id} n'a pas de storage_path, ignoré (nécessite migration)`);
              return null;
            }
            
            const blob = await downloadAudioFromStorage(s.storage_path);
            
            if (!blob) {
              console.warn(`Impossible de charger le sample ${s.id} depuis Storage`);
              return null;
            }
            
            return {
              id: s.id,
              name: s.name,
              blob,
              duration: s.duration,
              timestamp: s.timestamp,
              isFavorite: s.is_favorite || false, // S'assurer que isFavorite est toujours défini
              effects: s.effects || [],
            };
          })
        );
        
        // Filtrer les nulls (samples sans storage_path ou sans blob)
        const validSamples: AudioSample[] = loadedSamples.filter((s): s is NonNullable<typeof s> => {
          return s !== null && s !== undefined && s.blob !== undefined;
        });
        setSamples(validSamples);
        setCloudSync(true);
        
        // Afficher un message si des samples ont été ignorés
        const ignoredCount = cloudSamples.length - validSamples.length;
        if (ignoredCount > 0) {
          toast.info(`${ignoredCount} sample(s) nécessitent une migration vers Storage`, {
            description: 'Utilisez le script de migration pour migrer les anciens samples',
          });
        }
      } else {
        // Aucun sample, définir cloudSync à true quand même
        setSamples([]);
        setCloudSync(true);
      }

      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .maybeSingle();

      if (!statsError && stats) {
        setUserStats({
          totalSamples: stats.total_samples ?? 0,
          totalEffects: stats.total_effects ?? 0,
          favorites: stats.favorites ?? 0,
          level: stats.level ?? 1,
          xp: stats.xp ?? 0,
        });
      } else if (!stats && userId) {
        const { error: insertError } = await supabase.from('user_stats').insert([{
          user_id: userId,
          total_samples: 0,
          total_effects: 0,
          favorites: 0,
          level: 1,
          xp: 0,
        }]);
        if (insertError) {
          console.error('Error inserting user stats:', insertError);
        }
      }

      // Recalculate stats to ensure accuracy
      await recalculateStats();
    } catch (error: any) {
      console.error('Error loading from cloud:', error);
      const errorMessage = error?.message || error?.code || 'Erreur inconnue';
      toast.error('Erreur lors du chargement cloud', {
        description: errorMessage,
      });
      // Définir cloudSync à false en cas d'erreur
      setCloudSync(false);
    }
  }, [recalculateStats, userId]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth session error:', error);
        toast.error('Erreur de connexion', {
          description: 'Impossible de vérifier votre session. Veuillez vous reconnecter.'
        });
        navigate('/auth');
        return;
      }
      
      if (!session || !session.user) {
        navigate('/auth');
        return;
      }
      
      const userIdValue = session.user.id;
      setUserId(userIdValue);
      
      // Vérifier que userId est bien défini avant de charger
      if (userIdValue) {
        await loadFromCloud();
      }
    };

    checkAuth();

    // Synchronisation en temps réel des samples
    let samplesChannel: ReturnType<typeof supabase.channel> | null = null;
    if (userId) {
      samplesChannel = supabase
        .channel('samples-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'samples',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            console.log('Sample changed:', payload);
            await recalculateStats();
          }
        )
        .subscribe();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session || !session.user) {
        if (_event === 'SIGNED_OUT') {
          setUserId(null);
          navigate('/auth');
        }
        return;
      }
      
      const userIdValue = session.user.id;
      setUserId(userIdValue);
      
      // Vérifier que userId est bien défini avant de charger
      if (userIdValue) {
        await loadFromCloud();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (samplesChannel) {
        supabase.removeChannel(samplesChannel);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [loadFromCloud, navigate, recalculateStats, userId]);

  const saveSamples = async (newSamples: AudioSample[], sampleId?: string) => {
    try {
      if (userId) {
        // Si un sampleId spécifique est fourni, mettre à jour uniquement ce sample
        const sampleToSave = sampleId 
          ? newSamples.find(s => s.id === sampleId) || newSamples[newSamples.length - 1]
          : newSamples[newSamples.length - 1];
        
        // Compress audio before saving to reduce storage size
        let blobToSave = sampleToSave.blob;
        try {
          blobToSave = await compressAudio(sampleToSave.blob);
        } catch (compressionError) {
          console.warn('Compression failed, using original blob:', compressionError);
          // Continue with original blob if compression fails
        }
        
        // Upload vers Storage (nouveau système)
        const mimeType = blobToSave.type || 'audio/wav';
        const storagePath = await uploadAudioToStorage(blobToSave, userId, sampleToSave.id, mimeType);
        
        // Sauvegarder dans la DB
        // NOTE: storage_path sera généré automatiquement par le trigger à partir de user_id, id et mime_type
        // On n'a besoin de le renseigner manuellement
        const blobData = storagePath ? '' : await blobToBase64(blobToSave); // Empty string if using Storage, fallback to base64 if Storage failed
        
        const { error } = await supabase.from('samples').upsert({
          user_id: userId,
          name: sampleToSave.name,
          duration: sampleToSave.duration,
          timestamp: sampleToSave.timestamp,
          is_favorite: sampleToSave.isFavorite || false,
          effects: sampleToSave.effects || [],
          // storage_path sera généré automatiquement par le trigger
          // On ne le renseigne pas ici, le trigger le calculera à partir de user_id, id et mime_type
          blob_data: blobData,
          mime_type: mimeType, // Requis pour que le trigger génère storage_path
        });
        
        if (error) {
          console.error('Error saving to cloud:', error);
          toast.error('Sauvegarde cloud échouée', {
            description: 'Vos données sont sauvegardées localement'
          });
          setCloudSync(false);
        } else {
          setCloudSync(true);
          // Show subtle success feedback only on first save or after error
          if (!cloudSync) {
            toast.success('Synchronisation activée');
          }
          
          // Invalider le cache React Query pour forcer le refresh des stats et samples
          // refetchType: 'active' force le refetch même si les données sont considérées comme "fresh"
          await Promise.all([
            queryClient.invalidateQueries({ 
              queryKey: ['userStats', userId],
              refetchType: 'active'
            }),
            queryClient.invalidateQueries({ 
              queryKey: ['samples', userId],
              refetchType: 'active'
            }),
            queryClient.invalidateQueries({ 
              queryKey: ['samples', 'infinite', userId],
              refetchType: 'active'
            }),
          ]);
          
          // Forcer le refetch explicite pour s'assurer que les composants se mettent à jour
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ['userStats', userId] }),
            queryClient.refetchQueries({ queryKey: ['samples', userId] }),
            queryClient.refetchQueries({ queryKey: ['samples', 'infinite', userId] }),
          ]);
          
          // Recharger la bibliothèque depuis le cloud (pour AudioRecorder local state)
          await loadFromCloud();
          
          // Recalculate stats after successful save
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

  const updateStats = async (newStats: Partial<UserStats>) => {
    const updated = { ...userStats, ...newStats };
    setUserStats(updated);

    if (userId) {
      const { error } = await supabase
        .from('user_stats')
        .upsert(
          {
            user_id: userId,
            total_samples: updated.totalSamples,
            total_effects: updated.totalEffects,
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
        console.error('Error updating stats:', error);
        toast.error('Erreur de mise à jour des statistiques', {
          description: error.message || 'Impossible de sauvegarder les stats'
        });
      } else {
        // Invalider le cache React Query pour forcer le refresh des badges
        queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
      }
    }
  };

  const addXP = (amount: number) => {
    const newXP = userStats.xp + amount;
    const xpForNextLevel = userStats.level * 100;
    
    if (newXP >= xpForNextLevel) {
      updateStats({
        xp: newXP - xpForNextLevel,
        level: userStats.level + 1,
      });
      toast.success(`Niveau ${userStats.level + 1} atteint !`, {
        description: 'Continuez à créer des samples !',
      });
    } else {
      updateStats({ xp: newXP });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setCurrentRecordingBlob(audioBlob);
        setShowEffects(true);
        
        // Calculate actual duration from audio blob
        let actualDuration = recordingTime; // Fallback to timer
        try {
          const audioContext = new AudioContext();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          actualDuration = Math.round(audioBuffer.duration);
          await audioContext.close();
        } catch (error) {
          console.error('Error calculating audio duration:', error);
          // Keep recordingTime as fallback
        }
        
        setRecordingTime(0); // Reset timer after getting duration
        
        const newSample: AudioSample = {
          id: crypto.randomUUID(),
          name: generateSampleName(),
          blob: audioBlob,
          duration: actualDuration,
          timestamp: Date.now(),
          effects: [],
          isFavorite: false,
        };

        const updatedSamples = [...samples, newSample];
        setSamples(updatedSamples);
        await saveSamples(updatedSamples);
        
        // Note: saveSamples() invalide déjà les caches et recharge loadFromCloud()
        // On ajoute juste le recalcul des stats et l'XP
        await recalculateStats();
        addXP(10);
        
        toast.success('Sample enregistré !', {
          description: `${newSample.name} - ${formatTime(actualDuration)}`,
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
      audioFeedback.playRecord();

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      
      // Provide specific user-friendly error messages
      if (error.name === 'NotAllowedError') {
        toast.error('Accès au microphone refusé', {
          description: 'Veuillez autoriser l\'accès au microphone dans les paramètres de votre navigateur'
        });
      } else if (error.name === 'NotFoundError') {
        toast.error('Microphone introuvable', {
          description: 'Aucun microphone n\'a été détecté sur votre appareil'
        });
      } else if (error.name === 'NotReadableError') {
        toast.error('Microphone indisponible', {
          description: 'Le microphone est peut-être utilisé par une autre application'
        });
      } else {
        toast.error('Erreur d\'enregistrement', {
          description: 'Impossible de démarrer l\'enregistrement. Veuillez réessayer.'
        });
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      toast.info('Enregistrement en pause');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      toast.info('Enregistrement repris');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      audioFeedback.playRecord();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const playSample = (sample: AudioSample) => {
    try {
      if (playingId === sample.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      const url = URL.createObjectURL(sample.blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        toast.error('Erreur de lecture', {
          description: 'Impossible de lire ce sample'
        });
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };

      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
        toast.error('Impossible de lire le sample', {
          description: 'Le fichier audio semble corrompu'
        });
        setPlayingId(null);
      });
      
      setPlayingId(sample.id);
    } catch (error) {
      console.error('Error in playSample:', error);
      toast.error('Erreur de lecture');
    }
  };

  const _downloadSample = (sample: AudioSample) => {
    try {
      const url = URL.createObjectURL(sample.blob);
      const a = document.createElement('a');
      a.href = url;
      const effectsSuffix = sample.effects && sample.effects.length > 0 
        ? `_${sample.effects.join('_')}` 
        : '';
      a.download = `${sample.name}${effectsSuffix}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Téléchargement démarré', {
        description: sample.name
      });
    } catch (error) {
      console.error('Error downloading sample:', error);
      toast.error('Échec du téléchargement', {
        description: 'Impossible de télécharger le fichier'
      });
    }
  };

  const shareSample = async (sample: AudioSample) => {
    try {
      const url = URL.createObjectURL(sample.blob);
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié !', {
        description: 'Le lien du sample a été copié dans le presse-papier',
      });
    } catch (error) {
      console.error('Error sharing sample:', error);
      toast.error('Impossible de partager', {
        description: 'La copie dans le presse-papier a échoué'
      });
    }
  };

  const deleteSample = async (id: string) => {
    if (!userId) return;

    try {
      const _sample = samples.find(s => s.id === id);
      
      // Récupérer le storage_path avant de supprimer (si la colonne existe)
      let storagePath: string | null = null;
      try {
        const { data: sampleData, error: fetchError } = await supabase
          .from('samples')
          .select('storage_path')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (!fetchError && sampleData && 'storage_path' in sampleData && sampleData.storage_path) {
          storagePath = sampleData.storage_path as string;
        }
      } catch (err: any) {
        // Si la colonne n'existe pas, on continue sans supprimer le fichier Storage
        if (err?.message?.includes('storage_path') || err?.message?.includes('does not exist')) {
          console.warn('storage_path column not available, skipping Storage file deletion');
        }
      }

      // Supprimer le fichier Storage si présent
      if (storagePath) {
        await deleteAudioFromStorage(storagePath);
      }
      
      // Delete from Supabase with user_id check
      const { error } = await supabase
        .from('samples')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const updatedSamples = samples.filter((s) => s.id !== id);
      setSamples(updatedSamples);
      
      // Invalider le cache React Query pour forcer le refresh
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['userStats', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', 'infinite', userId],
          refetchType: 'active'
        }),
      ]);
      
      // Forcer le refetch explicite pour s'assurer que les composants se mettent à jour
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userStats', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', 'infinite', userId] }),
      ]);
      
      // Recharger la bibliothèque depuis le cloud (pour AudioRecorder local state)
      await loadFromCloud();
      
      // Recalculate stats from database (more reliable than manual calculation)
      await recalculateStats();
      
      toast.success('Sample supprimé', {
        description: 'Le sample a été retiré de votre bibliothèque',
      });
    } catch (error) {
      console.error('Error deleting sample:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!userId) return;

    try {
      const sample = samples.find(s => s.id === id);
      if (!sample) return;

      const newFavoriteStatus = !sample.isFavorite;

      // Update in Supabase with user_id check
      const { error } = await supabase
        .from('samples')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const updatedSamples = samples.map((s) =>
        s.id === id ? { ...s, isFavorite: newFavoriteStatus } : s
      );
      setSamples(updatedSamples);
      
      // Invalider le cache React Query pour forcer le refresh
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['userStats', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', 'infinite', userId],
          refetchType: 'active'
        }),
      ]);
      
      // Forcer le refetch explicite pour s'assurer que les composants se mettent à jour
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userStats', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', 'infinite', userId] }),
      ]);
      
      // Recharger la bibliothèque depuis le cloud (pour AudioRecorder local state)
      await loadFromCloud();
      
      // Recalculate stats from database (more reliable than manual calculation)
      await recalculateStats();
      
      if (newFavoriteStatus) {
        toast.success('Ajouté aux favoris !');
        addXP(5);
      } else {
        toast.success('Retiré des favoris');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const startEditing = (sample: AudioSample) => {
    setEditingId(sample.id);
    setEditName(sample.name);
  };

  const saveEdit = async () => {
    if (!editingId || !userId) return;
    
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('samples')
        .update({ name: editName })
        .eq('id', editingId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const updatedSamples = samples.map((s) =>
        s.id === editingId ? { ...s, name: editName } : s
      );
      setSamples(updatedSamples);
      setEditingId(null);
      toast.success('Nom modifié !');
    } catch (error) {
      console.error('Error updating sample name:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const applyEffect = async (effectBlob: Blob, effectName: string) => {
    const latestSample = samples[samples.length - 1];
    if (!latestSample || !userId) return;

    try {
      const newEffects = [...(latestSample.effects || []), effectName];
      
      // Compress audio before saving
      let blobToSave = effectBlob;
      try {
        blobToSave = await compressAudio(effectBlob);
      } catch (compressionError) {
        console.warn('Compression failed, using original blob:', compressionError);
      }
      
      const blobData = await blobToBase64(blobToSave);

      // Upload vers Storage (nouveau système)
      const mimeType = effectBlob.type || 'audio/wav';
      const storagePath = await uploadAudioToStorage(effectBlob, userId, latestSample.id, mimeType);
      
      // Update in Supabase
      // NOTE: storage_path sera généré automatiquement par le trigger si mime_type change
      // On n'a pas besoin de le renseigner manuellement
      const updateData: any = {
        effects: newEffects,
        mime_type: mimeType, // Le trigger recalculera storage_path si mime_type change
      };
      
      if (storagePath) {
        // Le trigger générera automatiquement storage_path à partir de user_id, id et mime_type
        // Pas besoin de le renseigner manuellement
        updateData.blob_data = null; // Supprimer blob_data si Storage fonctionne
      } else {
        // Fallback vers blob_data si Storage échoue
        updateData.blob_data = blobData;
      }
      
      const { error } = await supabase
        .from('samples')
        .update(updateData)
        .eq('id', latestSample.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const updatedSample = {
        ...latestSample,
        blob: effectBlob,
        effects: newEffects,
      };

      const updatedSamples = [...samples.slice(0, -1), updatedSample];
      setSamples(updatedSamples);
      setCurrentRecordingBlob(effectBlob);
      
      // Invalider le cache React Query pour forcer le refresh
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['userStats', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', 'infinite', userId],
          refetchType: 'active'
        }),
      ]);
      
      // Forcer le refetch explicite pour s'assurer que les composants se mettent à jour
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userStats', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', 'infinite', userId] }),
      ]);
      
      // Recharger la bibliothèque depuis le cloud (pour AudioRecorder local state)
      await loadFromCloud();
      
      // Update stats and recalculate to ensure accuracy
      await recalculateStats();
      addXP(15);
      
      toast.success('Effet appliqué !', {
        description: `${effectName} - +15 XP`,
      });
    } catch (error) {
      console.error('Error applying effect:', error);
      toast.error('Erreur lors de l\'application de l\'effet');
    }
  };

  const applyRandomEffect = async (sampleId: string) => {
      const sample = samples.find(s => s.id === sampleId);
    if (!sample) {
      toast.error('Sample introuvable');
      return;
    }

    const effects = ['Reverb', 'Delay', 'Distortion', 'Chorus', 'Pitch Shift'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    
    // Simuler l'application de l'effet (pour demo - à remplacer par vraie logique d'effet)
    setPreviewBlob(sample.blob);
    setPreviewEffectName(randomEffect);
    setPreviewDialogOpen(true);
  };

  const handleKeepEffect = async () => {
    if (!previewBlob || !userId) return;

    try {
      const timestamp = Date.now();
      
      // Calculer la durée réelle de l'audio
      const audioContext = new AudioContext();
      const arrayBuffer = await previewBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = Math.round(audioBuffer.duration);
      
      // Compress audio before saving
      let blobToSave = previewBlob;
      try {
        blobToSave = await compressAudio(previewBlob);
      } catch (compressionError) {
        console.warn('Compression failed, using original blob:', compressionError);
      }
      
      const base64data = await blobToBase64(blobToSave);

      // Générer un UUID valide au lieu d'un timestamp
      const sampleId = crypto.randomUUID();

      const { error } = await supabase
        .from('samples')
        .insert({
          id: sampleId,
          name: `${previewEffectName} - ${new Date().toLocaleTimeString()}`,
          blob_data: base64data,
          duration: duration,
          timestamp,
          user_id: userId,
          effects: [previewEffectName.toLowerCase()],
        });

      if (error) {
        console.error('Erreur de sauvegarde:', error);
        toast.error('Impossible de sauvegarder le sample', {
          description: error.message
        });
      } else {
        toast.success('Sample gardé!', {
          description: `Le sample avec l'effet ${previewEffectName} a été ajouté à votre bibliothèque`
        });
        await loadFromCloud();
      }
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      toast.error('Erreur lors du traitement du sample');
    }

    setPreviewBlob(null);
    setPreviewEffectName('');
  };

  const handleDiscardEffect = () => {
    setPreviewBlob(null);
    setPreviewEffectName('');
    toast.success('Sample supprimé', {
      description: 'L\'effet n\'a pas été conservé'
    });
  };

  const formatTime = (seconds: number | undefined) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImportFile = async (file: File) => {
    if (!userId) {
      toast.error('Connexion requise', {
        description: 'Vous devez être connecté pour importer un fichier'
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Format invalide', {
        description: 'Veuillez sélectionner un fichier audio'
      });
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Fichier trop volumineux', {
        description: 'La taille maximale est de 50 Mo'
      });
      return;
    }

    const loadingToast = toast.loading('Import en cours...', {
      description: file.name
    });

    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Compress audio before saving to reduce storage size
      let blobToSave: Blob = file;
      try {
        const compressedBlob = await compressAudio(file);
        blobToSave = compressedBlob;
        toast.loading('Compression audio...', { id: loadingToast });
      } catch (compressionError) {
        console.warn('Compression failed, using original file:', compressionError);
        // Continue with original file if compression fails
        blobToSave = file;
      }
      
      // Générer un UUID valide
      const sampleId = crypto.randomUUID();
      const timestamp = Date.now();
      const mimeType = file.type || 'audio/wav';
      
      const newSample: AudioSample = {
        id: sampleId,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        blob: blobToSave, // Use compressed blob if compression succeeded
        duration: Math.round(audioBuffer.duration),
        timestamp: timestamp,
        effects: [],
        isFavorite: false,
      };

      // Upload vers Storage (nouveau système)
      toast.loading('Upload vers Storage...', { id: loadingToast });
      const storagePath = await uploadAudioToStorage(blobToSave, userId, sampleId, mimeType);
      
      // Insert in Supabase
      // NOTE: storage_path sera généré automatiquement par le trigger à partir de user_id, id et mime_type
      // On n'a pas besoin de le renseigner manuellement
      const insertData: any = {
        id: newSample.id,
        user_id: userId,
        name: newSample.name,
        duration: newSample.duration,
        timestamp: newSample.timestamp,
        is_favorite: false,
        effects: [],
        mime_type: mimeType, // Requis pour que le trigger génère storage_path
        // storage_path sera généré automatiquement par le trigger
        // On ne le renseigne pas ici
      };
      
      if (storagePath) {
        // Le trigger générera automatiquement storage_path
        // Pas besoin de blob_data si Storage fonctionne
      } else {
        // Fallback vers blob_data si Storage échoue
        const blobData = await blobToBase64(blobToSave);
        // Vérifier la taille du base64 (Postgres a une limite)
        if (blobData.length > 10000000) { // ~10MB en base64
          toast.dismiss(loadingToast);
          toast.error('Fichier trop volumineux pour le stockage', {
            description: 'Veuillez utiliser un fichier plus petit (< 7 Mo)'
          });
          return;
        }
        insertData.blob_data = blobData;
      }

      const { error } = await supabase.from('samples').insert(insertData);

      if (error) throw error;

      // Update local state
      const updatedSamples = [...samples, newSample];
      setSamples(updatedSamples);
      
      // Invalider le cache React Query pour forcer le refresh
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['userStats', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', userId],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['samples', 'infinite', userId],
          refetchType: 'active'
        }),
      ]);
      
      // Forcer le refetch explicite pour s'assurer que les composants se mettent à jour
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['userStats', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', userId] }),
        queryClient.refetchQueries({ queryKey: ['samples', 'infinite', userId] }),
      ]);
      
      // Recharger la bibliothèque depuis le cloud (pour AudioRecorder local state)
      await loadFromCloud();
      
      // Recalculate stats to ensure accuracy
      await recalculateStats();
      addXP(10);
      
      toast.dismiss(loadingToast);
      toast.success('Fichier importé !', {
        description: `${newSample.name} - +10 XP`
      });
    } catch (error: any) {
      console.error('Error importing file:', error);
      toast.dismiss(loadingToast);
      
      let errorMessage = 'Une erreur est survenue lors de l\'import';
      let errorDescription = 'Veuillez réessayer ou choisir un autre fichier';
      
      if (error.name === 'EncodingError' || error.message?.includes('decode')) {
        errorMessage = 'Fichier audio corrompu ou format non supporté';
        errorDescription = 'Le fichier ne peut pas être lu. Formats supportés : WAV, MP3, M4A, WebM';
      } else if (error.message?.includes('size') || error.message?.includes('trop volumineux')) {
        errorMessage = 'Fichier trop volumineux';
        errorDescription = 'La taille maximale est de 50 Mo. Pour les fichiers plus grands, utilisez un outil de compression audio.';
      } else if (error.message?.includes('type') || error.message?.includes('format')) {
        errorMessage = 'Format de fichier non supporté';
        errorDescription = 'Veuillez utiliser un fichier audio (WAV, MP3, M4A, WebM)';
      } else if (error.code === 'PGRST116' || error.message?.includes('permission')) {
        errorMessage = 'Erreur de permissions';
        errorDescription = 'Vous n\'êtes pas autorisé à importer ce fichier. Vérifiez votre connexion.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000
      });
    }
  };

  const _handleSampleShared = (sample: any) => {
    const newSample: AudioSample = {
      id: `shared-${Date.now()}`,
      name: `[Partagé] ${sample.name}`,
      blob: sample.blob,
      duration: sample.duration,
      timestamp: Date.now(),
      effects: sample.effects || [],
      isFavorite: false,
    };

    const updatedSamples = [...samples, newSample];
    setSamples(updatedSamples);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <AppHeader />
        </div>

        {/* Recording Section */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Enregistrement</h2>
          <Card className="p-8 border-2 border-border bg-card/50 backdrop-blur">
            <div className="flex flex-col items-center space-y-6">
            <div className="text-center space-y-2">
              <div className="text-6xl font-mono font-bold text-foreground">
                {formatTime(recordingTime)}
              </div>
              {isRecording && (
                <div className="flex items-center justify-center gap-2 animate-fade-in">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" 
                       style={{ boxShadow: 'var(--glow-record)' }} />
                  <span className="text-primary font-medium">Enregistrement en cours...</span>
                </div>
              )}
            </div>

            {/* Visualizer */}
            {isRecording && (
              <div className="w-full animate-scale-in">
                <AudioVisualizer stream={streamRef.current} isRecording={isRecording} />
              </div>
            )}

            <div className="flex gap-4 items-center">
              {isRecording && (
                <Button
                  size="lg"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  variant="outline"
                  className="h-16 px-8 gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-6 w-6" />
                      Reprendre
                    </>
                  ) : (
                    <>
                      <Pause className="h-6 w-6" />
                      Pause
                    </>
                  )}
                </Button>
              )}
              
              <Button
                size="lg"
                onClick={isRecording ? stopRecording : startRecording}
                className={`h-20 w-20 rounded-full transition-all hover-scale ${
                  isRecording
                    ? 'bg-destructive hover:bg-destructive/90'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                style={isRecording ? { boxShadow: 'var(--glow-record)' } : {}}
                aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" fill="currentColor" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              {isRecording ? 'Cliquez pour arrêter' : 'Cliquez pour enregistrer'}
            </p>
          </div>
          </Card>
        </section>

        {/* Cloud Sync Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {userId ? (
            cloudSync ? (
              <>
                <Cloud className="h-4 w-4 text-accent" />
                <span className="text-accent">Synchronisé</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sauvegarde locale</span>
              </>
            )
          ) : (
            <span className="text-muted-foreground">Non connecté</span>
          )}
        </div>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Outils et Statistiques</h2>
          <Accordion type="multiple" defaultValue={["stats", "tools"]} className="space-y-4">
            {/* User Stats */}
            <AccordionItem value="stats" className="border-none">
              <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-4">
                📊 Statistiques
              </AccordionTrigger>
            <AccordionContent className="animate-fade-in">
              <UserStats stats={userStats} />
            </AccordionContent>
          </AccordionItem>

          {/* Sample Wheel */}
          <AccordionItem value="wheel" className="border-none">
            <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-4">
              🎡 Roue des Effets
            </AccordionTrigger>
            <AccordionContent className="animate-fade-in">
              <SampleWheel 
                onRandomEffect={applyRandomEffect}
                userLevel={userStats.level}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Collaboration & Tools */}
          <AccordionItem value="tools" className="border-none">
            <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-4">
              🛠️ Outils & Collaboration
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
                <Suspense fallback={<LazyComponentFallback />}>
                  <AudioImporter onImport={handleImportFile} />
                </Suspense>
                
                <Suspense fallback={<LazyComponentFallback />}>
                  <RealtimeCollaborativeStudio 
                    userId={userId || 'guest'}
                    samples={samples.map(s => ({ id: s.id, name: s.name, blob: s.blob }))}
                    onSamplePlay={(sampleId) => {
                      const sample = samples.find(s => s.id === sampleId);
                      if (sample) playSample(sample);
                    }}
                  />
                </Suspense>
                
                <Suspense fallback={<LazyComponentFallback />}>
                  <CollaborativeSession 
                    currentSamples={samples} 
                    onLoadSession={(loadedSamples) => setSamples(loadedSamples)}
                  />
                </Suspense>
                <Suspense fallback={<LazyComponentFallback />}>
                  <MultiTrackMixer samples={samples} />
                </Suspense>
                <Suspense fallback={<LazyComponentFallback />}>
                  <PresetManager 
                    currentEffects={[]}
                    onLoadPreset={(_effects) => {
                      toast.info('Preset loaded! Apply to your samples');
                    }}
                  />
                </Suspense>
              </div>
            </AccordionContent>
          </AccordionItem>


          {/* Metronome */}
          <AccordionItem value="metronome" className="border-none">
            <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-4">
              ⏱️ Métronome
            </AccordionTrigger>
            <AccordionContent className="animate-fade-in">
              <Suspense fallback={<LazyComponentFallback />}>
                <Metronome />
              </Suspense>
            </AccordionContent>
          </AccordionItem>

          {/* Sequencer */}
          {samples.length > 0 && (
            <AccordionItem value="sequencer" className="border-none">
              <AccordionTrigger className="text-xl font-bold text-foreground hover:no-underline px-4">
                🎹 Séquenceur
              </AccordionTrigger>
              <AccordionContent className="animate-fade-in">
                <Suspense fallback={<LazyComponentFallback />}>
                  <Sequencer />
                </Suspense>
              </AccordionContent>
            </AccordionItem>
          )}
          </Accordion>
        </section>

        {/* Effects Section */}
        {(showEffects && currentRecordingBlob) || selectedSampleForEffects ? (
          <section className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">
                🎨 Effets Audio {selectedSampleForEffects && `- ${selectedSampleForEffects.name}`}
              </h2>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedSampleForEffects) {
                    setSelectedSampleForEffects(null);
                  } else {
                    setShowEffects(false);
                    setCurrentRecordingBlob(null);
                  }
                }}
              >
                Fermer
              </Button>
            </div>

            <Suspense fallback={<LazyComponentFallback />}>
              <AdvancedAudioAnalysis 
                audioBlob={selectedSampleForEffects?.blob || currentRecordingBlob!}
                sampleName={selectedSampleForEffects?.name || samples[samples.length - 1]?.name || 'sample'}
                duration={selectedSampleForEffects?.duration || samples[samples.length - 1]?.duration || 0}
              />
            </Suspense>
            
            <AudioEffects
              audioBlob={selectedSampleForEffects?.blob || currentRecordingBlob!}
              onApplyEffect={(blob, effectName) => {
                if (selectedSampleForEffects) {
                  const updatedSamples = samples.map(s => 
                    s.id === selectedSampleForEffects.id
                      ? { ...s, blob, effects: [...(s.effects || []), effectName] }
                      : s
                  );
                  setSamples(updatedSamples);
                  saveSamples(updatedSamples, selectedSampleForEffects.id);
                  setSelectedSampleForEffects({ ...selectedSampleForEffects, blob, effects: [...(selectedSampleForEffects.effects || []), effectName] });
                  addXP(20);
                  toast.success(`Effet ${effectName} appliqué et sauvegardé`);
                } else {
                  applyEffect(blob, effectName);
                }
              }}
            />
            <AdvancedEffects 
              audioBlob={selectedSampleForEffects?.blob || currentRecordingBlob!}
              onApplyEffect={(blob, effectName) => {
                if (selectedSampleForEffects) {
                  const updatedSamples = samples.map(s => 
                    s.id === selectedSampleForEffects.id
                      ? { ...s, blob, effects: [...(s.effects || []), effectName] }
                      : s
                  );
                  setSamples(updatedSamples);
                  saveSamples(updatedSamples, selectedSampleForEffects.id);
                  setSelectedSampleForEffects({ ...selectedSampleForEffects, blob, effects: [...(selectedSampleForEffects.effects || []), effectName] });
                  addXP(20);
                  toast.success(`Effet ${effectName} appliqué et sauvegardé`);
                } else {
                  applyEffect(blob, effectName);
                }
              }}
            />
            <Suspense fallback={<LazyComponentFallback />}>
              <AdvancedAudioEffects
                audioBlob={selectedSampleForEffects?.blob || currentRecordingBlob!}
                onEffectApplied={(blob, effectName) => {
                if (selectedSampleForEffects) {
                  const updatedSamples = samples.map(s => 
                    s.id === selectedSampleForEffects.id
                      ? { ...s, blob, effects: [...(s.effects || []), effectName] }
                      : s
                  );
                  setSamples(updatedSamples);
                  saveSamples(updatedSamples, selectedSampleForEffects.id);
                  setSelectedSampleForEffects({ ...selectedSampleForEffects, blob, effects: [...(selectedSampleForEffects.effects || []), effectName] });
                  addXP(30);
                  toast.success(`Effet ${effectName} appliqué et sauvegardé`);
                } else {
                  setCurrentRecordingBlob(blob);
                  const updatedSamples = samples.map(s => 
                    s.id === samples[samples.length - 1]?.id 
                      ? { ...s, blob, effects: [...(s.effects || []), effectName] }
                      : s
                  );
                  setSamples(updatedSamples);
                  saveSamples(updatedSamples);
                  addXP(30);
                }
              }}
            />
            </Suspense>
            
            {samples.length >= 2 && (
              <Suspense fallback={<LazyComponentFallback />}>
                <AudioMorphing
                  samples={samples.map(s => ({ id: s.id, name: s.name, blob: s.blob }))}
                  onMorphed={(blob, name) => {
                    const newSample: AudioSample = {
                      id: `morph-${Date.now()}`,
                      name,
                      blob,
                      duration: 0,
                      timestamp: Date.now(),
                      isFavorite: false,
                      effects: ['morphing'],
                    };
                    const updatedSamples = [...samples, newSample];
                    setSamples(updatedSamples);
                    saveSamples(updatedSamples);
                    addXP(40);
                  }}
                />
              </Suspense>
            )}
          </section>
        ) : null}

        {/* Sample Library Browser - Temporarily disabled */}
        {/* <div className="animate-fade-in">
          <SampleLibrary 
            samples={samples}
            onSamplePlay={playSample}
            onSampleToggleFavorite={toggleFavorite}
            onSampleDelete={deleteSample}
          />
        </div> */}

        {/* Samples Library */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Bibliothèque {userId ? '(chargement progressif...)' : `(${samples.length})`}
            </h2>
            {!userId && samples.filter(s => s.isFavorite).length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span>{samples.filter(s => s.isFavorite).length} favoris</span>
              </div>
            )}
          </div>
          
          {userId ? (
            // Infinite pagination for connected users (better performance)
            <Suspense fallback={<LazyComponentFallback />}>
              <InfiniteSampleList
              userId={userId}
              playingId={playingId}
              editingId={editingId}
              editName={editName}
              onPlay={(sample) => {
                playSample(sample);
                audioFeedback.playClick();
              }}
              onToggleFavorite={(id) => {
                toggleFavorite(id);
                audioFeedback.playSuccess();
              }}
              onShare={(sample) => shareSample(sample)}
              onShareQR={(sample) => {
                setSelectedSampleForQR(sample);
                setQrDialogOpen(true);
                audioFeedback.playClick();
              }}
              onDelete={(id) => {
                deleteSample(id);
                audioFeedback.playDelete();
              }}
              onStartEdit={(sample) => startEditing(sample)}
              onSaveEdit={saveEdit}
              onEditNameChange={setEditName}
              onOpenEffects={(sample) => {
                setSelectedSampleForEffects(sample);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              formatTime={formatTime}
              />
            </Suspense>
          ) : samples.length === 0 ? (
            <Card className="p-12 text-center border-2 border-dashed border-border">
              <p className="text-muted-foreground">
                Aucun sample enregistré. Commencez votre premier enregistrement !
              </p>
            </Card>
          ) : samples.length >= 20 ? (
            // Virtualized list for large collections (drag & drop disabled for performance)
            <Suspense fallback={<LazyComponentFallback />}>
              <VirtualizedSampleList
              samples={samples}
              playingId={playingId}
              editingId={editingId}
              editName={editName}
              onPlay={(sample) => {
                playSample(sample);
                audioFeedback.playClick();
              }}
              onToggleFavorite={(id) => {
                toggleFavorite(id);
                audioFeedback.playSuccess();
              }}
              onShare={(sample) => shareSample(sample)}
              onShareQR={(sample) => {
                setSelectedSampleForQR(sample);
                setQrDialogOpen(true);
                audioFeedback.playClick();
              }}
              onDelete={(id) => {
                deleteSample(id);
                audioFeedback.playDelete();
              }}
              onStartEdit={(sample) => startEditing(sample)}
              onSaveEdit={saveEdit}
              onEditNameChange={setEditName}
              onOpenEffects={(sample) => {
                setSelectedSampleForEffects(sample);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              formatTime={formatTime}
              />
            </Suspense>
          ) : (
            // Regular grid with drag & drop for smaller collections (guest mode)
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={samples.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {samples.map((sample, index) => (
                    <SampleCard
                      key={sample.id}
                      sample={sample}
                      index={index}
                      playingId={playingId}
                      editingId={editingId}
                      editName={editName}
                      onPlay={() => {
                        playSample(sample);
                        audioFeedback.playClick();
                      }}
                      onToggleFavorite={() => {
                        toggleFavorite(sample.id);
                        audioFeedback.playSuccess();
                      }}
                      onShare={() => shareSample(sample)}
                      onShareQR={() => {
                        setSelectedSampleForQR(sample);
                        setQrDialogOpen(true);
                        audioFeedback.playClick();
                      }}
                      onDelete={() => {
                        deleteSample(sample.id);
                        audioFeedback.playDelete();
                      }}
                      onStartEdit={() => startEditing(sample)}
                      onSaveEdit={saveEdit}
                      onEditNameChange={setEditName}
                      onOpenEffects={() => {
                        setSelectedSampleForEffects(sample);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* QR Share Dialog */}
        <Suspense fallback={null}>
          <QRShareDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            sampleUrl={selectedSampleForQR ? URL.createObjectURL(selectedSampleForQR.blob) : ''}
            sampleName={selectedSampleForQR?.name || ''}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <EffectPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          audioBlob={previewBlob}
          effectName={previewEffectName}
          onKeep={handleKeepEffect}
          onDiscard={handleDiscardEffect}
        />
      </Suspense>
    </main>
  );
};
