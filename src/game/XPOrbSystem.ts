import { Scene } from 'phaser';
import { XPOrb } from './XPOrb';
import { EnemyType } from './types/EnemyTypes';
import { XP_CONSTANTS, getOrbConfigForEnemyType, clampCollectionRange, clampToGameBounds } from './constants/XPConstants';
// REMOVED: No longer need your custom math utility for this
// import { randomBetween } from './utils/MathUtils';
import { EffectManager } from './effects/EffectManager';

export class XPOrbSystem {
    private scene: Scene;
    private orbsGroup: Phaser.GameObjects.Group;
    private collectionRange: number = XP_CONSTANTS.COLLECTION_RANGE;

    constructor(scene: Scene) {
        this.scene = scene;
        this.orbsGroup = this.scene.add.group({
            classType: XPOrb,
            maxSize: XP_CONSTANTS.MAX_ORBS,
            runChildUpdate: true
        });
    }

    public spawnXPOrbs(x: number, y: number, enemyType: EnemyType, totalXP: number): void {
        const orbConfig = this.getOrbConfiguration(enemyType, totalXP);
        
        for (let i = 0; i < orbConfig.count; i++) {
            const orb = this.orbsGroup.get() as XPOrb;

            if (orb) {
                const angle = (Math.PI * 2 * i) / orbConfig.count + Math.random() * XP_CONSTANTS.SPAWN_ANGLE_VARIANCE;
                
                // CHANGED: Using Phaser's built-in Math function
                const distance = Phaser.Math.Between(XP_CONSTANTS.SPAWN_DISTANCE_MIN, XP_CONSTANTS.SPAWN_DISTANCE_MAX);
                
                const orbX = x + Math.cos(angle) * distance;
                const orbY = y + Math.sin(angle) * distance;
                
                const clampedPos = clampToGameBounds(orbX, orbY, this.scene);
                
                orb.launch(clampedPos.x, clampedPos.y, orbConfig.xpPerOrb);
            }
        }
    }
    
    private getOrbConfiguration(enemyType: EnemyType, totalXP: number): { count: number; xpPerOrb: number } {
        const config = getOrbConfigForEnemyType(enemyType);
        let finalCount = config.baseCount;
        if (totalXP > XP_CONSTANTS.XP_THRESHOLDS.MEDIUM) {
            finalCount = Math.min(config.baseCount + 1, config.maxCount);
        }
        if (totalXP > XP_CONSTANTS.XP_THRESHOLDS.HIGH) {
            finalCount = Math.min(config.baseCount + 2, config.maxCount);
        }
        const xpPerOrb = Math.ceil(totalXP / finalCount);
        return { count: finalCount, xpPerOrb };
    }
    

    
    public collectOrbs(playerX: number, playerY: number, onXPCollected: (xp: number) => void): number {
        let totalXPCollected = 0;
        
        this.orbsGroup.getChildren().forEach(orbGO => {
            const orb = orbGO as XPOrb;
            if (orb.active && orb.isWithinRange(playerX, playerY, this.collectionRange) && !orb.isOrbCollected()) {
                const xpValue = orb.getXPValue();
                totalXPCollected += xpValue;
                
                EffectManager.createCollectionEffect(this.scene, orb.x, orb.y, xpValue);
                orb.collect(playerX, playerY, () => {});
                
                onXPCollected(xpValue);
            }
        });
        
        return totalXPCollected;
    }

    public getOrbCount(): number {
        return this.orbsGroup.countActive(true);
    }

    public clearAllOrbs(): void {
        this.orbsGroup.children.each(orbGO => {
            if (orbGO.active) {
                (orbGO as XPOrb).kill();
            }
               return true; //
        });
    }

    public getAllOrbs(): XPOrb[] {
        return this.orbsGroup.getMatching('active', true) as XPOrb[];
    }
    
    public getCollectionRange(): number {
        return this.collectionRange;
    }
    
    public setCollectionRange(range: number): void {
        this.collectionRange = clampCollectionRange(range);
    }

    public getTotalAvailableXP(): number {
        let totalXP = 0;
        this.orbsGroup.getChildren().forEach(orbGO => {
            const orb = orbGO as XPOrb;
            if (orb.active && !orb.isOrbCollected()) {
                totalXP += orb.getXPValue();
            }
        });
        return totalXP;
    }

    /**
     * Update method called each frame
     * The orbs are automatically updated by Phaser's group system with runChildUpdate: true
     * This method can be used for additional system-level updates if needed
     */
    public update(): void {
        // Currently no additional updates needed as orbs are handled by Phaser's group system
        // This method exists to satisfy the interface expected by Game.ts
    }
}