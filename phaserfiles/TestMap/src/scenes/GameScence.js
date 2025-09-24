export default class Start extends Phaser.Scene {
  constructor() {
    super("Start");
  }

  preload() {
    // Load the Tiled map JSON
    this.load.tilemapTiledJSON("map", "assets/binkymap1.json");

    // Load ALL tileset images that are used in your Tiled map
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
  }

  create() {
    // Create the map
    const map = this.make.tilemap({ key: "map" });

    // Connect tilesets (first arg = tileset name in Tiled, second = preload key)
    const castlewall = map.addTilesetImage("castlewall", "castlewall");
    const floor1 = map.addTilesetImage("floor1", "floor1");
    const skeletons = map.addTilesetImage("objectskeletonstatues", "objectskeletonstatues");
    const wallfloor = map.addTilesetImage("tiledwallandfloor", "tiledwallandfloor");
    const graveyard = map.addTilesetImage("GraveyardTileset", "GraveyardTileset");
    const houses = map.addTilesetImage("houses1", "houses1");
    const tools = map.addTilesetImage("objectbrickstools", "objectbrickstools");
    const rocks = map.addTilesetImage("objecthouserocksstatues", "objecthouserocksstatues");
    const logs = map.addTilesetImage("objectlogs", "objectlogs");
    const tents = map.addTilesetImage("tents", "tents");
    const plants = map.addTilesetImage("treesandplants", "treesandplants");
    const wagons = map.addTilesetImage("waggonsandmore", "waggonsandmore");
    const fence = map.addTilesetImage("brokenspikedfence", "brokenspikedfence");
    const gate = map.addTilesetImage("gatedoorandflags", "gatedoorandflags");
    const grass1 = map.addTilesetImage("grassclippings1", "grassclippings1");
    const grass2 = map.addTilesetImage("grassclippings2", "grassclippings2");

    const allTilesets = [
      castlewall, floor1, skeletons, wallfloor, graveyard, houses,
      tools, rocks, logs, tents, plants, wagons, fence, gate, grass1, grass2
    ];

    // Create layers (names must match the layer names in Tiled)
    const background = map.createLayer("background", allTilesets, 0, 0);
    const foreground = map.createLayer("foreground", allTilesets, 0, 0);
    const objects = map.createLayer("objects", allTilesets, 0, 0);


    // Optional: enable collisions if you’ve marked collidable tiles in Tiled
    // foreground.setCollisionByProperty({ collides: true });
    // objects.setCollisionByProperty({ collides: true });
  }
}
