import { Scene } from 'phaser';
import { XPOrb } from './XPOrb';
import { EnemyType } from './EnemySystem';

export class XPOrbSystem {
    private scene: Scene;
    private orbs: XPOrb[] = [];
    private collectionRange: number = 80; // Collection range in pixels (approximately 2-3 blocks)
    private maxOrbs: number = 100; // Maximum number of orbs to prevent performance issues

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
            const angle = (Math.PI * 2 * i) / orbConfig.count + Math.random() * 0.5;
            const distance = 20 + Math.random() * 30; // 20-50 pixels from death location
            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;
            
            // Ensure orb spawns within game bounds
            const clampedX = Math.max(20, Math.min(1004, orbX));
            const clampedY = Math.max(20, Math.min(748, orbY));
            
            // Create the orb
            const orb = new XPOrb(this.scene, clampedX, clampedY, orbConfig.xpPerOrb);
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
        let baseCount: number;
        
        // Determine base orb count based on enemy type
        switch (enemyType) {
            case EnemyType.SWARM:
                baseCount = 1; // Small enemies drop single orbs
                break;
            case EnemyType.SPEEDSTER:
            case EnemyType.PROJECTILE:
                baseCount = 1;
                break;
            case EnemyType.TANK:
            case EnemyType.ELITE_TANK:
                baseCount = 2; // Medium enemies drop 2 orbs
                break;
            case EnemyType.SNIPER:
            case EnemyType.BERSERKER:
                baseCount = 3; // Special enemies drop 3 orbs
                break;
            case EnemyType.BOSS:
                baseCount = 5; // Bosses drop many orbs
                break;
            default:
                baseCount = 1;
        }
        
        // Adjust count based on total XP (more valuable enemies might drop more orbs)
        let finalCount = baseCount;
        if (totalXP > 50) {
            finalCount = Math.min(baseCount + 1, 6); // Cap at 6 orbs max
        }
        if (totalXP > 100) {
            finalCount = Math.min(baseCount + 2, 8); // Cap at 8 orbs max for very valuable enemies
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
                this.createCollectionEffects(orbPos.x, orbPos.y, xpValue);
                
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
        this.collectionRange = Math.max(20, Math.min(200, range)); // Clamp between 20-200 pixels
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
     * Creates visual effects when XP is collected
     * @param x - X coordinate where collection occurred
     * @param y - Y coordinate where collection occurred
     * @param xpValue - Amount of XP collected
     */
    private createCollectionEffects(x: number, y: number, xpValue: number): void {
        // Create floating XP text
        const xpText = this.scene.add.text(x, y, `+${xpValue}`, {
            fontSize: '16px',
            color: '#FFD700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Animate the floating text
        this.scene.tweens.add({
            targets: xpText,
            y: y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                xpText.destroy();
            }
        });
        
        // Create particle burst effect
        this.createParticleBurst(x, y);
        
        // Create collection sound effect (visual representation)
        this.createSoundEffect(x, y);
    }
    
    /**
     * Creates a particle burst effect at the collection point
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    private createParticleBurst(x: number, y: number): void {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 30 + Math.random() * 20;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance;
            
            // Create small golden particles
            const particle = this.scene.add.circle(x, y, 3, 0xFFD700, 0.8);
            particle.setDepth(20);
            
            this.scene.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 0.2,
                duration: 400 + Math.random() * 200,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    /**
     * Creates a visual sound effect representation
     * @param x - X coordinate
     * @param y - Y coordinate
     */
    private createSoundEffect(x: number, y: number): void {
        // Create expanding ring effect to represent sound
        const soundRing = this.scene.add.circle(x, y, 5, 0xFFFFFF, 0);
        soundRing.setStrokeStyle(2, 0xFFD700, 0.6);
        soundRing.setDepth(15);
        
        this.scene.tweens.add({
            targets: soundRing,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => {
                soundRing.destroy();
            }
        });
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