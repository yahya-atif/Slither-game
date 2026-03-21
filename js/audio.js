/**
 * SLITHER ARENA – Audio Manager (Robust Version)
 * Handles audio without blocking game execution.
 * Features: Preloading, Overlap support, Background Music Fading, Dynamic Audio Playlist.
 */

const AudioManager = {
    sounds: {},
    musicTracks: [],
    music: null,             // Currently playing track reference
    currentTrackIndex: -1,   // Prevent consecutive repeats
    isInitialized: false,
    hasError: false,
    isCrossfading: false,    // Flag to prevent multiple crossfades triggering

    // Fading configuration
    targetVolume: 0.3,
    fadeDuration: 1500, // 1.5 seconds for smooth transitions

    PLAYLIST: [
        'assets/audio/music1.mp3',
        'assets/audio/music2.mp3',
        'assets/audio/music3.mp3'
    ],

    // Define sound assets (Recommended: Use local files in /assets/audio/ to avoid browser blocking)
    ASSETS: {
        eat: 'assets/audio/eat.mp3',
        boost: 'assets/audio/boost.mp3',
        death: 'assets/audio/death.mp3',
        click: 'assets/audio/click.mp3',
        pause: 'assets/audio/pause.mp3',
        resume: 'assets/audio/resume.mp3'
    },

    init() {
        if (this.isInitialized) return;
        
        console.log("🎵 Initializing Audio System...");
        
        try {
            // Load Music Playlist - NON-BLOCKING
            for (const url of this.PLAYLIST) {
                try {
                    const audio = new Audio();
                    audio.src = url;
                    // Intentionally NOT looped, so we can transition to the next track
                    audio.loop = false;
                    audio.volume = 0; // Start at 0 for fade-in
                    audio.preload = 'none';

                    // Listen for track ending to crossfade into the next
                    audio.addEventListener('timeupdate', () => {
                        // Start crossfade when approaching the end of the track
                        if (audio === this.music && !audio.paused && audio.duration > 0) {
                            const timeRemaining = audio.duration - audio.currentTime;
                            // Trigger crossfade 1.5s before end (plus slight buffer)
                            if (timeRemaining <= (this.fadeDuration / 1000) + 0.2) {
                                if (!this.isCrossfading) {
                                    this.isCrossfading = true;
                                    this.playRandomTrack();
                                    
                                    // Reset flag after transition window
                                    setTimeout(() => { this.isCrossfading = false; }, this.fadeDuration + 1000);
                                }
                            }
                        }
                    });

                    // Hard fallback if timeupdate misses the exact window
                    audio.addEventListener('ended', () => {
                        if (audio === this.music && !this.isCrossfading) {
                            this.playRandomTrack();
                        }
                    });

                    this.musicTracks.push(audio);
                } catch (assetError) {
                    console.warn(`⚠️ Could not load music track: ${url}`, assetError);
                }
            }

            // Preload sound effects - NON-BLOCKING
            for (const [name, url] of Object.entries(this.ASSETS)) {
                try {
                    const audio = new Audio();
                    audio.src = url;
                    audio.preload = 'metadata';
                    this.sounds[name] = audio;
                } catch (assetError) {
                    console.warn(`⚠️ Could not load asset '${name}':`, assetError);
                }
            }

            this.isInitialized = true;
            console.log("✅ Audio System Initialized (In background).");
        } catch (error) {
            console.error("❌ Audio System Critical Failure (Game will continue without sound):", error);
            this.isInitialized = true;
            this.hasError = true;
        }
    },

    playSound(name) {
        const isSoundOn = typeof gameSettings !== 'undefined' ? gameSettings.sound : true;
        if (!isSoundOn) return;
        
        if (!this.isInitialized) this.init();
        if (!this.sounds[name]) return;

        try {
            const soundClone = this.sounds[name].cloneNode();
            soundClone.volume = (name === 'boost') ? 0.15 : 0.4;
            
            const playPromise = soundClone.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {});
            }
        } catch (e) {}
    },

    playMusic() {
        const isMusicOn = typeof gameSettings !== 'undefined' ? gameSettings.music : true;
        if (!isMusicOn) return;

        if (!this.isInitialized) this.init();
        if (this.musicTracks.length === 0) return;
        
        try {
            // Start playlist if nothing is active
            if (!this.music) {
                this.playRandomTrack();
            } else {
                // Resume current track
                if (!this.music.paused && this.music.volume >= this.targetVolume * 0.95) return;
                this.fadeInMusic(this.music);
            }
        } catch (e) {
            console.error("❌ Music play error:", e);
        }
    },

    playRandomTrack() {
        if (this.musicTracks.length === 0) return;
        
        let newIndex = this.currentTrackIndex;
        // Search for a different track to prevent consecutive repeats
        if (this.musicTracks.length > 1) {
            while (newIndex === this.currentTrackIndex) {
                newIndex = Math.floor(Math.random() * this.musicTracks.length);
            }
        } else {
            newIndex = 0;
        }

        this.switchTrack(newIndex);
    },

    switchTrack(newIndex) {
        const oldMusic = this.music;
        this.music = this.musicTracks[newIndex];
        this.currentTrackIndex = newIndex;

        if (oldMusic) {
            this.fadeOutMusic(oldMusic, true);
        }
        
        this.fadeInMusic(this.music);
    },

    fadeInMusic(audioElement) {
        if (!audioElement) return;
        
        // Clear any existing fades on THIS element to prevent jitter/glitches
        clearInterval(audioElement.fadeInterval);

        // Ensure volume is at 0 if starting fresh from paused/stopped state
        if (audioElement.paused) {
            audioElement.volume = 0;
            const playPromise = audioElement.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("⚠️ Music playback prevented by browser.");
                });
            }
        }

        const steps = 30; // High resolution for smooth fade
        const stepTime = this.fadeDuration / steps;
        const volumeStep = this.targetVolume / steps;

        audioElement.fadeInterval = setInterval(() => {
            if (audioElement.volume + volumeStep < this.targetVolume) {
                audioElement.volume += volumeStep;
            } else {
                audioElement.volume = this.targetVolume;
                clearInterval(audioElement.fadeInterval);
            }
        }, stepTime);
    },

    pauseMusic() {
        for (const track of this.musicTracks) {
            this.fadeOutMusic(track, false);
        }
    },

    resumeMusic() {
        this.playMusic(); 
    },

    stopMusic(instant = false) {
        for (const track of this.musicTracks) {
            // Instant stop or fast-fade, resetting track progress to start
            this.fadeOutMusic(track, true, instant);
        }
        this.music = null; // Forces playlist to select random track on next start
        this.currentTrackIndex = -1;
    },

    fadeOutMusic(audioElement, resetTime = false, instant = false) {
        if (!audioElement || audioElement.paused) {
            if (resetTime && audioElement) audioElement.currentTime = 0;
            return;
        }

        clearInterval(audioElement.fadeInterval);

        if (instant) {
            audioElement.volume = 0;
            audioElement.pause();
            if (resetTime) audioElement.currentTime = 0;
            return;
        }

        const steps = 30;
        const stepTime = this.fadeDuration / steps;
        
        // Calculate step based on CURRENT volume, in case we interrupt a fade-in
        const volumeStep = audioElement.volume / steps;

        audioElement.fadeInterval = setInterval(() => {
            if (audioElement.volume - volumeStep > 0) {
                audioElement.volume -= volumeStep;
            } else {
                audioElement.volume = 0;
                audioElement.pause();
                if (resetTime) audioElement.currentTime = 0;
                clearInterval(audioElement.fadeInterval);
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
