import { Scene } from 'phaser';
import { EnemyType } from '../game/systems/EnemySystem';

/**
 * Enhanced UI for spawning mobs with improved visual design and user experience
 * Provides intuitive buttons to spawn specific mob types with visual feedback
 */
export class MobSpawnerUI {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private buttons: Map<EnemyType, Phaser.GameObjects.Container> = new Map();
    private visible: boolean = false; // Start hidden for better UX
    private onSpawnCallback: ((type: EnemyType, x: number, y: number) => void) | null = null;
    private headerText: Phaser.GameObjects.Text;
    private toggleButton: Phaser.GameObjects.Container;
    private toggleHint: Phaser.GameObjects.Container;
    private keyHandlers: { [evt: string]: Function } = {};
    private keyT?: Phaser.Input.Keyboard.Key;

    constructor(scene: Scene) {
        this.scene = scene;
        this.container = scene.add.container(20, 20);
        this.container.setDepth(1000); // Above everything
        this.container.setScrollFactor(0); // Fixed to camera
        const zoom = this.scene.cameras.main.zoom || 1;
        if (zoom !== 1) {
            this.container.setScale(1 / zoom);
        }

        this.createUI();
        this.createToggleHint();
        this.setupKeyboardShortcuts();

        this.container.setScrollFactor(0); // Fixed to camera

        // Default: hidden (toggled off)
        this.container.setVisible(false);
        if (this.toggleHint) {
            this.toggleHint.setVisible(true);
            if (zoom !== 1) {
                this.toggleHint.setScale(1 / zoom);
            }
        }
    }

    private createUI(): void {
        const panelWidth = 220;
        const panelHeight = 565; // Increased to fit 7 buttons

        // Create main panel background with enhanced styling
        const panelBg = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95);
        panelBg.setStrokeStyle(2, 0x4a90e2, 0.8);
        panelBg.setOrigin(0, 0);
        this.container.add(panelBg);

        // Header with gradient-like effect
        const headerBg = this.scene.add.rectangle(0, 0, panelWidth, 40, 0x4a90e2, 0.9);
        headerBg.setOrigin(0, 0);
        this.container.add(headerBg);

        this.headerText = this.scene.add.text(panelWidth / 2, 20, '⚔️ MOB SPAWNER', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.headerText.setOrigin(0.5);
        this.container.add(this.headerText);

        // Instructions with better styling
        const instructions = this.scene.add.text(10, 50, 'Click to spawn at cursor\nHotkeys: 1-7, M to toggle', {
            fontSize: '11px',
            color: '#cccccc',
            fontFamily: 'Arial',
            lineSpacing: 2
        });
        this.container.add(instructions);

        // Enhanced mob type buttons with icons and better colors
        const mobTypes = [
            {
                type: EnemyType.SKELETON_VIKING,
                name: '🛡️ Skeleton Viking',
                color: 0x8844ff,
                description: 'Shield & Cone Attack'
            },
            {
                type: EnemyType.OGRE,
                name: '🗿 Ogre',
                color: 0x888888,
                description: 'Heavy Melee'
            },
            {
                type: EnemyType.ARCHER,
                name: '🏹 Archer',
                color: 0x44ff44,
                description: 'Ranged Projectiles'
            },
            {
                type: EnemyType.GNOLL,
                name: '🐺 Gnoll',
                color: 0xff8844,
                description: 'Fast Melee'
            },
            {
                type: EnemyType.SKELETON_PIRATE,
                name: '🏴‍☠️ Skeleton Pirate',
                color: 0x00cccc,
                description: 'Vortex & Slow'
            },
            {
                type: EnemyType.ELEMENTAL_SPIRIT,
                name: '🔥 Elemental Spirit',
                color: 0xff6600,
                description: 'Explosive Suicide'
            },
            {
                type: EnemyType.LIGHTNING_MAGE,
                name: '⚡ Lightning Mage',
                color: 0x66ddff,
                description: 'AOE Lightning Strike'
            }
        ];

        let yOffset = 85;
        mobTypes.forEach((mob, index) => {
            const button = this.createEnhancedButton(
                mob.name,
                mob.description,
                mob.color,
                10,
                yOffset,
                () => this.spawnMobAtCursor(mob.type),
                index + 1
            );
            this.buttons.set(mob.type, button);
            this.container.add(button);
            yOffset += 45;
        });

        // Enhanced toggle button
        this.toggleButton = this.createToggleButton(10, yOffset + 10);
        this.container.add(this.toggleButton);

        // Spawn counter and info
        const infoText = this.scene.add.text(10, yOffset + 55, 'Max: 50 mobs\nSpawn at cursor position', {
            fontSize: '10px',
            color: '#999999',
            fontFamily: 'Arial',
            lineSpacing: 2
        });
        this.container.add(infoText);
    }

