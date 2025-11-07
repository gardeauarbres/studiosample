import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Shield, Database, Cookie, Trash2, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-12 h-12 text-primary" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">Protection des Données</h1>
              <p className="text-muted-foreground">Politique de confidentialité et gestion des cookies</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er novembre 2025</p>
        </div>

        {/* Politique de confidentialité */}
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              Politique de Confidentialité
            </h2>
            <p className="text-muted-foreground">
              Studio Samples s'engage à protéger vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h3>
            <p className="text-muted-foreground">
              Le responsable du traitement des données est Studio Samples, accessible via cette application web.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">2. Données collectées</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Données d'identification :</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Adresse e-mail</li>
                  <li>Nom d'utilisateur (optionnel)</li>
                  <li>Photo de profil (optionnelle)</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Données de contenu :</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Fichiers audio (samples) que vous créez ou importez</li>
                  <li>Métadonnées associées (nom, tags, effets appliqués)</li>
                  <li>Favoris et préférences</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Données d'usage :</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Statistiques d'utilisation (nombre de samples créés, effets appliqués)</li>
                  <li>Niveau et points d'expérience (XP)</li>
                  <li>Badges débloqués</li>
                  <li>Sessions collaboratives</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Données techniques :</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et appareil</li>
                  <li>Données de connexion (date, heure)</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">3. Finalités du traitement</h3>
            <p className="text-muted-foreground">Vos données sont collectées pour :</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Stocker et organiser vos créations audio</li>
              <li>Personnaliser votre expérience (recommandations, insights IA)</li>
              <li>Calculer vos statistiques et badges</li>
              <li>Améliorer nos services et fonctionnalités</li>
              <li>Assurer la sécurité de la plateforme</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">4. Base légale</h3>
            <p className="text-muted-foreground">
              Le traitement de vos données repose sur :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Votre consentement</strong> pour les cookies non essentiels</li>
              <li><strong>L'exécution du contrat</strong> pour la fourniture des services</li>
              <li><strong>Notre intérêt légitime</strong> pour l'amélioration des services et la sécurité</li>
              <li><strong>Les obligations légales</strong> applicables</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">5. Durée de conservation</h3>
            <p className="text-muted-foreground">
              Vos données sont conservées :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Tant que votre compte est actif</li>
              <li>3 mois après la suppression de votre compte pour les sauvegardes</li>
              <li>Les données de connexion sont conservées 12 mois pour la sécurité</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">6. Partage des données</h3>
            <p className="text-muted-foreground">
              Vos données ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent être partagées avec :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Notre hébergeur (Supabase) pour le stockage sécurisé</li>
              <li>Les services d'IA (pour les fonctionnalités d'analyse et génération)</li>
              <li>Les autorités compétentes si requis par la loi</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Tous nos prestataires sont soumis à des obligations de confidentialité strictes.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">7. Vos droits</h3>
            <p className="text-muted-foreground mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Droit d'accès</h4>
                    <p className="text-sm text-muted-foreground">
                      Consultez toutes les données que nous détenons sur vous
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3">
                  <FileEdit className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Droit de rectification</h4>
                    <p className="text-sm text-muted-foreground">
                      Corrigez vos données inexactes ou incomplètes
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Droit d'effacement</h4>
                    <p className="text-sm text-muted-foreground">
                      Supprimez votre compte et toutes vos données
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground">Droit d'opposition</h4>
                    <p className="text-sm text-muted-foreground">
                      Refusez certains traitements de vos données
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 mt-4">
              <p className="text-sm text-foreground">
                <strong>Pour exercer vos droits :</strong> Connectez-vous à votre compte et accédez aux paramètres, 
                ou contactez-nous directement. Nous traiterons votre demande dans un délai d'un mois.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">8. Sécurité</h3>
            <p className="text-muted-foreground">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Chiffrement des données en transit (HTTPS)</li>
              <li>Authentification sécurisée</li>
              <li>Contrôles d'accès stricts (RLS - Row Level Security)</li>
              <li>Sauvegardes régulières</li>
              <li>Surveillance de la sécurité</li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">9. Contact</h3>
            <p className="text-muted-foreground">
              Pour toute question relative à la protection de vos données ou pour exercer vos droits, 
              vous pouvez nous contacter via les paramètres de votre compte.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).
            </p>
          </div>
        </Card>

        {/* Gestion des cookies */}
        <Card className="p-6 space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Cookie className="w-6 h-6 text-primary" />
              Gestion des Cookies et Traceurs
            </h2>
            <p className="text-muted-foreground">
              Notre site utilise des cookies pour améliorer votre expérience. Voici les détails sur leur utilisation.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Qu'est-ce qu'un cookie ?</h3>
            <p className="text-muted-foreground">
              Un cookie est un petit fichier texte déposé sur votre appareil lors de votre visite. 
              Il permet de reconnaître votre navigateur et de mémoriser certaines informations.
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Types de cookies utilisés</h3>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <h4 className="font-semibold text-foreground mb-2">Cookies strictement nécessaires (essentiels)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Ces cookies sont indispensables au fonctionnement du site. Ils ne peuvent pas être désactivés.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Authentification :</strong> Maintien de votre session connectée</li>
                  <li><strong>Sécurité :</strong> Protection contre les attaques CSRF</li>
                  <li><strong>Préférences :</strong> Mémorisation de vos choix (langue, thème)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Durée :</strong> Session ou jusqu'à 30 jours
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-foreground mb-2">Cookies de fonctionnalité</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Ces cookies permettent d'améliorer les fonctionnalités et la personnalisation.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Préférences d'interface :</strong> Sauvegarde de vos réglages audio</li>
                  <li><strong>Favoris :</strong> Mémorisation de vos samples favoris</li>
                  <li><strong>Progression :</strong> Suivi de votre niveau et XP</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Durée :</strong> Jusqu'à 12 mois
                </p>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="font-semibold text-foreground mb-2">Cookies analytiques et de performance</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Ces cookies nous aident à comprendre comment vous utilisez notre service.
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Statistiques d'usage :</strong> Pages visitées, temps passé</li>
                  <li><strong>Performance :</strong> Détection des erreurs techniques</li>
                  <li><strong>Insights :</strong> Amélioration de nos fonctionnalités IA</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Durée :</strong> Jusqu'à 24 mois • <strong>Anonymisation :</strong> Données agrégées
                </p>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <h4 className="font-semibold text-foreground mb-2">Cookies publicitaires</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Nous n'utilisons actuellement AUCUN cookie publicitaire.</strong> Votre expérience est sans publicité.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Gérer vos préférences</h3>
            <p className="text-muted-foreground mb-4">
              Vous pouvez modifier vos préférences de cookies à tout moment :
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  localStorage.removeItem('cookie-consent');
                  window.location.reload();
                }}
                className="w-full md:w-auto"
              >
                <Cookie className="w-4 h-4 mr-2" />
                Modifier mes préférences de cookies
              </Button>
              <p className="text-sm text-muted-foreground">
                Vous pouvez également configurer votre navigateur pour refuser tous les cookies ou être alerté lors de leur dépôt. 
                Notez que cela peut affecter certaines fonctionnalités du site.
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center pb-8">
          <Button onClick={() => navigate('/')} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Privacy;