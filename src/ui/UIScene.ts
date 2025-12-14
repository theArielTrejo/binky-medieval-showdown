import * as Phaser from 'phaser';
import { LevelBarUI } from './LevelBarUI';
import { ControlsUI } from './ControlsUI';
import { Player } from '../game/Player';
import { Game } from '../game/scenes/Game';
import { AudioManager } from '../game/systems/AudioManager';


export class UIScene extends Phaser.Scene {
    private levelBarUI: LevelBarUI | undefined;
    private controlsUI: ControlsUI | undefined;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create(): void {
        const gameScene = this.scene.get('Game') as Game;

        
        const audio = AudioManager.getInstance();
        audio.init(this);
        // Initialize Controls/Pause UI immediately
        this.controlsUI = new ControlsUI(this, audio);

        // Global Key Listener for Pause
        this.input.keyboard?.on('keydown-ESC', () => {
            if (this.controlsUI) {
                //  UI click sound (same as ? button)
                const audio = AudioManager.getInstance();
                audio.playSFX('ui-button-click', { volume: 0.25 });

                this.controlsUI.toggle();
            }
        });

        // Initial boot listener - likely only fires once on app load
        gameScene.events.on('playerReady', (player: Player) => {
            this.initializeWithPlayer(player);
        });

        gameScene.events.on('shutdown', () => {
            this.reset();
        });
    }

    update(): void {
        if (this.levelBarUI) {
            this.levelBarUI.update();
        }
    }

    public initializeWithPlayer(player: Player): void {
        // If we already have a UI from a previous session, destroy it first
        if (this.levelBarUI) {
            this.levelBarUI.destroy();
            this.levelBarUI = undefined;
        }

        this.levelBarUI = new LevelBarUI(this, player);
    }

    public reset(): void {
        if (this.levelBarUI) {
            this.levelBarUI.destroy();
            this.levelBarUI = undefined;
        }
        // ControlsUI is persistent across game restarts usually, 
        // but safe to recreate if needed.
        if (this.controlsUI) {
            // Ensure we resume game if we are destroying the UI while paused
            if (this.controlsUI.isOpen()) {
                this.game.scene.resume('Game');
            }
            // Actually probably don't need to destroy it if UIScene stays active?
            // But let's follow the pattern
            // this.controlsUI = undefined; // actually keep it alive for now or recreate
        }
    }
}
