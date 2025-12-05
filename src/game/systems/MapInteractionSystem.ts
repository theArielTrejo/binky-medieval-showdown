import { Scene } from 'phaser';
import { PhysicsSystem } from './PhysicsSystem';

export class MapInteractionSystem {
    private scene: Scene;
    private physicsSystem: PhysicsSystem;
    private tilemap!: Phaser.Tilemaps.Tilemap;
    
    private doorTiles: Phaser.Tilemaps.Tile[] = [];
    private objectLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private doorOpened: boolean = false;

    constructor(scene: Scene, physicsSystem: PhysicsSystem) {
        this.scene = scene;
        this.physicsSystem = physicsSystem;
    }

    public initialize(tilemap: Phaser.Tilemaps.Tilemap): void {
        this.tilemap = tilemap;
        this.objectLayer = this.tilemap.getLayer('objects')?.tilemapLayer || null;

        if (!this.objectLayer) {
            console.warn('MapInteractionSystem: No "objects" layer found!');
            return;
        }

        // Find door tiles
        this.doorTiles = this.objectLayer.filterTiles(
            (tile: Phaser.Tilemaps.Tile) => tile.properties?.type === 'door'
        );
        console.log(`MapInteractionSystem: Found ${this.doorTiles.length} door tiles.`);

        // Fix animation state for closed doors (prevent cycling)
        this.doorTiles.forEach(tile => {
            if (tile.tileset) {
                const tileData = tile.tileset.getTileData(tile.index) as any;
                if (tileData && tileData.animation) {
                    delete tileData.animation; 
                }
            }
        });

        // Register colliders with PhysicsSystem
        this.physicsSystem.registerDoorColliders(this.doorTiles);
    }

    public isDoorOpened(): boolean {
        return this.doorOpened;
    }

    public openDarkForestGate(): void {
        if (this.doorOpened) return;
        this.doorOpened = true;

        const doorOffset = 148; // Open - Closed index difference

        if (this.doorTiles.length > 0 && this.objectLayer) {
            this.doorTiles.forEach(tile => {
                const openTileIndex = tile.index + doorOffset;
                this.objectLayer!.putTileAt(openTileIndex, tile.x, tile.y);

                // Also remove collision at this location if it exists in the TILE collision layer
                const collisionLayer = this.tilemap.getLayer('collisions')?.tilemapLayer;
                if (collisionLayer) {
                    collisionLayer.removeTileAt(tile.x, tile.y);
                }
            });

            // Remove physical colliders
            this.physicsSystem.removeDoorColliders();

            console.log('MapInteractionSystem: Dark Forest Gate opened.');
            this.showGateOpenMessage();
        }
    }

    private showGateOpenMessage(): void {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const msgText = this.scene.add.text(width / 2, height / 2, 'The Dark Forest Gate has opened!', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        this.scene.tweens.add({
            targets: msgText,
            alpha: 0,
            duration: 4000,
            delay: 2000,
            onComplete: () => msgText.destroy()
        });
    }
}
