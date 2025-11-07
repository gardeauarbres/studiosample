import { useState, useMemo, Suspense, memo } from "react";
import { useDebounce } from "@/utils/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Grid, List, Play, Star, Clock, Filter, Loader2 } from "lucide-react";

interface AudioSample {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: number;
  effects?: string[];
  isFavorite: boolean; // Rendre obligatoire pour cohérence avec AudioRecorder
}

interface SampleLibraryProps {
  samples: AudioSample[];
  onSamplePlay: (sample: AudioSample) => void;
  onSampleToggleFavorite?: (id: string) => void;
  onSampleDelete?: (id: string) => void;
}

type SortOption = "name" | "date" | "duration" | "favorites";
type ViewMode = "grid" | "list";
type FilterCategory = "all" | "favorites" | "recent" | "effects";

export const SampleLibrary = memo(({ 
  samples = [], 
  onSamplePlay,
  onSampleToggleFavorite,
  onSampleDelete 
}: SampleLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");

  // Debounce search query to reduce unnecessary filtering
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredAndSortedSamples = useMemo(() => {
    if (!samples || samples.length === 0) return [];
    
    let filtered = [...samples];

    // Apply search with debounced query
    if (debouncedSearch) {
      filtered = filtered.filter(sample =>
        sample.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    // Apply category filter
    switch (filterCategory) {
      case "favorites":
        filtered = filtered.filter(s => s.isFavorite);
        break;
      case "recent":
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        filtered = filtered.filter(s => s.timestamp > oneDayAgo);
        break;
      case "effects":
        filtered = filtered.filter(s => s.effects && s.effects.length > 0);
        break;
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return b.timestamp - a.timestamp;
        case "duration":
          return b.duration - a.duration;
        case "favorites":
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [samples, debouncedSearch, sortBy, filterCategory]);

  const stats = {
    total: samples?.length || 0,
    favorites: samples?.filter(s => s.isFavorite).length || 0,
    recent: samples?.filter(s => s.timestamp > Date.now() - 24 * 60 * 60 * 1000).length || 0,
    withEffects: samples?.filter(s => s.effects && s.effects.length > 0).length || 0,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sample Library</span>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger id="sample-library-sort-select" className="w-full sm:w-[180px]" aria-label="Trier par">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Most Recent</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats and Filters */}
        <Tabs value={filterCategory} onValueChange={(value) => setFilterCategory(value as FilterCategory)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex gap-2">
              <Filter className="h-3 w-3" />
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex gap-2">
              <Star className="h-3 w-3" />
              Favorites ({stats.favorites})
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex gap-2">
              <Clock className="h-3 w-3" />
              Recent ({stats.recent})
            </TabsTrigger>
            <TabsTrigger value="effects" className="flex gap-2">
              <Play className="h-3 w-3" />
              FX ({stats.withEffects})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filterCategory} className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {filteredAndSortedSamples.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No samples found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {filteredAndSortedSamples.map((sample) => (
                    <Card 
                      key={sample.id}
                      className="border-2 border-border hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => onSamplePlay(sample)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {sample.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {Math.floor(sample.duration / 60)}:{(sample.duration % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {sample.isFavorite && (
                              <Star className="h-5 w-5 fill-primary text-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSamplePlay(sample);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Badge variant="secondary">
            {filteredAndSortedSamples.length} of {stats.total} samples
          </Badge>
          {searchQuery && (
            <Badge variant="outline">
              Search: {searchQuery}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

SampleLibrary.displayName = 'SampleLibrary';
