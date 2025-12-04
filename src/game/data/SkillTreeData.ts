// src/game/SkillTreeData.ts

export enum SkillArchetype {
    MELEE = "Melee",
    PROJECTILE = "Projectile",
    AOE = "AoE",
}

export enum SkillType {
    PASSIVE = "Passive",
    ATTACK_MOD = "Attack Mod",
}

export interface Skill {
    name: string;
    type: SkillType;
    description: string;
    tier: number;
    icon: string; // Emoji or asset key
    prerequisites: string[]; // A list of skill names this skill depends on
    x: number; // The x position (relative to its path)
    y: number; // The y position (relative to its path)
}

export interface SkillPath {
    name: string;
    skills: Skill[];
}

export interface SkillTree {
    archetype: SkillArchetype;
    name: string;
    paths: {
        [key: string]: SkillPath;
    };
}

export const skillTreeData: { [key in SkillArchetype]: SkillTree } = {
    [SkillArchetype.MELEE]: {
        archetype: SkillArchetype.MELEE,
        name: "The Gladiator",
        paths: {
            "Juggernaut": {
                name: "The Juggernaut",
                skills: [
                    { name: "Fortitude", type: SkillType.PASSIVE, description: "Reduces all incoming damage by 10%.", tier: 1, icon: "🛡️", prerequisites: [], x: 0, y: 0 },
                    { name: "Retaliation", type: SkillType.PASSIVE, description: "After you take damage, your next meleeAttack within 3 seconds deals 50% bonus damage.", tier: 2, icon: "💥", prerequisites: ["Fortitude"], x: -150, y: 200 },
                    { name: "Stalwart", type: SkillType.PASSIVE, description: "You can no longer be stunned or knocked back by enemy attacks.", tier: 3, icon: "🗿", prerequisites: ["Fortitude"], x: 150, y: 200 },
                    { name: "Battle Fury", type: SkillType.PASSIVE, description: "Gain 2% attack speed and 2% damage reduction for every enemy currently within your melee range.", tier: 4, icon: "🔥", prerequisites: ["Retaliation", "Stalwart"], x: 0, y: 400 },
                ],
            },
            "Blademaster": {
                name: "The Blademaster",
                skills: [
                    { name: "Cleave", type: SkillType.ATTACK_MOD, description: "Your meleeAttack now hits all enemies in a 90-degree arc in front of you instead of just one.", tier: 1, icon: "💫", prerequisites: [], x: 0, y: 0 },
                    { name: "Sunder", type: SkillType.ATTACK_MOD, description: "Enemies hit by your meleeAttack are 'sundered,' causing them to take 10% more damage from all sources for 5 seconds.", tier: 2, icon: "💔", prerequisites: ["Cleave"], x: -150, y: 200 },
                    { name: "Lifesteal", type: SkillType.PASSIVE, description: "You heal for 5% of all damage dealt by your meleeAttack.", tier: 3, icon: "🩸", prerequisites: ["Cleave"], x: 150, y: 200 },
                    { name: "Execution", type: SkillType.ATTACK_MOD, description: "Your meleeAttack deals double damage to enemies below 25% health.", tier: 4, icon: "💀", prerequisites: ["Sunder", "Lifesteal"], x: 0, y: 400 },
                ],
            },
        },
    },
    [SkillArchetype.PROJECTILE]: {
        archetype: SkillArchetype.PROJECTILE,
        name: "The Ranger",
        paths: {
            "Sniper": {
                name: "The Sniper",
                skills: [
                    { name: "Piercing Shots", type: SkillType.ATTACK_MOD, description: "Your bullets now pass through one additional enemy.", tier: 1, icon: "➡️", prerequisites: [], x: 0, y: 0 },
                    { name: "Deadeye", type: SkillType.PASSIVE, description: "Your projectileAttack speed is reduced by 20%, but projectile damage is increased by 40%.", tier: 2, icon: "🎯", prerequisites: ["Piercing Shots"], x: -150, y: 200 },
                    { name: "Long Shot", type: SkillType.PASSIVE, description: "Your projectiles gain bonus damage based on the distance traveled, up to +50% at maximum range.", tier: 3, icon: "♐", prerequisites: ["Piercing Shots"], x: 150, y: 200 },
                    { name: "Headshot", type: SkillType.PASSIVE, description: "Every 4th projectileAttack is a guaranteed critical hit, dealing 250% damage.", tier: 4, icon: "💯", prerequisites: ["Deadeye", "Long Shot"], x: 0, y: 400 },
                ],
            },
            "Trickster": {
                name: "The Trickster",
                skills: [
                    { name: "Ricochet", type: SkillType.ATTACK_MOD, description: "Your bullets bounce to one nearby enemy after their initial hit.", tier: 1, icon: "↪️", prerequisites: [], x: 0, y: 0 },
                    { name: "Frost Shot", type: SkillType.ATTACK_MOD, description: "Your bullets now apply a 'slow' effect to enemies, reducing their movement speed by 30% for 2 seconds.", tier: 2, icon: "❄️", prerequisites: ["Ricochet"], x: -150, y: 200 },
                    { name: "Homing Shots", type: SkillType.ATTACK_MOD, description: "Your bullets now have a slight homing property and will curve to hit nearby enemies.", tier: 3, icon: "↝", prerequisites: ["Ricochet"], x: 150, y: 200 },
                    { name: "Chain Reaction", type: SkillType.ATTACK_MOD, description: "Enemies defeated by a projectileAttack explode, dealing 25% of the attack's damage to all other enemies nearby.", tier: 4, icon: "💥", prerequisites: ["Frost Shot", "Homing Shots"], x: 0, y: 400 },
                ],
            },
        },
    },
    [SkillArchetype.AOE]: {
        archetype: SkillArchetype.AOE,
        name: "The Sorcerer",
        paths: {
            "Controller": {
                name: "The Controller",
                skills: [
                    { name: "Gravity Well", type: SkillType.ATTACK_MOD, description: "Your aoeAttack now pulls all enemies hit toward its center, grouping them up.", tier: 1, icon: "🌀", prerequisites: [], x: 0, y: 0 },
                    { name: "Chilling Field", type: SkillType.ATTACK_MOD, description: "Your aoeAttack leaves a patch on the ground for 3 seconds that 'slows' any enemies who walk through it.", tier: 2, icon: "🧊", prerequisites: ["Gravity Well"], x: -150, y: 200 },
                    { name: "Lingering Essence", type: SkillType.ATTACK_MOD, description: "The 'Chilling Field' now also deals a small amount of damage over time.", tier: 3, icon: "☠️", prerequisites: ["Chilling Field"], x: -150, y: 400 }, // Offset vertically to avoid overlap with below? Or deeper branch
                    { name: "Arcane Siphon", type: SkillType.PASSIVE, description: "You gain 1% of your max health for each enemy hit by your aoeAttack (max 5% per cast).", tier: 4, icon: "⚕️", prerequisites: ["Lingering Essence"], x: 0, y: 600 },
                ],
            },
            "Conduit": {
                name: "The Conduit",
                skills: [
                    { name: "Amplitude", type: SkillType.PASSIVE, description: "Increases the radius of your aoeAttack by 25%.", tier: 1, icon: "↔️", prerequisites: [], x: 0, y: 0 },
                    { name: "Arcane Vulnerability", type: SkillType.ATTACK_MOD, description: "Enemies hit by your aoeAttack are 'sundered,' taking 10% more damage from all sources for 5 seconds.", tier: 2, icon: "裂", prerequisites: ["Amplitude"], x: 150, y: 200 },
                    { name: "Resonance", type: SkillType.PASSIVE, description: "Casting aoeAttack gives you a 'Resonance' stack. At 3 stacks, your next aoeAttack is 200% larger and deals 200% damage.", tier: 3, icon: "🔊", prerequisites: ["Arcane Vulnerability"], x: 150, y: 400 },
                    { name: "Overload", type: SkillType.ATTACK_MOD, description: "Your aoeAttack no longer has a cooldown, but it now costs 5% of your max health to cast.", tier: 4, icon: "⚡", prerequisites: ["Resonance"], x: 0, y: 600 },
                ],
            },
        },
    },
};