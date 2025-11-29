class SoundManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMuted: boolean = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.init();
        }
    }

    private init() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    public setMute(mute: boolean) {
        this.isMuted = mute;
        if (this.masterGain) {
            this.masterGain.gain.value = mute ? 0 : 1;
        }
    }

    public playSuccess() {
        if (!this.audioContext || this.isMuted) return;
        this.resumeContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, this.audioContext.currentTime + 0.1); // C6

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    public playError() {
        if (!this.audioContext || this.isMuted) return;
        this.resumeContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    public playClick() {
        if (!this.audioContext || this.isMuted) return;
        this.resumeContext();

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    private resumeContext() {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

export const soundManager = new SoundManager();
