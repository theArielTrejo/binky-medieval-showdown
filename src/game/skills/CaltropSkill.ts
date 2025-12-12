import { Skill } from './Skill';
import { Player } from '../Player';
import { Game } from '../scenes/Game';
import { PlayerState } from '../types/PlayerTypes';

export class CaltropSkill extends Skill {
    private readonly fieldRadius: number = 60; // Area covered by caltrops
    private readonly numCaltrops: number = 16; // More caltrops
    private readonly fieldDuration: number = 6000; // 6 seconds
    private readonly damagePerTick: number = 3; // Damage per tick
    private readonly tickRate: number = 500; // Damage every 0.5 seconds

    constructor() {
        super(8000); // 8 second cooldown
    }

    activate(player: Player): void {
        // Break invisibility when attacking
        if (player.sprite.getData('invisible')) {
            player.sprite.setData('invisible', false);
            player.sprite.setAlpha(1);
            player.sprite.clearTint();
        }

        const gameScene = player.scene as Game;
        const enemySystem = gameScene.getEnemySystem();
        
        // Play attack animation
        player.playAnimation('attack');
        
        // Face towards target
        const targetPos = player.inputManager.getPointerWorldPosition();
        player.facingLeft = targetPos.x < player.sprite.x;
        player.sprite.setFlipX(player.facingLeft);
        
        // Clamp throw distance
        const dx = targetPos.x - player.sprite.x;
        const dy = targetPos.y - player.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxThrowDist = 200;
        
        let fieldX = targetPos.x;
        let fieldY = targetPos.y;
        
        if (dist > maxThrowDist) {
            fieldX = player.sprite.x + (dx / dist) * maxThrowDist;
            fieldY = player.sprite.y + (dy / dist) * maxThrowDist;
        }

        // Create translucent AOE indicator
        const aoeIndicator = player.scene.add.graphics();
        aoeIndicator.fillStyle(0x884422, 0.15); // Very translucent brown
        aoeIndicator.fillEllipse(fieldX, fieldY, this.fieldRadius * 2, this.fieldRadius * 1.2);
        aoeIndicator.lineStyle(1, 0x664422, 0.3);
        aoeIndicator.strokeEllipse(fieldX, fieldY, this.fieldRadius * 2, this.fieldRadius * 1.2);
        aoeIndicator.setDepth(1);

        // Create caltrop sprites scattered in the area
        const caltropSprites: Phaser.GameObjects.Sprite[] = [];
        
        for (let i = 0; i < this.numCaltrops; i++) {
            // Distribute caltrops more evenly in ellipse
            const angle = (i / this.numCaltrops) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
            const radiusMult = Phaser.Math.FloatBetween(0.2, 0.95);
            const offsetX = Math.cos(angle) * this.fieldRadius * radiusMult;
            const offsetY = Math.sin(angle) * this.fieldRadius * 0.6 * radiusMult;
            
            const caltrop = player.scene.add.sprite(
                fieldX + offsetX,
                fieldY + offsetY,
                'caltrop'
            );
            caltrop.setScale(0.02); // Tiny caltrops
            caltrop.setDepth(2);
            caltrop.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
            caltrop.setAlpha(0);
            
            // Animate caltrops appearing (thrown in)
            player.scene.tweens.add({
                targets: caltrop,
                alpha: 1,
                delay: i * 20,
                duration: 100
            });
            
            caltropSprites.push(caltrop);
        }

        // Track enemies in the field and their slow state
        const enemiesInField = new Map<number, { lastDamageTime: number }>();
        
        // Damage/slow tick timer - check every frame for smooth slowing
        const fieldTimer = player.scene.time.addEvent({
            delay: 16, // Check every frame
            callback: () => {
                if (!enemySystem) return;
                
                const enemies = enemySystem.getEnemies();
                const currentTime = player.scene.time.now;
                
                for (const enemy of enemies) {
                    if (!enemy.sprite.active) continue;
                    
                    const enemyId = enemy.sprite.getData('enemyId');
                    if (!enemyId) continue;
                    
                    // Check if enemy is in the caltrop field
                    const ex = enemy.sprite.x - fieldX;
                    const ey = enemy.sprite.y - fieldY;
                    const distToCenter = Math.sqrt(ex * ex + ey * ey);
                    
                    if (distToCenter <= this.fieldRadius) {
                        // Enemy is in the field
                        if (!enemiesInField.has(enemyId)) {
                            enemiesInField.set(enemyId, { lastDamageTime: 0 });
                            // Apply slow tint when entering
                            enemy.sprite.setTint(0x888888);
                        }
                        
                        const enemyData = enemiesInField.get(enemyId)!;
                        
                        // Mark enemy as slowed (enemies check this in getEffectiveSpeed())
                        enemy.sprite.setData('caltropSlowed', true);
                        
                        // Apply damage on tick
                        if (currentTime - enemyData.lastDamageTime >= this.tickRate) {
                            enemy.takeDamage(this.damagePerTick);
                            enemyData.lastDamageTime = currentTime;
                            
                            // Small hit indicator
                            const hitMarker = player.scene.add.circle(
                                enemy.sprite.x,
                                enemy.sprite.y - 10,
                                3,
                                0xff6666,
                                0.8
                            );
                            player.scene.tweens.add({
                                targets: hitMarker,
                                y: hitMarker.y - 15,
                                alpha: 0,
                                duration: 200,
                                onComplete: () => hitMarker.destroy()
                            });
                        }
                    } else {
                        // Enemy left the field
                        if (enemiesInField.has(enemyId)) {
                            enemy.sprite.clearTint();
                            enemy.sprite.setData('caltropSlowed', false);
                            enemiesInField.delete(enemyId);
                        }
                    }
                }
            },
            loop: true
        });

        // Clean up after duration
        player.scene.time.delayedCall(this.fieldDuration, () => {
            // Stop the damage timer
            fieldTimer.destroy();
            
            // Clear slow from all enemies that were in the field
            if (enemySystem) {
                for (const [enemyId] of enemiesInField) {
                    const enemies = enemySystem.getEnemies();
                    for (const enemy of enemies) {
                        if (enemy.sprite.getData('enemyId') === enemyId && enemy.sprite.active) {
                            enemy.sprite.clearTint();
                            enemy.sprite.setData('caltropSlowed', false);
                        }
                    }
                }
            }
            enemiesInField.clear();
            
            // Fade out AOE indicator
            player.scene.tweens.add({
                targets: aoeIndicator,
                alpha: 0,
                duration: 300,
                onComplete: () => aoeIndicator.destroy()
            });
            
            // Fade out and destroy caltrops
            for (const caltrop of caltropSprites) {
                if (caltrop.active) {
                    player.scene.tweens.add({
                        targets: caltrop,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => caltrop.destroy()
                    });
                }
            }
        });

        // Start cooldown
        player.cooldownManager.startCooldown('UTILITY_SKILL', this.cooldown);
        
        // Return to idle
        player.stateMachine.transition(PlayerState.IDLE);
    }
}

