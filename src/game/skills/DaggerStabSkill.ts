import { Skill } from './Skill';
import { Player } from '../Player';
import { Game } from '../scenes/Game';
import { PlayerState } from '../types/PlayerTypes';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { AudioManager } from '../systems/AudioManager';

export class DaggerStabSkill extends Skill {
    private readonly stabRange: number = 45; // Very close range
    private readonly damageMultiplier: number = 3; // High damage (3x player damage)

    constructor() {
        super(3000); // 3 second cooldown
    }

    activate(player: Player): void {
        AudioManager.getInstance().playSFX('ninja-dagger-stab');

        // Break invisibility when attacking
        if (player.sprite.getData('invisible')) {
            player.sprite.setData('invisible', false);
            player.sprite.setAlpha(1);
            player.sprite.clearTint();
        }

        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();

        if (!enemySystem) return;

        // Get direction player is facing (towards cursor)
        const targetPos = player.inputManager.getPointerWorldPosition();
        const dx = targetPos.x - player.sprite.x;
        const dy = targetPos.y - player.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / dist;
        const dirY = dy / dist;
        const stabAngle = Math.atan2(dy, dx);

        // Create dagger sprite for visual (small, close to player)
        const daggerSprite = player.scene.add.sprite(
            player.sprite.x + dirX * 12,
            player.sprite.y + dirY * 12,
            'dagger'
        );
        daggerSprite.setScale(0.025);
        daggerSprite.setDepth(1001);
        daggerSprite.setOrigin(0.5, 0.9); // Pivot from handle
        daggerSprite.setRotation(stabAngle + Math.PI / 2);

        // Stab animation - quick thrust forward
        const stabDistance = 15;
        player.scene.tweens.add({
            targets: daggerSprite,
            x: player.sprite.x + dirX * (12 + stabDistance),
            y: player.sprite.y + dirY * (12 + stabDistance),
            duration: 80,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                daggerSprite.destroy();
            }
        });

        // Calculate damage
        const stabDamage = Math.floor(player.archetype.stats.damage * this.damageMultiplier);

        // Check for enemies in stab range
        let gotKill = false;
        const enemies = enemySystem.getEnemies();

        for (const enemy of enemies) {
            if (!enemy.sprite.active) continue;

            // Check distance to enemy
            const ex = enemy.sprite.x - player.sprite.x;
            const ey = enemy.sprite.y - player.sprite.y;
            const enemyDist = Math.sqrt(ex * ex + ey * ey);

            // Check if enemy is in front of player (within a cone)
            const enemyAngle = Math.atan2(ey, ex);
            const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - stabAngle));

            // Must be very close AND in front (within 60 degree cone)
            if (enemyDist <= this.stabRange && angleDiff < Math.PI / 3) {
                // Deal damage
                const killed = enemy.takeDamage(stabDamage);

                // Blood/hit effect
                this.createHitEffect(player, enemy);

                if (killed) {
                    gotKill = true;
                }

                // Only hit one enemy per stab
                break;
            }
        }

        // Start cooldown - but reset if we got a kill
        if (gotKill) {
            // Reset cooldown on kill!
            player.cooldownManager.startCooldown('SPECIAL_SKILL', 0);

            // Flash effect to indicate reset
            player.sprite.setTint(0xff4444);
            player.scene.time.delayedCall(100, () => {
                player.sprite.clearTint();
            });
        } else {
            player.cooldownManager.startCooldown('SPECIAL_SKILL', this.cooldown);
        }

        // Return to idle
        player.stateMachine.transition(PlayerState.IDLE);
    }

    private createHitEffect(player: Player, enemy: BaseEnemy): void {
        // Blood splatter effect
        for (let i = 0; i < 5; i++) {
            const particle = player.scene.add.circle(
                enemy.sprite.x + Phaser.Math.Between(-10, 10),
                enemy.sprite.y + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(2, 5),
                0xcc0000,
                0.8
            );
            particle.setDepth(1000);

            player.scene.tweens.add({
                targets: particle,
                x: particle.x + Phaser.Math.Between(-30, 30),
                y: particle.y + Phaser.Math.Between(-30, 30),
                alpha: 0,
                scale: 0.2,
                duration: 300,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Camera shake on hit
        player.scene.cameras.main.shake(30, 0.002);
    }
}

