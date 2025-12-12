
import * as Phaser from 'phaser';
import { Scene, GameObjects, Input } from 'phaser';
import { skillTreeData, Skill } from '../data/SkillTreeData';
import { playerArchetypeToSkillArchetype, PlayerArchetypeType } from '../objects/PlayerArchetype';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';
import { SkillNode } from '../objects/SkillNode';

export class SkillTreeScene extends Scene {
    // Layers
    private backgroundLayer: GameObjects.Layer;
    private connectionLayer: GameObjects.Layer;
    private nodeLayer: GameObjects.Layer;
    private uiLayer: GameObjects.Layer;

    // Cameras
    // cameras.main is now Background Camera (Index 0)
    private worldCamera: Phaser.Cameras.Scene2D.Camera; // Index 1
    private uiCamera: Phaser.Cameras.Scene2D.Camera;    // Index 2

    // Objects
    private connectionsGraphics: GameObjects.Graphics;
    private connectionGroup: GameObjects.Group; // Manage text objects
    private skillPointsText: GameObjects.Text;
    private tooltip: GameObjects.DOMElement;
    private nodes: Map<string, SkillNode> = new Map();

    // State
    private currentArchetype: PlayerArchetypeType;
    private unlockedSkills: Map<string, boolean>;
    private starLayers: { sprite: Phaser.GameObjects.TileSprite, speed: number }[] = [];

    // Camera Control
    private isDragging: boolean = false;
    private dragOrigin: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private zoomLevel: number = 1.0;
    private minZoom: number = 0.5;
    private maxZoom: number = 2.0;

    // Debounce
    private lastToggleTime: number = 0;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    init(data: { archetype: PlayerArchetypeType }) {
        this.currentArchetype = data.archetype || PlayerArchetypeType.TANK;
        console.log('SkillTreeScene initialized with archetype:', this.currentArchetype);

        // Input Hardening: Reset keys to prevent sticky inputs
        if (this.input.keyboard) {
            this.input.keyboard.resetKeys();
        }
        this.lastToggleTime = this.time.now;
    }

    create() {
        // Sync state from registry
        if (!this.registry.has('unlockedSkills')) {
            this.registry.set('unlockedSkills', new Map<string, boolean>());
        }
        this.unlockedSkills = this.registry.get('unlockedSkills');

        // Setup Camera Background
        // BG Camera (Main) - set color
        this.cameras.main.setBackgroundColor('#050510');

        // 0. GENERATE ASSETS (Runtime Atlas Simulation)
        if (!this.textures.exists('skill_node_bg')) {
            const bgGraphics = this.make.graphics({ x: 0, y: 0 });
            bgGraphics.fillStyle(0xffffff);
            bgGraphics.fillRoundedRect(0, 0, 64, 64, 8);
            bgGraphics.generateTexture('skill_node_bg', 64, 64);
            bgGraphics.destroy();
        }

        // 1. Create Layers
        this.backgroundLayer = this.add.layer();
        this.connectionLayer = this.add.layer();
        this.nodeLayer = this.add.layer();
        this.uiLayer = this.add.layer();

        // 2. Setup 3-Camera System
        const width = this.scale.width;
        const height = this.scale.height;

        // A. Background Camera (Main Camera - Index 0)
        // Renders ONLY background layer
        this.cameras.main.ignore([this.nodeLayer, this.connectionLayer, this.uiLayer]);

        // B. World Camera (New Camera - Index 1)
        // Renders Nodes and Connections (Dynamic)
        this.worldCamera = this.cameras.add(0, 0, width, height);
        this.worldCamera.ignore([this.backgroundLayer, this.uiLayer]);
        this.worldCamera.setBackgroundColor('rgba(0,0,0,0)'); // Transparent

        // C. UI Camera (New Camera - Index 2)
        // Renders ONLY UI Layer
        this.uiCamera = this.cameras.add(0, 0, width, height);
        this.uiCamera.ignore([this.backgroundLayer, this.nodeLayer, this.connectionLayer]);


        // 3. Background (Book)
        this.createBookBackground();

        // 4. Connections Graphics
        this.connectionsGraphics = this.make.graphics({ x: 0, y: 0 });
        this.connectionLayer.add(this.connectionsGraphics);
        this.connectionGroup = this.add.group();

        // 5. Build Tree
        this.createSkillTree();

        // 6. UI (Screen Space - Static)
        this.createUI();

        // 7. Input Handling
        this.setupInput();

        // Initial Position: Center camera on tree
        this.centerCameraOnTree();

        // Handle Resize
        this.scale.on('resize', this.handleResize, this);
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        if (!this.scene.isActive() || !this.cameras || !this.cameras.main) return;

        const width = gameSize.width;
        const height = gameSize.height;

        // Resize all cameras
        this.cameras.main.setSize(width, height);
        if (this.worldCamera) this.worldCamera.setSize(width, height);
        if (this.uiCamera) this.uiCamera.setSize(width, height);

        // Resize Background Image
        const bg = this.backgroundLayer.getAt(0) as Phaser.GameObjects.Image;
        if (bg) {
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale).setPosition(width / 2, height / 2);
        }

