import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart, LogOut, Menu, X, Award, Shield, Scale, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const AppHeader = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Déconnexion réussie');
      setIsMenuOpen(false);
      navigate('/auth');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    setIsMenuOpen(false);
  };

  const handleBadges = () => {
    navigate('/badges');
    setIsMenuOpen(false);
  };

  const handlePrivacy = () => {
    navigate('/privacy');
    setIsMenuOpen(false);
  };

  const handleLegal = () => {
    navigate('/legal');
    setIsMenuOpen(false);
  };

  const handleSettings = () => {
    navigate('/settings');
    setIsMenuOpen(false);
  };

  return (
    <header className="w-full">
      <div className="flex items-center justify-between gap-4">
        {/* Title - Always visible */}
        <div className="text-center flex-1">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Studio Samples
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">
            Enregistrez et gérez vos samples audio
          </p>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2">
          <Button
            onClick={handleDashboard}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <BarChart className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            onClick={handleBadges}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Award className="w-4 h-4" />
            Badges
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>

        {/* Mobile Navigation - Burger Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex flex-col gap-4 mt-8">
              <Button
                onClick={handleDashboard}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <BarChart className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                onClick={handleBadges}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Award className="w-4 h-4" />
                Badges
              </Button>
              <Button
                onClick={handlePrivacy}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Shield className="w-4 h-4" />
                Confidentialité
              </Button>
              <Button
                onClick={handleLegal}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Scale className="w-4 h-4" />
                Mentions légales
              </Button>
              <Button
                onClick={handleSettings}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <Settings className="w-4 h-4" />
                Paramètres
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
