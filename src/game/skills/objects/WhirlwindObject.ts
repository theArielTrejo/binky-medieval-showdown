import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class WhirlwindObject extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private radius: number = 100;
    private tickRate: number = 250;
    private lastTickTime: Map<number, number> = new Map();
    private rotationSpeed: number = 10;

    constructor(scene: Scene, playerSprite: Phaser.Physics.Arcade.Sprite, damage: number, duration: number = 3000) {
        super(scene, playerSprite.x, playerSprite.y, damage, duration);
        this.playerSprite = playerSprite;
        
        // Visuals
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x0088ff, 0.3);
        graphics.fillCircle(0, 0, this.radius);
        graphics.lineStyle(2, 0x00ffff, 0.8);
        graphics.strokeCircle(0, 0, this.radius);
        this.add(graphics);
        
        // Physics Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.radius);
            body.setOffset(-this.radius, -this.radius);
        }
    }

    public update(deltaTime: number): void {
        // Sync position with player
        if (this.playerSprite.active) {
            this.setPosition(this.playerSprite.x, this.playerSprite.y);
        }
        
        // Rotation
        this.rotation += this.rotationSpeed * deltaTime;
    }

    public onHit(target: any): void {
         const enemy = target as Enemy;
         if (enemy) this.applyHit(enemy);
    }

    public applyHit(enemy: Enemy): void {
        const now = this.scene.time.now;
        const enemyId = enemy.sprite.getData('enemyId');
        if (!enemyId) return;
        
        const lastHit = this.lastTickTime.get(enemyId) || 0;
        
        if (now - lastHit >= this.tickRate) {
            enemy.takeDamage(this.damage);
            this.lastTickTime.set(enemyId, now);
            
            const vfx = this.scene.add.star(enemy.sprite.x, enemy.sprite.y, 4, 4, 8, 0x00ffff);
            this.scene.tweens.add({
                targets: vfx,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => vfx.destroy()
            });
        }
    }
}