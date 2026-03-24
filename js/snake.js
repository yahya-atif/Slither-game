// ================================================
//  SLITHER ARENA – Snake Creation & Movement
// ================================================

function createSnake(name, x, y, skinIndex, isAI) {
    const segments = [];
    const angle = Math.random() * Math.PI * 2;
    for (let i = 0; i < INITIAL_LENGTH; i++) {
        segments.push({
            x: x - Math.cos(angle) * i * SEGMENT_SPACING,
            y: y - Math.sin(angle) * i * SEGMENT_SPACING
        });
    }
    return {
        name,
        segments,
        angle,
        targetAngle: angle,
        skinIndex,
        isAI,
        alive: true,
        score: 0,
        boosting: false,
        boostTimer: 0,
        growQueue: 0,
        invincibleTimer: 0, // brief spawn protection
        kills: 0,
        powerUp: null, // { type, timer }
        birthTime: performance.now()
    };
}

function updateSnake(snake) {
    if (snake.invincibleTimer > 0) snake.invincibleTimer--;

    // Delta time (from game.js global)
    const dt = (typeof deltaTime !== 'undefined') ? deltaTime : 1.0;

    // Smooth turning (scaled by dt)
    let angleDiff = snake.targetAngle - snake.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    let turnRate = snake.turnRate || (snake.isAI ? 0.08 : 0.12);
    // Apply sensitivity for player
    if (!snake.isAI && typeof gameSettings !== 'undefined') {
        turnRate *= (gameSettings.sensitivity || 1.0);
    }
    snake.angle += angleDiff * turnRate * dt;

    // Score-based speed balancing (larger = slightly slower)
    const speedFactor = Math.max(0.65, 1.0 - (snake.score * 0.00004));
    
    // Speed (scaled by dt and speedFactor)
    const baseSpeed = snake.boosting ? BOOST_SPEED : BASE_SPEED;
    const speed = baseSpeed * speedFactor * dt;

    // Move head
    const head = snake.segments[0];
    const newHead = {
        x: head.x + Math.cos(snake.angle) * speed,
        y: head.y + Math.sin(snake.angle) * speed
    };

    // World bounds
    newHead.x = Math.max(BORDER_MARGIN, Math.min(WORLD_SIZE - BORDER_MARGIN, newHead.x));
    newHead.y = Math.max(BORDER_MARGIN, Math.min(WORLD_SIZE - BORDER_MARGIN, newHead.y));

    snake.segments.unshift(newHead);

    // Growth
    if (snake.growQueue > 0) {
        snake.growQueue--;
    } else {
        snake.segments.pop();
    }

    // ============ EVAPORATION SYSTEM ============
    // Smooth shrinkage when exceeding SAFE_LENGTH
    if (snake.segments.length > SAFE_LENGTH) {
        const excess = snake.segments.length - SAFE_LENGTH;
        const evaporationAmount = excess * EVAPORATION_RATE * dt;
        snake.evapBuffer = (snake.evapBuffer || 0) + evaporationAmount;
        
        if (snake.evapBuffer >= 1) {
            const numToShrink = Math.floor(snake.evapBuffer);
            for (let i = 0; i < numToShrink; i++) {
                if (snake.segments.length > INITIAL_LENGTH) {
                    snake.segments.pop();
                    // Reduce score proportionally to shrinkage
                    snake.score = Math.max(0, snake.score - GROW_PER_FOOD);
                }
            }
            snake.evapBuffer -= numToShrink;
        }
    }

    // Boosting costs segments
    if (snake.boosting) {
        snake.boostTimer++;
        if (snake.boostTimer % 6 === 0 && snake.segments.length > 10) {
            const tail = snake.segments.pop();
            foods.push(createFood(tail.x + (Math.random()-0.5)*20, tail.y + (Math.random()-0.5)*20));
        }
    } else {
        snake.boostTimer = 0;
    }

    // ============ SKIN PARTICLE TRAILS ============
    // Emit cosmetic particles based on skin effects
    if (typeof particles !== 'undefined' && particles.length < 300 && snake.segments.length > 2) {
        const lowGraphics = typeof gameSettings !== 'undefined' && gameSettings.graphics === 'low';
        if (!lowGraphics) {
            const skin = typeof SkinsManager !== 'undefined' ? SkinsManager.getSkin(snake.skinIndex) : null;
            if (skin && skin.effect) {
                // Emit rate is higher when boosting
                const emitChance = snake.boosting ? 0.7 : 0.25;
                if (Math.random() < emitChance * dt) {
                    const head = snake.segments[0];
                    let pColor = skin.colors[0];
                    let pVx = 0, pVy = 0;
                    let pLife = 20, pMaxLife = 20;
                    let pRadius = 2;
                    let isSkinTrail = true;
                    
                    if (skin.effect === 'fire') {
                        pColor = Math.random() > 0.5 ? '#ff4400' : '#ff8800';
                        pVx = (Math.random() - 0.5) * 0.8;
                        pVy = -0.5 - Math.random() * 1.5; // rising smoke/fire
                        pLife = 35; pMaxLife = 35;
                        pRadius = 3 + Math.random() * 4;
                    } else if (skin.effect === 'electric') {
                        pColor = (Math.random() > 0.5) ? '#ffff00' : '#00ccff';
                        pVx = (Math.random() - 0.5) * 4; // fast jitter
                        pVy = (Math.random() - 0.5) * 4;
                        pLife = 12; pMaxLife = 12; // short life spark
                        pRadius = 1.5 + Math.random() * 2.5;
                    } else if (skin.effect === 'ice') {
                        pColor = Math.random() > 0.5 ? '#88ddff' : '#ffffff';
                        pVx = (Math.random() - 0.5) * 0.6; // slow drifting
                        pVy = (Math.random() - 0.5) * 0.6;
                        pLife = 45; pMaxLife = 45; // long lingering drift
                        pRadius = 2 + Math.random() * 3;
                    }

                    if (skin.effect === 'fire' || skin.effect === 'electric' || skin.effect === 'ice') {
                        // Offset particle slightly behind the head for illusion of trailing
                        const offsetIdx = Math.min(snake.segments.length - 1, 2);
                        const spawnPos = snake.segments[offsetIdx];
                        
                        particles.push({
                            x: spawnPos.x + (Math.random() - 0.5) * 12,
                            y: spawnPos.y + (Math.random() - 0.5) * 12,
                            vx: pVx,
                            vy: pVy,
                            color: pColor,
                            life: pLife,
                            maxLife: pMaxLife,
                            radius: pRadius,
                            skinEffect: skin.effect
                        });
                    }
                }
            }
        }
    }
}
