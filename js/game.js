// ================================================
//  SLITHER ARENA – Game Loop, Input & HUD
// ================================================

// ============ GAME STATE ============
let canvas, ctx, minimapCanvas, minimapCtx;
let gameRunning = false;
let gamePaused = false;
let player = null;
let aiSnakes = [];
let foods = [];
let particles = [];
let floatingTexts = [];
let killFeed = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let comboCount = 0;
let comboTimer = 0;
let achievements = []; // { text, icon, life }
let playerRank = 0; // Current leaderboard position
let rankNotification = null; // { text, life }
let zoomPulse = 0; // Brief zoom in/out on eating
let proximityAlert = 0; // Pulse when enemy head is very close
let slowMo = 0; // Slow-motion on death
let camera = { x: 0, y: 0 };
let globalZoom = 1.0;
let mouseAngle = 0;
let isBoosting = false;
// let selectedSkin = -1; // Handled dynamically by SkinsManager now
let animFrame = 0;
let touchActive = false;
let fps = 0;
let lastFpsTime = performance.now();
let frameCount = 0;
let lastFrameTime = performance.now();
let deltaTime = 1.0;
let inputMode = 'mouse'; // 'mouse' or 'gamepad'
let gamepadIndex = null;
let joystickActive = false;
let joystickId = null;
let joystickStartX = 0;
let joystickStartY = 0;
let lastTapTime = 0;
let boostTouchId = null;
const JOYSTICK_MAX_RADIUS = 35;

// ============ UTILITIES ============
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function addAchievement(icon, text) {
    achievements.push({ icon, text, life: 180 }); // ~3 seconds
}

// ============ PARTICLES ============
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.skinEffect === 'fire') {
            p.vx *= 0.96;
            p.vy -= 0.04; // continuously drift upwards like smoke
        } else if (p.skinEffect === 'ice') {
            p.vx *= 0.98;
            p.vy *= 0.98; // keep floating longer
        } else if (p.skinEffect === 'electric') {
            p.vx *= 0.85;
            p.vy *= 0.85; // jitter and stop quickly
        } else {
            p.vx *= 0.95;
            p.vy *= 0.95;
        }
        
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
    
    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= ft.vy; // Drift upwards
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
    
    // Update kill feed
    for (let i = killFeed.length - 1; i >= 0; i--) {
        killFeed[i].life--;
        if (killFeed[i].life <= 0) killFeed.splice(i, 1);
    }
    
    // Update screen shake
    if (screenShake.intensity > 0.1) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= 0.9; // Decay
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
        screenShake.intensity = 0;
    }
    
    // Combo timer decay
    if (comboTimer > 0) {
        comboTimer--;
    } else {
        comboCount = 0;
    }
    
    // Update achievements
    for (let i = achievements.length - 1; i >= 0; i--) {
        achievements[i].life--;
        if (achievements[i].life <= 0) achievements.splice(i, 1);
    }
    
    // Update rank notification
    if (rankNotification) {
        rankNotification.life--;
        if (rankNotification.life <= 0) rankNotification = null;
    }
    
    // Update power-ups for all snakes
    const allSnakes = [player, ...aiSnakes].filter(s => s.alive);
    for (const s of allSnakes) {
        if (s.powerUp) {
            s.powerUp.timer--;
            
            // Magnet effect
            if (s.powerUp.type === 'magnet') {
                const head = s.segments[0];
                for (const food of foods) {
                    if (food.isPowerUp) continue;
                    const d = distance(head, food);
                    if (d < 200) {
                        const angle = Math.atan2(head.y - food.y, head.x - food.x);
                        food.x += Math.cos(angle) * 3;
                        food.y += Math.sin(angle) * 3;
                    }
                }
            }
            
            // Shield effect
            if (s.powerUp.type === 'shield') {
                s.invincibleTimer = 2; // Keep them invincible
            }
            
            if (s.powerUp.timer <= 0) {
                s.powerUp = null;
            }
        }
    }
    
    // Zoom pulse decay
    if (zoomPulse > 0.001) {
        zoomPulse *= 0.9;
    } else {
        zoomPulse = 0;
    }
    
    // Slow-mo decay
    if (slowMo > 0) {
        slowMo--;
    }
    
    // Proximity alert: detect nearby enemy heads
    if (player.alive) {
        const ph = player.segments[0];
        let closestDist = Infinity;
        const allEnemies = aiSnakes;
        for (const ai of allEnemies) {
            if (!ai.alive) continue;
            const d = distance(ph, ai.segments[0]);
            if (d < closestDist) closestDist = d;
        }
        if (closestDist < 150) {
            proximityAlert = Math.max(proximityAlert, (1 - closestDist / 150));
        } else {
            proximityAlert *= 0.92;
        }
    }
}

