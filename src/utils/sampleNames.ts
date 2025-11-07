const styles = [
  'Ambient', 'Lo-fi', 'Chill', 'Groovy', 'Funky', 'Dreamy', 
  'Cosmic', 'Urban', 'Vintage', 'Modern', 'Raw', 'Smooth',
  'Deep', 'Ethereal', 'Jazzy', 'Soulful', 'Electronic', 'Organic'
];

const moods = [
  'Vibe', 'Wave', 'Flow', 'Pulse', 'Echo', 'Drift',
  'Groove', 'Beat', 'Loop', 'Texture', 'Atmosphere', 'Moment'
];

const timeBasedPrefixes = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
};

export const generateSampleName = (): string => {
  const useTimePrefix = Math.random() > 0.5;
  
  if (useTimePrefix) {
    const timePrefix = timeBasedPrefixes();
    const mood = moods[Math.floor(Math.random() * moods.length)];
    return `${timePrefix} ${mood}`;
  } else {
    const style = styles[Math.floor(Math.random() * styles.length)];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    return `${style} ${mood}`;
  }
};
