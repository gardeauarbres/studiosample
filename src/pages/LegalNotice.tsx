import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Scale, Building, Server, User, Copyright, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const LegalNotice = () => {
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
            <Scale className="w-12 h-12 text-primary" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">Mentions Légales</h1>
              <p className="text-muted-foreground">Informations légales concernant le site</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 1er novembre 2025</p>
        </div>

        <Card className="p-6 space-y-6">
          {/* Éditeur */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building className="w-6 h-6 text-primary" />
              1. Éditeur du site
            </h2>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Nom du site :</strong> Studio Samples</p>
              <p><strong className="text-foreground">Responsable de la publication :</strong> Ramon Alain</p>
              <p><strong className="text-foreground">Type :</strong> Application web de création et gestion de samples audio</p>
              <p><strong className="text-foreground">URL :</strong> {window.location.origin}</p>
              <p className="text-sm italic">
                Pour toute question concernant le site, veuillez nous contacter via les paramètres de votre compte.
              </p>
            </div>
          </div>

          <Separator />

          {/* Directeur de publication */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              2. Directeur de publication
            </h2>
            <div className="space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Nom :</strong> Ramon Alain</p>
              <p>
                Le directeur de la publication est responsable du contenu éditorial publié sur le site Studio Samples.
              </p>
            </div>
          </div>

          <Separator />

          {/* Hébergement */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Server className="w-6 h-6 text-primary" />
              3. Hébergement
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Hébergeur de l'application :</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vercel (plateforme de déploiement web)<br />
                  Infrastructure cloud distribuée
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Hébergeur de la base de données :</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supabase Inc.<br />
                  Infrastructure cloud sécurisée
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Propriété intellectuelle */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Copyright className="w-6 h-6 text-primary" />
              4. Propriété intellectuelle
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                L'ensemble de ce site (structure, textes, logiciels, animations, photographies, illustrations, vidéos) 
                relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle.
              </p>
              <p>
                Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et 
                les représentations iconographiques et photographiques.
              </p>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <h3 className="font-semibold text-foreground mb-2">Vos contenus</h3>
                <p className="text-sm">
                  Les samples audio que vous créez ou importez vous appartiennent. Studio Samples ne revendique 
                  aucun droit de propriété sur vos créations. Vous conservez l'entière propriété intellectuelle 
                  de vos œuvres.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Utilisation du site</h3>
                <p className="text-sm">
                  La reproduction et la copie des contenus du site sont autorisées pour un usage personnel et privé 
                  uniquement. Toute utilisation commerciale ou collective est strictement interdite sans autorisation 
                  préalable écrite.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Données personnelles */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              5. Protection des données personnelles
            </h2>
            <p className="text-muted-foreground">
              Le traitement de vos données personnelles est conforme au Règlement Général sur la Protection 
              des Données (RGPD) et à la loi Informatique et Libertés.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => navigate('/privacy')}
                variant="outline"
              >
                Politique de confidentialité
              </Button>
              <Button 
                onClick={() => navigate('/terms')}
                variant="outline"
              >
                Conditions d&apos;utilisation
              </Button>
            </div>
          </div>

          <Separator />

          {/* Cookies */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">6. Cookies</h2>
            <p className="text-muted-foreground">
              Le site utilise des cookies pour améliorer votre expérience utilisateur et analyser le trafic. 
              Vous pouvez gérer vos préférences de cookies à tout moment.
            </p>
            <Button 
              onClick={() => {
                localStorage.removeItem('cookie-consent');
                window.location.reload();
              }}
              variant="outline"
              className="w-full md:w-auto"
            >
              Gérer mes préférences de cookies
            </Button>
          </div>

          <Separator />

          {/* Responsabilité */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">7. Limitation de responsabilité</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                L'éditeur s'efforce d'assurer au mieux de ses possibilités l'exactitude et la mise à jour des 
                informations diffusées sur ce site. Toutefois, il ne peut garantir l'exactitude, la précision ou 
                l'exhaustivité des informations mises à disposition.
              </p>
              <p>
                L'éditeur ne pourra être tenu responsable des dommages directs et indirects causés au matériel 
                de l'utilisateur lors de l'accès au site, et résultant soit de l'utilisation d'un matériel ne 
                répondant pas aux spécifications, soit de l'apparition d'un bug ou d'une incompatibilité.
              </p>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Sauvegarde de vos données</h3>
                <p className="text-sm">
                  Bien que nous mettions tout en œuvre pour assurer la sécurité et la disponibilité de vos données, 
                  nous vous recommandons d'effectuer régulièrement des sauvegardes de vos samples importants.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Liens hypertextes */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">8. Liens hypertextes</h2>
            <p className="text-muted-foreground">
              Le site peut contenir des liens hypertextes vers d'autres sites internet. L'éditeur n'exerce aucun 
              contrôle sur ces sites tiers et décline toute responsabilité quant à l'accès, au contenu ou à 
              l'utilisation de ces sites, ainsi qu'aux dommages pouvant en résulter.
            </p>
          </div>

          <Separator />

          {/* Droit applicable */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">9. Droit applicable et juridiction</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut 
                d'accord amiable, le litige sera porté devant les tribunaux français conformément aux règles de 
                compétence en vigueur.
              </p>
            </div>
          </div>

          <Separator />

          {/* Médiation */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">10. Médiation</h2>
            <p className="text-muted-foreground">
              Conformément à l'article L.612-1 du Code de la consommation, en cas de litige, vous avez la possibilité 
              de recourir gratuitement à une procédure de médiation conventionnelle ou à tout autre mode alternatif 
              de règlement des différends.
            </p>
          </div>

          <Separator />

          {/* Accessibilité */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">11. Accessibilité</h2>
            <p className="text-muted-foreground">
              Nous nous engageons à rendre notre site accessible au plus grand nombre. Si vous rencontrez des 
              difficultés d'accessibilité, n'hésitez pas à nous contacter pour que nous puissions améliorer 
              votre expérience.
            </p>
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant ces mentions légales ou le fonctionnement du site, 
              veuillez accéder aux paramètres de votre compte.
            </p>
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

export default LegalNotice;