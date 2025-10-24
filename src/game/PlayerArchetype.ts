export enum PlayerArchetypeType {
    TANK = 'tank',
    GLASS_CANNON = 'glass_cannon',
    EVASIVE = 'evasive'
}

// Mapping between PlayerArchetypeType and character classes in sprite sheets
export const PLAYER_ARCHETYPE_TO_CHARACTER_MAPPING: Record<PlayerArchetypeType, string[]> = {
    [PlayerArchetypeType.TANK]: [
        'knight', 'armored knight', 'paladin knight'
    ],
    [PlayerArchetypeType.GLASS_CANNON]: [
        'magician'
    ],
    [PlayerArchetypeType.EVASIVE]: [
        'ninja', 'archer', 'elf archer'
    ]
};

// Character variants for each character class
export const CHARACTER_VARIANTS: Record<string, string[]> = {
    'knight': ['Knight_1', 'Knight_2', 'Knight_3'],
    'armored knight': ['White Armored Knight', 'Medieval Knight', 'Templar Knight'],
    'paladin knight': ['Paladin_1', 'Paladin_2', 'Paladin_3'],
    'magician': ['Magician_1', 'Magician_2', 'Magician_3'],
    'ninja': ['Black Ninja', 'White Ninja', 'Assassin Guy'],
    'archer': ['Archer_1', 'Archer_3'],
    'elf archer': ['Archer_1', 'Archer_2']
};

export interface PlayerStats {
    maxHealth: number;
    speed: number;
    damage: number;
    attackRange: number;
    attackSpeed: number;
}

export class PlayerArchetype {
    public type: PlayerArchetypeType;
    public stats: PlayerStats;
    public currentHealth: number;
    public position: { x: number; y: number };
    public lastDamageTime: number = 0;
    public totalDamageDealt: number = 0;
    public movementHistory: { x: number; y: number; time: number }[] = [];
    public xpGained: number = 0;
    public lastXpTime: number = 0;

    constructor(type: PlayerArchetypeType) {
        this.type = type;
        this.stats = this.getStatsForType(type);
        this.currentHealth = this.stats.maxHealth;
        this.position = { x: 512, y: 384 }; // Center of screen
    }

    private getStatsForType(type: PlayerArchetypeType): PlayerStats {
        switch (type) {
            case PlayerArchetypeType.TANK:
                return {
                    maxHealth: 1000,
                    speed: 200,
                    damage: 150,
                    attackRange: 60,
                    attackSpeed: 2.0
                };
            case PlayerArchetypeType.GLASS_CANNON:
                return {
                    maxHealth: 400,
                    speed: 250,
                    damage: 225,
                    attackRange: 300,
                    attackSpeed: 4.0
                };
            case PlayerArchetypeType.EVASIVE:
                return {
                    maxHealth: 600,
                    speed: 400,
                    damage: 100,
                    attackRange: 150,
                    attackSpeed: 3.0
                };
        }
    }

    /**
     * Gets the archetype as a one-hot encoded vector for AI processing
     * @returns Array representing archetype [tank, glass_cannon, evasive]
     */
    public getArchetypeVector(): number[] {
        switch (this.type) {
            case PlayerArchetypeType.TANK:
                return [1, 0, 0];
            case PlayerArchetypeType.GLASS_CANNON:
                return [0, 1, 0];
            case PlayerArchetypeType.EVASIVE:
                return [0, 0, 1];
        }
    }

    /**
     * Applies damage to the player archetype
     * @param amount - Amount of damage to apply
     */
    public takeDamage(amount: number): void {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.lastDamageTime = Date.now();
    }

    /**
     * Records damage dealt by the player
     * @param amount - Amount of damage dealt
     */
    public dealDamage(amount: number): void {
        this.totalDamageDealt += amount;
    }

    /**
     * Updates the player's position and tracks movement history
     * @param x - New X coordinate
     * @param y - New Y coordinate
     */
    public updatePosition(x: number, y: number): void {
        this.position = { x, y };
        this.movementHistory.push({ x, y, time: Date.now() });
        
        // Keep only last 10 seconds of movement history
        const tenSecondsAgo = Date.now() - 10000;
        this.movementHistory = this.movementHistory.filter(entry => entry.time > tenSecondsAgo);
    }

    /**
     * Adds experience points to the player
     * @param amount - Amount of XP to gain
     */
    public gainXP(amount: number): void {
        this.xpGained += amount;
        this.lastXpTime = Date.now();
    }

    /**
     * Gets the current health as a percentage of maximum health
     * @returns Health percentage (0.0 to 1.0)
     */
    public getHealthPercentage(): number {
        return this.currentHealth / this.stats.maxHealth;
    }

    /**
     * Calculates damage per second over the last 10 seconds
     * @returns Average DPS over the last 10 seconds
     */
    public getDPSOverLastTenSeconds(): number {
        // This would need to be tracked more precisely in a real implementation
        return this.totalDamageDealt / 10; // Simplified calculation
    }

    /**
     * Calculates total movement distance over the last 10 seconds
     * @returns Total distance moved in pixels
     */
    public getMovementDistanceLastTenSeconds(): number {
        if (this.movementHistory.length < 2) return 0;
        
        let totalDistance = 0;
        for (let i = 1; i < this.movementHistory.length; i++) {
            const prev = this.movementHistory[i - 1];
            const curr = this.movementHistory[i];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        return totalDistance;
    }

    /**
     * Checks if damage was taken recently (within last 5 seconds)
     * @returns 1 if damage taken recently, 0 otherwise
     */
    public getDamageTakenRecently(): number {
        const fiveSecondsAgo = Date.now() - 5000;
        return this.lastDamageTime > fiveSecondsAgo ? 1 : 0; // Simplified: 1 if damaged recently, 0 if not
    }

    /**
     * Calculates experience point generation rate over the last 10 seconds
     * @returns XP per second rate
     */
    public getXPGenerationRate(): number {
        const tenSecondsAgo = Date.now() - 10000;
        return this.lastXpTime > tenSecondsAgo ? this.xpGained / 10 : 0;
    }
}