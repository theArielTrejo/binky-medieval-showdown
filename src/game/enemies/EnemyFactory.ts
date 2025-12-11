import { Scene } from 'phaser';
import { EnemyType } from '../types/EnemyTypes';
import { BaseEnemy } from './BaseEnemy';
import { OgreEnemy } from './types/OgreEnemy';
import { ArcherEnemy } from './types/ArcherEnemy';
import { GnollEnemy } from './types/GnollEnemy';
import { SkeletonVikingEnemy } from './types/SkeletonVikingEnemy';
import { SkeletonPirateEnemy } from './types/SkeletonPirateEnemy';
import { ElementalSpiritEnemy } from './types/ElementalSpiritEnemy';
import { LightningMageEnemy } from './types/LightningMageEnemy';
import { FallenAngelEnemy } from './types/FallenAngelEnemy';
import { TombstoneEnemy } from './types/TombstoneEnemy';
import { ZombieEnemy } from './types/ZombieEnemy';

export class EnemyFactory {
    public static create(scene: Scene, x: number, y: number, type: EnemyType): BaseEnemy {
        switch (type) {
            case EnemyType.OGRE:
                return new OgreEnemy(scene, x, y);
            case EnemyType.ARCHER:
                return new ArcherEnemy(scene, x, y);
            case EnemyType.SKELETON_VIKING:
                return new SkeletonVikingEnemy(scene, x, y);
            case EnemyType.SKELETON_PIRATE:
                return new SkeletonPirateEnemy(scene, x, y);
            case EnemyType.ELEMENTAL_SPIRIT:
                return new ElementalSpiritEnemy(scene, x, y);
            case EnemyType.LIGHTNING_MAGE:
                return new LightningMageEnemy(scene, x, y);
            case EnemyType.FALLEN_ANGEL:
                return new FallenAngelEnemy(scene, x, y);
            case EnemyType.TOMBSTONE:
                return new TombstoneEnemy(scene, x, y);
            case EnemyType.ZOMBIE:
                return new ZombieEnemy(scene, x, y);
            case EnemyType.GNOLL:
            default:
                return new GnollEnemy(scene, x, y);
        }
    }
}
