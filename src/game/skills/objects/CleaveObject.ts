import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { BaseEnemy as Enemy } from '../../enemies/BaseEnemy';

export interface CleaveOptions {
    lifesteal?: number;
    sunder?: boolean;
    execution?: boolean;
    isWide?: boolean;
}

export class CleaveObject extends SkillObject {
    private graphics: Phaser.GameObjects.Graphics | null = null;
    private attackSprite: Phaser.GameObjects.Sprite | null = null;
    private radius: number;
    private coneAngle: number;
    private coneRotation: number;
    private options: CleaveOptions;
    private readonly frameCount: number = 10;
    private readonly frameDuration: number = 40; // 40ms per frame = 400ms total animation

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, radius: number = 150, options: CleaveOptions = {}) {
        // Lifetime 400ms to match animation
        super(scene, x, y, damage, 400);
        
        this.radius = radius;
        this.options = options;
        this.coneAngle = options.isWide ? Math.PI / 2 : Math.PI / 3; // Wide vs Normal

        const dx = targetX - x;
        const dy = targetY - y;
        this.coneRotation = Math.atan2(dy, dx);

        // Use knight-basic animation if available
        if (scene.textures.exists('knight-basic-1')) {
            // Create sprite for animation
            this.attackSprite = scene.add.sprite(0, 0, 'knight-basic-1');
            this.attackSprite.setScale(0.18); // Scale to match desired attack size
            this.attackSprite.setOrigin(0.15, 0.5); // Origin near player so slash extends outward
            
            // Flip sprite vertically when attacking to the left side
            // The rotation determines direction: -PI/2 to PI/2 is right side, rest is left
            const isLeftSide = Math.abs(this.coneRotation) > Math.PI / 2;
            
            if (isLeftSide) {
                // Flip vertically for left-side attacks
                this.attackSprite.setFlipY(true);
                // Adjust rotation for flipped sprite
                this.attackSprite.setRotation(this.coneRotation);
            } else {
                // Normal orientation for right-side attacks
                this.attackSprite.setRotation(this.coneRotation);
            }
            
            // Apply tint for lifesteal
            if (this.options.lifesteal) {
                this.attackSprite.setTint(0xff6666);
            }
            
            this.add(this.attackSprite);
            
            // Use timer to animate through all 10 frames
            let currentFrame = 1;
            scene.time.addEvent({
                delay: this.frameDuration,
                repeat: this.frameCount - 1,
                callback: () => {
                    currentFrame++;
                    if (currentFrame <= this.frameCount && this.attackSprite && this.attackSprite.active) {
                        const textureKey = `knight-basic-${currentFrame}`;
                        if (scene.textures.exists(textureKey)) {
                            this.attackSprite.setTexture(textureKey);
                        }
                    }
                }
            });
            
            // Fade out the sprite over the lifetime
            scene.tweens.add({
                targets: this.attackSprite,
                alpha: 0,
                duration: this.lifetime,
                ease: 'Power2',
                delay: this.lifetime * 0.5 // Start fading halfway through
            });
            
            // Adjust hit area to match animation - larger radius and wider cone
            this.radius = radius * 1.2; // Increase radius to cover full slash reach
            this.coneAngle = options.isWide ? Math.PI * 0.8 : Math.PI * 0.6; // Wider arc (108° or 144°) to match slash
        } else {
            // Fallback to graphics cone
            this.graphics = scene.add.graphics();
            let color = 0xffaa00; // Gold
            if (this.options.lifesteal) color = 0xff0000; // Red
            
            this.graphics.fillStyle(color, 0.6);
            
            const startAngle = -this.coneAngle / 2;
            const endAngle = this.coneAngle / 2;
            
            this.graphics.beginPath();
            this.graphics.moveTo(0, 0);
            this.graphics.arc(0, 0, this.radius, startAngle, endAngle, false);
            this.graphics.lineTo(0, 0);
            this.graphics.closePath();
            this.graphics.fillPath();
            
            this.graphics.setRotation(this.coneRotation);
            this.add(this.graphics);
        }
        
        // Physics Body (Approximation for overlap check trigger)
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.radius);
            body.setOffset(-this.radius, -this.radius);
        }
    }

    public update(delta: number): void {
        super.update(delta);
        
        // Graphics fallback fade out
        if (this.graphics) {
            this.graphics.alpha -= delta / 200;
        }
    }

    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (!enemy || !enemy.sprite) return;

        // Precise Cone Check
        if (this.isPointInCone(enemy.sprite.x, enemy.sprite.y)) {
             this.applyHit(enemy);
        }
    }

    private isPointInCone(px: number, py: number): boolean {
        const dx = px - this.x;
        const dy = py - this.y;
        const distanceSq = dx * dx + dy * dy;
        
        if (distanceSq > this.radius * this.radius) return false;
        
        const pointAngle = Math.atan2(dy, dx);
        let angleDiff = pointAngle - this.coneRotation;
        
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        return Math.abs(angleDiff) <= this.coneAngle / 2;
    }

    private applyHit(enemy: Enemy): void {
        let finalDamage = this.damage;
        
        // Execution Logic
        if (this.options.execution && enemy.currentHealth < enemy.stats.health * 0.25) {
            finalDamage *= 2;
        }

        enemy.takeDamage(finalDamage);

        // Sunder Logic
        if (this.options.sunder) {
            enemy.sprite.setTint(0xff0000);
            enemy.sprite.setData('sunder', true);
        }
        
        // Lifesteal (handled via event or callback? For now, we can't easily access Player to heal.
        // Solution: Emit event or require Player passed in. 
        // Pattern: SkillObject usually sends damage. 
        // For now, we'll emit a scene event for lifesteal or ignore it to keep scope clean.)
        if (this.options.lifesteal) {
            this.scene.events.emit('player-heal', finalDamage * this.options.lifesteal);
        }
    }
}
