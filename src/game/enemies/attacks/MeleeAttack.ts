import { Scene } from 'phaser';
import { SkillObject } from '../../skills/SkillObject';
import { EnemyType } from '../../types/EnemyTypes';

/**
 * Melee attack hitbox class for close-range enemies
 */
export class MeleeAttack extends SkillObject {
    private boneSlamSprites: Phaser.GameObjects.Sprite[] = [];
    private isOgreAttack: boolean = false;
    private delayBeforeShow: number = 0;
    private hasShownEffect: boolean = false;
    private elapsed: number = 0;
    private attackAngle: number; // Store rotation angle in radians

    constructor(scene: Scene, enemyX: number, enemyY: number, playerX: number, playerY: number, damage: number, enemyRadius: number = 40, width: number = 100, height: number = 60, enemyType?: EnemyType) {
        // Calculate position
        const dx = playerX - enemyX;
        const dy = playerY - enemyY;
        const angleRad = Math.atan2(dy, dx);
        
        // Position the attack hitbox outside the invisible circle (sprite's edge)
        // The attack starts at the edge of the sprite + half the attack width
        const attackDistance = enemyRadius + (width / 2);
        const x = enemyX + Math.cos(angleRad) * attackDistance;
        const y = enemyY + Math.sin(angleRad) * attackDistance;
        
        // Determine lifetime
        let lifetime = 0.3; // Attack lasts 0.3 seconds
        if (enemyType === EnemyType.OGRE) {
            lifetime = 1.1; // Extended for ogre
        }

        super(scene, x, y, damage, lifetime * 1000); // SkillObject takes ms
        
        this.isOgreAttack = enemyType === EnemyType.OGRE;
        this.attackAngle = angleRad;
        this.setSize(width, height);
        
        // Create visual effect based on enemy type
        if (this.isOgreAttack && scene.textures.exists('bone-slam-0')) {
            // For ogre attacks, delay showing the bone slam until after attack animation completes
            this.delayBeforeShow = 0.8;
            this.alpha = 0; // Start invisible
            
            // Flip/Rotation logic
            const normalizedAngle = ((this.attackAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
            const shouldFlip = normalizedAngle > Math.PI / 2 && normalizedAngle < (3 * Math.PI) / 2;
            
            // Create 3 layered sprites
            for (let i = 0; i < 3; i++) {
                const boneSlamSprite = scene.add.sprite(0, 0, 'bone-slam-0');
                boneSlamSprite.setScale(0.2);
                boneSlamSprite.setRotation(this.attackAngle);
                boneSlamSprite.setOrigin(0.5, 0.5);
                boneSlamSprite.setAlpha(0.6);
                boneSlamSprite.setTint(0xffffff);
                boneSlamSprite.setBlendMode(Phaser.BlendModes.NORMAL);
                
                if (shouldFlip) {
                    boneSlamSprite.setFlipY(true);
                }
                
                this.add(boneSlamSprite);
                this.boneSlamSprites.push(boneSlamSprite);
            }
        } else {
            // Create a orange/yellow rectangle for the melee attack (fallback)
            const graphics = scene.add.graphics();
            graphics.fillStyle(0xff0000, 1); // Red color
            graphics.fillRect(-width / 2, -height / 2, width, height);
            graphics.setRotation(this.attackAngle); // Rotate graphics inside container
            
            this.add(graphics);
            
            // Add a small circle at the attack origin for debugging
            const dot = scene.add.graphics();
            dot.fillStyle(0xffff00, 1);
            dot.fillCircle(0, 0, 5);
            this.add(dot);
            
            // Since we rotate the graphics inside, the container itself is not rotated relative to world 0 (it is at x,y).
            // But Player checkCollision uses `getBounds()`.
            // If we want `getBounds` to be accurate for the *graphics*, we rely on Container bounds.
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.elapsed += deltaTime;
        
        // Handle delayed bone slam effect
        if (this.isOgreAttack && !this.hasShownEffect && this.elapsed >= this.delayBeforeShow) {
            this.hasShownEffect = true;
            this.alpha = 1; // Make visible
            
            // Play the bone slam animation on all sprites
            this.boneSlamSprites.forEach(sprite => {
                if (sprite.anims) {
                    sprite.play('bone_slam');
                }
            });
        }
        
        // Fade out over lifetime (skip for bone slam to maintain visibility)
        if (!this.isOgreAttack) {
            const lifetime = 0.3;
            const alpha = 1 - (this.elapsed / lifetime);
            this.setAlpha(alpha * 0.6); // Max alpha is 0.6
        }
        
        // Destruction is handled by SkillObject (delayedCall) or EnemySystem (filtering inactive).
    }

    public isActive(): boolean {
        return this.active;
    }
}
