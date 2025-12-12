# Binky Medieval Showdown - Project Structure

```
binky-medieval-showdown/
├── .git/                           # Git repository
├── .gitignore                      # 1.8 KB
├── AI_DIRECTOR_SYSTEM.md           # 4.1 KB
├── GEMINI_DEEP_RESEARCH_PLAN.txt   # 12.2 KB
├── LICENSE                         # 1.1 KB
├── README.md                       # 7.4 KB
├── error.log                       # 121 B
├── index.html                      # 732 B
├── package.json                    # 1.2 KB
├── package-lock.json               # 80.2 KB
├── tsconfig.json                   # 776 B
│
├── vite/
│   ├── config.dev.mjs              # 578 B
│   └── config.prod.mjs             # 1.4 KB
│
├── dist/
│   ├── assets/
│   ├── spritesheets ARCHIVED/
│   ├── favicon.png                 # 354 B
│   ├── index.html                  # 834 B
│   └── style.css                   # 265 B
│
├── public/
│   ├── favicon.png                 # 354 B
│   ├── style.css                   # 265 B
│   ├── spritesheets ARCHIVED/      # 695 files
│   └── assets/
│       ├── logo.png                # 24.7 KB
│       ├── Effects/
│       ├── images/
│       ├── mobs/
│       ├── atlases/
│       │   ├── knight/             # 3 files
│       │   ├── magician/           # 3 files
│       │   └── ninja/              # 3 files
│       ├── characters/             # 381 files
│       ├── spritesheets/           # 319 files
│       └── tilemaps/               # 31 files (binkymap1.json + tilesets)
│
└── src/
    ├── main.ts                     # 136 B (entry point)
    ├── vite-env.d.ts               # 39 B
    ├── phaser-animated-tiles.d.ts  # 400 B
    ├── debug/                      # (empty)
    │
    ├── ui/
    │   ├── UIScene.ts              # 1.3 KB
    │   ├── MobSpawnerUI.ts         # 17.0 KB
    │   ├── LevelBarUI.ts           # 3.6 KB
    │   ├── EnhancedDesignSystem.ts # 16.8 KB
    │   ├── ClassSelectionUI.ts     # 23.5 KB
    │   └── AIMetricsDashboard.ts   # 16.8 KB
    │
    └── game/
        ├── main.ts                 # 1.5 KB
        ├── Player.ts               # 15.4 KB
        │
        ├── components/
        │   ├── CombatComponent.ts      # 6.0 KB
        │   └── VisualComponent.ts      # 4.4 KB
        │
        ├── config/
        │   └── AnimationMappings.ts    # 13.1 KB
        │
        ├── constants/
        │   └── XPConstants.ts          # 5.1 KB
        │
        ├── data/
        │   └── SkillTreeData.ts        # 7.9 KB
        │
        ├── effects/
        │   └── EffectManager.ts        # 7.1 KB
        │
        ├── shaders/
        │   └── GalaxyShader.ts         # 4.4 KB
        │
        ├── input/
        │   ├── Command.ts              # 1.5 KB
        │   └── InputBuffer.ts          # 1.3 KB
        │
        ├── types/
        │   ├── index.ts                # 219 B
        │   ├── AssetTypes.ts           # 2.6 KB
        │   ├── EnemyTypes.ts           # 2.0 KB
        │   ├── InputTypes.ts           # 475 B
        │   ├── MobTypes.ts             # 1.1 KB
        │   ├── PlayerTypes.ts          # 227 B
        │   └── TilemapTypes.ts         # 2.1 KB
        │
        ├── states/
        │   ├── IState.ts               # 219 B
        │   ├── State.ts                # 774 B
        │   ├── StateMachine.ts         # 1.6 KB
        │   ├── IdleState.ts            # 1.4 KB
        │   ├── MoveState.ts            # 1.6 KB
        │   ├── AttackState.ts          # 1.3 KB
        │   ├── CastingState.ts         # 535 B
        │   └── ChannelingState.ts      # 575 B
        │
        ├── objects/
        │   ├── BaseProjectile.ts       # 1.0 KB
        │   ├── PlayerArchetype.ts      # 8.7 KB
        │   ├── Shuriken.ts             # 2.7 KB
        │   ├── SkillNode.ts            # 6.3 KB
        │   └── XPOrb.ts                # 5.0 KB
        │
        ├── scenes/
        │   ├── Preloader.ts            # 13.0 KB
        │   ├── Menu.ts                 # 12.2 KB
        │   ├── Game.ts                 # 24.3 KB
        │   ├── SkillTreeScene.ts       # 24.6 KB
        │   └── ClassSelectionScene.ts  # 888 B
        │
        ├── systems/
        │   ├── AIDirector.ts           # 31.7 KB
        │   ├── AssetManager.ts         # 13.1 KB
        │   ├── AtlasManager.ts         # 20.6 KB
        │   ├── CooldownManager.ts      # 1.3 KB
        │   ├── EnemySystem.ts          # 28.5 KB
        │   ├── HardcodedMobSkins.ts    # 11.1 KB
        │   ├── InputManager.ts         # 6.9 KB
        │   ├── LightingSystem.ts       # 3.6 KB
        │   ├── MapInteractionSystem.ts # 3.4 KB
        │   ├── MobSpawner.ts           # 6.9 KB
        │   ├── PassiveManager.ts       # 1.5 KB
        │   ├── PhysicsSystem.ts        # 7.6 KB
        │   ├── RoundManager.ts         # 7.1 KB
        │   ├── SkillNodeFactory.ts     # 1.3 KB
        │   ├── SpriteSheetManager.ts   # 7.2 KB
        │   ├── TilemapManager.ts       # 11.8 KB
        │   └── XPOrbSystem.ts          # 5.6 KB
        │
        ├── skills/
        │   ├── Skill.ts                # 240 B
        │   ├── SkillLoadout.ts         # 157 B
        │   ├── SkillObject.ts          # 1.0 KB
        │   ├── SkillObjects.ts         # 8.8 KB
        │   ├── PlayerSkillSystem.ts    # 15.0 KB
        │   ├── ProjectileSkill.ts      # 3.5 KB
        │   ├── CleaveSkill.ts          # 2.4 KB
        │   ├── NovaSkill.ts            # 2.1 KB
        │   ├── ShadowDashSkill.ts      # 2.1 KB
        │   ├── ShieldBashSkill.ts      # 4.4 KB
        │   ├── ShurikenFanSkill.ts     # 2.9 KB
        │   ├── WhirlwindSkill.ts       # 1.5 KB
        │   └── objects/
        │       ├── BaseProjectile.ts       # 8.8 KB
        │       ├── ProjectileObject.ts     # 2.0 KB
        │       ├── CleaveObject.ts         # 4.0 KB
        │       ├── ShadowDashObject.ts     # 5.7 KB
        │       ├── ShieldBashObject.ts     # 3.9 KB
        │       ├── ShurikenFanObject.ts    # 835 B
        │       ├── SpellMissileObject.ts   # 4.5 KB
        │       └── WhirlwindObject.ts      # 2.4 KB
        │
        └── enemies/
            ├── BaseEnemy.ts            # 6.2 KB
            ├── EnemyFactory.ts         # 1.4 KB
            ├── types/
            │   ├── ArcherEnemy.ts          # 6.5 KB
            │   ├── ElementalSpiritEnemy.ts # 3.3 KB
            │   ├── GnollEnemy.ts           # 3.6 KB
            │   ├── LightningMageEnemy.ts   # 3.9 KB
            │   ├── OgreEnemy.ts            # 4.7 KB
            │   ├── SkeletonPirateEnemy.ts  # 4.1 KB
            │   └── SkeletonVikingEnemy.ts  # 4.6 KB
            └── attacks/
                ├── ArrowIndicator.ts       # 3.1 KB
                ├── ArrowProjectile.ts      # 3.1 KB
                ├── ClawAttack.ts           # 3.5 KB
                ├── ConeAttack.ts           # 3.7 KB
                ├── EnemyProjectile.ts      # 1.5 KB
                ├── ExplosionAttack.ts      # 3.4 KB
                ├── LightningStrikeAttack.ts# 6.0 KB
                ├── MeleeAttack.ts          # 5.2 KB
                ├── Shield.ts               # 5.7 KB
                └── VortexAttack.ts         # 7.5 KB
```

## Summary

- **101 source files** in `src/`
- **~1,406 assets** in `public/` (characters, spritesheets, tilemaps, atlases)
- **Key systems**: AI Director, Enemy System, Skill System, XP/Orb System, Tilemap Manager
- **7 enemy types** with **10 attack patterns**
- **8 skill objects** for player combat
- **5 scenes**: Preloader → Menu → ClassSelection → Game → SkillTree
