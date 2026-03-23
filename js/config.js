// ================================================
//  SLITHER ARENA – Game Configuration & Constants
// ================================================

const WORLD_SIZE = 4000;
const FOOD_COUNT = 400; // Reduced to help performance
const AI_COUNT = 8;
const INITIAL_LENGTH = 15;
const SEGMENT_SPACING = 5;
const BASE_SPEED = 4.5;   // User-requested speed
const BOOST_SPEED = 6.0;  // Increased for faster boost
const HEAD_RADIUS = 12;
const BODY_RADIUS = 12;
const FOOD_RADIUS = 6;
const GROW_PER_FOOD = 2;
const BORDER_MARGIN = 80;
const MIN_BOOST_LENGTH = 10;
const SAFE_LENGTH = 2000; // After this length, snake starts to "evaporate"
const EVAPORATION_RATE = 0.00015; // Rate of shrinkage per frame per excess segment

// SKINS defintions have been moved to js/skins.js for the dynamic progression system

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
