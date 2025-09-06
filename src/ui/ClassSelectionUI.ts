// Enhanced Class Selection UI with elegant styling
import { Scene } from 'phaser';
import { PlayerArchetypeType } from '../game/PlayerArchetype';
import { EnhancedDesignSystem, EnhancedStyleHelpers } from './EnhancedDesignSystem';

export interface ClassData {
    name: string;
    description: string;
    strengths: string;
    weaknesses: string;
    icon: string;
    color: number;
    archetype: PlayerArchetypeType;
}

export interface ClassSelectionConfig {
    onClassSelected: (archetype: PlayerArchetypeType) => void;
    position?: { x: number; y: number };
    visible?: boolean;
}

export class ClassSelectionUI {
    private scene: Scene;
    private config: ClassSelectionConfig;
    private container: Phaser.GameObjects.Container;
    private selectedClass: PlayerArchetypeType | null = null;
    private classCards: Map<PlayerArchetypeType, Phaser.GameObjects.Container> = new Map();
    private detailsPanel: Phaser.GameObjects.Container;
    private selectButton: Phaser.GameObjects.Container;
    private currentDetailsTween: Phaser.Tweens.Tween | null = null;
    private hoverTimeout: NodeJS.Timeout | null = null;
    private isShowingDetails: boolean = false;
    
    private classData: ClassData[] = [
        {
            name: 'Knight',
            description: 'A noble warrior clad in heavy armor, sworn to protect the realm.',
            strengths: 'Stalwart defense, battlefield control.',
            weaknesses: 'Limited offensive prowess.',
            icon: '⚔️',
            color: 0x4682b4,
            archetype: PlayerArchetypeType.TANK
        },
        {
            name: 'Mage',
            description: 'A master of arcane arts who wields devastating magical forces.',
            strengths: 'Immense magical power.',
            weaknesses: 'Frail constitution.',
            icon: '🔮',
            color: 0x8b0000,
            archetype: PlayerArchetypeType.GLASS_CANNON
        },
        {
            name: 'Rogue',
            description: 'A shadowy assassin who strikes from darkness with deadly precision.',
            strengths: 'Swift movement & lethal strikes.',
            weaknesses: 'Vulnerable in open combat.',
            icon: '🗡️',
            color: 0x228b22,
            archetype: PlayerArchetypeType.EVASIVE
        }
    ];

    constructor(scene: Scene, config: ClassSelectionConfig) {
        this.scene = scene;
        this.config = {
            position: { x: 512, y: 384 },
            visible: true,
            ...config
        };
        
        this.createUI();
    }

