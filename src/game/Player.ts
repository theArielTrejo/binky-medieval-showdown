import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy } from './EnemySystem';
import { EnemyProjectile } from './enemies/attacks/EnemyProjectile';
import { MeleeAttack } from './enemies/attacks/MeleeAttack';
import { ConeAttack } from './enemies/attacks/ConeAttack';
import { SpearAttack } from './enemies/attacks/SpearAttack';
import { Shield } from './enemies/attacks/Shield';
import { VortexAttack } from './enemies/attacks/VortexAttack';
import { ExplosionAttack } from './enemies/attacks/ExplosionAttack';
import { LightningStrikeAttack } from './enemies/attacks/LightningStrikeAttack';
import { ArrowProjectile } from './enemies/attacks/ArrowProjectile';
import { EnemyType } from './types/EnemyTypes';
import { EnhancedStyleHelpers } from '../ui/EnhancedDesignSystem';
import { AnimationMapper, CharacterAnimationSet } from './config/AnimationMappings';
import { PlayerSkillSystem } from './skills/PlayerSkillSystem';
import { SkillTreeUI } from '../ui/SkillTreeUI'; // Import the UI type

export class Player {
    public sprite: Phaser.Physics.Arcade.Sprite;
    private archetype: PlayerArchetype;
    private scene: Scene;
    private isAttacking: boolean = false;
    private skillTreeUI?: SkillTreeUI; // Reference to the Skill Tree UI
    
    // Track attack counts for passive skills
    private projectileAttackCount: number = 0;
    private aoeAttackCount: number = 0;

	private characterVariant: string = 'Knight_1'; // Default
	private characterAnimations: CharacterAnimationSet;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;
    private lastAttackTime: number = 0;
    private attackCooldown: number;
    private skillSystem?: PlayerSkillSystem;
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;
    public lastDamageTime: number = 0;
    public damageCooldown: number = 1000; // 1 second invincibility frames
    private isInvulnerable: boolean = false;
    private slowMultiplier: number = 1.0;
    private slowEndTime: number = 0;
    private lastVortexHitTime: number = 0;
    private vortexHitCooldown: number = 500;
    private facingLeft: boolean = false;
    /** Convert "idle_blinking" → "Idle_Blinking" for JSON frame names */
    private capitalizeWords(name: string): string {
        return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    }
    // --- REMOVED ---
    // private facingLeft: boolean = false; // Track current facing direction

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed;

        this.characterVariant = AnimationMapper.getHardcodedCharacterForArchetype(this.archetype.type);
        this.characterAnimations = AnimationMapper.getCharacterAnimations(this.characterVariant);

        console.log(`🎮 Selected character variant: ${this.characterVariant} for archetype: ${this.archetype.type}`);
        console.log('🎮 Character animations:', this.characterAnimations);

        // ✅ Use correct character base (matches folder and atlas name)
        let characterBase = this.getArchetypeDisplayName().toLowerCase(); // e.g. "magician"
        const formattedName = characterBase.charAt(0).toUpperCase() + characterBase.slice(1);

        if (characterBase === 'rogue') {
            characterBase = 'ninja';
        }

        // ✅ Pick correct idle name for each archetype
        const idleName =
        this.archetype.type === PlayerArchetypeType.TANK
            ? 'idle'          // knight
            : 'idle_blinking'; // magician and others

        this.sprite = scene.physics.add.sprite(
        x, y,
        `${characterBase}_${idleName}`,
        `0_${formattedName}_${this.capitalizeWords(idleName)}_000.png`
        );


        // ✅ Immediately play idle animation (matches what AtlasManager creates)
        const idleAnimKey = `${formattedName}_1_${this.capitalizeWords(idleName)}`;
        if (scene.anims.exists(idleAnimKey)) {
        this.sprite.play(idleAnimKey);
        } else {
        console.warn(`⚠️ Animation not found: ${idleAnimKey}`);
        }

        console.log(`🎮 Created player sprite for ${characterBase} using atlas ${characterBase}_idle_blinking`);
        console.log('Magician idle animation data:', this.scene.anims.get('Magician_1_Idle_Blinking'));

