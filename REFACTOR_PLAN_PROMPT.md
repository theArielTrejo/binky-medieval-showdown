# Request for Architectural Refactoring Plan: Binky's Medieval Showdown

## 1. Project Context
**Engine:** Phaser 3
**Language:** TypeScript
**Bundler:** Vite
**Core Gameplay:** Top-down survival rogue-like. The player chooses a class (Knight, Mage, Ninja), fights waves of enemies (Ogres, Archers, Spirits), unlocks skills via a tree, and progresses through rounds.

## 2. The Problem: Identified Monoliths
We have identified three "God Objects" that violate SOLID principles. We need a step-by-step refactoring plan to break these down without breaking the game.

### A. `src/game/scenes/Game.ts` (The God Scene)
**Current State:** ~1300 lines.
**Responsibilities:** 
- Orchestrates the entire game loop.
- Manages asset loading (redundantly).
- **Critical Issue:** Manages collision detection manually (iterating through arrays of objects).
- **Critical Issue:** Handles domain logic like "Forest Darkness" (lighting) and "Door Opening" (map interaction) directly in the `update()` loop.
- **Critical Issue:** Direct coupling to UI and specific sub-systems.

### B. `src/game/enemies/Enemy.ts` (The Polymorphic Nightmare)
**Current State:** ~1100 lines.
**Responsibilities:** Represents *every* enemy type.
**Critical Issue:** Uses massive `switch (this.type)` statements for `update()`, `attack()`, `movement`, and `stats`.
**Critical Issue:** Contains unused properties for specific enemy types (e.g., `isChargingArrow` exists on Ogres).
**Goal:** Needs to be refactored into an abstract base class with specific subclasses (Inheritance) or a Component-Entity system.

### C. `src/game/Player.ts` (Feature Envy)
**Current State:** ~800 lines.
**Responsibilities:** Player movement, input, state machine integration, combat.
**Critical Issue:** "Hardcoded" skill logic. Checks specific registry strings (`if unlocked.get("Headshot")`) inside attack methods.
**Critical Issue:** Manually calculates collision against enemy arrays instead of delegating to a Physics system.

---

## 3. Proposed Architectural Changes
We want to move towards a modular, system-based architecture.

### Proposed Directory Structure Changes
We recommend creating specific folders to house the extracted logic.

```text
src/game/
├── components/             <-- NEW: Reusable components (Health, Hitbox, Movement)
│   ├── HealthComponent.ts
│   ├── CombatComponent.ts
│   └── PhysicsComponent.ts
├── enemies/
│   ├── BaseEnemy.ts        <-- NEW: Abstract class
│   ├── EnemyFactory.ts     <-- NEW: Central spawning logic
│   └── types/              <-- NEW: Specific implementations
│       ├── Ogre.ts
│       ├── Archer.ts
│       └── Spirit.ts
├── systems/
│   ├── CollisionSystem.ts  <-- NEW: extracted from Game.ts
│   ├── LightingSystem.ts   <-- NEW: extracted from Game.ts (Forest darkness)
│   ├── MapSystem.ts        <-- NEW: extracted from Game.ts (Doors/Walls)
│   └── ProjectileSystem.ts
```

---

## 4. File Inventory & Dependency Map
Below is a comprehensive list of all files in the project, their responsibilities, and their key dependencies. This should help identify "coupling" hotspots.

### Core
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/main.ts` | Application Entry Point. Bootstraps Phaser. | `game/main.ts` |
| `src/game/main.ts` | Game Configuration (Scene list, Physics config). | `scenes/Game`, `scenes/Menu`, `scenes/Preloader` |

### Scenes
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/scenes/Game.ts` | **[MONOLITH]** Main gameplay loop. | *Almost everything*: `Player`, `EnemySystem`, `AIDirector`, `RoundManager`, `UI` |
| `src/game/scenes/Menu.ts` | Main Menu (Play/Settings). Renders background map. | `EnhancedDesignSystem`, `ClassSelectionScene` |
| `src/game/scenes/Preloader.ts` | Handles asset loading (images, atlases, tilemaps). | Phaser Loader |
| `src/game/scenes/ClassSelectionScene.ts` | Lightweight scene for picking Knight/Mage/Ninja. | `ClassSelectionUI` |
| `src/game/scenes/SkillTreeScene.ts` | Visual skill tree interface. | `SkillTreeData`, `PlayerArchetype` |

