import { Math } from 'phaser';

export enum ActionType {
    MOVE = 'MOVE',
    DASH = 'DASH',
    ATTACK_PRIMARY = 'ATTACK_PRIMARY',
    ATTACK_SECONDARY = 'ATTACK_SECONDARY',
    SPECIAL_1 = 'SPECIAL_1',
    INTERACT = 'INTERACT',
    TOGGLE_SKILL_TREE = 'TOGGLE_SKILL_TREE'
}

export interface ICommand {
    type: ActionType;
    timestamp: number;
    payload?: any;
}

export class MoveCommand implements ICommand {
    readonly type = ActionType.MOVE;
    timestamp: number;
    payload: Math.Vector2;

    constructor(vector: Math.Vector2) {
        this.timestamp = Date.now();
        this.payload = vector;
    }
}

export class DashCommand implements ICommand {
    readonly type = ActionType.DASH;
    timestamp: number;

    constructor() {
        this.timestamp = Date.now();
    }
}

export class SkillCommand implements ICommand {
    readonly type: ActionType;
    timestamp: number;

    constructor(type: ActionType) {
        this.type = type;
        this.timestamp = Date.now();
    }
}

export class InteractionCommand implements ICommand {
    readonly type = ActionType.INTERACT;
    timestamp: number;

    constructor() {
        this.timestamp = Date.now();
    }
}

export class ToggleSkillTreeCommand implements ICommand {
    readonly type = ActionType.TOGGLE_SKILL_TREE;
    timestamp: number;

    constructor() {
        this.timestamp = Date.now();
    }
}
