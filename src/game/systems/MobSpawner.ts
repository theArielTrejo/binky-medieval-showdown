/**
 * Mob Spawning System (Refactored)
 * Uses a Physics Group for efficient management and applies physics properties from config.
 */

import { Scene } from 'phaser';
import { MOB_CONFIGS } from '../config/GameConfig';
import { MobConfig } from '../types/MobTypes';

export class MobSpawner {
  private scene: Scene;
  // Use a Physics Group instead of a plain array for performance and convenience
  private mobGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Scene) {
    this.scene = scene;
    this.mobGroup = this.scene.physics.add.group();
  }

  /**
   * Spawn a mob of the specified type at the given position
   */
  public spawnMob(mobType: string, x: number, y: number, debug = false): Phaser.GameObjects.Sprite | null {
    const config = this.getMobConfig(mobType);
    if (!config) {
      console.error(`Mob config not found for type: ${mobType}`);
      return null;
    }

    try {
      // Create sprite and add it to our group
      const mob = this.scene.physics.add.sprite(x, y, config.atlasKey);
      this.mobGroup.add(mob);
      
      if (!mob || !mob.body) {
        console.error(`Failed to create sprite or physics body for mob: ${mobType}`);
        return null;
      }

      // --- Apply Mob Configuration ---
      mob.setScale(config.scale);
      
      // Store custom data
      mob.setData('mobType', mobType);
      mob.setData('health', config.health);
      mob.setData('maxHealth', config.health);
      mob.setData('speed', config.speed);
      mob.setData('damage', config.damage);
      
      // --- Apply Physics Properties from Config ---
      const body = mob.body as Phaser.Physics.Arcade.Body;
      body.setCircle(config.collisionRadius);
      body.setCollideWorldBounds(true);
      
      // Set properties from docs for more dynamic behavior
      if (config.mass) {
        body.setMass(config.mass);
      }
      if (config.bounce) {
        body.setBounce(config.bounce.x, config.bounce.y);
      }
      
      // Add debug visualization if enabled
      if (debug) {
        mob.setDebug(true, true, 0x00ff00); // showBody, showVelocity, color
      }

      // Start default animation
      if (this.scene.anims.exists(config.defaultAnimation)) {
        mob.play(config.defaultAnimation);
      } else {
        console.warn(`Animation ${config.defaultAnimation} not found for mob ${mobType}`);
      }
      
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
  public spawnMobsAtSpawnPoints(spawnPoints: { x: number; y: number; type: string }[], debug = false): void {
    for (const spawnPoint of spawnPoints) {
      this.spawnMob(spawnPoint.type, spawnPoint.x, spawnPoint.y, debug);
    }
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

  public getMobConfig(mobType: string): MobConfig | undefined {
    return MOB_CONFIGS[mobType];
  }

  public isMobTypeAvailable(mobType: string): boolean {
    return mobType in MOB_CONFIGS;
  }

  public getAvailableMobTypes(): string[] {
    return Object.keys(MOB_CONFIGS);
  }

  /**
   * Clean up all spawned mobs by clearing the group
   */
  public destroy(): void {
    // Setting destroy children to true will call destroy() on each mob
    this.mobGroup.clear(true, true);
  }
}