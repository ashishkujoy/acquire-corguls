const { describe, it } = require("node:test");
const assert = require("node:assert");
const GameManager = require("../../src/models/game-manager");
const { Player } = require("../../src/models/player");
const sinon = require("sinon");


describe("GameManager", () => {
  it("create a new game from lobby", () => {
    const player1 = new Player("Biswa");
    const player2 = new Player("Bittu");
    const shuffle = x => x;
    const lobby = {
      status: sinon.stub().returns({ players: [player1, player2], id: "0" })
    };

    const gameManager = new GameManager({}, shuffle);

    gameManager.createGame(lobby);

    assert(lobby.status.calledOnce);
  });

  it("finds game by id", () => {
    const gameManager = new GameManager({ 0: { id: 0 } }, () => 1);

    assert.deepStrictEqual(gameManager.findById(0), { id: 0 });
    assert.equal(gameManager.findById(1), undefined);
  });
});