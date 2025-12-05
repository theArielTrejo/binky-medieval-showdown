import { Scene } from 'phaser';
import { EnemySystem } from '../systems/EnemySystem';
import { PlayerProjectile, PlayerCleave, PlayerNova, ProjectileOptions, CleaveOptions, NovaOptions } from './SkillObjects';
import { SkillObject } from './SkillObject';
import { ShieldBashObject } from './objects/ShieldBashObject';
import { ShadowDashObject } from './objects/ShadowDashObject';
import { ShurikenFanObject } from './objects/ShurikenFanObject';
import { WhirlwindObject } from './objects/WhirlwindObject';
import { Shuriken } from '../objects/Shuriken';
import { Player } from '../Player';

export class PlayerSkillSystem {
    private scene: Scene;
    private enemySystem: EnemySystem;
    private player: Player; 
    
    // Active skill objects
    private projectiles: PlayerProjectile[] = [];
    private cleaves: PlayerCleave[] = [];
    private novas: PlayerNova[] = [];
    
    // Generic Skill Objects List
    private skillObjects: SkillObject[] = [];

    // Physics Groups
    private projectileGroup: Phaser.Physics.Arcade.Group;
    private cleaveGroup: Phaser.Physics.Arcade.Group;
    private novaGroup: Phaser.Physics.Arcade.Group;
    public hitboxGroup: Phaser.Physics.Arcade.Group; 
    public shurikenGroup: Phaser.Physics.Arcade.Group; 

    constructor(scene: Scene, player: Player, enemySystem: EnemySystem) {
        this.scene = scene;
        this.player = player;
        this.enemySystem = enemySystem;

        this.projectileGroup = this.scene.physics.add.group();
        this.cleaveGroup = this.scene.physics.add.group();
        this.novaGroup = this.scene.physics.add.group();
        this.hitboxGroup = this.scene.physics.add.group();
        
        this.shurikenGroup = this.scene.physics.add.group({
            classType: Shuriken,
            maxSize: 50,
            runChildUpdate: true
        });
    }

