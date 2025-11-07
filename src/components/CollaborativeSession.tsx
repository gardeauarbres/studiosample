import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema for session names
const sessionNameSchema = z.string()
  .trim()
  .min(1, { message: "Le nom ne peut pas être vide" })
  .max(100, { message: "Le nom doit faire moins de 100 caractères" })
  .regex(/^[a-zA-Z0-9 \-'_]+$/, { 
    message: "Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores" 
  });

interface CollaborativeSessionProps {
  currentSamples: any[];
  onLoadSession: (samples: any[]) => void;
}

interface Session {
  id: string;
  name: string;
  creator_id: string;
  samples: any;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export const CollaborativeSession = ({ currentSamples, onLoadSession }: CollaborativeSessionProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('collaborative_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Si la table n'existe pas (404) ou erreur de permission, ignorer silencieusement
        if (
          error.code === 'PGRST116' || 
          error.code === '42P01' ||
          error.message?.includes('404') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('relation') ||
          error.statusCode === 404
        ) {
          // Table n'existe pas - ignorer silencieusement sans afficher d'erreur
          console.warn('[CollaborativeSession] Table collaborative_sessions non disponible. Exécutez CREATE_COLLABORATIVE_SESSIONS.sql dans Supabase SQL Editor si vous souhaitez utiliser cette fonctionnalité.');
          setSessions([]);
          return;
        }
        // Autres erreurs (permissions, etc.)
        console.error('[CollaborativeSession] Load sessions error:', error);
        // Ne pas afficher de toast pour éviter les erreurs répétées
        setSessions([]);
        return;
      }
      setSessions(data || []);
    } catch (error: any) {
      // Ignorer les erreurs si la table n'existe pas
      if (error?.message?.includes('404') || error?.code === 'PGRST116') {
        console.warn('[CollaborativeSession] Table non disponible (ignoré)');
        setSessions([]);
        return;
      }
      console.warn('[CollaborativeSession] Unexpected error loading sessions:', error);
      setSessions([]);
    }
  }, []);

  const loadMembers = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('session_members')
        .select('*')
        .eq('session_id', sessionId);

      if (error) {
        // Si la table n'existe pas, ignorer silencieusement
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.statusCode === 404
        ) {
          console.warn('[CollaborativeSession] Table session_members not available');
          setMembers([]);
          return;
        }
        throw error;
      }
      setMembers(data || []);
    } catch (error: any) {
      console.warn('[CollaborativeSession] Error loading members:', error);
      setMembers([]);
    }
  }, []);

  const subscribeToSessionChanges = useCallback((sessionId: string) => {
    try {
      const channel = supabase
        .channel(`session:${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'collaborative_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            const updatedSession = payload.new as Session;
            setSelectedSession(updatedSession);
            onLoadSession(updatedSession.samples || []);
            toast.info('Session updated by collaborator');
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('[CollaborativeSession] Error removing channel:', error);
        }
      };
    } catch (error) {
      // Si la table n'existe pas, ignorer l'abonnement
      console.warn('[CollaborativeSession] Cannot subscribe to changes (table may not exist):', error);
      return () => {}; // Return empty cleanup function
    }
  }, [onLoadSession]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    void loadMembers(selectedSession.id);
    const unsubscribe = subscribeToSessionChanges(selectedSession.id);

    return () => {
      unsubscribe?.();
    };
  }, [loadMembers, selectedSession, subscribeToSessionChanges]);

  const createSession = async () => {
    // Validate session name
    const validationResult = sessionNameSchema.safeParse(newSessionName);
    
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Nom de session invalide';
      toast.error(errorMessage);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('create_collaborative_session', {
          p_name: validationResult.data,
          p_samples: currentSamples,
          p_settings: {}
        });

      if (error) {
        // Si la fonction ou la table n'existe pas
        if (
          error.code === '42883' || // Function does not exist
          error.code === '42P01' || // Table does not exist
          error.message?.includes('does not exist') ||
          error.message?.includes('function') ||
          error.statusCode === 404
        ) {
          toast.error('Fonctionnalité de collaboration non disponible. Exécutez CREATE_COLLABORATIVE_SESSIONS.sql dans Supabase SQL Editor.');
          console.warn('[CollaborativeSession] Function or table not available:', error);
        } else {
          console.error('[CollaborativeSession] Session creation error:', error);
          toast.error('Impossible de créer la session');
        }
        return;
      }

      toast.success('Session créée avec succès');
      setNewSessionName('');
      loadSessions();
    } catch (error: any) {
      console.error('[CollaborativeSession] Unexpected error:', error);
      if (error?.message?.includes('does not exist') || error?.code === '42883') {
        toast.error('Fonctionnalité de collaboration non disponible');
      } else {
        toast.error('Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentState = async () => {
    if (!selectedSession) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('collaborative_sessions')
        .update({ samples: currentSamples })
        .eq('id', selectedSession.id);

      if (error) {
        // Si la table n'existe pas, ignorer silencieusement
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.statusCode === 404
        ) {
          console.warn('[CollaborativeSession] Table not available for save');
          return;
        }
        console.error('[CollaborativeSession] Save error:', error);
        toast.error('Impossible de sauvegarder');
        return;
      }
      toast.success('Session sauvegardée');
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        console.warn('[CollaborativeSession] Table not available');
        return;
      }
      console.error('[CollaborativeSession] Unexpected error:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionData = (session: Session) => {
    setSelectedSession(session);
    onLoadSession(session.samples || []);
    toast.success(`Loaded session: ${session.name}`);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('collaborative_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        // Si la table n'existe pas, ignorer silencieusement
        if (
          error.code === '42P01' ||
          error.message?.includes('does not exist') ||
          error.statusCode === 404
        ) {
          console.warn('[CollaborativeSession] Table not available for delete');
          return;
        }
        console.error('[CollaborativeSession] Delete error:', error);
        toast.error('Impossible de supprimer la session');
        return;
      }
      toast.success('Session supprimée');
      loadSessions();
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error: any) {
      if (error?.message?.includes('does not exist') || error?.code === '42P01') {
        console.warn('[CollaborativeSession] Table not available');
        return;
      }
      console.error('[CollaborativeSession] Unexpected error:', error);
      toast.error('Une erreur est survenue');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Collaborate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborative Sessions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Session */}
          <Card className="p-4 bg-card/50">
            <h3 className="font-semibold mb-3">Create New Session</h3>
            <div className="flex gap-2">
              <Input
                id="session-name-input"
                name="session-name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Nom de la session (lettres, chiffres, espaces, - et _)"
                className="flex-1"
                maxLength={100}
                aria-label="Nom de la session"
              />
              <Button onClick={createSession} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </div>
          </Card>

          {/* Active Session */}
          {selectedSession && (
            <Card className="p-4 bg-primary/10 border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Active: {selectedSession.name}</h3>
                <Button onClick={saveCurrentState} disabled={isLoading} size="sm">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </Card>
          )}

          {/* Sessions List */}
          <div className="space-y-2">
            <h3 className="font-semibold">Your Sessions</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sessions yet. Create one to start collaborating!
              </p>
            ) : (
              sessions.map((session) => (
                <Card
                  key={session.id}
                  className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div onClick={() => loadSessionData(session)} className="flex-1">
                      <p className="font-medium">{session.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadSessionData(session)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSession(session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
