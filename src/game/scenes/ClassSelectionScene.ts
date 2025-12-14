import { Scene } from 'phaser';
import { ClassSelectionUI } from '../../ui/ClassSelectionUI';
import { ControlsUI } from '../../ui/ControlsUI';
import { PlayerArchetypeType } from '../objects/PlayerArchetype';
import { AudioManager } from '../systems/AudioManager';


export class ClassSelectionScene extends Scene {
    private classSelectionUI!: ClassSelectionUI;
    private controlsUI!: ControlsUI;
    constructor() {
        super('ClassSelectionScene');
    }

    create(): void {
        console.log('ClassSelectionScene: create started');

        const audio = AudioManager.getInstance();
        audio.init(this);
        
        this.classSelectionUI = new ClassSelectionUI(this, {
            audio,
            visible: true,
            onClassSelected: (archetype) => {
                audio.playSFX('ui-button-click', { volume: 0.25 });

                audio.stopMusic(); // optional cleanup
                this.scene.start('Game', { archetype });
            }
        });
        
        this.classSelectionUI.show();
    }
}
