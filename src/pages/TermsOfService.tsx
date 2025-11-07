import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

const TermsOfService = () => {
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
            <FileText className="w-12 h-12 text-primary" />
            <div>
              <h1 className="text-4xl font-bold text-foreground">Conditions Générales d&apos;Utilisation</h1>
              <p className="text-muted-foreground">Conditions d&apos;utilisation de Studio Samples</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Dernière mise à jour : 2 novembre 2025</p>
        </div>

        <Card className="p-6 space-y-6">
          {/* Préambule */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Préambule</h2>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-muted-foreground">
                Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation 
                de la plateforme Studio Samples, une application web de création, gestion et partage de samples audio. 
                En accédant à ce service, vous acceptez de respecter ces conditions dans leur intégralité.
              </p>
            </div>
          </div>

          <Separator />

          {/* Article 1 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-primary" />
              1. Acceptation des conditions
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                L&apos;utilisation de Studio Samples implique l&apos;acceptation pleine et entière des présentes CGU. 
                Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser le service.
              </p>
              <p>
                Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications prennent effet 
                immédiatement après leur publication sur le site. Il est de votre responsabilité de consulter 
                régulièrement les CGU.
              </p>
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold text-foreground mb-2">Notification des modifications</h3>
                <p className="text-sm">
                  En cas de modification substantielle des CGU, nous vous en informerons par notification 
                  sur la plateforme lors de votre prochaine connexion.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Article 2 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              2. Inscription et compte utilisateur
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <h3 className="font-semibold text-foreground">2.1 Création de compte</h3>
              <p>
                Pour accéder aux fonctionnalités de Studio Samples, vous devez créer un compte utilisateur. 
                Vous vous engagez à :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fournir des informations exactes, complètes et à jour</li>
                <li>Maintenir la confidentialité de vos identifiants de connexion</li>
                <li>Ne pas partager votre compte avec des tiers</li>
                <li>Nous notifier immédiatement de toute utilisation non autorisée de votre compte</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-4">2.2 Conditions d&apos;éligibilité</h3>
              <p>
                Vous devez avoir au moins 16 ans pour utiliser Studio Samples. Si vous avez entre 16 et 18 ans, 
                vous devez avoir l&apos;autorisation d&apos;un parent ou tuteur légal.
              </p>

              <h3 className="font-semibold text-foreground mt-4">2.3 Suspension et résiliation</h3>
              <p>
                Nous nous réservons le droit de suspendre ou de résilier votre compte en cas de violation des 
                présentes CGU, sans préavis et sans compensation.
              </p>
            </div>
          </div>

          <Separator />

          {/* Article 3 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">3. Description du service</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>
                Studio Samples est une plateforme permettant de :
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">✓ Création audio</h3>
                  <p className="text-sm">Enregistrer et créer des samples audio directement dans votre navigateur</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">✓ Effets et traitement</h3>
                  <p className="text-sm">Appliquer des effets audio en temps réel à vos créations</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">✓ Gestion de bibliothèque</h3>
                  <p className="text-sm">Organiser et gérer votre collection de samples</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-2">✓ Collaboration</h3>
                  <p className="text-sm">Partager et collaborer sur des sessions avec d&apos;autres utilisateurs</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mt-4">
                <p className="text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Le service est fourni &quot;tel quel&quot; et &quot;selon disponibilité&quot;. Nous nous efforçons 
                    de maintenir le service disponible 24/7, mais ne pouvons garantir une disponibilité ininterrompue.
                  </span>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Article 4 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              4. Propriété intellectuelle et contenu utilisateur
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <h3 className="font-semibold text-foreground">4.1 Vos contenus</h3>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm">
                  <strong className="text-foreground">Vous conservez la pleine propriété</strong> de tous les samples, 
                  enregistrements et créations que vous produisez sur Studio Samples. Nous ne revendiquons aucun 
                  droit sur votre contenu.
                </p>
              </div>
              
              <h3 className="font-semibold text-foreground mt-4">4.2 Licence d&apos;utilisation</h3>
              <p>
                En téléchargeant ou en créant du contenu sur la plateforme, vous accordez à Studio Samples 
                une licence non exclusive, mondiale et gratuite pour :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Stocker et héberger votre contenu sur nos serveurs</li>
                <li>Afficher votre contenu à vous et aux utilisateurs avec qui vous choisissez de le partager</li>
                <li>Effectuer les opérations techniques nécessaires au fonctionnement du service</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-4">4.3 Responsabilité du contenu</h3>
              <p>Vous vous engagez à ne pas télécharger, créer ou partager de contenu qui :</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Viole les droits d&apos;auteur ou de propriété intellectuelle de tiers</li>
                <li>Est illégal, offensant, diffamatoire ou haineux</li>
                <li>Contient des malwares ou codes malveillants</li>
                <li>Enfreint les lois en vigueur</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-4">4.4 Propriété de la plateforme</h3>
              <p>
                Le code, le design, les logos et tous les éléments de la plateforme Studio Samples sont protégés 
                par les lois sur la propriété intellectuelle et restent la propriété exclusive de l&apos;éditeur.
              </p>
            </div>
          </div>

          <Separator />

          {/* Article 5 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">5. Utilisation acceptable</h2>
            <div className="space-y-3 text-muted-foreground">
              <p>Vous vous engagez à utiliser Studio Samples de manière responsable. Il est strictement interdit de :</p>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-2">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Usage commercial non autorisé</strong>
                    <p className="text-sm mt-1">Revendre ou redistribuer le service sans autorisation</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-2">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Tentatives de piratage</strong>
                    <p className="text-sm mt-1">Tenter d&apos;accéder aux systèmes, bases de données ou comptes d&apos;autres utilisateurs</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-2">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Spam et abus</strong>
                    <p className="text-sm mt-1">Envoyer du spam, créer de faux comptes ou automatiser l&apos;utilisation du service</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex gap-2">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Surcharge du service</strong>
                    <p className="text-sm mt-1">Utiliser le service d&apos;une manière qui pourrait endommager ou surcharger nos serveurs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Article 6 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">6. Protection des données personnelles</h2>
            <p className="text-muted-foreground">
              Vos données personnelles sont traitées conformément au RGPD et à notre politique de confidentialité. 
              Nous collectons uniquement les données nécessaires au fonctionnement du service.
            </p>
            <Button 
              onClick={() => navigate('/privacy')}
              variant="outline"
              className="w-full md:w-auto"
            >
              Consulter notre politique de confidentialité
            </Button>
          </div>

          <Separator />

          {/* Article 7 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">7. Limitation de responsabilité</h2>
            <div className="space-y-3 text-muted-foreground">
              <h3 className="font-semibold text-foreground">7.1 Disponibilité du service</h3>
              <p>
                Nous nous efforçons d&apos;assurer la disponibilité continue du service, mais ne pouvons garantir 
                une absence totale d&apos;interruptions dues à des pannes techniques, maintenance ou cas de force majeure.
              </p>

              <h3 className="font-semibold text-foreground">7.2 Perte de données</h3>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm">
                  Bien que nous mettions tout en œuvre pour protéger vos données, nous vous recommandons fortement 
                  d&apos;effectuer régulièrement des sauvegardes de vos samples importants. Nous ne pourrons être tenus 
                  responsables de la perte de vos données.
                </p>
              </div>

              <h3 className="font-semibold text-foreground mt-4">7.3 Contenu tiers</h3>
              <p>
                Nous ne sommes pas responsables du contenu créé ou partagé par les utilisateurs. Chaque utilisateur 
                est seul responsable de son contenu et de ses actions sur la plateforme.
              </p>

              <h3 className="font-semibold text-foreground mt-4">7.4 Dommages indirects</h3>
              <p>
                En aucun cas nous ne pourrons être tenus responsables des dommages indirects, accessoires, spéciaux 
                ou consécutifs résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service.
              </p>
            </div>
          </div>

          <Separator />

          {/* Article 8 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">8. Résiliation</h2>
            <div className="space-y-3 text-muted-foreground">
              <h3 className="font-semibold text-foreground">8.1 Par l&apos;utilisateur</h3>
              <p>
                Vous pouvez à tout moment supprimer votre compte via les paramètres. La suppression est définitive 
                et entraînera la perte de toutes vos données.
              </p>

              <h3 className="font-semibold text-foreground">8.2 Par Studio Samples</h3>
              <p>
                Nous nous réservons le droit de suspendre ou supprimer votre compte en cas de :
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violation des présentes CGU</li>
                <li>Activité frauduleuse ou illégale</li>
                <li>Non-respect des droits d&apos;autrui</li>
                <li>Abus du service</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Article 9 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">9. Modification du service</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier, suspendre ou interrompre tout ou partie du service à tout moment, 
              avec ou sans préavis. Nous pouvons également supprimer des fonctionnalités ou en ajouter de nouvelles.
            </p>
          </div>

          <Separator />

          {/* Article 10 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">10. Droit applicable et juridiction</h2>
            <p className="text-muted-foreground">
              Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut d&apos;accord amiable, 
              les tribunaux français seront seuls compétents.
            </p>
          </div>

          <Separator />

          {/* Article 11 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">11. Dispositions générales</h2>
            <div className="space-y-3 text-muted-foreground">
              <h3 className="font-semibold text-foreground">11.1 Divisibilité</h3>
              <p>
                Si une disposition des présentes CGU est jugée invalide ou inapplicable, les autres dispositions 
                resteront pleinement en vigueur.
              </p>

              <h3 className="font-semibold text-foreground">11.2 Renonciation</h3>
              <p>
                Le fait de ne pas exercer un droit prévu par les présentes CGU ne constitue pas une renonciation 
                à ce droit.
              </p>

              <h3 className="font-semibold text-foreground">11.3 Intégralité de l&apos;accord</h3>
              <p>
                Les présentes CGU constituent l&apos;intégralité de l&apos;accord entre vous et Studio Samples concernant 
                l&apos;utilisation du service.
              </p>
            </div>
          </div>

          <Separator />

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant ces Conditions Générales d&apos;Utilisation, vous pouvez nous contacter 
              via les paramètres de votre compte ou consulter nos autres pages légales :
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => navigate('/privacy')}
                variant="outline"
              >
                Politique de confidentialité
              </Button>
              <Button 
                onClick={() => navigate('/legal')}
                variant="outline"
              >
                Mentions légales
              </Button>
            </div>
          </div>
        </Card>

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
          <p className="text-sm text-muted-foreground">
            En continuant à utiliser Studio Samples, vous reconnaissez avoir lu, compris et accepté 
            les présentes Conditions Générales d&apos;Utilisation.
          </p>
        </div>

        <div className="text-center pb-8">
          <Button onClick={() => navigate('/')} variant="outline">
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;