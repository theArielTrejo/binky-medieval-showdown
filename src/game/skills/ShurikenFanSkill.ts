import { Scene } from 'phaser';
import { SkillObject } from './SkillObject';
import { Shuriken } from '../objects/Shuriken';

export class ShurikenFanSkill extends SkillObject {
    private casterX: number;
    private casterY: number;
    private targetX: number;
    private targetY: number;
    private shurikenGroup: Phaser.Physics.Arcade.Group; // Reference to pool
    private count: number = 3;
    private spread: number = Math.PI / 6; // 30 degrees

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, shurikenGroup: Phaser.Physics.Arcade.Group) {
        super(scene, 15); // Damage 15 per shuriken
        this.casterX = x;
        this.casterY = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.shurikenGroup = shurikenGroup;

        this.anticipationDuration = 50; // Very fast
        this.activeDuration = 100; // Instant launch
        this.recoveryDuration = 200;
    }

    protected onActiveStart(): void {
        const baseAngle = Phaser.Math.Angle.Between(this.casterX, this.casterY, this.targetX, this.targetY);
        const startAngle = baseAngle - this.spread / 2;
        const step = this.spread / (this.count - 1);

        for (let i = 0; i < this.count; i++) {
            const angle = startAngle + step * i;
            
            // Get from pool
            let shuriken = this.shurikenGroup.get() as Shuriken;
            
            if (!shuriken) {
                 // Pool empty or max size reached, force create or ignore
                 // If group runChildUpdate is true, get() creates if maxSize not hit
                 return;
            }

            // If newly created by get(), it might not be fully init if we didn't use a custom class in factory
            // But we passed classType: Shuriken to group config in PlayerSkillSystem hopefully.
            
            if (shuriken) {
                shuriken.fire(this.casterX, this.casterY, angle, 600, this.damage);
            }
        }
    }

    protected onRecoveryStart(): void {
        // Nothing to cleanup, shurikens handle themselves
    }

    public update(_deltaTime: number): void {
        super.update(_deltaTime);
    }

    public destroy(): void {
        // Shurikens are managed by pool, we just destroy this logic controller
    }
}
