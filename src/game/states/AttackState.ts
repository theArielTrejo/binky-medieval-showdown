import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import * as Phaser from 'phaser';

export class AttackState extends State {
    enter(): void {
        this.player.playAnimation('attack');
        this.player.performAttack(); 
        
        this.player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);

        // Failsafe: Force exit after 1 second if animation doesn't complete (e.g. missing asset)
        this.player.scene.time.delayedCall(1000, () => {
            if (this.stateMachine.getCurrentState() === this) {
                this.stateMachine.transition(PlayerState.IDLE);
            }
        });
    }

    execute(_time: number, _delta: number): void {
        // Allow movement during attack
        const moveVector = this.player.inputManager.getMovementVector();
        this.player.applyMovement(moveVector);
    }

    exit(): void {
        this.player.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    }

    private onAnimationComplete(animation: Phaser.Animations.Animation): void {
         const key = (animation?.key || '').toLowerCase();
         if (key.includes('attack')) {
             this.stateMachine.transition(PlayerState.IDLE);
         }
    }
}