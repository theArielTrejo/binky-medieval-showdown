import { Scene } from 'phaser';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';
import { AudioManager } from '../systems/AudioManager';

export class Settings extends Scene {
    private volumeSlider!: Phaser.GameObjects.Rectangle;
    private volumeHandle!: Phaser.GameObjects.Arc;
    private volumeText!: Phaser.GameObjects.Text;
    private currentVolume: number = 0.03;

    constructor() {
        super('Settings');
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const audio = AudioManager.getInstance();
        audio.init(this);

        // Dark overlay background (matching ControlsUI style)
        const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
        overlay.setOrigin(0.5).setDepth(10).setScrollFactor(0);
        overlay.setInteractive(); // Block clicks to background

        // Main Panel Container
        const panel = this.add.container(centerX, centerY);
        panel.setDepth(100).setScrollFactor(0);

        // Panel Background (Paper/Parchment style matching ControlsUI)
        const panelWidth = 600;
        const panelHeight = 500;
        const bg = this.add.graphics();
        EnhancedStyleHelpers.createBackground(bg, {
            width: panelWidth,
            height: panelHeight,
            color: 0x1a1a1a, // Dark stone background
            alpha: 0.95,
            borderColor: 0xd4af37, // Gold border
            borderWidth: 4
        });
        bg.setPosition(-panelWidth / 2, -panelHeight / 2);
        panel.add(bg);

        // Title (matching ControlsUI style)
        const title = this.add.text(0, -200, 'SETTINGS', EnhancedStyleHelpers.createTextStyle({
            size: 'title',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        title.setOrigin(0.5);
        title.setStroke('#000000', 4);
        title.setShadow(2, 2, '#000000', 2, true, true);
        panel.add(title);

        // Get current volume from localStorage or menu music
        const menuMusic = this.sound.get('menu-music');
        const savedVolume = localStorage.getItem('menuMusicVolume');
        if (savedVolume !== null) {
            this.currentVolume = parseFloat(savedVolume);
        } else {
            if (menuMusic) {
                this.currentVolume = (menuMusic as any).volume || 0.03;
            }
        }

        // Volume label (matching ControlsUI list style)
        const volumeLabel = this.add.text(-250, -50, 'Menu Music', EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        volumeLabel.setOrigin(0, 0.5);
        volumeLabel.setStroke('#000000', 3);
        panel.add(volumeLabel);

        // Volume slider background (centered in right area)
        const sliderWidth = 250;
        const sliderHeight = 10;
        const sliderStartX = -50; // Center position for slider
        this.volumeSlider = this.add.rectangle(sliderStartX + sliderWidth/2, -50, sliderWidth, sliderHeight, 0x555555);
        this.volumeSlider.setOrigin(0.5);
        panel.add(this.volumeSlider);

        // Volume slider handle
        const handleX = sliderStartX + (this.currentVolume * sliderWidth);
        this.volumeHandle = this.add.circle(handleX, -50, 15, 0xd4af37); // Gold to match border
        this.volumeHandle.setOrigin(0.5);
        this.volumeHandle.setInteractive({ draggable: true, useHandCursor: true });
        panel.add(this.volumeHandle);

        // Volume percentage text (using readable font like ControlsUI)
        this.volumeText = this.add.text(220, -50, `${Math.round(this.currentVolume * 100)}%`, {
            fontFamily: EnhancedDesignSystem.fontFamily.readable,
            fontSize: '22px',
            color: EnhancedDesignSystem.colors.text,
            fontStyle: 'normal'
        });
        this.volumeText.setOrigin(0, 0.5);
        panel.add(this.volumeText);

        // Handle dragging (use panel-relative coordinates)
        const sliderLeft = sliderStartX;
        const sliderRight = sliderStartX + sliderWidth;

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (gameObject === this.volumeHandle) {
                // Convert pointer to panel local coordinates
                const localX = pointer.x - centerX;
                const clampedX = Phaser.Math.Clamp(localX, sliderLeft, sliderRight);
                
                this.volumeHandle.x = clampedX;
                
                // Calculate volume (0 to 1)
                this.currentVolume = (clampedX - sliderLeft) / sliderWidth;
                this.volumeText.setText(`${Math.round(this.currentVolume * 100)}%`);
                
                // Save to localStorage
                localStorage.setItem('menuMusicVolume', this.currentVolume.toString());
                
                // Apply volume to menu music
                if (menuMusic) {
                    (menuMusic as any).setVolume(this.currentVolume);
                }
            }
        });

        // Close hint (matching ControlsUI style)
        const closeHint = this.add.text(0, 220, 'Click BACK to return', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: EnhancedDesignSystem.colors.textMuted,
            fontFamily: 'primary'
        }));
        closeHint.setOrigin(0.5);
        panel.add(closeHint);

        // Back button (styled to match)
        const backButton = this.add.text(0, 180, '← BACK', EnhancedStyleHelpers.createTextStyle({
            size: 'xl',
            color: EnhancedDesignSystem.colors.text,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        backButton.setFontSize(28);
        backButton.setStroke('#000000', 4);
        backButton.setOrigin(0.5);
        backButton.setInteractive({ useHandCursor: true });
        panel.add(backButton);

        backButton.on('pointerdown', () => {
            // UI click sound
            audio.playSFX('ui-button-click', { volume: 0.25 });

            console.log('Back to menu');
            this.scene.stop('Settings');
            this.scene.resume('Menu');
        });

        backButton.on('pointerover', () => {
            backButton.setColor(EnhancedDesignSystem.colors.accent);
            backButton.setScale(1.1);
        });

        backButton.on('pointerout', () => {
            backButton.setColor(EnhancedDesignSystem.colors.text);
            backButton.setScale(1);
        });
    }
}
