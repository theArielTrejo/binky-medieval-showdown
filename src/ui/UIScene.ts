import * as Phaser from 'phaser';
import { LevelBarUI } from './LevelBarUI';
import { Player } from '../game/Player';
import { Game } from '../game/scenes/Game';
import { AudioManager } from '../game/systems/AudioManager';


export class UIScene extends Phaser.Scene {
    private levelBarUI: LevelBarUI | undefined;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create(): void {
        const gameScene = this.scene.get('Game') as Game;

        const audio = AudioManager.getInstance();
        audio.init(this);

        // Global Key Listener for Pause - now opens Settings scene
        this.input.keyboard?.on('keydown-ESC', () => {
            const sm = this.scene;

            // If Settings is already open, close it and resume
            if (sm.isActive('Settings')) {
                audio.playSFX('ui-button-click', { volume: 0.25 });
                sm.stop('Settings');

                // Resume whichever scene was paused
                if (sm.isPaused('Game')) {
                    sm.resume('Game');
                } else if (sm.isPaused('Menu')) {
                    sm.resume('Menu');
                }
                return;
            }

            // Open Settings and pause underlying scene
            audio.playSFX('ui-button-click', { volume: 0.25 });

            if (sm.isActive('Game')) {
                sm.pause('Game');
                sm.launch('Settings', { fromGame: true });
            } else if (sm.isActive('Menu')) {
                sm.pause('Menu');
                sm.launch('Settings', { fromGame: false });
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
    }
}