        this.sprite.setScale(0.05);
        this.sprite.setDepth(3);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setAngle(0);
        this.sprite.setRotation(0);
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(410, 545);
        body.setOffset(265, 175);
        body.setDrag(300);
        body.allowRotation = false;
        if (this.sprite.setAngularVelocity) {
            this.sprite.setAngularVelocity(0);
        }

        // --- REMOVED ---
        // Initialize facing direction based on sprite's default state
        // this.facingLeft = this.sprite.flipX;

        this.playAnimation('idle'); // Start idle

        // Listen globally for when any animation completes
        this.sprite.on(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        (animation: Phaser.Animations.Animation) => {
            const key = (animation?.key || '').toLowerCase();
            if (key.includes('attack')) {
            this.isAttacking = false;
            this.playAnimation('idle');
            }
        }
        );


        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');

        // Debug key for levels
        this.scene.input.keyboard!.on('keydown-L', () => {
            this.addLevels(100);
            console.log('DEBUG: Added 100 levels!');
        });

        // --- (UI Element creation remains the same) ---
        this.healthBarBg = scene.add.rectangle(x, y - 35, 50, 8, 0x000000);
        this.healthBarBg.setDepth(15);
        this.healthBar = scene.add.rectangle(x, y - 35, 48, 6, 0x00ff00);
        this.healthBar.setDepth(16);
        this.archetypeText = scene.add.text(x, y - 50, this.getArchetypeDisplayName(), { /* ... style ... */ });
        this.archetypeText.setOrigin(0.5);
        this.archetypeText.setDepth(17);


