/**
 * AtlasManager.ts
 * ----------------
 * Centralized loader and animation builder for all player and mob atlases.
 * Replaces the old SpriteSheetManager / HardcodedMobSkins mess.
 *
 * Usage example:
 *   const atlasManager = new AtlasManager(this);
 *   atlasManager.loadAllForCharacter('magician');
 *   ...
 *   atlasManager.createAnimations('magician');
 */

export interface CharacterAnimationSet {
  name: string;     // animation name, e.g. "idle_blinking"
  frames: number;   // total frames in that animation
  rate: number;     // frame rate
  repeat?: number;  // repeat count (-1 = loop)
}

export class AtlasManager {
  private scene: Phaser.Scene;

  // Animation configuration by suffix
  private animationConfig: Record<string, CharacterAnimationSet> = {
      'idle_blinking': { name: 'idle_blinking', frames: 18, rate: 12, repeat: -1 },
      'walking': { name: 'walking', frames: 24, rate: 18, repeat: -1 },
      'attack': { name: 'attack', frames: 12, rate: 20, repeat: 0 },
      'idle': { name: 'idle', frames: 18, rate: 6, repeat: -1 },
      'attackRun': { name: 'attackRun', frames: 12, rate: 14, repeat: 0 } // CamelCase for animation key generation
  };

  // Valid animation sets per character
  private characterSets: Record<string, string[]> = {
      magician: ['idle_blinking', 'walking', 'attack'],
      knight: ['idle', 'walking', 'attackRun'],
      ninja: ['idle_blinking', 'walking', 'attackRun']
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

    /**
     * Loads all atlases for a given character (Magician, Knight, Rogue, etc.).
     * Expected folder structure:
     *  public/assets/atlases/<character>/<character>_<animation>.png|json
     */
    public loadAllForCharacter(characterFolder: string): void {
        const cleanCharacter = characterFolder.toLowerCase();
        const setsToLoad = this.characterSets[cleanCharacter] || [];

        if (setsToLoad.length === 0) {
            console.warn(` No animation sets defined for character: ${cleanCharacter}`);
            return;
        }

        setsToLoad.forEach(setName => {
            // Force lowercase for file/atlas key matching to handle 'attackRun' vs 'attackrun'
            const key = `${cleanCharacter}_${setName.toLowerCase()}`;
            const png = `/atlases/${cleanCharacter}/${key}.png`;
            const json = `/atlases/${cleanCharacter}/${key}.json`;

            // Check if texture already exists before loading
            if (this.scene.textures.exists(key)) {
                // console.log(`🔹 Atlas already loaded: key="${key}"`);
                return;
            }

            console.log(`🔹 Queuing atlas: key="${key}"`);

            //  Simple, clean, correct:
            this.scene.load.atlas(key, png, json);
        });
    }


    /**
     * Builds Phaser animations for a given character using its atlases.
     */
    createAnimations(character: string) {
        const cleanCharacter = character.replace(/[0-9]+$/, '').toLowerCase();
        const setsToCreate = this.characterSets[cleanCharacter] || [];

        setsToCreate.forEach(setName => {
            const config = this.animationConfig[setName];
            if (!config) {
                console.warn(` No config found for animation set: ${setName}`);
                return;
            }

            // Atlas key is always lowercase (matches file loading)
            const atlasKey = `${cleanCharacter}_${config.name.toLowerCase()}`;
            
            // Animation key uses PascalCase (matches AnimationMappings.ts)
            // e.g. Ninja_1_AttackRun
            const animKey = `${this.capitalize(cleanCharacter)}_1_${this.toPascal(config.name)}`;

            // Skip if animation already exists
            if (this.scene.anims.exists(animKey)) {
                return;
            }

            const texture = this.scene.textures.get(atlasKey);
            if (!texture || texture.key === '__MISSING') {
                console.warn(` Texture not found for atlasKey=${atlasKey}`);
                return;
            }

            //  Dynamically grab all frames from the atlas JSON
            const frameNames = texture.getFrameNames().sort((a, b) => a.localeCompare(b));

            if (frameNames.length === 0) {
                console.warn(` No frames found for atlasKey=${atlasKey}`);
                return;
            }

            //  Create animation dynamically
            this.scene.anims.create({
                key: animKey,
                frames: frameNames.map(name => ({ key: atlasKey, frame: name })),
                frameRate: config.rate,
                repeat: config.repeat ?? -1,
            });

            console.log(`[AtlasManager]  Created animation: ${animKey} (${frameNames.length} frames)`);
        });
    }


  /** Utility: Capitalize first letter (magician → Magician) */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Utility: convert idle_blinking → Idle_Blinking */
  private toPascal(str: string): string {
    // split by underscore, capitalize each part
    return str.split('_').map(s => {
        // Handle CamelCase within parts if needed, but for now simple capitalize
        // If s is "attackRun", Capitalize -> "AttackRun"
        return s.charAt(0).toUpperCase() + s.slice(1);
    }).join('_');
  }
}