/**
 * XP System Constants
 * Centralized configuration for all XP-related magic numbers and settings
 */

export const XP_CONSTANTS = {
  // Orb Lifecycle
  ORB_LIFETIME: 10000, // 10 seconds in milliseconds
  FADE_THRESHOLD: 0.7, // Start fading at 70% of lifetime
  BLINK_SPEED: 8, // Blinks per second in final moments
  BLINK_DURATION: 2000, // Last 2 seconds for blinking effect

  // Collection & Interaction
  COLLECTION_RANGE: 80, // Collection range in pixels (approximately 2-3 blocks)
  MIN_COLLECTION_RANGE: 20, // Minimum collection range
  MAX_COLLECTION_RANGE: 200, // Maximum collection range

  // Performance & Limits
  MAX_ORBS: 100, // Maximum number of orbs to prevent performance issues
  
  // Visual Properties
  ORB_RADIUS: 8, // Main orb radius
  ORB_STROKE_WIDTH: 2, // Border stroke width
  GLOW_RADIUS: 12, // Glow effect radius
  GLOW_ALPHA: 0.3, // Glow effect transparency
  
  // Animation Timings
  SPAWN_ANIMATION_DURATION: 200, // Orb spawn animation duration
  COLLECTION_ANIMATION_DURATION: 300, // Collection animation duration
  FLASH_ANIMATION_DURATION: 200, // Flash effect duration
  FLOATING_TEXT_DURATION: 1000, // Floating XP text duration
  PARTICLE_ANIMATION_DURATION: 400, // Base particle animation duration
  PARTICLE_ANIMATION_VARIANCE: 200, // Random variance for particle timing
  SOUND_RING_DURATION: 300, // Sound effect ring duration
  
  // Spawning Configuration
  SPAWN_DISTANCE_MIN: 20, // Minimum distance from death location
  SPAWN_DISTANCE_MAX: 50, // Maximum distance from death location
  SPAWN_ANGLE_VARIANCE: 0.5, // Random angle variance for spawning
  
  // Game Bounds
  GAME_BOUNDS: {
    MIN_X: 20,
    MAX_X: 1004,
    MIN_Y: 20,
    MAX_Y: 748
  },
  
  // Visual Effects
  PULSE_FREQUENCY: 3, // Pulse animation frequency multiplier
  PULSE_AMPLITUDE: 0.1, // Pulse scale amplitude
  PULSE_GLOW_MULTIPLIER: 1.2, // Glow effect scale multiplier
  
  // Particle Effects
  PARTICLE_COUNT: 8, // Number of particles in burst effect
  PARTICLE_RADIUS: 3, // Particle size
  PARTICLE_ALPHA: 0.8, // Particle transparency
  PARTICLE_SPREAD_MIN: 30, // Minimum particle spread distance
  PARTICLE_SPREAD_MAX: 50, // Maximum particle spread distance
  PARTICLE_SCALE_END: 0.2, // Final scale for particles
  
  // Flash Effects
  FLASH_RADIUS: 15, // Collection flash radius
  FLASH_ALPHA: 0.8, // Collection flash transparency
  FLASH_SCALE_MULTIPLIER: 2, // Flash scale multiplier
  
  // Sound Ring Effects
  SOUND_RING_RADIUS: 5, // Initial sound ring radius
  SOUND_RING_STROKE_WIDTH: 2, // Sound ring stroke width
  SOUND_RING_ALPHA: 0.6, // Sound ring transparency
  SOUND_RING_SCALE_MULTIPLIER: 3, // Sound ring scale multiplier
  
  // Orb Configuration by Enemy Type
  ORB_CONFIG: {
    SWARM: { baseCount: 1, maxCount: 2 },
    SPEEDSTER: { baseCount: 1, maxCount: 2 },
    PROJECTILE: { baseCount: 1, maxCount: 2 },
    TANK: { baseCount: 2, maxCount: 4 },
    ELITE_TANK: { baseCount: 2, maxCount: 4 },
    SNIPER: { baseCount: 3, maxCount: 5 },
    BERSERKER: { baseCount: 3, maxCount: 5 },
    BOSS: { baseCount: 5, maxCount: 8 }
  },
  
  // XP Thresholds for Bonus Orbs
  XP_THRESHOLDS: {
    MEDIUM: 50, // Threshold for +1 orb
    HIGH: 100   // Threshold for +2 orbs
  },
  
  // Depth Layers
  DEPTH: {
    GLOW_EFFECT: 9,
    ORB: 10,
    FLASH: 15,
    PARTICLES: 20
  },
  
  // Colors (hex values)
  COLORS: {
    FLASH: 0xFFFFFF,
    PARTICLE: 0xFFD700,
    SOUND_RING_FILL: 0xFFFFFF,
    SOUND_RING_STROKE: 0xFFD700
  }
} as const;

/**
 * Utility function to get orb configuration for enemy type
 */
export function getOrbConfigForEnemyType(enemyType: string): { baseCount: number; maxCount: number } {
  return XP_CONSTANTS.ORB_CONFIG[enemyType as keyof typeof XP_CONSTANTS.ORB_CONFIG] || 
         XP_CONSTANTS.ORB_CONFIG.SWARM;
}

/**
 * Utility function to validate collection range
 */
export function clampCollectionRange(range: number): number {
  return Math.max(
    XP_CONSTANTS.MIN_COLLECTION_RANGE, 
    Math.min(XP_CONSTANTS.MAX_COLLECTION_RANGE, range)
  );
}

/**
 * Utility function to clamp position within game bounds
 * Now uses dynamic world bounds from the scene's physics world
 */
export function clampToGameBounds(x: number, y: number, scene?: Phaser.Scene): { x: number; y: number } {
  // If scene is provided, use the actual world bounds
  if (scene && scene.physics && scene.physics.world) {
    const worldBounds = scene.physics.world.bounds;
    return {
      x: Math.max(worldBounds.x + 20, Math.min(worldBounds.width - 20, x)),
      y: Math.max(worldBounds.y + 20, Math.min(worldBounds.height - 20, y))
    };
  }
  
  // Fallback to hardcoded bounds if scene is not available
  return {
    x: Math.max(XP_CONSTANTS.GAME_BOUNDS.MIN_X, Math.min(XP_CONSTANTS.GAME_BOUNDS.MAX_X, x)),
    y: Math.max(XP_CONSTANTS.GAME_BOUNDS.MIN_Y, Math.min(XP_CONSTANTS.GAME_BOUNDS.MAX_Y, y))
  };
}