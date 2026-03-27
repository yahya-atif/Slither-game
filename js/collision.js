// ================================================
//  SLITHER ARENA – Collision Detection
// ================================================

function checkFoodCollision(snake) {
    const head = snake.segments[0];
    const threshold = (HEAD_RADIUS + FOOD_RADIUS) * (HEAD_RADIUS + FOOD_RADIUS);

    for (let i = foods.length - 1; i >= 0; i--) {
        const food = foods[i];
        const dx = head.x - food.x;
        const dy = head.y - food.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < threshold) {
            snake.score += food.value;
            
            // Add coins if it's the player
            if (snake === player && typeof SkinsManager !== 'undefined') {
                const coinsToEarn = Math.floor(food.value * 0.4) || 1;
                SkinsManager.addCoins(coinsToEarn);
            }
            
            // Power-up active multiplier (x2)
            if (snake.powerUp && snake.powerUp.type === 'x2') {
                snake.score += food.value; // Double
            }
            
            // Combo system: rapid eating gives bonus
            if (snake === player && typeof comboTimer !== 'undefined') {
                if (comboTimer > 0) {
                    comboCount++;
                    const bonus = Math.floor(food.value * comboCount * 0.2);
                    snake.score += bonus;
                    if (comboCount >= 3) {
                        spawnFloatingText(food.x, food.y - 15, `x${comboCount}!`);
                    }
                }
                comboTimer = 30;
            }
            
            snake.growQueue += GROW_PER_FOOD * food.value;
            
            // Power-up activation
            if (food.isPowerUp) {
                if (food.powerType === 'teleport') {
                    // Effect at old location
                    for (let j = 0; j < 15; j++) {
                        particles.push({
                            x: snake.segments[0].x, y: snake.segments[0].y,
                            vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                            color: '#a020f0', life: 20, maxLife: 20, radius: 4
                        });
                    }

                    // Instantly teleport the snake far away
                    const newX = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
                    const newY = BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2);
                    for (let s of snake.segments) {
                        s.x = newX;
                        s.y = newY;
                    }
                    
                    // Effect at new location
                    for (let j = 0; j < 20; j++) {
                        particles.push({
                            x: newX, y: newY,
                            vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15,
                            color: '#ffffff', life: 25, maxLife: 25, radius: 3
                        });
                    }

                    if (snake === player && typeof camera !== 'undefined') {
                        camera.x = newX - canvas.width / 2;
                        camera.y = newY - canvas.height / 2;
                    }
                    
                    if (snake === player) addAchievement(food.powerIcon, 'انتقال آني!');
                } else if (food.powerDuration > 0) {
                    snake.powerUp = { type: food.powerType, timer: food.powerDuration };
                    if (snake === player) {
                        const labels = { 'magnet': 'مغناطيس!', 'shield': 'درع!', 'x2': 'نقاط مضاعفة!' };
                        addAchievement(food.powerIcon, labels[food.powerType] || 'قوة خاصة!');
                    }
                }
            }
            
            // Visual Polish: Floating score text
            if (typeof spawnFloatingText === 'function' && (snake === player || distance(head, {x: camera.x + canvas.width/2, y: camera.y + canvas.height/2}) < canvas.width)) {
                spawnFloatingText(food.x, food.y, `+${food.value}`);
            }
            
            // Zoom pulse when player eats
            if (snake === player && typeof zoomPulse !== 'undefined') {
                zoomPulse = food.isPowerUp ? 0.08 : 0.03;
            }

            // Eating burst effect - satisfying particle explosion
            const burstCount = food.isPowerUp ? 10 : 6;
            for (let j = 0; j < burstCount; j++) {
                const angle = (j / burstCount) * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                particles.push({
                    x: food.x, y: food.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: food.color,
                    life: 20 + Math.random() * 10,
                    maxLife: 30,
                    radius: 2 + Math.random() * 2
                });
            }
            // Expanding shockwave ring
            particles.push({
                x: food.x, y: food.y,
                vx: 0, vy: 0,
                color: food.color,
                life: 12,
                maxLife: 12,
                radius: food.isPowerUp ? 20 : 12,
                isRing: true
            });

            foods.splice(i, 1);
            if (snake === player) {
                AudioManager.playSound('eat');
            }
        }
    }
}

