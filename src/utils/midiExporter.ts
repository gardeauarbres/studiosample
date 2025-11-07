import { toast } from 'sonner';

interface MIDINote {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
}

interface MIDIExportOptions {
  tempo: number;
  timeSignature: [number, number];
  trackName: string;
}

export class MIDIExporter {
  private createMIDIHeader(numTracks: number): Uint8Array {
    const header = new Uint8Array(14);
    // MThd
    header[0] = 0x4D;
    header[1] = 0x54;
    header[2] = 0x68;
    header[3] = 0x64;
    // Header length (6 bytes)
    header[4] = 0;
    header[5] = 0;
    header[6] = 0;
    header[7] = 6;
    // Format type (1 = multiple tracks, synchronous)
    header[8] = 0;
    header[9] = 1;
    // Number of tracks
    header[10] = 0;
    header[11] = numTracks;
    // Time division (480 ticks per quarter note)
    header[12] = 0x01;
    header[13] = 0xE0;
    
    return header;
  }

  private writeVariableLength(value: number): number[] {
    const bytes: number[] = [];
    bytes.push(value & 0x7F);
    
    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7F) | 0x80);
      value >>= 7;
    }
    
    return bytes;
  }

  private createTempoEvent(tempo: number): Uint8Array {
    const microsecondsPerQuarter = Math.floor(60000000 / tempo);
    return new Uint8Array([
      0x00, // Delta time
      0xFF, 0x51, 0x03, // Tempo meta event
      (microsecondsPerQuarter >> 16) & 0xFF,
      (microsecondsPerQuarter >> 8) & 0xFF,
      microsecondsPerQuarter & 0xFF
    ]);
  }

  private createTimeSignatureEvent(numerator: number, denominator: number): Uint8Array {
    const denominatorPower = Math.log2(denominator);
    return new Uint8Array([
      0x00, // Delta time
      0xFF, 0x58, 0x04, // Time signature meta event
      numerator,
      denominatorPower,
      24, // MIDI clocks per metronome click
      8   // 32nd notes per quarter note
    ]);
  }

  private createTrack(notes: MIDINote[], options: MIDIExportOptions): Uint8Array {
    const events: number[] = [];
    
    // Track name
    const trackNameBytes = Array.from(new TextEncoder().encode(options.trackName));
    events.push(0x00, 0xFF, 0x03, trackNameBytes.length, ...trackNameBytes);
    
    // Tempo
    const tempoEvent = this.createTempoEvent(options.tempo);
    events.push(...Array.from(tempoEvent));
    
    // Time signature
    const timeSignature = this.createTimeSignatureEvent(options.timeSignature[0], options.timeSignature[1]);
    events.push(...Array.from(timeSignature));
    
    // Sort notes by start time
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    let currentTime = 0;
    const noteEvents: Array<{time: number, type: 'on' | 'off', pitch: number, velocity: number}> = [];
    
    // Create note on/off events
    sortedNotes.forEach(note => {
      noteEvents.push({
        time: note.startTime,
        type: 'on',
        pitch: note.pitch,
        velocity: note.velocity
      });
      noteEvents.push({
        time: note.startTime + note.duration,
        type: 'off',
        pitch: note.pitch,
        velocity: 0
      });
    });
    
    // Sort all events by time
    noteEvents.sort((a, b) => a.time - b.time);
    
    // Write events
    noteEvents.forEach(event => {
      const deltaTime = Math.max(0, Math.floor((event.time - currentTime) * 480));
      const deltaBytes = this.writeVariableLength(deltaTime);
      events.push(...deltaBytes);
      
      if (event.type === 'on') {
        events.push(0x90, event.pitch, event.velocity); // Note On
      } else {
        events.push(0x80, event.pitch, event.velocity); // Note Off
      }
      
      currentTime = event.time;
    });
    
    // End of track
    events.push(0x00, 0xFF, 0x2F, 0x00);
    
    // Create track chunk
    const trackData = new Uint8Array(events.length + 8);
    // MTrk
    trackData[0] = 0x4D;
    trackData[1] = 0x54;
    trackData[2] = 0x72;
    trackData[3] = 0x6B;
    // Track length
    trackData[4] = (events.length >> 24) & 0xFF;
    trackData[5] = (events.length >> 16) & 0xFF;
    trackData[6] = (events.length >> 8) & 0xFF;
    trackData[7] = events.length & 0xFF;
    // Events
    trackData.set(events, 8);
    
    return trackData;
  }

  async exportToMIDI(
    notes: MIDINote[],
    options: MIDIExportOptions,
    filename: string
  ): Promise<void> {
    try {
      const header = this.createMIDIHeader(1);
      const track = this.createTrack(notes, options);
      
      const midiFile = new Uint8Array(header.length + track.length);
      midiFile.set(header, 0);
      midiFile.set(track, header.length);
      
      const blob = new Blob([midiFile], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('MIDI exporté !', {
        description: `${filename}.mid téléchargé`,
      });
    } catch (error) {
      console.error('Error exporting MIDI:', error);
      toast.error('Erreur lors de l\'export MIDI');
    }
  }

  // Detect pitch from audio buffer (simplified approach)
  async detectPitchFromAudio(audioBlob: Blob): Promise<MIDINote[]> {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Simple pitch detection using autocorrelation
      const notes: MIDINote[] = [];
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);
      
      // Analyze in chunks
      const chunkSize = 2048;
      const hopSize = 512;
      
      for (let i = 0; i < channelData.length - chunkSize; i += hopSize) {
        const chunk = channelData.slice(i, i + chunkSize);
        const pitch = this.autocorrelate(chunk, sampleRate);
        
        if (pitch > 0) {
          const midiNote = this.frequencyToMIDI(pitch);
          const time = i / sampleRate;
          const duration = hopSize / sampleRate;
          
          // Merge with previous note if same pitch
          const lastNote = notes[notes.length - 1];
          if (lastNote && Math.abs(lastNote.pitch - midiNote) < 1) {
            lastNote.duration += duration;
          } else {
            notes.push({
              pitch: Math.round(midiNote),
              velocity: 100,
              startTime: time,
              duration: duration
            });
          }
        }
      }
      
      return notes;
    } catch (error) {
      console.error('Error detecting pitch:', error);
      return [];
    }
  }

  private autocorrelate(buffer: Float32Array, sampleRate: number): number {
    const SIZE = buffer.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);
    let best_offset = -1;
    let best_correlation = 0;
    let rms = 0;
    
    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    
    if (rms < 0.01) return -1;
    
    let lastCorrelation = 1;
    for (let offset = 1; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;
      
      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      
      correlation = 1 - (correlation / MAX_SAMPLES);
      
      if (correlation > 0.9 && correlation > lastCorrelation) {
        const foundGoodCorrelation = correlation > best_correlation;
        if (foundGoodCorrelation) {
          best_correlation = correlation;
          best_offset = offset;
        }
      }
      
      lastCorrelation = correlation;
    }
    
    if (best_correlation > 0.01 && best_offset !== -1) {
      return sampleRate / best_offset;
    }
    
    return -1;
  }

  private frequencyToMIDI(frequency: number): number {
    return 12 * Math.log2(frequency / 440) + 69;
  }
}

export const midiExporter = new MIDIExporter();
