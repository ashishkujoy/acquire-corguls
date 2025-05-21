class Lobby {
  #id;
  #hasExpired;
  #players;
  #size;
  #name;

  constructor(id, size, name) {
    this.#id = id;
    this.#name = name;
    this.#players = [];
    this.#hasExpired = false;
    this.#size = size;
  }

  addPlayer(player) {
    if (this.#players.find(p => p.username === player.username)) {
      throw new Error("Player already in lobby");
    }
    this.#players.push(player);
  }

  #isPossibleToStartGame() {
    return this.#players.length >= this.#size.lowerLimit;
  }

  isFull() {
    return this.#players.length === this.#size.upperLimit;
  }

  expire() {
    this.#hasExpired = true;
  }

  canBeJoined() {
    return !this.isFull() && !this.#hasExpired;
  }

  #getSelf(username) {
    return this.#players.filter(player => player.username === username).pop();
  }

  status(username) {
    return {
      name: this.#name,
      id: this.#id,
      players: this.#players.map(player => ({ ...player })),
      isFull: this.isFull(),
      hasExpired: this.#hasExpired,
      isPossibleToStartGame: this.#isPossibleToStartGame(),
      host: this.#players[0],
      self: this.#getSelf(username),
    };
  }
}

module.exports = Lobby;
