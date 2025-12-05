import { ICommand } from '../input/Command';

export interface IState {
    enter(data?: any): void;
    execute(time: number, delta: number): void;
    exit(): void;
    handleInput(command: ICommand): void;
}
