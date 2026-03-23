// ================================================
//  SLITHER ARENA – Skins Progression System
// ================================================

const SKINS = [
    {
        id: 'default',
        name: 'Default',
        colors: ['#44aa44', '#226622', '#66cc44', '#226622'],
        eyeColor: '#ff0',
        headGlow: 'rgba(68,170,68,0.5)',
        pattern: 'stripe',
        unlockScore: 0
    },
    {
        id: 'neon',
        name: 'Neon Viper',
        colors: ['#00ff88', '#00cc66', '#00ff88', '#00ffcc'],
        eyeColor: '#fff',
        headGlow: 'rgba(0,255,136,0.5)',
        pattern: 'solid',
        unlockScore: 1000
    },
    {
        id: 'fire',
        name: 'Fire Storm',
        colors: ['#ff4400', '#ff8800', '#ff4400', '#ffcc00'],
        eyeColor: '#fff',
        headGlow: 'rgba(255,68,0,0.5)',
        pattern: 'stripe',
        unlockScore: 5000
    },
    {
        id: 'ice',
        name: 'Arctic Frost',
        colors: ['#88ddff', '#ffffff', '#88ddff', '#aaeeff'],
        eyeColor: '#003',
        headGlow: 'rgba(136,221,255,0.5)',
        pattern: 'stripe',
        unlockScore: 8000
    },
    {
        id: 'galaxy',
        name: 'Galaxy',
        colors: ['#2b00ff', '#8800ff', '#ff00d4', '#00ccff'],
        eyeColor: '#fff',
        headGlow: 'rgba(136,0,255,0.6)',
        pattern: 'solid',
        unlockScore: 10000
    }
];

