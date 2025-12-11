# Binky Medieval Showdown - Character Abilities Design Document

## Overview

This document outlines the abilities each character archetype needs to adapt to various playstyles while maintaining their unique identity. The goal is to ensure every archetype can handle all enemy types and situations through their own distinct toolkit.

---

## Current Archetype Overview

### 1. TANK (The Gladiator)
**Identity:** High durability, melee-focused, frontline fighter
**Characters:** Knight, Armored Knight, Paladin Knight

| Stat | Value |
|------|-------|
| Max Health | 1000 |
| Speed | 200 |
| Damage | 150 |
| Attack Range | 60 (Melee) |
| Attack Speed | 2.0 |

**Current Skills:**
- **Primary (Cleave):** Melee arc attack with upgrades for lifesteal, sunder, and execution
- **Secondary (Shield Bash):** Charge toward cursor, dealing damage and knockback
- **Special (Whirlwind):** Sustained AOE damage around player

**Skill Tree:** Gladiator (Juggernaut + Blademaster paths)

---

### 2. GLASS CANNON (The Sorcerer)
**Identity:** High damage, fragile, ranged AOE specialist
**Characters:** Magician

| Stat | Value |
|------|-------|
| Max Health | 400 |
| Speed | 250 |
| Damage | 225 |
| Attack Range | 300 (Ranged) |
| Attack Speed | 4.0 |

**Current Skills:**
- **Primary (Nova):** Launches spell missile that explodes in AOE at target location
- **Secondary (Shadow Dash):** Short-range dash with damage through enemies
- **Special (Whirlwind):** *(Likely placeholder - should have unique skill)*

**Skill Tree:** Sorcerer (Controller + Conduit paths)

---

### 3. EVASIVE (The Ranger)
**Identity:** High mobility, projectile-focused, hit-and-run specialist
**Characters:** Ninja, Archer, Elf Archer

| Stat | Value |
|------|-------|
| Max Health | 600 |
| Speed | 400 (Very Fast) |
| Damage | 100 |
| Attack Range | 150 (Medium) |
| Attack Speed | 3.0 |

**Current Skills:**
- **Primary (Shuriken Fan):** Fires 3 shurikens in a spread pattern
- **Secondary (Shadow Dash):** Short-range dash with damage
- **Special (Whirlwind):** *(Likely placeholder - should have unique skill)*

**Skill Tree:** Ranger (Sniper + Trickster paths)

---

## Ability Gaps Analysis

### Tank - Missing Capabilities

| Challenge | Current Solution | Gap |
|-----------|------------------|-----|
| Ranged enemies | Shield Bash gap-close | ✅ Adequate |
| Swarm clear | Cleave + Whirlwind | ✅ Adequate |
| Zone control enemies | Shield Bash through | ⚠️ Limited (needs more gap-close options) |
| High mobility enemies | Whirlwind if they approach | ❌ No ranged option |
| Burst damage | Cleave + Execution | ✅ Adequate |
| Sustain | Lifesteal | ✅ Adequate |
| Crowd control | Shield Bash knockback | ⚠️ Limited (single target) |

### Glass Cannon - Missing Capabilities

| Challenge | Current Solution | Gap |
|-----------|------------------|-----|
| Melee swarms | Nova AOE | ✅ Adequate |
| Single target burst | Nova (overkill) | ⚠️ Inefficient |
| Self-defense | Shadow Dash escape | ✅ Adequate |
| Sustained damage | Fast attack speed | ⚠️ Mana/cooldown limited |
| Crowd control | Gravity Well pull | ✅ With upgrade |
| Mobility | 250 speed + Shadow Dash | ⚠️ Dash shares with defense |
| Survivability | 400 HP | ❌ Very fragile |

### Evasive - Missing Capabilities

| Challenge | Current Solution | Gap |
|-----------|------------------|-----|
| Large groups | Shuriken spread | ⚠️ Limited AOE |
| Single target | Shurikens | ✅ Adequate |
| Gap creation | Shadow Dash + 400 speed | ✅ Adequate |
| Sustained DPS | Fast attack + piercing | ✅ With upgrades |
| Boss fights | Piercing + Long Shot | ⚠️ Time consuming |
| Crowd control | Frost Shot slow | ✅ With upgrade |
| Survivability | 600 HP + mobility | ✅ Adequate |

