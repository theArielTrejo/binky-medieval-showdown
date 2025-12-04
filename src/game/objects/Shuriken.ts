import { Scene } from 'phaser';

export class Shuriken extends Phaser.Physics.Arcade.Sprite {
    private damage: number = 10;
    private lifeTime: number = 2000;
    private lifeTimer: number = 0;
    public hitEnemies: Set<number> = new Set(); // Track enemies hit

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'shuriken'); // Assuming texture key 'shuriken' exists, if not we'll handle fallback
    }

    public fire(x: number, y: number, angle: number, speed: number, damage: number): void {
        this.enableBody(true, x, y, true, true);
        this.setActive(true);
        this.setVisible(true);
        this.hitEnemies.clear();
        this.damage = damage;
        this.lifeTimer = 0;

        // Velocity
        this.scene.physics.velocityFromRotation(angle, speed, this.body!.velocity);
        
        // Size
        this.body!.setCircle(10); 
    }

    public update(_time: number, delta: number): void {
        if (!this.active) return;

        this.lifeTimer += delta;
        if (this.lifeTimer >= this.lifeTime) {
            this.disableBody(true, true);
            return;
        }

        // Spin visual
        this.angle += 15;
    }

    public getDamage(): number {
        return this.damage;
    }
}
