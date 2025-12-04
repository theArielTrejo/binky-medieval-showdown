/**
 * Hardcoded Animation Mappings for Characters and Mobs
 * This file contains all animation mappings to ensure consistent and reliable animation playback
 * 
 * UPDATED: Now uses hardcoded mob skin assignments to eliminate all dynamic references
 * and ensure full compliance with mob spawner UI specifications.
 */

import { getHardcodedMobSkin } from '../systems/HardcodedMobSkins';

// Character Animation Mappings
export interface CharacterAnimationSet {
  idle: string;
  walk: string;
  attack: string;
  texture: string;
}

export interface MobAnimationSet {
  idle: string;
  walk: string;
  texture: string;
}

// Hardcoded Character Variants and their animations
export const CHARACTER_ANIMATIONS: { [key: string]: CharacterAnimationSet } = {
  // Knight variants
  'Knight_1': {
    idle: 'Knight_1_Idle',
    walk: 'Knight_1_Walking',
    attack: 'Knight_1_AttackRun',
    texture: 'knight_idle'
  },
  'Knight_2': {
    idle: 'Knight_2_idle',
    walk: 'Knight_2_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-1'
  },
  'Knight_3': {
    idle: 'Knight_3_idle',
    walk: 'Knight_3_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-2'
  },
  'White Armored Knight': {
    idle: 'Knight_1_Idle',
    walk: 'Knight_1_Walking',
    attack: 'Knight_1_AttackRun', // Temp Place Holder
    texture: 'knight_idle'
  },

  // Magician variants
  'Magician_1': {
    idle: 'Magician_1_Idle_Blinking',
    walk: 'Magician_1_Walking',
    attack: 'Magician_1_Attack',
    texture: 'magician_idle_blinking'
  },
  'Magician_2': {
    idle: 'Magician_2_idle',
    walk: 'Magician_2_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-4'
  },
  'Magician_3': {
    idle: 'Magician_3_idle',
    walk: 'Magician_3_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-5'
  },

  // Archer variants
  'Archer_1': {
    idle: 'Ninja_1_Idle_Blinking',
    walk: 'Ninja_1_Walking',
    attack: 'Ninja_1_AttackRun', // Temp Place Holder
    texture: 'ninja_idle_blinking-texture-6'
  },
  'Archer_2': {
    idle: 'Archer_2_idle',
    walk: 'Archer_2_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-0'
  },
  'Archer_3': {
    idle: 'Archer_3_idle',
    walk: 'Archer_3_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-8'
  },

  // Ninja/Assassin variants (for Rogue class)
  'Black_Ninja': {
    idle: 'Ninja_1_Idle_Blinking',
    walk: 'Ninja_1_Walking',
    attack: 'Ninja_1_AttackRun', // Temp Place Holder
    texture: 'ninja_idle_blinking'
  },
  'White_Ninja': {
    idle: 'White_Ninja_idle',
    walk: 'White_Ninja_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-10'
  },
  'Assassin_Guy': {
    idle: 'Assassin_Guy_idle',
    walk: 'Assassin_Guy_walk',
    attack: 'Magician_1_Attack', // Temp Place Holder
    texture: 'char-texture-11'
  }
};

