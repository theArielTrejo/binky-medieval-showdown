import { State } from './State';

export class CastingState extends State {
    enter(): void {
        this.player.sprite.setVelocity(0, 0);
        this.player.performSecondarySkill();
        // Transition back is currently handled by Player callback for simplicity, 
        // or we can move the timer here.
        // For now, Player.performSecondarySkill will call stateMachine.transition(IDLE) via a callback wrapper.
    }

    execute(_time: number, _delta: number): void {
    }

    exit(): void {
    }
}
