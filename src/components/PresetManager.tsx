import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, Download, Upload, BookmarkPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface EffectPreset {
  id: string;
  name: string;
  effects: {
    type: string;
    parameters: any;
  }[];
  category: 'vocal' | 'instrument' | 'atmospheric' | 'experimental' | 'custom';
  created_at: string;
}

interface PresetManagerProps {
  currentEffects: any[];
  onLoadPreset: (effects: any[]) => void;
}

export const PresetManager = ({ currentEffects, onLoadPreset }: PresetManagerProps) => {
  const [presets, setPresets] = useState<EffectPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EffectPreset['category']>('custom');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load from localStorage for now (could be migrated to database)
      const saved = localStorage.getItem(`presets_${user.id}`);
      if (saved) {
        setPresets(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const savePreset = async () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    if (currentEffects.length === 0) {
      toast.error('No effects to save');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Sanitize preset name to prevent XSS attacks
      const sanitizedName = DOMPurify.sanitize(newPresetName.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      });

      // Additional validation to block dangerous patterns
      if (sanitizedName.length === 0) {
        toast.error('Invalid preset name');
        return;
      }

      if (sanitizedName.length > 100) {
        toast.error('Preset name must be less than 100 characters');
        return;
      }

      // Block script-like patterns
      if (/<|>|script|javascript|on\w+=/i.test(sanitizedName)) {
        toast.error('Preset name contains invalid characters');
        return;
      }

      const newPreset: EffectPreset = {
        id: Date.now().toString(),
        name: sanitizedName,
        effects: currentEffects.map(effect => ({
          type: effect.type || effect,
          parameters: effect.parameters || {}
        })),
        category: selectedCategory,
        created_at: new Date().toISOString()
      };

      const updatedPresets = [...presets, newPreset];
      localStorage.setItem(`presets_${user.id}`, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);

      toast.success('Preset saved!');
      setNewPresetName('');
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error('Failed to save preset');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (preset: EffectPreset) => {
    onLoadPreset(preset.effects);
    toast.success(`Loaded preset: ${preset.name}`);
    setIsOpen(false);
  };

  const deletePreset = async (presetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedPresets = presets.filter(p => p.id !== presetId);
      localStorage.setItem(`presets_${user.id}`, JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
      toast.success('Preset deleted');
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  const exportPresets = () => {
    const dataStr = JSON.stringify(presets, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `effect-presets-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Presets exported!');
  };

  const importPresets = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Sanitize all imported preset names
        const sanitizedImports = imported.map((preset: EffectPreset) => ({
          ...preset,
          name: DOMPurify.sanitize(preset.name, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
          })
        }));

        const updatedPresets = [...presets, ...sanitizedImports];
        localStorage.setItem(`presets_${user.id}`, JSON.stringify(updatedPresets));
        setPresets(updatedPresets);
        toast.success(`Imported ${sanitizedImports.length} presets`);
      } catch (error) {
        console.error('Error importing presets:', error);
        toast.error('Failed to import presets');
      }
    };
    reader.readAsText(file);
  };

  const categories: EffectPreset['category'][] = ['vocal', 'instrument', 'atmospheric', 'experimental', 'custom'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookmarkPlus className="w-4 h-4" />
          Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5" />
            Effect Presets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Save New Preset */}
          <Card className="p-4 bg-card/50">
            <h3 className="font-semibold mb-3">Save Current Effects</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Preset Name</Label>
                <Input
                  id="preset-name-input"
                  name="preset-name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="My awesome preset..."
                  aria-label="Preset Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <Badge
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={savePreset} 
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Preset
              </Button>
            </div>
          </Card>

          {/* Import/Export */}
          <div className="flex gap-2">
            <Button onClick={exportPresets} variant="secondary" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Export All
            </Button>
            <Button variant="secondary" className="flex-1 gap-2" asChild>
              <label htmlFor="preset-import" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  id="preset-import"
                  name="preset-import"
                  type="file"
                  accept=".json"
                  onChange={importPresets}
                  className="hidden"
                />
              </label>
            </Button>
          </div>

          {/* Presets List */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Presets ({presets.length})</h3>
            <ScrollArea className="h-[300px] pr-4">
              {presets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No presets saved yet. Save your first preset above!
                </div>
              ) : (
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <Card
                      key={preset.id}
                      className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => loadPreset(preset)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{preset.name}</p>
                            <Badge variant="secondary" className="text-xs">
                              {preset.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {preset.effects.length} effect{preset.effects.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(preset.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {preset.effects.map((effect, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {effect.type}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
