import { useCallback } from 'react';

// Optimized audio compression for storage
export const compressAudio = async (blob: Blob): Promise<Blob> => {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Reduce sample rate to 16kHz for storage optimization
    const targetSampleRate = 16000;
    const offlineContext = new OfflineAudioContext(
      1, // Mono
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV with lower quality
    const wav = audioBufferToWav(renderedBuffer);
    return new Blob([wav], { type: 'audio/wav' });
  } catch (error) {
    console.error('Compression error:', error);
    return blob; // Return original if compression fails
  }
};

// Optimized WAV conversion
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channelData = buffer.getChannelData(0);
  
  let pos = 0;
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(1); // Mono
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2);
  setUint16(2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  // Write audio data
  for (let i = 0; i < channelData.length; i++) {
    let sample = Math.max(-1, Math.min(1, channelData[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(pos, sample, true);
    pos += 2;
  }

  return arrayBuffer;
};

// Debounce utility for frequent operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for high-frequency events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Memory-efficient blob storage
export const createBlobURL = (() => {
  const urls = new Map<string, string>();
  
  return {
    create: (blob: Blob, id: string): string => {
      const existing = urls.get(id);
      if (existing) {
        URL.revokeObjectURL(existing);
      }
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      return url;
    },
    revoke: (id: string) => {
      const url = urls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        urls.delete(id);
      }
    },
    revokeAll: () => {
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    }
  };
})();