    public update(deltaTime: number): void {
        const enemies = this.enemySystem.getEnemies();

        // Update Generic Skill Objects
        for (let i = this.skillObjects.length - 1; i >= 0; i--) {
            const skill = this.skillObjects[i];
            skill.update(deltaTime);
            // Container destroy sets active=false.
            // We check active.
            if (!skill.active) {
                this.skillObjects.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // Homing Logic
            if (p.options.homing && p.isActive()) {
                let closestDist = 300; 
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
                    const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, angleToEnemy, 2 * deltaTime);
                    
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
        
        // Unified Skill Collision
        this.scene.physics.overlap(this.hitboxGroup, this.enemySystem.enemiesGroup, this.handleSkillHit, undefined, this);
        
        // Shuriken Collision
        this.scene.physics.overlap(this.shurikenGroup, this.enemySystem.enemiesGroup, this.handleShurikenHit, undefined, this);
    }

    private handleShurikenHit(obj1: any, obj2: any): void {
        const shuriken = obj1 as Shuriken;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;
        const enemy = enemySprite.getData('enemy') as any;

        if (!shuriken.active || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;

        if (shuriken.hitEnemies.has(enemyId)) return;

        shuriken.hitEnemies.add(enemyId);
        enemy.takeDamage(shuriken.getDamage());
        shuriken.disableBody(true, true);
    }

    private handleSkillHit(obj1: any, obj2: any): void {
        const hitbox = obj1 as Phaser.GameObjects.GameObject;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        // Find which skill owns this hitbox (The hitbox IS the skill object)
        const skill = this.skillObjects.find(s => s === hitbox);
        const enemy = enemySprite.getData('enemy') as any;

        if (!skill || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;

        if (skill instanceof ShieldBashObject) {
            if (skill.hitEnemies.has(enemyId)) return;
            if (skill.onHit) skill.onHit(enemy); // Helper in ShieldBashObject
            // Or manually:
            // if (!skill.isValidHit(enemy.sprite.x, enemy.sprite.y)) return;
            // skill.applyHit(enemy);
            
            // ShieldBashObject.onHit handles isValidHit check
            skill.hitEnemies.add(enemyId);
            
        } else if (skill instanceof ShadowDashObject) {
            if (skill.hitEnemies.has(enemyId)) return;
            if (skill.onHit) skill.onHit(enemy);
            skill.hitEnemies.add(enemyId);
            
        } else if (skill instanceof WhirlwindObject) {
            if (skill.onHit) skill.onHit(enemy); 
        }
    }

    private handleProjectileHit(obj1: any, obj2: any): void {
        const projSprite = obj1 as Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const proj = projSprite.getData('wrapper') as PlayerProjectile;
        const enemy = enemySprite.getData('enemy') as any;

        if (!proj || !proj.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;

        if (!proj.hitEnemies.has(enemyId)) {
            proj.hitEnemies.add(enemyId);
            enemy.takeDamage(proj.damage);
            
            if (proj.options.freeze) {
                enemy.sprite.setTint(0x00ffff);
            }

            if (proj.options.explosive) {
                this.castNova(proj.sprite.x, proj.sprite.y, proj.damage * 0.25, 80);
            }
            
            if (proj.options.ricochet && !proj.options.homing) { 
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

            if (proj.hitEnemies.size > proj.pierceCount) {
                proj.destroy();
            }
        }
    }

    private handleCleaveHit(obj1: any, obj2: any): void {
        const cleaveSprite = obj1 as Phaser.GameObjects.Graphics;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const cleave = cleaveSprite.getData('wrapper') as PlayerCleave;
        const enemy = enemySprite.getData('enemy') as any;

        if (!cleave || !cleave.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;

        if (cleave.hitEnemies.has(enemyId)) return;

        if (cleave.isPointInCone(enemy.sprite.x, enemy.sprite.y)) {
            let dmg = cleave.damage;
            if (cleave.options.execution && enemy.currentHealth < enemy.stats.health * 0.25) {
                dmg *= 2;
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

    private handleNovaHit(obj1: any, obj2: any): void {
        const novaSprite = obj1 as Phaser.GameObjects.Graphics;
        const enemySprite = obj2 as Phaser.GameObjects.Sprite;

        const nova = novaSprite.getData('wrapper') as PlayerNova;
        const enemy = enemySprite.getData('enemy') as any;

        if (!nova || !nova.isActive() || !enemy || !enemy.sprite.active) return;

        const enemyId = enemySprite.getData('enemyId');
        if (!enemyId) return;
        
        if (nova.hitEnemies.has(enemyId)) return;

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

    public castProjectile(x: number, y: number, targetX: number, targetY: number, damage: number, pierce: number = 0, options: ProjectileOptions = {}): void {
        const p = new PlayerProjectile(this.scene, x, y, targetX, targetY, damage, 400, undefined, options);
        p.pierceCount = pierce;
        p.sprite.setData('wrapper', p);
        this.projectiles.push(p);
        this.projectileGroup.add(p.sprite);
    }

    public castCleave(x: number, y: number, targetX: number, targetY: number, damage: number, radius: number = 150, options: CleaveOptions = {}): void {
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

    public castShieldBash(x: number, y: number, facingVector: Phaser.Math.Vector2): void {
        const skill = new ShieldBashObject(this.scene, x, y, facingVector);
        this.addSkill(skill);
    }

    public castShadowDash(playerSprite: Phaser.Physics.Arcade.Sprite, targetX: number, targetY: number): void {
        const skill = new ShadowDashObject(this.scene, playerSprite.x, playerSprite.y, playerSprite, targetX, targetY);
        this.addSkill(skill);
    }

    public castShurikenFan(x: number, y: number, targetX: number, targetY: number): void {
        const skill = new ShurikenFanObject(this.scene, x, y, targetX, targetY, this.shurikenGroup);
        this.addSkill(skill);
    }

    public castWhirlwind(playerSprite: Phaser.Physics.Arcade.Sprite): void {
        const skill = new WhirlwindObject(this.scene, playerSprite, 10); 
        this.addSkill(skill);
    }

    public addSkill(skill: SkillObject): void {
        this.skillObjects.push(skill);
        this.hitboxGroup.add(skill);
    }

    public clearAll(): void {
        this.projectiles.forEach(p => p.destroy());
        this.cleaves.forEach(c => c.destroy());
        this.novas.forEach(n => n.destroy());
        this.skillObjects.forEach(s => s.destroy());
        
        this.projectiles = [];
        this.cleaves = [];
        this.novas = [];
        this.skillObjects = [];
        
        if (this.projectileGroup?.children) this.projectileGroup.clear(true, true);
        if (this.cleaveGroup?.children) this.cleaveGroup.clear(true, true);
        if (this.novaGroup?.children) this.novaGroup.clear(true, true);
        if (this.hitboxGroup?.children) this.hitboxGroup.clear(true, true);
        if (this.shurikenGroup?.children) this.shurikenGroup.clear(true, true);
    }
}