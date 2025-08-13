import { Scene } from 'phaser';
import { PlayerArchetype, PlayerArchetypeType } from './PlayerArchetype';
import { Enemy } from './EnemySystem';

export class Player {
    public sprite: Phaser.GameObjects.Rectangle;
    public archetype: PlayerArchetype;
    private scene: Scene;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private lastAttackTime: number = 0;
    private attackCooldown: number;
    private bullets: Phaser.GameObjects.Rectangle[] = [];
    private healthBar: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private archetypeText: Phaser.GameObjects.Text;

    constructor(scene: Scene, x: number, y: number, archetypeType: PlayerArchetypeType) {
        this.scene = scene;
        this.archetype = new PlayerArchetype(archetypeType);
        this.attackCooldown = 1000 / this.archetype.stats.attackSpeed; // Convert to milliseconds
        
        // Create player sprite (blue rectangle)
        this.sprite = scene.add.rectangle(x, y, 30, 30, 0x0066ff);
        this.sprite.setStrokeStyle(2, 0x003399);
        
        // Create health bar
        this.healthBarBg = scene.add.rectangle(x, y - 40, 40, 6, 0x333333);
        this.healthBar = scene.add.rectangle(x, y - 40, 40, 6, 0x00ff00);
        
        // Create archetype display
        this.archetypeText = scene.add.text(x, y - 60, this.getArchetypeDisplayName(), {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        // Set up input
        this.cursors = scene.input.keyboard!.createCursorKeys();
        this.wasdKeys = scene.input.keyboard!.addKeys('W,S,A,D,SPACE');
        
        // Update archetype position
        this.archetype.updatePosition(x, y);
    }

    private getArchetypeDisplayName(): string {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 'TANK';
            case PlayerArchetypeType.GLASS_CANNON:
                return 'GLASS CANNON';
            case PlayerArchetypeType.EVASIVE:
                return 'EVASIVE';
        }
    }

    private getArchetypeColor(): number {
        switch (this.archetype.type) {
            case PlayerArchetypeType.TANK:
                return 0x4169E1; // Royal Blue
            case PlayerArchetypeType.GLASS_CANNON:
                return 0xFF6347; // Tomato
            case PlayerArchetypeType.EVASIVE:
                return 0x32CD32; // Lime Green
        }
    }

    public update(enemies: Enemy[]): void {
        this.handleMovement();
        this.handleAttack(enemies);
        this.updateBullets();
        this.updateHealthBar();
        this.updateArchetype();
    }

    private handleMovement(): void {
        let velocityX = 0;
        let velocityY = 0;
        
        // Handle input
        if (this.cursors.left?.isDown || this.wasdKeys.A.isDown) {
            velocityX = -this.archetype.stats.speed;
        }
        if (this.cursors.right?.isDown || this.wasdKeys.D.isDown) {
            velocityX = this.archetype.stats.speed;
        }
        if (this.cursors.up?.isDown || this.wasdKeys.W.isDown) {
            velocityY = -this.archetype.stats.speed;
        }
        if (this.cursors.down?.isDown || this.wasdKeys.S.isDown) {
            velocityY = this.archetype.stats.speed;
        }
        
        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // 1/sqrt(2)
            velocityY *= 0.707;
        }
        
        // Apply movement
        const deltaTime = 1/60; // Assuming 60 FPS
        this.sprite.x += velocityX * deltaTime;
        this.sprite.y += velocityY * deltaTime;
        
        // Keep player within screen bounds
        const gameWidth = 1024;
        const gameHeight = 768;
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, 15, gameWidth - 15);
        this.sprite.y = Phaser.Math.Clamp(this.sprite.y, 15, gameHeight - 15);
        
        // Update archetype position
        this.archetype.updatePosition(this.sprite.x, this.sprite.y);
        
