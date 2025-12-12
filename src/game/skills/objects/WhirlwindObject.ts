import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Enemy } from '../../systems/EnemySystem';

export class WhirlwindObject extends SkillObject {
    private playerSprite: Phaser.Physics.Arcade.Sprite;
    private radius: number = 100;
    private tickRate: number = 250;
    private lastTickTime: Map<number, number> = new Map();
    private rotationSpeed: number = 14; // Faster spin
    private currentAngle: number = 0;
    
    // Visual elements
    private swordSprite!: Phaser.GameObjects.Sprite;
    
    // Orbit settings
    private swordOrbitRadius: number = 35; // Smaller radius
    private updateTimer: Phaser.Time.TimerEvent;
    private dustTimer: Phaser.Time.TimerEvent;

    constructor(scene: Scene, playerSprite: Phaser.Physics.Arcade.Sprite, damage: number, duration: number = 3000) {
        super(scene, playerSprite.x, playerSprite.y, damage, duration);
        this.playerSprite = playerSprite;
        
        // Create sword sprite that orbits around
        this.swordSprite = scene.add.sprite(playerSprite.x + this.swordOrbitRadius, playerSprite.y, 'pixel-sword');
        this.swordSprite.setScale(0.045); // Smaller sword
        this.swordSprite.setOrigin(0.5, 0.9);
        this.swordSprite.setDepth(1001);
        
        // Add a subtle circular indicator for damage area
        const graphics = scene.add.graphics();
        graphics.lineStyle(2, 0xaaaaaa, 0.15);
        graphics.strokeCircle(0, 0, this.radius);
        this.add(graphics);
        
        // Physics Body
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.setCircle(this.radius);
            body.setOffset(-this.radius, -this.radius);
        }
        
        // Timer for smooth visual updates
        this.updateTimer = scene.time.addEvent({
            delay: 16,
            callback: this.updateVisuals,
            callbackScope: this,
            loop: true
        });
        
        // Timer for spawning dust particles
        this.dustTimer = scene.time.addEvent({
            delay: 30, // Spawn dust frequently
            callback: this.spawnDust,
            callbackScope: this,
            loop: true
        });
    }

    private spawnDust(): void {
        if (!this.active || !this.playerSprite.active) return;
        
        const centerX = this.playerSprite.x;
        const centerY = this.playerSprite.y;
        
        // Spawn dust at sword tip position
        const dustX = centerX + Math.cos(this.currentAngle) * this.swordOrbitRadius;
        const dustY = centerY + Math.sin(this.currentAngle) * this.swordOrbitRadius;
        
        // Create multiple dust particles for more visibility
        const numParticles = 2;
        for (let i = 0; i < numParticles; i++) {
            // Larger, brighter dust particles
            const size = Phaser.Math.Between(4, 7);
            const colors = [0xd4c4a8, 0xe8dcc8, 0xffeedd, 0xccb090];
            const color = Phaser.Math.RND.pick(colors);
            
            const dust = this.scene.add.circle(
                dustX + Phaser.Math.Between(-3, 3), 
                dustY + Phaser.Math.Between(-3, 3), 
                size, 
                color, 
                0.85
            );
            dust.setDepth(999);
            
            // Random outward velocity - faster and more spread
            const outwardAngle = this.currentAngle + Phaser.Math.FloatBetween(-0.8, 0.8);
            const speed = Phaser.Math.Between(40, 80);
            const vx = Math.cos(outwardAngle) * speed;
            const vy = Math.sin(outwardAngle) * speed;
            
            // Animate dust floating outward and fading
            this.scene.tweens.add({
                targets: dust,
                x: dustX + vx,
                y: dustY + vy + Phaser.Math.Between(-15, 15),
                alpha: 0,
                scale: 0.2,
                duration: Phaser.Math.Between(400, 700),
                ease: 'Quad.easeOut',
                onComplete: () => dust.destroy()
            });
        }
    }

    private updateVisuals(): void {
        if (!this.active || !this.playerSprite.active) return;
        
        const centerX = this.playerSprite.x;
        const centerY = this.playerSprite.y;
        
        // Update container position
        this.setPosition(centerX, centerY);
        
        // Increment angle for orbit (faster spin)
        this.currentAngle += this.rotationSpeed * 0.016;
        
        // Position sword on orbit
        const swordX = centerX + Math.cos(this.currentAngle) * this.swordOrbitRadius;
        const swordY = centerY + Math.sin(this.currentAngle) * this.swordOrbitRadius;
        this.swordSprite.setPosition(swordX, swordY);
        
        // Rotate sword to point along the orbit direction (tangent)
        const tangentAngle = this.currentAngle + Math.PI / 2;
        this.swordSprite.setRotation(tangentAngle);
    }

    public update(_deltaTime: number): void {
        // Visual updates handled by timer
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
            
            // Slash hit effect
            const vfx = this.scene.add.star(enemy.sprite.x, enemy.sprite.y, 4, 4, 8, 0xcccccc);
            this.scene.tweens.add({
                targets: vfx,
                scale: 1.5,
                alpha: 0,
                duration: 200,
                onComplete: () => vfx.destroy()
            });
        }
    }

    destroy(fromScene?: boolean): void {
        if (this.updateTimer) {
            this.updateTimer.destroy();
        }
        if (this.dustTimer) {
            this.dustTimer.destroy();
        }
        if (this.swordSprite) {
            this.swordSprite.destroy();
        }
        super.destroy(fromScene);
    }
}
