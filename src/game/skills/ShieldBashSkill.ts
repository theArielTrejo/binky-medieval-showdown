import { Skill } from './Skill';
import { Player } from '../Player';
import { Game } from '../scenes/Game';
import { PlayerState } from '../types/PlayerTypes';

export class ShieldBashSkill extends Skill {
    constructor() {
        super(2500); // 2.5s cooldown
    }

    activate(player: Player): void {
        // Get target position (mouse cursor)
        const targetPos = player.inputManager.getPointerWorldPosition();

        // Calculate charge direction and distance
        const startX = player.sprite.x;
        const startY = player.sprite.y;
        const dx = targetPos.x - startX;
        const dy = targetPos.y - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp charge distance (min 50, max 200)
        const chargeDistance = Math.min(200, Math.max(50, distance));
        const dirX = dx / distance;
        const dirY = dy / distance;

        const endX = startX + dirX * chargeDistance;
        const endY = startY + dirY * chargeDistance;

        const chargeDuration = 250; // ms

        // Calculate the angle for the shield direction
        const dashAngle = Math.atan2(dirY, dirX);

        // Offset distance for shield (closer to player)
        const shieldOffset = 18;

        // Create shield sprite in front of player
        const shieldSprite = player.scene.add.sprite(
            player.sprite.x + dirX * shieldOffset,
            player.sprite.y + dirY * shieldOffset,
            'wood-shield'
        );
        shieldSprite.setScale(0.07, 0.04);
        shieldSprite.setDepth(15);
        shieldSprite.setOrigin(0.5, 0.5);
        
        // Rotate shield to face the dash direction
        shieldSprite.setRotation(dashAngle + Math.PI / 2);

        // Track enemies hit during charge
        const hitEnemies = new Set<number>();

        // Get enemy system for collision checks
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        // Dust particle spawner during dash
        const dustTimer = player.scene.time.addEvent({
            delay: 25,
            callback: () => {
                // Spawn dust behind the shield (opposite to dash direction)
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
                    
                    // Animate dust fading out and drifting back
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

        // Charge tween - moves the player
        player.scene.tweens.add({
            targets: player.sprite,
            x: endX,
            y: endY,
            duration: chargeDuration,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                // Update shield position (stays in front of player)
                shieldSprite.setPosition(
                    player.sprite.x + dirX * shieldOffset,
                    player.sprite.y + dirY * shieldOffset
                );

                // Check for enemy collisions during charge
                if (enemySystem) {
                    const enemies = enemySystem.getEnemies();
                    for (const enemy of enemies) {
                        if (!enemy.sprite.active) continue;

                        const enemyId = enemy.sprite.getData('enemyId');
                        if (hitEnemies.has(enemyId)) continue;

                        // Check distance to enemy
                        const ex = enemy.sprite.x - player.sprite.x;
                        const ey = enemy.sprite.y - player.sprite.y;
                        const distSq = ex * ex + ey * ey;

                        // Hit radius ~60px
                        if (distSq < 60 * 60) {
                            hitEnemies.add(enemyId);

                            // Deal damage (1.5x player damage for charge attack)
                            enemy.takeDamage(Math.floor(player.archetype.stats.damage * 1.5));

                            // Knockback enemy
                            const knockback = new Phaser.Math.Vector2(dirX, dirY).scale(300);
                            const enemyBody = enemy.sprite.body as Phaser.Physics.Arcade.Body;
                            if (enemyBody) {
                                enemyBody.setVelocity(knockback.x, knockback.y);
                            }

                            // Visual feedback
                            player.scene.cameras.main.shake(50, 0.005);
                        }
                    }
                }
            },
            onComplete: () => {
                // Stop dust spawning and destroy shield
                dustTimer.destroy();
                shieldSprite.destroy();

                // Return to idle
                player.stateMachine.transition(PlayerState.IDLE);
            }
        });

        // Start cooldown
        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);
    }
}