        // Update UI elements position
        this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 40);
        this.healthBar.setPosition(this.sprite.x, this.sprite.y - 40);
        this.archetypeText.setPosition(this.sprite.x, this.sprite.y - 60);
    }

    private handleAttack(enemies: Enemy[]): void {
        const currentTime = Date.now();
        
        if ((this.cursors.space?.isDown || this.wasdKeys.SPACE.isDown) && 
            currentTime - this.lastAttackTime > this.attackCooldown) {
            this.attack(enemies);
            this.lastAttackTime = currentTime;
        }
    }

    private attack(enemies: Enemy[]): void {
        const closestEnemy = this.findClosestEnemy(enemies);

        // Create a bullet
        const bullet = this.scene.add.rectangle(
            this.sprite.x, 
            this.sprite.y, 
            8, 
            8, 
            0xffff00
        );
        
        bullet.setData('damage', this.archetype.stats.damage);
        bullet.setData('range', this.archetype.stats.attackRange);
        bullet.setData('startX', this.sprite.x);
        bullet.setData('startY', this.sprite.y);
        bullet.setData('speed', 400); // Bullet speed

        let velocityX = 0;
        let velocityY = -400; // Default to shooting up

        if (closestEnemy) {
            const angle = Phaser.Math.Angle.Between(
                this.sprite.x,
                this.sprite.y,
                closestEnemy.sprite.x,
                closestEnemy.sprite.y
            );
            velocityX = Math.cos(angle) * 400;
            velocityY = Math.sin(angle) * 400;
        }
        
        // For simplicity, bullets go upward. In a real game, you'd aim towards enemies or mouse
        bullet.setData('velocityX', velocityX);
        bullet.setData('velocityY', velocityY);
        
        this.bullets.push(bullet);
    }

    private findClosestEnemy(enemies: Enemy[]): Enemy | null {
        let closestEnemy: Enemy | null = null;
        let minDistance = Infinity;

        enemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                enemy.sprite.x,
                enemy.sprite.y
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    private updateBullets(): void {
        const deltaTime = 1/60;
        
        this.bullets = this.bullets.filter(bullet => {
            if (!bullet.active) return false;
            
            // Move bullet
            const velocityX = bullet.getData('velocityX');
            const velocityY = bullet.getData('velocityY');
            bullet.x += velocityX * deltaTime;
            bullet.y += velocityY * deltaTime;
            
            // Check range
            const startX = bullet.getData('startX');
            const startY = bullet.getData('startY');
            const range = bullet.getData('range');
            const distance = Math.sqrt(
                Math.pow(bullet.x - startX, 2) + Math.pow(bullet.y - startY, 2)
            );
            
            if (distance > range) {
                bullet.destroy();
                return false;
            }
            
            // Check screen bounds
            if (bullet.x < 0 || bullet.x > 1024 || bullet.y < 0 || bullet.y > 768) {
                bullet.destroy();
                return false;
            }
            
            return true;
        });
    }

    private updateHealthBar(): void {
        const healthPercent = this.archetype.getHealthPercentage();
        this.healthBar.scaleX = healthPercent;
        
        // Change color based on health
        if (healthPercent > 0.6) {
            this.healthBar.setFillStyle(0x00ff00); // Green
        } else if (healthPercent > 0.3) {
            this.healthBar.setFillStyle(0xffff00); // Yellow
        } else {
            this.healthBar.setFillStyle(0xff0000); // Red
        }
    }

    private updateArchetype(): void {
        // Update sprite color based on archetype
        this.sprite.setFillStyle(this.getArchetypeColor());
    }

    public checkCollisionWithEnemies(enemies: Enemy[]): void {
        const bulletsToRemove: Phaser.GameObjects.Rectangle[] = [];
        
        enemies.forEach(enemy => {
            // Check bullet-enemy collision
            this.bullets.forEach(bullet => {
                if (bullet.active && this.checkCollision(bullet, enemy.sprite)) {
                    const damage = bullet.getData('damage');
                    const enemyDied = enemy.takeDamage(damage);
                    
                    if (enemyDied) {
                        this.archetype.gainXP(enemy.stats.xpValue);
                    }
                    this.archetype.dealDamage(damage);
                    
                    bullet.destroy();
                    bulletsToRemove.push(bullet);
                }
            });
            
            // Check player-enemy collision
            if (this.checkCollision(this.sprite, enemy.sprite)) {
                this.takeDamage(enemy.stats.damage);
            }
        });
        
        // Remove destroyed bullets
        this.bullets = this.bullets.filter(bullet => !bulletsToRemove.includes(bullet));
    }

    private checkCollision(obj1: Phaser.GameObjects.Rectangle, obj2: Phaser.GameObjects.Rectangle): boolean {
        const bounds1 = obj1.getBounds();
        const bounds2 = obj2.getBounds();
        return Phaser.Geom.Rectangle.Overlaps(bounds1, bounds2);
    }

    public takeDamage(amount: number): void {
        this.archetype.takeDamage(amount);
        
        // Visual feedback - flash red
        const originalColor = this.getArchetypeColor();
        this.sprite.setFillStyle(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.sprite.setFillStyle(originalColor);
        });
    }

    public isAlive(): boolean {
        return this.archetype.currentHealth > 0;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.sprite.x, y: this.sprite.y };
    }

    public getArchetype(): PlayerArchetype {
        return this.archetype;
    }

    public getBullets(): Phaser.GameObjects.Rectangle[] {
        return this.bullets;
    }

    public destroy(): void {
        this.sprite.destroy();
        this.healthBar.destroy();
        this.healthBarBg.destroy();
        this.archetypeText.destroy();
        this.bullets.forEach(bullet => bullet.destroy());
    }
}