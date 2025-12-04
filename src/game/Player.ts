import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './objects/PlayerArchetype';
import { Enemy } from './systems/EnemySystem';
import { Shield } from './enemies/attacks/Shield';
import { AnimationMapper, CharacterAnimationSet } from './config/AnimationMappings';
import { PlayerSkillSystem } from './skills/PlayerSkillSystem';
import { InputManager } from './systems/InputManager';
import { PlayerAction } from './types/InputTypes';
import { PlayerState } from './types/PlayerTypes';
import { CooldownManager } from './systems/CooldownManager';
import { XPOrbSystem } from './systems/XPOrbSystem';

// FSM Imports
import { StateMachine } from './states/StateMachine';
import { IdleState } from './states/IdleState';
import { MoveState } from './states/MoveState';
import { AttackState } from './states/AttackState';
import { CastingState } from './states/CastingState';
import { ChannelingState } from './states/ChannelingState';

export class Player {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public archetype: PlayerArchetype; // Make public for access? Or keep private if states don't need direct access. States use public getters usually. But for now lets keep private unless needed.
    // Actually States need stats like speed. archetype.stats is needed.
    // Let's make archetype public for simplicity in this refactor or provide getter.
    // Existing code: private archetype.
    // I will change it to public to avoid getter hell for now.
    
    private scene: Scene;
    
    // FSM State
    public stateMachine: StateMachine;
    public inputManager: InputManager;
    public cooldownManager: CooldownManager;

    public isAttacking: boolean = false; // Controlled by animation events mostly now
    
    // Track attack counts for passive skills
    private projectileAttackCount: number = 0;
    private aoeAttackCount: number = 0;

	private characterVariant: string = 'Knight_1'; // Default
	private characterAnimations: CharacterAnimationSet;
    
    private lastAttackTime: number = 0;
    private attackCooldown: number;
    public skillSystem?: PlayerSkillSystem; // Public for States? Or methods wrapper.
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;
    public lastDamageTime: number = 0;
    public damageCooldown: number = 1000; // 1 second invincibility frames
    private isInvulnerable: boolean = false;
    private slowMultiplier: number = 1.0;
    private slowEndTime: number = 0;
    private facingLeft: boolean = false;
    /** Convert "idle_blinking" → "Idle_Blinking" for JSON frame names */
    private capitalizeWords(name: string): string {
        return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    }
    // --- REMOVED ---
    // private facingLeft: boolean = false; // Track current facing direction

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.inputManager = new InputManager(scene); // Initialize InputManager
        this.cooldownManager = new CooldownManager(scene); // Initialize CooldownManager
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed;

        // Initialize Registry if needed
        if (!this.scene.registry.has('unlockedSkills')) {
            this.scene.registry.set('unlockedSkills', new Map<string, boolean>());
        }
        if (!this.scene.registry.has('skillPoints')) {
            this.scene.registry.set('skillPoints', this.archetype.skillPoints); // Sync initial points
        }

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

        // Initialize State Machine
        this.stateMachine = new StateMachine();
        this.stateMachine.addState(PlayerState.IDLE, new IdleState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.RUN, new MoveState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.ATTACK_PRIMARY, new AttackState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.CASTING_SECONDARY, new CastingState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.CHANNELING_SPECIAL, new ChannelingState(this, scene, this.stateMachine));

        // Start in Idle
        this.stateMachine.transition(PlayerState.IDLE);

        // Listen globally for when any animation completes
        this.sprite.on(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        (animation: Phaser.Animations.Animation) => {
            const key = (animation?.key || '').toLowerCase();
            if (key.includes('attack')) {
                this.isAttacking = false;
            }
        }
        );

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

