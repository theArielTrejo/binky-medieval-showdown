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

        // Create holy cross aura centered on player
        const aura = player.scene.add.graphics();

        // Outer golden glow circle
        aura.fillStyle(0xffd700, 0.2);
        aura.fillCircle(0, 0, 50);

        // Holy cross - vertical bar
        aura.fillStyle(0xffffff, 0.8);
        aura.fillRect(-6, -50, 12, 90);

        // Holy cross - horizontal bar
        aura.fillRect(-30, -35, 60, 12);

        // Inner glow on cross
        aura.fillStyle(0xffd700, 0.6);
        aura.fillRect(-4, -48, 8, 86);
        aura.fillRect(-28, -33, 56, 8);

        // Pulsing outer ring
        aura.lineStyle(3, 0xffd700, 0.5);
        aura.strokeCircle(0, 0, 45);

        aura.setPosition(player.sprite.x, player.sprite.y);
        aura.setDepth(15);
        aura.setBlendMode(Phaser.BlendModes.ADD);

        // Track enemies hit during charge
        const hitEnemies = new Set<number>();

        // Get enemy system for collision checks
        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        // Charge tween - moves the player
        player.scene.tweens.add({
            targets: player.sprite,
            x: endX,
            y: endY,
            duration: chargeDuration,
            ease: 'Quad.easeOut',
            onUpdate: () => {
                // Update aura position
                aura.setPosition(player.sprite.x, player.sprite.y);

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

                            // Deal damage
                            enemy.takeDamage(35);

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
                // Destroy aura visual
                aura.destroy();

                // Return to idle
                player.stateMachine.transition(PlayerState.IDLE);
            }
        });

        // Start cooldown
        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);
    }
}
