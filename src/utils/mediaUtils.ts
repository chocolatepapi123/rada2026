/**
 * Utility functions for voice notes, audio playback and video messages
 */

/**
 * Generates a valid, playable base64 WAV audio data URL with a pleasant warm melodic chime.
 * This ensures voice note playback works reliably offline and in environments without external audio files.
 */
export function generatePlayableWavDataUrl(durationSeconds: number = 6): string {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + numSamples * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = raw PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channels * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * 2, true);

  // Write a pleasant warm Nairobi chill melody (Pentatonic notes: C4, D4, E4, G4, A4)
  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.floor(t * 2) % notes.length;
    const freq = notes[noteIndex];
    // Gentle sine wave with soft decay per note
    const notePhase = (t * 2) % 1;
    const envelope = Math.max(0, 1 - notePhase * 0.8) * Math.min(1, notePhase * 20);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.28 * envelope;
    
    // Convert to 16-bit integer
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  // Convert buffer to base64 data url
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Format seconds into mm:ss
 */
export function formatMediaDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Generates an animated video blob (WebM) via HTML5 Canvas + MediaRecorder
 * for instant, reliable client-side video messaging when camera is unavailable.
 */
export async function generateFallbackVideoBlobUrl(durationSeconds: number = 4): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx || !(canvas as any).captureStream) {
        resolve('');
        return;
      }

      const stream = (canvas as any).captureStream(30);
      let selectedMime = '';
      if (typeof MediaRecorder !== 'undefined') {
        const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
        for (const m of mimeTypes) {
          if (MediaRecorder.isTypeSupported(m)) {
            selectedMime = m;
            break;
          }
        }
      }

      if (!selectedMime || typeof MediaRecorder === 'undefined') {
        resolve('');
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        resolve(URL.createObjectURL(blob));
      };

      recorder.start();

      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        if (elapsed >= durationSeconds) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        // Draw an aesthetic vibrant RADA circular animation
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#121113';
        ctx.fillRect(0, 0, w, h);

        // Circular background glow
        const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 140);
        grad.addColorStop(0, '#E0533C');
        grad.addColorStop(0.5, '#F97316');
        grad.addColorStop(1, '#1C1A1E');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 120 + Math.sin(elapsed * 4) * 8, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing rings
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 70 + Math.sin(elapsed * 6) * 12, 0, Math.PI * 2);
        ctx.stroke();

        // Central text & live timer
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RADA ✨', w / 2, h / 2 - 12);
        ctx.font = '600 14px monospace';
        ctx.fillText(`0:0${Math.floor(elapsed)} / 0:0${durationSeconds}`, w / 2, h / 2 + 18);
      }, 33);
    } catch (err) {
      console.warn('Fallback video generation failed:', err);
      resolve('');
    }
  });
}