const SkinsManager = {
    unlockedSkins: ['default'],
    selectedSkin: 'default',
    allTimeHighScore: 0,
    unlockedThisRun: new Set(),
    carouselIndex: 0,
    previewAnimFrame: 0,
    previewAnimId: null,

    init() {
        this.load();
        this.initCarousel();
    },

    resetRun() {
        this.unlockedThisRun.clear();
        console.log('[SkinsManager] Run reset. Ready for new unlocks.');
    },

    load() {
        // Load high score
        const savedScore = localStorage.getItem('slither_highscore');
        if (savedScore) {
            this.allTimeHighScore = parseInt(savedScore, 10) || 0;
        }

        // Load skins
        const savedSkins = localStorage.getItem('slither_unlocked_skins');
        if (savedSkins) {
            try {
                this.unlockedSkins = JSON.parse(savedSkins);
            } catch(e) { /* ignore */ }
        }

        // Clean arrays and ensure default exists
        if (!Array.isArray(this.unlockedSkins)) this.unlockedSkins = [];
        if (!this.unlockedSkins.includes('default')) this.unlockedSkins.push('default');

        // Initial validation in case high score warrants an unlock but it wasn't saved properly
        this.silentCheckUnlocks();

        // Load selection
        const sel = localStorage.getItem('slither_selected_skin');
        if (sel && this.unlockedSkins.includes(sel)) {
            this.selectedSkin = sel;
        }
    },

    save() {
        localStorage.setItem('slither_highscore', this.allTimeHighScore.toString());
        localStorage.setItem('slither_unlocked_skins', JSON.stringify(this.unlockedSkins));
        localStorage.setItem('slither_selected_skin', this.selectedSkin);
    },

    silentCheckUnlocks() {
        SKINS.forEach(skin => {
            if (skin.unlockScore <= this.allTimeHighScore && !this.unlockedSkins.includes(skin.id)) {
                this.unlockedSkins.push(skin.id);
            }
        });
    },

    checkUnlocks(currentScore) {
        if (!currentScore || isNaN(currentScore)) return;

        let scoreUpdated = false;
        if (currentScore > this.allTimeHighScore) {
            this.allTimeHighScore = Math.floor(currentScore);
            scoreUpdated = true;
        }

        let newlyUnlocked = [];
        SKINS.forEach(skin => {
            if (currentScore >= skin.unlockScore) {
                // Prevent duplicate notifications in the same run
                if (!this.unlockedThisRun.has(skin.id)) {
                    this.unlockedThisRun.add(skin.id);

                    // If it's a completely new, permanent unlock
                    if (!this.unlockedSkins.includes(skin.id)) {
                        this.unlockedSkins.push(skin.id);
                        newlyUnlocked.push(skin);
                        console.log(`[SkinsManager] 🎉 SKIN UNLOCKED: ${skin.name} (Score: ${currentScore})`);
                    }
                }
            }
        });

        if (newlyUnlocked.length > 0) {
            this.save();
            this.updateCarouselUI(); // refresh UI to unlock the new items
            
            // Trigger in-game notifications
            if (typeof addAchievement === 'function') {
                newlyUnlocked.forEach(skin => {
                    console.log(`[SkinsManager] 📢 NOTIFICATION TRIGGERED for ${skin.name}`);
                    addAchievement('🔓', `فتح سكن جديد: ${skin.name}!`);
                    this.showDOMNotification(`فتح سكن جديد: ${skin.name}!`);
                });
            }
        } else if (scoreUpdated) {
            // Save just the highscore silently to avoid DOM lag
            localStorage.setItem('slither_highscore', this.allTimeHighScore.toString());
        }
    },

    showDOMNotification(text) {
        let notif = document.getElementById('skin-dom-notif');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'skin-dom-notif';
            notif.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:linear-gradient(90deg, #ffcc00, #ff8800); color:#000; padding:12px 24px; border-radius:30px; font-weight:bold; font-family:Outfit, sans-serif; z-index:99999; box-shadow:0 0 20px rgba(255,204,0,0.8); pointer-events:none; transition: opacity 0.5s ease; opacity: 0;';
            document.body.appendChild(notif);
        }
        notif.innerHTML = '🔓 ' + text;
        notif.style.opacity = '1';
        
        if (this.notifTimeout) clearTimeout(this.notifTimeout);
        this.notifTimeout = setTimeout(() => {
            notif.style.opacity = '0';
        }, 4000);
    },

    initCarousel() {
        const openBtn = document.getElementById('open-skins-btn');
        const closeBtn = document.getElementById('skin-close-btn');
        const modal = document.getElementById('skins-modal');
        const prevBtn = document.getElementById('skin-prev-btn');
        const nextBtn = document.getElementById('skin-next-btn');
        const selectBtn = document.getElementById('skin-select-btn');
        const swipeArea = document.getElementById('skin-swipe-area');

        // Set initial index to currently selected skin
        this.carouselIndex = Math.max(0, SKINS.findIndex(s => s.id === this.selectedSkin));

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('click');
                modal.style.display = 'flex';
                this.updateCarouselUI();
                if (!this.previewAnimId) this.startPreviewAnimation();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (typeof AudioManager !== 'undefined') AudioManager.playSound('click');
                modal.style.display = 'none';
                if (this.previewAnimId) {
                    cancelAnimationFrame(this.previewAnimId);
                    this.previewAnimId = null;
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.rotateCarousel(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.rotateCarousel(1));
        }

        if (selectBtn) {
            selectBtn.addEventListener('click', () => {
                const skin = SKINS[this.carouselIndex];
                if (this.unlockedSkins.includes(skin.id)) {
                    if (typeof AudioManager !== 'undefined') AudioManager.playSound('click');
                    this.selectedSkin = skin.id;
                    this.save();
                    this.updateCarouselUI();
                    
                    // Add success effect
                    const canvasBox = document.querySelector('.skin-canvas-container');
                    if (canvasBox) {
                        canvasBox.style.transform = 'scale(1.1)';
                        setTimeout(() => canvasBox.style.transform = 'scale(1)', 200);
                    }
                } else {
                    if (typeof AudioManager !== 'undefined') AudioManager.playSound('click'); // maybe error sound
                    if (typeof addAchievement === 'function') {
                        addAchievement('🔒', `مطلوب ${skin.unlockScore} نقطة لفتح ${skin.name}`);
                    }
                    this.showDOMNotification(`مطلوب ${skin.unlockScore} نقطة!`);
                }
            });
        }

        // Swipe support
        if (swipeArea) {
            let startX = 0;
            swipeArea.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            }, {passive: true});
            swipeArea.addEventListener('touchend', (e) => {
                let endX = e.changedTouches[0].clientX;
                if (startX - endX > 50) this.rotateCarousel(1); // swipe left -> next
                if (endX - startX > 50) this.rotateCarousel(-1); // swipe right -> prev
            }, {passive: true});
        }
    },

    rotateCarousel(dir) {
        if (typeof AudioManager !== 'undefined') AudioManager.playSound('click');
        this.carouselIndex += dir;
        if (this.carouselIndex < 0) this.carouselIndex = SKINS.length - 1;
        if (this.carouselIndex >= SKINS.length) this.carouselIndex = 0;
        
        // Add tiny visual bump to canvas
        const canvasBody = document.getElementById('skin-preview-canvas');
        if (canvasBody) {
            canvasBody.style.opacity = '0.5';
            canvasBody.style.transform = `scale(0.8) translateX(${dir * -20}px)`;
            setTimeout(() => {
                canvasBody.style.opacity = '1';
                canvasBody.style.transform = 'scale(1) translateX(0)';
            }, 50);
        }

        this.updateCarouselUI();
    },

    updateCarouselUI() {
        const skin = SKINS[this.carouselIndex];
        const isUnlocked = this.unlockedSkins.includes(skin.id);
        const isSelected = this.selectedSkin === skin.id;

        const nameDisplay = document.getElementById('skin-name-display');
        const reqDisplay = document.getElementById('skin-req-display');
        const selectBtn = document.getElementById('skin-select-btn');
        const canvasContainer = document.querySelector('.skin-canvas-container');

        if (!nameDisplay || !reqDisplay || !selectBtn || !canvasContainer) return;

        nameDisplay.textContent = skin.name;

        if (isUnlocked) {
            canvasContainer.classList.remove('locked');
            reqDisplay.innerHTML = '✨ <span style="color:#00ff88; font-size:1.3rem;">مفتوح</span>';
            
            if (isSelected) {
                selectBtn.innerHTML = 'محدد ✅';
                selectBtn.disabled = true;
                canvasContainer.classList.add('glow');
            } else {
                selectBtn.innerHTML = 'اختيار 👆';
                selectBtn.disabled = false;
                canvasContainer.classList.remove('glow');
            }
        } else {
            canvasContainer.classList.add('locked');
            canvasContainer.classList.remove('glow');
            reqDisplay.innerHTML = `🔒 <span style="color:#ffcc00">مطلوب ${skin.unlockScore} نقطة</span>`;
            selectBtn.innerHTML = 'مغلق 🔒';
            selectBtn.disabled = true;
        }
    },

    startPreviewAnimation() {
        const canvas = document.getElementById('skin-preview-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const drawPreview = () => {
            // Stop logic if modal is hidden
            const modal = document.getElementById('skins-modal');
            if (!modal || modal.style.display === 'none') {
                this.previewAnimId = null;
                return;
            }
            
            this.previewAnimFrame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const skin = SKINS[this.carouselIndex];
            if (!skin) {
                this.previewAnimId = requestAnimationFrame(drawPreview);
                return;
            }
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            
            // Draw idle snake horizontal wave
            // Center snake on canvas, make it face right
            const segments = [];
            const length = 35;
            const radius = 10;
            const segmentSpacing = 4.5;
            
            // Calculate base starting position (head)
            // total width of snake is roughly length * segmentSpacing
            const totalWidth = length * segmentSpacing;
            const headX = cx + (totalWidth / 2) - 15;
            
            // Generate a curved horizontal shape with wave animation
            for (let i = 0; i < length; i++) {
                // Time factor for animation speed
                const time = this.previewAnimFrame * 0.05;
                
                // Phase drives the wave along the body
                const wavePhase = i * 0.25; 
                
                // Vertical wave offset
                const yOffset = Math.sin(wavePhase - time) * 16;
                
                // Horizontal subtle squish for realism
                const xOffset = Math.cos(wavePhase - time) * 4;
                
                segments.push({
                    x: headX - (i * segmentSpacing) + xOffset,
                    y: cy + yOffset
                });
            }

            // 1. Continuous tube
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.strokeStyle = skin.colors[0];
            ctx.lineWidth = radius * 2;
            ctx.moveTo(segments[0].x, segments[0].y);
            for (let i = 1; i < segments.length; i++) {
                ctx.lineTo(segments[i].x, segments[i].y);
            }
            ctx.stroke();

            // 2. Body scales
            for (let i = segments.length - 1; i >= 1; i--) {
                const seg = segments[i];
                const prev = segments[i - 1];
                const r = radius * (1 - (i/length) * 0.25);
                const color = skin.pattern === 'stripe' ? 
                    skin.colors[Math.floor(i / 4) % skin.colors.length] : 
                    skin.colors[i % skin.colors.length];

                ctx.beginPath();
                ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                // Gap filling
                const dist = Math.sqrt(Math.pow(seg.x-prev.x,2) + Math.pow(seg.y-prev.y,2));
                if (dist > r * 1.2) {
                    ctx.beginPath();
                    ctx.arc((seg.x+prev.x)/2, (seg.y+prev.y)/2, r, 0, Math.PI * 2);
                    ctx.fillStyle = color;
                    ctx.fill();
                }

                if (i % 4 === 0) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            // 3. Head & Glow
            const h = segments[0];
            const headAngle = Math.atan2(segments[1].y - h.y, segments[1].x - h.x) + Math.PI;

            // Head Glow
            ctx.beginPath();
            ctx.arc(h.x, h.y, radius * 4, 0, Math.PI * 2);
            const headGlow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, radius * 4);
            headGlow.addColorStop(0, skin.headGlow || skin.colors[0]);
            headGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = headGlow;
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Head base
            ctx.beginPath();
            ctx.arc(h.x, h.y, radius * 1.4, 0, Math.PI * 2);
            ctx.fillStyle = skin.colors[0];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Eyes
            const eyeOffset = radius * 1.4 * 0.4;
            const eyeR = radius * 1.4 * 0.32;
            const ea1 = headAngle - 0.5;
            const ea2 = headAngle + 0.5;
            
            [ea1, ea2].forEach(ea => {
                const ex = h.x + Math.cos(ea) * eyeOffset;
                const ey = h.y + Math.sin(ea) * eyeOffset;
                ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI*2); ctx.fillStyle = '#fff'; ctx.fill();
                
                const px = ex + Math.cos(headAngle) * eyeR * 0.55 * 0.3;
                const py = ey + Math.sin(headAngle) * eyeR * 0.55 * 0.3;
                ctx.beginPath(); ctx.arc(px, py, eyeR * 0.55, 0, Math.PI*2); ctx.fillStyle = '#111'; ctx.fill();
                ctx.beginPath(); ctx.arc(px - eyeR*0.16, py - eyeR*0.16, eyeR*0.16, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
            });

            this.previewAnimId = requestAnimationFrame(drawPreview);
        };
        this.previewAnimId = requestAnimationFrame(drawPreview);
    },

    getSkin(id) {
        return SKINS.find(s => s.id === id) || SKINS[0];
    },
    
    // Helper for AI to pick random skins (allowing them to use any skin to show off)
    getRandomSkinId() {
        return SKINS[Math.floor(Math.random() * SKINS.length)].id;
    }
};
