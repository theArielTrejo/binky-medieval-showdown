import { Skill } from './Skill';
import { Player } from '../Player';
import { HammerThrowObject } from './objects/HammerThrowObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';

export class HammerThrowSkill extends Skill {
    constructor() {
        super(4000); // 4 second cooldown
    }

    activate(player: Player): void {
        // Get target position (mouse cursor)
        const targetPos = player.inputManager.getPointerWorldPosition();
        
        // Create hammer projectile with high damage (2x player damage)
        const hammerDamage = Math.floor(player.archetype.stats.damage * 2);
        const hammer = new HammerThrowObject(
            player.scene as Game,
            player.sprite.x,
            player.sprite.y,
            targetPos.x,
            targetPos.y,
            hammerDamage
        );
        
        // Register collision with enemies
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();
        const skillSystem = gameScene.getPlayerSkillSystem();

        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                hammer,
                enemySystem.enemiesGroup,
                (obj1, obj2) => {
                    const projectile = obj1 as HammerThrowObject;
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

        // Add to skill system for tracking
        if (skillSystem) {
            skillSystem.addSkill(hammer);
        }

        // Start cooldown
        player.cooldownManager.startCooldown('UTILITY_SKILL', this.cooldown);
    }
}

