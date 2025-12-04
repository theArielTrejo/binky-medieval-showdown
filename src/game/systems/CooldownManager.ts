import { Scene } from 'phaser';

export class CooldownManager {
    private scene: Scene;
    private cooldowns: Map<string, number> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Starts a cooldown for a specific key.
     * @param key Unique identifier for the ability (e.g., 'SHIELD_BASH')
     * @param duration Duration in milliseconds
     */
    public startCooldown(key: string, duration: number): void {
        const readyTime = this.scene.time.now + duration;
        this.cooldowns.set(key, readyTime);
        this.scene.events.emit('cooldown_start', { key, duration });
    }

    /**
     * Checks if an ability is ready.
     * @param key Unique identifier for the ability
     */
    public isReady(key: string): boolean {
        const readyTime = this.cooldowns.get(key);
        if (readyTime === undefined) return true;
        return this.scene.time.now >= readyTime;
    }

    /**
     * Gets the remaining cooldown time in milliseconds.
     * @param key Unique identifier for the ability
     */
    public getRemaining(key: string): number {
        const readyTime = this.cooldowns.get(key);
        if (readyTime === undefined) return 0;
        return Math.max(0, readyTime - this.scene.time.now);
    }
}
