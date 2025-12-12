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

    /**
     * Get the physics world bounds for clamping positions
     */
    public getWorldBounds(): Phaser.Geom.Rectangle {
        return this.scene.physics.world.bounds;
    }

    /**
     * Raycast from start to end position and return the first collision point with walls.
     * Returns null if the path is clear.
     * @param startX - Starting X coordinate
     * @param startY - Starting Y coordinate  
     * @param endX - Target X coordinate
     * @param endY - Target Y coordinate
     * @param padding - Distance to stop before the collision point (default 10px)
     */
    public getLineCollisionPoint(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        padding: number = 10
    ): Phaser.Math.Vector2 | null {
        const line = new Phaser.Geom.Line(startX, startY, endX, endY);

        let closestPoint: Phaser.Math.Vector2 | null = null;
        let closestDistSq = Infinity;

        for (const layer of this.collisionLayers) {
            const tiles = layer.getTilesWithinShape(line, { isColliding: true });

            for (const tile of tiles) {
                // Create tile bounds rectangle
                const tileRect = new Phaser.Geom.Rectangle(
                    tile.pixelX,
                    tile.pixelY,
                    tile.width,
                    tile.height
                );

                // Find intersection point with tile
                const points = Phaser.Geom.Intersects.GetLineToRectangle(line, tileRect);

                if (points.length > 0) {
                    // Find the closest intersection point to start
                    for (const point of points) {
                        const dx = point.x - startX;
                        const dy = point.y - startY;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < closestDistSq) {
                            closestDistSq = distSq;
                            closestPoint = new Phaser.Math.Vector2(point.x, point.y);
                        }
                    }
                }
            }
        }

        // Also check object rectangles
        for (const rect of this.objectRects) {
            const body = rect.body as Phaser.Physics.Arcade.StaticBody;
            if (!body) continue;

            const objRect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
            const points = Phaser.Geom.Intersects.GetLineToRectangle(line, objRect);

            if (points.length > 0) {
                for (const point of points) {
                    const dx = point.x - startX;
                    const dy = point.y - startY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestPoint = new Phaser.Math.Vector2(point.x, point.y);
                    }
                }
            }
        }

        // Also check door colliders
        this.doorColliders.children.iterate((child: Phaser.GameObjects.GameObject) => {
            const rect = child as Phaser.GameObjects.Rectangle;
            const body = rect.body as Phaser.Physics.Arcade.StaticBody;
            if (!body) return true;

            const doorRect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
            const points = Phaser.Geom.Intersects.GetLineToRectangle(line, doorRect);

            if (points.length > 0) {
                for (const point of points) {
                    const dx = point.x - startX;
                    const dy = point.y - startY;
                    const distSq = dx * dx + dy * dy;

                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestPoint = new Phaser.Math.Vector2(point.x, point.y);
                    }
                }
            }
            return true;
        });

        // If we found a collision, back up by padding amount
        if (closestPoint) {
            const dir = new Phaser.Math.Vector2(endX - startX, endY - startY).normalize();
            closestPoint.x -= dir.x * padding;
            closestPoint.y -= dir.y * padding;
        }

        return closestPoint;
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
