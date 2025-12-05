import { Skill } from './Skill';
import { Player } from '../Player';
import { WhirlwindObject } from './objects/WhirlwindObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';

export class WhirlwindSkill extends Skill {
    constructor() {
        super(5000); // 5 seconds cooldown
    }

    activate(player: Player): void {
        // Instantiate the Whirlwind Object
        const whirlwind = new WhirlwindObject(player.scene as Game, player.sprite, 10);
        
        // Register Collision
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                whirlwind,
                enemySystem.enemiesGroup,
                (obj1, obj2) => {
                    const skill = obj1 as WhirlwindObject;
                    const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                    const enemy = enemySprite.getData('enemy') as Enemy;
                    
                    if (skill && enemy) {
                        // WhirlwindObject typically handles damage interval logic, 
                        // but we trigger onHit here if available.
                        if (skill.onHit) skill.onHit(enemy);
                    }
                }
            );
        }

        player.cooldownManager.startCooldown('SPECIAL_SKILL', this.cooldown);
    }
}
