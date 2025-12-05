import { Player } from '../Player';
import { AnimationMapper, CharacterAnimationSet } from '../config/AnimationMappings';
import { PlayerArchetypeType } from '../objects/PlayerArchetype';

export class VisualComponent {
    private player: Player;
    
    public characterVariant: string;
    public characterAnimations: CharacterAnimationSet;
    
    // UI Elements
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;
    
    constructor(player: Player) {
        this.player = player;
        
        // Determine Variant
        this.characterVariant = AnimationMapper.getHardcodedCharacterForArchetype(this.player.archetype.type);
        this.characterAnimations = AnimationMapper.getCharacterAnimations(this.characterVariant);
        
        // Setup UI
        this.setupUI();
    }

    private setupUI(): void {
        const scene = this.player.scene;
        const x = this.player.sprite.x;
        const y = this.player.sprite.y;

        this.healthBarBg = scene.add.rectangle(x, y - 35, 50, 8, 0x000000);
        this.healthBarBg.setDepth(15);
        this.healthBar = scene.add.rectangle(x, y - 35, 48, 6, 0x00ff00);
        this.healthBar.setDepth(16);
        this.archetypeText = scene.add.text(x, y - 50, this.getArchetypeDisplayName(), { fontSize: '12px', color: '#ffffff' });
        this.archetypeText.setOrigin(0.5);
        this.archetypeText.setDepth(17);

        // Listen for updates
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    }
    
    private getArchetypeDisplayName(): string {
        switch (this.player.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 'Knight';
            case PlayerArchetypeType.GLASS_CANNON:
                return 'Magician';
            case PlayerArchetypeType.EVASIVE:
                return 'Ninja';
        }
    }

    public updateHealthBar(): void {
        if (!this.player.sprite.active) return;
        const percent = this.player.archetype.currentHealth / this.player.archetype.stats.maxHealth;
        this.healthBar.width = 48 * percent;
    }

    public postUpdate(): void {
        if (!this.player.sprite.active) return;
        
        const sprite = this.player.sprite;
        this.healthBarBg.setPosition(sprite.x, sprite.y - 35);
        this.healthBar.setPosition(sprite.x, sprite.y - 35);
        this.archetypeText.setPosition(sprite.x, sprite.y - 50);
    }

    public playAnimation(animationName: keyof CharacterAnimationSet): void {
        try {
            const targetAnimation = this.characterAnimations[animationName];
            const sprite = this.player.sprite;

            if (this.player.scene.anims.exists(targetAnimation)) {
                const currentlyPlaying = sprite.anims.currentAnim?.key;

                if (currentlyPlaying !== targetAnimation) {
                    // Ensure the sprite uses the correct base texture before playing
                    const anim = this.player.scene.anims.get(targetAnimation);
                    const atlasKey = anim.frames[0].textureKey;
                    if (atlasKey && sprite.texture.key !== atlasKey) {
                        sprite.setTexture(atlasKey);
                    }

                    sprite.play(targetAnimation, true);
                }
                return;
            }
            console.warn(`❌ Animation not found: ${targetAnimation}`);
        } catch (error) {
            console.warn(`Failed to play animation ${animationName}:`, error);
        }
    }

    public updateSlowEffect(slowMultiplier: number, slowEndTime: number): void {
        if (slowMultiplier < 1.0 && this.player.scene.time.now > slowEndTime) {
            // Reset handled by Player logic usually, but here we just clear tint if needed
             this.player.sprite.clearTint(); 
        }
    }

    public destroy(): void {
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.archetypeText) this.archetypeText.destroy();
        this.player.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.postUpdate, this);
    }
}
