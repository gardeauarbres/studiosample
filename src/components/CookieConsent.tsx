import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Cookie, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  advertising: boolean;
}

export const CookieConsent = () => {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, cannot be disabled
    functional: false,
    analytics: false,
    advertising: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        // Invalid format, show banner again
        setShowBanner(true);
      }
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      advertising: true,
    };
    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      functional: false,
      analytics: false,
      advertising: false,
    };
    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
  };

  const saveCustom = () => {
    savePreferences(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
        <Card className="max-w-4xl mx-auto p-6 bg-card/95 backdrop-blur-lg border-2 border-primary/30 shadow-lg">
          <div className="flex items-start gap-4">
            <Cookie className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">
                  Nous respectons votre vie privée
                </h3>
                <p className="text-sm text-muted-foreground">
                  Notre site utilise des cookies pour améliorer votre expérience et analyser l'utilisation. 
                  Les cookies essentiels sont nécessaires au fonctionnement du site. 
                  Vous pouvez choisir d'accepter ou de refuser les autres catégories.
                </p>
                <button
                  onClick={() => navigate('/privacy')}
                  className="text-sm text-primary hover:underline"
                >
                  En savoir plus sur notre politique de confidentialité
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={acceptAll} className="flex-1">
                  Tout accepter
                </Button>
                <Button onClick={acceptEssential} variant="outline" className="flex-1">
                  Essentiels uniquement
                </Button>
                <Button 
                  onClick={() => setShowSettings(true)} 
                  variant="outline"
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Personnaliser
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={acceptEssential}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres des cookies
            </DialogTitle>
            <DialogDescription>
              Choisissez les types de cookies que vous souhaitez autoriser
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-foreground">Cookies essentiels</div>
                <p className="text-sm text-muted-foreground">
                  Nécessaires au fonctionnement du site (authentification, sécurité, préférences de base). 
                  Ces cookies ne peuvent pas être désactivés.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Functional Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-foreground">Cookies de fonctionnalité</div>
                <p className="text-sm text-muted-foreground">
                  Permettent d'améliorer votre expérience (sauvegarde des réglages, favoris, progression).
                </p>
              </div>
              <Switch
                checked={preferences.functional}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, functional: checked })
                }
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-foreground">Cookies analytiques</div>
                <p className="text-sm text-muted-foreground">
                  Nous aident à comprendre comment vous utilisez le site pour l'améliorer (données anonymisées).
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, analytics: checked })
                }
              />
            </div>

            {/* Advertising Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-foreground">Cookies publicitaires</div>
                <p className="text-sm text-muted-foreground">
                  Actuellement non utilisés sur notre site. Aucune publicité n'est affichée.
                </p>
              </div>
              <Switch
                checked={preferences.advertising}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, advertising: checked })
                }
                disabled
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={saveCustom} className="flex-1">
              Enregistrer mes préférences
            </Button>
            <Button onClick={acceptAll} variant="outline" className="flex-1">
              Tout accepter
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};