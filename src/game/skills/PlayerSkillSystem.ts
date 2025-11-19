import { Scene } from 'phaser';
import { EnemySystem } from '../EnemySystem';
import { PlayerProjectile, PlayerCleave, PlayerNova, ProjectileOptions, CleaveOptions, NovaOptions } from './SkillObjects';
import { Player } from '../Player';

export class PlayerSkillSystem {
    private scene: Scene;
    private enemySystem: EnemySystem;
    private player: Player; // Keep reference for Lifesteal/Heal
    
    // Active skill objects
    private projectiles: PlayerProjectile[] = [];
    private cleaves: PlayerCleave[] = [];
    private novas: PlayerNova[] = [];

    // Physics Groups
    private projectileGroup: Phaser.Physics.Arcade.Group;
    private cleaveGroup: Phaser.Physics.Arcade.Group;
    private novaGroup: Phaser.Physics.Arcade.Group;

    constructor(scene: Scene, player: Player, enemySystem: EnemySystem) {
        this.scene = scene;
        this.player = player;
        this.enemySystem = enemySystem;

        this.projectileGroup = this.scene.physics.add.group();
        this.cleaveGroup = this.scene.physics.add.group();
        this.novaGroup = this.scene.physics.add.group();
    }

    public update(deltaTime: number): void {
        const enemies = this.enemySystem.getEnemies();

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // Homing Logic
            if (p.options.homing && p.isActive()) {
                let closestDist = 300; // Detection range for homing
                let targetEnemy = null;
                
                for (const enemy of enemies) {
                    if (!enemy.sprite.active) continue;
                    const dx = enemy.sprite.x - p.sprite.x;
                    const dy = enemy.sprite.y - p.sprite.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    
                    const enemyId = enemy.sprite.getData('enemyId');
                    if (d < closestDist && enemyId && !p.hitEnemies.has(enemyId)) {
                        closestDist = d;
                        targetEnemy = enemy;
                    }
                }

                if (targetEnemy) {
                    const angleToEnemy = Phaser.Math.Angle.Between(p.sprite.x, p.sprite.y, targetEnemy.sprite.x, targetEnemy.sprite.y);
                    const currentAngle = Math.atan2(p.velocityY, p.velocityX);
                    const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, angleToEnemy, 2 * deltaTime); // Turn speed
                    
                    const speed = Math.sqrt(p.velocityX * p.velocityX + p.velocityY * p.velocityY);
                    p.velocityX = Math.cos(newAngle) * speed;
                    p.velocityY = Math.sin(newAngle) * speed;
                    p.sprite.rotation = newAngle;
                }
            }

            p.update(deltaTime);
            if (!p.isActive()) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update Cleaves
        for (let i = this.cleaves.length - 1; i >= 0; i--) {
            const c = this.cleaves[i];
            c.update(deltaTime);
            if (!c.isActive()) {
                this.cleaves.splice(i, 1);
            }
        }

        // Update Novas
        for (let i = this.novas.length - 1; i >= 0; i--) {
            const n = this.novas[i];
            n.update(deltaTime);
            if (!n.isActive()) {
                this.novas.splice(i, 1);
            }
        }

