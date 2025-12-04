import { Scene, GameObjects, Input, Geom } from 'phaser';
import { skillTreeData, Skill } from '../data/SkillTreeData';
import { playerArchetypeToSkillArchetype, PlayerArchetypeType } from '../objects/PlayerArchetype';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';

export class SkillTreeScene extends Scene {
    private treeContainer: GameObjects.Container;
    private uiLayer: GameObjects.Container;
    private background: GameObjects.TileSprite; // Using TileSprite for parallax potential
    private skillPointsText: GameObjects.Text;
    private tooltip: GameObjects.DOMElement;
    
    // State
    private currentArchetype: PlayerArchetypeType;
    private unlockedSkills: Map<string, boolean>; // Synchronized with Registry
    
    // Camera Control
    private isDragging: boolean = false;
    private dragOrigin: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private zoomLevel: number = 1.0;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    init(data: { archetype: PlayerArchetypeType }) {
        this.currentArchetype = data.archetype || PlayerArchetypeType.TANK;
        console.log('SkillTreeScene initialized with archetype:', this.currentArchetype);
    }

    create() {
        // Sync state from registry
        if (!this.registry.has('unlockedSkills')) {
            this.registry.set('unlockedSkills', new Map<string, boolean>());
        }
        this.unlockedSkills = this.registry.get('unlockedSkills');

        // Setup Camera
        this.cameras.main.setBackgroundColor('#000000');
        
        // Background (Parallax)
        this.createBackground();

        // Tree Layer (World Space)
        this.treeContainer = this.add.container(0, 0);
        this.createSkillTree();

        // UI Layer (Screen Space - Static)
        this.uiLayer = this.add.container(0, 0).setScrollFactor(0);
        this.createUI();

        // Input Handling
        this.setupInput();

        // Initial Position (Center Tree)
        this.cameras.main.centerOn(0, 0);
    }

    private createBackground() {
        // Create a starry background texture if not exists or use existing
        const width = this.scale.width;
        const height = this.scale.height;
        
        // Simple starry background
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(0x050510, 1);
        graphics.fillRect(0, 0, 1024, 1024);
        graphics.fillStyle(0xffffff, 0.8);
        for (let i = 0; i < 500; i++) {
            graphics.fillCircle(Math.random() * 1024, Math.random() * 1024, Math.random() * 1.5);
        }
        graphics.generateTexture('starfield', 1024, 1024);
        
        this.background = this.add.tileSprite(0, 0, width, height, 'starfield')
            .setOrigin(0.5)
            .setScrollFactor(0.1) // Move slower than foreground
            .setDepth(-10);
    }
    
    private parseColor(colorStr: string): number {
        return parseInt(colorStr.replace('#', '0x'), 16);
    }

