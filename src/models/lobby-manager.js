const Lobby = require("./lobby");

class LobbyManager {
  #lobbies;
  #idGenerator;
  constructor(lobbies, idGenerator) {
    this.#lobbies = lobbies;
    this.#idGenerator = idGenerator;
  }

  createLobby(size, name) {
    const id = this.#idGenerator.generate();
    const lobby = new Lobby(id, size, name);
    this.#lobbies[id] = lobby;

    return id;
  }

  createLobbyWithHost(size, name, host) {
    const id = this.createLobby(size, name);
    const lobby = this.findById(id);
    lobby.addPlayer({ username: host });
    return id;
  }

  findById(id) {
    return this.#lobbies[id];
  }

  availableLobbies() {
    return Object.values(this.#lobbies)
      .map(lobby => lobby.status())
      .filter(lobby => !lobby.isFull)
  }

  join(lobbyId, player) {
    const lobby = this.findById(lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }
    lobby.addPlayer(player);
    return lobby.status();
  }
}

module.exports = LobbyManager;