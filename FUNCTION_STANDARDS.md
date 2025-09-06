# Function Naming Standards and Conventions

## Overview

This document establishes the standardized function naming conventions, parameter structures, and return types for the Binky project. All developers must follow these standards to ensure consistency and maintainability.

## Naming Conventions

### 1. General Rules

- **Use camelCase** for all function and method names
- **Use descriptive names** that clearly indicate the function's purpose
- **Avoid abbreviations** unless they are widely understood (e.g., `id`, `url`, `api`)
- **Use consistent verb prefixes** for similar operations
- **Keep names concise** but descriptive (aim for 2-4 words)

### 2. Function Categories and Prefixes

#### Getter Methods
```typescript
// ✅ Correct
getCurrentHealth(): number
getEnemyCount(): number
getPlayerPosition(): Vector2
getDifficultyLevel(): DifficultyLevel

// ❌ Incorrect
currentHealth(): number  // Missing 'get' prefix
health: number          // Property instead of method
```

#### Setter Methods
```typescript
// ✅ Correct
setPlayerHealth(health: number): void
setDifficultyLevel(level: DifficultyLevel): void
setPosition(x: number, y: number): void

// ❌ Incorrect
playerHealth(health: number): void  // Missing 'set' prefix
updateHealth(health: number): void  // Use 'set' for direct assignment
```

#### Boolean Check Methods
```typescript
// State checks - use 'is'
isAlive(): boolean
isVisible(): boolean
isActive(): boolean

// Decision logic - use 'should'
shouldUpdate(): boolean
shouldRender(): boolean
shouldSpawnEnemy(): boolean

// Capability checks - use 'can'
canMove(): boolean
canAttack(): boolean
canUpgrade(): boolean

// Validation - use 'has'
hasValidInput(): boolean
hasRequiredItems(): boolean
hasPermission(): boolean
```

#### Action Methods
```typescript
// Creation - use 'create'
createPlayer(): Player
createEnemy(type: EnemyType): Enemy
createUI(): void

// Updates - use 'update'
updatePosition(delta: number): void
updateHealth(amount: number): void
updateMetrics(): void

// Processing - use 'process'
processInput(): void
processCollisions(): void
processAI(): void

// Handling - use 'handle'
handleClick(event: MouseEvent): void
handleMovement(): void
handleCollision(other: GameObject): void

// Calculation - use 'calculate'
calculateDistance(a: Vector2, b: Vector2): number
calculateDamage(attacker: Player, target: Enemy): number
calculateScore(): number
```

#### Lifecycle Methods
```typescript
// Initialization
initialize(): void
initializeComponents(): void
initializeSettings(): void

// Cleanup
destroy(): void
cleanup(): void
dispose(): void

// State management
start(): void
stop(): void
pause(): void
resume(): void
reset(): void
```

### 3. Access Modifiers and Naming

#### Public Methods
- Should have clear, descriptive names
- Should be well-documented with JSDoc
- Should follow the prefix conventions above

#### Private Methods
```typescript
// ✅ Correct - descriptive private methods
private initializeComponents(): void
private calculateInternalState(): void
private handleInternalEvent(): void

// ❌ Incorrect - unclear purpose
private doStuff(): void
private helper(): void
private temp(): void
```

#### Static Methods
```typescript
// ✅ Correct - no special suffix needed
static calculateDistance(a: Vector2, b: Vector2): number
static createDefault(): Config
static validateInput(input: string): boolean

// ❌ Incorrect - unnecessary suffix
static calculateDistanceStatic(a: Vector2, b: Vector2): number
static createDefaultStatic(): Config
```

## Parameter Standards

### 1. Parameter Naming

```typescript
// ✅ Correct - descriptive parameter names
function movePlayer(deltaX: number, deltaY: number): void
function createEnemy(enemyType: EnemyType, spawnPosition: Vector2): Enemy
function calculateDamage(baseDamage: number, multiplier: number): number

// ❌ Incorrect - unclear parameter names
function movePlayer(x: number, y: number): void
function createEnemy(type: any, pos: any): any
function calculateDamage(dmg: number, mult: number): number
```

### 2. Parameter Order

1. **Required parameters first**
2. **Optional parameters last**
3. **Callback functions last**

```typescript
// ✅ Correct parameter order
function createEnemy(
  type: EnemyType,           // Required
  position: Vector2,         // Required
  health?: number,           // Optional
  onDeath?: () => void       // Callback
): Enemy

// ❌ Incorrect parameter order
function createEnemy(
  onDeath?: () => void,      // Callback should be last
  type: EnemyType,
  health?: number,
  position: Vector2          // Required should be first
): Enemy
```

### 3. Parameter Types

