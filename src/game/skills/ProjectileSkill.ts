import { Skill } from './Skill';
import { Player } from '../Player';
import { ProjectileObject } from './objects/ProjectileObject';
import { Game } from '../scenes/Game';
import { BaseEnemy as Enemy } from '../enemies/BaseEnemy';

export class ProjectileSkill extends Skill {
    constructor() {
        super(800); 
    }
    activate(player: Player): void {
        const worldPoint = player.inputManager.getPointerWorldPosition();
        
        const proj = new ProjectileObject(
            player.scene,
            player.sprite.x,
            player.sprite.y,
            worldPoint.x,
            worldPoint.y,
            player.archetype.stats.damage,
            400,
            {
                pierce: 0
            }
        );

        // Register Collision
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();
        
        if (enemySystem && enemySystem.enemiesGroup) {
            player.scene.physics.add.overlap(
                proj, 
                enemySystem.enemiesGroup, 
                (obj1, obj2) => {
                    const skill = obj1 as ProjectileObject;
                    const enemySprite = obj2 as Phaser.GameObjects.Sprite;
                    const enemy = enemySprite.getData('enemy') as Enemy;
                    const enemyId = enemySprite.getData('enemyId');

                    if (skill && enemy && enemyId) {
                        if (skill.hitEnemies.has(enemyId)) return;
                        skill.onHit(enemy);
                        // Note: hitEnemies add is handled in onHit if needed, or here?
                        // ProjectileObject uses custom pierce logic, so we check here.
                        skill.hitEnemies.add(enemyId);
                    }
                }
            );
        }
        
        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}
