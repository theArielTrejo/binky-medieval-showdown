import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class HammerThrowObject extends SkillObject {
    private hammerSprite: Phaser.GameObjects.Sprite;
    private velocityX: number;
    private velocityY: number;
    private rotationSpeed: number = 25; // Radians per second for spinning (faster)
    private stunDuration: number = 1500; // 1.5 second stun
    private updateTimer: Phaser.Time.TimerEvent;
    private maxDistance: number = 400;
    private startX: number;
    private startY: number;
    private hasHit: boolean = false;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number) {
        super(scene, x, y, damage, 5000); // Long duration, will destroy on hit or max distance
        
        this.startX = x;
        this.startY = y;
        this.isProjectile = true;
        
        // Calculate velocity towards target
        const angle = Math.atan2(targetY - y, targetX - x);
        const speed = 450; // Travel speed
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        
        // Create hammer sprite
        this.hammerSprite = scene.add.sprite(x, y, 'pixel-hammer');
        this.hammerSprite.setScale(0.04); // Smaller hammer
        this.hammerSprite.setDepth(1002);
        this.hammerSprite.setOrigin(0.5, 0.5);
        
        // Physics body for collision
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(20);
            body.setOffset(-20, -20);
        }
        
        // Timer for smooth updates
        this.updateTimer = scene.time.addEvent({
            delay: 16,
            callback: this.updateProjectile,
            callbackScope: this,
            loop: true
        });
    }

    private updateProjectile(): void {
        if (!this.active || this.hasHit) return;
        
        const dt = 0.016; // ~60fps
        
        // Move projectile
        const newX = this.x + this.velocityX * dt;
        const newY = this.y + this.velocityY * dt;
        
        this.setPosition(newX, newY);
        this.hammerSprite.setPosition(newX, newY);
        
        // Rotate hammer (full 360 spin while traveling)
        this.hammerSprite.rotation += this.rotationSpeed * dt;
        
        // Check max distance
        const distTraveled = Math.sqrt(
            Math.pow(newX - this.startX, 2) + Math.pow(newY - this.startY, 2)
        );
        
        if (distTraveled >= this.maxDistance) {
            this.destroy();
        }
    }

    public update(_deltaTime: number): void {
        // Updates handled by timer
    }

    public onHit(target: any): void {
        const enemy = target as Enemy;
        if (enemy && !this.hasHit) {
            this.applyHit(enemy);
        }
    }

    public applyHit(enemy: Enemy): void {
        if (this.hasHit) return;
        this.hasHit = true;
        
        // Deal high damage
        enemy.takeDamage(this.damage);
        
        // Apply stun - stop enemy movement
        const enemyBody = enemy.sprite.body as Phaser.Physics.Arcade.Body;
        if (enemyBody) {
            enemyBody.setVelocity(0, 0);
        }
        
        // Apply stun visual - yellow tint
        enemy.sprite.setTint(0xffff00);
        
        // Stun indicator - smaller stars above head
        const starContainer = this.scene.add.container(enemy.sprite.x, enemy.sprite.y - 35);
        starContainer.setDepth(1003);
        
        for (let i = 0; i < 3; i++) {
            const star = this.scene.add.star(
                Math.cos(i * (Math.PI * 2 / 3)) * 10,
                Math.sin(i * (Math.PI * 2 / 3)) * 5,
                5, 2, 5, 0xffff00  // Smaller stars: inner radius 2, outer radius 5
            );
            starContainer.add(star);
        }
        
        // Store reference to star container on enemy for cleanup
        enemy.sprite.setData('stunStars', starContainer);
        
        // Set enemy as stunned
        enemy.sprite.setData('stunned', true);
        enemy.sprite.setData('stunnedUntil', this.scene.time.now + this.stunDuration);
        
        // Timer to check if enemy died and update star position
        const starUpdateTimer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                // If enemy died, destroy stars immediately
                if (!enemy.sprite.active || enemy.currentHealth <= 0) {
                    if (starContainer.active) {
                        starContainer.destroy();
                    }
                    starUpdateTimer.destroy();
                    return;
                }
                // Update position to follow enemy
                starContainer.setPosition(enemy.sprite.x, enemy.sprite.y - 35);
                starContainer.angle += 4; // Spin the stars
            },
            loop: true
        });
        
        // Clear stun after duration
        this.scene.time.delayedCall(this.stunDuration, () => {
            // Stop the update timer
            starUpdateTimer.destroy();
            
            // Destroy stars if still exist
            if (starContainer.active) {
                starContainer.destroy();
            }
            
            // Clear stun state and tint if enemy still alive
            if (enemy.sprite.active) {
                enemy.sprite.setData('stunned', false);
                enemy.sprite.setData('stunStars', null);
                enemy.sprite.clearTint();
            }
        });
        
        // Impact effect - subtle camera shake
        this.scene.cameras.main.shake(40, 0.001);
        
        // Destroy projectile after hit
        this.destroy();
    }

    destroy(fromScene?: boolean): void {
        if (this.updateTimer) {
            this.updateTimer.destroy();
        }
        if (this.hammerSprite) {
            this.hammerSprite.destroy();
        }
        super.destroy(fromScene);
    }
}

