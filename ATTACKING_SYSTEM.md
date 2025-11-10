# Attacking System Documentation

This document outlines the architecture of the player and mob attacking systems in the game.

## Player Attack Flow

1.  **Input Handling**: The `Player.ts` file listens for player input to initiate an attack.
2.  **Attack Type**: Based on the player's selected `PlayerArchetype`, one of three attack types is triggered: `meleeAttack`, `aoeAttack`, or `projectileAttack`.
3.  **Stats**: The player's damage, attack range, and attack speed are determined by the hardcoded values in `PlayerArchetype.ts`.
4.  **Projectile Management**: For projectile attacks, the `Player.ts` file creates and manages an array of `bullets`.
5.  **Collision Detection**: In its `update` loop, `Player.ts` checks for collisions between its `bullets` and the enemies provided by `Game.ts`. When a collision occurs, the `enemy.takeDamage()` method is called.

## Mob Attack Flow

1.  **AI-Driven Spawning**: The `AIDirector.ts` uses a TensorFlow.js model to analyze the game state (like player performance and current enemy count) and decides which enemies to spawn by calling `EnemySystem.spawnWave()`.
2.  **Game Loop Integration**: The main game loop in `Game.ts` calls `EnemySystem.update()`, which in turn calls the `update()` method for each individual `Enemy` instance.
3.  **Mob AI**: The `Enemy.update()` method contains the mob's core AI. It decides when to attack based on the player's range and the mob's attack cooldown.
4.  **Attack Instantiation**: When an enemy decides to attack, it instantiates a specific attack class (e.g., `ConeAttack`, `ArrowProjectile`) defined in `EnemySystem.ts`.
5.  **Attack Management**: The newly created attack object is returned to the `EnemySystem`, which adds it to a typed array (e.g., `this.coneAttacks`).
6.  **Player Collision**: `Game.ts` retrieves these attack arrays from `EnemySystem` (e.g., `enemySystem.getConeAttacks()`) and passes them to the player's collision detection methods (e.g., `player.checkCollisionWithConeAttacks(...)`).
7.  **Damage to Player**: The player's collision method checks for an overlap. If a hit is detected, the player's own `takeDamage()` method is called.

## Damage & Projectiles

*   **Damage Calculation**: Damage is a simple numeric value.
    *   **Player Damage**: Defined in `PlayerArchetype.ts`.
    *   **Mob Damage**: Defined in the `getStatsForType` method within `Enemy.ts`.
    *   There are no complex mechanics like damage types, resistances, or vulnerabilities.
*   **Projectile Handling**:
    *   **Player Projectiles**: These are simple `Rectangle` objects managed within the `Player.ts` file.
    *   **Enemy Projectiles**: These are more complex, with dedicated classes such as `Projectile` and `ArrowProjectile` defined in `EnemySystem.ts`. The `EnemySystem` is responsible for managing all active enemy projectiles and attacks.

## Key Files

*   `src/game/scenes/Game.ts`: The main game scene that orchestrates the entire attack system, including the top-level game loop and collision detection.
*   `src/game/Player.ts`: Defines how the player attacks, manages player projectiles, and handles taking damage.
*   `src/game/EnemySystem.ts`: A large, critical file that defines the `Enemy` class (including its AI), all enemy attack types, and the `EnemySystem` manager that handles all enemies and their attacks.
*   `src/game/PlayerArchetype.ts`: A data model that stores the base stats for each player archetype, including damage and attack speed.
*   `src/game/AIDirector.ts`: The strategic AI layer that controls enemy spawning and dynamic difficulty.
