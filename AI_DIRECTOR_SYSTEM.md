# 🧠 AI Director System Documentation

**Current Status:** `ACTIVE` (Neural Contextual Bandit)
**Tech Stack:** TensorFlow.js
**Location:** `src/game/AIDirector.ts`

---

## 📖 What is the AI Director?

The AI Director is the "Dungeon Master" of our game. Unlike standard games that just spawn enemies on a timer, our Director uses **Machine Learning** to watch the player and decide exactly what to spawn to make the game "fun."

### The "Netflix" Analogy
Think of it like the Netflix recommendation algorithm:
*   **Netflix** looks at what you watched (Context) and recommends a movie (Action) to keep you watching (Reward).
*   **Our Director** looks at your Health/DPS (Context) and spawns a Monster (Action) to keep you in the "Flow State" (Reward).

## ⚙️ How It Works (The Algorithm)

We moved away from heavy Deep Reinforcement Learning (DQN) to a faster, lighter algorithm called a **Neural Contextual Bandit**.

1.  **Observe (Context):** Every few seconds, the AI takes a snapshot of the game:
    *   Player Health & DPS
    *   Movement patterns (Camping vs. Running)
    *   Current enemy count
    *   Stress Level (How overwhelmed the player looks)

2.  **Predict (Action):** The Neural Network predicts: *"If I spawn a Gnoll right now, how much 'Flow' will the player feel?"* It does this for every possible enemy type and picks the winner.

3.  **Learn (Reward):** After the action happens, it calculates a score:
    *   **Too Easy?** (Player full health, bored) = Low Reward.
    *   **Too Hard?** (Player died instantly) = Negative Reward.
    *   **Just Right?** (Player took some damage but survived and moved a lot) = **High Reward**.

The model updates itself *while you play*. If you are good at kiting Zombies, the AI learns that Zombies don't stress you out, so it might start spawning Archers instead.

## 🛡️ The Budget System (Safety Rails)

To prevent the AI from unfairly swarming the player, it is constrained by a **Resource Budget**.
*   The Director regenerates "credits" over time.
*   Spawning a Skeleton costs small credits.
*   Spawning an Ogre costs huge credits.
*   If the AI wants to spawn an Ogre but has no credits, it is forced to wait.

## 🛠️ How to Modify (Safely)

If you need to tweak the game balance, **do not touch the neural network**. Instead, tweak these safe areas:

### 1. Modifying Enemy Costs
Look for `calculateOptimalSpawns` in `AIDirector.ts`.
```typescript
const costs = { 
    skeletonViking: 50, 
    archer: 30, 
    gnoll: 20, 
    ogre: 100 
};
```
Changing these numbers affects how expensive enemies are for the AI.

### 2. Modifying "Fun"
Look for `calculateReward`. This determines what the AI thinks is "good."
*   If you want the game to be more chaotic, increase the reward for `playerMovementDistance`.
*   If you want the game to be harder, shift the `targetStress` variable higher.

### 3. Hard Rules (Overrides)
Look for `strategicObjectives`. These are "If/Then" rules that override the AI.
*   *Example:* "If player HP > 90%, force spawn Gnolls."
You can add new dramatic moments here without knowing ML.

## 🔮 Future Plans & Roadmap

Currently, the model starts fresh every game (Online Learning). We plan to expand this:

### 1. The "Dumb" Model (Static/Random)
**Goal:** For low-end devices or "Classic Mode."
*   Remove TensorFlow.js entirely.
*   Use simple random probability (RNG) to spawn enemies.
*   Useful for debugging if the AI is acting weird.

### 2. The "Aggressive" Model (Pre-Trained)
**Goal:** For "Hardcore Mode."
*   Train a version of the AI that **inverts the reward function**.
*   Instead of optimizing for "Fun/Flow," it optimizes for "Player Death."
*   It will actively look for your weaknesses (e.g., if you have low armor, it spams fast attackers).

### 3. The "Pity" Director
**Goal:** For "Story Mode."
*   An AI that detects when you are about to quit and intentionally spawns weaker enemies or "accidentally" spawns health drops (via loot tables).

---