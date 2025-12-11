# Binky Medieval Showdown - Enemy Types Design Document

## Overview

This document details all enemy types currently in the game, their intended gameplay role, what playstyles they counter, and identifies gaps in enemy variety needed for a comprehensive top-down survival shooter experience.

---

## Current Enemy Roster

### 1. GNOLL (The Swarm Fodder)

**Role:** Fast melee rushdown unit that overwhelms through numbers

| Stat | Value |
|------|-------|
| Health | 50 |
| Speed | 80 (Fast) |
| Damage | 6 (Low) |
| XP Value | 10 |

**Behavior:**
- Rushes directly at player with high speed
- Performs claw attacks at close range with a throwing animation
- Short attack cooldown (0.8s) for rapid pressure
- Attack range: 30 pixels (must be very close)

**Special Abilities:**
- `fast_movement` - High mobility to close gaps quickly

**Counters Playstyle:**
- **Stationary/Turret players** - Forces constant repositioning
- **Glass cannons** - Punishes players who don't maintain distance
- **Low DPS builds** - Overwhelms if enemies aren't killed quickly

**Countered By:**
- AOE attacks (clear swarms efficiently)
- High movement speed builds
- Knockback abilities

---

### 2. ARCHER (The Kiting Sniper)

**Role:** Ranged threat that maintains optimal distance and punishes predictable movement

| Stat | Value |
|------|-------|
| Health | 40 (Fragile) |
| Speed | 50 |
| Damage | 10 |
| XP Value | 12 |

**Behavior:**
- Maintains optimal range (150-300 pixels from player)
- Kites away when player gets too close (<150 pixels)
- Charges arrow with visual telegraph (draw animation + pulsing star)
- Locks aim angle when charging - fires in that direction
- Arrow travels at 600 speed with wall collision

**Special Abilities:**
- `ranged_attack` - Fires projectiles that require dodging
- `kiting` - Actively maintains distance from player

**Counters Playstyle:**
- **Melee-only builds** - Forces gap-closing
- **Slow movement builds** - Hard to close distance
- **Predictable movement** - Locked aim still hits if you don't dodge

**Countered By:**
- Fast dash/blink abilities
- High mobility builds (Evasive archetype)
- Aggressive rushdown before charge completes

---

### 3. SKELETON VIKING (The Elite Defender)

**Role:** Tanky elite with defensive capabilities and mid-range pressure

| Stat | Value |
|------|-------|
| Health | 120 (Tanky) |
| Speed | 45 (Slow) |
| Damage | 30 (High) |
| XP Value | 18 |

**Behavior:**
- Approaches player methodically
- Deploys bone shield when player is within medium range (250 pixels)
- Throws spears at close range (80 pixels) with throwing animation
- Shield blocks projectiles from one direction

**Special Abilities:**
- `shield` - Deploys bone shield (8s cooldown) that blocks projectile attacks
- `spear_attack` - Throws damaging spear with capsule collision (2s cooldown)

**Counters Playstyle:**
- **Projectile-only builds** - Shield blocks ranged attacks
- **Hit-and-run tactics** - Shield provides cover during approach
- **Single-target focus** - High health makes them time-consuming to kill

