const assert = require("assert");
const { it, describe } = require("node:test");
const { reverse } = require("lodash");
const { Player } = require("../../src/models/player");
const { Game } = require("../../src/models/game");
const { createCorporations } = require("../../src/models/corporation");

describe("Game", () => {
  // TODO: extract constants
  describe("start", () => {
    it("should distribute initial assets to players", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      assert.deepStrictEqual(player1.portfolio(), {
        tiles: [
          { position: { x: 0, y: 0 }, isPlaced: false },
          { position: { x: 0, y: 1 }, isPlaced: false },
          { position: { x: 0, y: 2 }, isPlaced: false },
          { position: { x: 0, y: 3 }, isPlaced: false },
          { position: { x: 0, y: 4 }, isPlaced: false },
          { position: { x: 0, y: 5 }, isPlaced: false },
        ],
        stocks: {},
        balance: 6000,
        newTile: undefined,
      });

      assert.deepStrictEqual(player2.portfolio(), {
        tiles: [
          { position: { x: 0, y: 6 }, isPlaced: false },
          { position: { x: 0, y: 7 }, isPlaced: false },
          { position: { x: 0, y: 8 }, isPlaced: false },
          { position: { x: 0, y: 9 }, isPlaced: false },
          { position: { x: 0, y: 10 }, isPlaced: false },
          { position: { x: 0, y: 11 }, isPlaced: false },
        ],
        stocks: {},
        balance: 6000,
        newTile: undefined,
      });
    });

    it("should decide playing order of the players", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();

      const game = new Game([player1, player2], reverse, corporations);
      game.start();

      const { players } = game.status(player1.username);

      assert.deepStrictEqual(players, [
        { username: player2.username, isTakingTurn: true, you: false },
        { username: player1.username, isTakingTurn: false, you: true },
      ]);
    });
  });

  describe("playerDetails", () => {
    it("should response with player portfolio", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      assert.deepStrictEqual(game.playerDetails("Biswa"), {
        tiles: [
          { position: { x: 0, y: 0 }, isPlaced: false },
          { position: { x: 0, y: 1 }, isPlaced: false },
          { position: { x: 0, y: 2 }, isPlaced: false },
          { position: { x: 0, y: 3 }, isPlaced: false },
          { position: { x: 0, y: 4 }, isPlaced: false },
          { position: { x: 0, y: 5 }, isPlaced: false },
        ],
        stocks: {},
        balance: 6000,
        newTile: undefined,
      });
    });
  });

  describe("status", () => {
    it("should response with current game status", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      const { players, portfolio } = game.status(player1.username);

      assert.deepStrictEqual(players, [
        { username: player1.username, isTakingTurn: true, you: true },
        { username: player2.username, isTakingTurn: false, you: false },
      ]);

      assert.deepStrictEqual(portfolio, player1.portfolio());
      assert.notDeepStrictEqual(portfolio, player2.portfolio());
    });

    it("should find corporation when tile is placed next to incorporated tile", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      game.placeTile("Biswa", { x: 0, y: 4 });
      game.placeTile("Biswa", { x: 0, y: 3 });

      const { state } = game.status(player1.username);

      assert.strictEqual(state, "establish-corporation");
    });

    it("should not be in find corporation state when placed next to 0 adjacent tiles", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Bittu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      game.placeTile("Biswa", { x: 0, y: 3 });

      const { state } = game.status(player1.username);

      assert.strictEqual(state, "tile-placed");
    });
  });

  describe("placeTile", () => {
    it("should remove a tile from the tile stack", () => {
      const player1 = new Player("Biswa");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1], shuffle, corporations);
      game.start();

      const expectedPlayerPortfolio = {
        tiles: [
          { position: { x: 0, y: 0 }, isPlaced: true },
          { position: { x: 0, y: 1 }, isPlaced: false },
          { position: { x: 0, y: 2 }, isPlaced: false },
          { position: { x: 0, y: 3 }, isPlaced: false },
          { position: { x: 0, y: 4 }, isPlaced: false },
          { position: { x: 0, y: 5 }, isPlaced: false },
        ],
        stocks: {},
        balance: 6000,
        newTile: undefined,
      };

      game.placeTile("Biswa", { x: 0, y: 0 });

      assert.deepStrictEqual(player1.portfolio(), expectedPlayerPortfolio);
    });
  });

  describe("changeTurn", () => {
    it("should change the current player", () => {
      const player1 = new Player("Biswa");
      const player2 = new Player("Honu");
      const corporations = createCorporations();
      const shuffle = x => x;

      const game = new Game([player1, player2], shuffle, corporations);
      game.start();

      assert.strictEqual(player1.isTakingTurn, true);
      assert.strictEqual(player2.isTakingTurn, false);

      game.changeTurn();

      assert.strictEqual(player1.isTakingTurn, false);
      assert.strictEqual(player2.isTakingTurn, true);
    });
  });
});