// ============ INIT ============
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
    
    // Add Input Indicator to HUD if missing
    if (!document.getElementById('input-indicator')) {
        const hudRow = document.querySelector('.hud-row');
        if (hudRow) {
            const inputIndicator = document.createElement('div');
            inputIndicator.id = 'input-indicator';
            inputIndicator.className = 'fps-badge';
            inputIndicator.style.left = 'auto';
            inputIndicator.style.right = '20px';
            inputIndicator.style.transform = 'none';
            inputIndicator.innerHTML = '⌨️/🖱️';
            hudRow.appendChild(inputIndicator);
        }
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (typeof SkinsManager !== 'undefined') SkinsManager.init();
    addBackgroundSnakes();

    document.getElementById('play-btn').addEventListener('click', () => {
        AudioManager.init(); // Init on first interaction
        AudioManager.playSound('click');
        startGame();
    });
    document.getElementById('player-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            AudioManager.init();
            startGame();
        }
    });
    document.getElementById('restart-btn').addEventListener('click', () => {
        AudioManager.playSound('click');
        restartGame();
    });
    document.getElementById('resume-btn').addEventListener('click', () => {
        AudioManager.playSound('click');
        resumeGame();
    });
    document.getElementById('quit-btn').addEventListener('click', () => {
        AudioManager.playSound('click');
        quitGame();
    });
    document.getElementById('go-quit-btn').addEventListener('click', () => {
        AudioManager.playSound('click');
        quitGame();
    });
    document.getElementById('mobile-pause-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        AudioManager.playSound('click');
        togglePause();
    });

    // Mouse
    canvas.addEventListener('mousemove', (e) => {
        if (!gameRunning || touchActive) return;
        
        // Switch to mouse mode
        if (inputMode === 'gamepad') {
            inputMode = 'mouse';
            updateInputUI('mouse');
        }
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        mouseAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    });
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isBoosting = true;
            AudioManager.playSound('boost');
            if (inputMode === 'gamepad') {
                inputMode = 'mouse';
                updateInputUI('mouse');
            }
        }
    });
    canvas.addEventListener('mouseup', () => isBoosting = false);

    // ====== MOBILE TOUCH (Anywhere Floating Joystick & Double-Tap Boost) ======
    canvas.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return; // Only mobile
        e.preventDefault();
        
        const now = Date.now();
        const isDoubleTap = (now - lastTapTime < 300);
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            // Double tap = Boost
            if (isDoubleTap && player.segments.length > MIN_BOOST_LENGTH) {
                isBoosting = true;
                boostTouchId = touch.identifier;
            }

            // If no joystick is active, this touch starts the joystick (anywhere)
            if (!joystickActive) {
                joystickActive = true;
                joystickId = touch.identifier;
                joystickStartX = touch.clientX;
                joystickStartY = touch.clientY;
                
                const joystickContainer = document.getElementById('joystick-container');
                if (joystickContainer) {
                    joystickContainer.style.left = (joystickStartX - 60) + 'px';
                    joystickContainer.style.top = (joystickStartY - 60) + 'px';
                    joystickContainer.style.display = 'block';
                }
            }
        }
        touchActive = true;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        if (window.innerWidth > 768) return;
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            if (touch.identifier === joystickId) {
                const dx = touch.clientX - joystickStartX;
                const dy = touch.clientY - joystickStartY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 5) {
                    mouseAngle = Math.atan2(dy, dx);
                }
                
                const joystickKnob = document.getElementById('joystick-knob');
                if (joystickKnob) {
                    let moveX = dx;
                    let moveY = dy;
                    if (dist > JOYSTICK_MAX_RADIUS) {
                        moveX = (dx / dist) * JOYSTICK_MAX_RADIUS;
                        moveY = (dy / dist) * JOYSTICK_MAX_RADIUS;
                    }
                    joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
                }
            }
        }
    }, { passive: false });
    
    const endTouch = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            
            if (touch.identifier === joystickId) {
                joystickActive = false;
                joystickId = null;
                const joystickContainer = document.getElementById('joystick-container');
                const joystickKnob = document.getElementById('joystick-knob');
                if (joystickContainer) joystickContainer.style.display = 'none';
                if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
            }
            
            if (touch.identifier === boostTouchId) {
                isBoosting = false;
                boostTouchId = null;
            }

            lastTapTime = Date.now();
        }
        
        if (e.touches.length === 0) {
            isBoosting = false;
            joystickActive = false;
            const joystickContainer = document.getElementById('joystick-container');
            if (joystickContainer) joystickContainer.style.display = 'none';
        }
    };
    
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);

    // Keyboard boost & pause
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && player.segments.length > MIN_BOOST_LENGTH) { 
            isBoosting = true; 
            inputMode = 'mouse'; 
            updateInputUI('mouse'); 
        }
        if (e.code === 'Escape' && gameRunning) togglePause();
    });
    window.addEventListener('keyup', (e) => { if (e.code === 'Space') isBoosting = false; });
    
    // Gamepad Connection Listeners
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected!", e.gamepad);
        gamepadIndex = e.gamepad.index;
        inputMode = 'gamepad';
        updateInputUI('gamepad');
    });
    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected!", e.gamepad);
        if (gamepadIndex === e.gamepad.index) {
            gamepadIndex = null;
            inputMode = 'mouse';
            updateInputUI('mouse');
        }
    });
});

