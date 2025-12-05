import { Scene } from 'phaser';
import { Player } from '../Player';

export class LightingSystem {
    private scene: Scene;
    private darkZones: Phaser.Geom.Rectangle[] = [];
    private inDarkZone: boolean = false;
    private darkness!: Phaser.GameObjects.Rectangle;
    private visionGfx!: Phaser.GameObjects.Graphics;
    private visionMask!: Phaser.Display.Masks.GeometryMask;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(tilemap: Phaser.Tilemaps.Tilemap): void {
        // --- Load forest dimming zones from Tiled ---
        const dimLayer = tilemap.getObjectLayer('dimlights');
        if (dimLayer && dimLayer.objects.length > 0) {
            this.darkZones = dimLayer.objects.map(obj =>
                new Phaser.Geom.Rectangle(obj.x, obj.y, obj.width, obj.height)
            );
            console.log(`LightingSystem: Loaded ${this.darkZones.length} dimlight zones.`);
        }

        // --- Fullscreen darkness overlay (hidden by default) ---
        this.darkness = this.scene.add.rectangle(
            0, 0,
            this.scene.cameras.main.width, this.scene.cameras.main.height,
            0x000000, 1 // Alpha 1, heavily managed by tweens/visibility
        ).setOrigin(0).setScrollFactor(0).setDepth(9998).setVisible(false);

        // --- Vision mask (the radius of light around player) ---
        this.visionGfx = this.scene.add.graphics().setScrollFactor(0).setDepth(9999);
        this.visionMask = this.visionGfx.createGeometryMask();
        this.visionMask.setInvertAlpha(true);
        this.darkness.setMask(this.visionMask);
    }

    public update(player: Player): void {
        const playerPos = player.getPosition();

        // Check if inside a dark zone (forest)
        let isInDark = false;
        for (const zone of this.darkZones) {
            if (zone.contains(playerPos.x, playerPos.y)) {
                isInDark = true;
                break;
            }
        }

        // --- Toggle overlay ---
        if (isInDark && !this.inDarkZone) {
            this.inDarkZone = true;
            this.darkness.setVisible(true);
            this.scene.tweens.add({
                targets: this.darkness,
                alpha: 0.95,
                duration: 300,
                ease: 'Quad.easeInOut'
            });
        } else if (!isInDark && this.inDarkZone) {
            this.inDarkZone = false;
            this.scene.tweens.add({
                targets: this.darkness,
                alpha: 0,
                duration: 300,
                ease: 'Quad.easeInOut',
                onComplete: () => this.darkness.setVisible(false)
            });
        }

        // --- Update the circular vision mask if active ---
        if (this.inDarkZone) {
            const cam = this.scene.cameras.main;
            const sx = playerPos.x - cam.scrollX;
            const sy = playerPos.y - cam.scrollY;

            this.visionGfx.clear();
            const radius = 1; // visible radius
            const fadeRings = 6; // rings around radius
            const ringStep = 10; // length of one ring to another
            for (let i = fadeRings; i >= 0; i--) {
                const alpha = 0.2 - i * 0.02; // Light
                this.visionGfx.fillStyle(0xffeedd, Math.max(alpha, 0));
                this.visionGfx.fillCircle(sx, sy, radius + i * ringStep);
            }
        } else {
            this.visionGfx.clear();
        }
    }
}
