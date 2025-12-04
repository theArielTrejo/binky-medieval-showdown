import * as Phaser from 'phaser';
import { LevelBarUI } from './LevelBarUI';
import { Player } from '../game/Player';
import { Game } from '../game/scenes/Game';

export class UIScene extends Phaser.Scene {
    private levelBarUI: LevelBarUI | undefined;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create(): void {
        const gameScene = this.scene.get('Game') as Game;

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
