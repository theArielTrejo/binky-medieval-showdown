/**
 * Enemy Type Definitions
 * 
 * This module contains the core enemy type enumeration used throughout the game.
 * Separated to avoid circular imports between EnemySystem and other modules.
 */

export enum EnemyType {
    SKELETON_VIKING = 'SKELETON_VIKING',
    GOLEM = 'GOLEM',
    ARCHER = 'ARCHER',
    GNOLL = 'GNOLL'
}