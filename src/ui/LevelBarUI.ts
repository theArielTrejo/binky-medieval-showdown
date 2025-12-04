import * as Phaser from 'phaser';
import { Player } from '../game/Player';
import { EnhancedStyleHelpers } from './EnhancedDesignSystem';

export class LevelBarUI {
    private scene: Phaser.Scene;
    private player: Player;
    private container: Phaser.GameObjects.Container;
    private barBg: Phaser.GameObjects.Graphics;
    private barFill: Phaser.GameObjects.Graphics;
    private levelText: Phaser.GameObjects.Text;
    private width: number = 800;
    private height: number = 20;

    // State tracking for optimization (dirty checking)
    private lastProgress: number = -1;
    private lastLevel: number = -1;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.container = this.scene.add.container(0, 0);
        
        this.barBg = this.scene.add.graphics();
        this.barFill = this.scene.add.graphics();
        
        this.levelText = this.scene.add.text(0, 0, 'Level 1', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: '#ffffff',
            fontStyle: 'bold'
        })).setOrigin(0.5, 0.5);

        this.container.add([this.barBg, this.barFill, this.levelText]);
        this.container.setScrollFactor(0); // Fixed to screen
        this.container.setDepth(100); // High depth to be on top

        // Draw static background once
        this.barBg.fillStyle(0x000000, 0.8);
        this.barBg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
        this.barBg.lineStyle(2, 0x444444, 1);
        this.barBg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);

        // Initial position (bottom center)
        const { width, height } = this.scene.scale;
        this.container.setPosition(width / 2, height - 40);

        this.update();
    }

    public update(): void {
        if (!this.player || !this.player.isAlive()) return;

        const level = this.player.getLevel();
        const currentXP = this.player.getCurrentLevelXP();
        const maxXP = this.player.getXPToNextLevel();
        const progress = Math.min(Math.max(currentXP / maxXP, 0), 1);

        // Optimization: Only redraw if visual progress has changed
        if (progress !== this.lastProgress) {
            this.barFill.clear();
            if (progress > 0) {
                this.barFill.fillStyle(0x00ff00, 1); // Green to match XP orbs
                // Calculate clamped width for rounded corners effect
                const fillWidth = this.width * progress;
                this.barFill.fillRoundedRect(-this.width / 2, -this.height / 2, fillWidth, this.height, { tl: 10, bl: 10, tr: 0, br: 0 });
            }
            this.lastProgress = progress;
        }

        // Optimization: Only update text if level has changed
        if (level !== this.lastLevel) {
            this.levelText.setText(`Level ${level}`);
            this.lastLevel = level;
        }

        // Note: barBg is static and drawn in constructor (or should be), 
        // but since we clear/redraw it in the old code, let's ensure it stays static 
        // or move it to create() if it never changes.
        // For now, we assume bg is static. If you want the bg to pulse or change, add logic here.
        // To be safe against the previous logic clearing it, we can draw it once in constructor
        // and never clear it here.
    }

    public destroy(): void {
        this.container.destroy();
    }
}