        this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown() && !this.isAttacking) {
                this.isAttacking = true;

                // 🔹 Play attack animation
                this.playAnimation('attack');

                // 🔹 Run attack logic (damage/projectile)
                this.performAttack(pointer);

            }
        };
        scene.input.on('pointerdown', this.pointerDownHandler);

        // Fix: Update UI position after physics step to prevent jitter/disconnect
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    }

    // Delegate methods for Leveling System
    public getLevel(): number {
        return this.archetype.level;
    }

    public getCurrentLevelXP(): number {
        return this.archetype.currentLevelXP;
    }

    public getXPToNextLevel(): number {
        return this.archetype.xpToNextLevel;
    }

    public getSkillPoints(): number {
        return this.archetype.skillPoints;
    }

    public spendSkillPoints(amount: number): boolean {
        return this.archetype.spendSkillPoints(amount);
    }

    public addLevels(amount: number): void {
        this.archetype.addLevels(amount);
        // Emit event or trigger visual if needed
    }

    public setSkillSystem(system: PlayerSkillSystem): void {
        this.skillSystem = system;
    }

    public setSkillTreeUI(ui: SkillTreeUI): void {
        console.log('Player: SkillTreeUI linked successfully');
        this.skillTreeUI = ui;
    }

    public heal(amount: number): void {
        this.archetype.currentHealth = Math.min(this.archetype.currentHealth + amount, this.archetype.stats.maxHealth);
        this.updateHealthBar();
        // Visual heal effect
        this.sprite.setTint(0x00ff00);
        this.scene.time.delayedCall(200, () => this.sprite.clearTint());
    }

    // --- (getArchetypeDisplayName, setEnemyDeathCallback, handleEnemyDeath remain the same) ---
     private getArchetypeDisplayName(): string {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 'Knight';
            case PlayerArchetypeType.GLASS_CANNON:
                return 'Magician';
            case PlayerArchetypeType.EVASIVE:
                return 'Ninja';
        }
    }
    
    // handleEnemyDeath removed as it was unused

    public update(enemies: Enemy[], _deltaTime: number): void {
        this.handleMovement(); // Still handles movement and animation switching
        this.handleAttack(enemies);
        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    private handleMovement(): void {
        if (!this.sprite.body) return;

        this.updateSlowEffect();
        let velocityX = 0;
        let velocityY = 0;

        const leftPressed = this.isKeyPressed(this.cursors?.left) || this.isKeyPressed(this.wasdKeys?.A);
        const rightPressed = this.isKeyPressed(this.cursors?.right) || this.isKeyPressed(this.wasdKeys?.D);
        const upPressed = this.isKeyPressed(this.cursors?.up) || this.isKeyPressed(this.wasdKeys?.W);
        const downPressed = this.isKeyPressed(this.cursors?.down) || this.isKeyPressed(this.wasdKeys?.S);

        if (leftPressed) velocityX = -this.archetype.stats.speed;
        if (rightPressed) velocityX = this.archetype.stats.speed;
        if (upPressed) velocityY = -this.archetype.stats.speed;
        if (downPressed) velocityY = this.archetype.stats.speed;

        velocityX *= this.slowMultiplier;
        velocityY *= this.slowMultiplier;

        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707;
            velocityY *= 0.707;
        }

        const isMoving = leftPressed || rightPressed || upPressed || downPressed;
		const targetAnimationKey = isMoving ? 'walk' : 'idle';

        if (this.isAttacking) {
            // Allow movement while attacking, but don't change animation
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            body.setVelocity(velocityX, velocityY);
            return;
        }

        // Handle sprite facing direction
        if (leftPressed && !rightPressed) {
            if (!this.facingLeft) {
                this.facingLeft = true;
                this.sprite.setFlipX(true);
            }
        } else if (rightPressed && !leftPressed) {
            if (this.facingLeft) {
                this.facingLeft = false;
                this.sprite.setFlipX(false);
            }
        }

        // Play the animation (idle or walk)
        this.playAnimation(targetAnimationKey as keyof CharacterAnimationSet);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(velocityX, velocityY);

        this.archetype.updatePosition(this.sprite.x, this.sprite.y, this.scene.time.now);
    }

    private postUpdate(): void {
        if (!this.sprite.active) return;
        
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 35);
        this.healthBar.setPosition(this.sprite.x, this.sprite.y - 35);
        this.archetypeText.setPosition(this.sprite.x, this.sprite.y - 50);
    }

    private playAnimation(animationName: keyof CharacterAnimationSet): void {
        try {
            const targetAnimation = this.characterAnimations[animationName];

            if (this.scene.anims.exists(targetAnimation)) {
                const currentlyPlaying = this.sprite.anims.currentAnim?.key;

                if (currentlyPlaying !== targetAnimation) {
                    // Ensure the sprite uses the correct base texture before playing
                    const anim = this.scene.anims.get(targetAnimation);
                    const atlasKey = anim.frames[0].textureKey;
                    if (atlasKey && this.sprite.texture.key !== atlasKey) {
                        this.sprite.setTexture(atlasKey);
                    }

                    this.sprite.play(targetAnimation, true);
                }
                return;
            }
            console.warn(`❌ Animation not found: ${targetAnimation}`);
        } catch (error) {
            console.warn(`Failed to play animation ${animationName}:`, error);
        }
    }

    // --- (All other methods like performAttack, handleAttack, attack types, collision checks, takeDamage, etc., remain unchanged) ---

     private performAttack(pointer: Phaser.Input.Pointer): void {
        const currentTime = this.scene.time.now;
        
        if (currentTime - this.lastAttackTime > this.attackCooldown) {
            switch (this.archetype.type) {
                case PlayerArchetypeType.TANK:
                    this.meleeAttack([]);
                    break;
                case PlayerArchetypeType.EVASIVE:
                    this.aoeAttack([]);
                    break;
                case PlayerArchetypeType.GLASS_CANNON:
                default:
                    // Convert pointer coordinates to world coordinates
                    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                    this.projectileAttackTowardsMouse(worldPoint.x, worldPoint.y);
                    break;
            }
            this.lastAttackTime = currentTime;
        }
    }
     private handleAttack(enemies: Enemy[]): void {
        const currentTime = this.scene.time.now;
        
        // Safe input handling for attack
        const attackPressed = this.isKeyPressed(this.cursors?.space) || this.isKeyPressed(this.wasdKeys?.SPACE);
        
        if (attackPressed) {
            // console.log('Attack key pressed, cooldown check:', currentTime - this.lastAttackTime, '>', this.attackCooldown);
        }
        
        if (attackPressed && currentTime - this.lastAttackTime > this.attackCooldown) {
            // console.log('Attacking with archetype:', this.archetype.type, 'damage:', this.archetype.stats.damage);
            this.attack(enemies);
            this.lastAttackTime = currentTime;
        }
    }
    private isKeyPressed(key: any): boolean {
        return key && typeof key === 'object' && key.isDown === true;
    }
     private attack(enemies: Enemy[]): void {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                this.meleeAttack(enemies);
                break;
            case PlayerArchetypeType.EVASIVE:
                this.aoeAttack(enemies);
                break;
            case PlayerArchetypeType.GLASS_CANNON:
            default:
                this.projectileAttack(enemies);
                break;
        }
    }
     private meleeAttack(_enemies: Enemy[]): void {
        // Tank uses close-range melee attacks (Cleave)
        let meleeRange = this.archetype.stats.attackRange;
        let meleeDamage = this.archetype.stats.damage;
        
        // Apply Skill Modifiers
        const unlocked = this.skillTreeUI?.getUnlockedSkills();
        let lifesteal = 0;
        let isSundering = false;
        let isExecution = false;

        if (unlocked) {
             // "The Juggernaut" Path (Passive mostly, but check for damage boosts)
             // "Battle Fury": handled in stats update or dynamically here? 
             // Let's stick to active modifiers for now.

             // "The Blademaster" Path
             // Cleave is default.
             if (unlocked.get("Sunder")) {
                 isSundering = true;
             }
             if (unlocked.get("Lifesteal")) {
                 lifesteal = 0.05; // 5%
             }
             if (unlocked.get("Execution")) {
                 isExecution = true;
             }
        }

        // Target nearest enemy or mouse direction
        const pointer = this.scene.input.activePointer;
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        this.skillSystem?.castCleave(this.sprite.x, this.sprite.y, worldPoint.x, worldPoint.y, meleeDamage, meleeRange, {
            lifesteal,
            sunder: isSundering,
            execution: isExecution
        });
    }
     private aoeAttack(_enemies: Enemy[]): void {
        // Evasive uses area-of-effect attacks (Nova)
        let aoeDamage = this.archetype.stats.damage;
        let radius = 120;
        
        // Apply Skill Modifiers
        const unlocked = this.skillTreeUI?.getUnlockedSkills();
        let pullEnemies = false;
        let slowField = false;
        let healOnHit = 0; // percent
        let sundering = false;
        
        if (unlocked) {
             // "The Controller"
             if (unlocked.get("Gravity Well")) pullEnemies = true;
             if (unlocked.get("Chilling Field")) slowField = true;
             if (unlocked.get("Arcane Siphon")) healOnHit = 0.01; // 1% per enemy

             // "The Conduit"
             if (unlocked.get("Amplitude")) radius *= 1.25;
             if (unlocked.get("Arcane Vulnerability")) sundering = true;
             if (unlocked.get("Resonance")) {
                 // Simple resonance implementation: Every 3rd attack is big
                 this.aoeAttackCount++;
                 if (this.aoeAttackCount >= 3) {
                     radius *= 2.0;
                     aoeDamage *= 2.0;
                     this.aoeAttackCount = 0;
                 }
             }
        }

        this.skillSystem?.castNova(this.sprite.x, this.sprite.y, aoeDamage, radius, {
            pull: pullEnemies,
            slow: slowField,
            heal: healOnHit,
            sunder: sundering
        }); 
    }
     private projectileAttackTowardsMouse(targetX: number, targetY: number): void {
        let damage = this.archetype.stats.damage;
        let speedMod = 1.0;
        let pierce = 0;
        let ricochet = false;
        let freeze = false;
        let homing = false;
        let explosive = false;
        let isCrit = false;

        const unlocked = this.skillTreeUI?.getUnlockedSkills();
        if (unlocked) {
            // "The Sniper"
            if (unlocked.get("Piercing Shots")) pierce += 1;
            if (unlocked.get("Deadeye")) {
                damage *= 1.4;
                speedMod = 0.8; // Slower fire rate handled in cooldown logic usually, but here maybe projectile speed? 
                // Description says "projectileAttack speed reduced", which usually means cooldown.
                // But here we are in the attack function. We'll assume the cooldown modification happens in stats or ignore for now.
            }
            if (unlocked.get("Headshot")) {
                this.projectileAttackCount++;
                if (this.projectileAttackCount >= 4) {
                    isCrit = true;
                    damage *= 2.5;
                    this.projectileAttackCount = 0;
                }
            }

            // "The Trickster"
            if (unlocked.get("Ricochet")) ricochet = true;
            if (unlocked.get("Frost Shot")) freeze = true;
            if (unlocked.get("Homing Shots")) homing = true;
            if (unlocked.get("Chain Reaction")) explosive = true;
        }

        this.skillSystem?.castProjectile(this.sprite.x, this.sprite.y, targetX, targetY, damage, pierce, {
            ricochet,
            freeze,
            homing,
            explosive,
            crit: isCrit
        });
    }
     private projectileAttack(enemies: Enemy[]): void {
        // Auto-aim closest enemy
        const closestEnemy = this.findClosestEnemy(enemies);
        let targetX = this.sprite.x;
        let targetY = this.sprite.y - 100; // Default up

        if (closestEnemy) {
            targetX = closestEnemy.sprite.x;
            targetY = closestEnemy.sprite.y;
        } else {
             // Fallback to mouse if no enemies
            const pointer = this.scene.input.activePointer;
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            targetX = worldPoint.x;
            targetY = worldPoint.y;
        }

        // Duplicate logic from projectileAttackTowardsMouse to ensure consistency
        // (Ideally this should be refactored into a single 'fireProjectile' method)
        let damage = this.archetype.stats.damage;
        let pierce = 0;
        let ricochet = false;
        let freeze = false;
        let homing = false;
        let explosive = false;
        let isCrit = false;

        const unlocked = this.skillTreeUI?.getUnlockedSkills();
        if (unlocked) {
             if (unlocked.get("Piercing Shots")) pierce += 1;
             if (unlocked.get("Deadeye")) damage *= 1.4;
             if (unlocked.get("Headshot")) {
                 this.projectileAttackCount++;
                 if (this.projectileAttackCount >= 4) {
                     isCrit = true;
                     damage *= 2.5;
                     this.projectileAttackCount = 0;
                 }
             }
             if (unlocked.get("Ricochet")) ricochet = true;
             if (unlocked.get("Frost Shot")) freeze = true;
             if (unlocked.get("Homing Shots")) homing = true;
             if (unlocked.get("Chain Reaction")) explosive = true;
        }

        this.skillSystem?.castProjectile(this.sprite.x, this.sprite.y, targetX, targetY, damage, pierce, {
            ricochet,
            freeze,
            homing,
            explosive,
            crit: isCrit
        });
    }
     private findClosestEnemy(enemies: Enemy[]): Enemy | null {
        let closestEnemy: Enemy | null = null;
        let minDistance = Infinity;

        enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }
     private updateInvulnerability(): void {
        if (this.isInvulnerable) {
            const currentTime = this.scene.time.now;
            const timeSinceDamage = currentTime - this.lastDamageTime;
            
            // Check if invulnerability period is over
            if (timeSinceDamage >= this.damageCooldown) {
                this.isInvulnerable = false;
                this.sprite.setAlpha(1.0); // Restore full opacity
                this.sprite.clearTint(); // Restore normal color
            } else {
                // Create flashing effect during invulnerability
                const flashInterval = 100; // Flash every 100ms
                const shouldFlash = Math.floor(timeSinceDamage / flashInterval) % 2 === 0;
                this.sprite.setAlpha(shouldFlash ? 0.3 : 0.8);
            }
        }
    }
     private applySlowEffect(multiplier: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, multiplier); // Use the strongest slow
        this.slowEndTime = Math.max(this.slowEndTime, this.scene.time.now + duration);
        console.log(`Player slowed! Speed: ${(multiplier * 100).toFixed(0)}%, Duration: ${(duration / 1000).toFixed(1)}s`);
    }
     public checkCollisionWithEnemies(_enemies: Enemy[], _shields?: Shield[]): void {
        // Only checking player body collision here now, bullet collision is in SkillSystem
        
        _enemies.forEach(enemy => {
            // Check player-enemy collision (only for melee-only enemies like Gnolls)
            // Other enemies damage through their special attacks
            if (enemy.type === EnemyType.GNOLL && this.scene.physics.overlap(this.sprite, enemy.sprite)) {
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(enemy.stats.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }
     public checkCollisionWithProjectiles(projectiles: EnemyProjectile[]): void {
        projectiles.forEach(projectile => {
            if (!projectile.isActive()) return;
            
            const pos = projectile.getPosition();
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, pos.x, pos.y);
            
            // Check if projectile hits player (simple radius check)
            // Using 25 as collision radius
            if (distance < 25) { 
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(projectile.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                projectile.destroy();
            }
        });
    }
     public checkCollisionWithMeleeAttacks(meleeAttacks: MeleeAttack[]): void {
        meleeAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use circle-based collision for simplicity with rotated rectangles
            const attackPos = { x: attack.x, y: attack.y };
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, attackPos.x, attackPos.y);
            
            // Check if player is within attack range (using radius based on attack size)
            const attackRadius = Math.max(attack.width, attack.height) / 2;
            if (distance < attackRadius + 25) { // 25 is player collision radius
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                // Don't destroy melee attack - it can hit multiple times during its lifetime
            }
        });
    }
     public checkCollisionWithConeAttacks(coneAttacks: ConeAttack[]): void {
        coneAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the cone's built-in point-in-cone check
            if (attack.isPointInCone(this.sprite.x, this.sprite.y)) {
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    public checkCollisionWithSpearAttacks(spearAttacks: SpearAttack[]): void {
        spearAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the spear's built-in point-in-spear check
            if (attack.isPointInSpear(this.sprite.x, this.sprite.y)) {
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                    attack.markDamageDealt();
                }
            }
        });
    }

     public checkCollisionWithVortexAttacks(vortexAttacks: VortexAttack[]): void {
        vortexAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use the vortex's built-in point-in-vortex check
            if (attack.isPointInVortex(this.sprite.x, this.sprite.y)) {
                // Stop traveling vortexes when they hit the player
                if (attack.isTravelingToTarget()) {
                    attack.stopAtCurrentPosition();
                }
                
                const currentTime = this.scene.time.now;
                
                // Apply damage with cooldown (like other attacks)
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                
                // Apply slow effect if player can be hit by vortex
                if (this.canBeHitByVortex()) {
                    this.applySlowEffect(attack.slowEffect, attack.slowDuration); // 70% speed reduction for 2 seconds
                    this.hitByVortex();
                }
            }
        });
    }
     public checkCollisionWithExplosionAttacks(explosionAttacks: ExplosionAttack[]): void {
        explosionAttacks.forEach(attack => {
            if (attack.isActive() && attack.isPointInExplosion(this.sprite.x, this.sprite.y)) {
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    public checkCollisionWithLightningStrikes(lightningStrikes: LightningStrikeAttack[]): void {
        lightningStrikes.forEach(attack => {
            if (attack.isActive() && attack.hasStruckLightning() && attack.isPointInStrike(this.sprite.x, this.sprite.y)) {
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    public checkCollisionWithClawAttacks(clawAttacks: any[]): void {
        clawAttacks.forEach(attack => {
            if (!attack.isActive()) return;
            
            // Use bounding box collision for claw attacks
            // Optimized to use simple distance check instead of getBounds if possible, 
            // but claw attacks might be large sprites. Assuming attack has x, y and width.
            // If attack is an arcade sprite, use physics.overlap. Assuming generic object for now.
            
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, attack.x, attack.y);
            
            // Check if player is within the attack's hitbox (approximate)
            // Using attack.width/2 as radius
            if (distance < ((attack.width || 100) / 2 + 20)) { // 20 is approximate player radius
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(attack.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
            }
        });
    }

    public checkCollisionWithArrowProjectiles(arrows: ArrowProjectile[]): void {
        arrows.forEach(arrow => {
            if (!arrow.isActive()) return;
            
            const pos = arrow.getPosition();
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, pos.x, pos.y);
            
            // Check if arrow hits player (simple radius check)
            if (distance < 25) { // Player collision radius
                const currentTime = this.scene.time.now;
                if (currentTime - this.lastDamageTime >= this.damageCooldown) {
                    this.takeDamage(arrow.damage);
                    this.lastDamageTime = currentTime;
                    this.isInvulnerable = true;
                }
                arrow.destroy();
            }
        });
    }

     public takeDamage(amount: number): void {
        this.archetype.takeDamage(amount, this.scene.time.now);
        
        // Update damage timing for invulnerability frames
        this.lastDamageTime = this.scene.time.now;
        this.isInvulnerable = true;
        
        // Visual feedback - brief red tint, then invulnerability will take over
        this.sprite.setTint(0xff0000);
        this.scene.time.delayedCall(120, () => {
            // Clear damage tint shortly after hit so it doesn't persist
            this.sprite.clearTint();
        });
    }
     public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }
     public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
     public getArchetype(): PlayerArchetype {
        return this.archetype;
    }
     public getHealthPercentage(): number {
        return this.archetype.getHealthPercentage();
    }
     public getDPSOverLastTenSeconds(): number {
        return this.archetype.getDPSOverLastTenSeconds(this.scene.time.now);
    }
     public getMovementDistanceLastTenSeconds(): number {
        return this.archetype.getMovementDistanceLastTenSeconds(this.scene.time.now);
    }
     public getDamageTakenRecently(): number {
        return this.archetype.getDamageTakenRecently(this.scene.time.now);
    }
     public getXPGenerationRate(): number {
        return this.archetype.getXPGenerationRate(this.scene.time.now);
    }
     public getArchetypeVector(): number[] {
        return this.archetype.getArchetypeVector();
    }
     public get position(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }
     public get currentHealth(): number {
        return this.archetype.currentHealth;
    }
     public getScene(): Scene {
        return this.scene;
    }
     public collectXPOrbs(xpOrbSystem: any): void {
        const playerPos = this.getPosition();
        // console.log('Player collecting XP orbs at position:', playerPos.x, playerPos.y);
        const totalCollected = xpOrbSystem.collectOrbs(playerPos.x, playerPos.y, (xp: number) => {
            // console.log('Player gained XP:', xp);
            const levelsGained = this.archetype.gainXP(xp, this.scene.time.now);
            if (levelsGained > 0) {
                console.log(`Leveled up! Gained ${levelsGained} levels. Current level: ${this.archetype.level}`);
                // Play level up sound or effect here
                // this.scene.sound.play('levelup'); 
                // Visual text pop-up
                const text = this.scene.add.text(this.sprite.x, this.sprite.y - 50, `LEVEL UP!`, {
                    fontSize: '32px',
                    color: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5);
                this.scene.tweens.add({
                    targets: text,
                    y: text.y - 100,
                    alpha: 0,
                    duration: 2000,
                    onComplete: () => text.destroy()
                });
            }
        });
        if (totalCollected > 0) {
            // console.log('Total XP collected this frame:', totalCollected);
        }
    }
     private updateHealthBar(): void {
        const healthPercent = this.archetype.currentHealth / this.archetype.stats.maxHealth;
        const maxWidth = 48;
        const currentWidth = maxWidth * healthPercent;
        
        this.healthBar.setSize(currentWidth, 6);
        
        // Color based on health percentage using EnhancedStyleHelpers
        const healthColor = EnhancedStyleHelpers.enemy.getHealthBarColor(healthPercent);
        this.healthBar.setFillStyle(healthColor);
    }
     private updateArchetype(): void {
        if (!this.isInvulnerable) {
            // const archetypeColor = EnhancedStyleHelpers.archetype.getColorHex(this.archetype.type);
            // this.sprite.setTint(archetypeColor);
        }
    }
     private updateSlowEffect(): void {
        const currentTime = this.scene.time.now;
        if (currentTime >= this.slowEndTime) {
            this.slowMultiplier = 1.0; // Reset to normal speed
            // Remove slow visual effect
            if (!this.isInvulnerable) {
                this.sprite.clearTint();
            }
        } else {
            // Apply slow visual effect (cyan tint)
            this.sprite.setTint(0x00ffff);
        }
    }
     public applySlow(slowAmount: number, duration: number): void {
        this.slowMultiplier = Math.min(this.slowMultiplier, slowAmount); // Take the stronger slow effect
        this.slowEndTime = Math.max(this.slowEndTime, this.scene.time.now + duration); // Extend duration if needed
    }
     public canBeHitByVortex(): boolean {
        const currentTime = this.scene.time.now;
        return currentTime - this.lastVortexHitTime >= this.vortexHitCooldown;
    }
     public hitByVortex(): void {
        this.lastVortexHitTime = this.scene.time.now;
    }
     public destroy(): void {
        // Unregister input handlers
        if (this.pointerDownHandler) {
            this.scene.input.off('pointerdown', this.pointerDownHandler);
        }
        
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);

        // Destroy player sprite
        this.sprite.destroy();

        // Destroy UI elements
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.archetypeText) this.archetypeText.destroy();
    }

}