function updateInputUI(mode) {
    const el = document.getElementById('input-indicator');
    if (el) {
        el.innerHTML = mode === 'gamepad' ? '🎮 Manette' : '⌨️/🖱️ Mouse';
        el.style.color = mode === 'gamepad' ? '#ff00ff' : 'rgba(255,255,255,0.6)';
        el.style.borderColor = mode === 'gamepad' ? 'rgba(255,0,255,0.3)' : 'rgba(255,255,255,0.05)';
    }
}

// ============ GAMEPAD INPUT ============
function pollGamepad() {
    if (gamepadIndex === null) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[gamepadIndex];
    if (!gp) return;

    // Read Left Stick (axes 0 = X, axes 1 = Y)
    const deadzone = 0.15;
    const ax = gp.axes[0];
    const ay = gp.axes[1];
    
    if (Math.abs(ax) > deadzone || Math.abs(ay) > deadzone) {
        if (inputMode !== 'gamepad') {
            inputMode = 'gamepad';
            updateInputUI('gamepad');
        }
        mouseAngle = Math.atan2(ay, ax);
    }
    
    // Read Buttons for Boost (A/Cross = 0, R2/RT = 7)
    const btnA = gp.buttons[0] && gp.buttons[0].pressed;
    const btnR2 = gp.buttons[7] && gp.buttons[7].pressed;
    
    // Only apply gamepad boost if in gamepad mode
    if (inputMode === 'gamepad') {
        isBoosting = btnA || btnR2;
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    minimapCanvas.width = 150;
    minimapCanvas.height = 150;
}

// Build skin UI is now fully handled by skins.js via SkinsManager 
// to automatically handle local storage syncing and unlock requirements.

// ============ VISUAL EFFECTS (SPEED LINES & TEXT) ============
function spawnSpeedLine(snake) {
    if (particles.length > 300) return; // Prevent lag
    
    const head = snake.segments[0];
    const offsetAngle = snake.angle + Math.PI + (Math.random() - 0.5) * 0.5; // Backwards and slightly spread
    const dist = HEAD_RADIUS + Math.random() * 10;
    
    particles.push({
        x: head.x + Math.cos(offsetAngle) * dist,
        y: head.y + Math.sin(offsetAngle) * dist,
        vx: Math.cos(offsetAngle) * (Math.random() * 2 + 1), // Drift backwards
        vy: Math.sin(offsetAngle) * (Math.random() * 2 + 1),
        life: 15 + Math.random() * 10,
        maxLife: 25,
        color: 'rgba(255, 255, 255, 0.4)',
        type: 'line',
        angle: snake.angle // Parallel to snake
    });
}
function spawnVapor(snake) {
    if (particles.length > 500) return;
    const head = snake.segments[0];
    
    // Spawn rising "energy vapor" particles around the head
    particles.push({
        x: head.x + (Math.random() - 0.5) * 40,
        y: head.y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1.0,
        vy: -Math.random() * 2 - 1,   // Always rising
        life: 20 + Math.random() * 20,
        maxLife: 40,
        color: 'rgba(255, 100, 100, 0.5)',
        type: 'glow',
        size: 3 + Math.random() * 4
    });
}

function spawnFloatingText(x, y, text) {
    floatingTexts.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - 20,
        text: text,
        vy: 1.5 + Math.random(),
        life: 40,
        maxLife: 40
    });
}

