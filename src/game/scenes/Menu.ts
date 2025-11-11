import { Scene } from 'phaser';

export class Menu extends Scene {
    constructor() {
        super('Menu');
    }

    preload(): void {
        console.log('Menu: preload started');
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
        
        console.log('Menu: preload finished');
    }

    create(): void {
        console.log('Menu: create started');
        
        // Create the tilemap
        const map = this.make.tilemap({ key: 'menuMap' });
        console.log('Tilemap created:', map.width, 'x', map.height);
        
        // Add all tilesets to the map
        const tilesetNames = [
            'floor1', 'GraveyardTileset', 'tiledwallandfloor', 'gatedoorandflags', 'castlewall',
            'objecthouserocksstatues', 'houses1', 'treesandplants', 'objectlogs', 'objectskeletonstatues',
            'grassclippings1', 'waggonsandmore', 'brokenspikedfence', 'tents', 'farmhouses',
            'farmgrass', 'farmobjects', /* 'collision' intentionally excluded for menu */ 'D_CastleGate', 'Portcullis',
            'grassclippings2', 'objectbrickstools', 'FieldsTileset'
        ];
        
        const tilesets = [];
        for (const name of tilesetNames) {
            const tileset = map.addTilesetImage(name, name);
            if (tileset) {
                tilesets.push(tileset);
            }
        }
        
        // Create all layers from the tilemap
        const shouldSkip = (name: string) => /collision|barrier|block|debug/i.test(name);
        for (let i = 0; i < map.layers.length; i++) {
            const layer = map.layers[i];
            if (shouldSkip(layer.name)) {
                console.log(`Skipped layer (menu background): ${layer.name}`);
                continue;
            }
            try {
                const created = map.createLayer(i, tilesets, 0, 0);
                // Ensure map layers sit at base depth so our ambient sprite can appear above them.
                if (created) {
                    created.setDepth(0);
                }
                console.log(`Created layer: ${layer.name}`);
            } catch (e) {
                console.warn(`Could not create layer ${i}: ${layer.name}`);
            }
        }
        
    // Position camera at spawn location (73% right, 25% down)
    const spawnX = map.widthInPixels * 0.73;
    const spawnY = map.heightInPixels * 0.25;
        
        this.cameras.main.centerOn(spawnX, spawnY);
    this.cameras.main.setZoom(1.5);
        
        console.log('Camera positioned at spawn:', spawnX, spawnY);

        // Semi-transparent dark overlay for menu buttons readability
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.5);
    overlay.setOrigin(0.5).setDepth(10).setScrollFactor(0);

        // Add menu title at fixed screen position
        const titleText = this.add.text(centerX, 160, "Binky's Medieval Showdown", {
            fontSize: '45px',
            color: '#ffffff',
            fontStyle: 'bold',
            fontFamily: 'Cinzel, serif',
            align: 'center',
        });
        titleText.setOrigin(0.5).setDepth(100).setScrollFactor(0);
        console.log('✅ Title text created');

