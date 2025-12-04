import { Scene } from 'phaser';

export enum SkillState {
    ANTICIPATION, // Wind-up
    ACTIVE,       // Hitbox active
    RECOVERY,     // Cooldown/Fade out
    FINISHED      // Ready for cleanup
}

export abstract class SkillObject {
    protected scene: Scene;
    protected state: SkillState = SkillState.ANTICIPATION;
    protected timer: number = 0; // ms
    
    // Configurable timings (ms)
    protected anticipationDuration: number = 0;
    protected activeDuration: number = 100;
    protected recoveryDuration: number = 0;

    // Physics/Visuals
    // subclasses should assign this.hitBox
    public hitBox: Phaser.GameObjects.GameObject | null = null;
    
    // Logic
    public damage: number;
    public hitEnemies: Set<number> = new Set(); 

    constructor(scene: Scene, damage: number) {
        this.scene = scene;
        this.damage = damage;
    }

    /**
     * @param deltaTime Time since last frame in seconds
     */
    public update(deltaTime: number): void {
        const deltaMs = deltaTime * 1000;
        this.timer += deltaMs;

        switch (this.state) {
            case SkillState.ANTICIPATION:
                if (this.timer >= this.anticipationDuration) {
                    this.transitionToActive();
                }
                break;
            case SkillState.ACTIVE:
                this.onActiveUpdate(deltaTime);
                if (this.timer >= this.activeDuration) {
                    this.transitionToRecovery();
                }
                break;
            case SkillState.RECOVERY:
                if (this.timer >= this.recoveryDuration) {
                    this.state = SkillState.FINISHED;
                    this.destroy();
                }
                break;
        }
    }

    protected transitionToActive(): void {
        this.state = SkillState.ACTIVE;
        this.timer = 0;
        this.onActiveStart();
    }

    protected transitionToRecovery(): void {
        this.state = SkillState.RECOVERY;
        this.timer = 0;
        this.onRecoveryStart();
    }

    // Hooks
    protected abstract onActiveStart(): void; 
    protected abstract onRecoveryStart(): void;
    
    /**
     * Optional hook for updates during active state (e.g. projectile movement)
     */
    protected onActiveUpdate(_deltaTime: number): void {}

    public abstract destroy(): void;
    
    public isActive(): boolean {
        return this.state === SkillState.ACTIVE;
    }
    
    public isFinished(): boolean {
        return this.state === SkillState.FINISHED;
    }
}