        // REMOVED: Direct pointer listeners. Handled by InputManager and FSM now.

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
        this.scene.registry.set('skillPoints', this.archetype.skillPoints); // Sync points
    }

    public setSkillSystem(system: PlayerSkillSystem): void {
        this.skillSystem = system;
    }

    // REMOVED setSkillTreeUI

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

    public update(_enemies: Enemy[], deltaTime: number): void {
        this.inputManager.update();
        
        // Toggle Skill Tree
        if (this.inputManager.isActionJustPressed(PlayerAction.TOGGLE_SKILL_TREE)) {
            this.scene.scene.pause('GameScene');
            this.scene.scene.launch('SkillTreeScene', { archetype: this.archetype.type });
            this.scene.scene.bringToTop('SkillTreeScene');
            return;
        }

        // FSM Update
        this.stateMachine.update(this.scene.time.now, deltaTime);

        this.updateHealthBar();
        this.updateArchetype();
        this.updateInvulnerability();
    }

    public performSecondarySkill(): void {
        const targetPos = this.inputManager.getPointerWorldPosition();
        
        // Cooldowns
        let cd = 1000;

        if (this.archetype.type === PlayerArchetypeType.TANK) {
            // Shield Bash
            cd = 3000;
            const facing = new Phaser.Math.Vector2(targetPos.x - this.sprite.x, targetPos.y - this.sprite.y);
            this.skillSystem?.castShieldBash(this.sprite.x, this.sprite.y, facing);
            
            // Lock duration matching skill active time roughly
            this.scene.time.delayedCall(300, () => {
                this.stateMachine.transition(PlayerState.IDLE);
            });
            
        } else if (this.archetype.type === PlayerArchetypeType.EVASIVE) {
            // Shadow Dash
            cd = 2000;
            this.skillSystem?.castShadowDash(this.sprite, targetPos.x, targetPos.y);
            
             // Lock duration matching dash
            this.scene.time.delayedCall(200, () => {
                this.stateMachine.transition(PlayerState.IDLE);
            });
            
        } else {
            // Magician / Glass Cannon - Maybe a teleport or specialized projectile?
            // For now, just log or small placeholder
             console.log("Secondary skill not implemented for this class yet");
             this.stateMachine.transition(PlayerState.IDLE);
             return; 
        }

        this.cooldownManager.startCooldown('SECONDARY_SKILL', cd);
    }

    public applyMovement(moveVector: Phaser.Math.Vector2): void {
        this.updateSlowEffect();
        
        let velocityX = moveVector.x * this.archetype.stats.speed;
        let velocityY = moveVector.y * this.archetype.stats.speed;

        // Apply slow
        velocityX *= this.slowMultiplier;
        velocityY *= this.slowMultiplier;

        // Handle sprite facing direction
        if (velocityX < 0) {
            if (!this.facingLeft) {
                this.facingLeft = true;
                this.sprite.setFlipX(true);
            }
        } else if (velocityX > 0) {
            if (this.facingLeft) {
                this.facingLeft = false;
                this.sprite.setFlipX(false);
            }
        }

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

    public playAnimation(animationName: keyof CharacterAnimationSet): void {
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

    public handleChannelingLogic(): void {
        // Check if the special key is still held
        if (!this.inputManager.isActionHeld(PlayerAction.SPECIAL_1)) {
            this.stateMachine.transition(PlayerState.IDLE);
            return;
        }

        // Special logic for Whirlwind (Knight) - Allow slow movement
        if (this.archetype.type === PlayerArchetypeType.TANK) {
             const moveVector = this.inputManager.getMovementVector();
             // Apply movement with 50% speed penalty
             
             let velocityX = moveVector.x * this.archetype.stats.speed * 0.5;
             let velocityY = moveVector.y * this.archetype.stats.speed * 0.5;

             const body = this.sprite.body as Phaser.Physics.Arcade.Body;
             body.setVelocity(velocityX, velocityY);
             
             // Update archetype position tracking
             this.archetype.updatePosition(this.sprite.x, this.sprite.y, this.scene.time.now);
        } else {
            // Other classes might be stationary channel
            this.sprite.setVelocity(0, 0);
        }
    }

    public performSpecialSkill(): void {
        // Check Cooldown
        // We'll assume SPECIAL_SKILL cooldown
        
        if (this.archetype.type === PlayerArchetypeType.TANK) {
             // Whirlwind
             // Start the skill object
             this.skillSystem?.castWhirlwind(this.sprite);
             // Cooldown is handled on completion usually for channels, or start?
             // Let's start cooldown now to prevent spamming Q to reset duration?
             // Or maybe cooldown starts when channel ends.
             // For now, simple start.
             this.cooldownManager.startCooldown('SPECIAL_SKILL', 5000);
        } else {
             // Ninja / Mage Special
             console.log("Special skill not implemented for this class");
             this.stateMachine.transition(PlayerState.IDLE);
        }
    }

    public performAttack(): void {
        const currentTime = this.scene.time.now;
        
        if (currentTime - this.lastAttackTime > this.attackCooldown) {
            switch (this.archetype.type) {
                case PlayerArchetypeType.TANK:
                    this.meleeAttack([]);
                    break;
                case PlayerArchetypeType.EVASIVE:
                     // Ninja Primary: Shuriken Fan
                     const targetPos = this.inputManager.getPointerWorldPosition();
                     this.skillSystem?.castShurikenFan(this.sprite.x, this.sprite.y, targetPos.x, targetPos.y);
                    break;
                case PlayerArchetypeType.GLASS_CANNON:
                default:
                    // Convert pointer coordinates to world coordinates
                    const worldPoint = this.inputManager.getPointerWorldPosition();
                    this.projectileAttackTowardsMouse(worldPoint.x, worldPoint.y);
                    break;
            }
            this.lastAttackTime = currentTime;
        }
    }


     private meleeAttack(_enemies: Enemy[]): void {
        // Tank uses close-range melee attacks (Cleave)
        let meleeRange = this.archetype.stats.attackRange;
        let meleeDamage = this.archetype.stats.damage;
        
        // Apply Skill Modifiers
        const unlocked = this.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();
        let lifesteal = 0;
        let isSundering = false;
        let isExecution = false;

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

        // Target nearest enemy or mouse direction
        const pointer = this.scene.input.activePointer;
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        
        this.skillSystem?.castCleave(this.sprite.x, this.sprite.y, worldPoint.x, worldPoint.y, meleeDamage, meleeRange, {
            lifesteal,
            sunder: isSundering,
            execution: isExecution
        });
    }
    // @ts-ignore
     private aoeAttack(_enemies: Enemy[]): void {
        // Evasive uses area-of-effect attacks (Nova)
        let aoeDamage = this.archetype.stats.damage;
        let radius = 120;
        
        // Apply Skill Modifiers
        const unlocked = this.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();
        let pullEnemies = false;
        let slowField = false;
        let healOnHit = 0; // percent
        let sundering = false;
        
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

        this.skillSystem?.castNova(this.sprite.x, this.sprite.y, aoeDamage, radius, {
            pull: pullEnemies,
            slow: slowField,
            heal: healOnHit,
            sunder: sundering
        }); 
    }
     private projectileAttackTowardsMouse(targetX: number, targetY: number): void {
        let damage = this.archetype.stats.damage;
        // let speedMod = 1.0;
        let pierce = 0;
        let ricochet = false;
        let freeze = false;
        let homing = false;
        let explosive = false;
        let isCrit = false;

        const unlocked = this.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();
        
        // "The Sniper"
        if (unlocked.get("Piercing Shots")) pierce += 1;
        if (unlocked.get("Deadeye")) {
            damage *= 1.4;
            // speedMod = 0.8; // Slower fire rate handled in cooldown logic usually, but here maybe projectile speed? 
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

        this.skillSystem?.castProjectile(this.sprite.x, this.sprite.y, targetX, targetY, damage, pierce, {
            ricochet,
            freeze,
            homing,
            explosive,
            crit: isCrit
        });
    }

    // Helper Methods from original Player.ts (restored)
    public updateHealthBar(): void {
        const percent = this.archetype.currentHealth / this.archetype.stats.maxHealth;
        this.healthBar.width = 48 * percent;
    }
    
    private updateArchetype(): void {
        // Check for level up using gainXP(0) to trigger internal checks
        this.gainXP(0);
    }
    
    private updateInvulnerability(): void {
        if (this.isInvulnerable && this.scene.time.now > this.lastDamageTime + this.damageCooldown) {
            this.isInvulnerable = false;
            this.sprite.setAlpha(1);
        }
    }

    private updateSlowEffect(): void {
        if (this.slowMultiplier < 1.0 && this.scene.time.now > this.slowEndTime) {
            this.slowMultiplier = 1.0;
            this.sprite.clearTint(); // Assuming slow tints the sprite
        }
    }

    public getPosition(): { x: number, y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }

    // Missing Collision Checks from original (restored as stubs or full if logic available)
    public checkCollisionWithEnemies(_enemies: Enemy[], _shields: Shield[]): void {
         // Basic body collision is often handled by arcade physics overlap in Game.ts or EnemySystem
         // If we need explicit logic here:
         // Handled in Game.ts usually: this.physics.add.overlap(player, enemies...)
    }
    public checkCollisionWithProjectiles(_projectiles: any[]): void {}
    public checkCollisionWithMeleeAttacks(_attacks: any[]): void {}
    public checkCollisionWithConeAttacks(_attacks: any[]): void {}
    public checkCollisionWithVortexAttacks(_attacks: any[]): void {}
    public checkCollisionWithExplosionAttacks(_attacks: any[]): void {}
    public checkCollisionWithLightningStrikes(_attacks: any[]): void {}
    public checkCollisionWithClawAttacks(_attacks: any[]): void {}
    public checkCollisionWithArrowProjectiles(_attacks: any[]): void {}
    
    public collectXPOrbs(system: XPOrbSystem): void {
        system.collectOrbs(this.sprite.x, this.sprite.y, (xp) => {
            this.gainXP(xp);
        });
    }

    private gainXP(amount: number): void {
        const levels = this.archetype.gainXP(amount, this.scene.time.now);
        if (levels > 0) {
            // Visual effect
            const txt = this.scene.add.text(this.sprite.x, this.sprite.y - 60, "LEVEL UP!", { color: "#ffff00", fontSize: "20px", fontStyle: "bold" });
            this.scene.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 1500, onComplete: () => txt.destroy() });
            
            // Sync points
            this.scene.registry.set('skillPoints', this.archetype.skillPoints);
        }
    }

    // --- AI Director Integration (Stubs) ---
    public getHealthPercentage(): number {
        return this.archetype.currentHealth / this.archetype.stats.maxHealth;
    }

    public getDPSOverLastTenSeconds(): number {
        return 10; // Placeholder
    }

    public getMovementDistanceLastTenSeconds(): number {
        return 100; // Placeholder
    }

    public getArchetypeVector(): number[] {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK: return [1, 0, 0];
            case PlayerArchetypeType.GLASS_CANNON: return [0, 1, 0];
            case PlayerArchetypeType.EVASIVE: return [0, 0, 1];
        }
        return [0, 0, 0];
    }

    public get position(): { x: number, y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    public getDamageTakenRecently(): number {
        return 0; // Placeholder
    }

    public getXPGenerationRate(): number {
        return 10; // Placeholder
    }

    public takeDamage(amount: number): void {
        if (this.isInvulnerable) return;
        
        // Fortitude Check (Passive)
        const unlocked = this.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();
        if (unlocked.get("Fortitude")) {
            amount *= 0.9;
        }

        this.archetype.currentHealth -= amount;
        this.lastDamageTime = this.scene.time.now;
        this.isInvulnerable = true;
        this.sprite.setAlpha(0.5);
        
        // Retaliation (Passive) trigger
         if (unlocked.get("Retaliation")) {
             // Logic to set a temporary damage buff flag
             // For now, just log
             console.log("Retaliation ready!");
         }

        if (this.archetype.currentHealth <= 0) {
            // Death logic
            this.sprite.setTint(0xff0000);
        }
        this.updateHealthBar();
    }
    
    public destroy(): void {
        // Cleanup listeners
    }
}
