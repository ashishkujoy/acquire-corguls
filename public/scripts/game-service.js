export default class GameService {
  #components;

  constructor(components) {
    this.#components = components;
  }

  async render(gameStatus) {
    this.#components.balance.update(gameStatus.portfolio.balance);
    this.#components.stocks.update(gameStatus.portfolio.stocks);
    this.#components.players.update(gameStatus.players);
    this.#components.displayPanel.update(gameStatus);
  }
}
