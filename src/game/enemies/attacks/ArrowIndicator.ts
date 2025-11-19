import { Scene } from 'phaser';

/**
 * Arrow indicator - shows the damage zone before the arrow is fired
 */
export class ArrowIndicator {
    public sprite: Phaser.GameObjects.Graphics;
    public scene: Scene;
    private active: boolean = true;
    private flashTimer: number = 0;
    private flashInterval: number = 0.2; // Flash every 0.2 seconds (slower for visibility)
    private visible: boolean = true;
    private startX: number;
    private startY: number;
    private endX: number;
    private endY: number;
    private width: number = 25; // Width of the indicator rectangle

    constructor(scene: Scene, startX: number, startY: number, endX: number, endY: number) {
        this.scene = scene;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        
        // Create the indicator graphic
        this.sprite = scene.add.graphics();
        this.sprite.setDepth(100); // Very high depth to ensure visibility above everything
        this.draw();
    }

    private draw(): void {
        if (!this.active) return;
        
        this.sprite.clear();
        
        if (this.visible) {
            // Calculate the rectangle vertices
            const dx = this.endX - this.startX;
            const dy = this.endY - this.startY;
            const angle = Math.atan2(dy, dx);
            
            // Calculate perpendicular offset for width
            const perpX = -Math.sin(angle) * (this.width / 2);
            const perpY = Math.cos(angle) * (this.width / 2);
            
            // Define the four corners of the rectangle from archer to endpoint
            const x1 = this.startX + perpX;
            const y1 = this.startY + perpY;
            const x2 = this.startX - perpX;
            const y2 = this.startY - perpY;
            const x3 = this.endX - perpX;
            const y3 = this.endY - perpY;
            const x4 = this.endX + perpX;
            const y4 = this.endY + perpY;
            
            // Draw the rectangle with translucent red
            this.sprite.fillStyle(0xff0000, 0.2); // Translucent red
            this.sprite.beginPath();
            this.sprite.moveTo(x1, y1);
            this.sprite.lineTo(x2, y2);
            this.sprite.lineTo(x3, y3);
            this.sprite.lineTo(x4, y4);
            this.sprite.closePath();
            this.sprite.fillPath();
        }
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        
        this.flashTimer += deltaTime;
        
        // Flash the indicator
        if (this.flashTimer >= this.flashInterval) {
            this.flashTimer = 0;
            this.visible = !this.visible;
            this.draw();
        }
    }

    public destroy(): void {
        this.active = false;
        if (this.sprite && this.sprite.scene) {
            this.sprite.destroy();
        }
    }

    public isActive(): boolean {
        return this.active;
    }
}
