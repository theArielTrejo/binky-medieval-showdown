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
    this.load.image("collision.png", "assets/collision.png"); // Collision
    this.load.image("farmgrass.png", "assets/farmgrass.png");
    this.load.image("farmhouses.png", "assets/farmhouses.png");
    this.load.image("farmobjects.png", "assets/farmobjects.png");

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
      map.addTilesetImage("grassclippings2", "grassclippings2"),
      map.addTilesetImage("collision", "collision"),
      map.addTilesetImage("farmgrass", "farmgrass"),
      map.addTilesetImage("farmhouses", "farmhouses"),
      map.addTilesetImage("farmobjects", "farmobjects")
    ];

    // --- Object Layer ---
    const spawnLayer = map.getObjectLayer("StartSpawnPoint");
    let spawnPoint = map.findObject("StartSpawnPoint", obj => obj.name === "playerSpawn");
    // -------------------- // 
    const background = map.createLayer("background", allTilesets, 0, 0);
    const foreground = map.createLayer("foreground", allTilesets, 0, 0);
    const objects = map.createLayer("objects", allTilesets, 0, 0);
    const foregroundobjects = map.createLayer("foregroundobjects", allTilesets, 0, 0);
    const trees = map.createLayer("Trees", allTilesets, 0, 0);

    // --- Collision layer ---
    const collisionLayer = map.createLayer("collisions", allTilesets, 0, 0);
    // Mark every non-empty tile as collidable
    collisionLayer.setCollisionByExclusion([-1]);
    // Hide the red tiles so they don’t show in-game
    collisionLayer.setVisible(true);

    // --- Object Collision layer 
    const obstacles = map.getObjectLayer("objectcollisions")?.objects || [];

    // --- Character ---
    this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "medieknight1").setScale(0.05);
    // Add collision between player and the layer
    this.physics.add.collider(this.player, collisionLayer);

    // Function to add collision on objects, this is need because collisions will be smaller for objects
    obstacles.forEach(obj => {
      // Tiled objects are top-left anchored; Arcade bodies are center-anchored
      const x = obj.x + obj.width  / 2;
      const y = obj.y + obj.height / 2;

      // Create an invisible rectangle and give it a STATIC Arcade body
      const rect = this.add.rectangle(x, y, obj.width, obj.height).setVisible(false);
      this.physics.add.existing(rect, true);   // true => static body

      this.physics.add.collider(this.player, rect);
    });

    // Hitbox
    this.player.body.setSize(410, 545);   // width, height in pixels (scaled space)
    this.player.body.setOffset(265, 175);  // shift right (x), shift down (y)

    this.anims.create({
      key: "walk",
      frames: Array.from({ length: 23 }, (_, i) => ({ key: "medieknight" + (i + 1) })),
      frameRate: 18,
      repeat: -1
    });

    // --- Camera ---
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(3);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- Controls ---
    this.cursors = this.input.keyboard.createCursorKeys();

    //  Depth ordering
    background.setDepth(0); // ground/background
    foreground.setDepth(1); // walls, etc
    objects.setDepth(2); // Graves, pillars, etc
    this.player.setDepth(3);     // player
    foregroundobjects.setDepth(4); // This will set up the layers by allowing the user to be
    // in front of an object but be behind it as well. 
    trees.setDepth(5);
    // objectLayer.setDepth(1);     // mid-ground (might implement later) 
    

  }

  update() {
    const speed = 300;
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
