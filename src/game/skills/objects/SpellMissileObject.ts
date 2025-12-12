import { Scene } from 'phaser';

/**
 * SpellMissileObject - A projectile that travels from player to target and explodes
 * Uses Tweens for reliable movement (like throwing a bomb)
 * Includes trail FX using fading circles
 */
export class SpellMissileObject extends Phaser.GameObjects.Container {
    private cometSprite: Phaser.GameObjects.Sprite | null = null;
    private onReachTarget: () => void;
    private animTimer: Phaser.Time.TimerEvent | null = null;
    constructor(
        scene: Scene,
        startX: number,
        startY: number,
        targetX: number,
        targetY: number,
        speed: number,
        onReachTarget: () => void
    ) {
        super(scene, startX, startY);
        scene.add.existing(this);

        this.onReachTarget = onReachTarget;

        // Visual: Comet sprite (frames) only
        if (scene.textures.exists('comet-1')) {
            this.cometSprite = scene.add.sprite(0, 0, 'comet-1');
            this.cometSprite.setScale(0.9);
            this.cometSprite.setDepth(15);
            this.cometSprite.setBlendMode(Phaser.BlendModes.ADD);
            this.cometSprite.setOrigin(0.5, 0.5);
            this.add(this.cometSprite);
        }

        // If no comet sprite loaded, do nothing (invisible projectile), AOE still triggers
        this.setDepth(15);

        // Calculate travel duration based on distance and speed
        // Spawn from player center, slightly forward toward target
        const initialDx = targetX - startX;
        const initialDy = targetY - startY;
        const travelAngle = Math.atan2(initialDy, initialDx);
        const forwardOffset = 12; // move a bit more forward from the player
        // Vertical nudge: lift a bit, reduce lift when shooting downward
        const baseVerticalNudge = -12;
        const downwardComp = Math.max(0, Math.sin(travelAngle)) * 10; // add up to +10 when aiming downward
        const verticalNudge = baseVerticalNudge + downwardComp;
        // Mirror spawn horizontally when facing left so the projectile comes from the correct side
        const isLeft = travelAngle > Math.PI / 2 || travelAngle < -Math.PI / 2;
        const launchX = startX + Math.cos(travelAngle) * forwardOffset;
        const launchY = startY + Math.sin(travelAngle) * forwardOffset + verticalNudge;
        this.setPosition(launchX, launchY);

        const dx = targetX - launchX;
        const dy = targetY - launchY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = (distance / speed) * 1000; // Convert to ms
        if (this.cometSprite) {
            // Orient comet to face travel direction (sprite faces to the right by default)
            this.cometSprite.setRotation(travelAngle);
            // Flip vertically when aiming left so the sprite appears mirrored across the player
            this.cometSprite.setFlipY(isLeft);

            // Animate frames 1..14 over the travel duration (clamp min/max)
            const totalFrames = 14;
            const minFrameDuration = 30;
            const maxFrameDuration = 120;
            const frameDuration = Phaser.Math.Clamp(duration / totalFrames, minFrameDuration, maxFrameDuration);
            let currentFrame = 1;
            this.animTimer = scene.time.addEvent({
                delay: frameDuration,
                repeat: totalFrames - 1,
                callback: () => {
                    currentFrame = Math.min(currentFrame + 1, totalFrames);
                    const key = `comet-${currentFrame}`;
                    if (this.cometSprite && this.cometSprite.active && scene.textures.exists(key)) {
                        this.cometSprite.setTexture(key);
                    }
                }
            });
        }

        // Tween to target location (like throwing a bomb)
        scene.tweens.add({
            targets: this,
            x: targetX,
            y: targetY,
            duration: Math.max(duration, 100), // Minimum 100ms
            ease: 'Linear',
            onComplete: () => {
                this.explode();
            }
        });
    }

    private explode(): void {
        // Stop animation timer
        if (this.animTimer) {
            this.animTimer.destroy();
            this.animTimer = null;
        }

        // Burst effect - spawn multiple particles outward
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const burst = this.scene.add.graphics();
            burst.fillStyle(0x9933ff, 1);
            burst.fillCircle(0, 0, 6);
            burst.setPosition(this.x, this.y);
            burst.setDepth(16);
            burst.setBlendMode(Phaser.BlendModes.ADD);

            // Keep burst within the smaller Nova radius (radius now 30)
            const burstDistance = 22;
            const targetX = this.x + Math.cos(angle) * burstDistance;
            const targetY = this.y + Math.sin(angle) * burstDistance;

            this.scene.tweens.add({
                targets: burst,
                x: targetX,
                y: targetY,
                alpha: 0,
                scaleX: 0.1,
                scaleY: 0.1,
                duration: 200,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    burst.destroy();
                }
            });
        }

        // Call the callback to spawn the Nova
        this.onReachTarget();

        // Stop trail
        const particles = this.getData('particles') as Phaser.GameObjects.Particles.ParticleEmitter;
        if (particles) {
            particles.stop();
            this.scene.time.delayedCall(500, () => particles.destroy());
        }

        // Destroy self
        this.destroy();
    }
}