// Hardcoded Mob Variants and their animations
export const MOB_ANIMATIONS: { [key: string]: MobAnimationSet } = {
  // Skeleton Pirates - Skeleton_Pirate_Captain_1 uses mob-texture-196, others fallback to mob-texture-264
  'Skeleton_Pirate_Captain_1': {
    idle: 'Skeleton_Pirate_Captain_1_idle',
    walk: 'Skeleton_Pirate_Captain_1_walk',
    texture: 'mob-texture-196'
  },
  'Skeleton_Pirate_Captain_2': {
    idle: 'Skeleton_Pirate_Captain_2_idle',
    walk: 'Skeleton_Pirate_Captain_2_walk',
    texture: 'mob-texture-264'
  },
  'Skeleton_Pirate_Captain_3': {
    idle: 'Skeleton_Pirate_Captain_3_idle',
    walk: 'Skeleton_Pirate_Captain_3_walk',
    texture: 'mob-texture-316'
  },

  // Skeleton Warriors - all use mob-texture-264
  'Skeleton_Warrior_1': {
    idle: 'Skeleton_Warrior_1_idle',
    walk: 'Skeleton_Warrior_1_walk',
    texture: 'mob-texture-264'
  },
  'Skeleton_Warrior_2': {
    idle: 'Skeleton_Warrior_2_idle',
    walk: 'Skeleton_Warrior_2_walk',
    texture: 'mob-texture-264'
  },
  'Skeleton_Warrior_3': {
    idle: 'Skeleton_Warrior_3_idle',
    walk: 'Skeleton_Warrior_3_walk',
    texture: 'mob-texture-264'
  },

  // Goblins - all use mob-texture-264
  'Goblin_1': {
    idle: 'Goblin_1_idle',
    walk: 'Goblin_1_walk',
    texture: 'mob-texture-264'
  },
  'Goblin_2': {
    idle: 'Goblin_2_idle',
    walk: 'Goblin_2_walk',
    texture: 'mob-texture-264'
  },
  'Goblin_3': {
    idle: 'Goblin_3_idle',
    walk: 'Goblin_3_walk',
    texture: 'mob-texture-264'
  },

  // Orcs - all use mob-texture-264
  'Orc_1': {
    idle: 'Orc_1_idle',
    walk: 'Orc_1_walk',
    texture: 'mob-texture-264'
  },
  'Orc_2': {
    idle: 'Orc_2_idle',
    walk: 'Orc_2_walk',
    texture: 'mob-texture-264'
  },
  'Orc_3': {
    idle: 'Orc_3_idle',
    walk: 'Orc_3_walk',
    texture: 'mob-texture-264'
  },

  // Ogres - uses custom walking animation
  'Ogre_1': {
    idle: 'ogre_walking',
    walk: 'ogre_walking',
    texture: 'ogre-walk-0'
  },
  'Ogre_2': {
    idle: 'ogre_walking',
    walk: 'ogre_walking',
    texture: 'ogre-walk-0'
  },
  'Ogre_3': {
    idle: 'ogre_walking',
    walk: 'ogre_walking',
    texture: 'ogre-walk-0'
  },

  // Skeleton Viking variants
  'Skeleton_Viking_1': {
    idle: 'Skeleton_Viking_1_idle',
    walk: 'Skeleton_Viking_1_walk',
    texture: 'mob-texture-281'
  },
  'Skeleton_Viking_2': {
    idle: 'Skeleton_Viking_2_idle',
    walk: 'Skeleton_Viking_2_walk',
    texture: 'mob-texture-254'
  },
  'Skeleton_Viking_3': {
    idle: 'Skeleton_Viking_3_idle',
    walk: 'Skeleton_Viking_3_walk',
    texture: 'mob-texture-254'
  },

  // Archer variants
  'Archer_1': {
    idle: 'Archer_1_idle',
    walk: 'Archer_1_walk',
    texture: 'mob-texture-254'
  },
  'Archer_2': {
    idle: 'Archer_2_idle',
    walk: 'Archer_2_walk',
    texture: 'mob-texture-254'
  },
  'Archer_3': {
    idle: 'Archer_3_idle',
    walk: 'Archer_3_walk',
    texture: 'mob-texture-254'
  },

  // Gnoll variants
  'Gnoll_1': {
    idle: 'Gnoll_1_idle',
    walk: 'Gnoll_1_walk',
    texture: 'mob-texture-316'
  },
  'Gnoll_2': {
    idle: 'Gnoll_2_idle',
    walk: 'Gnoll_2_walk',
    texture: 'mob-texture-316'
  },
  'Gnoll_3': {
    idle: 'Mobs/Gnoll/Gnoll_3/PNG/PNG Sequences/Throwing in The Air/0_Gnoll_Throwing in The Air_011.png',
    walk: 'Mobs/Gnoll/Gnoll_3/PNG/PNG Sequences/Running/0_Gnoll_Running_010.png',
    texture: 'mob-texture-316'
  },

  // Elemental Spirits
  'Elemental_Spirits_1': {
    idle: 'Elemental_Spirits_1_idle',
    walk: 'Elemental_Spirits_1_walk',
    texture: 'mob-texture-280'
  },
  'Elemental_Spirits_2': {
    idle: 'Elemental_Spirits_2_idle',
    walk: 'Elemental_Spirits_2_walk',
    texture: 'mob-texture-205'
  },
  'Elemental_Spirits_3': {
    idle: 'Elemental_Spirits_3_idle',
    walk: 'Elemental_Spirits_3_walk',
    texture: 'mob-texture-240'
  },

  // Skeleton Death Knights (Lightning Mage)
  'Skeleton_Death_Knight_1': {
    idle: 'Skeleton_Death_Knight_1_idle',
    walk: 'Skeleton_Death_Knight_1_walk',
    texture: 'mob-texture-131'
  },
  'Skeleton_Death_Knight_2': {
    idle: 'Skeleton_Death_Knight_2_idle',
    walk: 'Skeleton_Death_Knight_2_walk',
    texture: 'mob-texture-131'
  },
  'Skeleton_Death_Knight_3': {
    idle: 'Skeleton_Death_Knight_3_idle',
    walk: 'Skeleton_Death_Knight_3_walk',
    texture: 'mob-texture-131'
  }
};

// Archetype to Character mapping for player selection using standardized class names
export const ARCHETYPE_TO_CHARACTER: { [key: string]: string[] } = {
  'knight': ['Knight_1', 'Knight_2', 'Knight_3', 'White_Armored_Knight'],
  'magician': ['Magician_1', 'Magician_2', 'Magician_3'],
  'archer': ['Archer_1', 'Archer_2', 'Archer_3'],
  'rogue': ['Black_Ninja', 'White_Ninja', 'Assassin_Guy']
};

// Mapping from PlayerArchetypeType to standardized class names
export const PLAYER_ARCHETYPE_TO_CLASS: { [key: string]: string } = {
  'tank': 'knight',
  'glass_cannon': 'magician',
  'evasive': 'rogue'
};

