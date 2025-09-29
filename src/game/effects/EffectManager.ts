/**
 * Effect Manager (Refactored)
 * Centralized visual effects system leveraging Phaser's Particle Emitter and FX Pipeline.
 */

import { Scene } from 'phaser';
import { XP_CONSTANTS } from '../constants/XPConstants';

export class EffectManager {
  /**
   * Creates a complete collection effect with text, particles, and sound
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
   */
  static createFloatingText(scene: Scene, x: number, y: number, xpValue: number): void {
    try {
      const xpText = scene.add.text(x, y, `+${xpValue}`, {
        fontSize: '16px',
        color: '#00FF00', // Green to match the orb
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
          xpText.destroy();
        }
      });
    } catch (error) {
      console.error('Error creating floating text:', error);
    }
  }

  /**
   * Creates a particle burst effect using the 'green_orb' texture.
   */
  static createParticleBurst(scene: Scene, x: number, y: number): void {
    try {
      const emitter = scene.add.particles(x, y, 'green_orb', {
          frequency: -1, 
          lifespan: XP_CONSTANTS.PARTICLE_ANIMATION_DURATION,
          speed: { min: 80, max: 200 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: XP_CONSTANTS.PARTICLE_ALPHA, end: 0 },
          quantity: XP_CONSTANTS.PARTICLE_COUNT,
          blendMode: 'ADD'
      });

      emitter.setDepth(XP_CONSTANTS.DEPTH.PARTICLES);

      scene.time.delayedCall(XP_CONSTANTS.PARTICLE_ANIMATION_DURATION + 100, () => {
          emitter.destroy();
      });

    } catch (error) {
        console.error('Error creating particle burst:', error);
    }
  }

  /**
   * Creates sound ring effect
   */
  static createSoundRing(scene: Scene, x: number, y: number): void {
    try {
      const soundRing = scene.add.circle(x, y, XP_CONSTANTS.SOUND_RING_RADIUS, 0x000000, 0);
      soundRing.setStrokeStyle(XP_CONSTANTS.SOUND_RING_STROKE_WIDTH, 0x00ff00, XP_CONSTANTS.SOUND_RING_ALPHA);
      soundRing.setDepth(XP_CONSTANTS.DEPTH.FLASH);

      scene.tweens.add({
        targets: soundRing,
        scaleX: XP_CONSTANTS.SOUND_RING_SCALE_MULTIPLIER,
        scaleY: XP_CONSTANTS.SOUND_RING_SCALE_MULTIPLIER,
        alpha: 0,
        duration: XP_CONSTANTS.SOUND_RING_DURATION,
        ease: 'Power2.easeOut',
        onComplete: () => {
          soundRing.destroy();
        }
      });
    } catch (error) {
      console.error('Error creating sound ring:', error);
    }
  }
  
  // --- METHOD RE-ADDED ---
  /**
   * Creates a higher-quality flash effect using the Bloom FX (shader).
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
      const bloom = flash.postFX.addBloom(XP_CONSTANTS.COLORS.FLASH, 0, 0, 1, 1.2);
      scene.tweens.add({
        targets: [flash, bloom],
        strength: 0,
        alpha: 0,
        scaleX: XP_CONSTANTS.FLASH_SCALE_MULTIPLIER,
        scaleY: XP_CONSTANTS.FLASH_SCALE_MULTIPLIER,
        duration: XP_CONSTANTS.FLASH_ANIMATION_DURATION,
        ease: 'Power2.easeOut',
        onComplete: () => {
          flash.destroy();
        }
      });
    } catch (error) {
      console.error('Error creating flash effect:', error);
    }
  }

  // --- METHOD RE-ADDED ---
  /**
   * Creates spawn animation for orbs
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
        onComplete: onComplete
      });
    } catch (error) {
      console.error('Error creating spawn animation:', error);
      if (onComplete) onComplete();
    }
  }

  // --- METHOD RE-ADDED ---
  /**
   * Creates collection animation for orbs
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
        onComplete: onComplete
      });
    } catch (error) {
      console.error('Error creating collection animation:', error);
      onComplete();
    }
  }

  /**
   * Creates pulse animation by manipulating the Glow FX.
   */
  static updatePulseAnimation(
    sprite: Phaser.GameObjects.Sprite,
    pulseTimer: number
  ): void {
    try {
      const glow = sprite.getData('glowEffect') as Phaser.FX.Glow;
      if (!glow) return;
      const pulseScale = 1 + Math.sin(pulseTimer * XP_CONSTANTS.PULSE_FREQUENCY) * XP_CONSTANTS.PULSE_AMPLITUDE;
      sprite.setScale(pulseScale);
      glow.outerStrength = pulseScale * XP_CONSTANTS.PULSE_GLOW_MULTIPLIER;
    } catch (error) {
      console.warn('Error updating pulse animation:', error);
    }
  }

  /**
   * Updates fade effect for orbs.
   */
  static updateFadeEffect(
    sprite: Phaser.GameObjects.Sprite,
    age: number,
    lifetime: number
  ): void {
    try {
      const fadeThreshold = lifetime * XP_CONSTANTS.FADE_THRESHOLD;
      if (age > fadeThreshold) {
        const fadeProgress = (age - fadeThreshold) / (lifetime - fadeThreshold);
        const alpha = 1 - (fadeProgress * 0.5);
        sprite.setAlpha(alpha);
      }
    } catch (error) {
      console.warn('Error updating fade effect:', error);
    }
  }

  /**
   * Updates blink effect for orbs.
   */
  static updateBlinkEffect(
    sprite: Phaser.GameObjects.Sprite,
    age: number,
    lifetime: number
  ): void {
    try {
      if (age > lifetime - XP_CONSTANTS.BLINK_DURATION) {
        const shouldShow = Math.floor((age / 1000) * XP_CONSTANTS.BLINK_SPEED) % 2 === 0;
        sprite.setVisible(shouldShow);
      }
    } catch (error) {
      console.warn('Error updating blink effect:', error);
    }
  }
}