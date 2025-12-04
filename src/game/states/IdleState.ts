import { State } from './State';
import { PlayerState } from '../types/PlayerTypes';
import { PlayerAction } from '../types/InputTypes';

export class IdleState extends State {
    enter(): void {
        this.player.sprite.setVelocity(0, 0);
        this.player.playAnimation('idle');
    }

    execute(_time: number, _delta: number): void {
        // Check for movement
        const moveVector = this.player.inputManager.getMovementVector();
        if (moveVector.lengthSq() > 0) {
            this.stateMachine.transition(PlayerState.RUN);
            return;
        }

        // Check for attacks
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
        
        // Toggle Skill Tree (Handled in Player or here? Player.ts handled it in update)
        // Ideally Global/System level inputs like UI toggles are in Player or a Scene Manager, not specific states.
        // But Player.ts update() delegates to StateMachine. 
        // So we should probably handle it in Player.update() BEFORE calling stateMachine.update().
    }

    exit(): void {
        // Cleanup if needed
    }
}
