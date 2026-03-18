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
    const turnRate = snake.turnRate || (snake.isAI ? 0.08 : 0.12);
    snake.angle += angleDiff * turnRate * dt;

    // Speed (scaled by dt)
    const baseSpeed = snake.boosting ? BOOST_SPEED : BASE_SPEED;
    const speed = baseSpeed * dt;

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
}
