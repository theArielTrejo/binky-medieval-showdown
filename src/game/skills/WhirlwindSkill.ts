import { Scene } from 'phaser';
import { SkillObject } from './SkillObject';
import { Enemy } from '../systems/EnemySystem';

export class WhirlwindSkill extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private radius: number = 100;
    private tickRate: number = 250; // Damage every 250ms
    private lastTickTime: Map<number, number> = new Map(); // EnemyID -> Last Hit Time
    private duration: number = 3000; // 3 seconds

    constructor(scene: Scene, playerSprite: Phaser.Physics.Arcade.Sprite, damage: number) {
        super(scene, damage);
        this.playerSprite = playerSprite;
        
        this.anticipationDuration = 0; // Instant start
        this.activeDuration = this.duration;
        this.recoveryDuration = 200; 
    }

    protected onActiveStart(): void {
        // Visuals: Spinning Circle / Nova
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0x0088ff, 0.3);
        graphics.fillCircle(0, 0, this.radius);
        graphics.lineStyle(2, 0x00ffff, 0.8);
        graphics.strokeCircle(0, 0, this.radius);
        
        this.hitBox = graphics;
        this.scene.physics.add.existing(this.hitBox);
        const body = this.hitBox.body as Phaser.Physics.Arcade.Body;
        body.setCircle(this.radius);
        body.setOffset(-this.radius, -this.radius);
        
        this.updatePosition();
    }

    protected onRecoveryStart(): void {
        if (this.hitBox) {
            this.hitBox.destroy();
            this.hitBox = null;
        }
    }

    protected onActiveUpdate(deltaTime: number): void {
        this.updatePosition();
        
        // Rotation visual effect
        if (this.hitBox) {
            (this.hitBox as Phaser.GameObjects.Graphics).rotation += 10 * deltaTime;
        }
    }
    
    private updatePosition(): void {
        if (this.hitBox && this.playerSprite.active) {
            (this.hitBox as Phaser.GameObjects.Graphics).setPosition(this.playerSprite.x, this.playerSprite.y);
        }
    }

    public applyHit(enemy: Enemy): void {
        const now = this.scene.time.now;
        const enemyId = enemy.sprite.getData('enemyId');
        
        const lastHit = this.lastTickTime.get(enemyId) || 0;
        
        if (now - lastHit >= this.tickRate) {
            enemy.takeDamage(this.damage);
            this.lastTickTime.set(enemyId, now);
            
            // Visual Pop
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

    public destroy(): void {
        if (this.hitBox) this.hitBox.destroy();
    }
}
