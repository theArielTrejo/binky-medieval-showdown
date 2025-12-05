import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './objects/PlayerArchetype';
import { Enemy } from './systems/EnemySystem';
import { CharacterAnimationSet } from './config/AnimationMappings';
import { InputManager } from './systems/InputManager';
import { PlayerAction } from './types/InputTypes';
import { PlayerState } from './types/PlayerTypes';
import { CooldownManager } from './systems/CooldownManager';
import { XPOrbSystem } from './systems/XPOrbSystem';
import { InputBuffer } from './input/InputBuffer';
import { SkillLoadout } from './skills/SkillLoadout';
import { ShieldBashSkill } from './skills/ShieldBashSkill';
import { ShadowDashSkill } from './skills/ShadowDashSkill';
import { CleaveSkill } from './skills/CleaveSkill';
import { ProjectileSkill } from './skills/ProjectileSkill';
import { ShurikenFanSkill } from './skills/ShurikenFanSkill';
import { WhirlwindSkill } from './skills/WhirlwindSkill';

import { CombatComponent } from './components/CombatComponent';
import { VisualComponent } from './components/VisualComponent';
import { PassiveManager } from './systems/PassiveManager';

// FSM Imports
import { StateMachine } from './states/StateMachine';
import { IdleState } from './states/IdleState';
import { MoveState } from './states/MoveState';
import { AttackState } from './states/AttackState';
import { CastingState } from './states/CastingState';
import { ChannelingState } from './states/ChannelingState';

export class Player {
    public sprite: Phaser.Physics.Arcade.Sprite;
    public archetype: PlayerArchetype; 
    public loadout: SkillLoadout;
    public combatComponent: CombatComponent;
    public visualComponent: VisualComponent;
    
    public scene: Scene;
    
    // FSM State
    public stateMachine: StateMachine;
    public inputManager: InputManager;
    public inputBuffer?: InputBuffer;
    public cooldownManager: CooldownManager;
    public passiveManager: PassiveManager;
    
    public slowMultiplier: number = 1.0;
    private slowEndTime: number = 0;
    public facingLeft: boolean = false;
    private lastToggleTime: number = 0;

