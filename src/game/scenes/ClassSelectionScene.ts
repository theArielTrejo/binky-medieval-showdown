import { Scene } from 'phaser';
import { ClassSelectionUI } from '../../ui/ClassSelectionUI';
import { PlayerArchetypeType } from '../objects/PlayerArchetype';

export class ClassSelectionScene extends Scene {
    private classSelectionUI!: ClassSelectionUI;

    constructor() {
        super('ClassSelectionScene');
    }

    create(): void {
        console.log('ClassSelectionScene: create started');

        this.classSelectionUI = new ClassSelectionUI(this, {
            visible: true,
            onClassSelected: (archetype: PlayerArchetypeType) => {
                console.log(`Class chosen: ${archetype}. Starting Game...`);
                // Transition to the main Game scene, passing the selected archetype
                this.scene.start('Game', { archetype });
            }
        });
        
        this.classSelectionUI.show();
    }
}
