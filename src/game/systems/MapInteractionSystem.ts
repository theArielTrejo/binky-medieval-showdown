import { Scene } from 'phaser';
import { PhysicsSystem } from './PhysicsSystem';
import { AudioManager } from './AudioManager';

export class MapInteractionSystem {
    private scene: Scene;
    private physicsSystem: PhysicsSystem;
    private tilemap!: Phaser.Tilemaps.Tilemap;

    private doorTiles: Phaser.Tilemaps.Tile[] = [];
    private doorGroups: { tiles: Phaser.Tilemaps.Tile[]; opened: boolean; label: string }[] = [];
    private objectLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    private doorOffset: number = 148; // Open - Closed index difference

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

        // Group doors by adjacency so we can open them independently (e.g., 3 separate gates)
        this.doorGroups = this.groupDoorTiles(this.doorTiles).map((tiles, idx) => ({
            tiles,
            opened: false,
            label: `Gate ${idx + 1}`
        }));
        console.log(`MapInteractionSystem: Grouped into ${this.doorGroups.length} door groups.`);

        // Fix animation state for closed doors (prevent cycling)
        this.doorTiles.forEach(tile => {
            if (tile.tileset) {
                const tileData = tile.tileset.getTileData(tile.index) as any;
                if (tileData && tileData.animation) {
                    delete tileData.animation;
                }
            }
        });

        // Register colliders with PhysicsSystem for all closed doors
        this.physicsSystem.registerDoorColliders(this.doorTiles);
    }

    public openDoorGroup(index: number, labelOverride?: string): void {
        if (!this.objectLayer || !this.doorGroups.length) return;
        const group = this.doorGroups[index];
        if (!group || group.opened) return;

        group.opened = true;
        const message = labelOverride || `${group.label} opened!`;

        group.tiles.forEach(tile => {
            const openTileIndex = tile.index + this.doorOffset;
            this.objectLayer!.putTileAt(openTileIndex, tile.x, tile.y);

            // Remove collision tile at the same location (collision layer)
            const collisionLayer = this.tilemap.getLayer('collisions')?.tilemapLayer;
            if (collisionLayer) {
                collisionLayer.removeTileAt(tile.x, tile.y);
            }
        });

        // Re-register colliders for remaining closed doors
        const remainingClosedTiles = this.doorGroups
            .filter(g => !g.opened)
            .flatMap(g => g.tiles);
        if (remainingClosedTiles.length > 0) {
            this.physicsSystem.registerDoorColliders(remainingClosedTiles);
        } else {
            this.physicsSystem.removeDoorColliders();
        }

        console.log(`MapInteractionSystem: ${message}`);
        AudioManager.getInstance().playSFX('door-open');
        this.showGateOpenMessage(message);
    }

    public openDarkForestGate(): void {
        // Backward compatibility: open the first door group
        this.openDoorGroup(0, 'The Dark Forest Gate has opened!');
    }

    /**
     * Groups door tiles into connected components by adjacency (4-way).
     */
    private groupDoorTiles(tiles: Phaser.Tilemaps.Tile[]): Phaser.Tilemaps.Tile[][] {
        const visited = new Set<string>();
        const groups: Phaser.Tilemaps.Tile[][] = [];

        const key = (t: Phaser.Tilemaps.Tile) => `${t.x},${t.y}`;
        const neighbors = (t: Phaser.Tilemaps.Tile) => {
            const deltas = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            return deltas
                .map(d => tiles.find(tile => tile.x === t.x + d.x && tile.y === t.y + d.y))
                .filter(Boolean) as Phaser.Tilemaps.Tile[];
        };

        for (const tile of tiles) {
            if (visited.has(key(tile))) continue;
            const group: Phaser.Tilemaps.Tile[] = [];
            const stack: Phaser.Tilemaps.Tile[] = [tile];

            while (stack.length > 0) {
                const current = stack.pop()!;
                if (visited.has(key(current))) continue;
                visited.add(key(current));
                group.push(current);
                neighbors(current).forEach(n => stack.push(n));
            }
            groups.push(group);
        }
        return groups;
    }

    private showGateOpenMessage(text: string = 'A gate has opened!'): void {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        const msgText = this.scene.add.text(width / 2, height / 2, text, {
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
