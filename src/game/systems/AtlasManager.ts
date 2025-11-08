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
    { name: 'idle_blinking', frames: 18, rate: 8, repeat: -1 },
    { name: 'walking', frames: 24, rate: 10, repeat: -1 }
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

    /**
     * Loads all atlases for a given character (Magician, Knight, Rogue, etc.).
     * Expected folder structure:
     *  public/assets/atlases/<character>/<character>_<animation>.png|json
     */
    loadAllForCharacter(character: string) {
      // Strip any numeric suffix like "magician1" → "magician"
      const cleanCharacter = character.replace(/[0-9]+$/, '');

      // 🔧 IMPORTANT: neutralize any global loader base/path set elsewhere
      this.scene.load.setBaseURL('');
      this.scene.load.setPath('');

      // ✅ Build a root-relative path WITHOUT duplicating "/assets/"
      //    (No leading slash here, because some code sets load.setPath('/assets/'))
      const basePath = 'assets/atlases/' + cleanCharacter + '/';

      const sets = this.defaultSets;

      sets.forEach(set => {
        const key  = `${cleanCharacter}_${set.name}`;
        const file = `${cleanCharacter}_${set.name}`;

        const png  = `${basePath}${file}.png`;
        const json = `${basePath}${file}.json`;

        console.log(`🔹 Attempting to load atlas: key="${key}" from "${png}" & "${json}"`);

        if (!this.scene.textures.exists(key)) {
          this.scene.load.atlas(key, png, json);
        } else {
          console.log(`⚠️ Atlas already exists: ${key}`);
        }
      });
    }



    /**
     * Builds Phaser animations for a given character using its atlases.
     */
    createAnimations(character: string) {
        const sets = this.defaultSets;

        // Normalize again (magician1 → magician)
        const cleanCharacter = character.replace(/[0-9]+$/, '');

        sets.forEach(set => {
            const atlasKey = `${cleanCharacter}_${set.name}`; // use clean name
            const animKey = `${this.capitalize(cleanCharacter)}_1_${this.toPascal(set.name)}`;

            if (this.scene.anims.exists(animKey)) {
            console.log(`⚠️ Animation already exists: ${animKey}`);
            return;
            }

            this.scene.anims.create({
            key: animKey,
            frames: this.scene.anims.generateFrameNames(atlasKey, {
                prefix: `0_${this.capitalize(cleanCharacter)}_${this.toPascal(set.name)}_`,
                start: 0,
                end: set.frames - 1,
                zeroPad: 3,
                suffix: '.png'
            }),
            frameRate: set.rate,
            repeat: set.repeat ?? -1
            });

            console.log(`[AtlasManager] ✅ Created animation: ${animKey}`);
        });
        console.log('All loaded atlases:', this.scene.textures.list);
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