import { Scene } from 'phaser';
import { Player } from '../Player';
import { StateMachine } from './StateMachine';
import { IState } from './IState';

export abstract class State implements IState {
    protected player: Player;
    protected scene: Scene;
    protected stateMachine: StateMachine;

    constructor(player: Player, scene: Scene, stateMachine: StateMachine) {
        this.player = player;
        this.scene = scene;
        this.stateMachine = stateMachine;
    }

    abstract enter(data?: any): void;
    abstract execute(time: number, delta: number): void;
    abstract exit(): void;
}
