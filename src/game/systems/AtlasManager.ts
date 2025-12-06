import { Scene } from 'phaser';
import { SpriteSheetManager } from './SpriteSheetManager';

/**
 * AtlasManager.ts
 * ----------------
 * Centralized loader and animation builder for all player and mob atlases.
 * Replaces the monolithic animation creation logic previously in Game.ts.
 */

export interface CharacterAnimationSet {
    name: string;     // animation name, e.g. "idle_blinking"
    frames: number;   // total frames in that animation
    rate: number;     // frame rate
    repeat?: number;  // repeat count (-1 = loop)
}

export class AtlasManager {
    private scene: Scene;

    // Animation configuration by suffix (Legacy config, kept for reference/fallback)
    private animationConfig: Record<string, CharacterAnimationSet> = {
        'idle_blinking': { name: 'idle_blinking', frames: 18, rate: 12, repeat: -1 },
        'walking': { name: 'walking', frames: 24, rate: 18, repeat: -1 },
        'attack': { name: 'attack', frames: 12, rate: 20, repeat: 0 },
        'idle': { name: 'idle', frames: 18, rate: 6, repeat: -1 },
        'attackRun': { name: 'attackRun', frames: 12, rate: 14, repeat: 0 }
    };

    // Valid animation sets per character (Legacy config)
    private characterSets: Record<string, string[]> = {
        magician: ['idle_blinking', 'walking', 'attack'],
        knight: ['idle', 'walking', 'attackRun'],
        ninja: ['idle_blinking', 'walking', 'attackRun']
    };

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Loads all atlases for a given character (Magician, Knight, Rogue, etc.).
     * Expected folder structure: public/assets/atlases/<character>/<character>_<animation>.png|json
     */
    public loadAllForCharacter(characterFolder: string): void {
        const cleanCharacter = characterFolder.toLowerCase();
        const setsToLoad = this.characterSets[cleanCharacter] || [];

        if (setsToLoad.length === 0) {
            // console.warn(` No animation sets defined for character: ${cleanCharacter}`);
            // This is expected for new characters not in the legacy list
            return;
        }

        setsToLoad.forEach(setName => {
            const key = `${cleanCharacter}_${setName.toLowerCase()}`;
            const png = `/atlases/${cleanCharacter}/${key}.png`;
            const json = `/atlases/${cleanCharacter}/${key}.json`;

            if (this.scene.textures.exists(key)) return;

            console.log(`🔹 Queuing atlas: key="${key}"`);
            this.scene.load.atlas(key, png, json);
        });
    }

    /**
     * Main entry point to create ALL animations in the game.
     * Delegates to specific handlers for characters, mobs, and effects.
     */
    public createAllAnimations(spriteSheetManager: SpriteSheetManager): void {
        console.log('[AtlasManager] Starting global animation creation...');

        this.createCharacterAnimations(spriteSheetManager);
        this.createMobAnimations(spriteSheetManager);
        this.createLegacyMobAnimations();
        this.createEffectAnimations();
        this.createGenericAnimations();

        console.log('[AtlasManager] Animation creation completed!');
    }

