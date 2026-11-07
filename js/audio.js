/**
 * ==========================================================================
 * Kozminski Escape: Polowanie na ECTS
 * Moduł dźwiękowy (js/audio.js)
 * Akademia Leona Koźmińskiego w Warszawie
 *
 * Wykorzystuje wyłącznie natywne Web Audio API (AudioContext, OscillatorNode, GainNode).
 * Brak zewnętrznych plików .mp3 lub .wav - wszystkie dźwięki generowane w czasie rzeczywistym.
 * ==========================================================================
 */

const SoundSystem = {
  ctx: null,
  isMuted: false,
  initialized: false,

  /**
   * Inicjalizacja AudioContext (wywoływana przy pierwszej interakcji użytkownika)
   */
  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API nie jest wspierane w tej przeglądarce:', e);
    }
  },

  /**
   * Wznawia kontekst audio, jeśli został uśpiony przez politykę autoplay przeglądarki
   */
  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  /**
   * Przełączanie wyciszenia dźwięków
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  },

  /**
   * Główna metoda odtwarzania syntetyzowanych efektów 8-bitowych
   * @param {string} type - 'ects' | 'coffee' | 'shield' | 'freeze' | 'hit' | 'win'
   */
  play(type) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    switch (type) {
      // 1. 'ects': melodyjny dwuton monety (fala trójkątna)
      case 'ects': {
        const tones = [
          { freq: 987.77, time: now, dur: 0.08 },        // B5
          { freq: 1318.51, time: now + 0.08, dur: 0.22 } // E6
        ];

        tones.forEach(({ freq, time, dur }) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(time);
          osc.stop(time + dur);
        });
        break;
      }

      // 2. 'coffee': dźwięk przyspieszenia (rosnąca częstotliwość fali piłokształtnej)
      case 'coffee': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.35;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + duration);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }

      // 3. 'shield': aktywacja legitymacji studenckiej (akord sinusoidalny)
      case 'shield': {
        // Czysty, lśniący akord C-dur (C5, E5, G5, C6) z łagodnym zanikaniem
        const chordFreqs = [523.25, 659.25, 783.99, 1046.50];
        const duration = 0.55;

        chordFreqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const startTime = now + idx * 0.03; // delikatne arpeggio wstępne

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        break;
      }

      // 4. 'freeze': cyber-freeze AI po zadanym pytaniu (fala prostokątna)
      case 'freeze': {
        const freqs = [880, 1174.66, 659.25, 1318.51, 440];
        const step = 0.055;

        freqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const stepTime = now + idx * step;

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, stepTime);

          gain.gain.setValueAtTime(0.15, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stepTime + step);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(stepTime);
          osc.stop(stepTime + step);
        });
        break;
      }

      // 5. 'hit': złapanie przez egzaminatora (dramatycznie opadający bas)
      case 'hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.6;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + duration);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }

      // 6. 'win': krótka, 4-tonowa fanfara sukcesu
      case 'win': {
        // C5 -> E5 -> G5 -> C6 (z dłuższą ostatnią nutą)
        const fanfare = [
          { freq: 523.25, dur: 0.14 }, // C5
          { freq: 659.25, dur: 0.14 }, // E5
          { freq: 783.99, dur: 0.14 }, // G5
          { freq: 1046.50, dur: 0.45 } // C6
        ];

        let playHead = now;
        fanfare.forEach((note) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(note.freq, playHead);

          gain.gain.setValueAtTime(0.22, playHead);
          gain.gain.exponentialRampToValueAtTime(0.001, playHead + note.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(playHead);
          osc.stop(playHead + note.dur);

          playHead += note.dur * 0.95; // lekkie legato
        });
        break;
      }

      // 7. 'artillery': potężny wystrzał i wybuch artylerii odrzucający wykładowcę
      case 'artillery': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const duration = 0.55;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + duration);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
        break;
      }

      default:
        console.warn(`Nieznany typ dźwięku: "${type}"`);
    }
  }
};

// Udostępnienie w zasięgu globalnym dla gry
window.SoundSystem = SoundSystem;

// Mostek kompatybilności dla gry
window.gameAudio = {
  init: () => SoundSystem.init(),
  toggleMute: () => SoundSystem.toggleMute(),
  playClick: () => SoundSystem.play('ects'),
  playCollectECTS: () => SoundSystem.play('ects'),
  playCoffeeBoost: () => SoundSystem.play('coffee'),
  playShield: () => SoundSystem.play('shield'),
  playNotesDistract: () => SoundSystem.play('freeze'),
  playProfessorAlert: () => SoundSystem.play('freeze'),
  playDefeatSound: () => SoundSystem.play('hit'),
  playVictorySound: () => SoundSystem.play('win')
};

