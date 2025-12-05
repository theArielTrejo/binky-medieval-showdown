import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import { ActionType, MoveCommand } from '../input/Command';

export class MoveState extends State {
    enter(): void {
        this.player.playAnimation('walk');
    }

    execute(_time: number, _delta: number): void {
        if (!this.player.inputBuffer) return;

        const moveCmd = this.player.inputBuffer.peek<MoveCommand>(ActionType.MOVE);

        // Attacks override movement
        if (this.player.inputBuffer.consume(ActionType.ATTACK_PRIMARY)) {
            this.stateMachine.transition(PlayerState.ATTACK_PRIMARY);
            return;
        }
        
        if (this.player.inputBuffer.consume(ActionType.ATTACK_SECONDARY)) {
             if (this.player.cooldownManager.isReady('SECONDARY_SKILL')) {
                this.stateMachine.transition(PlayerState.CASTING_SECONDARY);
            }
            return;
        }

        if (this.player.inputBuffer.consume(ActionType.SPECIAL_1)) {
             if (this.player.cooldownManager.isReady('SPECIAL_SKILL')) {
                this.stateMachine.transition(PlayerState.CHANNELING_SPECIAL);
            }
            return;
        }

        if (!moveCmd) {
            this.player.sprite.setVelocity(0, 0);
            this.stateMachine.transition(PlayerState.IDLE);
            return;
        }

        // Apply movement logic via Player method to ensure consistent state (facing, slow, stats)
        this.player.applyMovement(moveCmd.payload);
    }

    exit(): void {
    }
}