    private createUI() {
        const { width, height } = this.scale;
        
        // Title
        const title = this.add.text(width / 2, 50, 'Book of Ascension', EnhancedStyleHelpers.createTextStyle({
            size: 'massive',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        })).setOrigin(0.5);
        title.setStroke('#000000', 4);
        this.uiLayer.add(title);

        // Skill Points
        // We need to get skill points from Registry or Player data passed in
        // Assuming Registry has 'skillPoints'
        const sp = this.registry.get('skillPoints') || 0;
        this.skillPointsText = this.add.text(width / 2, 100, `Skill Points: ${sp}`, EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: '#ffffff',
            fontFamily: 'primary'
        })).setOrigin(0.5);
        this.uiLayer.add(this.skillPointsText);

        // Close/Return Hint
        const hint = this.add.text(width / 2, height - 50, 'Press [T] to Return', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: '#aaaaaa',
            fontFamily: 'secondary'
        })).setOrigin(0.5);
        this.uiLayer.add(hint);

        // DOM Tooltip (Hidden by default)
        this.tooltip = this.add.dom(0, 0, 'div');
        this.tooltip.setOrigin(0, 0);
        this.tooltip.setVisible(false);
        // We don't add DOM elements to Containers (Phaser limitation usually), so we manage it separately in screen space
    }

    private createSkillTree() {
        const skillArchetype = playerArchetypeToSkillArchetype[this.currentArchetype];
        if (!skillArchetype || !skillTreeData[skillArchetype]) {
            console.error("Invalid archetype for skill tree:", skillArchetype);
            return;
        }

        const tree = skillTreeData[skillArchetype];
        
        // Calculate offsets to center paths
        const pathKeys = Object.keys(tree.paths);
        const spacing = 500; // Space between vertical paths
        
        pathKeys.forEach((key, index) => {
            const path = tree.paths[key];
            const xOffset = (index - (pathKeys.length - 1) / 2) * spacing;
            this.createPath(path, xOffset, 0);
        });
    }

    private createPath(path: any, offsetX: number, offsetY: number) {
        const pathContainer = this.add.container(offsetX, offsetY);
        this.treeContainer.add(pathContainer);

        // Path Title
        const title = this.add.text(0, -100, path.name, EnhancedStyleHelpers.createTextStyle({
            size: 'xl',
            color: EnhancedDesignSystem.colors.accentLight,
            fontFamily: 'primary'
        })).setOrigin(0.5);
        pathContainer.add(title);

        // Connections (Bezier)
        const graphics = this.add.graphics();
        pathContainer.add(graphics);
        pathContainer.sendToBack(graphics);

        // Nodes
        const nodeMap = new Map<string, GameObjects.Container>();
        
        path.skills.forEach((skill: Skill) => {
            const node = this.createNode(skill);
            node.setPosition(skill.x, skill.y);
            pathContainer.add(node);
            nodeMap.set(skill.name, node);
        });

        // Draw Connections
        graphics.lineStyle(4, 0x444444, 1);
        path.skills.forEach((skill: Skill) => {
            if (skill.prerequisites) {
                const toNode = nodeMap.get(skill.name);
                skill.prerequisites.forEach(req => {
                    const fromNode = nodeMap.get(req);
                    if (fromNode && toNode) {
                        // Check if unlocked for color
                        const isUnlocked = this.unlockedSkills.get(skill.name);
                        if (isUnlocked) {
                            graphics.lineStyle(4, this.parseColor(EnhancedDesignSystem.colors.accent), 1);
                        } else {
                            graphics.lineStyle(4, 0x444444, 1);
                        }
                        
                        // Bezier Curve
                        const p0 = new Phaser.Math.Vector2(fromNode.x, fromNode.y);
                        const p1 = new Phaser.Math.Vector2(fromNode.x, fromNode.y + 50);
                        const p2 = new Phaser.Math.Vector2(toNode.x, toNode.y - 50);
                        const p3 = new Phaser.Math.Vector2(toNode.x, toNode.y);
                        
                        const curve = new Phaser.Curves.CubicBezier(p0, p1, p2, p3);
                        curve.draw(graphics);
                    }
                });
            }
        });
    }

    private createNode(skill: Skill): GameObjects.Container {
        const container = this.add.container(0, 0);
        const isUnlocked = this.unlockedSkills.get(skill.name);

        // Diamond Shape
        const bg = this.add.graphics();
        const size = 40;
        const color = isUnlocked ? this.parseColor(EnhancedDesignSystem.colors.accent) : 0x222222;
        const stroke = isUnlocked ? this.parseColor(EnhancedDesignSystem.colors.accentLight) : 0x555555;
        
        bg.fillStyle(color, 1);
        bg.fillPoints([
            {x: 0, y: -size}, {x: size, y: 0}, {x: 0, y: size}, {x: -size, y: 0}
        ]);
        bg.lineStyle(3, stroke, 1);
        bg.strokePoints([
            {x: 0, y: -size}, {x: size, y: 0}, {x: 0, y: size}, {x: -size, y: 0}
        ], true);
        
        container.add(bg);

        // Icon
        const icon = this.add.text(0, 0, skill.icon, { fontSize: '32px' }).setOrigin(0.5);
        container.add(icon);

        // Interaction
        const shape = new Geom.Polygon([
            0, -size, size, 0, 0, size, -size, 0
        ]);
        container.setInteractive(shape, Geom.Polygon.Contains);

        container.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
            
            // Add Glow
            // @ts-ignore - Phaser types might lag behind 3.60+ FX
            const fx = container.postFX;
            if (fx) {
                fx.clear();
                fx.addGlow(this.parseColor(EnhancedDesignSystem.colors.accent), 4, 0.5, false, 0.1, 10);
            }
            
            // Show DOM Tooltip
            const worldX = container.x + container.parentContainer.x + this.treeContainer.x;
            const worldY = container.y + container.parentContainer.y + this.treeContainer.y;
            
            const camera = this.cameras.main;
            const screenX = (worldX - camera.worldView.x) * camera.zoom;
            const screenY = (worldY - camera.worldView.y) * camera.zoom;
            
            // Offset by UI layer position if needed (usually 0,0)
            // Add offset to not cover the node
            const x = screenX + 50; 
            const y = screenY;

            this.tooltip.setPosition(x, y);
            this.tooltip.setHTML(`
                <div style="background: rgba(0, 0, 0, 0.9); border: 2px solid ${EnhancedDesignSystem.colors.accent}; padding: 12px; border-radius: 8px; width: 250px; font-family: 'Courier New', monospace; color: white; pointer-events: none;">
                    <h3 style="margin: 0 0 8px 0; color: ${EnhancedDesignSystem.colors.accentLight}; font-size: 18px;">${skill.name}</h3>
                    <div style="font-size: 12px; color: #aaaaaa; margin-bottom: 8px;">${skill.type}</div>
                    <div style="font-size: 14px; line-height: 1.4;">${skill.description}</div>
                    <div style="margin-top: 8px; font-size: 12px; color: ${isUnlocked ? '#00ff00' : '#ffaa00'};">
                        ${isUnlocked ? 'UNLOCKED' : 'Cost: 1 Point'}
                    </div>
                </div>
            `);
            this.tooltip.setVisible(true);
            this.tooltip.setScale(0);
            this.tooltip.setAlpha(1);
            
            this.tweens.add({ 
                targets: this.tooltip, 
                scaleX: 1, 
                scaleY: 1, 
                duration: 300, 
                ease: 'Back.out' 
            });
        });

        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            
            // Remove Glow
            // @ts-ignore
            const fx = container.postFX;
            if (fx) {
                fx.clear();
            }

            this.tooltip.setVisible(false);
        });

        container.on('pointerdown', () => {
            this.attemptUnlock(skill, bg);
        });

        return container;
    }

    private attemptUnlock(skill: Skill, graphics: GameObjects.Graphics) {
        if (this.unlockedSkills.get(skill.name)) return;

        // Check prereqs
        let canUnlock = true;
        if (skill.prerequisites.length > 0) {
            for (const req of skill.prerequisites) {
                if (!this.unlockedSkills.get(req)) {
                    canUnlock = false;
                    break;
                }
            }
        }

        // Check points
        let points = this.registry.get('skillPoints') || 0;
        if (canUnlock && points > 0) {
            points--;
            this.registry.set('skillPoints', points);
            this.unlockedSkills.set(skill.name, true);
            this.registry.set('unlockedSkills', this.unlockedSkills); // Trigger events
            
            // Update Visuals
            // Re-draw node
            const size = 40;
            graphics.clear();
            graphics.fillStyle(this.parseColor(EnhancedDesignSystem.colors.accent), 1);
            graphics.fillPoints([
                {x: 0, y: -size}, {x: size, y: 0}, {x: 0, y: size}, {x: -size, y: 0}
            ]);
            graphics.lineStyle(3, this.parseColor(EnhancedDesignSystem.colors.accentLight), 1);
            graphics.strokePoints([
                {x: 0, y: -size}, {x: size, y: 0}, {x: 0, y: size}, {x: -size, y: 0}
            ], true);
            
            // Update UI
            this.skillPointsText.setText(`Skill Points: ${points}`);
            
            // Particles
            // ... particle logic
        }
    }

    private setupInput() {
        // Panning
        this.input.on('pointerdown', (pointer: Input.Pointer) => {
            this.isDragging = true;
            this.dragOrigin.set(pointer.x, pointer.y);
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });

        this.input.on('pointermove', (pointer: Input.Pointer) => {
            if (this.isDragging) {
                const dx = (pointer.x - this.dragOrigin.x) / this.zoomLevel;
                const dy = (pointer.y - this.dragOrigin.y) / this.zoomLevel;
                
                this.cameras.main.scrollX -= dx;
                this.cameras.main.scrollY -= dy;
                
                this.dragOrigin.set(pointer.x, pointer.y);
                
                // Parallax
                this.background.tilePositionX = this.cameras.main.scrollX * 0.5;
                this.background.tilePositionY = this.cameras.main.scrollY * 0.5;
            }
        });

        // Zooming
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
            const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Phaser.Math.Clamp(this.zoomLevel + zoomDelta, 0.5, 2.0);
            
            this.zoomLevel = newZoom;
            this.cameras.main.zoomTo(newZoom, 100);
        });

        // Close
        this.input.keyboard?.on('keydown-T', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}
