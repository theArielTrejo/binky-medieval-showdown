export default class Start extends Phaser.Scene {
  constructor() {
    super("Start");
  }

  preload() {
    // --- Map assets ---
    this.load.tilemapTiledJSON("map", "assets/binkymap1.json");
    this.load.image("castlewall", "assets/castlewall.png");
    this.load.image("floor1", "assets/floor1.png");
    this.load.image("objectskeletonstatues", "assets/objectskeletonstatues.png");
    this.load.image("tiledwallandfloor", "assets/tiledwallandfloor.png");
    this.load.image("GraveyardTileset", "assets/GraveyardTileset.png");
    this.load.image("houses1", "assets/houses1.png");
    this.load.image("objectbrickstools", "assets/objectbrickstools.png");
    this.load.image("objecthouserocksstatues", "assets/objecthouserocksstatues.png");
    this.load.image("objectlogs", "assets/objectlogs.png");
    this.load.image("tents", "assets/tents.png");
    this.load.image("treesandplants", "assets/treesandplants.png");
    this.load.image("waggonsandmore", "assets/waggonsandmore.png");
    this.load.image("brokenspikedfence", "assets/brokenspikedfence.png");
    this.load.image("gatedoorandflags", "assets/gatedoorandflags.png");
    this.load.image("grassclippings1", "assets/grassclippings1.png");
    this.load.image("grassclippings2", "assets/grassclippings2.png");

    // --- Character assets ---

    // ------------------------------------------------------------------------
    // MEDIEVAL KNIGHT

    // WALKING PNG ASSETS
    for (let i = 1; i <= 23; i++) {
      let frameNum = String(i).padStart(3, "0"); // ensures 001, 002...
      this.load.image(
        "medieknight" + i,
        `assets/all-knight-variation/Medieval Knight/PNG/PNG Sequences/Walking/Walking_${frameNum}.png`
      );
    }
  }
  // ------------------------------------------------------------------------

  create() {
    // --- Map gets created ---
    const map = this.make.tilemap({ key: "map" });
    // ALL TILES TO CREATE MAP
    const allTilesets = [
      map.addTilesetImage("castlewall", "castlewall"),
      map.addTilesetImage("floor1", "floor1"),
      map.addTilesetImage("objectskeletonstatues", "objectskeletonstatues"),
      map.addTilesetImage("tiledwallandfloor", "tiledwallandfloor"),
      map.addTilesetImage("GraveyardTileset", "GraveyardTileset"),
      map.addTilesetImage("houses1", "houses1"),
      map.addTilesetImage("objectbrickstools", "objectbrickstools"),
      map.addTilesetImage("objecthouserocksstatues", "objecthouserocksstatues"),
      map.addTilesetImage("objectlogs", "objectlogs"),
      map.addTilesetImage("tents", "tents"),
      map.addTilesetImage("treesandplants", "treesandplants"),
      map.addTilesetImage("waggonsandmore", "waggonsandmore"),
      map.addTilesetImage("brokenspikedfence", "brokenspikedfence"),
      map.addTilesetImage("gatedoorandflags", "gatedoorandflags"),
      map.addTilesetImage("grassclippings1", "grassclippings1"),
      map.addTilesetImage("grassclippings2", "grassclippings2")
    ];

    const background = map.createLayer("background", allTilesets, 0, 0);
    const foreground = map.createLayer("foreground", allTilesets, 0, 0);
    const objects = map.createLayer("objects", allTilesets, 0, 0);

    // --- Character ---
    this.player = this.physics.add.sprite(100, 100, "medieknight1").setScale(0.15);

    this.anims.create({
      key: "walk",
      frames: Array.from({ length: 23 }, (_, i) => ({ key: "medieknight" + (i + 1) })),
      frameRate: 10,
      repeat: -1
    });

    // --- Camera ---
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- Controls ---
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    const speed = 200;
    const player = this.player;
    player.body.setVelocity(0);

    if (this.cursors.left.isDown) {
      player.setVelocityX(-speed);
      player.anims.play("walk", true);
      player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      player.setVelocityX(speed);
      player.anims.play("walk", true);
      player.setFlipX(false);
    } else if (this.cursors.up.isDown) {
      player.setVelocityY(-speed);
      player.anims.play("walk", true);
    } else if (this.cursors.down.isDown) {
      player.setVelocityY(speed);
      player.anims.play("walk", true);
    } else {
      player.anims.stop();
    }
  }
}
