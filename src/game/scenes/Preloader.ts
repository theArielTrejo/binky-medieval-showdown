import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload(): void {
        console.log('Preloader: preload started');

        // Create a simple loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                color: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: {
                font: '18px monospace',
                color: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        const assetText = this.make.text({
            x: width / 2,
            y: height / 2 + 50,
            text: '',
            style: {
                font: '18px monospace',
                color: '#ffffff'
            }
        });
        assetText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value: number) => {
            percentText.setText(Math.floor(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('fileprogress', (file: any) => {
            assetText.setText('Loading: ' + file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
            console.log('Preloader: All assets loaded');
            this.scene.start('Menu');
        });

        // --- Load ALL Assets (shared between Menu and Game) ---
        this.load.setPath('assets');

        // Tilemap and tilesets (use 'map' key for Game compatibility)
        this.load.tilemapTiledJSON('map', 'tilemaps/binkymap1.json');
        this.load.image('floor1', 'tilemaps/floor1.png');
        this.load.image('GraveyardTileset', 'tilemaps/GraveyardTileset.png');
        this.load.image('tiledwallandfloor', 'tilemaps/tiledwallandfloor.png');
        this.load.image('gatedoorandflags', 'tilemaps/gatedoorandfloors.png');
        this.load.image('castlewall', 'tilemaps/castlewall.png');
        this.load.image('objecthouserocksstatues', 'tilemaps/objecthouserocksstatues.png');
        this.load.image('houses1', 'tilemaps/houses1.png');
        this.load.image('treesandplants', 'tilemaps/treesandplants.png');
        this.load.image('objectlogs', 'tilemaps/objectlogs.png');
        this.load.image('objectskeletonstatues', 'tilemaps/objectskeletonstatues.png');
        this.load.image('grassclippings1', 'tilemaps/grassclippings1.png');
        this.load.image('waggonsandmore', 'tilemaps/waggonsandmore.png');
        this.load.image('brokenspikedfence', 'tilemaps/brokenspikedfence.png');
        this.load.image('tents', 'tilemaps/tents.png');
        this.load.image('farmhouses', 'tilemaps/farmhouses.png');
        this.load.image('farmgrass', 'tilemaps/farmgrass.png');
        this.load.image('farmobjects', 'tilemaps/farmobjects.png');
        this.load.image('collision', 'tilemaps/collision.png');
        this.load.image('D_CastleGate', 'tilemaps/D_CastleGate.png');
        this.load.image('Portcullis', 'tilemaps/Portcullis.png');
        this.load.image('grassclippings2', 'tilemaps/grassclippings2.png');
        this.load.image('objectbrickstools', 'tilemaps/objectbrickstools.png');
        this.load.image('FieldsTileset', 'tilemaps/FieldsTileset.png');

        // UI and misc
        this.load.image('logo', 'logo.png');
        this.load.image('green_orb', 'images/green_orb.png');
        this.load.image('sparkle', 'images/green_orb.png');

        // Effects
        this.load.spritesheet('lightning-bolt', 'Effects/Lightning-bolt.png', { frameWidth: 72, frameHeight: 72 });
        this.load.spritesheet('explosion', 'Effects/Explosion.png', { frameWidth: 72, frameHeight: 72 });
        this.load.image('arrow', 'Effects/Arrow.png');
        this.load.image('whirlpool', 'Effects/Whirlpool.png');

        // Gnoll claw effect (12 frames)
        for (let i = 1; i <= 12; i++) {
            const frameNum = i.toString().padStart(5, '0');
            this.load.image(`gnoll-claw-${i}`, `Effects/Gnoll Claw/slash4_${frameNum}.png`);
        }

        // Bone slam effect (3 frames)
        for (let i = 0; i <= 2; i++) {
            const frameNum = i.toString().padStart(2, '0');
            this.load.image(`bone-slam-${i}`, `Effects/Bone_Slam/Frame_${frameNum}.png`);
        }

        // Ogre walk animation (18 frames)
        for (let i = 0; i <= 17; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`ogre-walk-${i}`, `mobs/ogre/Walking_${frameNum}.png`);
        }

        // Ogre attack animation (12 frames)
        for (let i = 0; i <= 11; i++) {
            const frameNum = i.toString().padStart(3, '0');
            this.load.image(`ogre-attack-${i}`, `mobs/ogre/Attacking_${frameNum}.png`);
        }

        // Knight atlases
        this.load.atlas('knight_walking', 'atlases/knight/knight_walking.png', 'atlases/knight/knight_walking.json');
        this.load.atlas('knight_idle', 'atlases/knight/knight_idle.png', 'atlases/knight/knight_idle.json');
        this.load.atlas('knight_attackrun', 'atlases/knight/knight_attackrun.png', 'atlases/knight/knight_attackrun.json');

        // Magician atlases
        this.load.atlas('magician_idle_blinking', 'atlases/magician/magician_idle_blinking.png', 'atlases/magician/magician_idle_blinking.json');
        this.load.atlas('magician_walking', 'atlases/magician/magician_walking.png', 'atlases/magician/magician_walking.json');
        this.load.atlas('magician_attack', 'atlases/magician/magician_attack.png', 'atlases/magician/magician_attack.json');

        // Ninja atlases
        this.load.atlas('ninja_idle_blinking', 'atlases/ninja/ninja_idle_blinking.png', 'atlases/ninja/ninja_idle_blinking.json');
        this.load.atlas('ninja_walking', 'atlases/ninja/ninja_walking.png', 'atlases/ninja/ninja_walking.json');
        this.load.atlas('ninja_attackrun', 'atlases/ninja/ninja_attackrun.png', 'atlases/ninja/ninja_attackrun.json');

        // Mob texture atlases (essential mobs)
        const mobTextures = ['196', '254', '281', '316', '204', '205', '131'];
        for (const num of mobTextures) {
            this.load.atlas(
                `mob-texture-${num}`,
                `spritesheets/mobs/texture-${num}.png`,
                `spritesheets/mobs/texture-${num}.json`
            );
        }
    }
}