---

## Recommended New Abilities

### TANK Additions

#### 1. **Ground Slam** (New Special)
**Purpose:** AOE crowd control to replace generic Whirlwind

```
Description: Slam the ground, dealing damage and stunning 
enemies in a radius for 1.5 seconds.

Cooldown: 8 seconds
Damage: 100% of base damage
Range: 120 pixel radius
Effect: Stun (1.5s)
```

**Why Needed:**
- Gives Tank unique identity (currently shares Whirlwind with others)
- Provides hard CC that synergizes with melee playstyle
- Counter for fast enemies (Gnolls, Spirits)

#### 2. **Taunt** (New Utility)
**Purpose:** Control enemy aggro and protect squishier allies (future co-op)

```
Description: Force all enemies within range to target you 
for 3 seconds. Gain 30% damage reduction while active.

Cooldown: 15 seconds
Range: 200 pixel radius
Duration: 3 seconds
Effect: Forced aggro + 30% damage reduction
```

**Why Needed:**
- Unique Tank identity mechanic
- Enables protecting objectives or allies
- Creates tactical opportunities

#### 3. **Iron Skin** (Passive/Skill Tree)
**Purpose:** Scaling survivability for late-game

```
Description: Taking damage builds Iron stacks (max 10). 
Each stack grants 2% damage reduction. Stacks decay 
over 5 seconds out of combat.

Effect: Up to 20% damage reduction when actively fighting
```

**Why Needed:**
- Rewards aggressive Tank playstyle
- Scaling survivability without being overpowered early

---

### GLASS CANNON Additions

#### 1. **Arcane Barrage** (New Special - Replace Whirlwind)
**Purpose:** Sustained single-target DPS option

```
Description: Channel a beam of arcane energy at the cursor 
for 3 seconds, dealing rapid damage to enemies in the path.

Cooldown: 10 seconds
Damage: 50% of base damage per tick (10 ticks/second)
Range: 400 pixels
Effect: Can be aimed while channeling
```

**Why Needed:**
- Single-target DPS option (Nova is AOE-focused)
- Different playstyle option
- Better boss damage

#### 2. **Arcane Shield** (New Utility)
**Purpose:** Defensive option for glass cannon

```
Description: Create a barrier that absorbs the next 200 
damage. While active, you cannot attack but move 20% faster.

Cooldown: 12 seconds
Duration: 4 seconds or until broken
Effect: 200 damage shield + 20% speed
```

**Why Needed:**
- Desperately needed survivability
- Creates interesting decision (offense vs defense)
- Escape tool

#### 3. **Blink** (Replace or Upgrade Shadow Dash)
**Purpose:** Pure mobility tool distinct from damage dash

```
Description: Instantly teleport a short distance in the 
direction you're moving. Brief invulnerability during teleport.

Cooldown: 4 seconds
Range: 150 pixels
Effect: I-frames during teleport
```

**Why Needed:**
- Glass Cannon needs reliable escape
- Separates mobility from damage (Shadow Dash does both)
- Lower cooldown for more frequent escapes

#### 4. **Meteor** (Ultimate Ability)
**Purpose:** High-impact ultimate for dramatic moments

```
Description: Call down a meteor at the target location after 
2 seconds. Massive AOE damage and leaves burning ground.

Cooldown: 30 seconds
Damage: 500% of base damage
Range: Anywhere on screen
Effect: 150 pixel radius, burning ground (3s)
```

**Why Needed:**
- "Power fantasy" fulfillment for mage archetype
- Screen-clear for emergencies
- High skill expression (long delay)

---

### EVASIVE Additions

#### 1. **Smoke Bomb** (New Special - Replace Whirlwind)
**Purpose:** Unique escape/utility tool

