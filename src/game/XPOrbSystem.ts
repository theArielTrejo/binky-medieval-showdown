import { Scene } from 'phaser';
import { XPOrb } from './XPOrb';
import { EnemyType } from './EnemySystem';
import { XP_CONSTANTS, getOrbConfigForEnemyType, clampCollectionRange, clampToGameBounds } from './constants/XPConstants';
import { randomBetween } from './utils/MathUtils';
import { EffectManager } from './effects/EffectManager';

export class XPOrbSystem {
    private scene: Scene;
    private orbs: XPOrb[] = [];
    private collectionRange: number = XP_CONSTANTS.COLLECTION_RANGE;
    private maxOrbs: number = XP_CONSTANTS.MAX_ORBS;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Spawns XP orbs at the specified location
     * @param x - X coordinate where orbs should spawn
     * @param y - Y coordinate where orbs should spawn
     * @param enemyType - Type of enemy that was defeated
     * @param totalXP - Total XP value to distribute among orbs
     */
    public spawnXPOrbs(x: number, y: number, enemyType: EnemyType, totalXP: number): void {
        // Determine number of orbs and XP per orb based on enemy type and total XP
        const orbConfig = this.getOrbConfiguration(enemyType, totalXP);
        
        for (let i = 0; i < orbConfig.count; i++) {
            // If we're at max orbs, remove the oldest one
            if (this.orbs.length >= this.maxOrbs) {
                const oldestOrb = this.orbs.shift();
                if (oldestOrb) {
                    oldestOrb.destroy();
                }
            }
            
            // Calculate spawn position with slight randomization
            const angle = (Math.PI * 2 * i) / orbConfig.count + Math.random() * XP_CONSTANTS.SPAWN_ANGLE_VARIANCE;
            const distance = randomBetween(XP_CONSTANTS.SPAWN_DISTANCE_MIN, XP_CONSTANTS.SPAWN_DISTANCE_MAX);
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Ensure orb spawns within game bounds
            const clampedPos = clampToGameBounds(orbX, orbY);
            
            // Create the orb
            const orb = new XPOrb(this.scene, clampedPos.x, clampedPos.y, orbConfig.xpPerOrb);
            this.orbs.push(orb);
        }
    }
    
    /**
     * Determines orb configuration based on enemy type and total XP
     * @param enemyType - Type of enemy that was defeated
     * @param totalXP - Total XP value to distribute
     * @returns Configuration object with count and XP per orb
     */
    private getOrbConfiguration(enemyType: EnemyType, totalXP: number): { count: number; xpPerOrb: number } {
        // Get base configuration from constants
        const config = getOrbConfigForEnemyType(enemyType);
        let finalCount = config.baseCount;
        
        // Adjust count based on total XP (more valuable enemies might drop more orbs)
        if (totalXP > XP_CONSTANTS.XP_THRESHOLDS.MEDIUM) {
            finalCount = Math.min(config.baseCount + 1, config.maxCount);
        }
        if (totalXP > XP_CONSTANTS.XP_THRESHOLDS.HIGH) {
            finalCount = Math.min(config.baseCount + 2, config.maxCount);
        }
        
        const xpPerOrb = Math.ceil(totalXP / finalCount);
        
        return { count: finalCount, xpPerOrb };
    }
    
    /**
     * Updates all XP orbs in the system
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public update(deltaTime: number): void {
        // Update all orbs and remove expired ones
        this.orbs = this.orbs.filter(orb => {
            const shouldRemove = orb.update(deltaTime);
            return !shouldRemove;
        });
    }
    
    /**
     * Attempts to collect XP orbs within range of the specified position
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param onXPCollected - Callback function called when XP is collected
     * @returns Total XP collected this frame
     */
    public collectOrbs(playerX: number, playerY: number, onXPCollected: (xp: number) => void): number {
        let totalXPCollected = 0;
        const orbsToRemove: XPOrb[] = [];
        
        this.orbs.forEach(orb => {
            if (orb.isWithinRange(playerX, playerY, this.collectionRange) && !orb.isOrbCollected()) {
                const xpValue = orb.getXPValue();
                const orbPos = orb.getPosition();
                totalXPCollected += xpValue;
                
                // Create visual feedback for XP collection
                EffectManager.createCollectionEffect(this.scene, orbPos.x, orbPos.y, xpValue);
                
                // Animate orb collection
                orb.collect(playerX, playerY, () => {
                    // Orb collection animation completed
                });
                
                // Call the callback for each orb collected
                onXPCollected(xpValue);
                
                orbsToRemove.push(orb);
            }
        });
        
        // Remove collected orbs from the array
        this.orbs = this.orbs.filter(orb => !orbsToRemove.includes(orb));
        
        return totalXPCollected;
    }
    
    /**
     * Gets all orbs within a certain range of a position (useful for AI or special effects)
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param range - Range to check
     * @returns Array of orbs within range
     */
    public getOrbsInRange(x: number, y: number, range: number): XPOrb[] {
        return this.orbs.filter(orb => orb.isWithinRange(x, y, range));
    }
    
    /**
     * Gets the total number of active orbs
     * @returns Number of active orbs
     */
    public getOrbCount(): number {
        return this.orbs.length;
    }
    
    /**
     * Gets the total XP value of all active orbs
     * @returns Total XP value available for collection
     */
    public getTotalAvailableXP(): number {
        return this.orbs.reduce((total, orb) => total + orb.getXPValue(), 0);
    }
    
    /**
     * Sets the collection range for XP orbs
     * @param range - New collection range in pixels
     */
    public setCollectionRange(range: number): void {
        this.collectionRange = clampCollectionRange(range);
    }
    
    /**
     * Gets the current collection range
     * @returns Current collection range in pixels
     */
    public getCollectionRange(): number {
        return this.collectionRange;
    }
    
    /**
     * Clears all XP orbs from the system
     */
    public clearAllOrbs(): void {
        this.orbs.forEach(orb => orb.destroy());
        this.orbs = [];
    }
    

    
    /**
     * Gets all active orbs (useful for debugging or special effects)
     * @returns Array of all active XP orbs
     */
    public getAllOrbs(): XPOrb[] {
        return [...this.orbs]; // Return a copy to prevent external modification
    }
    
    /**
     * Forces collection of all orbs within a large radius (useful for special abilities)
     * @param playerX - Player's X coordinate
     * @param playerY - Player's Y coordinate
     * @param onXPCollected - Callback function called when XP is collected
     * @returns Total XP collected
     */
    public collectAllOrbsInRadius(playerX: number, playerY: number, radius: number, onXPCollected: (xp: number) => void): number {
        let totalXPCollected = 0;
        const orbsToRemove: XPOrb[] = [];
        
        this.orbs.forEach(orb => {
            if (orb.isWithinRange(playerX, playerY, radius) && !orb.isOrbCollected()) {
                const xpValue = orb.getXPValue();
                totalXPCollected += xpValue;
                
                // Animate orb collection with faster animation for mass collection
                orb.collect(playerX, playerY, () => {});
                
                onXPCollected(xpValue);
                orbsToRemove.push(orb);
            }
        });
        
        // Remove collected orbs from the array
        this.orbs = this.orbs.filter(orb => !orbsToRemove.includes(orb));
        
        return totalXPCollected;
    }
}