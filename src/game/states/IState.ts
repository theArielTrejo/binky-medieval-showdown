export interface IState {
    enter(data?: any): void;
    execute(time: number, delta: number): void;
    exit(): void;
}
