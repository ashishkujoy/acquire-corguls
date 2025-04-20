const { Game } = require("./game");
const { createCorporations } = require("./corporation");
const { createPlayers } = require("./player");

class GameManager {
  #games;
  #shuffle;
  constructor(games, shuffle) {
    this.#games = games;
    this.#shuffle = shuffle;
  }

  createGame(lobby) {
    const { id, players } = lobby.status();
    const corporations = createCorporations();
    const game = new Game(id, createPlayers(players), this.#shuffle, corporations);
    this.#games[id] = game;

    return game;
  }

  findById(id) {
    return this.#games[id];
  }
}

module.exports = GameManager;