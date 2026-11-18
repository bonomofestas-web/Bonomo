/**
 * Web Audio API synthesizer for luxury notification and conquest chimes.
 * Does not depend on external MP3 files to ensure 100% reliability on iOS and Android.
 */

export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell chime notes (Gold Luxury Tone: E5, B5, E6)
    const frequencies = [659.25, 987.77, 1318.51];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.85);
    });
  } catch (e) {
    // AudioContext autoplay restrictions are handled gracefully
  }
};

// ── Sons por tipo de notificacao do admin (sintetizados, sem arquivos) ──
// Cada tipo tem timbre e melodia proprios para ser reconhecido sem olhar a tela.
interface ToneSpec { freqs: number[]; step: number; wave: OscillatorType; volume: number; decay: number }

const NOTIFICATION_TONES: Record<string, ToneSpec> = {
  message:         { freqs: [880, 1174.66],        step: 0.11, wave: 'sine',     volume: 0.16, decay: 0.45 },
  new_opportunity: { freqs: [523.25, 659.25, 783.99], step: 0.1, wave: 'triangle', volume: 0.2,  decay: 0.6 },
  contract:        { freqs: [329.63, 493.88, 659.25], step: 0.14, wave: 'triangle', volume: 0.2, decay: 0.9 },
  task:            { freqs: [698.46, 698.46],      step: 0.16, wave: 'square',   volume: 0.07, decay: 0.18 },
  appointment:     { freqs: [783.99, 587.33],      step: 0.14, wave: 'sine',     volume: 0.18, decay: 0.6 },
  visit_tasting:   { freqs: [587.33, 739.99, 880], step: 0.12, wave: 'sine',     volume: 0.18, decay: 0.7 },
  post_sale:       { freqs: [440, 554.37],         step: 0.13, wave: 'triangle', volume: 0.18, decay: 0.6 },
  support:         { freqs: [987.77, 987.77],      step: 0.2,  wave: 'sine',     volume: 0.15, decay: 0.4 },
  announcement:    { freqs: [659.25, 987.77, 1318.51], step: 0.08, wave: 'sine', volume: 0.18, decay: 0.8 },
};

let sharedAudioContext: AudioContext | null = null;

export const playNotificationTone = (type: string) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioContext) sharedAudioContext = new AudioContextClass();
    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') void ctx.resume();
    const spec = NOTIFICATION_TONES[type] || NOTIFICATION_TONES.announcement;
    const now = ctx.currentTime;

    spec.freqs.forEach((freq, idx) => {
      const start = now + idx * spec.step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.wave;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(spec.volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + spec.decay + 0.05);
    });
  } catch {
    // Autoplay bloqueado pelo navegador ate o primeiro clique: ignora em silencio
  }
};