    /** Convert "idle_blinking" → "Idle_Blinking" for JSON frame names */
    private capitalizeWords(name: string): string {
        return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('_');
    }

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType, inputBuffer?: InputBuffer) {
        this.scene = scene;
        this.inputBuffer = inputBuffer;
        this.inputManager = new InputManager(scene, inputBuffer); // Initialize InputManager
        this.cooldownManager = new CooldownManager(scene); // Initialize CooldownManager
        this.passiveManager = new PassiveManager(scene); // Initialize PassiveManager
        this.archetype = new PlayerArchetype(archetypeType);
        this.combatComponent = new CombatComponent(this, this.passiveManager); // Initialize Combat Component
        
        this.loadout = new SkillLoadout();
        if (this.archetype.type === PlayerArchetypeType.TANK) {
            this.loadout.primary = new CleaveSkill();
            this.loadout.secondary = new ShieldBashSkill();
            this.loadout.special = new WhirlwindSkill();
        } else if (this.archetype.type === PlayerArchetypeType.EVASIVE) {
            this.loadout.primary = new ShurikenFanSkill();
            this.loadout.secondary = new ShadowDashSkill();
        } else {
            this.loadout.primary = new ProjectileSkill();
        }

        // Initialize Registry if needed
        if (!this.scene.registry.has('unlockedSkills')) {
            this.scene.registry.set('unlockedSkills', new Map<string, boolean>());
        }
        if (!this.scene.registry.has('skillPoints')) {
            this.scene.registry.set('skillPoints', this.archetype.skillPoints); // Sync initial points
        }

        // Sprite Creation Logic (Local to allow specific sprite setup before VisualComponent)
        let characterBase = this.getArchetypeDisplayName().toLowerCase();
        const formattedName = characterBase.charAt(0).toUpperCase() + characterBase.slice(1);
        if (characterBase === 'rogue') characterBase = 'ninja';
        
        const idleName = this.archetype.type === PlayerArchetypeType.TANK ? 'idle' : 'idle_blinking';
        const initialFrame = `0_${formattedName}_${this.capitalizeWords(idleName)}_000.png`;
        
        this.sprite = scene.physics.add.sprite(x, y, `${characterBase}_${idleName}`, initialFrame);

        // Immediately play idle animation
        const idleAnimKey = `${formattedName}_1_${this.capitalizeWords(idleName)}`;
        if (scene.anims.exists(idleAnimKey)) {
            this.sprite.play(idleAnimKey);
        } else {
            console.warn(`⚠️ Animation not found: ${idleAnimKey}`);
        }

        this.sprite.setScale(0.05);
        this.sprite.setDepth(3);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setSize(410, 545);
        body.setOffset(265, 175);
        body.setDrag(300);
        body.allowRotation = false;

        // Initialize Visual Component (Handles UI, Animation Mapping)
        this.visualComponent = new VisualComponent(this);

        // Initialize State Machine
        this.stateMachine = new StateMachine();
        this.stateMachine.addState(PlayerState.IDLE, new IdleState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.RUN, new MoveState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.ATTACK_PRIMARY, new AttackState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.CASTING_SECONDARY, new CastingState(this, scene, this.stateMachine));
        this.stateMachine.addState(PlayerState.CHANNELING_SPECIAL, new ChannelingState(this, scene, this.stateMachine));

        // Start in Idle
        this.stateMachine.transition(PlayerState.IDLE);

        // Debug key for levels
        this.scene.input.keyboard!.on('keydown-L', () => {
            this.addLevels(100);
            console.log('DEBUG: Added 100 levels!');
        });

        // Handle Resume to prevent Input glitches
        this.scene.events.on('resume', this.onSceneResume, this);
    }

    private onSceneResume(): void {
        // Reset toggle timer to prevent immediate re-triggering if key is held
        this.lastToggleTime = this.scene.time.now;
        // Reset input manager state
        this.inputManager.reset();
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

    // REMOVED setSkillSystem

    public heal(amount: number): void {
        this.combatComponent.heal(amount);
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
            const now = this.scene.time.now;
            if (now - this.lastToggleTime > 500) {
                this.lastToggleTime = now;
                this.scene.scene.pause('GameScene');
                this.scene.scene.launch('SkillTreeScene', { archetype: this.archetype.type });
                this.scene.scene.bringToTop('SkillTreeScene');
            }
            return;
        }

        // FSM Update
        this.stateMachine.update(this.scene.time.now, deltaTime);

        this.visualComponent.updateHealthBar();
        this.updateArchetype();
        this.combatComponent.updateInvulnerability();
    }

    public performSecondarySkill(): void {
        if (this.loadout.secondary) {
            this.loadout.secondary.activate(this);
        } else {
             console.log("Secondary skill not implemented for this class yet");
             this.stateMachine.transition(PlayerState.IDLE);
        }
    }
    
    // ... applyMovement ...

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
    
    public playAnimation(animationName: keyof CharacterAnimationSet): void {
        this.visualComponent.playAnimation(animationName);
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
        if (this.loadout.special) {
            this.loadout.special.activate(this);
        } else {
            // Ninja / Mage Special not implemented yet
            console.log("Special skill not implemented for this class");
            this.stateMachine.transition(PlayerState.IDLE);
        }
    }

    public performAttack(): void {
        if (this.loadout.primary) {
            this.loadout.primary.activate(this);
        }
    }


    // Helper Methods from original Player.ts (restored)
    public updateHealthBar(): void {
        this.visualComponent.updateHealthBar();
    }
    
    private updateArchetype(): void {
        // Check for level up using gainXP(0) to trigger internal checks
        this.gainXP(0);
    }
    
    // updateInvulnerability REMOVED (delegated)

    private updateSlowEffect(): void {
        this.visualComponent.updateSlowEffect(this.slowMultiplier, this.slowEndTime);
    }

    public getPosition(): { x: number, y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }
    
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
        this.combatComponent.takeDamage(amount);
    }
    
    public destroy(): void {
        this.scene.events.off('resume', this.onSceneResume, this);
        this.inputManager.destroy();
        this.visualComponent.destroy();
        // Sprite is managed by scene usually, but if we need explicit cleanup:
        // this.sprite.destroy(); 
    }
}
