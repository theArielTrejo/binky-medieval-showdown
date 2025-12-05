# Refactoring Progress: Architectural Decomposition

This file tracks the progress of the refactoring plan outlined in "Monolith Refactoring Plan_ State Machine.pdf" and "REFACTOR_PLAN_PROMPT.md".

## Phase 1: Player Monolith Decomposition (COMPLETE)
- [x] Create `src/game/input/Command.ts` and `src/game/input/InputBuffer.ts`.
- [x] Refactor `InputManager` to emit Commands instead of setting boolean flags.
- [x] Modify `Player.ts` to accept `InputBuffer` in its constructor.
- [x] Create `src/game/states/AbstractState.ts` with the new, active interface.
- [x] Implement `IdleState`, `MoveState`, `AttackState`.
- [x] Refactor `Player.ts` to delegate the update loop to `stateMachine.update()`.
- [x] Define abstract `Skill` and `SkillObject` classes.
- [x] Create `SkillLoadout` class on the `Player`.
- [x] Move specific hitboxes and physics logic into new Skill classes (`ShieldBash`, `ShadowDash`, etc.).
- [x] **Result:** `Player.ts` reduced from ~800 lines to ~350 lines.

## Phase 2: Enemy Hierarchy Refactoring (COMPLETE)
- [x] Create `src/game/enemies/BaseEnemy.ts` (Abstract Base Class).
- [x] Create `src/game/enemies/EnemyFactory.ts` (Centralized Spawning).
- [x] Implement concrete subclasses in `src/game/enemies/types/`:
    - [x] `OgreEnemy` (Bone Slam, Slow Melee)
    - [x] `ArcherEnemy` (Charge Arrow, Kiting)
    - [x] `SkeletonVikingEnemy` (Shield, Cone)
    - [x] `SkeletonPirateEnemy`, `ElementalSpiritEnemy`, `LightningMageEnemy`, `GnollEnemy`.
- [x] Refactor `EnemySystem.ts` to use `BaseEnemy` and `EnemyFactory`.
- [x] Delete monolithic `src/game/enemies/Enemy.ts`.
- [x] **Result:** Polymorphic behavior established; Monolith removed.

## Phase 3: Game Scene Decoupling (COMPLETE)
**Current Status:** `Game.ts` has been significantly reduced by extracting major systems.
- [x] **Extract Physics:** Created `src/game/systems/PhysicsSystem.ts`. Handles collision setup and debug rendering.
- [x] **Extract Lighting:** Created `src/game/systems/LightingSystem.ts`. Handles Forest Darkness.
- [x] **Extract Map Logic:** Created `src/game/systems/MapInteractionSystem.ts`. Handles Door opening and Gate logic.
- [x] **Extract Animations:** Refactored `AtlasManager.ts` to handle complex character, mob, and effect animation creation. Removed ~300 lines from `Game.ts`.
- [x] **Unified Hitbox System:** Refactored `EnemySystem` to expose a `getUnifiedAttacks()` method. Refactored `CombatComponent` to have a single `checkAttacks()` method. Removed manual iteration from `Game.ts`.
- [x] **Cleanup:** `Game.ts` is now a cleaner orchestrator.

## Phase 4: Skill & Stats Cleanup (COMPLETE)
- [x] **Combat Logic:** Created `src/game/components/CombatComponent.ts`. Handles health, damage, and collision checks.
- [x] **Visual Logic:** Created `src/game/components/VisualComponent.ts`. Handles UI updates and animations.
- [x] **Stats:** Created `src/game/systems/PassiveManager.ts`.
- [x] **Decoupling:** `Player.ts` no longer has hardcoded skill string checks; uses `SkillLoadout`.

## Final Status
All originally planned phases are complete. The codebase has moved from Monolithic God Objects to a System-Component-Entity architecture.
- `Player` is lightweight (components + FSM).
- `Enemy` is polymorphic.
- `Game` is an orchestrator.
- `AtlasManager` handles resources.
- `EnemySystem` handles spawning and attack tracking.