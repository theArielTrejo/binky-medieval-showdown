import { Scene } from 'phaser';
import { EnemyType } from '../game/EnemySystem';

/**
 * Debug UI for spawning enemies during testing
 * Provides buttons to spawn specific enemy types on demand
 */
export class EnemySpawnerUI {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private buttons: Map<EnemyType, Phaser.GameObjects.Container> = new Map();
    private visible: boolean = false; // Start hidden - use hotkeys instead
    private onSpawnCallback: ((type: EnemyType, x: number, y: number) => void) | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.container = scene.add.container(20, 20);
        this.container.setDepth(1000); // Above everything
        this.container.setVisible(false); // Start hidden
        
        this.createUI();
        this.container.setScrollFactor(0); // Fixed to camera - doesn't move with world
    }

    private createUI(): void {
        const offsetX = 10; // Padding from left
        const offsetY = 10; // Padding from top
        
        // Title
        const title = this.scene.add.text(offsetX, offsetY, 'ENEMY SPAWNER', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.container.add(title);

        // Instructions
        const instructions = this.scene.add.text(offsetX, offsetY + 30, 'Click to spawn at cursor', {
            fontSize: '12px',
            color: '#aaaaaa',
            backgroundColor: '#000000',
            padding: { x: 8, y: 2 }
        });
        this.container.add(instructions);

        // Enemy type buttons
        const enemyTypes = [
            { type: EnemyType.SKELETON_VIKING, name: 'Skeleton Viking', color: 0x8844ff },
            { type: EnemyType.OGRE, name: 'Ogre', color: 0x888888 },
            { type: EnemyType.ARCHER, name: 'Archer', color: 0x44ff44 },
            { type: EnemyType.GNOLL, name: 'Gnoll', color: 0xff8844 },
            { type: EnemyType.SKELETON_PIRATE, name: 'Skeleton Pirate', color: 0x00cccc },
            { type: EnemyType.ELEMENTAL_SPIRIT, name: 'Elemental Spirit', color: 0xff6600 },
            { type: EnemyType.LIGHTNING_MAGE, name: 'Lightning Mage', color: 0x66ddff }
        ];

        let yOffset = offsetY + 60;
        enemyTypes.forEach(enemy => {
            const button = this.createButton(enemy.name, enemy.color, offsetX, yOffset, () => {
                this.spawnEnemyAtCursor(enemy.type);
            });
            this.buttons.set(enemy.type, button);
            this.container.add(button);
            yOffset += 40;
        });

        // Toggle visibility button
        const toggleButton = this.createButton('Toggle UI (T)', 0x444444, offsetX, yOffset + 10, () => {
            this.toggleVisibility();
        });
        this.container.add(toggleButton);

        // Add keyboard shortcut to toggle
        this.scene.input.keyboard?.on('keydown-T', () => {
            this.toggleVisibility();
        });

        // Keyboard shortcuts for quick spawning
        this.scene.input.keyboard?.on('keydown-ONE', () => this.spawnEnemyAtCursor(EnemyType.SKELETON_VIKING));
        this.scene.input.keyboard?.on('keydown-TWO', () => this.spawnEnemyAtCursor(EnemyType.OGRE));
        this.scene.input.keyboard?.on('keydown-THREE', () => this.spawnEnemyAtCursor(EnemyType.ARCHER));
        this.scene.input.keyboard?.on('keydown-FOUR', () => this.spawnEnemyAtCursor(EnemyType.GNOLL));
        this.scene.input.keyboard?.on('keydown-FIVE', () => this.spawnEnemyAtCursor(EnemyType.SKELETON_PIRATE));
        this.scene.input.keyboard?.on('keydown-SIX', () => this.spawnEnemyAtCursor(EnemyType.ELEMENTAL_SPIRIT));
        this.scene.input.keyboard?.on('keydown-SEVEN', () => this.spawnEnemyAtCursor(EnemyType.LIGHTNING_MAGE));

        // Add hotkey hints
        const hotkeys = this.scene.add.text(offsetX, yOffset + 50, 'Hotkeys: 1-7 to spawn\nT to toggle UI', {
            fontSize: '11px',
            color: '#888888',
            backgroundColor: '#000000',
            padding: { x: 6, y: 2 }
        });
        this.container.add(hotkeys);
    }

    private createButton(
        text: string,
        color: number,
        x: number,
        y: number,
        onClick: () => void
    ): Phaser.GameObjects.Container {
        const buttonContainer = this.scene.add.container(x, y);

        // Background
        const bg = this.scene.add.rectangle(0, 0, 180, 30, color, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.8);
        bg.setInteractive({ useHandCursor: true });
        
        // Text
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        label.setOrigin(0.5);

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(color, 1);
            bg.setScale(1.05);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(color, 0.8);
            bg.setScale(1);
        });

        bg.on('pointerdown', () => {
            bg.setScale(0.95);
        });

        bg.on('pointerup', () => {
            bg.setScale(1.05);
            onClick();
        });

        buttonContainer.add([bg, label]);
        return buttonContainer;
    }

    private spawnEnemyAtCursor(type: EnemyType): void {
        if (!this.onSpawnCallback) {
            console.warn('No spawn callback set!');
            return;
        }

        // Get cursor position in world coordinates
        const pointer = this.scene.input.activePointer;
        const camera = this.scene.cameras.main;
        const worldX = pointer.x + camera.scrollX;
        const worldY = pointer.y + camera.scrollY;

        console.log(`Spawning ${type} at (${worldX.toFixed(0)}, ${worldY.toFixed(0)})`);
        this.onSpawnCallback(type, worldX, worldY);

        // Visual feedback
        this.createSpawnEffect(worldX, worldY);
    }

    private createSpawnEffect(x: number, y: number): void {
        // Create a brief visual effect where the enemy will spawn
        const circle = this.scene.add.circle(x, y, 30, 0xffffff, 0.5);
        circle.setDepth(999);

        this.scene.tweens.add({
            targets: circle,
            alpha: 0,
            scale: 2,
            duration: 500,
            onComplete: () => circle.destroy()
        });
    }

    private toggleVisibility(): void {
        this.visible = !this.visible;
        this.container.setVisible(this.visible);
        console.log(`Enemy Spawner UI ${this.visible ? 'shown' : 'hidden'}`);
    }

    /**
     * Set the callback function that will be called when spawning an enemy
     */
    public setSpawnCallback(callback: (type: EnemyType, x: number, y: number) => void): void {
        this.onSpawnCallback = callback;
    }

    /**
     * Show the UI
     */
    public show(): void {
        this.visible = true;
        this.container.setVisible(true);
    }

    /**
     * Hide the UI
     */
    public hide(): void {
        this.visible = false;
        this.container.setVisible(false);
    }

    /**
     * Destroy the UI
     */
    public destroy(): void {
        this.container.destroy();
        this.buttons.clear();
    }
}

