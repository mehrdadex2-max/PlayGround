class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('wotr.muted') === '1'; } catch { }
  }

  unlock() {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(value) {
    this.muted = value;
    try { localStorage.setItem('wotr.muted', value ? '1' : '0'); } catch { }
    if (!value) this.unlock();
  }

  tone(freq, duration = 0.12, { type = 'sine', gain = 0.05, delay = 0, slide = 0 } = {}) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  noise(duration = 0.22, { gain = 0.07, delay = 0, filter = 1200 } = {}) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const biquad = ctx.createBiquadFilter();
    biquad.type = 'bandpass';
    biquad.frequency.value = filter;
    biquad.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(biquad).connect(g).connect(ctx.destination);
    src.start(now);
  }

  click() {
    this.unlock();
    this.tone(520, 0.06, { type: 'triangle', gain: 0.025 });
  }

  select() {
    this.unlock();
    this.tone(380, 0.07, { type: 'sine', gain: 0.03, slide: 60 });
  }

  coin() {
    this.unlock();
    this.tone(880, 0.09, { type: 'triangle', gain: 0.04 });
    this.tone(1320, 0.12, { type: 'triangle', gain: 0.03, delay: 0.07 });
  }

  build() {
    this.unlock();
    this.noise(0.16, { gain: 0.035, filter: 500 });
    this.tone(180, 0.18, { type: 'sawtooth', gain: 0.025, slide: -40 });
  }

  move() {
    this.unlock();
    this.noise(0.18, { gain: 0.025, filter: 900 });
    this.tone(240, 0.1, { type: 'triangle', gain: 0.025, slide: 80 });
  }

  sword() {
    this.unlock();
    this.noise(0.28, { gain: 0.09, filter: 1600 });
    this.tone(140, 0.2, { type: 'sawtooth', gain: 0.035, slide: -50 });
  }

  horn() {
    this.unlock();
    this.tone(110, 0.65, { type: 'sawtooth', gain: 0.045, slide: 25 });
    this.tone(165, 0.55, { type: 'sawtooth', gain: 0.025, delay: 0.08 });
    this.tone(220, 0.45, { type: 'sine', gain: 0.02, delay: 0.15 });
  }

  victory() {
    this.unlock();
    [392, 494, 587, 784].forEach((f, i) => {
      this.tone(f, 0.5, { type: 'triangle', gain: 0.04, delay: i * 0.14 });
      this.tone(f / 2, 0.6, { type: 'sine', gain: 0.02, delay: i * 0.14 });
    });
  }

  defeat() {
    this.unlock();
    [330, 262, 196, 147].forEach((f, i) => {
      this.tone(f, 0.55, { type: 'sawtooth', gain: 0.025, delay: i * 0.18 });
    });
  }
}

export const sfx = new SoundEngine();