### Game Objects (Entities)
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/Player.ts` | **[MONOLITH]** Player logic, FSM, Combat stats. | `StateMachine`, `InputManager`, `SkillSystem`, `Archetype` |
| `src/game/objects/PlayerArchetype.ts` | Data class for stats (Health, XP, Level) per class. | `PlayerTypes` |
| `src/game/enemies/Enemy.ts` | **[MONOLITH]** All enemy logic (AI, rendering, combat). | `HardcodedMobSkins`, `AnimationMappings`, `Attacks/*` |
| `src/game/objects/BaseProjectile.ts` | Abstract base for projectiles. | Phaser Arcade Physics |
| `src/game/objects/Shuriken.ts` | Ninja specific projectile. | `BaseProjectile` |
| `src/game/objects/XPOrb.ts` | Collectible experience item. | Phaser Arcade Physics |

### Enemies & Attacks
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/enemies/attacks/*.ts` | Specific attack logic implementations. | `Scene` |
| *Includes:* `ArrowProjectile.ts`, `ClawAttack.ts`, `ConeAttack.ts`, `EnemyProjectile.ts`, `ExplosionAttack.ts`, `LightningStrikeAttack.ts`, `MeleeAttack.ts`, `Shield.ts`, `VortexAttack.ts` | | |

### Systems (Managers)
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/systems/EnemySystem.ts` | Spawns and manages the lifecycle of `Enemy` instances. | `Enemy`, `XPOrbSystem`, `Player` |
| `src/game/systems/AIDirector.ts` | Analyzes game state to adjust difficulty/spawning. | `EnemySystem`, `Player` |
| `src/game/systems/RoundManager.ts` | Manages Wave/Round progression and difficulty scaling. | `EnemySystem`, `AIDirector` |
| `src/game/systems/InputManager.ts` | Abstracts keyboard/mouse input into `PlayerAction`. | Phaser Input |
| `src/game/systems/CooldownManager.ts` | Manages ability cooldown timers. | `Scene` |
| `src/game/systems/XPOrbSystem.ts` | Object pooling for XP Orbs. | `XPOrb` |
| `src/game/systems/TilemapManager.ts` | Loads Tiled maps and layers. | Phaser Tilemaps |
| `src/game/systems/AtlasManager.ts` | Loads and manages texture atlases. | Phaser Loader |
| `src/game/systems/SpriteSheetManager.ts` | Legacy/Backup sprite loading system. | Phaser Loader |
| `src/game/systems/AssetManager.ts` | General asset loader helper. | Phaser Loader |
| `src/game/systems/MobSpawner.ts` | Helper for positioning mobs (used by EnemySystem). | `TilemapManager` |
| `src/game/systems/HardcodedMobSkins.ts` | Maps enemy types to specific texture frames. | `EnemyTypes` |

### Skills & State Machine
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/skills/PlayerSkillSystem.ts` | Manages active skills (Dash, Shield Bash). | `SkillObject`, `Player` |
| `src/game/skills/*.ts` | Specific skill implementations (`Whirlwind`, `ShadowDash`, etc). | `SkillObject` |
| `src/game/states/*.ts` | Player FSM States (`Idle`, `Move`, `Attack`). | `Player`, `StateMachine` |
| `src/game/data/SkillTreeData.ts` | Static data defining the skill tree layout/nodes. | - |

### UI
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/ui/UIScene.ts` | HUD overlay (Health, XP, Level). | `Player`, `LevelBarUI` |
| `src/ui/ClassSelectionUI.ts` | Visual card selection for classes. | `PlayerArchetype` |
| `src/ui/MobSpawnerUI.ts` | Debug UI for spawning mobs. | `Game` |
| `src/ui/EnhancedDesignSystem.ts` | Styling constants (colors, fonts). | - |
| `src/ui/AIMetricsDashboard.ts` | Debug UI for AI Director stats. | `AIDirector` |

### Config & Types
| File | Description | Key Dependencies |
| :--- | :--- | :--- |
| `src/game/config/AnimationMappings.ts` | Maps animation names to atlas frames. | - |
| `src/game/types/*.ts` | TypeScript interfaces for Entities, Input, Enums. | - |

---

## 5. Reference Code Examples

The following are examples of "Good Code" currently in the project. The refactoring should aim to mimic these patterns (SRP, Type Safety, Clean Interfaces).

### A. `src/game/states/StateMachine.ts` (State Pattern)
This file cleanly implements a Finite State Machine. Note how it is generic, decoupled from specific implementations, and handles transitions cleanly.

```typescript
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
             // Recursive safety check
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
}
```

### B. `src/game/skills/SkillObjects.ts` (Configurable Objects)
This file demonstrates how to create flexible game objects using configuration interfaces (`ProjectileOptions`). This pattern should be used when refactoring enemies to avoid hardcoding behaviors.

```typescript
export interface ProjectileOptions {
    ricochet?: boolean;
    freeze?: boolean;
    homing?: boolean;
    explosive?: boolean;
    crit?: boolean;
}

export class PlayerProjectile extends BaseProjectile {
    public options: ProjectileOptions;

    constructor(scene: Scene, x: number, y: number, targetX: number, targetY: number, damage: number, speed: number = 400, texture?: string, options: ProjectileOptions = {}) {
        super(scene, damage);
        this.options = options;
        
        // ... setup logic ...
        
        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.velocityX = (dx / distance) * speed;
            this.velocityY = (dy / distance) * speed;
            this.sprite.rotation = Math.atan2(dy, dx);
        }
    }
}
```

---

## 6. Task for the Researcher

Based on the information above, please generate a **Phased Refactoring Plan**.

**Phase 1: The Game Scene Decoupling**
- How to extract the Collision detection loop from `Game.ts` into a `PhysicsSystem`?
- How to extract the "Forest Darkness" visual logic into a `LightingSystem`?
- How to clean up `Game.ts` so it only initializes systems and handles the main Scene lifecycle?

**Phase 2: The Enemy Hierarchy**
- Design the `BaseEnemy` abstract class. What shared properties belong here?
- Show how to refactor the giant `switch` statements in `Enemy.ts` into polymorphic methods (e.g., `performAttack()`, `updateBehavior()`) within subclasses like `Ogre.ts` and `Archer.ts`.
- Define the `EnemyFactory` pattern to replace the current spawning logic.

**Phase 3: Player & Skills Cleanup**
- How to decouple specific skill names (strings) from the `Player.ts` class?
- Proposal for a `PassiveManager` or `SkillModifierSystem` that intercepts damage calculations so `Player.ts` doesn't need to know about "Headshot" or "Vampirism".

**Deliverable:**
Please provide specific code snippets for the interfaces/abstract classes and a list of files to create/delete in each phase.
