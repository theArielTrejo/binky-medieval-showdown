import { Skill } from './Skill';
import { Player } from '../Player';
import { Shuriken } from '../objects/Shuriken';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';
import { ProjectileOptions } from './objects/BaseProjectile';

export class ShurikenFanSkill extends Skill {
    constructor() {
        super(1000);
    }

    activate(player: Player): void {
        const targetPos = player.inputManager.getPointerWorldPosition();
        const x = player.sprite.x;
        const y = player.sprite.y;

        // Read unlocked skills from registry
        const unlocked = player.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();

        const options: ProjectileOptions = {
            pierce: unlocked.get("Piercing Shots") ? 1 : 0,
            ricochet: !!unlocked.get("Ricochet"),
            freeze: !!unlocked.get("Frost Shot"),
            explosive: !!unlocked.get("Chain Reaction"),
            explosiveOnHit: !!unlocked.get("Explosive Rounds"),
            homing: !!unlocked.get("Homing Shots"),
            distanceBonus: !!unlocked.get("Long Shot"),
        };

        const count = 3;
        const spread = Math.PI / 6;
        const baseAngle = Phaser.Math.Angle.Between(x, y, targetPos.x, targetPos.y);
        const startAngle = baseAngle - spread / 2;
        const step = spread / (count - 1);

        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;

            // Create new Shuriken with options
            const shuriken = new Shuriken(player.scene, x, y, options);
            shuriken.damage = player.archetype.stats.damage;
            shuriken.fireAtAngle(angle);

            // Setup collision for this shuriken
            if (enemySystem && enemySystem.enemiesGroup) {
                player.scene.physics.add.overlap(
                    shuriken,
                    enemySystem.enemiesGroup,
                    (obj1, obj2) => {
                        const proj = obj1 as Shuriken;
                        const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                        const enemy = enemySprite.getData('enemy') as Enemy;
                        const enemyId = enemySprite.getData('enemyId');

                        if (proj && enemy && enemyId) {
                            if (proj.hitEnemies.has(enemyId)) return;
                            proj.onHit(enemy);
                            proj.hitEnemies.add(enemyId);
                        }
                    }
                );
            }
        }

        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}

