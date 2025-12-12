import { Scene } from 'phaser';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from './EnhancedDesignSystem';

export class ControlsUI {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private overlay: Phaser.GameObjects.Rectangle;
    private panel: Phaser.GameObjects.Container;
    private isVisible: boolean = false;
    private toggleButton: Phaser.GameObjects.Container;

    constructor(scene: Scene) {
        this.scene = scene;
        this.createUI();
    }

    private createUI(): void {
        const width = this.scene.scale.width;
        const height = this.scene.scale.height;

        // Container for the whole UI
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(2000); // Very high depth to sit on top of everything
        this.container.setScrollFactor(0);

        // 1. Toggle Button (HUD) - Always visible initially
        this.createToggleButton();

        // 2. Background Overlay (Darkens the game)
        this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.overlay.setInteractive(); // Blocks clicks to game
        this.container.add(this.overlay);

        // 3. Main Panel
        this.panel = this.scene.add.container(width / 2, height / 2);
        this.container.add(this.panel);

        // Panel Background (Paper/Parchment style)
        const panelWidth = 600;
        const panelHeight = 500;
        const bg = this.scene.add.graphics();
        EnhancedStyleHelpers.createBackground(bg, {
            width: panelWidth,
            height: panelHeight,
            color: 0x1a1a1a, // Dark stone background from DesignSystem
            alpha: 0.95,
            borderColor: 0xd4af37, // Gold border
            borderWidth: 4
        });
        // Center the background graphic within the panel container
        bg.setPosition(-panelWidth / 2, -panelHeight / 2);
        this.panel.add(bg);

        // Title
        const title = this.scene.add.text(0, -200, 'CONTROLS', EnhancedStyleHelpers.createTextStyle({
            size: 'title',
            color: EnhancedDesignSystem.colors.accent, // Gold
            fontFamily: 'primary', // Cinzel for title is fine
            fontStyle: 'bold'
        })).setOrigin(0.5);
        // Add shadow/stroke to title
        title.setStroke('#000000', 4);
        title.setShadow(2, 2, '#000000', 2, true, true);
        this.panel.add(title);

        // Controls List
        this.createControlsList();

        // Close Hint
        const closeHint = this.scene.add.text(0, 220, 'Press ESC to Resume', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: EnhancedDesignSystem.colors.textMuted,
            fontFamily: 'primary'
        })).setOrigin(0.5);
        this.panel.add(closeHint);

        // Initial State: Hidden
        this.setVisible(false);
    }

    private createToggleButton(): void {
        // Simple '?' button in top-right
        const x = this.scene.scale.width - 40;
        const y = 40;

        this.toggleButton = this.scene.add.container(x, y);
        this.toggleButton.setScrollFactor(0);
        this.toggleButton.setDepth(1999); // Below overlay but above game

        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x1a1a1a, 0.8);
        btnBg.lineStyle(2, 0xd4af37, 1);
        btnBg.fillCircle(0, 0, 20);
        btnBg.strokeCircle(0, 0, 20);

        const text = this.scene.add.text(0, 0, '?', {
            fontSize: '24px',
            color: '#d4af37',
            fontFamily: 'Cinzel, serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.toggleButton.add([btnBg, text]);

        // Interaction
        const hitArea = this.scene.add.circle(0, 0, 20);
        hitArea.setInteractive({ cursor: 'pointer' });
        this.toggleButton.add(hitArea);

        hitArea.on('pointerdown', () => {
            this.toggle();
        });

        // Hover effect
        hitArea.on('pointerover', () => {
            this.toggleButton.setScale(1.1);
            btnBg.clear();
            btnBg.fillStyle(0x333333, 0.9);
            btnBg.lineStyle(2, 0xffd700, 1);
            btnBg.fillCircle(0, 0, 20);
            btnBg.strokeCircle(0, 0, 20);
        });

        hitArea.on('pointerout', () => {
            this.toggleButton.setScale(1.0);
            btnBg.clear();
            btnBg.fillStyle(0x1a1a1a, 0.8);
            btnBg.lineStyle(2, 0xd4af37, 1);
            btnBg.fillCircle(0, 0, 20);
            btnBg.strokeCircle(0, 0, 20);
        });
    }

    private createControlsList(): void {
        const controls = [
            { key: 'WASD', action: 'Move Movement' },
            { key: 'Mouse', action: 'Aim Cursor' },
            { key: 'LMB', action: 'Basic Attack / Interact' },
            { key: 'Q / E', action: 'Use Skills' },
            { key: 'Space', action: 'Dash / Dodge' },
            { key: 'T', action: 'Open Skill Tree' },
            { key: 'ESC', action: 'Pause / Exit Menu' }
        ];

        let startY = -140;
        const spacing = 50;

        controls.forEach((control, index) => {
            const y = startY + (index * spacing);

            // Key (Left side, Gold)
            const keyText = this.scene.add.text(-250, y, control.key, EnhancedStyleHelpers.createTextStyle({
                size: 'lg',
                color: EnhancedDesignSystem.colors.accent,
                fontFamily: 'primary', // Cinzel looks good for keys
                fontStyle: 'bold'
            })).setOrigin(0, 0.5);

            // Add stroke to key for pop
            keyText.setStroke('#000000', 3);

            // Action (Right side, Readable Font)
            const actionText = this.scene.add.text(50, y, control.action, {
                fontFamily: EnhancedDesignSystem.fontFamily.readable, // Georgia/Times
                fontSize: '22px', // Comfortable size
                color: EnhancedDesignSystem.colors.text,
                fontStyle: 'normal'
            }).setOrigin(0, 0.5);

            // Dotted leader line
            const line = this.scene.add.graphics();
            line.lineStyle(2, 0x5d4e37, 0.3); // Faded brown
            line.beginPath();
            // Draw dots manually or just a straight line
            line.moveTo(keyText.x + keyText.width + 20, y);
            line.lineTo(actionText.x - 20, y);
            line.strokePath();

            this.panel.add([keyText, actionText, line]);
        });
    }

    public toggle(): void {
        this.setVisible(!this.isVisible);
    }

    public setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.container.setVisible(visible);

        // Notify scene to pause/resume game
        // We do this by emitting an event or calling a callback
        // For simplicity, we can access the game scene directly if we know it
        const gameScene = this.scene.game.scene.getScene('Game');
        if (gameScene) {
            if (visible) {
                this.scene.game.scene.pause('Game');
                console.log('Game Paused');
            } else {
                this.scene.game.scene.resume('Game');
                console.log('Game Resumed');
            }
        }
    }

    public isOpen(): boolean {
        return this.isVisible;
    }
}
