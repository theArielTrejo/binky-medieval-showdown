import { Scene } from 'phaser';

export class PassiveManager {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    private isUnlocked(skillName: string): boolean {
        const unlocked = this.scene.registry.get('unlockedSkills') as Map<string, boolean>;
        return unlocked ? unlocked.get(skillName) || false : false;
    }

    /**
     * Calculates the incoming damage multiplier based on active defensive passives.
     * e.g., Fortitude reduces damage by 10%.
     */
    public getDamageMultiplier(): number {
        let multiplier = 1.0;

        if (this.isUnlocked('Fortitude')) {
            multiplier *= 0.9;
        }

        return multiplier;
    }

    /**
     * Triggers effects when the player takes damage.
     * e.g., Retaliation might deal damage back, or visual effects.
     */
    public onTakeDamage(_amount: number): void {
        if (this.isUnlocked('Retaliation')) {
            console.log('PassiveManager: Retaliation triggered!');
            // Future implementation: Spawn a small AOE blast or reflect damage
        }
    }

    /**
     * Triggers effects when the player deals damage.
     * e.g., Vampirism heals the player.
     */
    public onDealDamage(_amount: number): number {
        let lifesteal = 0;
        
        // Example: if (this.isUnlocked('Vampirism')) lifesteal = amount * 0.05;
        
        return lifesteal;
    }
}
