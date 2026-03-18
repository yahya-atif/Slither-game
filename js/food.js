// ================================================
//  SLITHER ARENA – Food System
// ================================================

function createFood(x, y) {
    return {
        x: x !== undefined ? x : BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2),
        y: y !== undefined ? y : BORDER_MARGIN + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2),
        color: SKINS[Math.floor(Math.random() * SKINS.length)].colors[0],
        radius: FOOD_RADIUS * (0.7 + Math.random() * 0.6),
        pulse: Math.random() * Math.PI * 2,
        value: 1,
        isPowerUp: false
    };
}

function createBigFood(x, y) {
    const f = createFood(x, y);
    f.radius = FOOD_RADIUS * 1.5;
    f.value = 3;
    return f;
}

// Power-up types (600 frames = 10 seconds at 60fps)
const POWERUP_TYPES = [
    { name: 'magnet', color: '#ff00ff', glow: 'rgba(255,0,255,0.6)', icon: '🧲', duration: 600, value: 5 },
    { name: 'shield', color: '#00ffff', glow: 'rgba(0,255,255,0.6)', icon: '🛡️', duration: 600, value: 3 },
    { name: 'x2', color: '#ffdd00', glow: 'rgba(255,221,0,0.6)', icon: '⭐', duration: 600, value: 10 },
    { name: 'teleport', color: '#a020f0', glow: 'rgba(160,32,240,0.6)', icon: '🌀', duration: 0, value: 5 } // Instant effect
];

function createPowerUp() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    return {
        x: BORDER_MARGIN + 200 + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2 - 400),
        y: BORDER_MARGIN + 200 + Math.random() * (WORLD_SIZE - BORDER_MARGIN * 2 - 400),
        color: type.color,
        radius: FOOD_RADIUS * 2.5,
        pulse: 0,
        value: type.value,
        isPowerUp: true,
        powerType: type.name,
        powerGlow: type.glow,
        powerIcon: type.icon,
        powerDuration: type.duration
    };
}
