import { Scene } from 'phaser';
import { SkillObject } from '../SkillObject';
import { Shuriken } from '../../objects/Shuriken';

export class ShurikenFanObject extends SkillObject {
    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, shurikenGroup: Phaser.Physics.Arcade.Group, damage: number = 15) {
        super(scene, x, y, damage, 100);
        
        const count = 3;
        const spread = Math.PI / 6;
        const baseAngle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
        const startAngle = baseAngle - spread / 2;
        const step = spread / (count - 1);

        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;
            
            // Check if group has get
            if (shurikenGroup) {
                const shuriken = shurikenGroup.get() as Shuriken;
                if (shuriken) {
                    shuriken.setActive(true).setVisible(true);
                    shuriken.fire(x, y, angle, 600, damage);
                }
            }
        }
    }
}