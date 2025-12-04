import { Scene } from 'phaser';
import { SkillObject } from './SkillObject';
import { Enemy } from '../systems/EnemySystem';

export class ShieldBashSkill extends SkillObject {
    private radius: number;
    private coneAngle: number;
    private facingVector: Phaser.Math.Vector2;
    private casterPosition: Phaser.Math.Vector2;

    constructor(scene: Scene, x: number, y: number, facingVector: Phaser.Math.Vector2) {
        super(scene, 20); // Base damage 20
        this.radius = 150;
        this.coneAngle = Math.PI / 2; // 90 degrees
        this.facingVector = facingVector.clone().normalize();
        this.casterPosition = new Phaser.Math.Vector2(x, y);

        // Configuration
        this.anticipationDuration = 100; // Fast startup
        this.activeDuration = 200; // Hitbox active briefly
        this.recoveryDuration = 300; // Recovery time
    }

    protected onActiveStart(): void {
        // Visuals: Cone Graphics
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xffaa00, 0.5);
        
        const startAngle = this.facingVector.angle() - this.coneAngle / 2;
        const endAngle = this.facingVector.angle() + this.coneAngle / 2;
        
        graphics.beginPath();
        graphics.moveTo(0, 0);
        graphics.arc(0, 0, this.radius, startAngle, endAngle, false);
        graphics.lineTo(0, 0);
        graphics.closePath();
        graphics.fillPath();
        
        graphics.setPosition(this.casterPosition.x, this.casterPosition.y);
        this.hitBox = graphics;

        // Physics: Circular body for broadphase
        this.scene.physics.add.existing(this.hitBox);
        const body = this.hitBox.body as Phaser.Physics.Arcade.Body;
        body.setCircle(this.radius);
        body.setOffset(-this.radius, -this.radius);

        // Camera Shake ("Weight")
        this.scene.cameras.main.shake(100, 0.01);

        // Bone Slam VFX
        const slam = this.scene.add.sprite(
            this.casterPosition.x + this.facingVector.x * 50, 
            this.casterPosition.y + this.facingVector.y * 50, 
            'bone_slam'
        );
        slam.play('bone_slam');
        slam.on('animationcomplete', () => slam.destroy());
    }

    protected onRecoveryStart(): void {
        if (this.hitBox) {
            this.hitBox.destroy();
            this.hitBox = null;
        }
    }

    public update(deltaTime: number): void {
        super.update(deltaTime);
        // Sync position if we wanted it to follow player, but for a "Bash" 
        // it's often better if it hits where the player WAS standing (commitment).
        // For now, static at cast location.
    }

    public checkCollision(_enemy: Enemy): boolean {
        // Broadphase already handled by arcade overlap calling this, 
        // effectively providing us with candidates. 
        // But since we are using a custom SkillObject system, 
        // the PlayerSkillSystem will call a method on us when overlap occurs.
        
        // Wait, PlayerSkillSystem logic is:
        // scene.physics.overlap(hitboxGroup, enemyGroup, (skillSprite, enemySprite) => ...)
        
        // We need to implement the specific logic in a callback or expose a method.
        // Let's assume PlayerSkillSystem will delegate the hit check to us.
        
        return true; 
    }

    /**
     * Validates if the enemy is within the cone angle
     */
    public isValidHit(targetX: number, targetY: number): boolean {
        const toTarget = new Phaser.Math.Vector2(targetX - this.casterPosition.x, targetY - this.casterPosition.y);
        if (toTarget.lengthSq() > this.radius * this.radius) return false;

        toTarget.normalize();
        const dot = this.facingVector.dot(toTarget);
        const threshold = Math.cos(this.coneAngle / 2);
        
        return dot >= threshold;
    }

    public applyHit(enemy: Enemy): void {
        // Apply Damage
        enemy.takeDamage(this.damage);

        // Apply Stun
        // Enemy class doesn't have explicit setStunned yet, but we can simulate it 
        // by stopping velocity and disabling update briefly or adding a flag.
        // For Phase 2, let's just stop movement.
        const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocity(0, 0);
            // Push back
            const knockback = this.facingVector.clone().scale(200);
            body.setVelocity(knockback.x, knockback.y);
            // We'd need to modify Enemy.ts to really support "Stunned" state.
            // For now, this is a "physics stun".
        }
        
        // Visual feedback
        const star = this.scene.add.star(enemy.sprite.x, enemy.sprite.y - 40, 5, 10, 20, 0xffff00);
        this.scene.tweens.add({
            targets: star,
            y: star.y - 20,
            alpha: 0,
            duration: 500,
            onComplete: () => star.destroy()
        });
    }

    public destroy(): void {
        if (this.hitBox) this.hitBox.destroy();
    }
}