    /**
     * Complex logic to create character animations from loaded atlases.
     * Handles variant detection, frame sorting, and fallback logic (e.g. Slashing for Idle).
     */
    public createCharacterAnimations(spriteSheetManager: SpriteSheetManager): void {
        const characterAtlasKeys = spriteSheetManager
            ? spriteSheetManager.getSpritesheetKeys('characters').filter(k => spriteSheetManager.isSpritesheetLoaded(k))
            : [];

        if (!characterAtlasKeys.length) return;

        // Aggregate frames across all loaded character atlases
        const charFramesWithKey: { key: string; frame: string }[] = [];
        for (const atlasKey of characterAtlasKeys) {
            const names = spriteSheetManager.getFrameNames(atlasKey);
            for (const n of names) charFramesWithKey.push({ key: atlasKey, frame: n });
        }

        type FrameEntry = { key: string; frame: string };
        type GroupFrames = { idle: FrameEntry[]; move: FrameEntry[]; characterVariant: string };
        const groups = new Map<string, GroupFrames>();

        for (const f of charFramesWithKey) {
            // Skip rotated frames (TexturePacker artifact)
            try {
                const tex = this.scene.textures.get(f.key) as any;
                const texFrame = tex && tex.get ? tex.get(f.frame) : null;
                if (texFrame && texFrame.rotated) continue;
            } catch { }

            // Match pattern: characters/[class]/[variant]/
            const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
            if (match) {
                const [, , characterVariant] = match;
                const groupId = characterVariant;
                const g = groups.get(groupId) || { idle: [], move: [], characterVariant };

                const lowerName = f.frame.toLowerCase();
                const isIdle = lowerName.includes('idle') || lowerName.includes('/idle/');
                const isMove = !lowerName.includes('run throwing') &&
                    !lowerName.includes('run shooting') &&
                    (lowerName.includes('walking') || lowerName.includes('running') || lowerName.includes('/walking/') || lowerName.includes('/running/'));

                if (isIdle) g.idle.push(f);
                else if (isMove) g.move.push(f);

                groups.set(groupId, g);
            }
        }

        console.log('[AtlasManager] Found character variants:', Array.from(groups.keys()));

        // Create animations for each character variant
        for (const [characterVariant, g] of groups) {
            let chosenIdle: FrameEntry[] = [];
            let chosenMove: FrameEntry[] = [];

            if (g.idle.length && g.move.length) {
                chosenIdle = this.sortByNumericIndex(g.idle);
                chosenMove = this.sortByNumericIndex(g.move);
            }

            // Fallback: Use Slashing animations if Idle/Move are missing
            if (!chosenIdle.length || !chosenMove.length) {
                // console.log(`[AtlasManager] Searching fallback animations for ${characterVariant}`);
                const variantFrames = charFramesWithKey.filter(f => {
                    const match = f.frame.match(/^characters\/([^\/]+)\/([^\/]+)\//);
                    return match && match[2] === characterVariant;
                });

                for (const f of variantFrames) {
                    const lower = f.frame.toLowerCase();
                    // Slashing as Idle
                    if ((lower.includes('slashing') && !lower.includes('run')) || lower.includes('/slashing/')) {
                        if (!this.isRotated(f.key, f.frame)) chosenIdle.push(f);
                    }
                    // Run Slashing as Move
                    if (lower.includes('run slashing') || lower.includes('/run slashing/')) {
                        if (!this.isRotated(f.key, f.frame)) chosenMove.push(f);
                    }
                }
                if (chosenIdle.length || chosenMove.length) {
                    chosenIdle = this.sortByNumericIndex(chosenIdle);
                    chosenMove = this.sortByNumericIndex(chosenMove);
                }
            }

            // Final fallback: Reuse existing set if one is missing
            if (!chosenIdle.length && chosenMove.length) chosenIdle = chosenMove.slice();
            if (!chosenMove.length && chosenIdle.length) chosenMove = chosenIdle.slice();

            this.createAnimation(`${characterVariant}_idle`, chosenIdle, 12);
            this.createAnimation(`${characterVariant}_walk`, chosenMove, 12);
        }
    }

    /**
     * Creates animations for mobs by parsing their folder structure/frame names.
     */
    public createMobAnimations(spriteSheetManager: SpriteSheetManager): void {
        const mobAtlasKeys = spriteSheetManager.getSpritesheetKeys('mobs')
            .filter(k => spriteSheetManager.isSpritesheetLoaded(k));

        for (const atlasKey of mobAtlasKeys) {
            const frames = spriteSheetManager.getFrameNames(atlasKey);
            // Map of variant -> { idle: frames[], walk: frames[] }
            const variantFrames = new Map<string, { idle: string[], walk: string[] }>();

            // Sort frames numerically
            frames.sort((a, b) => {
                const numA = parseInt(a.match(/\d+$/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+$/)?.[0] || '0');
                return numA - numB;
            });

            for (const frameName of frames) {
                const parts = frameName.split('/');
                // Mobs / Category / Variant / ...
                if (parts.length < 3) continue;

                const variantName = parts[2];
                if (!variantFrames.has(variantName)) {
                    variantFrames.set(variantName, { idle: [], walk: [] });
                }

                const lowerName = frameName.toLowerCase();
                const group = variantFrames.get(variantName)!;

                if (lowerName.includes('idle')) {
                    group.idle.push(frameName);
                } else if (lowerName.includes('run') || lowerName.includes('walk') || lowerName.includes('walking')) {
                    group.walk.push(frameName);
                }
            }

            // Create animations
            for (const [variant, anims] of variantFrames) {
                if (anims.idle.length > 0) {
                    this.createAnimationFromKey(`${variant}_idle`, atlasKey, anims.idle, 10);
                } else if (anims.walk.length > 0) {
                    // Fallback to walk as idle
                    this.createAnimationFromKey(`${variant}_idle`, atlasKey, anims.walk, 10);
                }

                if (anims.walk.length > 0) {
                    this.createAnimationFromKey(`${variant}_walk`, atlasKey, anims.walk, 12);
                }
            }
        }
    }

    /**
   * Creates legacy image-sequence animations for mobs (Teammate Expansion)
   */
    public createLegacyMobAnimations(): void {
        const mobs = [
            { key: 'skeleton_viking', actions: ['idle', 'running', 'throwing'], frames: [18, 12, 12], rates: [8, 12, 24] },
            { key: 'skeleton_pirate', actions: ['idle', 'running', 'slashing'], frames: [18, 12, 12], rates: [8, 12, 24] },
            { key: 'lightning_mage', actions: ['idle', 'running', 'slashing'], frames: [1, 12, 12], rates: [1, 12, 16] }, // Idle uses run frame 0
            { key: 'gnoll', actions: ['idle', 'running', 'throwing'], frames: [18, 12, 12], rates: [8, 12, 20] },
            { key: 'skeleton_archer', actions: ['idle', 'running', 'shooting'], frames: [18, 12, 9], rates: [8, 12, 12] },
            { key: 'elemental_spirit', actions: ['idle', 'running', 'dying'], frames: [18, 12, 15], rates: [8, 12, 20] }
        ];

        mobs.forEach(mob => {
            mob.actions.forEach((action, index) => {
                const frameCount = mob.frames[index];
                const frameRate = mob.rates[index];
                const animKey = `${mob.key}_${action}`;

                if (this.scene.anims.exists(animKey)) return;

                // Handle specific logic for shooting (split into draw/release for archer? teammate did that)
                // For now, simple sequence loading
                const frames = [];
                if (mob.key === 'lightning_mage' && action === 'idle') {
                    // Static idle
                    frames.push({ key: 'lightning_mage_running_000' });
                } else if (mob.key === 'skeleton_archer' && action === 'shooting') {
                    // Helper for archer split if needed, but here we just load all?
                    // Teammate split them: 0-3 draw, 4-8 release. 
                    // Let's create `shooting_draw` and `shooting_release` separately?
                    // Or just `shooting`? Teammate game used `shooting_draw` and `shooting_release`.
                    // I will add them specifically.
                    return;
                } else {
                    for (let i = 0; i < frameCount; i++) {
                        const frameStr = String(i).padStart(3, '0');
                        const texKey = `${mob.key}_${action}_${frameStr}`;
                        if (this.scene.textures.exists(texKey)) {
                            frames.push({ key: texKey });
                        }
                    }
                }

                if (frames.length > 0) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: frames,
                        frameRate: frameRate,
                        repeat: action === 'dying' || action.includes('attack') || action.includes('throw') || action.includes('slash') ? 0 : -1
                    });
                }
            });
        });

        // Special Archer handling
        this.createKeyFrameAnimation('skeleton_archer_shooting_draw', 4, 'skeleton_archer_shooting_', 12, 0);
        this.createKeyFrameAnimation('skeleton_archer_shooting_release', 5, 'skeleton_archer_shooting_', 16, 0, false, 4);
    }

    /**
     * Helper to create keyframe animations
     */
    private createKeyFrameAnimation(
        key: string,
        count: number,
        prefix: string,
        rate: number,
        repeat: number,
        checkExists: boolean = true,
        startOffset: number = 0
    ): void {
        if (checkExists && this.scene.anims.exists(key)) return;

        const frames = [];
        for (let i = 0; i < count; i++) {
            // Try different paddings if needed (teammate used 3 for mobs, 2 for bone slam, 1 or 5 for others)
            // Most mobs are 3 digits. Bone slam is 2.
            let frameKey = `${prefix}${String(i + startOffset).padStart(3, '0')}`;
            if (!this.scene.textures.exists(frameKey)) {
                // Try 2 digits
                frameKey = `${prefix}${String(i + startOffset).padStart(2, '0')}`;
                if (!this.scene.textures.exists(frameKey)) {
                    // Try 1 digit?
                    frameKey = `${prefix}${i + startOffset}`;
                    // Try 5 digits (gnoll claw)
                    if (!this.scene.textures.exists(frameKey)) {
                        frameKey = `${prefix}${String(i + startOffset).padStart(5, '0')}`;
                    }
                }
            }

            if (this.scene.textures.exists(frameKey)) {
                frames.push({ key: frameKey });
            }
        }

        if (frames.length > 0) {
            this.scene.anims.create({
                key,
                frames,
                frameRate: rate,
                repeat
            });
        }
    }

    /**
     * Creates specific effect animations (Lightning, Explosion, Ogre, etc.).
     */
    public createEffectAnimations(): void {
        // Calls updated helper
        // Ogre
        this.createKeyFrameAnimation('ogre_walking', 18, 'ogre-walk-', 10, -1);
        this.createKeyFrameAnimation('ogre_attacking', 12, 'ogre-attack-', 15, 0);
        this.createKeyFrameAnimation('bone_slam', 3, 'bone-slam-', 10, 0);

        // Gnoll Claw (5 digit padding handled by helper or manual?)
        // Helper tries 5 digits.
        this.createKeyFrameAnimation('gnoll-claw-attack', 12, 'gnoll-claw-', 24, 0, true, 1);

        // Lightning
        if (this.scene.textures.exists('lightning-bolt')) {
            const frameCount = this.scene.textures.get('lightning-bolt').frameTotal - 1;
            if (frameCount > 0) {
                this.scene.anims.create({
                    key: 'lightning-strike',
                    frames: this.scene.anims.generateFrameNumbers('lightning-bolt', { start: 0, end: frameCount - 1 }),
                    frameRate: 20,
                    repeat: 0
                });
            }
        }

        // Explosion
        if (this.scene.textures.exists('explosion')) {
            const frameCount = this.scene.textures.get('explosion').frameTotal - 1;
            if (frameCount > 0) {
                this.scene.anims.create({
                    key: 'explosion-effect',
                    frames: this.scene.anims.generateFrameNumbers('explosion', { start: 0, end: frameCount - 1 }),
                    frameRate: 24,
                    repeat: 0
                });
            }
        }
    }

    /**
     * Creates fallback generic animations.
     */
    public createGenericAnimations(): void {
        this.createKeyFrameAnimation('mob_idle', 18, 'mob_idle_', 8, -1, true);
        this.createKeyFrameAnimation('mob_walk', 12, 'mob_walk_', 12, -1, true);
    }

    // --- Helper Methods ---

    private createAnimation(key: string, frames: { key: string; frame: string }[], frameRate: number): void {
        if (!frames.length || this.scene.anims.exists(key)) return;

        this.scene.anims.create({
            key,
            frames,
            frameRate,
            repeat: -1
        });
        console.log(`[AtlasManager] Created character animation: ${key}`);
    }

    private createAnimationFromKey(key: string, atlasKey: string, frames: string[], frameRate: number): void {
        if (this.scene.anims.exists(key)) return;
        this.scene.anims.create({
            key,
            frames: frames.map(f => ({ key: atlasKey, frame: f })),
            frameRate,
            repeat: -1
        });
    }



    private sortByNumericIndex(entries: { key: string; frame: string }[]): { key: string; frame: string }[] {
        return entries.slice().sort((a, b) => {
            const getNum = (name: string): number => {
                let match = name.match(/_(\d+)\.png$/i) || name.match(/(\d+)\.png$/i) || name.match(/(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            };
            return getNum(a.frame) - getNum(b.frame);
        });
    }

    private isRotated(key: string, frame: string): boolean {
        try {
            const tex = this.scene.textures.get(key) as any;
            const texFrame = tex && tex.get ? tex.get(frame) : null;
            return texFrame && texFrame.rotated;
        } catch {
            return false;
        }
    }

    // Utility: Capitalize first letter
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Utility: convert idle_blinking → Idle_Blinking
    private toPascal(str: string): string {
        return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('_');
    }

    /**
     * Deprecated Legacy Method - Kept for backward compatibility if needed, 
     * but createAllAnimations is preferred.
     */
    public createAnimations(character: string) {
        this.createCharacterAnimationsLegacy(character);
    }

    private createCharacterAnimationsLegacy(character: string) {
        const cleanCharacter = character.replace(/[0-9]+$/, '').toLowerCase();
        const setsToCreate = this.characterSets[cleanCharacter] || [];

        setsToCreate.forEach(setName => {
            const config = this.animationConfig[setName];
            if (!config) return;

            const atlasKey = `${cleanCharacter}_${config.name.toLowerCase()}`;
            const animKey = `${this.capitalize(cleanCharacter)}_1_${this.toPascal(config.name)}`;

            if (this.scene.anims.exists(animKey)) return;

            const texture = this.scene.textures.get(atlasKey);
            if (!texture || texture.key === '__MISSING') return;

            const frameNames = texture.getFrameNames().sort((a, b) => a.localeCompare(b));
            if (frameNames.length === 0) return;

            this.scene.anims.create({
                key: animKey,
                frames: frameNames.map(name => ({ key: atlasKey, frame: name })),
                frameRate: config.rate,
                repeat: config.repeat ?? -1,
            });
        });
    }
}