// ============ BG ANIMATION ============
function addBackgroundSnakes() {
    const screen = document.getElementById('start-screen');
    for (let i = 0; i < 20; i++) {
        const el = document.createElement('div');
        el.className = 'bg-snake';
        const skin = typeof SkinsManager !== 'undefined' ? SkinsManager.getSkin(SkinsManager.getRandomSkinId()) : { colors: ['#00ff88'] };
        el.style.background = skin.colors[0];
        el.style.left = Math.random() * 100 + '%';
        el.style.animationDuration = (8 + Math.random() * 12) + 's';
        el.style.animationDelay = Math.random() * 10 + 's';
        el.style.width = (6 + Math.random() * 8) + 'px';
        el.style.height = el.style.width;
        screen.appendChild(el);
    }
}

// ============ GAME START ============
function startGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    const skinLabel = document.querySelector('.skin-label');

    let valid = true;

    // Validate Name
    if (!name) {
        nameInput.classList.add('input-error');
        setTimeout(() => nameInput.classList.remove('input-error'), 500);
        valid = false;
    }

    // Validate Skin
    const activeSkinId = typeof SkinsManager !== 'undefined' ? SkinsManager.selectedSkin : 'default';
    if (!activeSkinId) {
        skinLabel.classList.add('label-error');
        setTimeout(() => skinLabel.classList.remove('label-error'), 500);
        valid = false;
    }

    if (!valid) return;

    // Reset skin run-tracking for duplicate prevention
    if (typeof SkinsManager !== 'undefined' && typeof SkinsManager.resetRun === 'function') {
        SkinsManager.resetRun();
    }

    document.getElementById('start-screen').style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('minimap').style.display = 'block';
    document.getElementById('game-over').classList.remove('active');

    // Create player
    const startX = WORLD_SIZE / 2 + (Math.random() - 0.5) * 1000;
    const startY = WORLD_SIZE / 2 + (Math.random() - 0.5) * 1000;
    player = createSnake(name, startX, startY, activeSkinId, false);

    // Create AI snakes with varying difficulty
    // Distribution: 2 noob, 2 easy, 2 medium, 2 hard
    const diffDistribution = [0, 0, 1, 1, 2, 2, 3, 3];
    aiSnakes = [];
    const usedSkins = new Set([activeSkinId]);
    for (let i = 0; i < AI_COUNT; i++) {
        let skinId;
        do {
            skinId = typeof SkinsManager !== 'undefined' ? SkinsManager.getRandomSkinId() : 'default';
        } while (usedSkins.has(skinId) && usedSkins.size < (typeof SKINS !== 'undefined' ? SKINS.length : 1));
        usedSkins.add(skinId);

        const ax = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
        const ay = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
        const aiName = AI_NAMES[i % AI_NAMES.length];
        const ai = createSnake(aiName, ax, ay, skinId, true);
        ai.aiState = 'wander';
        ai.aiTarget = null;
        ai.aiTimer = 0;
        ai.aiTurnBias = (Math.random() - 0.5) * 0.04;
        ai.aiDifficulty = diffDistribution[i % diffDistribution.length];
        aiSnakes.push(ai);
    }

    // Create food
    foods = [];
    for (let i = 0; i < FOOD_COUNT; i++) {
        foods.push(createFood());
    }

    particles = [];
    gameRunning = true;
    animFrame = 0;
    AudioManager.playMusic(); // Start Background Music
    gameLoop();
}