```
Description: Drop a smoke bomb at your location. Enemies 
inside lose sight of you and are slowed. You gain 50% 
movement speed for 2 seconds.

Cooldown: 8 seconds
Duration: 3 seconds (smoke), 2 seconds (speed buff)
Range: 100 pixel radius
Effect: Blind + 30% slow to enemies, 50% speed to player
```

**Why Needed:**
- Unique Evasive identity (Ninja theme)
- Crowd control + escape in one ability
- Synergizes with hit-and-run playstyle

#### 2. **Caltrops** (New Trap Ability)
**Purpose:** Area denial and kiting tool

```
Description: Throw caltrops that remain on the ground for 
5 seconds. Enemies walking through take damage and are 
slowed by 50%.

Cooldown: 6 seconds
Damage: 30% of base damage per second
Duration: 5 seconds
Range: 80 pixel radius
Effect: DOT + 50% slow
```

**Why Needed:**
- Enables kiting playstyle
- Zone control for Evasive archetype
- Trap/setup gameplay variety

#### 3. **Mark for Death** (Utility/Debuff)
**Purpose:** Single-target burst enabler

```
Description: Mark an enemy, causing them to take 30% 
increased damage from all sources for 5 seconds. If the 
marked enemy dies, cooldown is reset.

Cooldown: 10 seconds (reset on kill)
Duration: 5 seconds
Effect: 30% damage amplification
```

**Why Needed:**
- Single-target burst improvement
- Synergizes with Ranger skill tree
- Rewards skilled target selection

#### 4. **Volley** (Ultimate Ability)
**Purpose:** AOE burst for swarm situations

```
Description: Leap backward and fire a massive spread of 
projectiles in a cone. Each projectile deals full damage.

Cooldown: 20 seconds
Damage: 100% per projectile (15 projectiles)
Range: 300 pixels cone
Effect: Backward leap creates distance
```

**Why Needed:**
- Emergency swarm clear
- Creates space while dealing damage
- High skill expression (aim cone)

---

## Ability Loadout Structure

### Recommended Layout Per Archetype

```
┌─────────────────────────────────────────────────────────┐
│                     ABILITY SLOTS                        │
├─────────────┬─────────────┬─────────────┬───────────────┤
│   PRIMARY   │  SECONDARY  │   SPECIAL   │   ULTIMATE    │
│  (Auto/LMB) │    (RMB)    │     (Q)     │      (R)      │
├─────────────┼─────────────┼─────────────┼───────────────┤
│  Main DPS   │   Mobility  │   Utility   │  Screen-Clear │
│   Skill     │   /Escape   │   /Control  │   /Emergency  │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

### TANK Final Loadout
| Slot | Ability | Cooldown |
|------|---------|----------|
| Primary | Cleave | 0.5s |
| Secondary | Shield Bash | 2.5s |
| Special | Ground Slam | 8s |
| Ultimate | Battle Cry (Taunt) | 15s |
| Passive | Iron Skin | - |

### GLASS CANNON Final Loadout
| Slot | Ability | Cooldown |
|------|---------|----------|
| Primary | Nova | 0.25s |
| Secondary | Blink | 4s |
| Special | Arcane Barrage | 10s |
| Ultimate | Meteor | 30s |
| Passive | Arcane Shield (manual) | 12s |

### EVASIVE Final Loadout
| Slot | Ability | Cooldown |
|------|---------|----------|
| Primary | Shuriken Fan | 0.33s |
| Secondary | Shadow Dash | 2s |
| Special | Smoke Bomb | 8s |
| Ultimate | Volley | 20s |
| Passive | Mark for Death (manual) | 10s |

---

## Enemy Counter Matrix (With New Abilities)

### How Each Archetype Handles Each Enemy

| Enemy | Tank Solution | Glass Cannon Solution | Evasive Solution |
|-------|--------------|----------------------|------------------|
| **Gnoll Swarm** | Cleave + Ground Slam stun | Nova AOE | Shuriken spread + Smoke Bomb |
| **Archer** | Shield Bash gap-close | Blink dodge + Nova | High speed + Shadow Dash |
| **Viking (Shield)** | Flank with Shield Bash | Nova ignores shield | Dash behind + Shuriken |
| **Ogre** | Face-tank + Cleave lifesteal | Kite with Nova | Kite + Mark for Death |
| **Pirate (Vortex)** | Shield Bash through | Blink out | Natural speed escape |
| **Spirit (Suicide)** | Ground Slam knockback | Blink away | Smoke Bomb + retreat |
| **Lightning Mage** | Shield Bash gap-close | Blink dodge strikes | Natural speed dodge |

---

## Skill Tree Integration

### New Nodes Needed

#### Tank - Juggernaut Path Addition
```
- "Shockwave" (Tier 4): Ground Slam now also knocks enemies 
  back and creates a shockwave dealing 50% damage at the edge.
