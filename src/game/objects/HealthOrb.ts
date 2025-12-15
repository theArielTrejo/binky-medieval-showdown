import { Scene } from 'phaser';

export class HealthOrb extends Phaser.Physics.Arcade.Sprite {
    public healValue: number = 0;
    private creationTime: number = 0;
    private lifetime: number = 15000; // 15 seconds
    private isCollected: boolean = false;
    private pulseTimer: number = 0;
    private heartGraphics: Phaser.GameObjects.Graphics;
    
    // Magnet behavior properties
    private isMagnetized: boolean = false;
    private targetX: number = 0;
    private targetY: number = 0;
    private magnetSpeed: number = 0;
    private velocityX: number = 0;
    private velocityY: number = 0;
    
    constructor(scene: Scene, x: number, y: number) {
        // Use a transparent texture as base
        super(scene, x, y, '__WHITE');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Make the sprite itself invisible - we'll draw a heart
        this.setAlpha(0);
        this.setDepth(10);
        
        // Create heart graphics
        this.heartGraphics = scene.add.graphics();
        this.heartGraphics.setDepth(10);
        this.drawHeart(x, y, 1);
    }
    
    private drawHeart(x: number, y: number, scale: number): void {
        this.heartGraphics.clear();
        
        const size = 8 * scale;
        
        // Glow effect
        this.heartGraphics.fillStyle(0xff6666, 0.3);
        this.drawHeartShape(x, y, size * 1.4);
        
        // Main heart
        this.heartGraphics.fillStyle(0xff3333, 1);
        this.drawHeartShape(x, y, size);
        
        // Highlight
        this.heartGraphics.fillStyle(0xff8888, 0.8);
        this.drawHeartShape(x - size * 0.15, y - size * 0.15, size * 0.4);
    }
    
    private drawHeartShape(x: number, y: number, size: number): void {
        // Draw a heart using bezier curves approximated with arcs and triangles
        const halfSize = size / 2;
        
        // Left bump
        this.heartGraphics.fillCircle(x - halfSize * 0.5, y - halfSize * 0.3, halfSize * 0.55);
        // Right bump
        this.heartGraphics.fillCircle(x + halfSize * 0.5, y - halfSize * 0.3, halfSize * 0.55);
        // Bottom triangle
        this.heartGraphics.fillTriangle(
            x - size * 0.55, y,
            x + size * 0.55, y,
            x, y + size * 0.8
        );
    }

    public launch(x: number, y: number, healValue: number): void {
        this.enableBody(true, x, y, true, true);
        
        this.healValue = healValue;
        this.creationTime = this.scene.time.now;
        this.isCollected = false;
        
        // Reset magnet state
        this.isMagnetized = false;
        this.magnetSpeed = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Spawn animation
        this.setScale(0);
        this.scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 200,
            ease: 'Back.out'
        });
        
        // Draw heart at spawn position
        this.drawHeart(x, y, 1);
    }
    
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        
        if (!this.active) {
            return;
        }

        const age = time - this.creationTime;
        
        // Handle magnet movement
        if (this.isMagnetized && !this.isCollected) {
            this.updateMagnetMovement(delta);
        }

        // Despawn after lifetime if not magnetized
        if (age >= this.lifetime && !this.isMagnetized) {
            this.kill();
            return;
        }
        
        // Update visual effects
        this.updateVisualEffects(delta / 1000, age);
        
        // Update heart position to follow sprite
        this.drawHeart(this.x, this.y, this.scaleX);
    }
    
    private updateVisualEffects(deltaTime: number, age: number): void {
        // Pulse effect
        this.pulseTimer += deltaTime;
        const pulse = 1 + Math.sin(this.pulseTimer * 4) * 0.1;
        this.setScale(pulse);
        
        // Fade effect when near end of lifetime
        const fadeThreshold = this.lifetime * 0.7;
        if (age > fadeThreshold) {
            const fadeProgress = (age - fadeThreshold) / (this.lifetime - fadeThreshold);
            this.heartGraphics.setAlpha(1 - fadeProgress * 0.5);
            
            // Blink in final 2 seconds
            if (age > this.lifetime - 2000) {
                const blink = Math.sin(age * 0.016) > 0;
                this.heartGraphics.setVisible(blink);
            }
        }
    }
    
    public magnetize(targetX: number, targetY: number, speed: number): void {
        this.isMagnetized = true;
        this.targetX = targetX;
        this.targetY = targetY;
        this.magnetSpeed = speed;
    }

    private updateMagnetMovement(delta: number): void {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        
        // Accelerate towards target
        this.magnetSpeed += (delta * 0.5);
        
        this.velocityX = Math.cos(angle) * this.magnetSpeed;
        this.velocityY = Math.sin(angle) * this.magnetSpeed;
        
        this.x += this.velocityX * (delta / 1000);
        this.y += this.velocityY * (delta / 1000);
        
        if (this.body) {
            this.body.reset(this.x, this.y);
        }
    }

    public collect(onComplete: () => void): void {
        if (this.isCollected) return;
        this.isCollected = true;
        
        // Quick collect animation
        this.scene.tweens.add({
            targets: [this, this.heartGraphics],
            scale: 1.5,
            alpha: 0,
            duration: 150,
            onComplete: () => {
                this.kill();
                onComplete();
            }
        });
    }

    public kill(): void {
        this.disableBody(true, true);
        this.heartGraphics.clear();
        this.heartGraphics.setVisible(false);
    }
    
    public destroy(fromScene?: boolean): void {
        if (this.heartGraphics) {
            this.heartGraphics.destroy();
        }
        super.destroy(fromScene);
    }

    public isWithinRange(x: number, y: number, range: number): boolean {
        if (!this.active || this.isCollected) return false;
        return Phaser.Math.Distance.Between(this.x, this.y, x, y) <= range;
    }

    public getHealValue(): number {
        return this.healValue;
    }
    
    public isOrbCollected(): boolean {
        return this.isCollected;
    }
}

