import { GameObjects, Scene } from 'phaser';
import { Skill } from '../data/SkillTreeData';
import { EnhancedDesignSystem } from '../../ui/EnhancedDesignSystem';

export interface SkillNodeConfig {
    scene: Scene;
    skill: Skill;
    x: number;
    y: number;
    layer: GameObjects.Layer;
    isUnlocked: boolean;
    isAvailable: boolean;
    onUnlock: (skill: Skill) => void;
}

/**
 * Modern Skill Node - "Controller" Pattern
 * Instead of extending Container (which causes matrix overhead), this class
 * manages a set of Sprites that live on a Layer.
 */
export class SkillNode extends Phaser.Events.EventEmitter {
    public x: number;
    public y: number;


    private scene: Scene;
    private skill: Skill;
    private layer: GameObjects.Layer;

    // Visuals
    private background: GameObjects.Sprite;
    // private icon: GameObjects.Sprite; // REMOVED unused
    // Note: If using Text temporarily, we can keep it as Text, but best practice is Sprite.
    // For now we will use Text for icon to maintain compatibility with existing 'emoji' icons
    private iconText: GameObjects.Text;

    private isUnlocked: boolean;
    private isAvailable: boolean;
    private onUnlockCallback: (skill: Skill) => void;

    constructor(config: SkillNodeConfig) {
        super();

        this.scene = config.scene;
        this.skill = config.skill;
        this.x = config.x;
        this.y = config.y;
        this.layer = config.layer;
        this.isUnlocked = config.isUnlocked;
        this.isAvailable = config.isAvailable;
        this.onUnlockCallback = config.onUnlock;

        this.createVisuals();
        this.setupInteraction();
        this.updateStateVisuals();
    }

    private createVisuals() {
        // 1. Background Sprite
        // We use a "generated" texture for the background frame.
        // In the Scene PRELOAD, we should generate 'skill_node_bg'
        this.background = this.scene.add.sprite(this.x, this.y, 'skill_node_bg');
        this.layer.add(this.background);

        // 2. Icon (Text for now to match current data)
        this.iconText = this.scene.add.text(this.x, this.y, this.skill.icon, { fontSize: '32px' }).setOrigin(0.5);
        this.layer.add(this.iconText);
    }

    private setupInteraction() {
        const size = 64;
        const radius = size / 2;

        // Interactive on the Background Sprite
        this.background.setInteractive(new Phaser.Geom.Circle(32, 32, radius), Phaser.Geom.Circle.Contains);

        this.background.on('pointerdown', () => {
            // Stop propagation handled by logic, but we can prevent default if needed
            // pointer.event.stopPropagation(); 
            this.attemptUnlock();
        });

        this.background.on('pointerover', () => {
            this.emit('pointerover', this);

            this.scene.tweens.add({
                targets: [this.background, this.iconText],
                scale: 1.15,
                duration: 100,
                ease: 'Back.out'
            });
        });

        this.background.on('pointerout', () => {
            this.emit('pointerout', this);

            this.scene.tweens.add({
                targets: [this.background, this.iconText],
                scale: 1.0,
                duration: 100,
                ease: 'Back.out'
            });
        });
    }

    public updateState(isUnlocked: boolean, isAvailable: boolean) {
        if (this.isUnlocked === isUnlocked && this.isAvailable === isAvailable) return;

        const wasLocked = !this.isUnlocked;
        this.isUnlocked = isUnlocked;
        this.isAvailable = isAvailable;

        this.updateStateVisuals();

        // Unlock Bloom Effect
        if (wasLocked && isUnlocked) {
            if (this.scene.renderer.type === Phaser.WEBGL) {
                // Apply bloom to the background sprite
                if ((this.background as any).postFX) {
                    const bloom = (this.background as any).postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
                    this.scene.tweens.add({
                        targets: bloom,
                        strength: 0,
                        duration: 500,
                        onComplete: () => {
                            (this.background as any).postFX.remove(bloom);
                        }
                    });
                }
            }
        }
    }

    private updateStateVisuals() {
        // Clear previous FX
        if ((this.background as any).postFX) {
            (this.background as any).postFX.clear();
        }

        if (this.isUnlocked) {
            // BOUGHT: Golden, full brightness
            this.background.setTint(parseInt(EnhancedDesignSystem.colors.accent.replace('#', '0x')));
            this.background.setAlpha(1);
            this.iconText.setAlpha(1);
        } else if (this.isAvailable) {
            // AVAILABLE (Ready to buy): Grey with colored glow/aura
            this.background.setTint(0x666666); // Grey base
            this.background.setAlpha(0.9);
            this.iconText.setAlpha(0.7);

            // Cyan/Blue pulsing glow to indicate "purchasable"
            if (this.scene.renderer.type === Phaser.WEBGL && (this.background as any).postFX) {
                const glow = (this.background as any).postFX.addGlow(0x00ccff, 3, 0, false, 0.15, 12);
                this.scene.tweens.add({
                    targets: glow,
                    outerStrength: 5,
                    yoyo: true,
                    repeat: -1,
                    duration: 1200
                });
            }
        } else {
            // LOCKED: Grey, no glow
            this.background.setTint(0x444444);
            this.background.setAlpha(0.6);
            this.iconText.setAlpha(0.4);

            if (this.scene.renderer.type === Phaser.WEBGL && (this.background as any).postFX) {
                (this.background as any).postFX.addColorMatrix().grayscale(1.0);
            }
        }
    }

    private attemptUnlock() {
        if (!this.isUnlocked && this.isAvailable) {
            this.onUnlockCallback(this.skill);
        }
    }
}
