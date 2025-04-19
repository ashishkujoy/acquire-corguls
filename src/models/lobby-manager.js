const Lobby = require("./lobby");

class LobbyManager {
  #lobbies;
  #idGenerator;
  constructor(lobbies, idGenerator) {
    this.#lobbies = lobbies;
    this.#idGenerator = idGenerator;
  }

  createLobby(size) {
    const id = this.#idGenerator.generate();
    const lobby = new Lobby(id, size);
    this.#lobbies[id] = lobby;

    return id;
  }

  findById(id) {
    return this.#lobbies[id];
  }
}

module.exports = LobbyManager;