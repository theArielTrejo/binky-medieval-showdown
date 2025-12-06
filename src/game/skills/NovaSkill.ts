import { Skill } from './Skill';
import { Player } from '../Player';
import { NovaOptions } from './SkillObjects';
import { Game } from '../scenes/Game';
import { SpellMissileObject } from './objects/SpellMissileObject';

export class NovaSkill extends Skill {
    constructor() {
        super(1000); // 1.0s base cooldown
    }

    activate(player: Player): void {
        const unlocked = player.scene.registry.get('unlockedSkills') as Map<string, boolean> || new Map();

        let radius = 40; // Reduced base radius (User requested ~67% reduction from 120)
        let damage = player.archetype.stats.damage;
        const options: NovaOptions = {};

        // --- Sorcerer Tree Integration ---

        // Controller Path
        if (unlocked.get("Gravity Well")) {
            options.pull = true;
        }

        if (unlocked.get("Chilling Field")) {
            options.slow = true;
        }

        if (unlocked.get("Arcane Siphon")) {
            options.heal = 0.01; // 1% Max HP per hit
        }

        // Conduit Path
        if (unlocked.get("Amplitude")) {
            radius *= 1.25;
        }

        if (unlocked.get("Arcane Vulnerability")) {
            options.sunder = true;
        }

        // Cast at mouse cursor
        const pointer = player.inputManager.getPointerWorldPosition();
        const game = player.scene as Game;

        // Create Missile (Tween manages its lifecycle)
        new SpellMissileObject(
            game,
            player.sprite.x,
            player.sprite.y,
            pointer.x,
            pointer.y,
            600, // Speed
            () => {
                // On Impact: Cast Nova at target location
                game.getPlayerSkillSystem().castNova(pointer.x, pointer.y, damage, radius, options);
            }
        );

        // Apply Cooldown (affected by attack speed)
        const cd = this.cooldown / player.archetype.stats.attackSpeed;
        player.cooldownManager.startCooldown('PRIMARY_SKILL', cd);
    }
}
