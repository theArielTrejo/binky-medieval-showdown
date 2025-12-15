import { Scene } from 'phaser';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';
import { AudioManager } from '../systems/AudioManager';

export class Settings extends Scene {
    private volumeSlider!: Phaser.GameObjects.Rectangle;
    private volumeHandle!: Phaser.GameObjects.Arc;
    private volumeText!: Phaser.GameObjects.Text;
    private currentVolume: number = 0.03;
    private fromGame: boolean = false;

    constructor() {
        super('Settings');
    }

    init(data: { fromGame?: boolean }): void {
        this.fromGame = data?.fromGame ?? false;
    }

    create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const centerX = width / 2;
        const centerY = height / 2;

        const audio = AudioManager.getInstance();
        audio.init(this);

        // Dark overlay background
        const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.7);
        overlay.setOrigin(0.5).setDepth(10).setScrollFactor(0);
        overlay.setInteractive();

        // Main Panel Container
        const panel = this.add.container(centerX, centerY);
        panel.setDepth(100).setScrollFactor(0);

        // Panel Background (taller to fit both sections)
        const panelWidth = 650;
        const panelHeight = 600;
        const bg = this.add.graphics();
        EnhancedStyleHelpers.createBackground(bg, {
            width: panelWidth,
            height: panelHeight,
            color: 0x1a1a1a,
            alpha: 0.95,
            borderColor: 0xd4af37,
            borderWidth: 4
        });
        bg.setPosition(-panelWidth / 2, -panelHeight / 2);
        panel.add(bg);

        // Title
        const title = this.add.text(0, -260, 'SETTINGS & CONTROLS', EnhancedStyleHelpers.createTextStyle({
            size: 'title',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        title.setOrigin(0.5);
        title.setStroke('#000000', 4);
        title.setShadow(2, 2, '#000000', 2, true, true);
        panel.add(title);

        // --- AUDIO SECTION ---
        const audioHeader = this.add.text(-280, -190, '🔊 Audio', EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        audioHeader.setOrigin(0, 0.5);
        audioHeader.setStroke('#000000', 3);
        panel.add(audioHeader);

        // Divider line
        const divider1 = this.add.graphics();
        divider1.lineStyle(1, 0xd4af37, 0.5);
        divider1.lineBetween(-280, -165, 280, -165);
        panel.add(divider1);

        // Get current volume
        const menuMusic = this.sound.get('menu-music');
        const savedVolume = localStorage.getItem('menuMusicVolume');
        if (savedVolume !== null) {
            this.currentVolume = parseFloat(savedVolume);
        } else if (menuMusic) {
            this.currentVolume = (menuMusic as any).volume || 0.03;
        }

        // Volume label
        const volumeLabel = this.add.text(-280, -130, 'Music Volume', {
            fontFamily: EnhancedDesignSystem.fontFamily.readable,
            fontSize: '20px',
            color: EnhancedDesignSystem.colors.text,
            fontStyle: 'normal'
        });
        volumeLabel.setOrigin(0, 0.5);
        panel.add(volumeLabel);

        // Volume slider
        const sliderWidth = 200;
        const sliderHeight = 8;
        const sliderStartX = 20;
        this.volumeSlider = this.add.rectangle(sliderStartX + sliderWidth / 2, -130, sliderWidth, sliderHeight, 0x555555);
        this.volumeSlider.setOrigin(0.5);
        panel.add(this.volumeSlider);

        // Volume handle
        const handleX = sliderStartX + (this.currentVolume * sliderWidth);
        this.volumeHandle = this.add.circle(handleX, -130, 12, 0xd4af37);
        this.volumeHandle.setOrigin(0.5);
        this.volumeHandle.setInteractive({ draggable: true, useHandCursor: true });
        panel.add(this.volumeHandle);

        // Volume percentage text
        this.volumeText = this.add.text(260, -130, `${Math.round(this.currentVolume * 100)}%`, {
            fontFamily: EnhancedDesignSystem.fontFamily.readable,
            fontSize: '20px',
            color: EnhancedDesignSystem.colors.text,
            fontStyle: 'normal'
        });
        this.volumeText.setOrigin(0.5);
        panel.add(this.volumeText);

        // Handle dragging
        const sliderLeft = sliderStartX;
        const sliderRight = sliderStartX + sliderWidth;

        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (gameObject === this.volumeHandle) {
                const localX = pointer.x - centerX;
                const clampedX = Phaser.Math.Clamp(localX, sliderLeft, sliderRight);

                this.volumeHandle.x = clampedX;
                this.currentVolume = (clampedX - sliderLeft) / sliderWidth;
                this.volumeText.setText(`${Math.round(this.currentVolume * 100)}%`);

                localStorage.setItem('menuMusicVolume', this.currentVolume.toString());

                if (menuMusic) {
                    (menuMusic as any).setVolume(this.currentVolume);
                }
            }
        });

        // --- CONTROLS SECTION ---
        const controlsHeader = this.add.text(-280, -70, '🎮 Controls', EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        controlsHeader.setOrigin(0, 0.5);
        controlsHeader.setStroke('#000000', 3);
        panel.add(controlsHeader);

        // Divider line
        const divider2 = this.add.graphics();
        divider2.lineStyle(1, 0xd4af37, 0.5);
        divider2.lineBetween(-280, -45, 280, -45);
        panel.add(divider2);

        // Controls list
        const controls = [
            { key: 'WASD', action: 'Movement' },
            { key: 'Mouse', action: 'Aim Cursor' },
            { key: 'LMB', action: 'Basic Attack' },
            { key: 'Q / E', action: 'Use Skills' },
            { key: 'Space', action: 'Dash / Dodge' },
            { key: 'T', action: 'Skill Tree' },
            { key: 'ESC', action: 'Pause Menu' }
        ];

        let startY = -10;
        const spacing = 38;

        controls.forEach((control, index) => {
            const y = startY + (index * spacing);

            const keyText = this.add.text(-250, y, control.key, EnhancedStyleHelpers.createTextStyle({
                size: 'md',
                color: EnhancedDesignSystem.colors.accent,
                fontFamily: 'primary',
                fontStyle: 'bold'
            }));
            keyText.setOrigin(0, 0.5);
            keyText.setStroke('#000000', 2);
            panel.add(keyText);

            const actionText = this.add.text(30, y, control.action, {
                fontFamily: EnhancedDesignSystem.fontFamily.readable,
                fontSize: '18px',
                color: EnhancedDesignSystem.colors.text,
                fontStyle: 'normal'
            });
            actionText.setOrigin(0, 0.5);
            panel.add(actionText);
        });

        // Back button - text changes based on context
        const backText = this.fromGame ? '← RESUME' : '← BACK';
        const backButton = this.add.text(0, 250, backText, EnhancedStyleHelpers.createTextStyle({
            size: 'xl',
            color: EnhancedDesignSystem.colors.text,
            fontFamily: 'primary',
            fontStyle: 'bold'
        }));
        backButton.setFontSize(26);
        backButton.setStroke('#000000', 4);
        backButton.setOrigin(0.5);
        backButton.setInteractive({ useHandCursor: true });
        panel.add(backButton);

        backButton.on('pointerdown', () => {
            audio.playSFX('ui-button-click', { volume: 0.25 });
            this.scene.stop('Settings');

            if (this.fromGame) {
                // Resume the game
                if (this.scene.isPaused('Game')) {
                    this.scene.resume('Game');
                }
            } else {
                // Return to menu
                this.scene.resume('Menu');
            }
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
