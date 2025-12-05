import { GameObjects, Scene } from 'phaser';
import { Skill } from '../data/SkillTreeData';
import { EnhancedDesignSystem } from '../../ui/EnhancedDesignSystem';

export interface SkillNodeConfig {
    scene: Scene;
    skill: Skill;
    x: number;
    y: number;
    isUnlocked: boolean;
    isAvailable: boolean;
    onUnlock: (skill: Skill) => void;
}

export class SkillNode extends GameObjects.Container {
    private skill: Skill;
    private background: GameObjects.Graphics;
    private icon: GameObjects.Text;
    private isUnlocked: boolean;
    private isAvailable: boolean;
    private onUnlock: (skill: Skill) => void;
    
    // FX Controllers (kept as references if needed, though we primarily add/remove them)
    // In Phaser 3.60+, FX are added to the Game Object
    
    constructor(config: SkillNodeConfig) {
        super(config.scene, config.x, config.y);
        
        this.skill = config.skill;
        this.isUnlocked = config.isUnlocked;
        this.isAvailable = config.isAvailable;
        this.onUnlock = config.onUnlock;

        // Create Visuals
        this.createVisuals();
        
        // Setup Interaction
        this.setupInteraction();
        
        // Initial State FX
        this.updateStateVisuals();
        
        // Add to scene (Config-First pattern often implies the factory adds it, 
        // but since we are manually instantiating for now, we leave it to the scene or factory wrapper)
    }

    private createVisuals() {
        // 1. Background (Card/Shape)
        // We use Graphics for now, but in a full production pipeline this might be a NineSlice or Sprite from Atlas
        this.background = this.scene.add.graphics();
        this.add(this.background);
        
        // 2. Icon
        // Using Text for now as placeholders are Emojis, but designed to be swappable for Sprites
        this.icon = this.scene.add.text(0, 0, this.skill.icon, { fontSize: '32px' }).setOrigin(0.5);
        this.add(this.icon);

        this.drawBackground();
    }

    private drawBackground() {
        const size = 64;
        this.background.clear();
        
        let bgColor = 0x1a1a1a;
        let borderColor = 0x444444;

        if (this.isUnlocked) {
            bgColor = 0x222222;
            borderColor = parseInt(EnhancedDesignSystem.colors.accent.replace('#', '0x'));
        } else if (this.isAvailable) {
            borderColor = 0xaaaaaa;
        }

        this.background.fillStyle(bgColor, 1);
        this.background.fillRoundedRect(-size/2, -size/2, size, size, 12);
        
        this.background.lineStyle(2, borderColor, 1);
        this.background.strokeRoundedRect(-size/2, -size/2, size, size, 12);

        // Inner highlight for unlocked
        if (this.isUnlocked) {
            this.background.lineStyle(1, parseInt(EnhancedDesignSystem.colors.accentLight.replace('#', '0x')), 0.5);
            this.background.strokeRoundedRect(-size/2 + 2, -size/2 + 2, size - 4, size - 4, 10);
        }
    }

    private setupInteraction() {
        const size = 64;
        // Geometric Hit Testing (Circle) as recommended
        // Even though visual is Rect, Circle hit area feels better for "Nodes" and prevents corner miss-clicks
        const radius = size / 2;
        
        this.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
        
        this.on('pointerdown', () => {
            // Stop Propagation to prevent Camera Drag
            // NOTE: Container event bubbling works differently, but we can handle it at Scene level checks 
            // or by ensuring the event doesn't trickle if handled here.
            // pointer.event.stopPropagation(); // DOM event
            
            // In Phaser, we can just handle logic. The Scene's background listener should check if an object was clicked.
            this.attemptUnlock();
        });

        this.on('pointerover', () => {
            this.scene.tweens.add({
                targets: this,
                scale: 1.15,
                duration: 100,
                ease: 'Back.out'
            });
            
            // Shine FX on hover (if supported)
            // this.postFX.addShine(); // Requires Phaser 3.60+ and WebGL
        });

        this.on('pointerout', () => {
            this.scene.tweens.add({
                targets: this,
                scale: 1.0,
                duration: 100,
                ease: 'Back.out'
            });
            // Remove Shine?
            // this.postFX.clear(); // Clears all, might need specific removal
        });
    }

    public updateState(isUnlocked: boolean, isAvailable: boolean) {
        if (this.isUnlocked === isUnlocked && this.isAvailable === isAvailable) return;
        
        const wasLocked = !this.isUnlocked;
        this.isUnlocked = isUnlocked;
        this.isAvailable = isAvailable;
        
        this.drawBackground();
        this.updateStateVisuals();

        // Unlock Bloom Effect
        if (wasLocked && isUnlocked) {
            // Trigger Bloom Burst
             if (this.scene.renderer.type === Phaser.WEBGL) {
                const bloom = this.postFX.addBloom(0xffffff, 1, 1, 2, 1.2);
                this.scene.tweens.add({
                    targets: bloom,
                    strength: 0,
                    duration: 500,
                    onComplete: () => {
                        this.postFX.remove(bloom);
                    }
                });
            }
        }
    }

    private updateStateVisuals() {
        // Clear existing state FX
        // Note: In a real implementation we would track specific FX instances to remove them
        this.postFX.clear();

        if (this.isUnlocked) {
            // Normal State
        } else if (this.isAvailable) {
            // Glow - Pulsing
             if (this.scene.renderer.type === Phaser.WEBGL) {
                const glow = this.postFX.addGlow(0xffd700, 4, 0, false, 0.1, 10);
                
                this.scene.tweens.add({
                    targets: glow,
                    outerStrength: 6,
                    yoyo: true,
                    repeat: -1,
                    duration: 1000
                });
             }
        } else {
            // Locked - Grayscale
             if (this.scene.renderer.type === Phaser.WEBGL) {
                this.postFX.addColorMatrix().grayscale(1.0);
                this.alpha = 0.8;
             }
        }
    }

    private attemptUnlock() {
        if (!this.isUnlocked && this.isAvailable) {
            this.onUnlock(this.skill);
        }
    }
}