/**
 * SLITHER ARENA – Audio Manager (Robust Version)
 * Handles audio without blocking game execution.
 * Features: Preloading, Overlap support, Background Music Fading.
 */

const AudioManager = {
    sounds: {},
    music: null,
    isInitialized: false,
    hasError: false,

    // Fading configuration
    fadeInterval: null,
    targetVolume: 0.3,
    fadeDuration: 1500, // 1.5 seconds for smooth transitions

    // Define sound assets (Recommended: Use local files in /assets/audio/ to avoid browser blocking)
    ASSETS: {
        eat: 'assets/audio/eat.mp3',
        boost: 'assets/audio/boost.mp3',
        death: 'assets/audio/death.mp3',
        click: 'assets/audio/click.mp3',
        pause: 'assets/audio/pause.mp3',
        resume: 'assets/audio/resume.mp3',
        music: 'assets/audio/music.mp3'
        
        /* Fallback URLs (May be blocked by browser security if running from file://)
        eat: 'https://cdn.pixabay.com/audio/2022/03/15/audio_783a4a7515.mp3',
        boost: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8de30422d.mp3',
        death: 'https://cdn.pixabay.com/audio/2021/08/09/audio_88444a6820.mp3',
        click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73484.mp3',
        pause: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73484.mp3',
        resume: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73484.mp3',
        music: 'https://cdn.pixabay.com/audio/2022/02/22/audio_d19c67eb0a.mp3'
        */
    },

    init() {
        if (this.isInitialized) return;
        
        console.log("🎵 Initializing Audio System...");
        
        try {
            // Preload sound effects - NON-BLOCKING
            for (const [name, url] of Object.entries(this.ASSETS)) {
                try {
                    if (name === 'music') {
                        this.music = new Audio();
                        this.music.src = url;
                        this.music.loop = true;
                        this.music.volume = 0; // Start at 0 for fade-in
                        this.music.preload = 'none'; // Don't block loading
                    } else {
                        const audio = new Audio();
                        audio.src = url;
                        audio.preload = 'metadata'; // Just enough to know it exists
                        this.sounds[name] = audio;
                    }
                } catch (assetError) {
                    console.warn(`⚠️ Could not load asset '${name}':`, assetError);
                }
            }
            this.isInitialized = true;
            console.log("✅ Audio System Initialized (In background).");
        } catch (error) {
            console.error("❌ Audio System Critical Failure (Game will continue without sound):", error);
            this.isInitialized = true; // Mark as "done" so it doesn't try again and fail
            this.hasError = true;
        }
    },

    playSound(name) {
        // Safe check for settings
        const isSoundOn = typeof gameSettings !== 'undefined' ? gameSettings.sound : true;
        if (!isSoundOn) return;
        
        if (!this.isInitialized) this.init();
        if (!this.sounds[name]) return;

        try {
            const soundClone = this.sounds[name].cloneNode();
            soundClone.volume = (name === 'boost') ? 0.15 : 0.4;
            
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Silently ignore browser blocking
                });
            }
        } catch (e) {
            // Complete silence on errors to prevent game crash
        }
    },

    playMusic() {
        const isMusicOn = typeof gameSettings !== 'undefined' ? gameSettings.music : true;
        if (!isMusicOn) return;

        if (!this.isInitialized) this.init();
        if (!this.music) return;
        
        try {
            // If already playing full volume, don't restart or fade again unless stopped/paused
            if (!this.music.paused && this.music.volume >= this.targetVolume * 0.95) {
                return;
            }
            this.fadeInMusic();
        } catch (e) {
            console.error("❌ Music play error:", e);
        }
    },

    fadeInMusic() {
        if (!this.music) return;
        
        // Clear any existing fades to prevent jitter/glitches
        clearInterval(this.fadeInterval);

        // Ensure volume is at 0 if starting fresh from paused state
        if (this.music.paused) {
            this.music.volume = 0;
            const playPromise = this.music.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("⚠️ Music playback prevented by browser.");
                });
            }
        }

        const steps = 30; // High resolution for smooth fade
        const stepTime = this.fadeDuration / steps;
        const volumeStep = this.targetVolume / steps;

        this.fadeInterval = setInterval(() => {
            if (this.music.volume + volumeStep < this.targetVolume) {
                this.music.volume += volumeStep;
            } else {
                this.music.volume = this.targetVolume;
                clearInterval(this.fadeInterval);
            }
        }, stepTime);
    },

    pauseMusic() {
        this.fadeOutMusic(false);
    },

    resumeMusic() {
        this.playMusic(); // playMusic handles the fade-in safely
    },

    stopMusic(instant = false) {
        this.fadeOutMusic(true, instant);
    },

    fadeOutMusic(resetTime = false, instant = false) {
        if (!this.music || this.music.paused) {
            if (resetTime && this.music) this.music.currentTime = 0;
            return;
        }

        clearInterval(this.fadeInterval);

        if (instant) {
            this.music.volume = 0;
            this.music.pause();
            if (resetTime) this.music.currentTime = 0;
            return;
        }

        const steps = 30;
        const stepTime = this.fadeDuration / steps;
        
        // Calculate step based on CURRENT volume, in case we interrupt a fade-in
        const volumeStep = this.music.volume / steps;

        this.fadeInterval = setInterval(() => {
            if (this.music.volume - volumeStep > 0) {
                this.music.volume -= volumeStep;
            } else {
                this.music.volume = 0;
                this.music.pause();
                if (resetTime) this.music.currentTime = 0;
                clearInterval(this.fadeInterval);
            }
        }, stepTime);
    },

    updateFromSettings() {
        if (typeof gameSettings === 'undefined') return;

        if (!gameSettings.music) {
            // User actively toggled music OFF: Fade out instantly for immediate feedback
            this.stopMusic(true);
        } else if (typeof gameRunning !== 'undefined' && gameRunning && (typeof gamePaused === 'undefined' || !gamePaused)) {
            // User toggled ON during a running, unpaused game
            this.playMusic();
        }
    }
};
