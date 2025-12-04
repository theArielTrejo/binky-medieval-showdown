/**
 * Enemy Type Definitions
 * 
 * This module contains the core enemy type enumeration used throughout the game.
 * Separated to avoid circular imports between EnemySystem and other modules.
 */

import { EnemyProjectile } from '../enemies/attacks/EnemyProjectile';
import { MeleeAttack } from '../enemies/attacks/MeleeAttack';
import { ConeAttack } from '../enemies/attacks/ConeAttack';
import { ExplosionAttack } from '../enemies/attacks/ExplosionAttack';
import { VortexAttack } from '../enemies/attacks/VortexAttack';
import { Shield } from '../enemies/attacks/Shield';
import { LightningStrikeAttack } from '../enemies/attacks/LightningStrikeAttack';
import { ClawAttack } from '../enemies/attacks/ClawAttack';
import { ArrowProjectile } from '../enemies/attacks/ArrowProjectile';

export enum EnemyType {
    SKELETON_VIKING = 'skeleton_viking',
    OGRE = 'ogre',
    ARCHER = 'archer',
    GNOLL = 'gnoll',
    SKELETON_PIRATE = 'skeleton_pirate',
    ELEMENTAL_SPIRIT = 'elemental_spirit',
    LIGHTNING_MAGE = 'lightning_mage'
}

/**
 * Interface for enemy attack results
 */
export interface EnemyAttackResult {
    type: 'projectile' | 'melee' | 'cone' | 'explosion' | 'vortex' | 'shield' | 'lightning' | 'claw' | 'arrow';
    damage: number;
    position: { x: number; y: number };
    hitPlayer: boolean;
    specialEffects?: {
        slowEffect?: number;
        slowDuration?: number;
        knockback?: { x: number; y: number };
        blocked?: boolean;
    };
    attackObject?: EnemyProjectile | MeleeAttack | ConeAttack | ExplosionAttack | VortexAttack | Shield | LightningStrikeAttack | ClawAttack | ArrowProjectile;
}

export interface EnemyStats {
    health: number;
    speed: number;
    damage: number;
    size: number;
    xpValue: number;
    cost: number;           // Dynamic cost for AI resource management
    threatLevel: number;    // Overall combat effectiveness rating
    specialAbilities: string[]; // List of special abilities
}
