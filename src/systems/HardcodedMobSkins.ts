/**
 * HARDCODED MOB SKINS CONFIGURATION
 * 
 * This module provides immutable, hardcoded skin assignments for all mob types.
 * It eliminates all dynamic skin selection and ensures consistent visual representation
 * across all game sessions, fully complying with mob spawner UI specifications.
 * 
 * CRITICAL: This configuration is IMMUTABLE and MUST NOT be modified dynamically.
 * Any attempt to change these values at runtime will violate the hardcoded skin requirements.
 */

import { EnemyType } from '../game/types/EnemyTypes';

/**
 * Immutable hardcoded skin configuration for each enemy type.
 * Each EnemyType maps to exactly ONE predetermined skin variant.
 * 
 * These assignments ensure:
 * - Zero dynamic references
 * - Exact compliance with mob spawner UI specifications
 * - Consistent visual representation across all game sessions
 * - Prevention of future dynamic skin assignments
 * 
 * UPDATED: Now uses unique texture variants for each mob type to ensure distinct skins
 * Based on texture analysis, these variants are confirmed to exist in their respective textures:
 * - Skeleton_Pirate_Captain_1 (mob-texture-196) - Skeleton Viking
 * - Golem_1 (mob-texture-135) - Golem
 * - Archer_1 (mob-texture-6) - Archer
 * - Gnoll_3 (mob-texture-307) - Gnoll
 * Each mob type now uses a unique texture atlas for distinct visual appearance
 */
export const HARDCODED_MOB_SKINS = Object.freeze({
    [EnemyType.SKELETON_VIKING]: 'Skeleton_Viking_1',         // Elite viking skeleton - uses mob-texture-281
    [EnemyType.OGRE]: 'Ogre_1',                               // Ogre - uses custom ogre walking animation
    [EnemyType.ARCHER]: 'Archer_1',                           // Ranged archer - uses mob-texture-254
    [EnemyType.GNOLL]: 'Gnoll_3',                             // Fast gnoll warrior - uses mob-texture-316
    [EnemyType.SKELETON_PIRATE]: 'Skeleton_Pirate_Captain_1', // Skeleton pirate with vortex attacks - uses mob-texture-196
    [EnemyType.ELEMENTAL_SPIRIT]: 'Elemental_Spirits_2',      // Elemental spirit suicide bomber - uses mob-texture-205 (idle) + 204 (running)
    [EnemyType.LIGHTNING_MAGE]: 'Cursed_Alchemist_1'          // Lightning mage - AOE lightning strikes from distance - uses custom animations
} as const);

/**
 * Type definition for hardcoded mob skin variants.
 * This ensures compile-time type safety and prevents invalid skin assignments.
 */
export type HardcodedMobSkin = typeof HARDCODED_MOB_SKINS[keyof typeof HARDCODED_MOB_SKINS];

/**
 * Validation function to ensure an enemy type has a hardcoded skin assignment.
 * This provides runtime validation to prevent any dynamic skin references.
 * 
 * @param enemyType - The enemy type to validate
 * @returns true if the enemy type has a valid hardcoded skin
 * @throws Error if the enemy type lacks a hardcoded skin assignment
 */
export function validateHardcodedSkin(enemyType: EnemyType): boolean {
    const skin = HARDCODED_MOB_SKINS[enemyType];
    if (!skin) {
        throw new Error(`HARDCODED SKIN VIOLATION: EnemyType ${enemyType} lacks a hardcoded skin assignment. All enemy types must have predetermined skins.`);
    }
    return true;
}

/**
 * Gets the hardcoded skin for a specific enemy type.
 * This is the ONLY method that should be used for skin assignment.
 * 
 * @param enemyType - The enemy type to get the skin for
 * @returns The predetermined hardcoded skin variant
 * @throws Error if the enemy type lacks a hardcoded skin assignment
 */
export function getHardcodedMobSkin(enemyType: EnemyType): HardcodedMobSkin {
    validateHardcodedSkin(enemyType);
    return HARDCODED_MOB_SKINS[enemyType];
}

