import * as Phaser from 'phaser';
import { SkillTreeUI } from './SkillTreeUI';
import { LevelBarUI } from './LevelBarUI';
import { Player } from '../game/Player';
import { Game } from '../game/scenes/Game';

export class UIScene extends Phaser.Scene {
    private skillTreeUI: SkillTreeUI | undefined;
    private levelBarUI: LevelBarUI | undefined;
    private isSkillTreeOpen = false;
    private gameStarted = false;
    private player: Player | undefined;

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


        this.input.keyboard!.on('keydown-E', () => {
            if (this.gameStarted && this.skillTreeUI) {
                this.isSkillTreeOpen = !this.isSkillTreeOpen;
                if (this.isSkillTreeOpen) {
                    this.skillTreeUI.show();
                    gameScene.scene.pause();
                } else {
                    this.skillTreeUI.hide();
                    gameScene.scene.resume();
                }
            }
        });
    }

    update(): void {
        if (this.levelBarUI) {
            this.levelBarUI.update();
        }
    }

    public initializeWithPlayer(player: Player): void {
        this.player = player;
        // If we already have a UI from a previous session, destroy it first
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
            this.skillTreeUI = undefined;
        }
        if (this.levelBarUI) {
            this.levelBarUI.destroy();
            this.levelBarUI = undefined;
        }

        this.skillTreeUI = new SkillTreeUI(this, player);
        this.levelBarUI = new LevelBarUI(this, player);
        this.gameStarted = true;
    }

    public reset(): void {
        if (this.skillTreeUI) {
            this.skillTreeUI.destroy();
            this.skillTreeUI = undefined;
        }
        if (this.levelBarUI) {
            this.levelBarUI.destroy();
            this.levelBarUI = undefined;
        }
        this.gameStarted = false;
        this.isSkillTreeOpen = false;
        this.player = undefined;
    }
}