        // Re-center UI elements
        this.uiLayer.removeAll();
        this.createUI();
    }

    private createBookBackground() {
        const { width, height } = this.scale;

        // Add the book background centered
        const bg = this.add.image(width / 2, height / 2, 'book_bg');
        bg.setOrigin(0.5);

        // Scale to cover screen (cover mode)
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);

        this.backgroundLayer.add(bg);
    }

    private createUI() {
        const { width, height } = this.scale;

        // Dark Header Bar
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x000000, 0.8);
        headerBg.fillRect(0, 0, width, 140);
        this.uiLayer.add(headerBg);

        // Title
        const title = this.add.text(width / 2, 50, 'Book of Ascension', EnhancedStyleHelpers.createTextStyle({
            size: 'massive',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        })).setOrigin(0.5);
        title.setStroke('#000000', 4);
        title.setShadow(0, 0, EnhancedDesignSystem.colors.accent, 10, true, true);
        this.uiLayer.add(title);

        // Skill Points Display
        const sp = this.registry.get('skillPoints') || 0;
        this.skillPointsText = this.add.text(width / 2, 100, `Skill Points: ${sp}`, EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: '#ffffff',
            fontFamily: 'primary'
        })).setOrigin(0.5);
        this.uiLayer.add(this.skillPointsText);

        // Footer Bar
        const footerBg = this.add.graphics();
        footerBg.fillStyle(0x000000, 0.8);
        footerBg.fillRect(0, height - 80, width, 80);
        this.uiLayer.add(footerBg);

        // Close/Return Hint
        const hint = this.add.text(width / 2, height - 40, 'Press [T] to Return', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: '#aaaaaa',
            fontFamily: 'secondary'
        })).setOrigin(0.5);
        this.uiLayer.add(hint);

        // DOM Tooltip (Screen Space - handled by DOM overlay, unaffected by cameras)
        this.tooltip = this.add.dom(0, 0, 'div');
        this.tooltip.setOrigin(0, 0);
        this.tooltip.setVisible(false);
    }

    private createSkillTree() {
        const skillArchetype = playerArchetypeToSkillArchetype[this.currentArchetype];
        if (!skillArchetype || !skillTreeData[skillArchetype]) {
            console.error("Invalid archetype for skill tree:", skillArchetype);
            return;
        }

        const tree = skillTreeData[skillArchetype];
        const pathKeys = Object.keys(tree.paths);
        const spacing = 400;

        pathKeys.forEach((key, index) => {
            const path = tree.paths[key];
            const xOffset = (index - (pathKeys.length - 1) / 2) * spacing;
            const yOffset = 0; // Center vertically at 0

            // 1. Create Path Title
            const title = this.add.text(xOffset, yOffset - 250, path.name, EnhancedStyleHelpers.createTextStyle({
                size: 'xl',
                color: EnhancedDesignSystem.colors.accent,
                fontFamily: 'primary',
                fontStyle: 'bold'
            })).setOrigin(0.5);
            title.setShadow(0, 0, '#000000', 4);
            this.nodeLayer.add(title);

            // 2. Create Nodes
            path.skills.forEach((skill: Skill) => {
                const worldX = xOffset + skill.x;
                const worldY = yOffset + skill.y;

                const node = new SkillNode({
                    scene: this,
                    skill: skill,
                    x: worldX,
                    y: worldY,
                    layer: this.nodeLayer,
                    isUnlocked: !!this.unlockedSkills.get(skill.name),
                    isAvailable: this.checkAvailability(skill),
                    onUnlock: this.handleUnlockRequest.bind(this)
                });

                this.nodes.set(skill.name, node);

                // Add Hover for Tooltip
                node.on('pointerover', () => this.showTooltip(skill, node));
                node.on('pointerout', () => this.hideTooltip());
            });
        });

        // 3. Draw Connections once nodes exist
        this.drawConnections();
    }

    private checkAvailability(skill: Skill): boolean {
        if (skill.prerequisites.length === 0) return true;
        for (const req of skill.prerequisites) {
            if (!this.unlockedSkills.get(req)) return false;
        }
        return true;
    }

    private drawConnections() {
        // Clear previous connection text
        if (this.connectionGroup) {
            this.connectionGroup.clear(true, true);
        }

        // Magic Runes (Futhark and others)
        const runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

        this.nodes.forEach((node, skillName) => {
            const skill = (node as any).skill as Skill;

            if (skill.prerequisites) {
                skill.prerequisites.forEach(reqName => {
                    const reqNode = this.nodes.get(reqName);
                    if (reqNode) {
                        const start = new Phaser.Math.Vector2(reqNode.x, reqNode.y);
                        const end = new Phaser.Math.Vector2(node.x, node.y);

                        const isUnlocked = this.unlockedSkills.get(skillName);
                        //const isPrereqUnlocked = this.unlockedSkills.get(reqName);

                        let color = '#444444';
                        let alpha = 0.3;
                        let glow = false;

                        if (isUnlocked) {
                            color = EnhancedDesignSystem.colors.accent; // Gold
                            alpha = 1;
                            glow = true;
                        } else if (this.unlockedSkills.get(reqName)) {
                            color = '#888888'; // Grey but visible
                            alpha = 0.6;
                        }

                        // Cubic Bezier
                        const controlY = Math.abs(end.y - start.y) * 0.5;
                        const p1 = new Phaser.Math.Vector2(start.x, start.y + controlY);
                        const p2 = new Phaser.Math.Vector2(end.x, end.y - controlY);
                        const curve = new Phaser.Curves.CubicBezier(start, p1, p2, end);

                        // Calculate points for text placement
                        // Spacing depends on length, but constant spacing looks best for text
                        const length = curve.getLength();
                        const spacing = 20; // Space between runes
                        const count = Math.floor(length / spacing);
                        const points = curve.getSpacedPoints(count);

                        for (let i = 0; i < points.length; i++) {
                            // Skip first/last few to avoid overlapping nodes
                            if (i < 2 || i > points.length - 2) continue;

                            const point = points[i];
                            const floatIdx = i / points.length;

                            // Get tangent for rotation
                            const tangent = curve.getTangent(floatIdx);
                            const angle = tangent.angle(); // Radians

                            // Pick random rune deterministically based on position (so it doesn't flicker on redraw)
                            const charIndex = (skillName.length + i) % runes.length;
                            const char = runes[charIndex];

                            const runeText = this.add.text(point.x, point.y, char, {
                                fontFamily: 'Uncial Antiqua, "Times New Roman", serif',
                                fontSize: '18px',
                                color: color,
                                stroke: '#000000',
                                strokeThickness: 3
                            });

                            runeText.setOrigin(0.5);
                            runeText.setRotation(angle);
                            runeText.setAlpha(alpha);

                            // Always add a base glow for visibility
                            runeText.setShadow(0, 0, color, glow ? 12 : 4);

                            // Pulsating glow for unlocked paths
                            if (glow) {
                                // Stagger the animation start for a "flowing" effect
                                const delay = i * 50;
                                this.tweens.add({
                                    targets: runeText,
                                    alpha: { from: 0.7, to: 1.0 },
                                    duration: 800,
                                    delay: delay,
                                    yoyo: true,
                                    repeat: -1,
                                    ease: 'Sine.easeInOut'
                                });
                            }

                            this.connectionLayer.add(runeText);
                            this.connectionGroup.add(runeText);
                        }
                    }
                });
            }
        });
    }

    private centerCameraOnTree() {
        if (this.nodes.size === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            if (node.x < minX) minX = node.x;
            if (node.x > maxX) maxX = node.x;
            if (node.y < minY) minY = node.y;
            if (node.y > maxY) maxY = node.y;
        });

        // Center the camera on the bounding box center
        this.worldCamera.centerOn((minX + maxX) / 2, (minY + maxY) / 2);
    }

    private handleUnlockRequest(skill: Skill) {
        let points = this.registry.get('skillPoints') || 0;

        if (points > 0) {
            // Deduct Point
            points--;
            this.registry.set('skillPoints', points);
            this.skillPointsText.setText(`Skill Points: ${points}`);

            // Unlock Skill
            this.unlockedSkills.set(skill.name, true);
            this.registry.set('unlockedSkills', this.unlockedSkills);

            // Update Nodes visually
            this.nodes.forEach((node, _) => {
                const nodeSkill = (node as any).skill as Skill;
                const isUnlocked = !!this.unlockedSkills.get(nodeSkill.name);
                const isAvailable = this.checkAvailability(nodeSkill);
                node.updateState(isUnlocked, isAvailable);
            });

            // Re-draw connections
            this.drawConnections();
        } else {
            // FEEDBACK: Not enough points
            const node = this.nodes.get(skill.name);
            if (node) {
                // 1. Shake the node
                this.tweens.add({
                    targets: (node as any).background, // Access private prop (or expose it)
                    x: node.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        (node as any).background.x = node.x;
                    }
                });

                // 2. Show floating text
                this.showFeedbackText(node.x, node.y, "Not Enough Points!");
            }
        }
    }

    private showFeedbackText(x: number, y: number, message: string) {
        const text = this.add.text(x, y - 50, message, {
            fontSize: '24px',
            color: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.nodeLayer.add(text);

        this.tweens.add({
            targets: text,
            y: y - 100,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    private showTooltip(skill: Skill, node: SkillNode) {
        // Project world position to screen position using World Camera
        const camera = this.worldCamera;
        const worldX = node.x;
        const worldY = node.y;

        // Manual projection:
        const screenX = (worldX - camera.worldView.x) * camera.zoom;
        const screenY = (worldY - camera.worldView.y) * camera.zoom;

        // Tooltip dimensions (approx)
        const tooltipWidth = 320;
        const padding = 20;

        let finalX = screenX + 80 * camera.zoom;
        let finalY = screenY;

        // CLAMP: Check right edge
        if (finalX + tooltipWidth > this.scale.width) {
            // Flip to left side
            finalX = screenX - tooltipWidth - padding * camera.zoom;
        }

        let statusColor = '#aaaaaa';
        let statusText = 'Locked';
        const isUnlocked = this.unlockedSkills.get(skill.name);
        const isAvailable = this.checkAvailability(skill);

        if (isUnlocked) {
            statusColor = '#00ff00';
            statusText = 'UNLOCKED';
        } else if (isAvailable) {
            statusColor = '#ffaa00';
            statusText = 'Cost: 1 Point';
        } else {
            statusColor = '#ff0000';
            statusText = 'Locked';
        }

        const accent = EnhancedDesignSystem.colors.accent;

        this.tooltip.setHTML(`
            <div style="background: rgba(10, 10, 20, 0.95); border: 2px solid ${accent}; padding: 16px; border-radius: 12px; width: 280px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: white; box-shadow: 0 4px 20px rgba(0,0,0,0.5); pointer-events: none;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div style="font-size: 24px; margin-right: 10px;">${skill.icon}</div>
                    <div>
                        <h3 style="margin: 0; color: ${EnhancedDesignSystem.colors.accentLight}; font-size: 18px; font-weight: bold;">${skill.name}</h3>
                        <div style="font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px;">${skill.type}</div>
                    </div>
                </div>
                <div style="font-size: 14px; line-height: 1.5; color: #dddddd; margin-bottom: 12px; border-top: 1px solid #444; padding-top: 8px;">${skill.description}</div>
                <div style="font-size: 12px; font-weight: bold; color: ${statusColor}; text-align: right;">
                    ${statusText}
                </div>
            </div>
        `);

        this.tooltip.setPosition(finalX, finalY);
        this.tooltip.setVisible(true);
        this.tooltip.setAlpha(0);
        this.tooltip.setScale(0.8);

        this.tweens.killTweensOf(this.tooltip);
        this.tweens.add({
            targets: this.tooltip,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Back.out'
        });
    }

    private hideTooltip() {
        this.tooltip.setVisible(false);
    }

    private setupInput() {
        // Panning (Drag Background)
        this.input.on('pointerdown', (pointer: Input.Pointer) => {
            const over = this.input.hitTestPointer(pointer);
            if (over.length === 0) {
                this.isDragging = true;
                this.dragOrigin.set(pointer.x, pointer.y);
            }
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        this.input.on('pointermove', (pointer: Input.Pointer) => {
            if (this.isDragging) {
                const dx = (pointer.x - this.dragOrigin.x) / this.zoomLevel;
                const dy = (pointer.y - this.dragOrigin.y) / this.zoomLevel;

                this.worldCamera.scrollX -= dx;
                this.worldCamera.scrollY -= dy;

                this.dragOrigin.set(pointer.x, pointer.y);
            }
        });

        // Zooming
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
            const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Phaser.Math.Clamp(this.zoomLevel + zoomDelta, this.minZoom, this.maxZoom);

            this.zoomLevel = newZoom;
            this.worldCamera.zoomTo(newZoom, 200, 'Power2');
        });

        // Toggle Key (Hardened)
        this.input.keyboard?.on('keydown-T', () => {
            // Robust Debounce
            const now = this.time.now;
            if (now - this.lastToggleTime < 500) return;
            this.lastToggleTime = now;

            console.log("Closing Skill Tree via 'T'");

            // Resume Game (it was properly paused) then stop this overlay scene
            this.scene.resume('Game');
            this.scene.stop();
        });
    }

    update() {
        // Continuous Rotation & Parallax
        const time = this.time.now / 1000;

        // Rotation Speed calculation
        // Zoom < 1 (Zoomed Out) -> Faster Rotation
        const zoomFactor = 1 / Math.max(this.zoomLevel, 0.1);
        // Increased base speed from 0.05 to 0.2 for smoother, noticeable motion
        const baseRotation = time * 0.2 * zoomFactor;

        /*
        this.starLayers.forEach((layer, index) => {
            // 1. Rotation: Rotate layers at different speeds/directions for depth
            const dir = index % 2 === 0 ? 1 : -1; // Alternate direction
            //layer.sprite.setRotation(baseRotation * layer.speed * dir);

            // 2. Parallax: Scroll tile position based on world camera
            // This gives the "Panning" effect the user liked
            //layer.sprite.tilePositionX = this.worldCamera.scrollX * (layer.speed * 0.5);
            //layer.sprite.tilePositionY = this.worldCamera.scrollY * (layer.speed * 0.5);
        });
        */
    }
}