```

#### Tank - Blademaster Path Addition
```
- "Bloodlust" (Tier 4): Killing an enemy during Whirlwind 
  extends its duration by 0.5 seconds.
```

#### Glass Cannon - Controller Path Addition
```
- "Time Warp" (Tier 4): Blink now leaves behind a slow field 
  that reduces enemy speed by 40% for 2 seconds.
```

#### Glass Cannon - Conduit Path Addition
```
- "Overcharged" (Tier 4): Arcane Barrage deals 20% more 
  damage for each second of continuous channeling.
```

#### Evasive - Sniper Path Addition
```
- "Perfect Shot" (Tier 4): Mark for Death targets take 
  double damage from critical hits.
```

#### Evasive - Trickster Path Addition
```
- "Powder Keg" (Tier 4): Smoke Bomb explodes when it 
  dissipates, dealing damage to all enemies still inside.
```

---

## Implementation Priority

### Phase 1: Core Identity (High Priority)
1. **Ground Slam** for Tank (replace Whirlwind)
2. **Smoke Bomb** for Evasive (replace Whirlwind)
3. **Blink** for Glass Cannon (upgrade Shadow Dash)

### Phase 2: Defensive Options
4. **Arcane Shield** for Glass Cannon
5. **Iron Skin** passive for Tank
6. **Caltrops** for Evasive

### Phase 3: Utility Expansion
7. **Taunt** for Tank
8. **Mark for Death** for Evasive
9. **Arcane Barrage** for Glass Cannon

### Phase 4: Ultimate Abilities
10. **Meteor** for Glass Cannon
11. **Volley** for Evasive
12. Tank ultimate (consider **Unstoppable Force** - charge that can't be stopped)

---

## Playstyle Adaptation Summary

### Tank Playstyles Enabled
- **Aggressive Brawler:** Cleave + Ground Slam into enemy groups
- **Protective Guardian:** Taunt + Iron Skin to absorb damage
- **Hit-and-Run Tank:** Shield Bash in and out of combat

### Glass Cannon Playstyles Enabled
- **Artillery Mage:** Nova spam from safe distance
- **Battle Mage:** Blink in, burst, Blink out
- **Sustained Caster:** Arcane Barrage for single targets

### Evasive Playstyles Enabled
- **Pure Kiter:** Smoke Bomb + Caltrops + movement speed
- **Assassin:** Mark for Death + burst damage
- **Crowd Controller:** Smoke Bomb blind + Frost Shot slow

---

## Conclusion

Each archetype needs:

**TANK:**
- ✅ Has: Melee DPS, Gap-close, AOE clear, Sustain
- ❌ Needs: Hard CC (Ground Slam), Unique identity (Taunt), Scaling defense (Iron Skin)

**GLASS CANNON:**
- ✅ Has: AOE damage, Fast attacks, Mobility
- ❌ Needs: Better escape (Blink), Survivability (Arcane Shield), Single-target option (Barrage), Ultimate (Meteor)

**EVASIVE:**
- ✅ Has: Projectiles, High mobility, Good sustain
- ❌ Needs: Unique identity (Smoke Bomb), Zone control (Caltrops), Burst enabler (Mark), AOE clear (Volley)

Implementing these abilities will ensure each archetype can handle all enemy types and situations while maintaining their unique gameplay identity and fantasy.

