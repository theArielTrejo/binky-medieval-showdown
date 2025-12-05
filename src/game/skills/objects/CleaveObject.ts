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
    private graphics: Phaser.GameObjects.Graphics;
    private radius: number;
    private coneAngle: number;
    private coneRotation: number;
    private options: CleaveOptions;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, radius: number = 150, options: CleaveOptions = {}) {
        // Lifetime 200ms
        super(scene, x, y, damage, 200);
        
        this.radius = radius;
        this.options = options;
        this.coneAngle = options.isWide ? Math.PI / 2 : Math.PI / 3; // Wide vs Normal

        const dx = targetX - x;
        const dy = targetY - y;
        this.coneRotation = Math.atan2(dy, dx);

        // Visuals
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
        
        // Physics Body (Approximation for overlap check trigger)
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.radius);
            body.setOffset(-this.radius, -this.radius);
        }
    }

    public update(delta: number): void {
        super.update(delta);
        // Fade out
        if (this.graphics) {
             this.graphics.alpha -= delta / 200; // Fade over lifetime
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
