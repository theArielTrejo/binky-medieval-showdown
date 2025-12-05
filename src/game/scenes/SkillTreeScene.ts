import { Scene, GameObjects, Input } from 'phaser';
import { skillTreeData, Skill } from '../data/SkillTreeData';
import { playerArchetypeToSkillArchetype, PlayerArchetypeType } from '../objects/PlayerArchetype';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from '../../ui/EnhancedDesignSystem';
import { SkillNode } from '../objects/SkillNode';

export class SkillTreeScene extends Scene {
    // Layers (PDF Recommendation: Flat Scene Graph)
    private backgroundLayer: GameObjects.Layer;
    private connectionLayer: GameObjects.Layer;
    private nodeLayer: GameObjects.Layer;
    private uiLayer: GameObjects.Layer; // Using Layer instead of Container for UI to keep consistent, though Container is fine for UI if not nested deep.

    // Objects
    private connectionsGraphics: GameObjects.Graphics;
    private skillPointsText: GameObjects.Text;
    private tooltip: GameObjects.DOMElement;
    private nodes: Map<string, SkillNode> = new Map();
    
    // State
    private currentArchetype: PlayerArchetypeType;
    private unlockedSkills: Map<string, boolean>; // Synchronized with Registry
    private starLayers: { sprite: Phaser.GameObjects.TileSprite, speedX: number, speedY: number }[] = [];
    
    // Camera Control
    private isDragging: boolean = false;
    private dragOrigin: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private zoomLevel: number = 1.0;
    private minZoom: number = 0.5;
    private maxZoom: number = 2.0;

    // Debounce
    private sceneStartTime: number = 0;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    init(data: { archetype: PlayerArchetypeType }) {
        this.currentArchetype = data.archetype || PlayerArchetypeType.TANK;
        console.log('SkillTreeScene initialized with archetype:', this.currentArchetype);
        this.sceneStartTime = Date.now();
    }

    create() {
        // Sync state from registry
        if (!this.registry.has('unlockedSkills')) {
            this.registry.set('unlockedSkills', new Map<string, boolean>());
        }
        this.unlockedSkills = this.registry.get('unlockedSkills');

        // Setup Camera
        this.cameras.main.setBackgroundColor('#050510');
        
        // 1. Create Layers
        this.backgroundLayer = this.add.layer();
        this.connectionLayer = this.add.layer();
        this.nodeLayer = this.add.layer();
        this.uiLayer = this.add.layer();

        // 2. Background (Parallax)
        this.createParallaxBackground();

        // 3. Connections Graphics (Single Graphics object in the layer)
        this.connectionsGraphics = this.make.graphics({ x: 0, y: 0 });
        this.connectionLayer.add(this.connectionsGraphics);

        // 4. Build Tree
        this.createSkillTree();

        // 5. UI (Screen Space - Static)
        this.createUI();

        // 6. Input Handling
        this.setupInput();

        // Initial Position: Center camera on (0,0) or calculated center
        this.centerCameraOnTree();
        
        // Handle Resize
        this.scale.on('resize', this.handleResize, this);
    }

    private handleResize(gameSize: Phaser.Structs.Size) {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.main.setSize(width, height);
        
        this.starLayers.forEach(layer => {
            layer.sprite.setSize(width, height);
            layer.sprite.setPosition(width / 2, height / 2);
        });
        
        // Re-center UI elements logic would go here if UI was dynamic, 
        // but for now we might need to recreate UI or just update positions of children in uiLayer
        this.uiLayer.removeAll();
        this.createUI();
    }

    private createParallaxBackground() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Define layers: [textureKey, starCount, starSize, alpha, parallaxFactor]
        const layers = [
            { key: 'stars_far_tree', count: 800, size: 1, alpha: 0.4, parallax: 0.2 },
            { key: 'stars_mid_tree', count: 200, size: 2, alpha: 0.7, parallax: 0.5 },
            { key: 'stars_near_tree', count: 50, size: 3, alpha: 1.0, parallax: 0.8 }
        ];

