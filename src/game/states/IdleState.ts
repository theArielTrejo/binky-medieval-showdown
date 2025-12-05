import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import { ActionType } from '../input/Command';

export class IdleState extends State {
    enter(): void {
        this.player.sprite.setVelocity(0, 0);
        this.player.playAnimation('idle');
    }

    execute(_time: number, _delta: number): void {
        if (!this.player.inputBuffer) return;

        // Check for movement
        if (this.player.inputBuffer.peek(ActionType.MOVE)) {
            this.stateMachine.transition(PlayerState.RUN);
            return;
        }

        // Check for attacks
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
    }

    exit(): void {
    }
}