# 🧠 AI Director System Documentation (V2)

**Current Status:** `ACTIVE` (3-Layer Neural Contextual Bandit)
**Tech Stack:** TensorFlow.js
**Location:** `src/game/systems/ai-director/`

---

## 📖 What is the AI Director?

The AI Director is the "Dungeon Master" of our game. Unlike standard games that just spawn enemies on a timer, our Director uses a **3-Layer Architecture** combining deterministic pacing with **Machine Learning** to create adaptive, varied, and fair enemy spawning.

### The "Netflix" Analogy
Think of it like the Netflix recommendation algorithm:
*   **Netflix** looks at what you watched (Context) and recommends a movie (Action) to keep you watching (Reward).
*   **Our Director** looks at your Health/DPS (Context) and spawns a "Combat Package" (Action) to keep you in the "Flow State" (Reward).

---

## 🏗️ 3-Layer Architecture

The AI Director V2 separates concerns into three distinct layers:

### Layer A: Round Director (Deterministic Pacing)
**File:** `RoundDirector.ts`

Controls global pacing WITHOUT ML:
- **Round Budget:** `base + round * linear + round² * quadratic`
- **Max Concurrent Enemies:** Increases slowly to prevent swarms
- **Spawn Cap:** Total spawns allowed per round
- **Target Stress Range:** Defines the "fun zone"

This ensures the game **reliably ramps up every round**, regardless of ML.

```typescript
// Example budget calculation
roundBudget = 120 + (round * 25) + (round² * 1.5)
maxAlive = clamp(8 + floor(round * 0.8), 8, 30)
```

### Layer B: Package Generator (Rules + Constraints)
**File:** `PackageGenerator.ts`

Defines **what spawns are allowed** right now:
- **Spawn Packages:** Pre-designed "combat questions" (enemy mixes + formations)
- **Anti-Repetition Rules:** No-repeat windows, tag diversity requirements
- **Cooldowns:** Per-package and per-tag cooldowns
- **Counter-Playstyle Tags:** Packages that punish specific player behaviors

Example package tags:
- `antiKite` - Counters players who stay at range
- `antiCamp` - Counters players who stay in one spot
- `antiAoE` - Counters players who rely on area damage
- `swarm` - Many weak enemies
- `elite` - Fewer, tougher enemies

### Layer C: ML Selector (Contextual Bandit)
**File:** `MLSelector.ts`

The bandit **chooses among valid candidates** to maximize "flow":
- **Thompson Sampling:** Principled exploration based on uncertainty
- **Novelty Bonus:** Rewards variety in package selection
- **Repetition Penalty:** Punishes monotonous spawning
- **Context-Aware Exploration:** More exploration when bored, less when in danger

ML is **NOT inventing spawns**—it's picking the next beat from a curated set.

---

## ⚙️ How It Works

### 1. Round Start
```
Layer A (RoundDirector) calculates:
  → Round budget (total spawn points)
  → Max concurrent enemies
  → Target stress range
```

### 2. Each Decision Tick (~2.5 seconds)
```
Layer B (PackageGenerator) generates candidates:
  → Filter by: budget, cooldown, round requirements
  → Calculate novelty/repetition scores
  → Apply anti-synergy rules

Layer C (MLSelector) ranks candidates:
  → ML predicts reward for each candidate
  → Combines ML score + novelty - repetition
  → Applies exploration strategy
  → Returns best package + intensity

Layer A validates and executes:
  → Spend budget
  → Spawn enemies
  → Update tracking
```

### 3. Learning
```
After each spawn, calculate reward:
  → Flow reward (in target stress zone?)
  → Engagement bonus (player active?)
  → Variety bonus (enemy type mix)
  → Novelty bonus (package variety)
  → Repetition penalty (same package streak)

Update ML model via online learning
```

---

## 🎯 Spawn Packages (Combat Questions)

Instead of "always spawn archers," packages are **combat questions**:

