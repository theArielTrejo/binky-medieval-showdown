/**
 * Mob Spawning System (Modernized)
 * Uses standardized EnemyType system with hardcoded mob skins and optimized textures.
 * Integrated with the main EnemySystem for consistency.
 */

import { Scene } from 'phaser';
import { EnemyType } from '../types/EnemyTypes';
import { AnimationMapper } from '../config/AnimationMappings';
import { getHardcodedMobSkin, validateNoRandomSelection, getTextureKeyForMobVariant } from '../../systems/HardcodedMobSkins';

export class MobSpawner {
  private scene: Scene;
  // Use a Physics Group instead of a plain array for performance and convenience
  private mobGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Scene) {
    this.scene = scene;
    this.mobGroup = this.scene.physics.add.group();
  }

  /**
   * Spawn a mob of the specified type at the given position using standardized system
   */
  public spawnMob(enemyType: EnemyType, x: number, y: number, debug = false): Phaser.GameObjects.Sprite | null {
    try {
      // Use hardcoded mob variant selection - NO RANDOMIZATION
      const mobVariant = AnimationMapper.getHardcodedMobForEnemyType(enemyType);
      
      // VALIDATION: Ensure no random selection occurred
      const expectedSkin = getHardcodedMobSkin(enemyType);
      validateNoRandomSelection(mobVariant, expectedSkin, enemyType);
      
      // Get the correct texture key for this mob variant
      const textureKey = getTextureKeyForMobVariant(mobVariant);
      
      // Create mob animations for this variant
      const mobAnimations = this.createMobAnimations(mobVariant);
      
      // Create physics sprite using the correct texture atlas
      const mob = this.scene.physics.add.sprite(x, y, textureKey);
      this.mobGroup.add(mob);
      
      if (!mob || !mob.body) {
        console.error(`Failed to create sprite or physics body for mob: ${enemyType}`);
        return null;
      }

      // Store mob data using standardized approach
      mob.setData('enemyType', enemyType);
      mob.setData('mobVariant', mobVariant);
      mob.setData('mobAnimations', mobAnimations);
      
      // Apply standardized mob properties
      const stats = this.getStatsForType(enemyType);
      mob.setData('health', stats.health);
      mob.setData('maxHealth', stats.health);
      mob.setData('speed', stats.speed);
      mob.setData('damage', stats.damage);
      
      // Set scale based on enemy type
      mob.setScale(this.getScaleForType(enemyType));
      
      // --- Apply Physics Properties ---
      const body = mob.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setSize(stats.size, stats.size);
      
      // Add debug visualization if enabled
      if (debug) {
        mob.setDebug(true, true, 0x00ff00); // showBody, showVelocity, color
      }

      // Start with idle animation using standardized naming
      const idleAnimationKey = this.getIdleAnimationKey(mobAnimations);
      if (this.scene.anims.exists(idleAnimationKey)) {
        mob.play(idleAnimationKey);
      } else {
        console.warn(`Animation ${idleAnimationKey} not found for mob ${enemyType}`);
      }
      
      console.log(`✅ Spawned ${enemyType} (${mobVariant}) at (${x}, ${y})`);
      return mob;

    } catch (error) {
      console.error(`❌ Error spawning mob ${enemyType}:`, error);
      return null;
    }
  }

  /**
   * Spawn mobs at predefined spawn points
   */
  public spawnMobsAtSpawnPoints(spawnPoints: { x: number; y: number; type: EnemyType }[], debug = false): void {
    for (const spawnPoint of spawnPoints) {
      this.spawnMob(spawnPoint.type, spawnPoint.x, spawnPoint.y, debug);
    }
  }

  /**
   * Create mob animations for a specific mob variant (from EnemySystem)
   */
  private createMobAnimations(mobVariant: string): { texture: string; idle: string; walk: string } {
    // Get the correct texture key for this mob variant
    const textureKey = getTextureKeyForMobVariant(mobVariant);
    
    // Return animation configuration
    return {
      texture: textureKey,
      idle: `${mobVariant}_idle`,
      walk: `${mobVariant}_walk`
    };
  }

  /**
   * Get stats for enemy type (from EnemySystem)
   */
  private getStatsForType(type: EnemyType): { health: number; speed: number; damage: number; size: number; xpValue: number } {
    switch (type) {
      case EnemyType.SKELETON_VIKING:
        return {
          health: 120,
          speed: 45,
          damage: 30,
          size: 35,
          xpValue: 18
        };
      case EnemyType.OGRE:
        return {
          health: 250,
          speed: 20,
          damage: 40,
          size: 50,
          xpValue: 35
        };
      case EnemyType.ARCHER:
        return {
          health: 80,
          speed: 50,
          damage: 35,
          size: 30,
          xpValue: 22
        };
      case EnemyType.GNOLL:
        return {
          health: 100,
          speed: 55,
          damage: 25,
          size: 32,
          xpValue: 20
        };
      default:
        return {
          health: 100,
          speed: 40,
          damage: 25,
          size: 30,
          xpValue: 15
        };
    }
  }

  /**
   * Get scale for enemy type (from EnemySystem)
   */
  private getScaleForType(type: EnemyType): number {
    switch (type) {
      case EnemyType.SKELETON_VIKING:
        return 0.8;
      case EnemyType.OGRE:
        return 1.2;
      case EnemyType.ARCHER:
        return 0.7;
      case EnemyType.GNOLL:
        return 0.75;
      default:
        return 0.8;
    }
  }

  /**
   * Get idle animation key for mob animations
   */
  private getIdleAnimationKey(mobAnimations: { idle: string }): string {
    return mobAnimations.idle;
  }

  /**
   * Get the group containing all spawned mobs.
   * This is useful for setting up colliders (e.g., this.physics.add.collider(player, spawner.getMobGroup()))
   */
  public getMobGroup(): Phaser.Physics.Arcade.Group {
    return this.mobGroup;
  }

  /**
   * Remove a mob. The group handles removal and optional destruction.
   */
  public removeMob(mob: Phaser.GameObjects.Sprite, destroy = true): void {
    this.mobGroup.remove(mob, true, destroy);
  }

  /**
   * Check if enemy type is available
   */
  public isEnemyTypeAvailable(enemyType: EnemyType): boolean {
    return Object.values(EnemyType).includes(enemyType);
  }

  /**
   * Get all available enemy types
   */
  public getAvailableEnemyTypes(): EnemyType[] {
    return Object.values(EnemyType);
  }

  /**
   * Clean up all spawned mobs by clearing the group
   */
  public destroy(): void {
    // Setting destroy children to true will call destroy() on each mob
    this.mobGroup.clear(true, true);
  }
}