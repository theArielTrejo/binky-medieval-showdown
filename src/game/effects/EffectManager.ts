/**
 * Effect Manager
 * Centralized visual effects system to eliminate code duplication
 */

import { Scene } from 'phaser';
import { XP_CONSTANTS } from '../constants/XPConstants';
import { getCircularPositions } from '../utils/MathUtils';

/**
 * Centralized effect manager for all visual effects in the game
 */
export class EffectManager {
  /**
   * Creates a complete collection effect with text, particles, and sound
   * @param scene - Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param xpValue - XP value to display
   */
  static createCollectionEffect(scene: Scene, x: number, y: number, xpValue: number): void {
    try {
      this.createFloatingText(scene, x, y, xpValue);
      this.createParticleBurst(scene, x, y);
      this.createSoundRing(scene, x, y);
    } catch (error) {
      console.error('Error creating collection effect:', error);
    }
  }

  /**
   * Creates floating XP text effect
   * @param scene - Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param xpValue - XP value to display
   */
  static createFloatingText(scene: Scene, x: number, y: number, xpValue: number): void {
    try {
      const xpText = scene.add.text(x, y, `+${xpValue}`, {
        fontSize: '16px',
        color: '#FFD700',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      scene.tweens.add({
        targets: xpText,
        y: y - 50,
        alpha: 0,
        scale: 1.5,
        duration: XP_CONSTANTS.FLOATING_TEXT_DURATION,
        ease: 'Power2.easeOut',
        onComplete: () => {
          try {
            xpText.destroy();
          } catch (destroyError) {
            console.warn('Error destroying floating text:', destroyError);
          }
        }
      });
    } catch (error) {
      console.error('Error creating floating text:', error);
    }
  }

  /**
   * Creates particle burst effect
   * @param scene - Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  static createParticleBurst(scene: Scene, x: number, y: number): void {
    try {
      const positions = getCircularPositions(
        0, 0, // Relative to origin
        XP_CONSTANTS.PARTICLE_SPREAD_MIN + Math.random() * (XP_CONSTANTS.PARTICLE_SPREAD_MAX - XP_CONSTANTS.PARTICLE_SPREAD_MIN),
        XP_CONSTANTS.PARTICLE_COUNT
      );

      positions.forEach((pos, index) => {
        try {
          const particle = scene.add.circle(
            x, y,
            XP_CONSTANTS.PARTICLE_RADIUS,
            XP_CONSTANTS.COLORS.PARTICLE,
            XP_CONSTANTS.PARTICLE_ALPHA
          );
          particle.setDepth(XP_CONSTANTS.DEPTH.PARTICLES);

          scene.tweens.add({
            targets: particle,
            x: x + pos.x,
            y: y + pos.y,
            alpha: 0,
            scale: XP_CONSTANTS.PARTICLE_SCALE_END,
            duration: XP_CONSTANTS.PARTICLE_ANIMATION_DURATION + Math.random() * XP_CONSTANTS.PARTICLE_ANIMATION_VARIANCE,
            ease: 'Power2.easeOut',
            onComplete: () => {
              try {
                particle.destroy();
              } catch (destroyError) {
                console.warn(`Error destroying particle ${index}:`, destroyError);
              }
            }
          });
        } catch (particleError) {
          console.warn(`Error creating particle ${index}:`, particleError);
        }
      });
    } catch (error) {
      console.error('Error creating particle burst:', error);
    }
  }

  /**
   * Creates sound ring effect
   * @param scene - Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  static createSoundRing(scene: Scene, x: number, y: number): void {
    try {
      const soundRing = scene.add.circle(
        x, y,
        XP_CONSTANTS.SOUND_RING_RADIUS,
        XP_CONSTANTS.COLORS.SOUND_RING_FILL,
        0
      );
      soundRing.setStrokeStyle(
        XP_CONSTANTS.SOUND_RING_STROKE_WIDTH,
        XP_CONSTANTS.COLORS.SOUND_RING_STROKE,
        XP_CONSTANTS.SOUND_RING_ALPHA
      );
      soundRing.setDepth(XP_CONSTANTS.DEPTH.FLASH);

      scene.tweens.add({
        targets: soundRing,
        scaleX: XP_CONSTANTS.SOUND_RING_SCALE_MULTIPLIER,
        scaleY: XP_CONSTANTS.SOUND_RING_SCALE_MULTIPLIER,
        alpha: 0,
        duration: XP_CONSTANTS.SOUND_RING_DURATION,
        ease: 'Power2.easeOut',
        onComplete: () => {
          try {
            soundRing.destroy();
          } catch (destroyError) {
            console.warn('Error destroying sound ring:', destroyError);
          }
        }
      });
    } catch (error) {
      console.error('Error creating sound ring:', error);
    }
  }

  /**
   * Creates flash effect for orb collection
   * @param scene - Phaser scene
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  static createFlashEffect(scene: Scene, x: number, y: number): void {
    try {
      const flash = scene.add.circle(
        x, y,
        XP_CONSTANTS.FLASH_RADIUS,
        XP_CONSTANTS.COLORS.FLASH,
        XP_CONSTANTS.FLASH_ALPHA
      );
      flash.setDepth(XP_CONSTANTS.DEPTH.FLASH);

      scene.tweens.add({
        targets: flash,
        scaleX: XP_CONSTANTS.FLASH_SCALE_MULTIPLIER,
        scaleY: XP_CONSTANTS.FLASH_SCALE_MULTIPLIER,
        alpha: 0,
        duration: XP_CONSTANTS.FLASH_ANIMATION_DURATION,
        ease: 'Power2.easeOut',
        onComplete: () => {
          try {
            flash.destroy();
          } catch (destroyError) {
            console.warn('Error destroying flash effect:', destroyError);
          }
        }
      });
    } catch (error) {
      console.error('Error creating flash effect:', error);
    }
  }

  /**
   * Creates spawn animation for orbs
   * @param scene - Phaser scene
   * @param targets - Array of game objects to animate
   * @param onComplete - Optional callback when animation completes
   */
  static createSpawnAnimation(
    scene: Scene, 
    targets: Phaser.GameObjects.GameObject[], 
    onComplete?: () => void
  ): void {
    try {
      scene.tweens.add({
        targets: targets,
        scaleX: 1,
        scaleY: 1,
        duration: XP_CONSTANTS.SPAWN_ANIMATION_DURATION,
        ease: 'Back.easeOut',
        onComplete: () => {
          try {
            if (onComplete) {
              onComplete();
            }
          } catch (callbackError) {
            console.warn('Error in spawn animation callback:', callbackError);
          }
        }
      });
    } catch (error) {
      console.error('Error creating spawn animation:', error);
      // Ensure callback is called even on error
      if (onComplete) {
        try {
          onComplete();
        } catch (callbackError) {
          console.warn('Error in spawn animation error callback:', callbackError);
        }
      }
    }
  }

  /**
   * Creates collection animation for orbs
   * @param scene - Phaser scene
   * @param targets - Array of game objects to animate
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @param onComplete - Callback when animation completes
   */
  static createCollectionAnimation(
    scene: Scene,
    targets: Phaser.GameObjects.GameObject[],
    targetX: number,
    targetY: number,
    onComplete: () => void
  ): void {
    try {
      scene.tweens.add({
        targets: targets,
        x: targetX,
        y: targetY,
        scaleX: 0.3,
        scaleY: 0.3,
        alpha: 0,
        duration: XP_CONSTANTS.COLLECTION_ANIMATION_DURATION,
        ease: 'Power2.easeIn',
        onComplete: () => {
          try {
            onComplete();
          } catch (callbackError) {
            console.error('Error in collection animation callback:', callbackError);
          }
        }
      });
    } catch (error) {
      console.error('Error creating collection animation:', error);
      // Ensure callback is called even on error
      try {
        onComplete();
      } catch (callbackError) {
        console.error('Error in collection animation error callback:', callbackError);
      }
    }
  }

  /**
   * Creates pulse animation for orbs
   * @param scene - Phaser scene
   * @param sprite - Main sprite to pulse
   * @param glowEffect - Glow effect sprite
   * @param pulseTimer - Current pulse timer value
   */
  static updatePulseAnimation(
    sprite: Phaser.GameObjects.Arc,
    glowEffect: Phaser.GameObjects.Arc,
    pulseTimer: number
  ): void {
    try {
      const pulseScale = 1 + Math.sin(pulseTimer * XP_CONSTANTS.PULSE_FREQUENCY) * XP_CONSTANTS.PULSE_AMPLITUDE;
      sprite.setScale(pulseScale);
      glowEffect.setScale(pulseScale * XP_CONSTANTS.PULSE_GLOW_MULTIPLIER);
    } catch (error) {
      console.warn('Error updating pulse animation:', error);
    }
  }

  /**
   * Updates fade effect for orbs approaching expiration
   * @param sprite - Main sprite
   * @param glowEffect - Glow effect sprite
   * @param age - Current age of the orb
   * @param lifetime - Total lifetime of the orb
   */
  static updateFadeEffect(
    sprite: Phaser.GameObjects.Arc,
    glowEffect: Phaser.GameObjects.Arc,
    age: number,
    lifetime: number
  ): void {
    try {
      const fadeThreshold = lifetime * XP_CONSTANTS.FADE_THRESHOLD;
      if (age > fadeThreshold) {
        const fadeProgress = (age - fadeThreshold) / (lifetime - fadeThreshold);
        const alpha = 1 - (fadeProgress * 0.5); // Fade to 50% opacity
        sprite.setAlpha(alpha);
        glowEffect.setAlpha(alpha * XP_CONSTANTS.GLOW_ALPHA);
      }
    } catch (error) {
      console.warn('Error updating fade effect:', error);
    }
  }

  /**
   * Updates blink effect for orbs in final moments
   * @param sprite - Main sprite
   * @param glowEffect - Glow effect sprite
   * @param age - Current age of the orb
   * @param lifetime - Total lifetime of the orb
   */
  static updateBlinkEffect(
    sprite: Phaser.GameObjects.Arc,
    glowEffect: Phaser.GameObjects.Arc,
    age: number,
    lifetime: number
  ): void {
    try {
      if (age > lifetime - XP_CONSTANTS.BLINK_DURATION) {
        const shouldShow = Math.floor((age / 1000) * XP_CONSTANTS.BLINK_SPEED) % 2 === 0;
        sprite.setVisible(shouldShow);
        glowEffect.setVisible(shouldShow);
      }
    } catch (error) {
      console.warn('Error updating blink effect:', error);
    }
  }
}