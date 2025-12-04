import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import { PlayerAction } from '../types/InputTypes';

export class MoveState extends State {
    enter(): void {
        this.player.playAnimation('walk');
    }

    execute(_time: number, _delta: number): void {
        const moveVector = this.player.inputManager.getMovementVector();
        
        if (moveVector.lengthSq() === 0) {
            this.stateMachine.transition(PlayerState.IDLE);
            return;
        }

        // Attacks override movement
        if (this.player.inputManager.isActionJustPressed(PlayerAction.ATTACK_PRIMARY)) {
            this.stateMachine.transition(PlayerState.ATTACK_PRIMARY);
            return;
        }
        
         if (this.player.inputManager.isActionJustPressed(PlayerAction.ATTACK_SECONDARY)) {
             if (this.player.cooldownManager.isReady('SECONDARY_SKILL')) {
                this.stateMachine.transition(PlayerState.CASTING_SECONDARY);
            }
            return;
        }

        if (this.player.inputManager.isActionJustPressed(PlayerAction.SPECIAL_1)) {
             if (this.player.cooldownManager.isReady('SPECIAL_SKILL')) {
                this.stateMachine.transition(PlayerState.CHANNELING_SPECIAL);
            }
            return;
        }

        // Apply movement logic
        this.player.applyMovement(moveVector);
    }

    exit(): void {
        // We don't stop velocity here immediately because Attack might want to slide? 
        // But usually exit means stop or transition. 
        // IdleState enter sets velocity 0. AttackState enter sets velocity 0.
        // So we are good.
    }
}