function restartGame() {
    document.getElementById('game-over').classList.remove('active');
    startGame();
}

// ============ PAUSE SYSTEM ============
function togglePause() {
    if (gamePaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    if (typeof gameRunning !== 'undefined' && gameRunning && (typeof gamePaused === 'undefined' || !gamePaused)) {
        gamePaused = true;
        document.getElementById('pause-menu').classList.add('active');
        document.getElementById('pause-score').textContent = player ? player.score : 0;
        if (typeof AudioManager !== 'undefined') {
            AudioManager.pauseMusic();
            AudioManager.playSound('pause');
        }
    }
}

function resumeGame() {
    if (typeof gameRunning !== 'undefined' && gameRunning && (typeof gamePaused !== 'undefined' && gamePaused)) {
        gamePaused = false;
        document.getElementById('pause-menu').classList.remove('active');
        if (typeof AudioManager !== 'undefined') {
            AudioManager.resumeMusic();
            AudioManager.playSound('resume');
        }
        requestAnimationFrame(gameLoop);
    }
}

function quitGame() {
    gameRunning = false;
    gamePaused = false;
    AudioManager.stopMusic();
    document.getElementById('pause-menu').classList.remove('active');
    document.getElementById('game-over').classList.remove('active');
    document.getElementById('hud').style.display = 'none';
    canvas.style.display = 'none';
    document.getElementById('minimap').style.display = 'none';
    document.getElementById('start-screen').style.display = '';
    
    // Hide Joystick
    const joystick = document.getElementById('joystick-container');
    if (joystick) joystick.style.display = 'none';
}

// ============ GAME LOOP ============
function gameLoop() {
    if (!gameRunning || gamePaused) {
        lastFrameTime = performance.now(); // Reset so dt doesn't spike after unpause
        return;
    }

    // Delta time calculation (normalized to 60fps baseline)
    const now = performance.now();
    const rawDt = (now - lastFrameTime) / 1000; // seconds
    lastFrameTime = now;
    deltaTime = Math.min(rawDt * 60, 3.0);
    
    // Apply slow-motion effect
    if (typeof slowMo !== 'undefined' && slowMo > 0) {
        deltaTime *= 0.3; // 30% speed during slow-mo
    } // Normalize: 1.0 at 60fps, 0.5 at 120fps, cap at 3.0 to prevent huge jumps

    // FPS Calculation
    frameCount++;
    const fpsElapsed = now - lastFpsTime;
    if (fpsElapsed >= 500) {
        fps = Math.round((frameCount * 1000) / fpsElapsed);
        frameCount = 0;
        lastFpsTime = now;
    }

    animFrame++;
    pollGamepad(); // Read controller input before update
    update();
    render();
    renderMinimap();
    updateHUD();

    requestAnimationFrame(gameLoop);
}

// ============ UPDATE ============
function update() {
    // Update player
    if (player.alive) {
        // Force boost OFF if snake is too small
        if (player.segments.length <= MIN_BOOST_LENGTH) {
            isBoosting = false;
            boostTouchId = null;
        }

        player.targetAngle = mouseAngle;
        player.boosting = isBoosting && player.segments.length > MIN_BOOST_LENGTH;
        updateSnake(player);
        
        // Spawn speed lines if player is boosting
        if (player.boosting && animFrame % 2 === 0) {
            spawnSpeedLine(player);
        }

        // Spawn vapor if evaporating
        if (player.segments.length > SAFE_LENGTH && animFrame % 4 === 0) {
            spawnVapor(player);
        }
    }

    // Update AI
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        updateAI(ai);
        updateSnake(ai);
        
        // Spawn speed lines for AI too
        if (ai.boosting && animFrame % 3 === 0) {
            spawnSpeedLine(ai);
        }

        // Spawn vapor for AI if evaporating
        if (ai.segments.length > SAFE_LENGTH && animFrame % 6 === 0) {
            spawnVapor(ai);
        }
    }

    // Food eating (player)
    if (player.alive) {
        checkFoodCollision(player);
    }

    // Food eating (AI)
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        checkFoodCollision(ai);
    }

    // Snake collisions
    checkSnakeCollisions();

    // Update particles
    updateParticles();

    // Respawn food
    while (foods.length < FOOD_COUNT) {
        foods.push(createFood());
    }
    
    // Spawn power-ups occasionally (~every 10 seconds at 60fps)
    if (typeof createPowerUp === 'function' && animFrame % 600 === 0) {
        const powerUpCount = foods.filter(f => f.isPowerUp).length;
        if (powerUpCount < 3) { // Max 3 power-ups on map
            foods.push(createPowerUp());
        }
    }

    // Respawn dead AI
    for (let i = 0; i < aiSnakes.length; i++) {
        if (!aiSnakes[i].alive) {
            aiSnakes[i].respawnTimer = (aiSnakes[i].respawnTimer || 0) + 1;
            if (aiSnakes[i].respawnTimer > 180) { // 3 seconds
                const ax = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
                const ay = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
                let skinId;
                do {
                    skinId = typeof SkinsManager !== 'undefined' ? SkinsManager.getRandomSkinId() : 'default';
                } while (typeof SkinsManager !== 'undefined' && skinId === SkinsManager.selectedSkin);
                const newAI = createSnake(AI_NAMES[i % AI_NAMES.length], ax, ay, skinId, true);
                newAI.aiState = 'wander';
                newAI.aiTarget = null;
                newAI.aiTimer = 0;
                newAI.aiTurnBias = (Math.random() - 0.5) * 0.04;
                newAI.aiDifficulty = Math.floor(Math.random() * AI_DIFFICULTIES.length);
                aiSnakes[i] = newAI;
            }
        }
    }

    // Smooth camera follow (zoom-aware)
    if (player.alive) {
        // Target centers the player's head, accounting for current zoom
        const targetX = player.segments[0].x - (canvas.width / 2) / (globalZoom || 1);
        const targetY = player.segments[0].y - (canvas.height / 2) / (globalZoom || 1);
        
        // Linear interpolation (lerp) for smooth movement
        const lerpFactor = 0.15 * (deltaTime || 1);
        camera.x += (targetX - camera.x) * Math.min(1.0, lerpFactor);
        camera.y += (targetY - camera.y) * Math.min(1.0, lerpFactor);
    }
}