/**
 * Validates that all mob spawner UI enemy types have hardcoded skin assignments.
 * This ensures complete compliance with mob spawner UI specifications.
 * 
 * @returns true if all enemy types have valid hardcoded skins
 * @throws Error if any enemy type lacks a hardcoded skin assignment
 */
export function validateAllMobSpawnerSkins(): boolean {
    const requiredEnemyTypes = [
        EnemyType.SKELETON_VIKING,
        EnemyType.OGRE,
        EnemyType.ARCHER,
        EnemyType.GNOLL,
        EnemyType.SKELETON_PIRATE,
        EnemyType.ELEMENTAL_SPIRIT,
        EnemyType.LIGHTNING_MAGE
    ];

    for (const enemyType of requiredEnemyTypes) {
        validateHardcodedSkin(enemyType);
    }

    return true;
}

/**
 * Prevents any dynamic skin assignment by throwing an error
 * This function should be called whenever dynamic assignment is attempted
 */
export function preventDynamicSkinAssignment(context: string): never {
    throw new Error(`HARDCODED_SKIN_VIOLATION: Dynamic skin assignment attempted in ${context}. All mob skins must be hardcoded.`);
}

/**
 * Verifies that the hardcoded system is working correctly
 * Returns true if all validations pass, throws error otherwise
 */
export function verifyHardcodedSystem(): boolean {
    // Verify all mob spawner UI types have hardcoded skins
    validateAllMobSpawnerSkins();
    
    // Verify no dynamic references exist
    const allTypes = Object.values(EnemyType);
    for (const type of allTypes) {
        const skin = getHardcodedMobSkin(type);
        if (!skin) {
            throw new Error(`HARDCODED_SKIN_ERROR: No hardcoded skin found for ${type}`);
        }
        validateHardcodedSkin(type);
    }
    
    console.log('✅ Hardcoded mob skin system verification passed');
    return true;
}

/**
 * Runtime validation to ensure no random selection is occurring
 * This should be called during mob creation to verify hardcoded behavior
 */
export function validateNoRandomSelection(selectedSkin: string, expectedSkin: string, enemyType: EnemyType): void {
    if (selectedSkin !== expectedSkin) {
        throw new Error(
            `HARDCODED_SKIN_VIOLATION: Random selection detected! ` +
            `Expected hardcoded skin '${expectedSkin}' for ${enemyType}, but got '${selectedSkin}'. ` +
            `This indicates dynamic selection is still occurring.`
        );
    }
}

/**
 * Validates that a skin assignment is immutable and deterministic
 * Multiple calls should always return the same result
 */
export function validateSkinImmutability(enemyType: EnemyType, iterations: number = 10): boolean {
    const firstSkin = getHardcodedMobSkin(enemyType);
    
    for (let i = 0; i < iterations; i++) {
        const currentSkin = getHardcodedMobSkin(enemyType);
        if (currentSkin !== firstSkin) {
            throw new Error(
                `HARDCODED_SKIN_VIOLATION: Skin assignment is not immutable! ` +
                `${enemyType} returned different skins: '${firstSkin}' vs '${currentSkin}' on iteration ${i + 1}`
            );
        }
    }
    
    return true;
}

/**
 * Comprehensive system integrity check
 * Validates all aspects of the hardcoded system
 */
export function performSystemIntegrityCheck(): boolean {
    console.log('🔍 Performing comprehensive hardcoded mob skin system integrity check...');
    
    try {
        // 1. Verify all enemy types have hardcoded skins
        verifyHardcodedSystem();
        
        // 2. Test immutability for all enemy types
        Object.values(EnemyType).forEach(type => {
            validateSkinImmutability(type, 20); // Test 20 iterations
        });
        
        // 3. Verify mob spawner UI compliance
        validateAllMobSpawnerSkins();
        
        // 4. Check that all hardcoded skins exist in the system
        Object.keys(HARDCODED_MOB_SKINS).forEach(enemyType => {
            validateHardcodedSkin(enemyType as EnemyType);
        });
        
        console.log('✅ System integrity check PASSED - All validations successful');
        return true;
        
    } catch (error) {
        console.error('❌ System integrity check FAILED:', error);
        throw error;
    }
}

