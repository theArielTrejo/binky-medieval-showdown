import { Skill } from './Skill';
import { Player } from '../Player';
import { GravityWellObject } from './objects/GravityWellObject';
import { Game } from '../scenes/Game';
import { AudioManager } from '../systems/AudioManager';

export class GravityWellSkill extends Skill {
    constructor() {
        super(8000); // 8 second cooldown
    }

    activate(player: Player): void {
        AudioManager.getInstance().playSFX('mage-gravity-well');

        const targetPos = player.inputManager.getPointerWorldPosition();

        const gravityWell = new GravityWellObject(
            player.scene as Game,
            targetPos.x,
            targetPos.y
        );

        const gameScene = player.scene as Game;
        const skillSystem = gameScene.getPlayerSkillSystem();

        if (skillSystem) {
            skillSystem.addSkill(gravityWell);
        }

        player.cooldownManager.startCooldown('UTILITY_SKILL', this.cooldown);
    }
}
