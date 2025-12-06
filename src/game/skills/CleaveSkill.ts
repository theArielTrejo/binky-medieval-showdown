import { Skill } from './Skill';
import { Player } from '../Player';
import { CleaveObject } from './objects/CleaveObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';

export class CleaveSkill extends Skill {
    constructor() {
        super(1000);
    }
    activate(player: Player): void {
        const pointer = player.scene.input.activePointer;
        const worldPoint = player.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

        const unlocked = player.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();
        let lifesteal = 0;
        let isSundering = !!unlocked.get("Sunder");
        let isExecution = !!unlocked.get("Execution");
        if (unlocked.get("Lifesteal")) lifesteal = 0.05;

        const cleave = new CleaveObject(
            player.scene,
            player.sprite.x,
            player.sprite.y,
            worldPoint.x,
            worldPoint.y,
            player.archetype.stats.damage,
            player.archetype.stats.attackRange,
            {
                lifesteal,
                sunder: isSundering,
                execution: isExecution,
                isWide: !!unlocked.get("Cleave") // Cleave skill enables wide arc
            }
        );

        // Register Collision
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                cleave,
                enemySystem.enemiesGroup,
                (obj1, obj2) => {
                    const skill = obj1 as CleaveObject;
                    const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                    const enemy = enemySprite.getData('enemy') as Enemy;
                    const enemyId = enemySprite.getData('enemyId');

                    if (skill && enemy && enemyId) {
                        if (skill.hitEnemies.has(enemyId)) return;
                        skill.onHit(enemy);
                        skill.hitEnemies.add(enemyId);
                    }
                }
            );
        }

        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}
