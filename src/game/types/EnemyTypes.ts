/**
 * Enemy Type Definitions
 * 
 * This module contains the core enemy type enumeration used throughout the game.
 * Separated to avoid circular imports between EnemySystem and other modules.
 */

export enum EnemyType {
    SKELETON_VIKING = 'skeleton_viking',
    GOLEM = 'golem',
    ARCHER = 'archer',
    GNOLL = 'gnoll',
    SKELETON_PIRATE = 'skeleton_pirate',
    ELEMENTAL_SPIRIT = 'elemental_spirit'
}