const { range, groupBy } = require("lodash");
const GAME_STATES = {
  setup: "setup",
  placeTile: "place-tile",
  tilePlaced: "tile-placed",
  establishCorporation: "establish-corporation",
};

class Game {
  #tiles;
  #state;
  #corporations;
  #shuffle;
  #players;
  #incorporatedTiles;
  #placedTiles;
  #setupTiles;
  #turns;
  #connectedTiles;

  constructor(players, shuffle, corporations) {
    this.#tiles = [];
    this.#placedTiles = [];
    this.#incorporatedTiles = [];
    this.#corporations = corporations;
    this.#players = players;
    this.#shuffle = shuffle;
    this.#state = GAME_STATES.setup;
    this.#turns = 0;
  }

  #createTilesStack() {
    this.#tiles = range(9).flatMap(x =>
      range(12).map(y => ({ position: { x, y }, isPlaced: false }))
    );
  }

  #pickTile() {
    return this.#tiles.shift();
  }

  #provideInitialTiles(player, quantity = 6) {
    this.#tiles.splice(0, quantity).forEach(tile => player.addTile(tile));
  }

  #provideInitialAsset() {
    const initialAmount = 6000;
    this.#players.forEach(player => {
      player.addIncome(initialAmount);
      this.#provideInitialTiles(player);
    });
  }

  #shuffleTiles() {
    this.#tiles = this.#shuffle(this.#tiles);
  }

  #addToIncorporatedTiles(tile) {
    tile.isPlaced = true;
    this.#incorporatedTiles.push(tile);
  }

  #findConnectedTiles({ x, y }, grid = []) {
    const tile = this.#placedTiles.find(
      ({ position }) => position.x === x && position.y === y
    );

    if (tile && !grid.includes(tile)) {
      grid.push(tile);
      this.#findConnectedTiles({ x: x + 1, y }, grid);
      this.#findConnectedTiles({ x: x - 1, y }, grid);
      this.#findConnectedTiles({ x, y: y + 1 }, grid);
      this.#findConnectedTiles({ x, y: y - 1 }, grid);
    }

    return grid;
  }

  #growCorporation = name => {
    const corporation = this.#corporations[name];

    const connectedIncorporatedTiles = this.#connectedTiles.filter(
      ({ belongsTo }) => belongsTo === "incorporated"
    );

    connectedIncorporatedTiles.forEach(tile => (tile.belongsTo = name));
    corporation.increaseSize(connectedIncorporatedTiles.length);
  };

  // eslint-disable-next-line complexity
  #consolidateTile(position) {
    const tile = { position, isPlaced: true, belongsTo: "incorporated" };

    this.#placedTiles.push(tile);
    this.#addToIncorporatedTiles(tile);
    this.#connectedTiles = this.#findConnectedTiles(position);

    const groupedTiles = groupBy(this.#connectedTiles, "belongsTo");

    const foundCorporation = () =>
      Object.keys(groupedTiles).length === 1 &&
      groupedTiles.incorporated.length > 1;

    const growCorporation = () =>
      Object.keys(groupedTiles).length === 2 &&
      groupedTiles.incorporated.length >= 1;

    switch (true) {
      case this.#connectedTiles.length === 1: {
        this.#state = GAME_STATES.tilePlaced;
        break;
      }

      case foundCorporation(): {
        this.#state = GAME_STATES.establishCorporation;
        break;
      }

      case growCorporation(): {
        const name = Object.keys(groupedTiles).find(
          belongsTo => belongsTo !== "incorporated"
        );

        this.#growCorporation(name);
        this.#state = GAME_STATES.tilePlaced;
        break;
      }
    }
  }

  establishCorporation({ name }) {
    const player = this.#currentPlayer();
    const corporation = this.#corporations[name];

    corporation.establish();
    this.#growCorporation(name);

    player.addStocks(name, 1);
    corporation.decrementStocks(1);

    this.#state = GAME_STATES.tilePlaced;
  }

  //Remove username
  placeTile(username, position) {
    const player = this.#players.find(player => player.username === username);
    this.#consolidateTile(position);
    player.placeTile(position);
  }

  #decidePlayingOrder() {
    this.#setupTiles = this.#players.map(player => [player, this.#pickTile()]);

    const firstTiles = this.#setupTiles.toSorted(([, a], [, b]) => {
      return a.position.x - b.position.x || a.position.y - b.position.y;
    });

    this.#players = firstTiles.map(([a]) => a);

    firstTiles.forEach(([, tile]) => {
      this.#placedTiles.push({
        ...tile,
        belongsTo: "incorporated",
        isPlaced: true,
      });

      this.#addToIncorporatedTiles(tile);
    });
  }

  #currentPlayer() {
    return this.#players[this.#turns % this.#players.length];
  }

  setup() {
    this.#createTilesStack();
    this.#shuffleTiles();
    this.#provideInitialAsset();
    this.#decidePlayingOrder();
  }

  start() {
    this.setup();
    this.#state = GAME_STATES.placeTile;
    this.#currentPlayer().startTurn();
  }

  playerDetails(username) {
    // TODO: make it private
    const player = this.#players.find(player => player.username === username);
    return player.portfolio();
  }

  #getPlayers(username) {
    return this.#players.map(player => ({
      username: player.username,
      isTakingTurn: player.isTakingTurn,
      you: player.username === username,
    }));
  }

  #refillTile() {
    const newTile = this.#pickTile();
    this.#currentPlayer().refillTile(newTile);
  }

  changeTurn() {
    this.#refillTile();
    this.#currentPlayer().endTurn();
    this.#turns++;
    this.#currentPlayer().startTurn();
    this.#state = GAME_STATES.placeTile;
    // refill
  }

  #getCorporationStats() {
    return Object.fromEntries(
      Object.entries(this.#corporations).map(([name, corporation]) => [
        name,
        corporation.stats(),
      ])
    );
  }

  status(username) {
    return {
      state: this.#state,
      setupTiles: this.#setupTiles.map(([player, tile]) => [
        player.username,
        tile,
      ]),
      players: this.#getPlayers(username),
      portfolio: this.playerDetails(username),
      corporations: this.#getCorporationStats(),
      placedTiles: this.#placedTiles,
    };
  }
}

module.exports = {
  Game,
};
