import { Skill } from './Skill';
import { Player } from '../Player';
import { ShadowDashObject } from './objects/ShadowDashObject';
import { PlayerState } from '../types/PlayerTypes';

export class ShadowDashSkill extends Skill {
    constructor() {
        super(3000); // 3 second cooldown
    }

    activate(player: Player): void {
        const targetPos = player.inputManager.getPointerWorldPosition();
        const duration = 200;
        
        // Face towards dash direction
        player.facingLeft = targetPos.x < player.sprite.x;
        player.sprite.setFlipX(player.facingLeft);
        
        // Create smoke bomb dash - no damage, just mobility + invisibility
        new ShadowDashObject(
            player.scene, 
            player.sprite.x, 
            player.sprite.y, 
            player.sprite, 
            targetPos.x, 
            targetPos.y,
            0, // No damage
            duration
        );

        player.cooldownManager.startCooldown('SECONDARY_SKILL', this.cooldown);

        // Reset player state after dash duration
        player.scene.time.delayedCall(duration, () => {
            player.stateMachine.transition(PlayerState.IDLE);
        });
    }
}