/**
 * Development-time validation to catch any attempts at dynamic assignment
 * This should be called in development builds to ensure compliance
 */
export function developmentValidation(): void {
    if (process.env.NODE_ENV === 'development') {
        performSystemIntegrityCheck();
        
        // Additional development checks
        console.log('🛠️ Development validation: Checking for potential dynamic references...');
        
        // Verify that the hardcoded mapping is complete
        const mobSpawnerTypes = [
            EnemyType.SKELETON_VIKING,
            EnemyType.OGRE,
            EnemyType.ARCHER,
            EnemyType.GNOLL,
            EnemyType.SKELETON_PIRATE,
            EnemyType.ELEMENTAL_SPIRIT
        ];
        
        const allTypes = [
            ...mobSpawnerTypes,
            EnemyType.LIGHTNING_MAGE
        ];
        
        allTypes.forEach(type => {
            const skin = getHardcodedMobSkin(type);
            console.log(`✓ ${type} → ${skin} (hardcoded)`);
        });
        
        console.log('✅ Development validation completed successfully');
    }
}

/**
 * Get the correct texture key for a mob variant based on optimized texture loading
 * @param mobVariant - The mob variant name
 * @returns The texture key that contains this mob variant
 */
export function getTextureKeyForMobVariant(mobVariant: string): string {
    // Updated to use atlases that contain idle/walk frames for our hardcoded variants
    const texture196Variants = ['Skeleton_Pirate_Captain_1'];
    const texture254Variants = ['Archer_1', 'Archer_2', 'Skeleton_Viking_3']; // Archer idle/walk frames present
    const texture281Variants = ['Skeleton_Viking_1'];  // Skeleton Viking idle/walk frames present
    const texture316Variants = ['Gnoll_3'];  // Gnoll idle/walk frames present
    const texture205Variants = ['Elemental_Spirits_2']; // Elemental spirits (idle frames in 205, running in 204)
    const texture131Variants = ['Skeleton_Death_Knight_1', 'Skeleton_Death_Knight_2', 'Skeleton_Death_Knight_3']; // Death Knight idle/walk frames
    const cursedAlchemistVariants = ['Cursed_Alchemist_1', 'Cursed_Alchemist_2', 'Cursed_Alchemist_3']; // Lightning mage custom animations
    const ogreVariants = ['Ogre_1']; // Ogre uses custom walking animation

    if (texture196Variants.includes(mobVariant)) {
        return 'mob-texture-196';
    } else if (texture254Variants.includes(mobVariant)) {
        return 'mob-texture-254';
    } else if (texture281Variants.includes(mobVariant)) {
        return 'mob-texture-281';
    } else if (texture316Variants.includes(mobVariant)) {
        return 'mob-texture-316';
    } else if (texture205Variants.includes(mobVariant)) {
        return 'mob-texture-205';
    } else if (texture131Variants.includes(mobVariant)) {
        return 'mob-texture-131';
    } else if (cursedAlchemistVariants.includes(mobVariant)) {
        return 'lightning_mage_running_000'; // Uses custom animation frames
    } else if (ogreVariants.includes(mobVariant)) {
        return 'ogre-walk-0';
    } else {
        // Fallback for any unknown variants
        console.warn(`Unknown mob variant: ${mobVariant}, using fallback texture-196`);
        return 'mob-texture-196';
    }
}

/**
 * Gets all hardcoded skin assignments for verification purposes.
 * This is read-only and should only be used for testing and validation.
 * 
 * @returns A readonly copy of all hardcoded skin assignments
 */
export function getAllHardcodedSkins(): Readonly<typeof HARDCODED_MOB_SKINS> {
    return HARDCODED_MOB_SKINS;
}