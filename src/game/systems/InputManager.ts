import { Scene } from 'phaser';
import { PlayerAction } from '../types/InputTypes';
import { InputBuffer } from '../input/InputBuffer';
import { 
    ActionType, 
    MoveCommand, 
    DashCommand, 
    SkillCommand, 
    ToggleSkillTreeCommand
} from '../input/Command';

export class InputManager {
    private scene: Scene;
    private keys: Map<PlayerAction, Phaser.Input.Keyboard.Key[]> = new Map();
    private actionTimestamps: Map<PlayerAction, number> = new Map();
    private readonly BUFFER_WINDOW: number = 150; // ms
    private inputBuffer?: InputBuffer;

    constructor(scene: Scene, buffer?: InputBuffer) {
        this.scene = scene;
        this.inputBuffer = buffer;
        this.setupKeys();
        this.setupMouse();
    }

    private setupKeys(): void {
        const { KeyCodes } = Phaser.Input.Keyboard;
        const keyboard = this.scene.input.keyboard;

        if (!keyboard) {
            console.warn('InputManager: Keyboard not available');
            return;
        }

        const addKey = (action: PlayerAction, codes: number[]) => {
            const keyObjects = codes.map(code => keyboard.addKey(code));
            this.keys.set(action, keyObjects);
        };

        addKey(PlayerAction.MOVE_UP, [KeyCodes.W, KeyCodes.UP]);
        addKey(PlayerAction.MOVE_DOWN, [KeyCodes.S, KeyCodes.DOWN]);
        addKey(PlayerAction.MOVE_LEFT, [KeyCodes.A, KeyCodes.LEFT]);
        addKey(PlayerAction.MOVE_RIGHT, [KeyCodes.D, KeyCodes.RIGHT]);
        
        // Attack Secondary: Shift
        addKey(PlayerAction.ATTACK_SECONDARY, [KeyCodes.SHIFT]);
        
        // Specials
        addKey(PlayerAction.SPECIAL_1, [KeyCodes.Q]);
        addKey(PlayerAction.SPECIAL_2, [KeyCodes.E]);
        
        // Dash (Space)
        addKey(PlayerAction.DASH, [KeyCodes.SPACE]);

        // UI
        addKey(PlayerAction.TOGGLE_SKILL_TREE, [KeyCodes.T]);
    }

    private setupMouse(): void {
        this.scene.input.mouse?.disableContextMenu();

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.recordActionPress(PlayerAction.ATTACK_PRIMARY);
                if (this.inputBuffer) {
                    this.inputBuffer.add(new SkillCommand(ActionType.ATTACK_PRIMARY));
                }
            } else if (pointer.rightButtonDown()) {
                this.recordActionPress(PlayerAction.ATTACK_SECONDARY);
                if (this.inputBuffer) {
                    this.inputBuffer.add(new SkillCommand(ActionType.ATTACK_SECONDARY));
                }
            }
        });
    }

    public update(): void {
        const time = this.scene.time.now;
        
        // Poll for keyboard JustDown for buffering & Commands
        this.keys.forEach((keyObjects, action) => {
            if (keyObjects.some(k => Phaser.Input.Keyboard.JustDown(k))) {
                this.actionTimestamps.set(action, time);
                
                // Emit Command if Buffer exists
                if (this.inputBuffer) {
                    this.emitCommand(action);
                }
            }
        });

        // Continuous Move Command
        if (this.inputBuffer) {
            const moveVector = this.getMovementVector();
            if (moveVector.lengthSq() > 0) {
                this.inputBuffer.add(new MoveCommand(moveVector));
            }
        }
    }

    private emitCommand(action: PlayerAction): void {
        if (!this.inputBuffer) return;

        switch (action) {
            case PlayerAction.DASH:
                this.inputBuffer.add(new DashCommand());
                break;
            case PlayerAction.ATTACK_SECONDARY:
                // Note: ATTACK_SECONDARY is also mapped to Shift, so this handles keyboard trigger
                this.inputBuffer.add(new SkillCommand(ActionType.ATTACK_SECONDARY));
                break;
            case PlayerAction.TOGGLE_SKILL_TREE:
                this.inputBuffer.add(new ToggleSkillTreeCommand());
                break;
            case PlayerAction.SPECIAL_1:
                this.inputBuffer.add(new SkillCommand(ActionType.SPECIAL_1));
                break;
            // ATTACK_PRIMARY is mouse-only usually, but if mapped to key...
            // SPECIAL_1/2 are not in ActionType yet, maybe add them if needed?
            // For now ignoring SPECIAL_1/2 as per PDF plan which focuses on Primary/Secondary.
        }
    }

    private recordActionPress(action: PlayerAction): void {
        this.actionTimestamps.set(action, this.scene.time.now);
    }

    /**
     * Checks if an action was pressed within the buffer window.
     * Consumes the buffer if true (one-shot).
     */
    public isActionJustPressed(action: PlayerAction): boolean {
        const timestamp = this.actionTimestamps.get(action);
        if (timestamp === undefined) return false;

        const time = this.scene.time.now;
        if (time - timestamp <= this.BUFFER_WINDOW) {
            this.actionTimestamps.delete(action); // Consume
            return true;
        }
        return false;
    }

    /**
     * Checks if the action input is currently physically held down.
     */
    public isActionHeld(action: PlayerAction): boolean {
        // Check mouse
        const pointer = this.scene.input.activePointer;
        if (action === PlayerAction.ATTACK_PRIMARY && pointer.leftButtonDown()) return true;
        if (action === PlayerAction.ATTACK_SECONDARY && pointer.rightButtonDown()) return true;

        // Check keys
        const keyObjects = this.keys.get(action);
        if (keyObjects) {
            return keyObjects.some(k => k.isDown);
        }
        return false;
    }

    /**
     * Returns a normalized vector representing current movement input.
     */
    public getMovementVector(): Phaser.Math.Vector2 {
        const vector = new Phaser.Math.Vector2(0, 0);

        if (this.isActionHeld(PlayerAction.MOVE_LEFT)) vector.x -= 1;
        if (this.isActionHeld(PlayerAction.MOVE_RIGHT)) vector.x += 1;
        if (this.isActionHeld(PlayerAction.MOVE_UP)) vector.y -= 1;
        if (this.isActionHeld(PlayerAction.MOVE_DOWN)) vector.y += 1;

        if (vector.lengthSq() > 0) {
            vector.normalize();
        }

        return vector;
    }

    public getPointerWorldPosition(): Phaser.Math.Vector2 {
        const pointer = this.scene.input.activePointer;
        return this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    }
    
    public reset(): void {
        this.actionTimestamps.clear();
    }
    
    public destroy(): void {
        this.scene.input.off('pointerdown');
    }
}