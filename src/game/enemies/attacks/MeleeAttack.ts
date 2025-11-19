import { Scene } from 'phaser';
import { EnemyType } from '../../types/EnemyTypes';

/**
 * Melee attack hitbox class for close-range enemies
 */
export class MeleeAttack {
    public sprite: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
    public damage: number;
    public scene: Scene;
    private active: boolean = true;
    private lifetime: number = 0.3; // Attack lasts 0.3 seconds (extended for ogre)
    private elapsed: number = 0;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    private angle: number; // Store rotation angle in radians
    private corners: { x: number; y: number }[]; // Rotated corner positions
    private isOgreAttack: boolean = false;
    private boneSlamSprites: Phaser.GameObjects.Sprite[] = []; // Multiple sprites for layering
    private delayBeforeShow: number = 0; // Delay before showing the effect
    private hasShownEffect: boolean = false; // Track if effect has been shown

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number = 40, width: number = 100, height: number = 60, enemyType?: EnemyType) {
        this.scene = scene;
        this.damage = damage;
        this.width = width;
        this.height = height;
        this.isOgreAttack = enemyType === EnemyType.OGRE;
        
        // Calculate angle towards player
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        this.angle = Math.atan2(dy, dx);
        
        // Position the attack hitbox outside the invisible circle (sprite's edge)
        // The attack starts at the edge of the sprite + half the attack width
        const attackDistance = enemyRadius + (width / 2);
        this.x = enemyX + Math.cos(this.angle) * attackDistance;
        this.y = enemyY + Math.sin(this.angle) * attackDistance;
        
        console.log(`Melee attack created - Enemy radius: ${enemyRadius.toFixed(1)}, Attack distance from center: ${attackDistance.toFixed(1)}, Position: (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        
        // Calculate rotated corners for collision detection
        this.updateCorners();
        
        // Create visual effect based on enemy type
        if (this.isOgreAttack && scene.textures.exists('bone-slam-0')) {
            // For ogre attacks, delay showing the bone slam until after attack animation completes
            // Ogre attack animation is 12 frames at 15fps = 0.8 seconds
            this.delayBeforeShow = 0.8;
            // Extend lifetime to show bone slam after delay (0.8 delay + 0.3 animation = 1.1 total)
            this.lifetime = 1.1;
            
            // Create an invisible container initially
            const container = scene.add.container(this.x, this.y);
            container.setDepth(5);
            container.setAlpha(0); // Start invisible
            
            // Flip the sprite based on direction to ensure it looks correct from all angles
            // Normalize angle to 0-2π range
            const normalizedAngle = ((this.angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            const shouldFlip = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;
            
            // Create 3 layered sprites to build up opacity
            for (let i = 0; i < 3; i++) {
                const boneSlamSprite = scene.add.sprite(0, 0, 'bone-slam-0');
                boneSlamSprite.setScale(0.2);
                boneSlamSprite.setRotation(this.angle);
                boneSlamSprite.setOrigin(0.5, 0.5);
                boneSlamSprite.setAlpha(0.6); // Each layer at 60% opacity
                boneSlamSprite.setTint(0xffffff);
                boneSlamSprite.setBlendMode(Phaser.BlendModes.NORMAL);
                
                if (shouldFlip) {
                    boneSlamSprite.setFlipY(true);
                }
                
                container.add(boneSlamSprite);
                this.boneSlamSprites.push(boneSlamSprite);
            }
            
            this.sprite = container;
        } else {
            // Create a orange/yellow rectangle for the melee attack (fallback)
            this.sprite = scene.add.graphics();
            (this.sprite as Phaser.GameObjects.Graphics).fillStyle(0xff0000, 1); // Red color
            (this.sprite as Phaser.GameObjects.Graphics).fillRect(-width / 2, -height / 2, width, height);
            this.sprite.setPosition(this.x, this.y);
            this.sprite.setRotation(this.angle); // Rotate to face player
            this.sprite.setDepth(5); // Below projectiles but above ground
            
            // Add a small circle at the attack origin for debugging
            (this.sprite as Phaser.GameObjects.Graphics).fillStyle(0xffff00, 1); // Yellow
            (this.sprite as Phaser.GameObjects.Graphics).fillCircle(0, 0, 5); // Small yellow dot at attack center
        }
    }

    private updateCorners(): void {
        // Calculate the four corners of the rotated rectangle
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        this.corners = [
            { // Top-left
                x: this.x + (-halfW * cos - -halfH * sin),
                y: this.y + (-halfW * sin + -halfH * cos)
            },
            { // Top-right
                x: this.x + (halfW * cos - -halfH * sin),
                y: this.y + (halfW * sin + -halfH * cos)
            },
            { // Bottom-right
                x: this.x + (halfW * cos - halfH * sin),
                y: this.y + (halfW * sin + halfH * cos)
            },
            { // Bottom-left
                x: this.x + (-halfW * cos - halfH * sin),
                y: this.y + (-halfW * sin + halfH * cos)
            }
        ];
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Handle delayed bone slam effect
        if (this.isOgreAttack && !this.hasShownEffect && this.elapsed >= this.delayBeforeShow) {
            this.hasShownEffect = true;
            this.sprite.setAlpha(1); // Make visible
            
            // Play the bone slam animation on all sprites
            this.boneSlamSprites.forEach(sprite => {
                if (sprite.anims) {
                    sprite.play('bone_slam');
                }
            });
        }
        
        // Fade out over lifetime (skip for bone slam to maintain visibility)
        if (!this.isOgreAttack) {
            const alpha = 1 - (this.elapsed / this.lifetime);
            this.sprite.setAlpha(alpha * 0.6); // Max alpha is 0.6
        }
        
        // Destroy after lifetime
        if (this.elapsed >= this.lifetime) {
            this.destroy();
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite) {
            this.sprite.destroy();
        }
        // Clean up any bone slam sprites
        this.boneSlamSprites.forEach(sprite => {
            if (sprite && sprite.scene) {
                sprite.destroy();
            }
        });
        this.boneSlamSprites = [];
    }

    public isActive(): boolean {
        return this.active;
    }

    public getBounds(): { x: number; y: number; width: number; height: number } {
        // Return axis-aligned bounding box for simple collision
        // This is a simplified version - for more accuracy, use the corners
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }

    public getCorners(): { x: number; y: number }[] {
        return this.corners;
    }
}