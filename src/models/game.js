const { range, groupBy } = require("lodash");
const { Player } = require("./player");
const { Corporation } = require("./corporation");
const Merger = require("./merger");
const GAME_STATES = {
  setup: "setup",
  placeTile: "place-tile",
  tilePlaced: "tile-placed",
  establishCorporation: "establish-corporation",
  buyStocks: "buy-stocks",
  gameEnd: "game-end",
  merge: "merge",
};

class Game {
  #tiles;
  #state;
  #stateInfo; // attach with state
  #corporations;
  #shuffle;
  #players;
  #incorporatedTiles;
  #placedTiles;
  #setupTiles;
  #turns;
  #connectedTiles;
  #handlers;
  #result;
  #merger;

  constructor(players, shuffle, corporations) {
    this.#tiles = [];
    this.#placedTiles = [];
    this.#incorporatedTiles = [];
    this.#corporations = corporations;
    this.#players = players;
    this.#shuffle = shuffle;
    this.#state = GAME_STATES.setup;
    this.#stateInfo = {};
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
    if (corporation.stats().size > 10) corporation.markSafe();
  };

  #consolidateTile(position) {
    const tile = { position, isPlaced: true, belongsTo: "incorporated" };

    this.#placedTiles.push(tile);
    this.#addToIncorporatedTiles(tile);
    this.#connectedTiles = this.#findConnectedTiles(position);

    const groupedTiles = groupBy(this.#connectedTiles, "belongsTo");
    const { handler } = this.#handlers.find(({ match }) => match(groupedTiles));
    handler(groupedTiles);
  }

  establishCorporation({ name }) {
    const player = this.#currentPlayer();
    const corporation = this.#corporations[name];

    corporation.establish();
    this.#growCorporation(name);

    player.addStocks(name, 1);
    corporation.decrementStocks(1);

    this.#state = GAME_STATES.buyStocks;
  }

  // TODO: Remove username
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

