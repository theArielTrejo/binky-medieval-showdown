export class AudioManager {
    private static instance: AudioManager;

    private scene!: Phaser.Scene;
    private currentMusic?: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

    private constructor() {}

    static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    init(scene: Phaser.Scene): void {
        this.scene = scene;
    }

    playMusic(
        key: string,
        config: Phaser.Types.Sound.SoundConfig = {}
    ): void {
        if (!this.scene || !this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] Music not found: ${key}`);
            return;
        }

        if (this.currentMusic && this.currentMusic.key === key) {
            return;
        }

        this.stopMusic();

        this.currentMusic = this.scene.sound.add(key, {
            loop: true,
            volume: config.volume ?? 0.05,
            ...config
        }) as Phaser.Sound.WebAudioSound;

        this.currentMusic.play();
    }

    stopMusic(): void {
        if (this.currentMusic) {
            this.currentMusic.stop();
            this.currentMusic.destroy();
            this.currentMusic = undefined;
        }
    }

    setMusicVolume(volume: number): void {
        this.currentMusic?.setVolume(volume);
    }

    playSFX(
        key: string,
        config: Phaser.Types.Sound.SoundConfig = {}
    ): void {
        if (!this.scene || !this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] SFX not found: ${key}`);
            return;
        }

        this.scene.sound.play(key, {
            volume: config.volume ?? 0.2,
            ...config
        });
    }
}
