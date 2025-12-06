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

        // Read unlocked skills from registry
        const unlocked = player.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();

        const hasMultiShot = !!unlocked.get("Multi-Shot");
        const projectileCount = hasMultiShot ? 2 : 1;
        const spreadAngle = hasMultiShot ? 0.15 : 0; // ~8.6 degrees spread

        const baseAngle = Phaser.Math.Angle.Between(
            player.sprite.x, player.sprite.y,
            worldPoint.x, worldPoint.y
        );

        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        for (let i = 0; i < projectileCount; i++) {
            // Calculate spread angle for each projectile
            const angleOffset = hasMultiShot
                ? (i === 0 ? -spreadAngle / 2 : spreadAngle / 2)
                : 0;
            const angle = baseAngle + angleOffset;

            // Calculate target position from angle
            const distance = 500;
            const targetX = player.sprite.x + Math.cos(angle) * distance;
            const targetY = player.sprite.y + Math.sin(angle) * distance;

            const proj = new ProjectileObject(
                player.scene,
                player.sprite.x,
                player.sprite.y,
                targetX,
                targetY,
                player.archetype.stats.damage,
                400,
                {
                    pierce: unlocked.get("Piercing Shots") ? 1 : 0,
                    ricochet: !!unlocked.get("Ricochet"),
                    freeze: !!unlocked.get("Frost Shot"),
                    explosive: !!unlocked.get("Chain Reaction"),
                    explosiveOnHit: !!unlocked.get("Explosive Rounds"),
                    homing: !!unlocked.get("Homing Shots"),
                    distanceBonus: !!unlocked.get("Long Shot"),
                    crit: false
                }
            );

            // Register Collision
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
                            skill.hitEnemies.add(enemyId);
                        }
                    }
                );
            }
        }

        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}

