import { Scene } from 'phaser';

export abstract class BaseProjectile {
    public sprite!: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite;
    public scene: Scene;
    public damage: number;
    public velocityX: number = 0;
    public velocityY: number = 0;
    protected active: boolean = true;

    constructor(scene: Scene, damage: number) {
        this.scene = scene;
        this.damage = damage;
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        // Basic movement
        this.sprite.x += this.velocityX * deltaTime;
        this.sprite.y += this.velocityY * deltaTime;
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite) {
            this.sprite.destroy();
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
}
