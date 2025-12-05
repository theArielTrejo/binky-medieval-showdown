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
            assetText.setText('Loading asset: ' + file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
            console.log('Preloader: preload finished');
            this.scene.start('Menu');
        });

        // --- Load Assets for Menu ---
        this.load.setPath('assets');

        // Load tilemap and all tilesets for background rendering
        this.load.tilemapTiledJSON('menuMap', 'tilemaps/binkymap1.json');

        // Load all tileset images
        this.load.image('floor1', 'tilemaps/floor1.png');
        this.load.image('GraveyardTileset', 'tilemaps/GraveyardTileset.png');
        this.load.image('tiledwallandfloor', 'tilemaps/tiledwallandfloor.png');
        this.load.image('gatedoorandflags', 'tilemaps/gatedoorandflags.png');
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
        this.load.image('D_CastleGate', 'tilemaps/D_CastleGate.png');
        this.load.image('Portcullis', 'tilemaps/Portcullis.png');
        this.load.image('grassclippings2', 'tilemaps/grassclippings2.png');
        this.load.image('objectbrickstools', 'tilemaps/objectbrickstools.png');
        this.load.image('FieldsTileset', 'tilemaps/FieldsTileset.png');

        // Knight atlases (for background ambient animation)
        this.load.atlas('knight_walking', 'atlases/knight/knight_walking.png', 'atlases/knight/knight_walking.json');
        this.load.atlas('knight_idle', 'atlases/knight/knight_idle.png', 'atlases/knight/knight_idle.json');
    }
}
