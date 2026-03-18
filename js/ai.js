// ================================================
//  SLITHER ARENA – AI Behavior System (Difficulty Levels)
// ================================================

// Generate a random waypoint within the safe play area
function randomWaypoint() {
    const margin = BORDER_MARGIN + 200;
    return {
        x: margin + Math.random() * (WORLD_SIZE - margin * 2),
        y: margin + Math.random() * (WORLD_SIZE - margin * 2)
    };
}

function updateAI(ai) {
    ai.aiTimer++;
    const head = ai.segments[0];
    const diff = AI_DIFFICULTIES[ai.aiDifficulty] || AI_DIFFICULTIES[1];

    // Initialize waypoint if missing
    if (!ai.waypoint) {
        ai.waypoint = randomWaypoint();
    }

    // Border avoidance – smarter AI reacts earlier
    const borderDist = diff.borderReact;
    if (head.x < borderDist || head.x > WORLD_SIZE - borderDist ||
        head.y < borderDist || head.y > WORLD_SIZE - borderDist) {
        const centerAngle = Math.atan2(WORLD_SIZE/2 - head.y, WORLD_SIZE/2 - head.x);
        ai.targetAngle = centerAngle;
        ai.aiState = 'flee_border';
        ai.boosting = false;
        return;
    }

    // Set turn rate based on difficulty (default, may be overridden per-state)
    ai.turnRate = diff.turnAccuracy;

    // State machine
    switch (ai.aiState) {
        case 'wander':
            ai.boosting = false;

            // Move towards waypoint
            const wpDist = distance(head, ai.waypoint);
            ai.targetAngle = Math.atan2(ai.waypoint.y - head.y, ai.waypoint.x - head.x);

            // Add slight jitter for natural movement (dumber = more jitter)
            if (ai.aiTimer % 40 === 0) {
                ai.targetAngle += (Math.random() - 0.5) * (diff.wanderJitter * 0.3);
            }

            // Pick new waypoint when close to current one or after a long time
            if (wpDist < 100 || ai.aiTimer % 300 === 0) {
                ai.waypoint = randomWaypoint();
            }

            // Look for food – smart AI sees farther, even smarter AI looks for power-ups first
            if (ai.aiTimer % Math.max(20, diff.reactionInterval) === 0) {
                // Priority 1: Power-ups
                let target = findNearestFood(head, diff.foodVision * 1.5, true);
                
                // Priority 2: Normal food
                if (!target) {
                    target = findNearestFood(head, diff.foodVision);
                }

                if (target) {
                    ai.aiTarget = target;
                    ai.aiState = 'seek_food';
                }
            }

            // Detect danger – smart AI has better awareness
            if (ai.aiTimer % Math.max(15, Math.floor(diff.reactionInterval * 0.7)) === 0) {
                const danger = detectDanger(ai, diff.dangerVision);
                if (danger) {
                    ai.targetAngle = danger.fleeAngle;
                    ai.aiState = 'flee';
                    ai.aiTimer = 0;
                }
            }

            // Chance to hunt smaller snakes – only medium+ AI hunts
            if (diff.huntChance > 0 && ai.aiTimer % 100 === 0 && ai.segments.length > 25) {
                if (Math.random() < diff.huntChance) {
                    const huntRange = diff.foodVision * 1.5;
                    const prey = findPrey(ai, huntRange);
                    if (prey) {
                        ai.aiTarget = prey;
                        ai.aiState = 'hunt';
                    }
                }
            }
            break;

        case 'seek_food':
            ai.boosting = false;
            if (ai.aiTarget) {
                ai.targetAngle = Math.atan2(ai.aiTarget.y - head.y, ai.aiTarget.x - head.x);
                const foodDist = distance(head, ai.aiTarget);

                // Boost turn rate when close to food so AI can actually eat it
                if (foodDist < 80) {
                    ai.turnRate = 0.15; // sharp homing
                } else if (foodDist < 150) {
                    ai.turnRate = 0.10; // moderate homing
                } else {
                    ai.turnRate = Math.max(diff.turnAccuracy, 0.06);
                }

                if (foodDist < 20 || !foods.includes(ai.aiTarget)) {
                    // Food eaten or gone, look for more nearby or go wander
                    const nextFood = findNearestFood(head, diff.foodVision);
                    if (nextFood) {
                        ai.aiTarget = nextFood;
                    } else {
                        ai.aiState = 'wander';
                        ai.aiTarget = null;
                        ai.waypoint = randomWaypoint();
                    }
                }
            } else {
                ai.aiState = 'wander';
                ai.waypoint = randomWaypoint();
            }

            // Smart AI checks for danger while eating
            if (diff.fleeSmarts && ai.aiTimer % 30 === 0) {
                const danger = detectDanger(ai, diff.dangerVision * 0.8);
                if (danger) {
                    ai.targetAngle = danger.fleeAngle;
                    ai.aiState = 'flee';
                    ai.aiTimer = 0;
                }
            }
            break;

        case 'hunt':
            if (ai.aiTarget && ai.aiTarget.alive) {
                const preyHead = ai.aiTarget.segments[0];

                // Smart AI predicts prey movement (intercept), dumb AI chases directly
                if (diff.canIntercept && ai.segments.length > 40) {
                    const preyAngle = ai.aiTarget.angle;
                    const interceptDist = distance(head, preyHead) * 0.4;
                    const interceptX = preyHead.x + Math.cos(preyAngle) * interceptDist;
                    const interceptY = preyHead.y + Math.sin(preyAngle) * interceptDist;
                    ai.targetAngle = Math.atan2(interceptY - head.y, interceptX - head.x);
                } else {
                    ai.targetAngle = Math.atan2(preyHead.y - head.y, preyHead.x - head.x);
                }

                // Boost when close enough and prey is moving away (smart hunting)
                const preySpeed = Math.sqrt(Math.pow(preyHead.x - ai.aiTarget.segments[1].x, 2) + Math.pow(preyHead.y - ai.aiTarget.segments[1].y, 2));
                const distToPrey = distance(head, preyHead);
                ai.boosting = distToPrey < 300 && ai.segments.length > 20 && diff.canIntercept;

                // Give up if too far or too small
                const giveUpDist = diff.canIntercept ? 600 : 400;
                if (distToPrey > giveUpDist || ai.segments.length < 15) {
                    ai.aiState = 'wander';
                    ai.aiTarget = null;
                    ai.boosting = false;
                    ai.waypoint = randomWaypoint();
                }
            } else {
                ai.aiState = 'wander';
                ai.aiTarget = null;
                ai.boosting = false;
                ai.waypoint = randomWaypoint();
            }
            break;

        case 'flee':
            // Smart AI boosts to escape aggressively
            ai.boosting = diff.boostInFlee && ai.segments.length > 15 && ai.aiTimer < 30; // Only boost for a short burst to save mass

            // Smart AI keeps checking if danger is gone
            const fleeTime = diff.fleeSmarts ? 40 : 80;
            if (ai.aiTimer > fleeTime) {
                if (diff.fleeSmarts) {
                    const stillDanger = detectDanger(ai, diff.dangerVision * 0.5);
                    if (!stillDanger) {
                        ai.aiState = 'wander';
                        ai.boosting = false;
                        ai.waypoint = randomWaypoint();
                    }
                } else {
                    ai.aiState = 'wander';
                    ai.boosting = false;
                    ai.waypoint = randomWaypoint();
                }
            }
            break;

        case 'flee_border':
            if (head.x > borderDist && head.x < WORLD_SIZE - borderDist &&
                head.y > borderDist && head.y < WORLD_SIZE - borderDist) {
                ai.aiState = 'wander';
                ai.waypoint = randomWaypoint();
            }
            break;
    }
}

