import * as Phaser from 'phaser';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from './EnhancedDesignSystem';
import { skillTreeData, SkillTree, Skill } from '../game/SkillTreeData';
import { Player } from '../game/Player';
import { playerArchetypeToSkillArchetype } from '../game/PlayerArchetype';

export class SkillTreeUI {
    private scene: Phaser.Scene;
    public container: Phaser.GameObjects.Container;
    private overlay: Phaser.GameObjects.Rectangle;
    private skillTreesContainer: Phaser.GameObjects.Container;
    private tooltip: Phaser.GameObjects.Container;
    private tooltipBg: Phaser.GameObjects.Graphics;
    private tooltipName: Phaser.GameObjects.Text;
    private tooltipType: Phaser.GameObjects.Text;
    private tooltipDesc: Phaser.GameObjects.Text;
    private skillPointsText: Phaser.GameObjects.Text;
    private player: Player;

    private unlockedSkills: Map<string, boolean> = new Map();

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.player.setSkillTreeUI(this); // Register UI with player
        this.container = this.scene.add.container(0, 0);
        this.skillTreesContainer = this.scene.add.container(0, 0);
        this.tooltip = this.scene.add.container(0, 0);
        this.overlay = this.scene.add.rectangle(0, 0, 0, 0);
        this.create();
    }

    public getUnlockedSkills(): Map<string, boolean> {
        return this.unlockedSkills;
    }

    private create(): void {
        const { width, height } = this.scene.scale;
        this.container.setPosition(width / 2, height / 2);
        this.container.setDepth(EnhancedDesignSystem.zIndex.modal);
        this.container.setScrollFactor(0);
        this.container.setScale(1 / this.scene.cameras.main.zoom);

        const starrySky = this.createStarrySkyBackground(width, height);
        this.container.add(starrySky);
        this.container.sendToBack(starrySky);

        const title = this.scene.add.text(0, -height / 2 + 100, 'Book of Ascension', EnhancedStyleHelpers.createTextStyle({
            size: 'massive',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary',
            fontStyle: 'bold'
        })).setOrigin(0.5);
        title.setStroke('#000000', 4);
        title.setShadow(0, 0, EnhancedDesignSystem.colors.accent, 10, true, true);
        this.container.add(title);

        // Skill Points Display
        this.skillPointsText = this.scene.add.text(0, -height / 2 + 150, `Skill Points: ${this.player.getSkillPoints()}`, EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: '#ffffff',
            fontFamily: 'primary'
        })).setOrigin(0.5);
        this.container.add(this.skillPointsText);

        this.container.add(this.skillTreesContainer);
        this.createSkillTrees();

        this.createTooltip();

        this.container.setVisible(false);
    }

    public updateSkillPointsDisplay(): void {
        if (this.skillPointsText) {
            this.skillPointsText.setText(`Skill Points: ${this.player.getSkillPoints()}`);
        }
    }

    private createStarrySkyBackground(width: number, height: number): Phaser.GameObjects.Graphics {
        const graphics = this.scene.add.graphics();

        // Black background
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(-width / 2, -height / 2, width, height);

        // White dots for stars
        graphics.fillStyle(0xffffff, 1);
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * width - width / 2;
            const y = Math.random() * height - height / 2;
            const radius = Math.random() * 1.5;
            graphics.fillCircle(x, y, radius);
        }

        return graphics;
    }

    private createSkillTrees(): void {
        const { width } = this.scene.scale;
        const playerArchetype = this.player.getArchetype().type;
        const skillArchetype = playerArchetypeToSkillArchetype[playerArchetype];

        if (!skillArchetype) {
            console.error(`No skill archetype found for player archetype: ${playerArchetype}`);
            return;
        }

        // Deep copy the data to ensure we don't modify the global source
        const tree = JSON.parse(JSON.stringify(skillTreeData[skillArchetype]));
        const treeContainer = this.createSkillTree(tree, 0, 0, width);
        this.skillTreesContainer.add(treeContainer);
    }

    private createSkillTree(tree: SkillTree, x: number, y: number, treeWidth: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);
        const { height } = this.scene.scale;

        // --- Add a background image for the tree (like in your examples) ---
        // You will need to load an asset with key 'tree_background_image' for this
        /*
        const treeBg = this.scene.add.image(0, 100, 'tree_background_image');
        treeBg.setOrigin(0.5, 0.5).setAlpha(0.7);
        container.add(treeBg);
        container.sendToBack(treeBg);
        */

        const title = this.scene.add.text(0, -height / 2 + 180, tree.name, EnhancedStyleHelpers.createTextStyle({
            size: 'xl',
            color: EnhancedDesignSystem.colors.accent,
            fontFamily: 'primary'
        })).setOrigin(0.5);
        container.add(title);

        const pathNames = Object.keys(tree.paths);
        const pathXOffset = treeWidth / 4.5;

        // Position path containers.
        const pathContainerA = this.createSkillPath(tree.paths[pathNames[0]], -pathXOffset, 0);
        const pathContainerB = this.createSkillPath(tree.paths[pathNames[1]], pathXOffset, 0);

        container.add(pathContainerA);
        container.add(pathContainerB);

        return container;
    }

    // --- HEAVILY MODIFIED FUNCTION ---
    private createSkillPath(path: any, x: number, y: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);

        const pathTitle = this.scene.add.text(0, -250, path.name, EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: EnhancedDesignSystem.colors.text,
            fontFamily: 'secondary'
        })).setOrigin(0.5);
        container.add(pathTitle);

        // This Map will store references to the node GameObjects
        const nodes: Map<string, Phaser.GameObjects.Container> = new Map();

        // --- Create Connection Lines ---
        const lineGraphics = this.scene.add.graphics();
        lineGraphics.lineStyle(4, 0x333333, 1);
        container.add(lineGraphics);
        container.sendToBack(lineGraphics);

        // --- 1. Create all skill nodes first ---
        // We now use skill.x and skill.y from your data file
        path.skills.forEach((skill: Skill) => {
            if (skill.x === undefined || skill.y === undefined) {
                console.error(`Skill "${skill.name}" is missing x/y layout properties.`);
                return;
            }
            const skillNode = this.createSkillNode(skill, skill.x, skill.y);
            container.add(skillNode);
            nodes.set(skill.name, skillNode);
        });

        // --- 2. Draw lines between nodes based on prerequisites ---
        path.skills.forEach((skill: Skill) => {
            if (skill.prerequisites && skill.prerequisites.length > 0) {
                const toNode = nodes.get(skill.name);

                skill.prerequisites.forEach((prereqName: string) => {
                    const fromNode = nodes.get(prereqName);
                    if (fromNode && toNode) {
                        lineGraphics.moveTo(fromNode.x, fromNode.y);
                        lineGraphics.lineTo(toNode.x, toNode.y);
                    }
                });
            }
        });
        lineGraphics.strokePath(); // Draw all lines at once

        return container;
    }

    private createSkillNode(skill: Skill, x: number, y: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);
        const isUnlocked = this.unlockedSkills.get(skill.name) || false;

        const bg = this.scene.add.graphics();
        this.drawNode(bg, isUnlocked);
        container.add(bg);

        const icon = this.scene.add.text(0, 0, skill.icon, { fontSize: '28px', align: 'center' }).setOrigin(0.5);
        container.add(icon);

        // Updated size to match the new diamond shape
        container.setSize(70, 70);
        container.setInteractive();

        container.on('pointerover', (pointer: Phaser.Input.Pointer) => {
            this.showTooltip(skill, pointer.x, pointer.y);
            this.scene.tweens.add({ targets: container, scale: 1.1, duration: 150 });
        });
        container.on('pointerout', () => {
            this.hideTooltip();
            this.scene.tweens.add({ targets: container, scale: 1, duration: 150 });
        });
        container.on('pointerdown', () => {
            const worldPos = container.getWorldTransformMatrix();
            this.unlockSkill(skill, bg, worldPos.tx, worldPos.ty);
        });

        return container;
    }

    // --- MODIFIED FUNCTION ---
    private drawNode(graphics: Phaser.GameObjects.Graphics, isUnlocked: boolean): void {
        graphics.clear();

        const colorValue = isUnlocked ? EnhancedDesignSystem.colors.accent : 0x222222;
        const borderColorValue = isUnlocked ? EnhancedDesignSystem.colors.accentLight : 0x444444;

        // --- Draw a diamond (rotated square) ---
        const size = 35; // This is the half-width/height
        const diamond = new Phaser.Geom.Polygon([
            new Phaser.Geom.Point(0, -size),   // Top point
            new Phaser.Geom.Point(size, 0),    // Right point
            new Phaser.Geom.Point(0, size),    // Bottom point
            new Phaser.Geom.Point(-size, 0)    // Left point
        ]);

        graphics.fillStyle(Phaser.Display.Color.ValueToColor(colorValue).color, 1);
        graphics.fillPoints(diamond.points, true);

        graphics.lineStyle(4, Phaser.Display.Color.ValueToColor(borderColorValue).color, 1);
        graphics.strokePoints(diamond.points, true); // true to close the shape
    }

    private unlockSkill(skill: Skill, graphics: Phaser.GameObjects.Graphics, worldX: number, worldY: number): void {
        const isUnlocked = this.unlockedSkills.get(skill.name) || false;
        if (isUnlocked) {
            return;
        }

        const prerequisitesMet = skill.prerequisites.every(prereq => this.unlockedSkills.get(prereq));

        if (prerequisitesMet) {
            if (this.player.spendSkillPoints(1)) {
                this.unlockedSkills.set(skill.name, true);
                this.drawNode(graphics, true);
                this.updateSkillPointsDisplay();

                const particles = this.scene.add.particles(worldX, worldY, 'sparkle', {
                    speed: { min: -100, max: 100 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.5, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 400,
                    frequency: -1
                });
                particles.setDepth(this.container.depth + 1);
                particles.setScrollFactor(0);

                particles.explode(20, 0, 0);

                this.scene.time.delayedCall(1000, () => particles.destroy());
            } else {
                // Not enough points
                console.log("Not enough skill points!");
                // Convert world coordinates to local coordinates relative to the container
                // This ensures the text appears inside the UI and scales correctly
                const scale = this.container.scaleX;
                const localX = (worldX - this.container.x) / scale;
                const localY = (worldY - this.container.y) / scale;

                const text = this.scene.add.text(localX, localY - 50, "Not enough points!", {
                    fontSize: '20px',
                    color: '#ff0000',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);

                this.container.add(text);

                this.scene.tweens.add({
                    targets: text,
                    y: text.y - 30,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => text.destroy()
                });
            }
        } else {
            // Optional: Add some feedback to the user that prerequisites are not met
            console.log(`Cannot unlock ${skill.name}. Prerequisites not met.`);
            // Maybe shake the node or show a message
            this.scene.tweens.add({
                targets: graphics.parentContainer,
                x: '+=5',
                yoyo: true,
                duration: 50,
                repeat: 3
            });
        }
    }

    private createTooltip(): void {
        this.tooltip = this.scene.add.container(0, 0);
        this.tooltip.setDepth(EnhancedDesignSystem.zIndex.overlay);
        this.tooltip.setVisible(false);

        // Initialize reused objects
        this.tooltipBg = this.scene.add.graphics();
        this.tooltipName = this.scene.add.text(0, 0, '', EnhancedStyleHelpers.createTextStyle({ size: 'lg', color: EnhancedDesignSystem.colors.accent })).setOrigin(0.5, 0);
        this.tooltipType = this.scene.add.text(0, 0, '', EnhancedStyleHelpers.createTextStyle({ size: 'sm', color: EnhancedDesignSystem.colors.textMuted })).setOrigin(0.5, 0);
        this.tooltipDesc = this.scene.add.text(0, 0, '', EnhancedStyleHelpers.createTextStyle({ size: 'sm', color: EnhancedDesignSystem.colors.text, wordWrap: { width: 270 } })).setOrigin(0.5, 0);

        this.tooltip.add([this.tooltipBg, this.tooltipName, this.tooltipType, this.tooltipDesc]);
        this.container.add(this.tooltip);
    }

    private showTooltip(skill: Skill, pointerX: number, pointerY: number): void {
        const padding = 15;
        const bgWidth = 300;

        // Update content
        this.tooltipName.setText(skill.name);
        this.tooltipName.setPosition(0, padding);

        this.tooltipType.setText(`[${skill.type}]`);
        this.tooltipType.setPosition(0, this.tooltipName.y + this.tooltipName.height + 5);

        this.tooltipDesc.setText(skill.description);
        this.tooltipDesc.setPosition(0, this.tooltipType.y + this.tooltipType.height + 10);

        // Redraw background
        const bgHeight = this.tooltipDesc.y + this.tooltipDesc.height + padding;
        this.tooltipBg.clear();
        const borderColor = Phaser.Display.Color.ValueToColor(EnhancedDesignSystem.colors.border).color;
        EnhancedStyleHelpers.createBackground(this.tooltipBg, { width: bgWidth, height: bgHeight, color: 0x111111, borderColor: borderColor, borderWidth: 2 });
        this.tooltipBg.setPosition(-bgWidth / 2, 0);

        // Position logic
        const { width, height } = this.scene.scale;

        const localX = pointerX - this.container.x;
        const localY = pointerY - this.container.y;

        let newX = localX;
        let newY = localY + 30;

        const screenLeft = -width / 2;
        const screenRight = width / 2;
        const screenBottom = height / 2;

        if (newX - bgWidth / 2 < screenLeft) {
            newX = screenLeft + bgWidth / 2 + 10;
        }
        if (newX + bgWidth / 2 > screenRight) {
            newX = screenRight - bgWidth / 2 - 10;
        }

        if (newY + bgHeight > screenBottom) {
            newY = localY - bgHeight - 30;
        }

        this.tooltip.setPosition(newX, newY);
        this.tooltip.setVisible(true);
    }

    private hideTooltip(): void {
        this.tooltip.setVisible(false);
    }

    public show(): void {
        this.updateSkillPointsDisplay();
        this.container.setVisible(true);
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    public hide(): void {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
            }
        });
    }



    public hideImmediately(): void {
        this.container.setAlpha(0);
        this.container.setVisible(false);
    }

    public destroy(): void {
        if (this.container) {
            this.container.destroy();
        }
        if (this.overlay) {
            this.overlay.destroy();
        }
        if (this.skillTreesContainer) {
            this.skillTreesContainer.destroy();
        }
        if (this.tooltip) {
            this.tooltip.destroy();
        }
        this.unlockedSkills.clear();
    }
}
