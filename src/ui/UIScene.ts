import * as Phaser from 'phaser';
import { SkillTreeUI } from './SkillTreeUI';
import { Player } from '../game/Player';
import { Game } from '../game/scenes/Game';

export class UIScene extends Phaser.Scene {
    private skillTreeUI: SkillTreeUI | undefined;
    private isSkillTreeOpen = false;
    private gameStarted = false;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create(): void {
        const gameScene = this.scene.get('Game') as Game;

        // The Game scene will emit this event when the player is created.
        gameScene.events.once('playerReady', (player: Player) => {
            this.skillTreeUI = new SkillTreeUI(this, player);
            this.gameStarted = true;
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
}
