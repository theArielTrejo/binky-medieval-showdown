export enum PlayerArchetypeType {
    TANK = 'tank',
    GLASS_CANNON = 'glass_cannon',
    EVASIVE = 'evasive'
}

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
                    maxHealth: 200,
                    speed: 100,
                    damage: 25,
                    attackRange: 80,
                    attackSpeed: 1.0
                };
            case PlayerArchetypeType.GLASS_CANNON:
                return {
                    maxHealth: 50,
                    speed: 150,
                    damage: 60,
                    attackRange: 200,
                    attackSpeed: 2.0
                };
            case PlayerArchetypeType.EVASIVE:
                return {
                    maxHealth: 100,
                    speed: 250,
                    damage: 35,
                    attackRange: 120,
                    attackSpeed: 1.5
                };
        }
    }

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

    public takeDamage(amount: number): void {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.lastDamageTime = Date.now();
    }

    public dealDamage(amount: number): void {
        this.totalDamageDealt += amount;
    }

    public updatePosition(x: number, y: number): void {
        this.position = { x, y };
        this.movementHistory.push({ x, y, time: Date.now() });
        
        // Keep only last 10 seconds of movement history
        const tenSecondsAgo = Date.now() - 10000;
        this.movementHistory = this.movementHistory.filter(entry => entry.time > tenSecondsAgo);
    }

    public gainXP(amount: number): void {
        this.xpGained += amount;
        this.lastXpTime = Date.now();
    }

    public getHealthPercentage(): number {
        return this.currentHealth / this.stats.maxHealth;
    }

    public getDPSOverLastTenSeconds(): number {
        // This would need to be tracked more precisely in a real implementation
        return this.totalDamageDealt / 10; // Simplified calculation
    }

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

    public getDamageTakenRecently(): number {
        const fiveSecondsAgo = Date.now() - 5000;
        return this.lastDamageTime > fiveSecondsAgo ? 1 : 0; // Simplified: 1 if damaged recently, 0 if not
    }

    public getXPGenerationRate(): number {
        const tenSecondsAgo = Date.now() - 10000;
        return this.lastXpTime > tenSecondsAgo ? this.xpGained / 10 : 0;
    }
}