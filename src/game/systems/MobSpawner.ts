/**
 * Mob Spawning System
 * Demonstrates the dynamic mob loading system by spawning different mob types
 */

import { Scene } from 'phaser';
import { MOB_CONFIGS } from '../config/GameConfig';
import { MobConfig } from '../types/MobTypes';

export class MobSpawner {
  private scene: Scene;
  private spawnedMobs: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Spawn a mob of the specified type at the given position
   */
  public spawnMob(mobType: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    const config = MOB_CONFIGS[mobType];
    if (!config) {
      console.error(`Mob config not found for type: ${mobType}`);
      return null;
    }

    try {
      // Create sprite using the loaded atlas
      const mob = this.scene.physics.add.sprite(x, y, config.atlasKey);
      
      if (!mob) {
        console.error(`Failed to create sprite for mob: ${mobType}`);
        return null;
      }

      // Apply mob configuration
      mob.setScale(config.scale);
      mob.setData('mobType', mobType);
      mob.setData('health', config.health);
      mob.setData('maxHealth', config.health);
      mob.setData('speed', config.speed);
      mob.setData('damage', config.damage);
      
      // Set up physics body
      if (mob.body) {
        const body = mob.body as Phaser.Physics.Arcade.Body;
        body.setCircle(config.collisionRadius);
        body.setCollideWorldBounds(true);
      }

      // Start default animation
      if (this.scene.anims.exists(config.defaultAnimation)) {
        mob.play(config.defaultAnimation);
      } else {
        console.warn(`Animation ${config.defaultAnimation} not found for mob ${mobType}`);
      }

      // Add to spawned mobs list
      this.spawnedMobs.push(mob);

      console.log(`Spawned ${mobType} at (${x}, ${y})`);
      return mob;

    } catch (error) {
      console.error(`Error spawning mob ${mobType}:`, error);
      return null;
    }
  }

  /**
   * Spawn mobs at predefined spawn points
   */
  public spawnMobsAtSpawnPoints(spawnPoints: { x: number; y: number; type: string }[]): void {
    for (const spawnPoint of spawnPoints) {
      this.spawnMob(spawnPoint.type, spawnPoint.x, spawnPoint.y);
    }
  }

  /**
   * Get all spawned mobs
   */
  public getSpawnedMobs(): Phaser.GameObjects.Sprite[] {
    return [...this.spawnedMobs];
  }

  /**
   * Remove a mob from the spawned list
   */
  public removeMob(mob: Phaser.GameObjects.Sprite): void {
    const index = this.spawnedMobs.indexOf(mob);
    if (index > -1) {
      this.spawnedMobs.splice(index, 1);
    }
  }

  /**
   * Get mob configuration by type
   */
  public getMobConfig(mobType: string): MobConfig | undefined {
    return MOB_CONFIGS[mobType];
  }

  /**
   * Check if a mob type is available
   */
  public isMobTypeAvailable(mobType: string): boolean {
    return mobType in MOB_CONFIGS;
  }

  /**
   * Get all available mob types
   */
  public getAvailableMobTypes(): string[] {
    return Object.keys(MOB_CONFIGS);
  }

  /**
   * Clean up all spawned mobs
   */
  public destroy(): void {
    for (const mob of this.spawnedMobs) {
      if (mob && mob.active) {
        mob.destroy();
      }
    }
    this.spawnedMobs = [];
  }
}