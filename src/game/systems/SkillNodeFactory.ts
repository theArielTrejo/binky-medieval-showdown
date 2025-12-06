import { Scene } from 'phaser'; // Fixed imports
import { SkillNode, SkillNodeConfig } from '../objects/SkillNode';

export class SkillNodeFactory {
    // private scene: Scene; // Unused

    constructor(_scene: Scene) {
        // this.scene = scene;
    }

    /**
     * Creates a SkillNode using a declarative configuration object.
     * This follows the "Config-First" pattern recommended for LLM compatibility.
     */
    public createSkillNode(config: SkillNodeConfig): SkillNode {
        // Validation could go here

        // Instantiate the SkillNode
        // SkillNode is no longer a Game Object itself, but a controller that manages Game Objects
        const node = new SkillNode(config);

        return node;
    }

    /**
     * Registers this factory with the GameObjectFactory (this.add.skillNode)
     * allowing for: this.add.skillNode({...})
     */
    static register() {
        if (!Phaser.GameObjects.GameObjectFactory.register) return;

        Phaser.GameObjects.GameObjectFactory.register('skillNode', function (this: Phaser.GameObjects.GameObjectFactory, config: SkillNodeConfig) {
            const factory = new SkillNodeFactory(this.scene);
            return factory.createSkillNode(config);
        });
    }
}
