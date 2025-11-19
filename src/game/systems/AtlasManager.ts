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

  // default animation sets per character type
  private defaultSets: CharacterAnimationSet[] = [
    // Magician
    { name: 'idle_blinking', frames: 18, rate: 12, repeat: -1 },
    { name: 'walking', frames: 24, rate: 18, repeat: -1 },
    { name: 'attack', frames: 12, rate: 20, repeat: 0}, // Do not repeat, plays once

    // Knight
    { name: 'idle', frames: 18, rate: 6, repeat: -1 },
    { name: 'walking', frames: 24, rate: 12, repeat: -1 },
    { name: 'attackRun', frames: 12, rate: 14, repeat: 0 },

    // Ninja
    { name: 'idle', frames: 18, rate: 6, repeat: -1 },
    { name: 'walking', frames: 24, rate: 12, repeat: -1 },
    { name: 'attackRun', frames: 12, rate: 14, repeat: 0 }
  ];

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

        const characterSets: Record<string, string[]> = {
            magician: ['idle_blinking', 'walking', 'attack'],
            knight: ['idle', 'walking', 'attackrun'],
            ninja: ['idle_blinking', 'walking', 'attackrun']
        };

        const setsToLoad = characterSets[cleanCharacter] || [];

        if (setsToLoad.length === 0) {
            console.warn(` No animation sets defined for character: ${cleanCharacter}`);
            return;
        }

        setsToLoad.forEach(setName => {
            const key = `${cleanCharacter}_${setName}`;
            const png = `/atlases/${cleanCharacter}/${key}.png`;
            const json = `/atlases/${cleanCharacter}/${key}.json`;

            // Check if texture already exists before loading
            if (this.scene.textures.exists(key)) {
                console.log(`🔹 Atlas already loaded: key="${key}"`);
                return;
            }

            console.log(`🔹 Queuing atlas: key="${key}"`, { png, json });

            //  Simple, clean, correct:
            this.scene.load.atlas(key, png, json);
        });
    }


    /**
     * Builds Phaser animations for a given character using its atlases.
     */
    createAnimations(character: string) {
        const sets = this.defaultSets;
        const cleanCharacter = character.replace(/[0-9]+$/, '').toLowerCase();

        sets.forEach(set => {
            const atlasKey = `${cleanCharacter}_${set.name}`;
            const animKey = `${this.capitalize(cleanCharacter)}_1_${this.toPascal(set.name)}`;

            // Skip if animation already exists
            if (this.scene.anims.exists(animKey)) {
                console.log(` Animation already exists: ${animKey}`);
                return;
            }

            const texture = this.scene.textures.get(atlasKey);
            if (!texture) {
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
                frameRate: set.rate,
                repeat: set.repeat ?? -1,
            });

            console.log(`[AtlasManager]  Created animation: ${animKey} (${frameNames.length} frames)`);
        });

        console.log(' All loaded atlases:', this.scene.textures.list);
    }


  /** Utility: Capitalize first letter (magician → Magician) */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Utility: convert idle_blinking → Idle_Blinking */
  private toPascal(str: string): string {
    return str.split('_').map(s => this.capitalize(s)).join('_');
  }
}