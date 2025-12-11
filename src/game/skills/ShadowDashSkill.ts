import { Skill } from './Skill';
import { Player } from '../Player';
import { ShadowDashObject } from './objects/ShadowDashObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';
import { PlayerState } from '../types/PlayerTypes';

export class ShadowDashSkill extends Skill {
    constructor() {
        super(2000);
    }

    activate(player: Player): void {
        const targetPos = player.inputManager.getPointerWorldPosition();
        const duration = 200;
        
        // Instantiate directly - damage scales with player stats
        const dash = new ShadowDashObject(
            player.scene, 
            player.sprite.x, 
            player.sprite.y, 
            player.sprite, 
            targetPos.x, 
            targetPos.y,
            Math.floor(player.archetype.stats.damage * 1.5), // 1.5x player damage
            duration
        );
        
        // Register Collision
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();
        
        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                dash, 
                enemySystem.enemiesGroup, 
                (obj1, obj2) => {
                    const skill = obj1 as ShadowDashObject;
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

        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);

        // Reset player state after dash duration
        player.scene.time.delayedCall(duration, () => {
            player.stateMachine.transition(PlayerState.IDLE);
        });
    }
}