// Standardized mob class names (matching actual sprite sheet structure)
// Each mob type gets unique skins - no duplicates across different enemy types
export const STANDARDIZED_MOB_CLASSES = {
  'ogre': ['Ogre_1', 'Ogre_2', 'Ogre_3'],
  'archer': ['Archer_1', 'Archer_2', 'Archer_3'],
  'gnoll': ['Gnoll_1', 'Gnoll_2', 'Gnoll_3'],
  'deathknight': ['Skeleton_Death_Knight_1', 'Skeleton_Death_Knight_2', 'Skeleton_Death_Knight_3'],
  'skeletonviking': ['Skeleton_Viking_1', 'Skeleton_Viking_2', 'Skeleton_Viking_3'],
  'skeletonpirate': ['Skeleton_Pirate_Captain_1', 'Skeleton_Pirate_Captain_2', 'Skeleton_Pirate_Captain_3'],
  'elemental': ['Elemental_Spirits_1', 'Elemental_Spirits_2', 'Elemental_Spirits_3'],
  'alchemist': ['Cursed_Alchemist_1', 'Cursed_Alchemist_2', 'Cursed_Alchemist_3']
};

// Mapping from EnemyType to standardized mob class names - each type gets unique skins
export const ENEMY_TYPE_TO_MOB_CLASS: { [key: string]: string } = {
  'tank': 'ogre',
  'projectile': 'archer',
  'speedster': 'gnoll',
  'boss': 'deathknight',
  'elite_tank': 'skeletonviking',
  'sniper': 'alchemist',
  'swarm': 'elemental',
  'berserker': 'skeletonpirate'
};

// Fallback animations if specific variants are not available
export const FALLBACK_ANIMATIONS = {
  character: {
    idle: 'player_idle',
    walk: 'player_walk',
    texture: 'char-texture-0'
  },
  mob: {
    idle: 'mob_idle',
    walk: 'mob_walk',
    texture: 'mob-texture-196'
  }
};

// Utility functions for animation mapping
export class AnimationMapper {
  /**
   * Get character animation set by variant name
   */
  static getCharacterAnimations(variant: string): CharacterAnimationSet {
    return CHARACTER_ANIMATIONS[variant] || FALLBACK_ANIMATIONS.character;
  }

  /**
   * Get mob animation set by variant name
   */
  static getMobAnimations(variant: string): MobAnimationSet {
    return MOB_ANIMATIONS[variant] || FALLBACK_ANIMATIONS.mob;
  }

  /**
   * Get random character variant for archetype (PLAYER CHARACTERS ONLY)
   * Note: Player character selection remains random for variety, only mob skins are hardcoded
   */
  static getRandomCharacterForArchetype(archetype: string): string {
    // Convert PlayerArchetypeType to standardized class name if needed
    const className = PLAYER_ARCHETYPE_TO_CLASS[archetype] || archetype;
    const variants = ARCHETYPE_TO_CHARACTER[className];
    if (!variants || variants.length === 0) {
      console.warn(`No variants found for archetype: ${archetype} (mapped to: ${className})`);
      return 'Knight_1'; // Default fallback
    }
    const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
    console.log(`Selected variant: ${selectedVariant} for archetype: ${archetype} (class: ${className})`);
    return selectedVariant;
  }

  /**
   * Get hardcoded character variant for a player archetype (deterministic skin per archetype)
   */
  static getHardcodedCharacterForArchetype(archetype: string): string {
    const className = PLAYER_ARCHETYPE_TO_CLASS[archetype] || archetype;
    const HARD_CODED_BY_CLASS: { [key: string]: string } = {
      knight: 'Knight_1',
      magician: 'Magician_1',
      rogue: 'Black_Ninja'
    };

    const variant = HARD_CODED_BY_CLASS[className] || (ARCHETYPE_TO_CHARACTER[className]?.[0]);
    if (!variant) {
      console.warn(`No hardcoded variant for class: ${className}, falling back to Knight_1`);
      return 'Knight_1';
    }
    console.log(`✅ HARDCODED: Using character ${variant} for archetype: ${archetype} (class: ${className})`);
    return variant;
  }

  /**
   * Get hardcoded mob variant for enemy type (REPLACES RANDOM SELECTION)
   * This method now uses predetermined hardcoded skin assignments to ensure
   * consistent visual representation and full compliance with mob spawner UI specifications.
   */
  static getHardcodedMobForEnemyType(enemyType: string): string {
    try {
      // Use hardcoded skin assignment - NO RANDOMIZATION
      const hardcodedSkin = getHardcodedMobSkin(enemyType as any);
      console.log(`✅ HARDCODED: Using predetermined skin ${hardcodedSkin} for enemy type: ${enemyType}`);
      return hardcodedSkin;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ HARDCODED SKIN ERROR: ${errorMessage}`);
      throw error; // Fail fast to prevent dynamic fallbacks
    }
  }

  /**
   * Get all available character variants
   */
  static getAllCharacterVariants(): string[] {
    return Object.keys(CHARACTER_ANIMATIONS);
  }

  /**
   * Get all available mob variants
   */
  static getAllMobVariants(): string[] {
    return Object.keys(MOB_ANIMATIONS);
  }
}
