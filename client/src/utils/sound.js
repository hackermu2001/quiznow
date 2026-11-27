class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lobbyInterval = null;
  }

  ensureCtx() {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopLobbyMusic();
  }

  playTone(freq, duration = 0.14, type = 'triangle', volume = 0.12, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playJoin() {
    this.playTone(523.25, 0.1, 'sine', 0.1, 0);
    this.playTone(783.99, 0.15, 'sine', 0.1, 0.07);
  }

  playTick(urgent = false) {
    this.playTone(urgent ? 880 : 620, 0.06, 'square', urgent ? 0.08 : 0.04);
  }

  playAnswerSubmit() {
    this.playTone(440, 0.08, 'sine', 0.1, 0);
    this.playTone(587.33, 0.12, 'sine', 0.1, 0.06);
  }

  playCorrect() {
    this.playTone(523.25, 0.12, 'triangle', 0.14, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.14, 0.09);
    this.playTone(783.99, 0.14, 'triangle', 0.14, 0.18);
    this.playTone(1046.5, 0.28, 'triangle', 0.16, 0.27);
  }

  playWrong() {
    this.playTone(260, 0.18, 'sawtooth', 0.09, 0);
    this.playTone(195, 0.28, 'sawtooth', 0.09, 0.15);
  }

  playPodium() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.12, 0.24, 0.36, 0.52, 0.65];
    notes.forEach((n, i) => this.playTone(n, 0.22, 'triangle', 0.14, times[i]));
  }

  startLobbyMusic() {
    if (this.muted || this.lobbyInterval) return;
    const pattern = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0];
    let step = 0;
    this.lobbyInterval = setInterval(() => {
      if (this.muted) {
        this.stopLobbyMusic();
        return;
      }
      this.playTone(pattern[step % pattern.length], 0.18, 'sine', 0.045);
      step++;
    }, 320);
  }

  stopLobbyMusic() {
    if (this.lobbyInterval) {
      clearInterval(this.lobbyInterval);
      this.lobbyInterval = null;
    }
  }
}

export const sound = new SoundEngine();
