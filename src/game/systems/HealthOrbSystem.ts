import { Scene } from 'phaser';
import { HealthOrb } from '../objects/HealthOrb';

export const HEALTH_ORB_CONSTANTS = {
    DROP_CHANCE: 0.25,        // 25% chance to drop
    HEAL_AMOUNT: 15,          // HP restored per orb
    COLLECTION_RANGE: 80,     // Magnetize range
    PICKUP_RANGE: 25,         // Actual collection range
    MAX_ORBS: 50,             // Maximum orbs on screen
    SPAWN_DISTANCE_MIN: 15,
    SPAWN_DISTANCE_MAX: 35,
};

export class HealthOrbSystem {
    private scene: Scene;
    private orbsGroup: Phaser.GameObjects.Group;
    private collectionRange: number = HEALTH_ORB_CONSTANTS.COLLECTION_RANGE;

    constructor(scene: Scene) {
        this.scene = scene;
        this.orbsGroup = this.scene.add.group({
            classType: HealthOrb,
            maxSize: HEALTH_ORB_CONSTANTS.MAX_ORBS,
            runChildUpdate: true
        });
    }

    /**
     * Attempt to spawn a health orb at the given position
     * @returns true if orb was spawned, false if drop chance failed
     */
    public trySpawnHealthOrb(x: number, y: number): boolean {
        // 25% drop chance
        if (Math.random() > HEALTH_ORB_CONSTANTS.DROP_CHANCE) {
            return false;
        }

        this.spawnHealthOrb(x, y);
        return true;
    }

    public spawnHealthOrb(x: number, y: number): void {
        const orb = this.orbsGroup.get() as HealthOrb;

        if (orb) {
            // Random offset from death location
            const angle = Math.random() * Math.PI * 2;
            const distance = Phaser.Math.Between(
                HEALTH_ORB_CONSTANTS.SPAWN_DISTANCE_MIN,
                HEALTH_ORB_CONSTANTS.SPAWN_DISTANCE_MAX
            );

            const orbX = x + Math.cos(angle) * distance;
            const orbY = y + Math.sin(angle) * distance;

            orb.launch(orbX, orbY, HEALTH_ORB_CONSTANTS.HEAL_AMOUNT);
        }
    }

    public collectOrbs(playerX: number, playerY: number, onHealthCollected: (health: number) => void): number {
        let totalHealthCollected = 0;
        let collectedThisFrame = 0;
        const MAX_COLLECTIONS_PER_FRAME = 3;
        const MAGNET_SPEED = 300;

        this.orbsGroup.getChildren().forEach(orbGO => {
            const orb = orbGO as HealthOrb;
            if (!orb.active || orb.isOrbCollected()) return;

            const dist = Phaser.Math.Distance.Between(orb.x, orb.y, playerX, playerY);

            // Magnetize if in range
            if (dist <= this.collectionRange) {
                orb.magnetize(playerX, playerY, MAGNET_SPEED);
            }

            // Collect if close enough
            if (dist <= HEALTH_ORB_CONSTANTS.PICKUP_RANGE) {
                if (collectedThisFrame < MAX_COLLECTIONS_PER_FRAME) {
                    const healValue = orb.getHealValue();
                    totalHealthCollected += healValue;
                    collectedThisFrame++;

                    // Create collection effect
                    this.createCollectionEffect(orb.x, orb.y, healValue);

                    orb.collect(() => {
                        onHealthCollected(healValue);
                    });
                } else {
                    orb.magnetize(playerX, playerY, MAGNET_SPEED);
                }
            }
        });

        return totalHealthCollected;
    }

    private createCollectionEffect(x: number, y: number, amount: number): void {
        // Floating +HP text
        const text = this.scene.add.text(x, y - 10, `+${amount}`, {
            fontSize: '12px',
            color: '#ff4444',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        this.scene.tweens.add({
            targets: text,
            y: y - 40,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });

        // Small red particles
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const particle = this.scene.add.circle(x, y, 3, 0xff4444, 0.8);
            particle.setDepth(999);

            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 20,
                y: y + Math.sin(angle) * 20,
                alpha: 0,
                scale: 0.5,
                duration: 300,
                onComplete: () => particle.destroy()
            });
        }
    }

    public getOrbCount(): number {
        return this.orbsGroup.countActive(true);
    }

    public clearAllOrbs(): void {
        if (!this.orbsGroup || !this.orbsGroup.children) return;
        this.orbsGroup.getChildren().forEach(orbGO => {
            const orb = orbGO as HealthOrb;
            if (orb.active) {
                orb.kill();
            }
        });
    }

    public update(): void {
        // Orbs are auto-updated by Phaser's group system
    }
}

