import { Scene } from 'phaser';
import { Player } from '../Player';

export class PhysicsSystem {
    private scene: Scene;
    private collisionLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    private objectRects: Phaser.GameObjects.Rectangle[] = [];
    private doorColliders!: Phaser.Physics.Arcade.StaticGroup;
    
    // Debug
    private debugEnabled: boolean = false;
    private collisionDebugGfx!: Phaser.GameObjects.Graphics;
    private playerDebugGfx!: Phaser.GameObjects.Graphics;
    private player!: Player; // Reference for debug drawing

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public initialize(): void {
        this.doorColliders = this.scene.physics.add.staticGroup();
        this.createDebugGraphics();
        this.setupDebugInput();
    }

    public setupWorldCollisions(tilemap: Phaser.Tilemaps.Tilemap): void {
        this.collisionLayers = [];
        this.objectRects = [];
        // doorColliders is managed by registerDoorColliders and is a persistent Group now

        // 1. Setup Tile Layer Collisions
        const collisionsLayer = tilemap.getLayer('collisions')?.tilemapLayer;
        if (collisionsLayer) {
            collisionsLayer.setCollisionByExclusion([-1]);
            collisionsLayer.setVisible(false);
            this.collisionLayers.push(collisionsLayer);
        }

        // 2. Setup Object Layer Collisions (objectcollisions)
        const objectCollisionLayer = tilemap.getObjectLayer('objectcollisions');
        if (objectCollisionLayer && objectCollisionLayer.objects) {
            objectCollisionLayer.objects.forEach(obj => {
                // Tiled objects are top-left; Arcade bodies are center-based
                const x = (obj.x || 0) + (obj.width || 0) / 2;
                const y = (obj.y || 0) + (obj.height || 0) / 2;

                const rect = this.scene.add
                    .rectangle(x, y, obj.width, obj.height)
                    .setOrigin(0.5)
                    .setVisible(false);

                // Add STATIC physics body
                this.scene.physics.add.existing(rect, true);
                this.objectRects.push(rect);
            });
        }
        
        console.log(`PhysicsSystem: World setup complete. ${this.collisionLayers.length} layers, ${this.objectRects.length} static objects.`);
    }

    public registerDoorColliders(tiles: Phaser.Tilemaps.Tile[]): void {
        // Clear existing
        this.doorColliders.clear(true, true);

        tiles.forEach(tile => {
            const x = tile.pixelX + tile.width / 2;
            const y = tile.pixelY + tile.height / 2;

            const rect = this.scene.add
                .rectangle(x, y, tile.width, tile.height)
                .setOrigin(0.5)
                .setVisible(false);

            // Add to static group (automatically adds static body)
            this.doorColliders.add(rect);
            
            // Explicitly refresh body if needed, but adding to static group usually handles it
             const body = rect.body as Phaser.Physics.Arcade.StaticBody;
             if (body) {
                 body.updateFromGameObject();
             }
        });
        console.log(`PhysicsSystem: Registered ${this.doorColliders.getLength()} door colliders.`);
    }

    public removeDoorColliders(): void {
        this.doorColliders.clear(true, true);
        console.log('PhysicsSystem: Door colliders removed.');
    }

    public setupPlayerCollisions(player: Player): void {
        this.player = player;
        
        // Collide with tile layers
        this.collisionLayers.forEach(layer => {
            this.scene.physics.add.collider(player.sprite, layer);
        });

        // Collide with static objects
        this.objectRects.forEach(rect => {
            this.scene.physics.add.collider(player.sprite, rect);
        });

        // Collide with doors (Group)
        this.scene.physics.add.collider(player.sprite, this.doorColliders);
    }

    public setupEnemyCollisions(enemySprite: Phaser.GameObjects.Sprite): void {
        // Collide with tile layers
        this.collisionLayers.forEach(layer => {
            this.scene.physics.add.collider(enemySprite, layer);
        });

        // Collide with static objects
        this.objectRects.forEach(rect => {
            this.scene.physics.add.collider(enemySprite, rect);
        });

        // Collide with doors (Group)
        this.scene.physics.add.collider(enemySprite, this.doorColliders);
    }

    public getCollisionLayers(): Phaser.Tilemaps.TilemapLayer[] {
        return this.collisionLayers;
    }

    // --- Debugging ---

    private createDebugGraphics(): void {
        this.collisionDebugGfx = this.scene.add.graphics().setDepth(10000).setAlpha(0.85);
        this.playerDebugGfx = this.scene.add.graphics().setDepth(10001).setAlpha(0.95);
    }

    private setupDebugInput(): void {
        if (this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.on('keydown-F1', () => {
                this.debugEnabled = !this.debugEnabled;
                if (!this.debugEnabled) {
                    this.collisionDebugGfx.clear();
                    this.playerDebugGfx.clear();
                }
            });
        }
    }

    public renderDebug(): void {
        if (!this.debugEnabled) return;

        this.collisionDebugGfx.clear();
        this.playerDebugGfx.clear();

        // 1) Colliding Tiles (orange)
        this.collisionLayers.forEach(layer => {
            layer.renderDebug(this.collisionDebugGfx, {
                tileColor: null,
                collidingTileColor: new Phaser.Display.Color(243, 134, 48, 180),
                faceColor: new Phaser.Display.Color(40, 39, 37, 255)
            });
        });

        // 2) Object Rectangles (red outlines)
        this.collisionDebugGfx.lineStyle(2, 0xff0000, 1);
        this.objectRects.forEach(rect => {
            const body = (rect.body as Phaser.Physics.Arcade.StaticBody);
            if (body) {
                this.collisionDebugGfx.strokeRect(body.x, body.y, body.width, body.height);
            }
        });

        // 3) Door Colliders (blue outlines)
        this.collisionDebugGfx.lineStyle(2, 0x0000ff, 1);
        this.doorColliders.children.iterate((child: Phaser.GameObjects.GameObject) => {
            const rect = child as Phaser.GameObjects.Rectangle;
             const body = (rect.body as Phaser.Physics.Arcade.StaticBody);
            if (body) {
                this.collisionDebugGfx.strokeRect(body.x, body.y, body.width, body.height);
            }
            return true;
        });

        // 4) Player body (lime outline)
        if (this.player && this.player.sprite && this.player.sprite.body) {
            const pb = this.player.sprite.body as Phaser.Physics.Arcade.Body;
            this.playerDebugGfx.lineStyle(2, 0x00ff00, 1);
            this.playerDebugGfx.strokeRect(pb.x, pb.y, pb.width, pb.height);
        }
    }

    public destroy(): void {
        this.collisionDebugGfx.destroy();
        this.playerDebugGfx.destroy();
        this.objectRects.forEach(r => r.destroy());
        if (this.doorColliders) this.doorColliders.clear(true, true);
        // Layers are destroyed by tilemap usually, but we clear refs
        this.collisionLayers = [];
        this.objectRects = [];
    }
}
