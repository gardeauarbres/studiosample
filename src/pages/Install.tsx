import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturer l'événement d'installation
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4 md:p-6 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl">Installez Studio Samples</CardTitle>
          <CardDescription className="text-base mt-2">
            Profitez de l'expérience complète sur votre appareil mobile
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-accent" />
              </div>
              <p className="text-lg font-medium">Application installée !</p>
              <p className="text-muted-foreground">
                Vous pouvez maintenant utiliser Studio Samples depuis votre écran d'accueil.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Retour à l'accueil
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Accès rapide</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez l'icône à votre écran d'accueil pour un accès instantané
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Mode hors ligne</h3>
                    <p className="text-sm text-muted-foreground">
                      Fonctionne même sans connexion internet
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Expérience native</h3>
                    <p className="text-sm text-muted-foreground">
                      Interface optimisée comme une vraie application mobile
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {deferredPrompt ? (
                  <Button 
                    onClick={handleInstallClick} 
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Download className="w-5 h-5" />
                    Installer l'application
                  </Button>
                ) : (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      Sur mobile, utilisez le menu de votre navigateur :
                    </p>
                    <div className="space-y-2 text-sm">
                      <p><strong>iPhone :</strong> Partager → Ajouter à l'écran d'accueil</p>
                      <p><strong>Android :</strong> Menu → Installer l'application</p>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline" 
                  className="w-full"
                >
                  Continuer dans le navigateur
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