        // --- Knight ambient walker setup ---
        // Verify atlas loaded
        if (!this.textures.exists('knight_walking')) {
            console.warn('Knight atlas not found: knight_walking');
        } else {
            // Build walk animation from all frames in atlas (sequential names)
            const walkingFrames = this.anims.generateFrameNames('knight_walking', {
                start: 0,
                end: 23,
                zeroPad: 3,
                prefix: '0_Knight_Walking_',
                suffix: '.png'
            });

            if (!this.anims.exists('MenuKnightWalk')) {
                this.anims.create({
                    key: 'MenuKnightWalk',
                    frames: walkingFrames,
                    frameRate: 10,
                    repeat: -1
                });
            }

            // Build idle animation using available frame names from the idle atlas
            if (this.textures.exists('knight_idle') && !this.anims.exists('MenuKnightIdle')) {
                const idleTexture = this.textures.get('knight_idle');
                const idleFrameNames = idleTexture.getFrameNames().filter((f) => f.startsWith('0_Knight_Idle_'));
                // Sort to ensure correct order if needed
                idleFrameNames.sort();
                this.anims.create({
                    key: 'MenuKnightIdle',
                    frames: idleFrameNames.map((name) => ({ key: 'knight_idle', frame: name })),
                    frameRate: 6,
                    repeat: -1
                });
            }

            // Choose a path near screen center for guaranteed visibility (slightly higher on screen)
            const cam = this.cameras.main;
            const screenCenterX = cam.width / 2;
            const screenCenterY = cam.height / 2 + 60; // move up a bit compared to previous (+120)

            const knight = this.add.sprite(screenCenterX - 200, screenCenterY, 'knight_walking');
            knight.setScrollFactor(0); // pin to screen space for visibility
            knight.setDepth(11); // above overlay
            knight.setScale(0.10); // menu knight size (adjust as needed)
            knight.play('MenuKnightWalk');

            console.log('Menu knight spawned at:', knight.x, knight.y, 'depth', knight.depth);

            // Randomized walk/idle loop across the SCREEN (not the map)
            // Define a safe movement rectangle within the viewport, accounting for sprite size
            const margin = 40;
            const uiTopGuard = 120; // avoid overlapping title too much
            const frameSize = 900; // source frame size from atlas
            const halfW = (frameSize * knight.scaleX) / 2;
            const halfH = (frameSize * knight.scaleY) / 2;
            const bounds = {
                left: margin + halfW,
                right: cam.width - margin - halfW,
                top: uiTopGuard + halfH,
                bottom: cam.height - margin - halfH
            };

            let baseY = screenCenterY; // baseline for idle bob around current Y
            let bobTween: Phaser.Tweens.Tween | null = null; // created only during idle

            const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

            const pauseRandom = (next: () => void) => {
                if (this.anims.exists('MenuKnightIdle')) {
                    knight.play('MenuKnightIdle');
                }
                // Start subtle idle bobbing only while idle
                if (!bobTween) {
                    bobTween = this.tweens.add({
                        targets: knight,
                        y: baseY + 3, // bob downward first to avoid an upward pop
                        duration: 1600,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.inOut'
                    });
                }
                // Longer idle duration as requested
                const pauseMs = randInt(2500, 6000);
                this.time.delayedCall(pauseMs, next);
            };

            const randomTarget = () => {
                const tx = randInt(Math.floor(bounds.left), Math.floor(bounds.right));
                const ty = randInt(Math.floor(bounds.top), Math.floor(bounds.bottom));
                return { tx, ty };
            };

            const startWalk = () => {
                // pick a random on-screen target
                const { tx, ty } = randomTarget();
                // set facing based on horizontal direction
                knight.setFlipX(tx < knight.x);
                if (this.anims.exists('MenuKnightWalk')) {
                    knight.play('MenuKnightWalk');
                }
                // Stop bobbing when starting to walk
                if (bobTween) {
                    bobTween.stop();
                    if (typeof bobTween.remove === 'function') bobTween.remove();
                    bobTween = null;
                }
                // Ensure starting from the current baseline (avoid sudden pop)
                knight.y = baseY;
                // Compute duration based on distance for consistent (slower) speed
                const dx = tx - knight.x;
                const dy = ty - knight.y;
                const distance = Math.hypot(dx, dy);
                const speedPxPerSec = 40; // adjust to taste (lower = slower)
                let duration = (distance / speedPxPerSec) * 1000;
                // Clamp duration to avoid too-fast moves on short hops and too-slow on long ones
                duration = Math.max(5500, Math.min(duration, 16000));

                this.tweens.add({
                    targets: knight,
                    x: tx,
                    y: ty,
                    duration,
                    ease: 'Linear', // constant speed feel
                    onComplete: () => {
                        // Update baseline to current Y at end of walk
                        baseY = knight.y;
                        pauseRandom(startWalk);
                    }
                });
            };

            pauseRandom(startWalk);

            // Subtle vertical bobbing for life
            // Removed continuous bobbing while walking to prevent bounce
        }

        // Create menu buttons
        this.createMenuButtons();
        console.log('✅ Menu: create finished');
    }

    private createMenuButtons(): void {
    // Place buttons at fixed screen positions so they are always visible
    const centerX = this.cameras.main.width / 2;
    const buttonY = 300;
    const spacing = 100;

        // Play Button
        const playButton = this.add.text(centerX, buttonY, '▶ PLAY', {
            fontSize: '32px',
            color: '#00ff00',
            stroke: '#00ff00',
            strokeThickness: 2,
            fontFamily: 'Cinzel, serif',
            align: 'center',
        });
        playButton.setOrigin(0.5).setInteractive().setDepth(101).setScrollFactor(0);

        playButton.on('pointerdown', () => {
            console.log('Play clicked');
            this.scene.start('Game');
        });

        playButton.on('pointerover', () => {
            playButton.setStyle({ color: '#66ff66' });
        });

        playButton.on('pointerout', () => {
            playButton.setStyle({ color: '#00ff00' });
        });

        // Settings Button
        const settingsButton = this.add.text(centerX, buttonY + spacing, '⚙ SETTINGS', {
            fontSize: '32px',
            color: '#ffff00',
            stroke: '#ffff00',
            strokeThickness: 2,
            fontFamily: 'Cinzel, serif',
            align: 'center',
        });
        settingsButton.setOrigin(0.5).setInteractive().setDepth(101).setScrollFactor(0);

        settingsButton.on('pointerdown', () => {
            console.log('Settings clicked');
        });

        settingsButton.on('pointerover', () => {
            settingsButton.setStyle({ color: '#ffff99' });
        });

        settingsButton.on('pointerout', () => {
            settingsButton.setStyle({ color: '#ffff00' });
        });

        // Quit Button
        const quitButton = this.add.text(centerX, buttonY + spacing * 2, '✕ QUIT', {
            fontSize: '32px',
            color: '#ff0000',
            stroke: '#ff0000',
            strokeThickness: 2,
            fontFamily: 'Cinzel, serif',
            align: 'center',
        });
        quitButton.setOrigin(0.5).setInteractive().setDepth(101).setScrollFactor(0);

        quitButton.on('pointerdown', () => {
            console.log('Quit clicked');
        });

        quitButton.on('pointerover', () => {
            quitButton.setStyle({ color: '#ff6666' });
        });

        quitButton.on('pointerout', () => {
            quitButton.setStyle({ color: '#ff0000' });
        });
    }
}