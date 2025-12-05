import { ICommand, ActionType } from './Command';

export class InputBuffer {
    private commands: ICommand[] = [];
    private readonly bufferWindow: number = 150; // ms (Table 3 target)

    public add(cmd: ICommand): void {
        this.commands.push(cmd);
        this.prune();
    }

    private prune(): void {
        const now = Date.now();
        this.commands = this.commands.filter(c => now - c.timestamp < this.bufferWindow);
    }

    public consume<T extends ICommand>(type: ActionType): T | null {
        this.prune();
        const index = this.commands.findIndex(c => c.type === type);
        if (index !== -1) {
            return this.commands.splice(index, 1)[0] as T;
        }
        return null;
    }

    public contains(type: ActionType): boolean {
        this.prune();
        return this.commands.some(c => c.type === type);
    }

    public peek<T extends ICommand>(type: ActionType): T | null {
        this.prune();
        const cmd = this.commands.find(c => c.type === type);
        return cmd ? (cmd as T) : null;
    }
    
    public getAll(): ICommand[] {
        this.prune();
        return [...this.commands];
    }

    public clear(): void {
        this.commands = [];
    }
}
