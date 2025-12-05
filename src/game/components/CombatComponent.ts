import { Player } from '../Player';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { Shield } from '../enemies/attacks/Shield';
import { PassiveManager } from '../systems/PassiveManager';

export class CombatComponent {
    private player: Player;
    private passiveManager: PassiveManager;
    
    public lastDamageTime: number = 0;
    public damageCooldown: number = 1000; // 1 second invincibility frames
    public isInvulnerable: boolean = false;

    constructor(player: Player, passiveManager: PassiveManager) {
        this.player = player;
        this.passiveManager = passiveManager;
    }

    public updateInvulnerability(): void {
        if (this.isInvulnerable && this.player.scene.time.now > this.lastDamageTime + this.damageCooldown) {
            this.isInvulnerable = false;
            this.player.sprite.setAlpha(1);
        }
    }

    public takeDamage(amount: number): void {
        if (this.isInvulnerable) return;
        
        // Apply Passive Damage Reduction
        amount *= this.passiveManager.getDamageMultiplier();

        this.player.archetype.currentHealth -= amount;
        this.lastDamageTime = this.player.scene.time.now;
        this.isInvulnerable = true;
        this.player.sprite.setAlpha(0.5);
        
        // Trigger Passive On-Damage Effects
        this.passiveManager.onTakeDamage(amount);

        if (this.player.archetype.currentHealth <= 0) {
            this.player.sprite.setTint(0xff0000);
            // Handle death callback or event here if needed
        }
        
        this.player.visualComponent.updateHealthBar();
    }

    public heal(amount: number): void {
        const stats = this.player.archetype.stats;
        this.player.archetype.currentHealth = Math.min(this.player.archetype.currentHealth + amount, stats.maxHealth);
        this.player.visualComponent.updateHealthBar();
        
        // Visual heal effect
        this.player.sprite.setTint(0x00ff00);
        this.player.scene.time.delayedCall(200, () => this.player.sprite.clearTint());
    }

    public checkCollisionWithEnemies(enemies: BaseEnemy[], _shields: Shield[]): void {
        if (this.isInvulnerable) return;
        const playerBounds = this.player.sprite.getBounds();

        for (const enemy of enemies) {
            if (!enemy.sprite.active) continue;
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, enemy.sprite.getBounds())) {
                this.takeDamage(enemy.stats.damage);
                if (this.isInvulnerable) return;
            }
        }
    }

    public checkCollisionWithProjectiles(projectiles: any[]): void {
        if (this.isInvulnerable) return;
        const playerBounds = this.player.sprite.getBounds();

        for (const proj of projectiles) {
            if (!proj.isActive()) continue;
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, proj.sprite.getBounds())) {
                this.takeDamage(proj.damage);
                proj.destroy();
                if (this.isInvulnerable) return;
            }
        }
    }

    /**
     * Unified collision check for all hostile attacks (Projectiles and AOE).
     */
    public checkAttacks(attacks: any[]): void {
        if (this.isInvulnerable) return;
        const playerBounds = this.player.sprite.getBounds();

        for (const attack of attacks) {
            if (!attack.isActive()) continue;

            let bounds;
            // Handle BaseProjectile composition (sprite property) vs SkillObject inheritance (Container)
            if (attack.sprite && attack.sprite.getBounds) {
                 bounds = attack.sprite.getBounds();
            } else if (attack.getBounds) {
                 const b = attack.getBounds();
                 bounds = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
            }
            
            if (bounds && Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, bounds)) {
                this.takeDamage(attack.damage);
                
                // Destroy projectiles on hit
                if (attack.isProjectile && attack.destroy) {
                    attack.destroy();
                }

                if (this.isInvulnerable) return;
            }
        }
    }

    public checkCollisionWithAttacks(attacks: any[]): void {
        this.checkGenericAttackCollision(attacks);
    }

    // Generalized method for checking array of attack objects
    public checkGenericAttackCollision(attacks: any[]): void {
        if (this.isInvulnerable) return;
        const playerBounds = this.player.sprite.getBounds();

        for (const attack of attacks) {
            if (!attack.isActive()) continue;

            let bounds;
            if (attack.sprite && attack.sprite.getBounds) {
                 bounds = attack.sprite.getBounds();
            } else if (attack.getBounds) {
                 const b = attack.getBounds();
                 bounds = new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
            }
            
            if (bounds && Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, bounds)) {
                this.takeDamage(attack.damage);
                // Some attacks destroy on hit (arrows), others don't (explosions). 
                // Assuming caller handles destruction or generic attack persists for duration.
                // If it's an arrow projectile, it usually has its own class handling destroy? 
                // But logic in Player.ts for arrow destroyed it. 
                // Let's assume 'destroy' method exists on generic attack if it's a projectile.
                if (attack.destroy && typeof attack.destroy === 'function' && attack.isProjectile) {
                    attack.destroy();
                }

                if (this.isInvulnerable) return;
            }
        }
    }
}
