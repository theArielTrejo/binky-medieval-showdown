import { Player } from '../Player';

export abstract class Skill {
    public cooldown: number;
    
    constructor(cooldown: number) {
        this.cooldown = cooldown;
    }
    
    abstract activate(player: Player): void;
}
