import { Skill } from './Skill';
import { Player } from '../Player';
import { Shuriken } from '../objects/Shuriken';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';

export class ShurikenFanSkill extends Skill {
    private static shurikenGroup: Phaser.Physics.Arcade.Group;

    constructor() {
        super(1000); 
    }

    activate(player: Player): void {
        // Initialize static group if needed
        if (!ShurikenFanSkill.shurikenGroup || !ShurikenFanSkill.shurikenGroup.scene) {
            ShurikenFanSkill.shurikenGroup = player.scene.physics.add.group({
                classType: Shuriken,
                maxSize: 50,
                runChildUpdate: true
            });
        }

        const targetPos = player.inputManager.getPointerWorldPosition();
        const x = player.sprite.x;
        const y = player.sprite.y;
        const damage = player.archetype.stats.damage;

        const count = 3;
        const spread = Math.PI / 6;
        const baseAngle = Phaser.Math.Angle.Between(x, y, targetPos.x, targetPos.y);
        const startAngle = baseAngle - spread / 2;
        const step = spread / (count - 1);

        // Register Collision (Once per group usually, but safe to call multiple times as Phaser handles it?)
        // Better to register once in Game.ts or here efficiently.
        // Since we don't have a persistent manager, we'll check if collider exists?
        // Or just add it. Adding duplicate colliders is bad.
        // Hack: We'll add it every time but Phaser is robust. 
        // CORRECT APPROACH: The group is static. We should ensure collision is set up.
        // But the SCENE changes on restart.
        // So we must re-create group on scene start?
        // Actually, since Player is recreated, we can just use a local group reference or Scene registry.
        // Let's just use the group we created.
        
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        // Setup collision for this group if not already set (Checking Scene data or similar?)
        // We can use a unique key on the scene to check if collision is active?
        if (enemySystem && !player.scene.data.get('shurikenCollisionActive')) {
             player.scene.physics.add.overlap(
                ShurikenFanSkill.shurikenGroup,
                enemySystem.enemiesGroup,
                (obj1, obj2) => {
                    const shuriken = obj1 as Shuriken;
                    const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                    const enemy = enemySprite.getData('enemy') as Enemy;
                    const enemyId = enemySprite.getData('enemyId');

                    if (shuriken && enemy && enemyId) {
                        if (shuriken.hitEnemies.has(enemyId)) return;
                        
                        enemy.takeDamage(shuriken.getDamage());
                        shuriken.hitEnemies.add(enemyId);
                        shuriken.disableBody(true, true);
                    }
                }
             );
             player.scene.data.set('shurikenCollisionActive', true);
        }

        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;
            const shuriken = ShurikenFanSkill.shurikenGroup.get() as Shuriken;
            if (shuriken) {
                shuriken.setActive(true).setVisible(true);
                // Shuriken.fire expects angle in radians? No, velocityFromRotation takes radians.
                // But Shuriken.ts uses `angle` argument. 
                // Let's check Shuriken.ts... `velocityFromRotation(angle, ...)` -> radians.
                shuriken.fire(x, y, angle, 600, damage);
            }
        }
        
        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}
