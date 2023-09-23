const ACTIVITIES = {
  tilePlace: "tile-place",
  establish: "establish",
  buyStocks: "buy-stocks",
  deal: "deal",
  merge: "merge",
};

class TurnManager {
  #currentTurn;
  #previousTurn;

  constructor() {
    this.#previousTurn = null;
    this.#currentTurn = this.#createTurn();
  }

  #createTurn() {
    return { activities: [] };
  }

  getTurns() {
    return {
      currentTurn: { ...this.#currentTurn },
      previousTurn: this.#previousTurn ? { ...this.#previousTurn } : null,
    };
  }

  changeTurn() {
    this.#previousTurn = this.#currentTurn;
    this.#currentTurn = this.#createTurn();
  }

  #currentActivity() {
    return this.#currentTurn.activities.at(-1);
  }

  initiateActivity(id) {
    this.#currentTurn.activities.push({ id });
  }

  consolidateActivity(data) {
    console.log(this.#currentActivity(), data);
    this.#currentActivity().data = data;
  }
}

module.exports = { TurnManager, ACTIVITIES };