        this.checkCollisions();
    }

    private checkCollisions(): void {
        if (!this.enemySystem.enemiesGroup) return;

        this.scene.physics.overlap(this.projectileGroup, this.enemySystem.enemiesGroup, this.handleProjectileHit, undefined, this);
        this.scene.physics.overlap(this.cleaveGroup, this.enemySystem.enemiesGroup, this.handleCleaveHit, undefined, this);
        this.scene.physics.overlap(this.novaGroup, this.enemySystem.enemiesGroup, this.handleNovaHit, undefined, this);
    }

    private handleProjectileHit(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject): void {
        const projSprite = obj1 as Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const proj = projSprite.getData('wrapper') as PlayerProjectile;
        const enemy = enemySprite.getData('enemy') as any; // Type as any to avoid circular import issues if Enemy type is strictly checked

        if (!proj || !proj.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) {
            console.warn("Enemy missing ID during collision");
            return;
        }

        if (!proj.hitEnemies.has(enemyId)) {
            proj.hitEnemies.add(enemyId);
            
            // Apply Damage
            enemy.takeDamage(proj.damage);
            
            // Apply Effects
            if (proj.options.freeze) {
                enemy.sprite.setTint(0x00ffff);
            }

            if (proj.options.explosive) {
                this.castNova(proj.sprite.x, proj.sprite.y, proj.damage * 0.25, 80);
            }
            
            // Handle Ricochet (Chain)
            if (proj.options.ricochet && !proj.options.homing) { 
                 // Find next target
                 const enemies = this.enemySystem.getEnemies();
                 let closestNext = 400;
                 let nextTarget = null;
                 for (const other of enemies) {
                     const otherId = other.sprite.getData('enemyId');
                     if (other === enemy || !other.sprite.active || !otherId || proj.hitEnemies.has(otherId)) continue;
                     const d = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y);
                     if (d < closestNext) {
                         closestNext = d;
                         nextTarget = other;
                     }
                 }

                 if (nextTarget) {
                     const angle = Phaser.Math.Angle.Between(proj.sprite.x, proj.sprite.y, nextTarget.sprite.x, nextTarget.sprite.y);
                     const speed = 400;
                     proj.velocityX = Math.cos(angle) * speed;
                     proj.velocityY = Math.sin(angle) * speed;
                     proj.sprite.rotation = angle;
                     
                     proj.options.ricochet = false;
                     return; 
                 }
            }

            // Handle Piercing
            if (proj.hitEnemies.size > proj.pierceCount) {
                proj.destroy();
            }
        }
    }

    private handleCleaveHit(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject): void {
        const cleaveSprite = obj1 as Phaser.GameObjects.Graphics;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const cleave = cleaveSprite.getData('wrapper') as PlayerCleave;
        const enemy = enemySprite.getData('enemy') as any;

        if (!cleave || !cleave.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;

        if (cleave.hitEnemies.has(enemyId)) return;

        // Cone Check
        if (cleave.isPointInCone(enemy.sprite.x, enemy.sprite.y)) {
            let dmg = cleave.damage;
            if (cleave.options.execution && enemy.currentHealth < enemy.stats.health * 0.25) {
                dmg *= 2;
                console.log('EXECUTION triggered!');
            }

            enemy.takeDamage(dmg);
            cleave.hitEnemies.add(enemyId);

            if (cleave.options.lifesteal) {
                this.player.heal(dmg * cleave.options.lifesteal);
            }

            if (cleave.options.sunder) {
                enemy.sprite.setTint(0xff0000); 
                enemy.sprite.setData('sunder', true);
            }
        }
    }

    private handleNovaHit(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject): void {
        const novaSprite = obj1 as Phaser.GameObjects.Graphics;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const nova = novaSprite.getData('wrapper') as PlayerNova;
        const enemy = enemySprite.getData('enemy') as any;

        if (!nova || !nova.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;
        
        if (nova.hitEnemies.has(enemyId)) return;

        // Nova is a circle, physics overlap is sufficient, but redundant check doesn't hurt if strictness needed
        // Physics body is already circular.
        enemy.takeDamage(nova.damage);
        nova.hitEnemies.add(enemyId);

        if (nova.options.pull) {
            const angle = Phaser.Math.Angle.Between(enemy.sprite.x, enemy.sprite.y, nova.x, nova.y);
            enemy.sprite.x += Math.cos(angle) * 30;
            enemy.sprite.y += Math.sin(angle) * 30;
        }
        
        if (nova.options.slow) {
             enemy.sprite.setTint(0x00ffff);
        }

        if (nova.options.heal) {
            this.player.heal(enemy.stats.health * nova.options.heal);
        }
    }

    // --- Public API to spawn skills ---

    public castProjectile(x: number, y: number, targetX: number, targetY: number, damage: number, pierce: number = 0, options: ProjectileOptions = {}): void {
        const p = new PlayerProjectile(this.scene, x, y, targetX, targetY, damage, 400, undefined, options);
        p.pierceCount = pierce;
        p.sprite.setData('wrapper', p);
        this.projectiles.push(p);
        this.projectileGroup.add(p.sprite);
    }

    public castCleave(x: number, y: number, targetX: number, targetY: number, damage: number, radius: number = 150, options: CleaveOptions = {}): void {
        // Default narrow angle (stab) if not wide
        const angle = options.isWide ? Math.PI / 2 : Math.PI / 6; 
        const c = new PlayerCleave(this.scene, x, y, targetX, targetY, damage, radius, angle, options);
        c.sprite.setData('wrapper', c);
        this.cleaves.push(c);
        this.cleaveGroup.add(c.sprite);
    }

    public castNova(x: number, y: number, damage: number, radius: number = 120, options: NovaOptions = {}): void {
        const n = new PlayerNova(this.scene, x, y, damage, radius, options);
        n.sprite.setData('wrapper', n);
        this.novas.push(n);
        this.novaGroup.add(n.sprite);
    }

    public clearAll(): void {
        this.projectiles.forEach(p => p.destroy());
        this.cleaves.forEach(c => c.destroy());
        this.novas.forEach(n => n.destroy());
        this.projectiles = [];
        this.cleaves = [];
        this.novas = [];
        this.projectileGroup.clear();
        this.cleaveGroup.clear();
        this.novaGroup.clear();
    }
}

