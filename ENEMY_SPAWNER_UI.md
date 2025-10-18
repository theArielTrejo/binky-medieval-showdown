# Enemy Spawner UI - Testing Tool

A debug UI tool for spawning specific enemy types during development and testing.

## Features

### Visual Buttons
- **Skeleton Viking** (Purple) - Spawn with shield and cone attack abilities
- **Golem** (Gray) - Spawn with melee rectangle attack
- **Archer** (Green) - Spawn with ranged projectile attack
- **Gnoll** (Orange) - Spawn fast melee enemy

### Keyboard Shortcuts
- **1** - Spawn Skeleton Viking at cursor
- **2** - Spawn Golem at cursor
- **3** - Spawn Archer at cursor
- **4** - Spawn Gnoll at cursor
- **T** - Toggle UI visibility

## How to Use

1. **Start the game** and select your class
2. **Click any button** to spawn that enemy type at your cursor position
3. **Use hotkeys (1-4)** for quick spawning
4. **Press T** to hide/show the UI if it's in the way

## Visual Feedback

When you spawn an enemy, you'll see:
- A white expanding circle where the enemy will appear
- Console log with enemy type and position
- The enemy spawns instantly at cursor location

## Technical Details

- Spawns enemies directly through `EnemySystem.spawnEnemy()`
- Respects max enemy limit (50 enemies)
- Uses world coordinates (accounts for camera scroll)
- Always visible at top-left corner (depth 1000)

## Console Output

```
Spawning skeleton_viking at (642, 389)
Shield created - Enemy radius: 45.2, Shield distance from center: 75.2
Cone attack created - Enemy radius: 45.2, Cone extends to: 150.0
```

Perfect for testing enemy behaviors without waiting for the AI Director!