function updateHUD() {
    // Only update Score every 12 frames (~200ms)
    if (animFrame % 12 === 0) {
        if (player.alive) {
            player.maxScore = Math.max(player.maxScore || 0, player.score);
            document.getElementById('score-value').textContent = Math.floor(player.score);
            
            // Check for skin unlocks instantly mid-game
            if (typeof SkinsManager !== 'undefined') {
                SkinsManager.checkUnlocks(player.maxScore);
            }
            // Length display
            const lenEl = document.getElementById('length-value');
            if (lenEl) lenEl.textContent = player.segments.length;
        }
    }
    
    // Update FPS exactly twice a second for UI stability
    if (animFrame % 30 === 0) {
        document.getElementById('fps-counter').textContent = `FPS: ${fps}`;
    }

    // Only update Leaderboard every 30 frames (~500ms) - VERY expensive DOM operation
    if (animFrame % 30 !== 0) return;

    // Update Leaderboard
    const allSnakes = [player, ...aiSnakes].filter(s => s.alive);
    allSnakes.sort((a, b) => b.score - a.score);
    const top5 = allSnakes.slice(0, 5);
    
    // Rank tracking & notifications
    const newRank = allSnakes.indexOf(player) + 1;
    if (playerRank > 0 && newRank !== playerRank && player.alive) {
        if (newRank < playerRank) {
            rankNotification = { text: `⬆️ أنت الآن #${newRank}!`, life: 120, up: true };
            if (newRank === 1) {
                addAchievement('👑', 'المتصدر!');
            }
        } else if (newRank > playerRank) {
            rankNotification = { text: `⬇️ نزلت لـ #${newRank}`, life: 90, up: false };
        }
    }
    playerRank = newRank;
    
    // Achievement checks
    if (player.alive && player.kills === 1 && !player._ach_firstKill) {
        addAchievement('💀', 'أول قتلة!');
        player._ach_firstKill = true;
    }
    if (player.alive && player.score >= 500 && !player._ach_500) {
        addAchievement('🏅', '500 نقطة!');
        player._ach_500 = true;
    }
    if (player.alive && player.score >= 1000 && !player._ach_1000) {
        addAchievement('🏆', '1000 نقطة!');
        player._ach_1000 = true;
    }
    if (player.alive && player.kills >= 5 && !player._ach_5kills) {
        addAchievement('🔥', '5 قتلات!');
        player._ach_5kills = true;
    }

    const lb = document.getElementById('leaderboard');
    // Generate leaderboard HTML
    let html = '<h3>🏆 المتصدرون</h3>';
    
    // Clear leader flags first
    allSnakes.forEach(s => s.isLeader = false);
    
    for (let i = 0; i < Math.min(5, allSnakes.length); i++) {
        const s = allSnakes[i];
        if (i === 0) s.isLeader = true; // Mark the top snake as leader
        
        const isPlayer = s === player;
        const nameClass = isPlayer ? 'player-name-hud' : '';
        const leaderClass = i === 0 ? ' leader-text' : ''; // Add glow class for top
        
        html += `
            <div class="lb-entry${isPlayer ? ' highlight' : ''}">
                <span class="rank">#${i + 1}</span>
                <span class="name ${nameClass}${leaderClass}">${s.name}</span>
                <span class="score">${s.score}</span>
            </div>
        `;
    }
    lb.innerHTML = html;
}

// ============ GAME OVER STATS (moved from instruction's diff for killSnake) ============
function showGameOverStats() {
    const timeAlive = Math.floor((performance.now() - player.birthTime) / 1000);
    const mins = Math.floor(timeAlive / 60);
    const secs = timeAlive % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    
    document.getElementById('final-score').innerText = player.score;
    document.getElementById('final-kills').innerText = player.kills;
    document.getElementById('final-time').innerText = timeStr;
    document.getElementById('game-over').classList.add('active');
    
    // Hide Joystick on game over
    const joystick = document.getElementById('joystick-container');
    if (joystick) joystick.style.display = 'none';
}
