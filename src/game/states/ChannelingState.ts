import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import { PlayerAction } from '../types/InputTypes';

export class ChannelingState extends State {
    enter(): void {
        this.player.performSpecialSkill(); 
    }

    execute(_time: number, _delta: number): void {
        if (!this.player.inputManager.isActionHeld(PlayerAction.SPECIAL_1)) {
            this.stateMachine.transition(PlayerState.IDLE);
            return;
        }

        this.player.handleChannelingLogic(); 
    }

    exit(): void {
    }
}
