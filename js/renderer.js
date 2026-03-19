// ================================================
//  SLITHER ARENA – Rendering Engine
// ================================================

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep space background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Calculate Dynamic Zoom
    let targetZoom = 1.0;
    if (player.alive) {
        // Zoom out as score increases, max zoom out is 0.5
        targetZoom = Math.max(0.5, 1.0 - (player.score / 20000));
    }
    // Smooth zoom transition
    globalZoom += (targetZoom - globalZoom) * 0.05;
    
    // Apply zoom pulse (brief zoom-in when eating)
    const effectiveZoom = globalZoom + (typeof zoomPulse !== 'undefined' ? zoomPulse : 0);

    // Apply zoom around center of screen
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(effectiveZoom, effectiveZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply camera transform (with screen shake)
    const shakeX = (typeof screenShake !== 'undefined') ? screenShake.x : 0;
    const shakeY = (typeof screenShake !== 'undefined') ? screenShake.y : 0;
    ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

    // Grid (includes starfield)
    drawGrid();
    // World border
    drawWorldBorder();

    // Food
    drawFood();

    // Particles
    drawParticles();

    // Calculate visible bounds (accounting for zoom)
    const viewLeft = camera.x - 200 / globalZoom;
    const viewRight = camera.x + canvas.width / globalZoom + 200;
    const viewTop = camera.y - 200 / globalZoom;
    const viewBottom = camera.y + canvas.height / globalZoom + 200;

    // AI snakes (draw behind player) - with viewport culling
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        const ah = ai.segments[0];
        // Quick bounds check: skip if head is way off-screen
        const aiRange = ai.segments.length * SEGMENT_SPACING;
        if (ah.x + aiRange < viewLeft || ah.x - aiRange > viewRight ||
            ah.y + aiRange < viewTop || ah.y - aiRange > viewBottom) continue;
        drawSnake(ai);
    }

    // Player snake (draw on top)
    if (player.alive) drawSnake(player);

    ctx.restore();
    
    // Draw Kill Feed (screen-space, not world-space)
    if (typeof killFeed !== 'undefined' && killFeed.length > 0) {
        ctx.save();
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px Outfit, sans-serif';
        const feedX = 15;
        let feedY = canvas.height - 30;
        
        for (let i = killFeed.length - 1; i >= Math.max(0, killFeed.length - 5); i--) {
            const kf = killFeed[i];
            const alpha = Math.min(1, kf.life / 40);
            
            // Background pill
            const text = `☠ ${kf.killer} → ${kf.victim}`;
            const w = ctx.measureText(text).width + 20;
            ctx.fillStyle = `rgba(0,0,0,${alpha * 0.6})`;
            ctx.beginPath();
            ctx.roundRect(feedX, feedY - 14, w, 22, 8);
            ctx.fill();
            
            // Text
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.fillText(text, feedX + 10, feedY + 2);
            
            feedY -= 28;
        }
        ctx.restore();
    }
    
    // Combo Indicator (DOM-based)
    updateComboUI();
    
    // Border Warning Overlay (red vignette when near world edges)
    if (player.alive) {
        const ph = player.segments[0];
        const borderWarnDist = 300;
        const edgeDists = [
            ph.x - BORDER_MARGIN, // left
            WORLD_SIZE - BORDER_MARGIN - ph.x, // right
            ph.y - BORDER_MARGIN, // top
            WORLD_SIZE - BORDER_MARGIN - ph.y  // bottom
        ];
        const minEdge = Math.min(...edgeDists);
        if (minEdge < borderWarnDist) {
            const warnAlpha = Math.max(0, (1 - minEdge / borderWarnDist)) * 0.4;
            const grad = ctx.createRadialGradient(
                canvas.width/2, canvas.height/2, Math.min(canvas.width, canvas.height) * 0.3,
                canvas.width/2, canvas.height/2, Math.max(canvas.width, canvas.height) * 0.7
            );
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(1, `rgba(255, 0, 0, ${warnAlpha})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
      // Active Power-Up UI (DOM-based)
    updatePowerUpUI();
    
    // Achievement Popups (right side)
    if (typeof achievements !== 'undefined' && achievements.length > 0) {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px Outfit, sans-serif';
        let achY = 120;
        for (const ach of achievements) {
            const alpha = Math.min(1, ach.life / 30);
            const slideX = ach.life > 150 ? (180 - ach.life) * 5 : 0; // Slide-in animation
            
            ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
            const text = `${ach.icon} ${ach.text}`;
            const tw = ctx.measureText(text).width + 24;
            ctx.beginPath();
            ctx.roundRect(canvas.width - tw - 15 + slideX, achY - 14, tw, 28, 10);
            ctx.fill();
            
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.fillText(text, canvas.width - 20 + slideX, achY + 4);
            achY += 35;
        }
        ctx.restore();
    }
    
    // Rank Change Notification (DOM-based)
    updateRankUI();
}

/**
 * Updates the new DOM-based Rank notification
 */
function updateRankUI() {
    const notifier = document.getElementById('rank-notifier');
    if (!notifier) return;

    if (typeof rankNotification !== 'undefined' && rankNotification && rankNotification.life > 0) {
        notifier.style.display = 'block';
        notifier.textContent = rankNotification.text;
        
        const alpha = Math.min(1, rankNotification.life / 20);
        notifier.style.opacity = alpha;
        
        // Color based on rank up/down
        notifier.style.color = rankNotification.up ? '#00ff88' : '#ff4466';
        notifier.style.textShadow = rankNotification.up 
            ? '0 0 20px rgba(0,255,136,0.6)' 
            : '0 0 20px rgba(255,68,102,0.6)';
    } else {
        notifier.style.display = 'none';
    }
}

function drawBackground() {
    const grad = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width * 0.7
    );
    grad.addColorStop(0, '#111128');
    grad.addColorStop(1, '#080816');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawWorldBorder() {
    ctx.strokeStyle = 'rgba(255,50,50,0.4)';
    ctx.lineWidth = 6;
    ctx.setLineDash([20, 10]);
    ctx.strokeRect(BORDER_MARGIN, BORDER_MARGIN, WORLD_SIZE - BORDER_MARGIN * 2, WORLD_SIZE - BORDER_MARGIN * 2);
    ctx.setLineDash([]);

    // Glow near border
    const head = player.segments[0];
    const borderGlow = Math.min(
        head.x - BORDER_MARGIN,
        head.y - BORDER_MARGIN,
        WORLD_SIZE - BORDER_MARGIN - head.x,
        WORLD_SIZE - BORDER_MARGIN - head.y
    );
    if (borderGlow < 200) {
        const alpha = (1 - borderGlow / 200) * 0.15;
        ctx.fillStyle = `rgba(255,50,50,${alpha})`;
        ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    }
}

function drawGrid() {
    const gridSize = 100;
    const padding = Math.max(canvas.width, canvas.height) / globalZoom + 200; // Account for zoom

    const startX = Math.floor((camera.x - padding) / gridSize) * gridSize;
    const startY = Math.floor((camera.y - padding) / gridSize) * gridSize;
    const endX = camera.x + canvas.width / globalZoom + padding;
    const endY = camera.y + canvas.height / globalZoom + padding;

    // --- Parallax Starfield ---
    // Deterministic pseudo-random stars based on coordinates
    ctx.fillStyle = '#ffffff';
    for (let x = startX; x < endX; x += gridSize * 2) {
        for (let y = startY; y < endY; y += gridSize * 2) {
            // Use bitwise operations for fast deterministic noise
            let hash = (x * 73856093 ^ y * 19349663) & 0xFFFF;
            if (hash % 10 < 3) { // 30% chance for a star
                let sx = x + (hash % gridSize * 2);
                let sy = y + ((hash >> 4) % gridSize * 2);
                let r = (hash % 3) + 1;
                let alpha = ((hash % 50) + 10) / 100; // 0.1 to 0.6
                
                // Parallax shift based on camera
                sx += camera.x * 0.5;
                sy += camera.y * 0.5;

                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI*2);
                ctx.fill();
            }
        }
    }
    ctx.globalAlpha = 1.0;

    // --- Grid Lines ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();
}

function drawFood() {
    // Zoom-aware culling bounds
    const fLeft = camera.x - 50;
    const fRight = camera.x + canvas.width / globalZoom + 50;
    const fTop = camera.y - 50;
    const fBottom = camera.y + canvas.height / globalZoom + 50;

    for (const food of foods) {
        // Culling with zoom
        if (food.x < fLeft || food.x > fRight ||
            food.y < fTop || food.y > fBottom) continue;

        food.pulse += 0.05;
        const pulseScale = 1 + Math.sin(food.pulse) * 0.2;
        const currentRadius = food.radius * pulseScale;

        // Power-up special rendering
        if (food.isPowerUp) {
            // Outer glow
            ctx.beginPath();
            ctx.arc(food.x, food.y, currentRadius * 3, 0, Math.PI * 2);
            const pg = ctx.createRadialGradient(food.x, food.y, currentRadius, food.x, food.y, currentRadius * 3);
            pg.addColorStop(0, food.powerGlow || 'rgba(255,255,0,0.5)');
            pg.addColorStop(1, 'transparent');
            ctx.fillStyle = pg;
            ctx.fill();
            
            // Inner orb
            ctx.beginPath();
            ctx.arc(food.x, food.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = food.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Icon
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${Math.round(currentRadius * 1.5)}px sans-serif`;
            ctx.fillText(food.powerIcon || '⭐', food.x, food.y);
            continue;
        }

        // Normal food rendering
        ctx.beginPath();
        ctx.arc(food.x, food.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = food.color;
        ctx.fill();

        // Simple stroke instead of expensive gradient
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function drawSnake(snake) {
    const skin = SKINS[snake.skinIndex];
    const segments = snake.segments;
    if (segments.length < 2) return;

    // Culling check (zoom-adjusted)
    const head = segments[0];
    const viewDist = (Math.max(canvas.width, canvas.height) / globalZoom) + segments.length * SEGMENT_SPACING;
    if (distance(head, { x: camera.x + canvas.width/(2*globalZoom), y: camera.y + canvas.height/(2*globalZoom) }) > viewDist) return;

    // LOD: Determine detail level based on zoom and whether this is the player
    const isPlayer = (snake === player);
    const drawDetails = isPlayer || globalZoom > 0.55;

    // Body glow trail - OPTIMIZED: Skip more segments
    ctx.save();
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < segments.length; i += 6) { // Skip 6 segments instead of 3
        const seg = segments[i];
        const t = i / segments.length;
        const glowR = (BODY_RADIUS + 8) * (1 - t * 0.3);
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = skin.headGlow;
        ctx.fill();
    }
    ctx.restore();

    // Body segments
    // Body segments - OPTIMIZED: Skip segments for performance
    const step = segments.length > 100 ? 3 : 2; // More aggressive skipping for very long snakes
    for (let i = segments.length - 1; i >= 1; i -= step) {
        const seg = segments[i];
        const t = i / segments.length;
        const radius = BODY_RADIUS * (1 - t * 0.25);

        // Color pattern
        let color;
        if (skin.pattern === 'stripe') {
            const colorIdx = Math.floor(i / 4) % skin.colors.length;
            color = skin.colors[colorIdx];
        } else {
            color = skin.colors[i % skin.colors.length];
        }

        // Body circle
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Subtle outline - Only draw outline for every other drawn segment to save more
        if (i % (step * 2) < step) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Head
    const h = segments[0];
    const headR = HEAD_RADIUS + (snake.boosting ? Math.sin(animFrame * 0.3) * 2 : 0);

    // Head glow
    ctx.beginPath();
    ctx.arc(h.x, h.y, headR * 2, 0, Math.PI * 2);
    const headGlow = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, headR * 2);
    headGlow.addColorStop(0, skin.headGlow);
    headGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = headGlow;
    ctx.fill();

    // Head circle
    ctx.beginPath();
    ctx.arc(h.x, h.y, headR, 0, Math.PI * 2);
    ctx.fillStyle = skin.colors[0];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes - Only draw if detail level allows
    if (drawDetails) {
        const eyeOffset = headR * 0.4;
        const eyeR = headR * 0.32;
        const pupilR = eyeR * 0.55;
        const eyeAngle1 = snake.angle - 0.5;
        const eyeAngle2 = snake.angle + 0.5;

        for (const ea of [eyeAngle1, eyeAngle2]) {
            const ex = h.x + Math.cos(ea) * eyeOffset;
            const ey = h.y + Math.sin(ea) * eyeOffset;

            ctx.beginPath();
            ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

            const px = ex + Math.cos(snake.angle) * pupilR * 0.3;
            const py = ey + Math.sin(snake.angle) * pupilR * 0.3;
            ctx.beginPath();
            ctx.arc(px, py, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#111';
            ctx.fill();

            // Catchlight
            ctx.beginPath();
            ctx.arc(px - pupilR*0.3, py - pupilR*0.3, pupilR*0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fill();
        }
    }
    
    // Power-up pulsing aura
    if (snake.powerUp) {
        const auraColors = { magnet: 'rgba(255, 0, 255, 0.4)', shield: 'rgba(0, 255, 255, 0.4)', x2: 'rgba(255, 221, 0, 0.4)' };
        const color = auraColors[snake.powerUp.type] || 'rgba(255, 255, 255, 0.3)';
        const pulse = 1 + Math.sin(animFrame * 0.15) * 0.2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(h.x, h.y, headR * 3 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }
    
    // Leader Crown / Glow - only if details are on
    if (snake.isLeader && drawDetails) {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(snake.angle);
        
        // Golden Aura
        ctx.beginPath();
        ctx.arc(0, 0, headR * 3, 0, Math.PI * 2);
        const aura = ctx.createRadialGradient(0, 0, headR, 0, 0, headR * 3);
        aura.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura;
        ctx.fill();
        
        // Crown shape
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(headR * 0.2, -headR * 0.8);
        ctx.lineTo(headR * 1.5, -headR * 1.2);
        ctx.lineTo(headR * 1.0, 0);
        ctx.lineTo(headR * 1.5, headR * 1.2);
        ctx.lineTo(headR * 0.2, headR * 0.8);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }

    // Name tag
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '600 13px Outfit, sans-serif';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(snake.name, h.x + 1, h.y - headR - 7);

    // Text
    ctx.fillStyle = snake.isAI ? 'rgba(255,255,255,0.85)' : '#00ff88';
    ctx.fillText(snake.name, h.x, h.y - headR - 8);

    // Rainbow boost trail
    if (snake.boosting) {
        for (let i = 0; i < 3; i++) {
            const tail = segments[segments.length - 1];
            const hue = (animFrame * 5 + i * 40) % 360;
            particles.push({
                x: tail.x + (Math.random()-0.5) * 12,
                y: tail.y + (Math.random()-0.5) * 12,
                vx: -Math.cos(snake.angle) * (2 + Math.random() * 2),
                vy: -Math.sin(snake.angle) * (2 + Math.random() * 2),
                color: `hsl(${hue}, 100%, 65%)`,
                life: 20,
                maxLife: 20,
                radius: 3 + Math.random() * 2
            });
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        
        if (p.isRing) {
            // Expanding shockwave ring
            const progress = 1 - alpha;
            const ringRadius = p.radius * (1 + progress * 3);
            ctx.beginPath();
            ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2 * alpha;
            ctx.stroke();
        } else {
            // Normal particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

// ============ MINIMAP ============
function renderMinimap() {
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, mw, mh);

    // Background
    minimapCtx.fillStyle = 'rgba(0,0,0,0.3)';
    minimapCtx.fillRect(0, 0, mw, mh);

    const scale = mw / WORLD_SIZE;

    // Food dots (sparse)
    minimapCtx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < foods.length; i += 10) {
        const f = foods[i];
        minimapCtx.fillRect(f.x * scale, f.y * scale, 1, 1);
    }

    // AI snakes
    for (const ai of aiSnakes) {
        if (!ai.alive) continue;
        const skin = SKINS[ai.skinIndex];
        minimapCtx.fillStyle = skin.colors[0] + '88';
        const h = ai.segments[0];
        minimapCtx.beginPath();
        minimapCtx.arc(h.x * scale, h.y * scale, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }

    // Player
    if (player.alive) {
        minimapCtx.fillStyle = '#00ff88';
        const h = player.segments[0];
        minimapCtx.beginPath();
        minimapCtx.arc(h.x * scale, h.y * scale, 4, 0, Math.PI * 2);
        minimapCtx.fill();

        // Glow
        minimapCtx.fillStyle = 'rgba(0,255,136,0.3)';
        minimapCtx.beginPath();
        minimapCtx.arc(h.x * scale, h.y * scale, 7, 0, Math.PI * 2);
        minimapCtx.fill();
        
        // Viewport rectangle
        const vx = camera.x * scale;
        const vy = camera.y * scale;
        const vw = (canvas.width / globalZoom) * scale;
        const vh = (canvas.height / globalZoom) * scale;
        minimapCtx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(vx, vy, vw, vh);
    }

    // Danger indicators (nearby enemies shown as pulsing red)
    for (const ai of aiSnakes) {
        if (!ai.alive || !player.alive) continue;
        const d = distance(ai.segments[0], player.segments[0]);
        if (d < 500) {
            const dangerAlpha = Math.max(0.2, 1 - d / 500);
            minimapCtx.strokeStyle = `rgba(255, 68, 68, ${dangerAlpha})`;
            minimapCtx.lineWidth = 2;
            minimapCtx.beginPath();
            minimapCtx.arc(ai.segments[0].x * scale, ai.segments[0].y * scale, 6, 0, Math.PI * 2);
            minimapCtx.stroke();
        }
    }

    // Border
    minimapCtx.strokeStyle = 'rgba(255,255,255,0.15)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, mw, mh);
}

/**
 * Updates the new DOM-based Power-Up timer
 */
function updatePowerUpUI() {
    const container = document.getElementById('power-up-container');
    if (!container) return;

    if (player && player.powerUp && player.powerUp.timer > 0) {
        const label = document.getElementById('power-up-label');
        const progress = document.getElementById('power-up-progress');
        
        container.style.display = 'block';
        
        // Handle type labels
        let typeLabel = '';
        switch(player.powerUp.type) {
            case 'magnet': typeLabel = '🧲 مغناطيس'; break;
            case 'shield': typeLabel = '🛡️ درع'; break;
            case 'x2': typeLabel = '⭐ x2 نقاط'; break;
            case 'teleport': typeLabel = '🌀 انتقال آني'; break;
            default: typeLabel = '✨ قوة خاصة';
        }
        label.textContent = typeLabel;
        
        // Timer percentage (assuming 10s / 600 frames base)
        const maxTime = 600; 
        const pct = Math.max(0, Math.min(100, (player.powerUp.timer / maxTime) * 100));
        progress.style.width = pct + '%';
        
        // Color coding
        const colors = { 
            magnet: 'linear-gradient(90deg, #ff00ff, #aa00ff)', 
            shield: 'linear-gradient(90deg, #00ffff, #0099ff)', 
            x2: 'linear-gradient(90deg, #ffdd00, #ff8800)',
            teleport: 'linear-gradient(90deg, #00ff88, #00ccff)'
        };
        progress.style.background = colors[player.powerUp.type] || '#fff';
    } else {
        container.style.display = 'none';
    }
}

/**
 * Updates the new DOM-based Combo notifier
 */
function updateComboUI() {
    const comboNotifier = document.getElementById('combo-notifier');
    if (!comboNotifier) return;

    if (typeof comboCount !== 'undefined' && comboCount >= 3 && player.alive && comboTimer > 0) {
        comboNotifier.style.display = 'block';
        comboNotifier.textContent = `🔥 x${comboCount} COMBO`;
        
        const alpha = Math.min(1, comboTimer / 10);
        comboNotifier.style.opacity = alpha;
    } else {
        comboNotifier.style.display = 'none';
    }
}
