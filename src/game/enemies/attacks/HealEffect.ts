import { Scene } from 'phaser';

/**
 * Visual effect for enemy healing
 * Creates white particles and a feather sprite above healed targets
 * Follows the target enemy as it moves
 */
export class HealEffect {
    private scene: Scene;
    private graphics: Phaser.GameObjects.Graphics;
    private particles: Phaser.GameObjects.Graphics[] = [];
    private featherSprite: Phaser.GameObjects.Sprite | null = null;
    private target: Phaser.GameObjects.Sprite | null = null;
    private x: number;
    private y: number;
    private lifetime: number = 0;
    private readonly maxLifetime: number = 1.2;
    private active: boolean = true;
    
    // Feather animation state (manual control instead of tweens for following)
    private featherOffsetY: number = -30;
    private featherAlpha: number = 0;
    private featherScale: number = 0.03;
    private featherPhase: 'fadeIn' | 'fadeOut' = 'fadeIn';
    private featherTimer: number = 0;

    constructor(scene: Scene, x: number, y: number, target?: Phaser.GameObjects.Sprite) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.target = target || null;

        // Create main heal ring effect
        this.graphics = this.scene.add.graphics();
        this.graphics.setDepth(15);

        // Create floating particle effects (white)
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.graphics();
            particle.setDepth(15);
            this.particles.push(particle);
        }

        // Create feather sprite above the target
        if (this.scene.textures.exists('feather-heal')) {
            this.featherSprite = this.scene.add.sprite(x, y - 30, 'feather-heal');
            this.featherSprite.setScale(0.03);
            this.featherSprite.setDepth(16);
            this.featherSprite.setAlpha(0);
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;

        this.lifetime += deltaTime;
        const progress = this.lifetime / this.maxLifetime;

        if (progress >= 1) {
            this.active = false;
            return;
        }

        // Update position to follow target if it exists and is active
        if (this.target && this.target.active) {
            this.x = this.target.x;
            this.y = this.target.y;
        }

        // Clear previous frame
        this.graphics.clear();

        // Ring expansion and fade - WHITE colors
        const ringRadius = 10 + progress * 25;
        const ringAlpha = Math.max(0, 1 - progress * 1.2);
        const innerRingRadius = 5 + progress * 15;

        // Outer glow ring (white with slight blue tint)
        this.graphics.lineStyle(3, 0xffffff, ringAlpha * 0.4);
        this.graphics.strokeCircle(this.x, this.y, ringRadius);

        // Inner bright ring (pure white)
        this.graphics.lineStyle(2, 0xffffff, ringAlpha * 0.8);
        this.graphics.strokeCircle(this.x, this.y, innerRingRadius);

        // Center glow (white)
        const centerAlpha = Math.max(0, 1 - progress * 1.5);
        this.graphics.fillStyle(0xffffff, centerAlpha * 0.3);
        this.graphics.fillCircle(this.x, this.y, 8 * (1 - progress * 0.5));

        // Update feather position and animation (follows target)
        if (this.featherSprite) {
            this.featherTimer += deltaTime;
            
            if (this.featherPhase === 'fadeIn') {
                // Fade in over 0.3 seconds
                const fadeInProgress = Math.min(1, this.featherTimer / 0.3);
                this.featherAlpha = fadeInProgress;
                this.featherOffsetY = -30 - fadeInProgress * 10; // -30 to -40
                this.featherScale = 0.03 + fadeInProgress * 0.01; // 0.03 to 0.04
                
                if (fadeInProgress >= 1) {
                    this.featherPhase = 'fadeOut';
                    this.featherTimer = 0;
                }
            } else {
                // Fade out over 0.7 seconds
                const fadeOutProgress = Math.min(1, this.featherTimer / 0.7);
                this.featherAlpha = 1 - fadeOutProgress;
                this.featherOffsetY = -40 - fadeOutProgress * 20; // -40 to -60
                this.featherScale = 0.04 - fadeOutProgress * 0.015; // 0.04 to 0.025
            }
            
            // Update feather position to follow target
            this.featherSprite.setPosition(this.x, this.y + this.featherOffsetY);
            this.featherSprite.setAlpha(this.featherAlpha);
            this.featherSprite.setScale(this.featherScale);
        }

        // Floating particles (white sparkles rising up) - follow target position
        this.particles.forEach((particle, i) => {
            particle.clear();

            const angle = (i / 8) * Math.PI * 2;
            const particleProgress = (progress + i * 0.08) % 1;
            const riseHeight = particleProgress * 40;
            const wobble = Math.sin(particleProgress * Math.PI * 4) * 3;
            const particleX = this.x + Math.cos(angle) * (10 + particleProgress * 12) + wobble;
            const particleY = this.y - riseHeight;
            const particleAlpha = Math.max(0, 1 - particleProgress);
            const particleSize = 2 + (1 - particleProgress) * 3;

            // Draw white sparkle/star
            particle.fillStyle(0xffffff, particleAlpha);
            // Vertical line
            particle.fillRect(particleX - 1, particleY - particleSize, 2, particleSize * 2);
            // Horizontal line
            particle.fillRect(particleX - particleSize, particleY - 1, particleSize * 2, 2);
            
            // Small glow around particle
            particle.fillStyle(0xffffff, particleAlpha * 0.3);
            particle.fillCircle(particleX, particleY, particleSize);
        });
    }

    public isActive(): boolean {
        return this.active;
    }

    public destroy(): void {
        this.active = false;
        this.graphics.destroy();
        this.particles.forEach(p => p.destroy());
        this.particles = [];
        
        if (this.featherSprite) {
            this.featherSprite.destroy();
            this.featherSprite = null;
        }
    }
}

