import { Scene } from 'phaser';
import { BaseEnemy } from '../BaseEnemy';
import { EnemyType, EnemyStats, EnemyAttackResult } from '../../types/EnemyTypes';
import { LightningStrikeAttack } from '../attacks/LightningStrikeAttack';

export class LightningMageEnemy extends BaseEnemy {
    private lightningCooldown: number = 0;
    private readonly lightningInterval: number = 3.0;
    private readonly optimalRange: number = 320; // Preferred casting distance (reduced to fit in camera view)
    private readonly minRange: number = 180; // Minimum distance to maintain

    // Slashing animation state
    private lightningMageIsSlashing: boolean = false;
    private lightningMageSlashTimer: number = 0;
    private readonly lightningMageSlashDuration: number = 0.75; // Duration of slashing animation (12 frames at 16fps)
    private lightningMageStrikeSpawned: boolean = false; // Track if lightning strike has been spawned this cycle
    
    // Store target position for delayed lightning spawn
    private targetPlayerX: number = 0;
    private targetPlayerY: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, EnemyType.LIGHTNING_MAGE);
    }

    protected getStats(): EnemyStats {
        // Stats from ENEMY_TYPES_DESIGN.md
        const baseStats = {
            health: 70,      // Medium health - ranged caster
            speed: 40,       // Slow - prefers to keep distance
            damage: 35,      // High AOE damage
            size: 35,
            xpValue: 22      // Good XP for artillery role
        };
        const specialAbilities = ['lightning_strike', 'aoe_damage', 'ranged_caster', 'immobilize_during_cast'];
        
        return {
            ...baseStats,
            cost: BaseEnemy.calculateEnemyCost(baseStats, specialAbilities),
            threatLevel: BaseEnemy.calculateThreatLevel(baseStats, specialAbilities),
            specialAbilities
        };
    }

    public update(playerX: number, playerY: number, deltaTime: number): EnemyAttackResult | null {
        if (this.lightningCooldown > 0) this.lightningCooldown -= deltaTime;

        const dx = playerX - this.sprite.x;
        const dy = playerY - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const inCameraView = this.isInCameraView();
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        // Always stop velocity at the start of the update, then apply if needed
        if (body) body.setVelocity(0, 0);

        // State 1: Currently in slashing animation (highest priority)
        if (this.lightningMageIsSlashing) {
            this.lightningMageSlashTimer += deltaTime;
            
            // Spawn lightning strike partway through animation (around 50%)
            if (!this.lightningMageStrikeSpawned && this.lightningMageSlashTimer >= this.lightningMageSlashDuration * 0.5) {
                this.lightningMageStrikeSpawned = true;
                const lightningStrike = new LightningStrikeAttack(this.scene, this.targetPlayerX, this.targetPlayerY, this.stats.damage);
                return { 
                    type: 'lightning', 
                    damage: this.stats.damage, 
                    position: { x: this.targetPlayerX, y: this.targetPlayerY }, 
                    hitPlayer: false, 
                    attackObject: lightningStrike 
                };
            }
            
            // Wait for full animation to complete before allowing other actions
            if (this.lightningMageSlashTimer >= this.lightningMageSlashDuration) {
                this.lightningMageIsSlashing = false;
                this.lightningMageSlashTimer = 0;
                this.isAttacking = false;
                this.lightningMageStrikeSpawned = false;
                // Force transition to idle
                if (this.scene.anims.exists(this.mobAnimations.idle)) {
                    this.sprite.play(this.mobAnimations.idle, true);
                    this.currentAnimation = this.mobAnimations.idle;
                }
            }
            return null; // Don't do anything else while slashing
        }

        // State 2: Attack if in camera view and cooldown ready
        if (inCameraView && this.lightningCooldown <= 0) {
            this.lightningCooldown = this.lightningInterval;
            this.isAttacking = true;
            this.lightningMageIsSlashing = true;
            this.lightningMageSlashTimer = 0;
            this.lightningMageStrikeSpawned = false;
            // Store target position for when lightning spawns
            this.targetPlayerX = playerX;
            this.targetPlayerY = playerY;
            // Play the slashing animation
            if (this.scene.anims.exists('lightning_mage_slashing')) {
                this.sprite.play('lightning_mage_slashing', true);
                this.currentAnimation = 'lightning_mage_slashing';
            }
            return null; // Attack initiated, return
        }

        // Facing - only update when not attacking
        if (!this.isAttacking) {
            const flipDeadzone = 20;
            if (Math.abs(dx) > flipDeadzone) {
                const shouldFaceLeft = dx < 0;
                if (shouldFaceLeft !== this.facingLeft) {
                    this.facingLeft = shouldFaceLeft;
                    this.sprite.setFlipX(this.facingLeft);
                }
            }
        }

        // State 3: Movement - Approach if not in camera view or too far
        if (!inCameraView || distance > this.optimalRange) {
            const velocityX = (dx / distance) * this.stats.speed;
            const velocityY = (dy / distance) * this.stats.speed;
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 4: Movement - Back away if player is too close
        if (distance < this.minRange) {
            const velocityX = -(dx / distance) * (this.stats.speed * 0.7);
            const velocityY = -(dy / distance) * (this.stats.speed * 0.7);
            if (body) body.setVelocity(velocityX, velocityY);
            this.playAnimation(this.mobAnimations.walk);
            return null;
        }

        // State 5: Default - In camera view, good range, waiting for cooldown - stay idle
        this.playAnimation(this.mobAnimations.idle);
        return null;
    }
}