    private createUI(): void {
        // Main container
        this.container = this.scene.add.container(this.config.position!.x, this.config.position!.y);
        this.container.setDepth(1000);

        // Background overlay
        const overlay = this.scene.add.rectangle(0, 0, 1024, 768, 0x0a0a0a, 0.95);
        this.container.add(overlay);

        // Title
        const title = this.scene.add.text(0, -300, 'Choose Thy Path', {
            fontSize: '56px',
            color: '#d4af37',
            fontFamily: 'Cinzel, "Old English Text MT", serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Add glow effect to title
        title.setStroke('#000000', 4);
        title.setShadow(0, 0, '#d4af37', 10, true, true);
        this.container.add(title);

        // Create class cards
        this.createClassCards();

        // Create details panel
        this.createDetailsPanel();

        // Create select button
        this.createSelectButton();

        // Set initial visibility
        this.container.setVisible(this.config.visible!);
    }

    private createClassCards(): void {
        const cardSpacing = 220;
        const startX = -(this.classData.length - 1) * cardSpacing / 2;
        const cardY = -100;

        this.classData.forEach((classInfo, index) => {
            const cardX = startX + index * cardSpacing;
            const card = this.createClassCard(classInfo, cardX, cardY);
            this.classCards.set(classInfo.archetype, card);
            this.container.add(card);
        });
    }

    private createClassCard(classInfo: ClassData, x: number, y: number): Phaser.GameObjects.Container {
        const card = this.scene.add.container(x, y);

        // Card background with standardized styling
        const bg = this.scene.add.graphics();
        EnhancedStyleHelpers.createCard(bg, {
            width: 180,
            height: 120
        });
        card.add(bg);

        // Icon (using text as emoji placeholder)
        const icon = this.scene.add.text(0, -20, classInfo.icon, {
            fontSize: '48px'
        }).setOrigin(0.5);
        card.add(icon);

        // Class name with standardized styling
        const name = this.scene.add.text(
            0, 
            25, 
            classInfo.name, 
            EnhancedStyleHelpers.createTextStyle({
                size: 'lg',
                color: EnhancedDesignSystem.colors.text,
                fontFamily: 'primary',
                fontStyle: 'bold'
            })
        ).setOrigin(0.5);
        card.add(name);

        // Make card interactive
        const hitArea = this.scene.add.rectangle(0, 0, 180, 120, 0x000000, 0);
        hitArea.setInteractive();
        card.add(hitArea);

        // Card interactions
        hitArea.on('pointerover', () => {
            this.onCardHover(card, classInfo, true);
        });

        hitArea.on('pointerout', () => {
            if (this.selectedClass !== classInfo.archetype) {
                this.onCardHover(card, classInfo, false);
            }
        });

        // Add pointer move event to ensure consistent hover state
        // Only trigger if we're not already showing details for this card
        hitArea.on('pointermove', () => {
            if (!this.isShowingDetails && this.selectedClass !== classInfo.archetype) {
                this.onCardHover(card, classInfo, true);
            }
        });

        hitArea.on('pointerdown', () => {
            this.selectClass(classInfo.archetype);
        });

        return card;
    }

    private onCardHover(card: Phaser.GameObjects.Container, classInfo: ClassData, isHover: boolean): void {
        const bg = card.getAt(0) as Phaser.GameObjects.Graphics;
        
        // Clear any existing hover timeout
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        if (isHover) {
            // Debounce hover events to prevent rapid firing
            this.hoverTimeout = setTimeout(() => {
                // Hover effect with standardized styling
                EnhancedStyleHelpers.createHoverCard(bg, {
                    width: 180,
                    height: 120,
                    hover: {
                        borderColor: 0xd4af37,
                        scale: 1.05
                    }
                });
                
                card.setScale(1.05);
                
                // Show details with proper state management
                this.showClassDetails(classInfo);
            }, 50); // 50ms debounce delay
        } else {
            // Immediate response for hover out to feel responsive
            EnhancedStyleHelpers.createCard(bg, {
                width: 180,
                height: 120
            });
            
            card.setScale(1);
            
            // Hide details if not selected
            if (this.selectedClass !== classInfo.archetype) {
                this.hideClassDetails();
            }
        }
    }

    private selectClass(archetype: PlayerArchetypeType): void {
        // Deselect previous
        if (this.selectedClass) {
            const prevCard = this.classCards.get(this.selectedClass);
            if (prevCard) {
                const bg = prevCard.getAt(0) as Phaser.GameObjects.Graphics;
                bg.clear();
                bg.fillStyle(0x1a1a1a, 1);
                bg.lineStyle(2, 0x333333, 1);
                bg.fillRoundedRect(-90, -60, 180, 120, 10);
                bg.strokeRoundedRect(-90, -60, 180, 120, 10);
            }
        }

        // Select new
        this.selectedClass = archetype;
        const card = this.classCards.get(archetype);
        if (card) {
            const bg = card.getAt(0) as Phaser.GameObjects.Graphics;
            bg.clear();
            bg.fillStyle(0x1a1a1a, 1);
            bg.lineStyle(2, 0x00ffff, 1);
            bg.fillRoundedRect(-90, -60, 180, 120, 10);
            bg.strokeRoundedRect(-90, -60, 180, 120, 10);
            
            // Add glow effect
            bg.lineStyle(4, 0x00ffff, 0.5);
            bg.strokeRoundedRect(-94, -64, 188, 128, 12);
        }

        // Show class details
        const classInfo = this.classData.find(c => c.archetype === archetype);
        if (classInfo) {
            this.showClassDetails(classInfo);
        }

        // Enable select button
        this.updateSelectButton();
    }

    private createDetailsPanel(): void {
        this.detailsPanel = this.scene.add.container(0, 120);
        
        // Panel background with standardized styling
        const bg = this.scene.add.graphics();
        EnhancedStyleHelpers.createBackground(bg, {
            width: 600,
            height: 120,
            borderColor: 0x333333
        });
        // Adjust position since createBackground draws from 0,0
        bg.setPosition(-300, -60);
        this.detailsPanel.add(bg);

        this.detailsPanel.setAlpha(0);
        this.container.add(this.detailsPanel);
    }

    private showClassDetails(classInfo: ClassData): void {
        // Prevent multiple simultaneous calls
        if (this.isShowingDetails) {
            return;
        }
        
        this.isShowingDetails = true;
        
        // Stop any existing tween to prevent conflicts
        if (this.currentDetailsTween) {
            this.currentDetailsTween.stop();
            this.currentDetailsTween = null;
        }
        
        // Clear existing details safely
        this.clearDetailsContent();

        // Class name with standardized styling
        const title = this.scene.add.text(
            0, 
            -40, 
            classInfo.name, 
            EnhancedStyleHelpers.createTextStyle({
                size: 'xl',
                color: EnhancedDesignSystem.colors.accent,
                fontFamily: 'primary',
                fontStyle: 'bold'
            })
        ).setOrigin(0.5);
        this.detailsPanel.add(title);

        // Description with standardized styling
        const description = this.scene.add.text(
            0, 
            -15, 
            classInfo.description, 
            {
                ...EnhancedStyleHelpers.bodyStyle(),
                align: 'center',
                wordWrap: { width: 550 }
            }
        ).setOrigin(0.5);
        this.detailsPanel.add(description);

        // Strengths with standardized styling
        const strengths = this.scene.add.text(
            -150, 
            15, 
            `Strengths: ${classInfo.strengths}`, 
            EnhancedStyleHelpers.createTextStyle({
                size: 'xs',
                color: EnhancedDesignSystem.colors.success,
                fontFamily: 'primary'
            })
        ).setOrigin(0, 0.5);
        this.detailsPanel.add(strengths);

        // Weaknesses with standardized styling
        const weaknesses = this.scene.add.text(
            -150, 
            35, 
            `Weaknesses: ${classInfo.weaknesses}`, 
            EnhancedStyleHelpers.createTextStyle({
                size: 'xs',
                color: EnhancedDesignSystem.colors.error,
                fontFamily: 'primary'
            })
        ).setOrigin(0, 0.5);
        this.detailsPanel.add(weaknesses);

        // Fade in with proper state management
        this.detailsPanel.setAlpha(0);
        this.currentDetailsTween = this.scene.tweens.add({
            targets: this.detailsPanel,
            alpha: 1,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.currentDetailsTween = null;
                this.isShowingDetails = false;
            },
            onStop: () => {
                this.currentDetailsTween = null;
                this.isShowingDetails = false;
            }
        });
    }
    
    private hideClassDetails(): void {
        // Stop any existing tween
        if (this.currentDetailsTween) {
            this.currentDetailsTween.stop();
            this.currentDetailsTween = null;
        }
        
        // Fade out
        this.currentDetailsTween = this.scene.tweens.add({
            targets: this.detailsPanel,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.clearDetailsContent();
                this.currentDetailsTween = null;
                this.isShowingDetails = false;
            },
            onStop: () => {
                this.currentDetailsTween = null;
                this.isShowingDetails = false;
            }
        });
    }
    