    private createEnhancedButton(
        name: string,
        description: string,
        color: number,
        x: number,
        y: number,
        onClick: () => void,
        hotkey: number
    ): Phaser.GameObjects.Container {
        const buttonContainer = this.scene.add.container(x, y);
        const buttonWidth = 200;
        const buttonHeight = 35;

        // Main button background with gradient effect
        const bg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, color, 0.8);
        bg.setStrokeStyle(1, 0xffffff, 0.3);
        bg.setOrigin(0, 0);
        bg.setInteractive({ useHandCursor: true });

        // Button text
        const nameText = this.scene.add.text(8, 8, name, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });

        // Description text
        const descText = this.scene.add.text(8, 22, description, {
            fontSize: '9px',
            color: '#dddddd',
            fontFamily: 'Arial'
        });

        // Hotkey indicator
        const hotkeyText = this.scene.add.text(buttonWidth - 8, 8, `[${hotkey}]`, {
            fontSize: '10px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        hotkeyText.setOrigin(1, 0);

        // Enhanced hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(color, 1);
            bg.setStrokeStyle(2, 0xffffff, 0.8);
            buttonContainer.setScale(1.02);

            // Add glow effect
            this.scene.tweens.add({
                targets: bg,
                alpha: 0.9,
                duration: 100,
                yoyo: true,
                repeat: -1
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(color, 0.8);
            bg.setStrokeStyle(1, 0xffffff, 0.3);
            buttonContainer.setScale(1);

            // Remove glow effect
            this.scene.tweens.killTweensOf(bg);
            bg.setAlpha(1);
        });

        bg.on('pointerdown', () => {
            buttonContainer.setScale(0.98);
        });

        bg.on('pointerup', () => {
            buttonContainer.setScale(1.02);
            onClick();
            this.createClickFeedback(x + buttonWidth / 2, y + buttonHeight / 2);
        });

        buttonContainer.add([bg, nameText, descText, hotkeyText]);
        return buttonContainer;
    }

    private createToggleButton(x: number, y: number): Phaser.GameObjects.Container {
        const buttonContainer = this.scene.add.container(x, y);
        const buttonWidth = 200;
        const buttonHeight = 30;

        const bg = this.scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x444444, 0.8);
        bg.setStrokeStyle(1, 0xffffff, 0.5);
        bg.setOrigin(0, 0);
        bg.setInteractive({ useHandCursor: true });

        const text = this.scene.add.text(buttonWidth / 2, buttonHeight / 2, '👁️ Toggle UI [M]', {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x666666, 1);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x444444, 0.8);
        });

        bg.on('pointerup', () => {
            this.toggleVisibility();
        });

        buttonContainer.add([bg, text]);
        return buttonContainer;
    }

    private setupKeyboardShortcuts(): void {
        const kb = this.scene.input.keyboard;
        if (!kb) return;

        const handler = (evt: KeyboardEvent) => {
            const code = evt.code || '';
            const key = (evt.key || '').toLowerCase();
            // Toggle
            if (code === 'KeyM' || key === 'm') {
                this.toggleVisibility();
                return;
            }
            // Number keys 1-6
            if (code === 'Digit1' || key === '1') {
                this.spawnMobAtCursor(EnemyType.SKELETON_VIKING);
                return;
            }
            if (code === 'Digit2' || key === '2') {
                this.spawnMobAtCursor(EnemyType.OGRE);
                return;
            }
            if (code === 'Digit3' || key === '3') {
                this.spawnMobAtCursor(EnemyType.ARCHER);
                return;
            }
            if (code === 'Digit4' || key === '4') {
                this.spawnMobAtCursor(EnemyType.GNOLL);
                return;
            }
            if (code === 'Digit5' || key === '5') {
                this.spawnMobAtCursor(EnemyType.SKELETON_PIRATE);
                return;
            }
            if (code === 'Digit6' || key === '6') {
                this.spawnMobAtCursor(EnemyType.ELEMENTAL_SPIRIT);
                return;
            }
            if (code === 'Digit7' || key === '7') {
                this.spawnMobAtCursor(EnemyType.LIGHTNING_MAGE);
                return;
            }
        };
        this.keyHandlers['keydown'] = handler;
        kb.on('keydown', handler);

        // Dedicated T key binding to avoid event edge cases
        this.keyT = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T, true);
        const tDown = () => this.toggleVisibility();
        this.keyHandlers['tDown'] = tDown;
        this.keyT.on('down', tDown);
    }

    private spawnMobAtCursor(type: EnemyType): void {
        if (!this.onSpawnCallback) {
            console.warn('No spawn callback set!');
            return;
        }

        // Get cursor position in world coordinates
        const pointer = this.scene.input.activePointer;
        const camera = this.scene.cameras.main;
        const worldX = pointer.x + camera.scrollX;
        const worldY = pointer.y + camera.scrollY;

        console.log(`🎯 Spawning ${type} at (${worldX.toFixed(0)}, ${worldY.toFixed(0)})`);
        this.onSpawnCallback(type, worldX, worldY);

        // Enhanced visual feedback
        this.createSpawnEffect(worldX, worldY, type);
    }

    private createSpawnEffect(x: number, y: number, type: EnemyType): void {
        // Create multiple visual effects for better feedback

        // Main spawn circle
        const circle = this.scene.add.circle(x, y, 25, 0xffffff, 0.8);
        circle.setDepth(999);
        circle.setStrokeStyle(3, 0x4a90e2, 1);

        // Inner pulse
        const innerCircle = this.scene.add.circle(x, y, 10, 0x4a90e2, 0.6);
        innerCircle.setDepth(1000);

        // Spawn text
        const spawnText = this.scene.add.text(x, y - 40, `${type}`, {
            fontSize: '12px',
            color: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 6, y: 3 }
        });
        spawnText.setOrigin(0.5);
        spawnText.setDepth(1001);

        // Animate effects
        this.scene.tweens.add({
            targets: circle,
            alpha: 0,
            scale: 3,
            duration: 600,
            ease: 'Power2',
            onComplete: () => circle.destroy()
        });

        this.scene.tweens.add({
            targets: innerCircle,
            alpha: 0,
            scale: 2,
            duration: 400,
            ease: 'Power2',
            onComplete: () => innerCircle.destroy()
        });

        this.scene.tweens.add({
            targets: spawnText,
            alpha: 0,
            y: y - 60,
            duration: 800,
            ease: 'Power2',
            onComplete: () => spawnText.destroy()
        });
    }

    private createClickFeedback(x: number, y: number): void {
        // Small click feedback effect
        const feedback = this.scene.add.circle(x, y, 5, 0xffffff, 0.8);
        feedback.setDepth(1002);

        this.scene.tweens.add({
            targets: feedback,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => feedback.destroy()
        });
    }

    private createToggleHint(): void {
        // Create a small hint that shows when the UI is hidden
        this.toggleHint = this.scene.add.container(20, this.scene.scale.height - 60);
        this.toggleHint.setDepth(999);
        this.toggleHint.setScrollFactor(0);

        // Background for the hint
        const hintBg = this.scene.add.rectangle(0, 0, 140, 30, 0x1a1a1a, 0.8);
        hintBg.setStrokeStyle(1, 0x4a90e2, 0.6);
        hintBg.setOrigin(0, 0);

        // Hint text
        const hintText = this.scene.add.text(70, 15, 'Press T for Mob Spawner', {
            fontSize: '10px',
            color: '#cccccc',
            fontFamily: 'Arial'
        });
        hintText.setOrigin(0.5);

        this.toggleHint.add([hintBg, hintText]);
        this.toggleHint.setVisible(!this.visible); // Show hint when UI is hidden

        // Keep hint anchored on resize
        this.scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.toggleHint.setY(gameSize.height - 60);
        });
    }

    private toggleVisibility(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }

        console.log(`🎮 Mob Spawner UI ${this.visible ? 'shown' : 'hidden'}`);
    }

    /**
     * Set the callback function that will be called when spawning a mob
     */
    public setSpawnCallback(callback: (type: EnemyType, x: number, y: number) => void): void {
        this.onSpawnCallback = callback;
    }

    /**
     * Show the UI with animation
     */
    public show(): void {
        this.visible = true;
        this.container.setVisible(true);
        this.container.setAlpha(0);
        this.toggleHint.setVisible(false);

        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    /**
     * Hide the UI with animation
     */
    public hide(): void {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.visible = false;
                this.container.setVisible(false);
                this.toggleHint.setVisible(true);
            }
        });
    }

    /**
     * Destroy the UI and clean up resources
     */
    public destroy(): void {
        // Unregister keyboard handlers
        const kb = this.scene.input.keyboard;
        if (kb) {
            Object.entries(this.keyHandlers).forEach(([evt, fn]) => kb.off(evt, fn));
            this.keyHandlers = {};
            if (this.keyT) {
                this.keyT.off('down');
                this.keyT.destroy();
                this.keyT = undefined;
            }
        }
        // Destroy containers
        if (this.toggleHint) this.toggleHint.destroy();
        this.container.destroy();
        this.buttons.clear();
    }

    /**
     * Get current visibility state
     */
    public isVisible(): boolean {
        return this.visible;
    }
}