        layers.forEach(layer => {
            // Generate texture if missing
            if (!this.textures.exists(layer.key)) {
                const graphics = this.make.graphics({ x: 0, y: 0 });
                graphics.fillStyle(0xffffff, 1);
                
                for (let i = 0; i < layer.count; i++) {
                    const x = Math.random() * 1024;
                    const y = Math.random() * 1024;
                    const alpha = Math.random() * layer.alpha;
                    graphics.fillStyle(0xffffff, alpha);
                    graphics.fillCircle(x, y, Math.random() * layer.size);
                }
                
                // Add nebula effect to far layer only
                if (layer.key === 'stars_far_tree') {
                    for (let i = 0; i < 10; i++) {
                        graphics.fillStyle(0x4422cc, 0.05);
                        graphics.fillCircle(Math.random() * 1024, Math.random() * 1024, 50 + Math.random() * 100);
                    }
                }
                
                graphics.generateTexture(layer.key, 1024, 1024);
                graphics.destroy();
            }

            // Create TileSprite
            const sprite = this.add.tileSprite(width / 2, height / 2, width, height, layer.key);
            sprite.setOrigin(0.5, 0.5); 
            sprite.setScrollFactor(0); // Fix to camera, we animate tilePosition
            sprite.setDepth(0); // Inside background layer
            
            this.backgroundLayer.add(sprite);
            
            this.starLayers.push({ 
                sprite, 
                speedX: layer.parallax, 
                speedY: layer.parallax 
            });
        });
    }

    private createUI() {
        const { width, height } = this.scale;
        
        // Dark Header Bar
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x000000, 0.8);
        headerBg.fillRect(0, 0, width, 140);
        headerBg.setScrollFactor(0);
        this.uiLayer.add(headerBg);
        
        // Title
        const title = this.add.text(width / 2, 50, 'Book of Ascension', EnhancedStyleHelpers.createTextStyle({
            size: 'massive',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        })).setOrigin(0.5).setScrollFactor(0);
        title.setStroke('#000000', 4);
        title.setShadow(0, 0, EnhancedDesignSystem.colors.accent, 10, true, true);
        this.uiLayer.add(title);

        // Skill Points Display
        const sp = this.registry.get('skillPoints') || 0;
        this.skillPointsText = this.add.text(width / 2, 100, `Skill Points: ${sp}`, EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: '#ffffff',
            fontFamily: 'primary'
        })).setOrigin(0.5).setScrollFactor(0);
        this.uiLayer.add(this.skillPointsText);

        // Footer Bar
        const footerBg = this.add.graphics();
        footerBg.fillStyle(0x000000, 0.8);
        footerBg.fillRect(0, height - 80, width, 80);
        footerBg.setScrollFactor(0);
        this.uiLayer.add(footerBg);

        // Close/Return Hint
        const hint = this.add.text(width / 2, height - 40, 'Press [T] to Return', EnhancedStyleHelpers.createTextStyle({
            size: 'md',
            color: '#aaaaaa',
            fontFamily: 'secondary'
        })).setOrigin(0.5).setScrollFactor(0);
        this.uiLayer.add(hint);

        // DOM Tooltip (Screen Space)
        this.tooltip = this.add.dom(0, 0, 'div');
        this.tooltip.setOrigin(0, 0);
        this.tooltip.setVisible(false);
        this.tooltip.setScrollFactor(0);
        // Note: DOM Elements cannot be added to standard Layers/Containers easily in the same way,
        // but they float above canvas anyway. We keep track of it separately or add to scene.
        // It's already added to scene by `this.add.dom`.
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
            this.nodeLayer.add(title); // Add title to node layer so it moves with world

            // 2. Create Nodes
            path.skills.forEach((skill: Skill) => {
                // Calculate absolute world position
                const worldX = xOffset + skill.x;
                const worldY = yOffset + skill.y;

                const node = new SkillNode({
                    scene: this,
                    skill: skill,
                    x: worldX,
                    y: worldY,
                    isUnlocked: !!this.unlockedSkills.get(skill.name),
                    isAvailable: this.checkAvailability(skill),
                    onUnlock: this.handleUnlockRequest.bind(this)
                });
                
                this.nodeLayer.add(node);
                this.nodes.set(skill.name, node);
                
                // Add Hover for Tooltip (Scene level handler or Node event)
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
        this.connectionsGraphics.clear();
        
        this.nodes.forEach((node, skillName) => {
            // Find dependencies in the Skill Data, but we can also look at the skill object
            // The Skill object inside Node has prerequisites
            // However, SkillNode encapsulates Skill. We might need public access or just iterate data.
            // Let's iterate the node map and look up skill data.
             const skill = (node as any).skill as Skill; // Access private skill via cast or getter
             
             if (skill.prerequisites) {
                 skill.prerequisites.forEach(reqName => {
                     const reqNode = this.nodes.get(reqName);
                     if (reqNode) {
                         const start = new Phaser.Math.Vector2(reqNode.x, reqNode.y);
                         const end = new Phaser.Math.Vector2(node.x, node.y);
                         
                         const isUnlocked = this.unlockedSkills.get(skillName);
                         const isPrereqUnlocked = this.unlockedSkills.get(reqName);
                         
                         // Determine Style
                         let color = 0x444444;
                         let alpha = 0.3;
                         let width = 4;
                         
                         if (isUnlocked) {
                             color = parseInt(EnhancedDesignSystem.colors.accent.replace('#', '0x'));
                             alpha = 1;
                         } else if (isPrereqUnlocked) {
                             color = 0x888888;
                             alpha = 0.6;
                         }

                         // Draw Cubic Bezier
                         // Control points for smooth vertical flow
                         const controlY = Math.abs(end.y - start.y) * 0.5;
                         const p1 = new Phaser.Math.Vector2(start.x, start.y + controlY);
                         const p2 = new Phaser.Math.Vector2(end.x, end.y - controlY);
                         
                         const curve = new Phaser.Curves.CubicBezier(start, p1, p2, end);
                         
                         this.connectionsGraphics.lineStyle(width, color, alpha);
                         curve.draw(this.connectionsGraphics);
                         
                         // Glow for active paths
                         if (isUnlocked) {
                             this.connectionsGraphics.lineStyle(width * 2, color, 0.2);
                             curve.draw(this.connectionsGraphics);
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

        // Add padding
        minX -= 300;
        maxX += 300;
        minY -= 300;
        maxY += 300;

        this.cameras.main.setBounds(minX, minY, maxX - minX, maxY - minY);
        this.cameras.main.centerOn((minX + maxX)/2, (minY + maxY)/2);
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
            this.registry.set('unlockedSkills', this.unlockedSkills); // Trigger global events

            // Update Nodes visually
            this.nodes.forEach((node, _) => {
                // We need to re-check availability for neighbors
                // The most efficient way is to just tell every node to update its state
                const nodeSkill = (node as any).skill as Skill;
                const isUnlocked = !!this.unlockedSkills.get(nodeSkill.name);
                const isAvailable = this.checkAvailability(nodeSkill);
                node.updateState(isUnlocked, isAvailable);
            });

            // Re-draw connections (to light them up)
            this.drawConnections();
        }
    }

    private showTooltip(skill: Skill, node: SkillNode) {
        // Calculate screen position for DOM element
        // Since the node is in world space, we need to project it to screen space
        
        const camera = this.cameras.main;
        
        // World position
        const worldX = node.x;
        const worldY = node.y;
        
        // Screen position
        const screenX = (worldX - camera.worldView.x) * camera.zoom;
        const screenY = (worldY - camera.worldView.y) * camera.zoom;

        const x = screenX + 80 * camera.zoom; // Offset to right
        const y = screenY;

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
        
        this.tooltip.setPosition(x, y);
        this.tooltip.setVisible(true);
        this.tooltip.setAlpha(0);
        this.tooltip.setScale(0.8);
        
        // Use a persistent tween reference if we want to cancel, but simple replace is fine for now
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
        // Since we are using Layers, we can't just listen to "backgroundContainer". 
        // We listen to the Scene Input.
        
        this.input.on('pointerdown', (pointer: Input.Pointer) => {
            // Only start drag if we didn't click a game object that handled the event
            // With Phaser's event propagation, if SkillNode called stopPropagation, we shouldn't get here?
            // Actually, scene.input.on('pointerdown') gets everything unless top-only is set?
            // "If the input event hits a node, it stops there. If it misses all nodes, it falls through to the Background"
            
            // Checking if we clicked a node:
            // The simplest way is to check if the pointer is over any interactive object
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
                
                this.cameras.main.scrollX -= dx;
                this.cameras.main.scrollY -= dy;
                
                this.dragOrigin.set(pointer.x, pointer.y);
                
                // Parallax Effect
                this.starLayers.forEach(layer => {
                    layer.sprite.tilePositionX = this.cameras.main.scrollX * layer.speedX;
                    layer.sprite.tilePositionY = this.cameras.main.scrollY * layer.speedY;
                });
            }
        });

        // Zooming
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number, _deltaZ: number) => {
            const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Phaser.Math.Clamp(this.zoomLevel + zoomDelta, this.minZoom, this.maxZoom);
            
            this.zoomLevel = newZoom;
            this.cameras.main.zoomTo(newZoom, 200, 'Power2');
        });

        // Close
        this.input.keyboard?.on('keydown-T', () => {
            if (Date.now() - this.sceneStartTime < 500) return;
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    update() {
        // Continuous updates if needed
    }
}