| Package ID | Tags | Description |
|------------|------|-------------|
| `anti_kite_flankers` | antiKite, flanker | Fast enemies from multiple angles |
| `anti_camp_rush` | antiCamp, swarm | Multi-directional melee rush |
| `anti_aoe_spread` | antiAoE, elite | Spread out tough enemies |
| `anti_single_swarm` | antiSingleTarget, swarm | Many weak enemies |
| `elite_ogre` | elite, antiTank | Heavy hitter with support |
| `mixed_escalation` | mixed, flanker | Starts weak, reinforcements arrive |
| `breather_light` | mixed | Low pressure for recovery |

---

## 🛡️ Safety Rules (ML Cannot Override)

```typescript
SafetyRules = {
    absoluteMaxAlive: 50,           // Never exceed this
    minTimeBetweenBeats: 1500,      // Min ms between spawns
    breatherHealthThreshold: 0.20,  // Force breather if HP < 20%
    mercyModeThreshold: 0.15        // Reduce intensity if HP < 15%
}
```

---

## 🛠️ How to Modify (Safely)

### 1. Adding New Packages
Edit `PackageGenerator.ts`, add to `initializePackageLibrary()`:

```typescript
{
    id: 'my_new_package',
    name: 'My Package',
    description: 'What it does',
    tags: ['antiKite', 'swarm'],
    baseCost: 80,
    minRound: 3,
    cooldownBeats: 3,
    getCost: (round, intensity) => 80 + round * 6,
    buildWave: (context, round, intensity) => [
        { enemyType: EnemyType.GNOLL, count: 4 + intensity, spawnPattern: 'flanking' }
    ]
}
```

### 2. Adjusting Difficulty Scaling
Edit `RoundDirector.ts`, modify difficulty configs:

```typescript
// In initializeDifficultyConfigs()
this.difficultyConfigs.set('medium', {
    baseBudget: 120,        // Starting budget
    budgetPerRound: 25,     // Linear increase
    budgetQuadratic: 1.5,   // Quadratic increase (small)
    baseMaxAlive: 8,        // Starting enemy cap
    targetStressMin: 0.45,  // Lower bound of "fun zone"
    targetStressMax: 0.70,  // Upper bound of "fun zone"
    // ...
});
```

### 3. Adjusting Rewards
Edit `MLSelector.ts`, modify `calculateReward()`:

```typescript
// Flow reward (being in target stress zone)
if (stressDist < 0.1) components.flowReward = 1.0;

// Engagement bonus
components.engagementBonus = currContext.engagementScore * 0.5;

// Novelty bonus (from boredom metrics)
components.noveltyBonus = boredomMetrics.entropy * 0.2;

// Repetition penalty
components.repetitionPenalty = 
    (boredomMetrics.samePackageStreak * 0.1) +
    (boredomMetrics.sameTagStreak * 0.05);
```

---

## 📊 Metrics & Debugging

### Console Output
```
[AIDirectorV2] Executed "Flanking Rush" (MEDIUM) - Cost: 85, Spawned: 6
[RoundDirector] Round 5 | Budget: 215/300 | Spawned: 18/35 | Beats: 4
```

### In-Game Status
```typescript
aiDirector.getStatus()        // Overall status
aiDirector.getBudgetStatus()  // Budget remaining
aiDirector.getTacticalStatus() // Last package, streaks
```

---

## 🔮 Key Improvements Over V1

| Feature | V1 (Old) | V2 (New) |
|---------|----------|----------|
| Architecture | Single monolithic class | 3-layer separation |
| Spawn Variety | Pick enemy type | Pick curated "combat packages" |
| Anti-Repetition | Hope ML behaves | Hard constraints + novelty rewards |
| Budget | Simple regen | Round-based with scaling |
| Exploration | ε-greedy only | Thompson Sampling + context-aware ε |
| Safety | Basic health check | Breathers, mercy mode, hard caps |
| Playstyle Counter | Limited | Rich context features (kiting, camping, AoE) |

---

## 🚀 Future Plans

1. **Palette Rotation:** Different enemy "families" per round theme
2. **Boss Encounters:** Special packages for milestone rounds
3. **Player Archetypes:** Learn per-archetype preferences
4. **Offline Training:** Train models on collected gameplay data
5. **A/B Testing:** Compare different package sets

---

*Last Updated: AI Director V2 - 3-Layer Architecture*