function checkSnakeCollisions() {
    const allSnakes = [player, ...aiSnakes];
    const thresholdSq = (HEAD_RADIUS + BODY_RADIUS - 2) * (HEAD_RADIUS + BODY_RADIUS - 2);

    for (const snake of allSnakes) {
        if (!snake.alive || snake.invincibleTimer > 0) continue;
        const head = snake.segments[0];

        for (const other of allSnakes) {
            if (other === snake || !other.alive) continue;

            // Optimization: Skip snakes that are obviously too far away
            const otherHead = other.segments[0];
            const dxH = head.x - otherHead.x;
            const dyH = head.y - otherHead.y;
            const distHeadsSq = dxH * dxH + dyH * dyH;
            const maxRangeSq = 1200 * 1200; // Only check snakes nearby
            if (distHeadsSq > maxRangeSq) continue;

            // Check head against body (skip first few segments) - OPTIMIZED: Skip segments for performance
            const collisionStep = other.segments.length > 300 ? 5 : 3;
            const bufferedThresholdSq = (HEAD_RADIUS + BODY_RADIUS + 1) * (HEAD_RADIUS + BODY_RADIUS + 1);

            for (let i = 6; i < other.segments.length; i += collisionStep) {
                const seg = other.segments[i];
                const dx = head.x - seg.x;
                const dy = head.y - seg.y;
                const dSq = dx * dx + dy * dy;

                if (dSq < bufferedThresholdSq) {
                    // Add kill feed notification
                    if (typeof killFeed !== 'undefined') {
                        killFeed.push({
                            killer: other.name,
                            victim: snake.name,
                            killerColor: (typeof SkinsManager !== 'undefined' ? SkinsManager.getSkin(other.skinIndex) : { colors: ['#fff'] }).colors[0],
                            life: 180 // ~3 seconds
                        });
                    }
                    
                    killSnake(snake);
                    other.score += Math.floor(snake.score * 0.5) + 5;
                    if (other.kills !== undefined) other.kills++;
                    
                    // Screen shake when player dies
                    if (snake === player && typeof screenShake !== 'undefined') {
                        screenShake.intensity = 20;
                        if (typeof slowMo !== 'undefined') slowMo = 30; // ~0.5s of slow-mo
                    }
                    break;
                }
            }

            if (!snake.alive) break;
        }
    }
}

function killSnake(snake) {
    snake.alive = false;
    
    if (snake === player) {
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playSound('death');
            AudioManager.stopMusic();
        }
        if (typeof SkinsManager !== 'undefined') {
            SkinsManager.checkUnlocks(player.maxScore || player.score);
        }
    }

    // Convert body to food - CAPPED at 25 to prevent lag spikes
    const maxDeathFood = 25;
    const step = Math.max(3, Math.floor(snake.segments.length / maxDeathFood));
    let foodCount = 0;
    for (let i = 0; i < snake.segments.length && foodCount < maxDeathFood; i += step) {
        const seg = snake.segments[i];
        const food = createBigFood(
            seg.x + (Math.random() - 0.5) * 20,
            seg.y + (Math.random() - 0.5) * 20
        );
        food.color = (typeof SkinsManager !== 'undefined' ? SkinsManager.getSkin(snake.skinIndex) : { colors: ['#fff'] }).colors[0];
        food.value = Math.max(1, Math.floor(snake.score / maxDeathFood)); // Distribute value
        foods.push(food);
        foodCount++;
    }

    // Death particles - reduced for perf
    const skin = (typeof SkinsManager !== 'undefined' ? SkinsManager.getSkin(snake.skinIndex) : { colors: ['#fff'] });
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: snake.segments[0].x,
            y: snake.segments[0].y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: skin.colors[Math.floor(Math.random() * skin.colors.length)],
            life: 40,
            maxLife: 40,
            radius: 4 + Math.random() * 4
        });
    }

    // Player death → game over
    if (!snake.isAI) {
        setTimeout(() => {
            gameRunning = false;
            // Call the new stats UI function if available
            if (typeof showGameOverStats === 'function') {
                showGameOverStats();
            } else {
                document.getElementById('final-score').textContent = snake.score;
                document.getElementById('game-over').classList.add('active');
            }
        }, 800);
    }

    snake.respawnTimer = 0;
}