    private clearDetailsContent(): void {
        // Safely clear existing details, keeping the background
        while (this.detailsPanel.length > 1) {
            const child = this.detailsPanel.getAt(1);
            if (child) {
                this.detailsPanel.remove(child);
                child.destroy();
            }
        }
    }

    private createSelectButton(): void {
        this.selectButton = this.scene.add.container(0, 250);

        // Button background with medieval styling
        const bg = this.scene.add.graphics();
        EnhancedStyleHelpers.createMedievalButton(bg, -80, -25, 160, 50, false);
        this.selectButton.add(bg);

        // Button text with medieval styling
        const text = this.scene.add.text(0, 0, 'Choose Path', EnhancedStyleHelpers.createTextStyle({
            size: 'lg',
            color: EnhancedDesignSystem.colors.textDark,
            fontFamily: 'primary',
            fontStyle: 'bold'
        })).setOrigin(0.5);
        this.selectButton.add(text);

        // Initially disabled
        this.selectButton.setAlpha(0.5);
        this.container.add(this.selectButton);
    }

    private updateSelectButton(): void {
        const bg = this.selectButton.getAt(0) as Phaser.GameObjects.Graphics;
        const text = this.selectButton.getAt(1) as Phaser.GameObjects.Text;
        
        if (this.selectedClass) {
            // Enable button with medieval styling
            bg.clear();
            EnhancedStyleHelpers.createMedievalButton(bg, -80, -25, 160, 50, false);
            
            text.setColor(EnhancedDesignSystem.colors.textDark);
            this.selectButton.setAlpha(1);
            
            // Make interactive
            const hitArea = this.scene.add.rectangle(0, 0, 160, 50, 0x000000, 0);
            hitArea.setInteractive();
            this.selectButton.add(hitArea);
            
            hitArea.on('pointerover', () => {
                this.selectButton.setScale(1.05);
                bg.clear();
                EnhancedStyleHelpers.createMedievalButton(bg, -80, -25, 160, 50, true);
            });
            
            hitArea.on('pointerout', () => {
                this.selectButton.setScale(1);
                bg.clear();
                EnhancedStyleHelpers.createMedievalButton(bg, -80, -25, 160, 50, false);
            });
            
            hitArea.on('pointerdown', () => {
                if (this.selectedClass) {
                    this.config.onClassSelected(this.selectedClass);
                }
            });
        }
    }

    public show(): void {
        this.container.setVisible(true);
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
    }

    public hide(): void {
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
            }
        });
    }

    public destroy(): void {
        // Clean up timeouts and tweens
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
        
        if (this.currentDetailsTween) {
            this.currentDetailsTween.stop();
            this.currentDetailsTween = null;
        }
        
        // Clear state
        this.isShowingDetails = false;
        
        // Destroy container and all children
        if (this.container) {
            this.container.destroy();
        }
    }

    public setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }
}