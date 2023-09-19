const CORPORATIONS = [
  "phoenix",
  "quantum",
  "hydra",
  "fusion",
  "america",
  "sackson",
  "zeta",
  "incorporated",
];

const GAME_STATUS = {
  "place-tile": "'s turn.",
  "tile-placed": " placed a tile.",
  "establish-corporation": " is establishing a corporation",
  "buy-stocks": " is taking turn",
};

const CORPORATIONS_IDS = {
  "phoenix": "phoenix",
  "quantum": "quantum",
  "hydra": "hydra",
  "fusion": "fusion",
  "america": "america",
  "sackson": "sackson",
  "zeta": "zeta",
};

const getCorporation = id => document.getElementById(id);
const getBoard = () => document.querySelectorAll(".space");
const getInfoIcon = () => document.querySelector("#info-icon");
const getInfoCard = () => document.querySelector("#info-card");
const getInfoCloseBtn = () => document.querySelector("#info-close-btn");
const getPlayersDiv = () => document.querySelector("#players");
const getDisplayPanel = () => document.querySelector("#display-panel");
const getTileContainer = () => document.querySelector("#tile-container");
const getTileElements = () => {
  const tileContainer = getTileContainer();
  return Array.from(tileContainer.children);
};

const displayAccountBalance = balance => {
  const balanceContainer = document.querySelector("#balance-container");
  balanceContainer.innerText = "$" + balance;
};

const placeNewTile = tileElements => {
  tileElements.forEach(tileElement => {
    tileElement.classList.remove("used-tile");
  });
};

const removeHighlight = tileElements => {
  tileElements.forEach(tileElement =>
    tileElement.classList.remove("highlight")
  );
};

const refillTile = () => {
  const transitionDelay = 1000;
  fetch("/game/end-turn", { method: "POST" }).then(() => {
    const tileElements = getTileElements();
    placeNewTile(tileElements);
    setTimeout(() => removeHighlight(tileElements), transitionDelay);
  });
};

const establishCorporation = data => {
  fetch("/game/establish", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  });
};

const buyStocks = data => {
  fetch("/game/buy-stocks", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  });
};

const createMessageElements = (name, position) => {
  const columnSpecification = position.y + 1;
  const rowSpecification = String.fromCharCode(position.x + 65);
  const tile = columnSpecification + rowSpecification;

  return generateComponent(["div", `${name}: ${tile}`, { class: "messgae" }]);
};

const renderMessagePairHolder = messageElements => {
  const messagePairHolder = document.createElement("div");
  messagePairHolder.append(...messageElements);
  messagePairHolder.classList.add("message-pair-holder");
  getDisplayPanel().append(messagePairHolder);
};

const displayInitialMessages = ({ setupTiles }) => {
  if (!setupTiles) return;

  const messages = setupTiles.map(([name, { position }]) => {
    const columnSpecification = position.y + 1;
    const rowSpecification = String.fromCharCode(position.x + 65);
    const tile = columnSpecification + rowSpecification;

    const tileSetupMessageElement = document.createElement("div");
    tileSetupMessageElement.innerText = `${tile} placed for ${name}.`;
    return tileSetupMessageElement;
  });

  getDisplayPanel().append(...messages);
};

const renderCorporations = ({ corporations }) => {
  Object.entries(corporations).forEach(([name, stats]) => {
    const corporation = getCorporation(name);

    if (stats.isSafe) corporation.classList.add("safe");

    corporation.querySelector(".price").innerText = `$${stats.price}`;
    corporation.querySelector(".size").innerText = stats.size;
    corporation.querySelector(".stocks").innerText = stats.stocks;
  });
};

const displayAccountStocks = stocks => {
  const accountStocks = {
    "phoenix": "phoenix-stock",
    "quantum": "quantum-stock",
    "hydra": "hydra-stock",
    "fusion": "fusion-stock",
    "america": "america-stock",
    "sackson": "sackson-stock",
    "zeta": "zeta-stock",
  };

  Object.entries(stocks).forEach(([corporation, quantity]) => {
    const stocks = document.getElementById(accountStocks[corporation]);
    stocks.classList.add(corporation);
    const [quantityElement] = [...stocks.children];
    quantityElement.innerText = quantity;
  });
};