function findNearestFood(head, range, onlyPowerUps = false) {
    let nearest = null;
    let minDist = range;
    for (const food of foods) {
        if (onlyPowerUps && !food.isPowerUp) continue;
        const d = distance(head, food);
        if (d < minDist) {
            minDist = d;
            nearest = food;
        }
    }
    return nearest;
}

function detectDanger(snake, range) {
    const head = snake.segments[0];
    const allSnakes = [player, ...aiSnakes];
    for (const other of allSnakes) {
        if (other === snake || !other.alive) continue;
        for (let i = 0; i < Math.min(other.segments.length, 30); i++) {
            const seg = other.segments[i];
            const d = distance(head, seg);
            if (d < range) {
                const fleeAngle = Math.atan2(head.y - seg.y, head.x - seg.x);
                return { fleeAngle, distance: d };
            }
        }
    }
    return null;
}

function findPrey(hunter, range) {
    const head = hunter.segments[0];
    const allSnakes = [player, ...aiSnakes];
    let weakest = null;
    let minLen = hunter.segments.length;
    for (const other of allSnakes) {
        if (other === hunter || !other.alive) continue;
        if (other.segments.length < minLen * 0.6) {
            const d = distance(head, other.segments[0]);
            if (d < range) {
                weakest = other;
                minLen = other.segments.length;
            }
        }
    }
    return weakest;
}
