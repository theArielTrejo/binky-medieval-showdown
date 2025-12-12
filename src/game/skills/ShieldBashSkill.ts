import { Skill } from './Skill';
import { Player } from '../Player';
import { Game } from '../scenes/Game';
import { PlayerState } from '../types/PlayerTypes';

export class ShieldBashSkill extends Skill {
    constructor() {
        super(2500); // 2.5s cooldown
    }

    activate(player: Player): void {
        const targetPos = player.inputManager.getPointerWorldPosition();

        const startX = player.sprite.x;
        const startY = player.sprite.y;
        const dx = targetPos.x - startX;
        const dy = targetPos.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const chargeDistance = Math.min(200, Math.max(50, distance));
        const dirX = dx / distance;
        const dirY = dy / distance;

        let endX = startX + dirX * chargeDistance;
        let endY = startY + dirY * chargeDistance;

        const gameScene = player.scene as Game;
        const physicsSystem = gameScene.getPhysicsSystem?.();
        const padding = 20;

        if (physicsSystem) {
            const bounds = physicsSystem.getWorldBounds();
            endX = Phaser.Math.Clamp(endX, bounds.x + padding, bounds.right - padding);
            endY = Phaser.Math.Clamp(endY, bounds.y + padding, bounds.bottom - padding);

            const collisionPoint = physicsSystem.getLineCollisionPoint(startX, startY, endX, endY, padding);
            if (collisionPoint) {
                endX = collisionPoint.x;
                endY = collisionPoint.y;
            }
        }

        const chargeDuration = 250;
        const dashAngle = Math.atan2(dirY, dirX);
        const shieldOffset = 18;

        const shieldSprite = player.scene.add.sprite(
            player.sprite.x + dirX * shieldOffset,
            player.sprite.y + dirY * shieldOffset,
            'wood-shield'
        );
        shieldSprite.setScale(0.07, 0.04);
        shieldSprite.setDepth(15);
        shieldSprite.setOrigin(0.5, 0.5);

        shieldSprite.setRotation(dashAngle + Math.PI / 2);

        const hitEnemies = new Set<number>();
        const enemySystem = gameScene.getEnemySystem();

        const dustTimer = player.scene.time.addEvent({
            delay: 25,
            callback: () => {
                const behindX = player.sprite.x - dirX * 10;
                const behindY = player.sprite.y - dirY * 10;

                for (let i = 0; i < 2; i++) {
                    const offsetX = Phaser.Math.Between(-15, 15);
                    const offsetY = Phaser.Math.Between(-15, 15);
                    const size = Phaser.Math.Between(3, 6);
                    const colors = [0xd4c4a8, 0xc9b896, 0xb8a080, 0xa89070];
                    const color = Phaser.Math.RND.pick(colors);

                    const dust = player.scene.add.circle(
                        behindX + offsetX,
                        behindY + offsetY,
                        size,
                        color,
                        0.7
                    );
                    dust.setDepth(14);

                    player.scene.tweens.add({
                        targets: dust,
                        x: dust.x - dirX * 20,
                        y: dust.y - dirY * 20,
                        alpha: 0,
                        scale: 0.3,
                        duration: 300,
                        ease: 'Quad.easeOut',
                        onComplete: () => dust.destroy()
                    });
                }
            },
            loop: true
        });

        player.scene.tweens.add({
            targets: player.sprite,
            x: endX,
            y: endY,
            duration: chargeDuration,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                shieldSprite.setPosition(
                    player.sprite.x + dirX * shieldOffset,
                    player.sprite.y + dirY * shieldOffset
                );

                if (enemySystem) {
                    const enemies = enemySystem.getEnemies();
                    for (const enemy of enemies) {
                        if (!enemy.sprite.active) continue;

                        const enemyId = enemy.sprite.getData('enemyId');
                        if (hitEnemies.has(enemyId)) continue;

                        const ex = enemy.sprite.x - player.sprite.x;
                        const ey = enemy.sprite.y - player.sprite.y;
                        const distSq = ex * ex + ey * ey;

                        if (distSq < 60 * 60) {
                            hitEnemies.add(enemyId);

                            enemy.takeDamage(Math.floor(player.archetype.stats.damage * 1.5));

                            const knockback = new Phaser.Math.Vector2(dirX, dirY).scale(300);
                            const enemyBody = enemy.sprite.body as Phaser.Physics.Arcade.Body;
                            if (enemyBody) {
                                enemyBody.setVelocity(knockback.x, knockback.y);
                            }

                            player.scene.cameras.main.shake(50, 0.005);
                        }
                    }
                }
            },
            onComplete: () => {
                dustTimer.destroy();
                shieldSprite.destroy();
                player.stateMachine.transition(PlayerState.IDLE);
            }
        });

        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);
    }
}