- **Use specific types** instead of `any`
- **Use interfaces** for complex objects
- **Use enums** for predefined values
- **Use union types** for limited options

```typescript
// ✅ Correct - specific types
interface PlayerConfig {
  health: number;
  speed: number;
  archetype: PlayerArchetypeType;
}

function createPlayer(config: PlayerConfig): Player
function setDifficulty(level: DifficultyLevel): void
function moveDirection(direction: 'up' | 'down' | 'left' | 'right'): void

// ❌ Incorrect - vague types
function createPlayer(config: any): any
function setDifficulty(level: string): void
function moveDirection(direction: string): void
```

## Return Type Standards

### 1. Explicit Return Types

Always specify return types explicitly:

```typescript
// ✅ Correct - explicit return types
function getPlayerHealth(): number
function isGameOver(): boolean
function createEnemy(): Enemy
function updatePosition(): void
function getPlayers(): Player[]
function findPlayer(id: string): Player | null

// ❌ Incorrect - implicit return types
function getPlayerHealth() // TypeScript infers, but be explicit
function isGameOver()      // Could return any truthy value
```

### 2. Consistent Return Patterns

#### For Similar Operations
```typescript
// ✅ Correct - consistent return patterns
function getPlayer(id: string): Player | null
function getEnemy(id: string): Enemy | null
function getItem(id: string): Item | null

// ❌ Incorrect - inconsistent patterns
function getPlayer(id: string): Player | undefined
function getEnemy(id: string): Enemy | null
function getItem(id: string): Item // Could throw error
```

#### For Collections
```typescript
// ✅ Correct - always return arrays, never null
function getEnemies(): Enemy[]           // Empty array if none
function getActivePlayers(): Player[]   // Empty array if none

// ❌ Incorrect - inconsistent null handling
function getEnemies(): Enemy[] | null   // Inconsistent
function getActivePlayers(): Player[]   // Good
```

## Documentation Standards

### JSDoc Requirements

All public methods must have JSDoc documentation:

```typescript
/**
 * Calculates the damage dealt by an attacker to a target.
 * 
 * @param attacker - The player dealing damage
 * @param target - The enemy receiving damage
 * @param criticalHit - Whether this is a critical hit
 * @returns The final damage amount after all calculations
 * 
 * @example
 * ```typescript
 * const damage = calculateDamage(player, enemy, false);
 * enemy.takeDamage(damage);
 * ```
 */
function calculateDamage(
  attacker: Player, 
  target: Enemy, 
  criticalHit: boolean = false
): number {
  // Implementation
}
```

### Documentation Template

```typescript
/**
 * [Brief description of what the function does]
 * 
 * [Optional: More detailed description if needed]
 * 
 * @param paramName - Description of parameter
 * @param optionalParam - Description of optional parameter (optional)
 * @returns Description of return value
 * 
 * @throws {ErrorType} Description of when this error is thrown
 * 
 * @example
 * ```typescript
 * // Usage example
 * const result = functionName(param1, param2);
 * ```
 * 
 * @since Version when this function was added
 * @deprecated Use newFunction() instead (if applicable)
 */
```

## Migration Guidelines

### Phase 1: Critical Fixes
1. Rename static methods (remove 'Static' suffix)
2. Convert getter properties to getter methods
3. Standardize boolean method prefixes

### Phase 2: Consistency Improvements
1. Standardize action method prefixes
2. Update parameter naming
3. Ensure return type consistency

### Phase 3: Documentation
1. Add JSDoc to all public methods
2. Add usage examples
3. Document error conditions

## Enforcement

- **Code reviews** must check adherence to these standards
- **ESLint rules** should be configured to enforce naming conventions
- **TypeScript strict mode** should be enabled
- **Documentation** should be required for all public APIs

## Examples of Standardized Functions

### Before and After

```typescript
// ❌ Before standardization
class EnemySystem {
  static calculateEnemyCostStatic(type: EnemyType): number { }
  enemyCount(): number { }
  shouldUseEmergencyBudget(): boolean { }
}

// ✅ After standardization
class EnemySystem {
  /**
   * Calculates the cost of spawning an enemy of the specified type.
   * @param type - The type of enemy to calculate cost for
   * @returns The cost in budget points
   */
  static calculateEnemyCost(type: EnemyType): number { }
  
  /**
   * Gets the current number of active enemies.
   * @returns The count of active enemies
   */
  getEnemyCount(): number { }
  
  /**
   * Determines if emergency budget should be used based on current game state.
   * @returns True if emergency budget should be activated
   */
  shouldUseEmergencyBudget(): boolean { }
}
```

This document serves as the definitive guide for function naming and structure in the Binky project. All new code must follow these standards, and existing code should be gradually migrated to comply.