import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import * as Phaser from 'phaser';

export class AttackState extends State {
    enter(): void {
        this.player.sprite.setVelocity(0, 0);
        this.player.playAnimation('attack');
        this.player.performAttack(); 
        
        this.player.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    }

    execute(_time: number, _delta: number): void {
        // Can add logic for combos here later
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