**Countered By:**
- Flanking/repositioning to bypass shield
- AOE attacks that ignore shield direction
- Melee builds (shield doesn't block melee)
- Focus fire to burn through health

---

### 4. OGRE (The Boss/Mini-Boss)

**Role:** High-threat tank with devastating melee attacks

| Stat | Value |
|------|-------|
| Health | 150 (Very Tanky) |
| Speed | 30 (Very Slow) |
| Damage | 20 |
| XP Value | 25 |
| Scale | 0.12 (Large) |

**Behavior:**
- Slowly approaches player
- Performs wide melee sweeps with long wind-up animation
- Attack has extended duration (1.1s) and range (100 pixel width)
- Stops completely during attack animation

**Special Abilities:**
- `melee_attack` - Wide sweeping attack with long duration
- `high_damage` - Significant damage per hit

**Counters Playstyle:**
- **Face-tanking builds** - High sustained damage
- **Stationary play** - Large attack area punishes standing still
- **Ignoring priority targets** - Must be dealt with to prevent overwhelming

**Countered By:**
- Kiting (very slow movement speed)
- High mobility builds
- Ranged attacks during wind-up
- Burst damage to eliminate quickly

---

### 5. SKELETON PIRATE (The Zone Controller)

**Role:** Area denial specialist that restricts player movement

| Stat | Value |
|------|-------|
| Health | 60 |
| Speed | 50 |
| Damage | 5 (Low direct) |
| XP Value | 18 |

**Behavior:**
- Stays within camera view but maintains minimum distance (150 pixels)
- Backs away if player gets too close
- Casts vortex/whirlpool at player's position with slashing animation
- Brief idle period after attacks

**Special Abilities:**
- `vortex_attack` - Creates whirlpool AOE at target location (4s cooldown)
- `slow_debuff` - Vortex slows players caught inside
- `area_control` - Forces player to avoid specific zones

**Counters Playstyle:**
- **Kiting patterns** - Vortex placed on predicted path
- **Low mobility builds** - Slow makes escape difficult
- **Cornered positions** - Zoning restricts movement options

**Countered By:**
- High mobility/dash to escape vortex
- Aggressive rushdown (low health, backs away)
- Quick elimination before vortex lands

---

### 6. ELEMENTAL SPIRIT (The Suicide Bomber)

**Role:** High-risk kamikaze unit that explodes on contact

| Stat | Value |
|------|-------|
| Health | 30 (Very Fragile) |
| Speed | 110 (Very Fast) |
| Damage | 25 (High explosion) |
| XP Value | 20 |

**Behavior:**
- Rushes directly at player with extreme speed
- Triggers dying animation when within 30 pixels
- Explodes after death animation completes
- Single-use enemy - destroys itself on attack

**Special Abilities:**
- `explosive_death` - Creates damaging explosion on death
- `high_mobility` - Very fast approach speed
- `suicide_attack` - Self-destructs to deal damage

**Counters Playstyle:**
- **Tunnel vision** - Can sneak up while focused on other enemies
- **Low awareness** - Fast approach can catch players off-guard
- **Grouped positioning** - Multiple spirits create deadly chains

**Countered By:**
- High awareness and peripheral vision
- Knockback abilities to prevent approach
- Prioritized targeting
- Long-range elimination

---

### 7. LIGHTNING MAGE (The Artillery Caster)

**Role:** Long-range AOE caster that forces reactive movement

| Stat | Value |
|------|-------|
| Health | 70 |
| Speed | 40 (Slow) |
| Damage | 35 (High AOE) |
| XP Value | 22 |

**Behavior:**
- Maintains optimal range (180-320 pixels)
- Backs away if player approaches (below 180 pixels)
- Casts lightning strike at player's position with slashing animation
- Lightning spawns at 50% through animation with ground indicator

**Special Abilities:**
- `lightning_strike` - AOE attack at target location (3s cooldown)
- `aoe_damage` - High damage to area
- `ranged_caster` - Prefers to stay at distance
- `immobilize_during_cast` - Stands still while casting

**Counters Playstyle:**
- **Stationary play** - Lightning hits standing targets
- **Predictable movement** - Can lead shots on movement patterns
- **Grouped positioning** - AOE hits multiple targets

**Countered By:**
- Constant movement to avoid strikes
- Aggressive gap-closing during cast
- Focus fire (medium health pool)
- Dash abilities to dodge lightning

---

## Enemy Interaction Matrix

| Enemy | Counters | Countered By |
|-------|----------|--------------|
| Gnoll | Stationary, Glass Cannon, Low DPS | AOE, Mobility, Knockback |
| Archer | Melee-only, Slow builds, Predictable | Dashes, Mobility, Aggression |
| Viking | Projectile builds, Hit-and-run | Flanking, AOE, Melee |
| Ogre | Face-tanking, Stationary, Ignoring | Kiting, Mobility, Range, Burst |
| Pirate | Kiting, Low mobility, Cornered | Mobility, Aggression, Burst |
| Spirit | Tunnel vision, Low awareness, Grouped | Awareness, Knockback, Priority |
| Lightning Mage | Stationary, Predictable, Grouped | Movement, Gap-close, Focus |

---

## Missing Enemy Archetypes

Based on standard top-down survival shooter design, the following enemy types are missing:

### 1. **HEALER/SUPPORT** (Critical Gap)
**Concept:** Enemy that heals or buffs nearby allies
- Forces prioritization decisions
- Counters: Slow, methodical clearing
- Encourages: Focus fire, target priority

**Example Design:** "Necromancer"
- Periodically heals nearby undead
- Resurrects fallen enemies if not dealt with
- Low health, stays behind frontline

### 2. **SPAWNER** (High Priority)
**Concept:** Stationary or slow enemy that continuously spawns minions
- Creates sustained pressure
- Counters: Ignoring backline threats
- Encourages: Map awareness, objective focus

**Example Design:** "Corrupted Totem" or "Summoner"
- Spawns Gnolls every few seconds
- Must be destroyed to stop spawns
- Medium-high health, stationary

### 3. **TANK/BLOCKER** (Medium Priority)
**Concept:** Very high health enemy that body-blocks for allies
- Creates chokepoints and protection
- Counters: Piercing/AOE-light builds
- Encourages: Positioning, flanking

**Example Design:** "Bone Golem"
- Extremely high health, very slow
- Physically blocks player movement
- Low damage but persistent

### 4. **DEBUFFER** (Medium Priority)
**Concept:** Enemy that applies negative effects beyond slow
- Creates combo opportunities for other enemies
- Counters: Sustain-focused builds
- Encourages: Defensive play, prioritization

**Example Design:** "Plague Bearer"
- Applies poison DOT on hit
- Reduces healing received
- Medium speed, moderate health

### 5. **TELEPORTER/BLINKER** (High Priority)
**Concept:** Enemy that teleports to flank or ambush
- Prevents safe positioning
- Counters: Backline/turret playstyles
- Encourages: 360° awareness

**Example Design:** "Shadow Assassin"
- Teleports behind player
- High burst damage, low health
- Brief telegraph before appearing

### 6. **REFLECTOR/PARRY** (Low Priority)
**Concept:** Enemy with timed damage reflection
- Punishes button mashing
- Counters: Sustained DPS builds
- Encourages: Timing, observation

**Example Design:** "Mirror Knight"
- Periodically enters reflect stance
- Returns projectile damage to sender
- Must be attacked during windows

### 7. **SPLITTER** (Medium Priority)
**Concept:** Enemy that divides into smaller enemies when killed
- Creates exponential threat if not managed
- Counters: Single-target burst
- Encourages: AOE, careful positioning

**Example Design:** "Slime"
- Splits into 2-3 smaller versions on death
- Smaller versions are weaker but faster
- Prevents simple focus-fire strategies

### 8. **CHARGER** (Low Priority - Partially Covered)
**Concept:** Enemy that charges in a straight line
- Creates dodge-timing challenges
- Counters: Stationary play
- Encourages: Reactive movement

**Note:** Gnoll partially covers this with fast approach, but a dedicated charging enemy with wind-up and unstoppable charge would add variety.

---

## Recommended Implementation Priority

### Phase 1: Core Gaps
1. **Spawner** - Adds strategic depth and objective focus
2. **Teleporter** - Prevents safe camping strategies

### Phase 2: Support Roles
3. **Healer/Support** - Creates priority targets and tactical decisions
4. **Debuffer** - Adds status effect variety

### Phase 3: Advanced Mechanics
5. **Tank/Blocker** - Adds positioning challenges
6. **Splitter** - Adds crowd management complexity

### Phase 4: Polish
7. **Reflector** - Adds timing mechanics
8. **Charger** - Adds dodge-roll challenges

---

## Wave Composition Recommendations

For balanced wave difficulty:

**Early Waves (1-5):**
- 80% Gnolls
- 20% Archers

**Mid Waves (6-10):**
- 50% Gnolls
- 25% Archers
- 15% Vikings
- 10% Elemental Spirits

**Late Waves (11-15):**
- 30% Gnolls
- 20% Archers
- 20% Vikings
- 15% Pirates
- 10% Lightning Mages
- 5% Elemental Spirits

**Boss Waves (every 5th):**
- Standard composition + 1-2 Ogres
- Reduced total enemy count

---

## Conclusion

The current enemy roster provides a solid foundation covering:
- ✅ Swarm/Fodder (Gnoll)
- ✅ Ranged Threat (Archer)
- ✅ Elite/Mini-Boss (Viking)
- ✅ Boss (Ogre)
- ✅ Zone Control (Pirate)
- ✅ Suicide Unit (Elemental Spirit)
- ✅ Artillery (Lightning Mage)

Key gaps to address:
- ❌ Spawner/Summoner
- ❌ Support/Healer
- ❌ Teleporter/Ambusher
- ❌ Debuffer
- ❌ Splitter

Adding these enemy types would create a complete tactical ecosystem that challenges all playstyles and creates meaningful decision-making during combat.

