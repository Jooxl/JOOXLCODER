class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = false;
        this.buffers = {};
        this.initPromise = null;
        this.processingSource = null;
    }

    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }
            await this.preRenderExhaustiveSounds();
            this.initialized = true;
        })();
        return this.initPromise;
    }

    async preRenderExhaustiveSounds() {
        const sr = this.ctx.sampleRate;
        const renderSound = async (name, renderFn, duration) => {
            const oCtx = new OfflineAudioContext(1, sr * duration, sr);
            renderFn(oCtx, oCtx.currentTime);
            this.buffers[name] = await oCtx.startRendering();
        };

        // Generative logic for 30+ symbols
        const symbols = [
            { chars: ['!'], type: 'square', freq1: 800, freq2: 200, dur: 0.1, env: 'sharp' },
            { chars: ['@'], type: 'sine', freq1: 600, freq2: 1200, dur: 0.15, env: 'swell' },
            { chars: ['#'], type: 'sawtooth', freq1: 300, freq2: 150, dur: 0.1, env: 'crunch' },
            { chars: ['$'], type: 'square', freq1: 1500, freq2: 1500, dur: 0.08, env: 'ping' },
            { chars: ['%'], type: 'triangle', freq1: 400, freq2: 800, dur: 0.1, env: 'sweep' },
            { chars: ['^'], type: 'sawtooth', freq1: 1000, freq2: 2000, dur: 0.1, env: 'sharp' },
            { chars: ['&'], type: 'sine', freq1: 500, freq2: 400, dur: 0.15, env: 'swell' },
            { chars: ['*'], type: 'triangle', freq1: 2000, freq2: 100, dur: 0.1, env: 'ping' },
            { chars: ['(', ')'], type: 'sine', freq1: 300, freq2: 300, dur: 0.1, env: 'ripple' },
            { chars: ['{', '}'], type: 'square', freq1: 200, freq2: 200, dur: 0.1, env: 'lock' },
            { chars: ['[', ']'], type: 'sawtooth', freq1: 250, freq2: 250, dur: 0.1, env: 'lock' },
            { chars: ['-'], type: 'triangle', freq1: 600, freq2: 600, dur: 0.05, env: 'sharp' },
            { chars: ['+'], type: 'triangle', freq1: 800, freq2: 800, dur: 0.05, env: 'sharp' },
            { chars: ['='], type: 'square', freq1: 700, freq2: 700, dur: 0.05, env: 'sharp' },
            { chars: ['_'], type: 'sine', freq1: 200, freq2: 200, dur: 0.1, env: 'swell' },
            { chars: ['.'], type: 'square', freq1: 3000, freq2: 3000, dur: 0.02, env: 'ping' },
            { chars: [','], type: 'square', freq1: 2500, freq2: 2500, dur: 0.02, env: 'ping' },
            { chars: ['>'], type: 'sawtooth', freq1: 800, freq2: 1200, dur: 0.08, env: 'sweep' },
            { chars: ['<'], type: 'sawtooth', freq1: 1200, freq2: 800, dur: 0.08, env: 'sweep' },
            { chars: ['?'], type: 'sine', freq1: 1000, freq2: 1500, dur: 0.2, env: 'ripple' },
            { chars: ['/'], type: 'triangle', freq1: 900, freq2: 1100, dur: 0.1, env: 'sweep' },
            { chars: ['\\'], type: 'triangle', freq1: 1100, freq2: 900, dur: 0.1, env: 'sweep' },
            { chars: ['|'], type: 'sawtooth', freq1: 1500, freq2: 1500, dur: 0.1, env: 'sharp' },
            { chars: [':'], type: 'square', freq1: 2000, freq2: 2000, dur: 0.05, env: 'lock' },
            { chars: [';'], type: 'square', freq1: 1800, freq2: 1800, dur: 0.05, env: 'lock' },
            { chars: ['"'], type: 'sine', freq1: 1500, freq2: 1500, dur: 0.05, env: 'ping' },
            { chars: ["'"], type: 'sine', freq1: 1600, freq2: 1600, dur: 0.05, env: 'ping' },
            { chars: ['~'], type: 'sine', freq1: 400, freq2: 800, dur: 0.2, env: 'ripple' },
            { chars: ['`'], type: 'triangle', freq1: 1200, freq2: 600, dur: 0.1, env: 'sharp' }
        ];

        for (const s of symbols) {
            for (const char of s.chars) {
                await renderSound(`sym_${char}`, (ctx, t) => {
                    const osc = ctx.createOscillator(); const gain = ctx.createGain();
                    osc.type = s.type; osc.frequency.setValueAtTime(s.freq1, t);
                    if (s.env === 'sharp') { osc.frequency.exponentialRampToValueAtTime(s.freq2, t + s.dur); gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t + s.dur); }
                    else if (s.env === 'swell') { osc.frequency.linearRampToValueAtTime(s.freq2, t + s.dur); gain.gain.setValueAtTime(0.01, t); gain.gain.linearRampToValueAtTime(0.2, t + s.dur/2); gain.gain.linearRampToValueAtTime(0.01, t + s.dur); }
                    else if (s.env === 'ping') { gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.001, t + s.dur); }
                    else if (s.env === 'crunch') { osc.frequency.setValueAtTime(s.freq1, t); osc.frequency.setValueAtTime(s.freq2, t+s.dur/2); gain.gain.setValueAtTime(0.2, t); gain.gain.linearRampToValueAtTime(0.01, t+s.dur); }
                    else if (s.env === 'sweep') { osc.frequency.exponentialRampToValueAtTime(s.freq2, t + s.dur); gain.gain.setValueAtTime(0.15, t); gain.gain.linearRampToValueAtTime(0.01, t + s.dur); }
                    else if (s.env === 'ripple') { osc.frequency.setValueAtTime(s.freq1, t); osc.frequency.setValueAtTime(s.freq2, t+s.dur/3); osc.frequency.setValueAtTime(s.freq1, t+s.dur*0.6); gain.gain.setValueAtTime(0.15, t); gain.gain.linearRampToValueAtTime(0.01, t + s.dur); }
                    else if (s.env === 'lock') { osc.frequency.setValueAtTime(s.freq1, t); osc.frequency.setValueAtTime(s.freq2, t+0.02); gain.gain.setValueAtTime(0.2, t); gain.gain.setValueAtTime(0, t+0.03); gain.gain.setValueAtTime(0.2, t+0.04); gain.gain.linearRampToValueAtTime(0.01, t+s.dur); }
                    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + s.dur);
                }, s.dur);
            }
        }

        // Standard Sounds
        await renderSound('letter', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(400, t); osc.frequency.exponentialRampToValueAtTime(100, t+0.05);
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.05);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.05);
        }, 0.05);

        // Crisp Modern Enter Click
        await renderSound('enter-click', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(1500, t); osc.frequency.exponentialRampToValueAtTime(500, t+0.06);
            gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.06);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.06);
        }, 0.06);

        // Modern UI Pop / Hover
        await renderSound('modern-pop', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(2000, t); osc.frequency.exponentialRampToValueAtTime(3000, t+0.05);
            gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.5, t+0.01); gain.gain.exponentialRampToValueAtTime(0.01, t+0.05);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.05);
        }, 0.05);

        // Error Alert for Cyber Orb
        await renderSound('error-alert', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, t); osc.frequency.exponentialRampToValueAtTime(150, t+0.3);
            gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.4, t+0.05); gain.gain.exponentialRampToValueAtTime(0.01, t+0.3);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.3);
        }, 0.3);

        await renderSound('space', (ctx, t) => {
            const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource(); noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(2000, t); filter.frequency.linearRampToValueAtTime(100, t+0.15);
            const gain = ctx.createGain(); gain.gain.setValueAtTime(0.05, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.15);
            noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination); noise.start(t); noise.stop(t+0.15);
        }, 0.15);

        await renderSound('backspace', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(100, t+0.15);
            gain.gain.setValueAtTime(0.08, t); gain.gain.linearRampToValueAtTime(0, t+0.15);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.15);
        }, 0.15);

        // Calm Modern Panel Slide
        await renderSound('panel-slide', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(100, t); osc.frequency.exponentialRampToValueAtTime(50, t+0.8);
            gain.gain.setValueAtTime(0.01, t); gain.gain.linearRampToValueAtTime(0.2, t+0.2); gain.gain.linearRampToValueAtTime(0.01, t+0.8);
            
            const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0); for(let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
            const noise = ctx.createBufferSource(); noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, t); filter.frequency.linearRampToValueAtTime(100, t+0.8);
            const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.01, t); noiseGain.gain.linearRampToValueAtTime(0.05, t+0.2); noiseGain.gain.linearRampToValueAtTime(0.01, t+0.8);
            
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.8);
            noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(t); noise.stop(t+0.8);
        }, 0.8);

        // NEW: Processing Loop Sound
        await renderSound('processing', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(300, t); osc.frequency.setValueAtTime(450, t+0.2); osc.frequency.setValueAtTime(300, t+0.4);
            gain.gain.setValueAtTime(0.05, t);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.4);
        }, 0.4);

        // NEW: Success Chime
        await renderSound('success', (ctx, t) => {
            const osc1 = ctx.createOscillator(); const osc2 = ctx.createOscillator(); const gain = ctx.createGain();
            osc1.type = 'sine'; osc1.frequency.setValueAtTime(880, t); // A5
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(1108.73, t); // C#6
            gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.8);
            osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
            osc1.start(t); osc2.start(t); osc1.stop(t+0.8); osc2.stop(t+0.8);
        }, 0.8);

        await renderSound('sword', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(2500, t+0.2);
            gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.3);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.3);
        }, 0.3);

        await renderSound('damage', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(100, t); osc.frequency.setValueAtTime(150, t+0.1); osc.frequency.setValueAtTime(100, t+0.2);
            gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.01, t+0.3);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.3);
        }, 0.3);

        await renderSound('telemetry', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(2500, t);
            gain.gain.setValueAtTime(0.02, t); gain.gain.exponentialRampToValueAtTime(0.001, t+0.05);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.05);
        }, 0.05);
        
        await renderSound('radio', (ctx, t) => {
            const bufferSize = ctx.sampleRate * 0.6;
            const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource(); noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
            const gain = ctx.createGain(); gain.gain.setValueAtTime(0.02, t); gain.gain.linearRampToValueAtTime(0.02, t+0.5); gain.gain.linearRampToValueAtTime(0, t+0.6);
            noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
            noise.start(t); noise.stop(t+0.6);
        }, 0.6);
        // Hydraulic Slide for HUD
        await renderSound('hydraulic-slide', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(50, t); osc.frequency.exponentialRampToValueAtTime(20, t+0.5);
            gain.gain.setValueAtTime(0.01, t); gain.gain.linearRampToValueAtTime(0.3, t+0.1); gain.gain.linearRampToValueAtTime(0.01, t+0.5);
            
            const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0); for(let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
            const noise = ctx.createBufferSource(); noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(400, t); filter.frequency.linearRampToValueAtTime(100, t+0.5);
            const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(0.01, t); noiseGain.gain.linearRampToValueAtTime(0.05, t+0.1); noiseGain.gain.linearRampToValueAtTime(0.01, t+0.5);
            
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.5);
            noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(t); noise.stop(t+0.5);
        }, 0.5);

        // Mechanical Lock for HUD
        await renderSound('mech-lock', (ctx, t) => {
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.type = 'square'; osc.frequency.setValueAtTime(400, t); osc.frequency.setValueAtTime(800, t+0.05);
            gain.gain.setValueAtTime(0.3, t); gain.gain.setValueAtTime(0, t+0.04); gain.gain.setValueAtTime(0.4, t+0.05); gain.gain.exponentialRampToValueAtTime(0.01, t+0.1);
            osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+0.1);
        }, 0.1);
    }

    playSound(name) {
        if (!this.initialized || !this.buffers[name]) return null;
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        source.connect(this.ctx.destination);
        source.start();
        return source;
    }

    playChar(char) {
        if (char === 'Enter') this.playSound('enter-click'); 
        else if (this.buffers[`sym_${char}`]) this.playSound(`sym_${char}`);
        else if (char === 'Backspace') this.playSound('backspace');
        else if (char === ' ') this.playSound('space');
        else this.playSound('letter');
    }

    startProcessingLoop() {
        if (!this.initialized || !this.buffers['processing']) return;
        this.stopProcessingLoop();
        this.processingSource = this.ctx.createBufferSource();
        this.processingSource.buffer = this.buffers['processing'];
        this.processingSource.loop = true;
        this.processingSource.connect(this.ctx.destination);
        this.processingSource.start();
    }

    stopProcessingLoop() {
        if (this.processingSource) {
            this.processingSource.stop();
            this.processingSource = null;
        }
    }

    playPanelSlide() { this.playSound('panel-slide'); }
    playSwordDraw() { this.playSound('sword'); }
    playDamageHit() { this.playSound('damage'); }
    playErrorAlert() { this.playSound('error-alert'); }
    playTelemetry() { this.playSound('telemetry'); }
    playRadioStatic() { this.playSound('modern-pop'); }
    playSuccess() { this.playSound('success'); }
    playHUDOpen() { this.playSound('hydraulic-slide'); }
    playHUDClose() { this.playSound('mech-lock'); }
}

window.audioManager = new AudioManager();
const initAudio = () => { window.audioManager.init(); document.removeEventListener('keydown', initAudio); document.removeEventListener('mousedown', initAudio); };
document.addEventListener('keydown', initAudio); document.addEventListener('mousedown', initAudio);
