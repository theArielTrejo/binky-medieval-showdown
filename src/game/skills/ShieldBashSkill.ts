import { Skill } from './Skill';
import { Player } from '../Player';
import { ShieldBashObject } from './objects/ShieldBashObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';
import { PlayerState } from '../types/PlayerTypes';

export class ShieldBashSkill extends Skill {
    constructor() {
        super(3000);
    }

    activate(player: Player): void {
        const facing = player.inputManager.getMovementVector();
        if (facing.lengthSq() === 0) {
             facing.x = player.facingLeft ? -1 : 1;
             facing.y = 0;
        }

        // Delay logic (Anticipation)
        player.scene.time.delayedCall(200, () => {
            // Instantiate directly
            const bash = new ShieldBashObject(
                player.scene, 
                player.sprite.x, 
                player.sprite.y, 
                facing
            );
            
            // Register Collision
            const gameScene = player.scene as Game;
            const enemySystem = gameScene.getEnemySystem();
            
            if (enemySystem && enemySystem.enemiesGroup) {
                player.scene.physics.add.overlap(
                    bash, 
                    enemySystem.enemiesGroup, 
                    (obj1, obj2) => {
                        const skill = obj1 as ShieldBashObject;
                        const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                        
                        // Get the Enemy instance from the sprite
                        const enemy = enemySprite.getData('enemy') as Enemy;
                        const enemyId = enemySprite.getData('enemyId');

                        if (skill && enemy && enemyId) {
                            // Check if already hit this enemy
                            if (skill.hitEnemies.has(enemyId)) return;
                            
                            // Execute Hit Logic
                            skill.onHit(enemy);
                            
                            // Mark as hit
                            skill.hitEnemies.add(enemyId);
                        }
                    }
                );
            }
        });
        
        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);

        // Reset state after anticipation + duration (200 + 200 = 400ms)
        player.scene.time.delayedCall(400, () => {
            player.stateMachine.transition(PlayerState.IDLE);
        });
    }
}
