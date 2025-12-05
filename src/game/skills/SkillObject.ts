import { Scene } from 'phaser';

export class SkillObject extends Phaser.GameObjects.Container {
    public damage: number;
    public duration: number;
    public hitEnemies: Set<number> = new Set();
    public isProjectile: boolean = false;
    
    constructor(scene: Scene, x: number, y: number, damage: number, duration: number) {
        super(scene, x, y);
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        
        this.damage = damage;
        this.duration = duration;
        
        // Self-destruct if duration is set (and > 0)
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                if (this.active) {
                    this.destroy();
                }
            });
        }
    }
    
    public onHit(_target: any): void {
        // Default behavior: override in subclasses
    }
}