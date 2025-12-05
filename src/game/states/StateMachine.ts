import { IState } from './IState';

export class StateMachine {
    private states: Map<string, IState> = new Map();
    private currentState: IState | null = null;
    private isChanging: boolean = false;

    public addState(key: string, state: IState): void {
        this.states.set(key, state);
    }

    public transition(key: string, data?: any): void {
        const nextState = this.states.get(key);
        if (!nextState) {
            console.warn(`StateMachine: State ${key} not found`);
            return;
        }

        if (this.currentState === nextState) return;
        
        if (this.isChanging) {
             console.warn('StateMachine: Recursive transition detected, queuing or ignoring?');
             // For safety, let's just allow it if it's the end of the previous frame, 
             // but PDF says "prevent recursive state transitions".
             return; 
        }

        this.isChanging = true;

        if (this.currentState) {
            this.currentState.exit();
        }

        this.currentState = nextState;
        this.currentState.enter(data);

        this.isChanging = false;
    }

    public update(time: number, delta: number): void {
        if (this.currentState) {
            this.currentState.execute(time, delta);
        }
    }

    public handleInput(command: any): void {
        if (this.currentState) {
             this.currentState.handleInput(command);
        }
    }
    
    public getCurrentState(): IState | null {
        return this.currentState;
    }
}
