import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class ShieldBashObject extends SkillObject {
    private radius: number;
    private coneAngle: number;
    private facingVector: Phaser.Math.Vector2;

    constructor(scene: Scene, x: number, y: number, facingVector: Phaser.Math.Vector2, damage: number = 20, duration: number = 200) {
        super(scene, x, y, damage, duration);
        
        this.radius = 150;
        this.coneAngle = Math.PI / 2; // 90 degrees
        this.facingVector = facingVector.clone().normalize();
        
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
        
        this.add(graphics);
        
        // Physics: Circular body for broadphase
        // Container has body enabled by super().
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.radius);
            body.setOffset(-this.radius, -this.radius);
        }

        // Camera Shake ("Weight")
        this.scene.cameras.main.shake(100, 0.01);

        // Bone Slam VFX
        // Add to container? Or Scene?
        // If in container, it moves with player?
        // Shield Bash is usually static relative to cast point (commitment).
        // So adding to container (which is static at x,y) is fine.
        const slam = this.scene.add.sprite(
            this.facingVector.x * 50, 
            this.facingVector.y * 50, 
            'bone_slam'
        );
        slam.play('bone_slam');
        slam.on('animationcomplete', () => slam.destroy());
        this.add(slam);
    }

    public onHit(target: any): void {
        // Logic delegated from Physics collision
        const enemy = target as Enemy;
        // Or if target is Sprite, get Enemy reference?
        // EnemySystem usually handles the mapping or passes Enemy.
        // We'll assume it passes Enemy or we check.
        if (!enemy || !enemy.sprite) return;
        
        if (this.isValidHit(enemy.sprite.x, enemy.sprite.y)) {
             this.applyHit(enemy);
        }
    }

    public isValidHit(targetX: number, targetY: number): boolean {
        const toTarget = new Phaser.Math.Vector2(targetX - this.x, targetY - this.y);
        if (toTarget.lengthSq() > this.radius * this.radius) return false;

        toTarget.normalize();
        const dot = this.facingVector.dot(toTarget);
        const threshold = Math.cos(this.coneAngle / 2);
        
        return dot >= threshold;
    }

    public applyHit(enemy: Enemy): void {
        // Apply Damage
        enemy.takeDamage(this.damage);

        // Apply Stun (Physics stop)
        const body = enemy.sprite.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setVelocity(0, 0);
            // Push back
            const knockback = this.facingVector.clone().scale(200);
            body.setVelocity(knockback.x, knockback.y);
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
}