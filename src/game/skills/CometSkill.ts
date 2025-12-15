import { Skill } from './Skill';
import { Player } from '../Player';
import { CometObject } from './objects/CometObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';
import { AudioManager } from '../systems/AudioManager';

export class CometSkill extends Skill {
    constructor() {
        super(4000); // 4 second cooldown
    }

    activate(player: Player): void {
        AudioManager.getInstance().playSFX('mage-comet');

        const targetPos = player.inputManager.getPointerWorldPosition();

        // High damage single-target projectile (2x player damage)
        const cometDamage = Math.floor(player.archetype.stats.damage * 2);
        const comet = new CometObject(
            player.scene as Game,
            player.sprite.x,
            player.sprite.y,
            targetPos.x,
            targetPos.y,
            cometDamage
        );

        // Register collision with enemies
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();
        const skillSystem = gameScene.getPlayerSkillSystem();

        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                comet,
                enemySystem.enemiesGroup,
                (obj1, obj2) => {
                    const projectile = obj1 as CometObject;
                    const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                    const enemy = enemySprite.getData('enemy') as Enemy;

                    if (projectile && enemy && projectile.active) {
                        const enemyId = enemySprite.getData('enemyId');
                        if (enemyId && !projectile.hitEnemies.has(enemyId)) {
                            projectile.hitEnemies.add(enemyId);
                            projectile.onHit(enemy);
                        }
                    }
                }
            );
        }

        if (skillSystem) {
            skillSystem.addSkill(comet);
        }

        player.cooldownManager.startCooldown('SPECIAL_SKILL', this.cooldown);
    }
}