const fillSpace = (position, corpClass) => {
  const board = getBoard();
  const tileId = position.x * 12 + position.y;
  const tile = board[tileId];
  CORPORATIONS.forEach(corp => tile.classList.remove(corp));
  tile.classList.add(corpClass);
};

const displayResponse = ({ message }) => {
  const displayPanel = getDisplayPanel();
  displayPanel.innerText = message;
};

const disablePlayerTiles = () => {
  const tileContainer = getTileContainer();
  tileContainer.classList.add("disable-click");
};

const setUpTiles = ({ position }) => {
  fetch("/game/tile", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(position),
  })
    .then(res => {
      if (res.status === 200) {
        fillSpace(position);
      }
    })
    .then(disablePlayerTiles);
};

const displayTile = (tileElement, position) => {
  const { x, y } = position;
  const columnSpecification = y + 1;
  const rowSpecification = String.fromCharCode(x + 65);
  tileElement.innerText = columnSpecification + rowSpecification;
};

const attachListener = (tileElement, tile) => {
  tileElement.onclick = () => {
    tileElement.classList.add("used-tile");
    setUpTiles(tile);
  };
};

const addVisualAttribute = (tileElement, isPlaced) => {
  if (isPlaced) tileElement.classList.add("used-tile");
};

const isSameTile = (tile1, tile2) =>
  tile1.position.x === tile2.position.x &&
  tile1.position.y === tile2.position.y;

const highlightTile = (tile, tileToHighlight, tileElement) => {
  if (isSameTile(tile, tileToHighlight)) {
    tileElement.classList.add("highlight");
  }
};

const displayAndSetupAccountTiles = (newTile, tiles) => {
  const tileToHighlight = newTile || { position: {} };
  const tileElements = getTileElements();

  tiles.forEach((tile, tileID) => {
    const tileElement = tileElements[tileID];
    displayTile(tileElement, tile.position);
    addVisualAttribute(tileElement, tile.isPlaced);
    attachListener(tileElement, tile);
    highlightTile(tile, tileToHighlight, tileElement);
  });
};

const setupInfoCard = () => {
  const infoIcon = getInfoIcon();
  const infoCard = getInfoCard();
  const infoCloseBtn = getInfoCloseBtn();

  infoIcon.onclick = () => {
    infoCard.classList.remove("hide");
  };

  infoCloseBtn.onclick = () => {
    infoCard.classList.add("hide");
  };
};

const displayPlayerProfile = ({ portfolio, players }) => {
  const { balance, stocks, tiles, newTile } = portfolio;
  displayAccountBalance(balance);
  displayAccountStocks(stocks);
  displayAndSetupAccountTiles(newTile, tiles, players);
};

const renderBoard = ({ placedTiles }) => {
  placedTiles.forEach(({ position, belongsTo }) =>
    fillSpace(position, belongsTo)
  );
};

const renderPlayers = ({ players }) => {
  const playersDiv = getPlayersDiv();
  const playerElements = players.map(({ isTakingTurn, username, you }) => {
    const activeClass = isTakingTurn ? " active" : "";
    const selfClass = you ? " self" : "";

    return generateComponent([
      "div",
      [
        [
          "img",
          "",
          {
            class: "profile-pic",
            src: `https://source.boringavatars.com/beam/120/${username}`,
          },
        ],
        ["div", username, { class: "name" }],
      ],
      {
        class: `player flex ${activeClass} ${selfClass}`,
      },
    ]);
  });

  [...playersDiv.children].forEach(child => child.remove());
  playersDiv.append(...playerElements);
};

const generateRefillTileBtn = () => {
  const refillTileMessageElement = generateComponent(["p", "Refill your tile"]);
  const endButton = generateComponent([
    "button",
    "Refill",
    { type: "button", onclick: "refillTile()" },
  ]);

  return [refillTileMessageElement, endButton];
};

const renderTilePlacedMessage = () => {
  const refillTilePrompt = document.createElement("div");
  refillTilePrompt.classList.add("refill-tile-prompt");
  refillTilePrompt.append(...generateRefillTileBtn());
  getDisplayPanel().append(refillTilePrompt);
};

