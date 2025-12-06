import { Scene } from 'phaser';

/**
 * SpellMissileObject - A projectile that travels from player to target and explodes
 * Uses Tweens for reliable movement (like throwing a bomb)
 * Includes trail FX using fading circles
 */
export class SpellMissileObject extends Phaser.GameObjects.Container {
    private graphics: Phaser.GameObjects.Graphics;
    private onReachTarget: () => void;
    private trailTimer: Phaser.Time.TimerEvent | null = null;

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

        // Generate particle texture if it doesn't exist
        if (!scene.textures.exists('spell_particle')) {
            const particleGraphics = scene.make.graphics({ x: 0, y: 0 }, false);
            particleGraphics.fillStyle(0xffffff, 1);
            particleGraphics.fillCircle(8, 8, 8);
            particleGraphics.generateTexture('spell_particle', 16, 16);
            particleGraphics.destroy();
        }

        // Visual: Glowing orb
        this.graphics = scene.add.graphics();
        this.graphics.fillStyle(0x9933ff, 1); // Purple magic
        this.graphics.fillCircle(0, 0, 8);

        // Outer glow
        this.graphics.fillStyle(0xcc66ff, 0.4);
        this.graphics.fillCircle(0, 0, 12);

        this.add(this.graphics);
        this.setDepth(15);

        // Spawn trail particles every 30ms
        this.trailTimer = scene.time.addEvent({
            delay: 30,
            loop: true,
            callback: () => {
                this.spawnTrailParticle();
            }
        });

        // Calculate travel duration based on distance and speed
        const dx = targetX - startX;
        const dy = targetY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const duration = (distance / speed) * 1000; // Convert to ms

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

    private spawnTrailParticle(): void {
        if (!this.scene || !this.active) return;

        // Create a small fading circle at current position
        const trail = this.scene.add.graphics();
        trail.fillStyle(0x9933ff, 0.8);
        trail.fillCircle(0, 0, 5);
        trail.setPosition(this.x, this.y);
        trail.setDepth(14);
        trail.setBlendMode(Phaser.BlendModes.ADD);

        // Fade and shrink the trail particle
        this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.2,
            scaleY: 0.2,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                trail.destroy();
            }
        });
    }

    private explode(): void {
        // Stop trail spawning
        if (this.trailTimer) {
            this.trailTimer.destroy();
            this.trailTimer = null;
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

            const targetX = this.x + Math.cos(angle) * 40;
            const targetY = this.y + Math.sin(angle) * 40;

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

        // Destroy self
        this.destroy();
    }
}