  // TODO: Refactor it
  #setupHandlers() {
    const noActiveCorporation = () =>
      Object.values(this.#corporations).find(corp => !corp.isActive);

    const foundCorporation = groupedTiles =>
      Object.keys(groupedTiles).length === 1 &&
      groupedTiles.incorporated.length > 1 &&
      noActiveCorporation();

    const growCorporation = groupedTiles =>
      Object.keys(groupedTiles).length === 2 &&
      groupedTiles.incorporated.length >= 1;

    const isMerging = groupedTiles => Object.keys(groupedTiles).length > 2;

    this.#handlers = [
      {
        match: foundCorporation,
        handler: () => {
          this.#state = GAME_STATES.establishCorporation;
        },
      },
      {
        match: growCorporation,
        handler: groupedTiles => {
          const name = Object.keys(groupedTiles).find(
            belongsTo => belongsTo !== "incorporated"
          );

          this.#growCorporation(name);
          this.#state = GAME_STATES.buyStocks;
        },
      },
      {
        match: isMerging,
        handler: () => {
          this.#merger = new Merger(
            this.#players.length,
            this.#corporations,
            this.#connectedTiles
          );
          this.#merger.start();
          this.#state = GAME_STATES.merge;
          this.#stateInfo = {
            acquirer: this.#merger.acquirer,
            defunct: this.#merger.defunct,
          };
        },
      },
      {
        match: () => true,
        handler: () => {
          this.#state = GAME_STATES.buyStocks;
        },
      },
    ];
  }

  endMerge() {
    this.#state = GAME_STATES.buyStocks;
  }

  setup() {
    this.#createTilesStack();
    this.#shuffleTiles();
    this.#provideInitialAsset();
    this.#decidePlayingOrder();
    this.#setupHandlers();
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

  #isGameOver() {
    const activeCorporations = Object.entries(this.#corporations).filter(
      ([, { isActive }]) => isActive
    );

    if (activeCorporations.length === 0) return false;

    const hasAcquired41Tiles = activeCorporations.some(
      ([, corp]) => corp.size >= 41
    );

    const isEveryCorpStable = activeCorporations.every(
      ([, corp]) => corp.isSafe
    );

    return hasAcquired41Tiles || isEveryCorpStable;
  }

  #sellBackStocks() {
    const activeCorporations = Object.entries(this.#corporations).filter(
      ([, { isActive }]) => isActive
    );

    activeCorporations.forEach(([name, corporation]) => {
      this.#players.forEach(player => {
        const { stocks } = player.portfolio();
        const noOfStocks = stocks[name];
        const { price: currentPrice } = corporation.stats();

        player.sellStocks(name, noOfStocks);
        player.addIncome(noOfStocks * currentPrice);
        corporation.incrementStocks(noOfStocks);
      });
    });
  }

  #saveGameResult() {
    const activeCorporations = Object.entries(this.#corporations)
      .filter(([, { isActive }]) => isActive)
      .map(([name, corp]) => {
        const { price, stocks, majorityPrice, minorityPrice } = corp.stats();

        return {
          name,
          price,
          stocks,
          majorityPrice,
          minorityPrice,
        };
      });

    const players = this.#players.map(player => {
      const { stocks, balance } = player.portfolio();

      return {
        stocks,
        balance,
        name: player.username,
      };
    });

    this.#result = { players, corporations: activeCorporations };
  }

  changeTurn() {
    if (this.#isGameOver()) {
      this.#state = GAME_STATES.gameEnd;
      this.#saveGameResult();
      this.#sellBackStocks();
      return;
    }

    this.#refillTile();
    this.#currentPlayer().endTurn();
    this.#turns++;
    this.#currentPlayer().startTurn();
    this.#state = GAME_STATES.placeTile;
  }

  endMergerTurn() {
    this.#merger.endTurn();
    this.#currentPlayer().endTurn();
    this.#turns++;
    this.#currentPlayer().startTurn();

    if (this.#merger.hasEnd()) {
      this.#merger.end();
      this.#state = GAME_STATES.buyStocks;
      return;
    }
  }

  dealDefunctStocks({ sell }) {
    this.#merger.sell(this.#currentPlayer(), sell);
    this.endMergerTurn();
  }

  buyStocks(stocks) {
    const player = this.#currentPlayer();

    stocks.forEach(({ name }) => {
      const corp = this.#corporations[name];
      const { isActive, stocks, price } = corp.stats();
      if (isActive && stocks >= 1 && player.balance >= price) {
        corp.decrementStocks(1);
        player.addExpense(price);
        player.addStocks(name, 1);
      }
    });

    this.#state = GAME_STATES.tilePlaced;
  }

  #getCorporationStats() {
    return Object.fromEntries(
      Object.entries(this.#corporations).map(([name, corporation]) => [
        name,
        corporation.stats(),
      ])
    );
  }

  findMajorityMinority(corpName) {
    const getStocks = player => player.portfolio().stocks[corpName];
    const [majority, minority] = Object.entries(
      groupBy(this.#players, getStocks)
    )
      .map(([stock, players]) => ({
        stock: parseInt(stock),
        players: players,
        playerNames: players.map(p => p.username),
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 2);

    return {
      majority,
      minority: minority || { stock: 0, players: [], playerNames: [] },
    };
  }

  status(username) {
    return {
      state: this.#state,
      stateInfo: this.#stateInfo,
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

  get result() {
    return this.#result;
  }

  static fromJSON({ tiles, players, corporations, setupTiles, placedTiles }) {
    const game = new Game();

    game.#state = GAME_STATES.placeTile;
    game.#tiles = tiles;
    game.#corporations = corporations;
    game.#players = players;
    game.#placedTiles = placedTiles;
    game.#setupTiles = setupTiles;
    game.#turns = 0;

    players[0].startTurn();
    game.#setupHandlers();

    return game;
  }
}

const loadGame = gameData => {
  return Game.fromJSON({
    ...gameData,
    players: gameData.players.map(player => Player.fromJSON(player)),
    corporations: Object.fromEntries(
      Object.entries(gameData.corporations).map(([name, data]) => [
        name,
        Corporation.fromJSON({ ...data, name }),
      ])
    ),
  });
};

module.exports = {
  Game,
  loadGame,
};