const displayMessage = gameStatus => {
  const { state } = gameStatus;
  const displayPanel = getDisplayPanel();

  const renderMessage = {
    "place-tile": () => {
      displayPanel.innerText = "Place a tile...";
    },

    "tile-placed": () => {
      displayPanel.innerHTML = "";
      renderTilePlacedMessage();
    },

    "establish-corporation": () => {
      displayPanel.innerText = "Select a corporation to establish...";
    },

    "buy-stocks": () => {
      displayPanel.innerHTML = "";
    },
  };

  renderMessage[state]();
};

const isSamePlayer = (self, currentPlayer) =>
  self.username === currentPlayer.username;

const determineDisplayName = (self, currentPlayer) =>
  isSamePlayer(self, currentPlayer) ? "You" : currentPlayer.username;

const customizeActivityMessage = (self, currentPlayer, gameStatus) => {
  const displayName = determineDisplayName(self, currentPlayer);

  if (isSamePlayer(self, currentPlayer)) {
    return displayMessage(gameStatus);
  }

  const message = `${displayName}${GAME_STATUS[gameStatus.state]}`;
  const displayPanel = getDisplayPanel();
  displayPanel.innerText = message;
};

const renderActivityMessage = gameStatus => {
  const { state, players } = gameStatus;

  if (state === GAME_STATUS.setup) return;
  const self = players.find(({ you }) => you);
  const currentPlayer = players.find(({ isTakingTurn }) => isTakingTurn);
  customizeActivityMessage(self, currentPlayer, gameStatus);
};

const setUpPlayerTilePlacing = ({ players, state }) => {
  const self = players.find(({ you }) => you);
  const currentPlayer = players.find(({ isTakingTurn }) => isTakingTurn);

  const tileContainer = getTileContainer();

  if (isSamePlayer(self, currentPlayer) && state === "place-tile") {
    return tileContainer.classList.remove("disable-click");
  }

  tileContainer.classList.add("disable-click");
};

const setupCorporationSelection = ({ players, corporations, state }) => {
  const self = players.find(({ you }) => you);
  const currentPlayer = players.find(({ isTakingTurn }) => isTakingTurn);
  const isInCorrectState = state === "establish-corporation";

  if (!(isSamePlayer(self, currentPlayer) && isInCorrectState)) {
    [...document.querySelectorAll(".corporation")].forEach(corp =>
      corp.classList.add("non-selectable")
    );
    return;
  }

  Object.entries(corporations)
    .filter(([, corp]) => !corp.isActive)
    .map(([name]) => {
      const corp = getCorporation(name);

      corp.onclick = () => establishCorporation({ name });
      return corp;
    })
    .forEach(corp => corp.classList.remove("non-selectable"));
};

const setupGame = () => {
  fetch("/game/status")
    .then(res => res.json())
    .then(gameStatus => {
      renderPlayers(gameStatus);
      displayPlayerProfile(gameStatus);
      renderBoard(gameStatus);
      displayInitialMessages(gameStatus);
      renderCorporations(gameStatus);
    });

  setupInfoCard();
};

const notifyGameEnd = () => {
  const displayPanel = getDisplayPanel();
  const gameEndElement = generateComponent([
    "div",
    [
      ["p", "Game Over"],
      ["button", "Stats"],
    ],
    { class: "game-over flex" },
  ]);

  displayPanel.innerHTML = "";
  displayPanel.append(gameEndElement);
};

const renderGame = () => {
  fetch("/game/status")
    .then(res => res.json())
    .then(gameStatus => {
      if (this.previousState === gameStatus.state) return;

      if (gameStatus.state === "game-end") {
        notifyGameEnd();
        return;
      }

      renderPlayers(gameStatus);
      displayPlayerProfile(gameStatus);
      renderBoard(gameStatus);
      renderActivityMessage(gameStatus);
      setUpPlayerTilePlacing(gameStatus);
      setupCorporationSelection(gameStatus);
      startPurchase(gameStatus, getDisplayPanel(), getCorporation);
      renderCorporations(gameStatus);
      this.previousState = gameStatus.state;
    });

  setupInfoCard();
};

const keepPlayerProfileUpdated = () => {
  const interval = 1000;
  const previousState = undefined;
  const gameRenderer = renderGame.bind({ previousState });
  setupGame();
  setTimeout(() => {
    setInterval(gameRenderer, interval);
  }, interval * 1);
};

window.onload = keepPlayerProfileUpdated;
