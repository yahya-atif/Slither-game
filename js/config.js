// ================================================
//  SLITHER ARENA – Game Configuration & Constants
// ================================================

const WORLD_SIZE = 4000;
const FOOD_COUNT = 400; // Reduced to help performance
const AI_COUNT = 8;
const INITIAL_LENGTH = 15;
const SEGMENT_SPACING = 10;
const BASE_SPEED = 4.5;   // User-requested speed
const BOOST_SPEED = 6.0;  // Increased for faster boost
const HEAD_RADIUS = 12;
const BODY_RADIUS = 10;
const FOOD_RADIUS = 6;
const GROW_PER_FOOD = 2;
const BORDER_MARGIN = 80;
const MIN_BOOST_LENGTH = 10;
const SAFE_LENGTH = 2000; // After this length, snake starts to "evaporate"
const EVAPORATION_RATE = 0.00015; // Rate of shrinkage per frame per excess segment

// ============ SKIN DEFINITIONS ============
const SKINS = [
    {
        name: 'Neon Viper',
        colors: ['#00ff88', '#00cc66', '#00ff88', '#00ffcc'],
        eyeColor: '#fff',
        headGlow: 'rgba(0,255,136,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Cyber Coral',
        colors: ['#ff4466', '#ff6688', '#ff4466', '#ff2244'],
        eyeColor: '#fff',
        headGlow: 'rgba(255,68,102,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Ocean Wave',
        colors: ['#00ccff', '#0088ff', '#00ccff', '#44ddff'],
        eyeColor: '#fff',
        headGlow: 'rgba(0,204,255,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Royal Gold',
        colors: ['#ffcc00', '#ff9900', '#ffcc00', '#ffdd44'],
        eyeColor: '#000',
        headGlow: 'rgba(255,204,0,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Toxic Purple',
        colors: ['#aa44ff', '#8800cc', '#aa44ff', '#cc66ff'],
        eyeColor: '#fff',
        headGlow: 'rgba(170,68,255,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Fire Storm',
        colors: ['#ff4400', '#ff8800', '#ff4400', '#ffcc00'],
        eyeColor: '#fff',
        headGlow: 'rgba(255,68,0,0.5)',
        pattern: 'stripe'
    },
    {
        name: 'Arctic Frost',
        colors: ['#88ddff', '#ffffff', '#88ddff', '#aaeeff'],
        eyeColor: '#003',
        headGlow: 'rgba(136,221,255,0.5)',
        pattern: 'stripe'
    },
    {
        name: 'Jungle Camo',
        colors: ['#44aa44', '#226622', '#66cc44', '#226622'],
        eyeColor: '#ff0',
        headGlow: 'rgba(68,170,68,0.5)',
        pattern: 'stripe'
    },
    {
        name: 'Midnight Rose',
        colors: ['#ff44aa', '#cc0066', '#ff44aa', '#ff88cc'],
        eyeColor: '#fff',
        headGlow: 'rgba(255,68,170,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Lava Core',
        colors: ['#ff2200', '#880000', '#ff4400', '#ff0000'],
        eyeColor: '#ff0',
        headGlow: 'rgba(255,34,0,0.6)',
        pattern: 'stripe'
    },
    {
        name: 'Electric Blue',
        colors: ['#0044ff', '#0088ff', '#0044ff', '#00aaff'],
        eyeColor: '#fff',
        headGlow: 'rgba(0,68,255,0.5)',
        pattern: 'solid'
    },
    {
        name: 'Sakura',
        colors: ['#ffaacc', '#ff6699', '#ffaacc', '#ffccdd'],
        eyeColor: '#333',
        headGlow: 'rgba(255,170,204,0.5)',
        pattern: 'solid'
    }
];

// ============ AI NAMES ============
const AI_NAMES = [
    'Shadow', 'Venom', 'Blaze', 'Frost', 'Ghost',
    'Thunder', 'Storm', 'Fury', 'Spike', 'Cobra',
    'Fang', 'Raze', 'Nova', 'Apex', 'Titan'
];

// ============ AI DIFFICULTY LEVELS ============
// Each level controls how smart the AI behaves
const AI_DIFFICULTIES = [
    {
        name: 'noob',           // غبي جداً
        turnAccuracy: 0.02,     // بطيء جداً في الدوران
        reactionInterval: 120,  // بطيء جداً في الاستجابة
        foodVision: 100,        // مدى رؤية قصير جداً
        dangerVision: 50,       // ما يشوف الخطر إلا قريب جداً
        huntChance: 0,          // ما يصطاد أبداً
        fleeSmarts: false,      // ما يهرب بذكاء
        wanderJitter: 2.5,      // يتعرج كثير
        boostInFlee: false,     // ما يستخدم البوست
        canIntercept: false,    // ما يقدر يقطع الطريق
        borderReact: 100        // يلاحظ الحدود متأخر
    },
    {
        name: 'easy',           // سهل
        turnAccuracy: 0.035,
        reactionInterval: 75,
        foodVision: 150,
        dangerVision: 80,
        huntChance: 0.15,
        fleeSmarts: false,
        wanderJitter: 2.0,
        boostInFlee: false,
        canIntercept: false,
        borderReact: 140
    },
    {
        name: 'medium',         // متوسط
        turnAccuracy: 0.05,
        reactionInterval: 45,
        foodVision: 200,
        dangerVision: 120,
        huntChance: 0.35,
        fleeSmarts: true,
        wanderJitter: 1.5,
        boostInFlee: true,
        canIntercept: false,
        borderReact: 180
    },
    {
        name: 'hard',           // ذكي جداً
        turnAccuracy: 0.07,
        reactionInterval: 25,
        foodVision: 280,
        dangerVision: 170,
        huntChance: 0.6,
        fleeSmarts: true,
        wanderJitter: 1.2,
        boostInFlee: true,
        canIntercept: true,
        borderReact: 220
    }
];
