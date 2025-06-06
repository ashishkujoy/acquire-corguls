import GameService from "/scripts/game-service.js";
import GameGateway from "/scripts/game-gateway.js";
import Balance from "/scripts/components/balance.js";
import Stocks from "/scripts/components/stocks.js";
import Players from "/scripts/components/players.js";
import { renderMerge } from "/scripts/merger.js";
import { resolveMergeConflict } from "/scripts/merge-conflict.js";
import DisplayPanel from "/scripts/components/display-panel.js";
import { selectAcquirer } from "/scripts/multiple-acquirer.js";
import { selectDefunct } from "/scripts/multiple-defunct.js";

let previousState;
let currentTiles = [];
let previousPrices = {}; // Track previous stock prices
let previousTurnCorporations = []; // Track corporations from previous turn

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

const ACTIVITIES = {
  tilePlace: "tile-place",
  establish: "establish",
  buyStocks: "buy-stocks",
  merge: "merge",
  mergeConflict: "merge-conflict",
  acquirerSelection: "acquirer-selection",
  defunctSelection: "defunct-selection",
};

const getTile = position => {
  const columnSpecification = position.y + 1;
  const rowSpecification = String.fromCharCode(position.x + 65);

  return columnSpecification + rowSpecification;
};

const stockIDs = {
  "phoenix": "phoenix-stock",
  "quantum": "quantum-stock",
  "hydra": "hydra-stock",
  "fusion": "fusion-stock",
  "america": "america-stock",
  "sackson": "sackson-stock",
  "zeta": "zeta-stock",
};

const getStockElement = ([corp, id]) => {
  const corpElement = document.getElementById(id);

  return [
    corp,
    {
      card: corpElement,
      quantity: corpElement.querySelector(".quantity"),
    },
  ];
};

const getDisplayPanelElement = () => {
  const panel = document.querySelector("#display-panel");
  const historyPane = panel.querySelector("#history-pane");
  const activityConsole = panel.querySelector("#activity-console");

  return { panel, historyPane, activityConsole };
};

const getStockElements = () => {
  const stockContainerEntries = Object.entries(stockIDs).map(getStockElement);
  return Object.fromEntries(stockContainerEntries);
};

const getPlayerElements = () => {
  const players = document.querySelector("#players");
  return [...players.children].map(player => ({
    player,
    name: player.querySelector(".name"),
    avatar: player.querySelector(".avatar"),
  }));
};

const getCorporation = id => document.getElementById(id);
const getBoard = () => document.querySelectorAll(".space");
const getInfoIcon = () => document.querySelector("#info-icon");
const getInfoCard = () => document.querySelector("#info-card");
const getInfoCloseBtn = () => document.querySelector("#info-close-btn");
const getTileContainer = () => document.querySelector("#tile-container");
const getTileSection = () => document.querySelector(".tiles");
const getTileElements = () => {
  const tileContainer = getTileContainer();
  return Array.from(tileContainer.children);
};

const getHistoryPane = () => document.querySelector("#history-pane");
const getHistoryButton = () => document.querySelector("#history-button");

const setupHistory = () => {
  const historyButton = getHistoryButton();
  const historyPane = getHistoryPane();

  historyButton.onclick = () => {
    historyPane.classList.toggle("expanded");
    const isExpanded = historyPane.classList.contains("expanded");
    historyButton.value = isExpanded ? "Close" : "Previous Turn";
  };
};

const setupToggleDetails = () => {
  const toggleButton = document.querySelector("#toggle-details-btn");
  const portfolioSection = document.querySelector("#portfolio-section");

  if (toggleButton && portfolioSection) {
    let isHidden = false;

    toggleButton.onclick = () => {
      isHidden = !isHidden;

      if (isHidden) {
        portfolioSection.classList.add("hide-details");
        toggleButton.classList.add("active");
        toggleButton.textContent = "🙈"; // Hidden state
        toggleButton.title = "Show Details";
      } else {
        portfolioSection.classList.remove("hide-details");
        toggleButton.classList.remove("active");
        toggleButton.textContent = "👁️"; // Visible state
        toggleButton.title = "Hide Details";
      }
    };
  }
};

const getBalanceContainer = () => document.querySelector("#balance-container");

const getCorporations = () => document.querySelector("#corporations");

const establishCorporation = (data) => {
  const gameId = window.location.pathname.split("/").pop();
  fetch(`/game/${gameId}/establish`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  });
};

const roundToTwoDecimalPlaces = (value) => {
  return Math.round(value * 100) / 100;
}

const extractCorporationsFromPreviousTurn = (gameStatus) => {
  const { previousTurn } = gameStatus.turns;
  if (!previousTurn || !previousTurn.activities) return [];

  const corporationActivities = new Map();

  const addActivity = (corpName, activity) => {
    if (!corporationActivities.has(corpName)) {
      corporationActivities.set(corpName, new Map());
    }
    const corpActivities = corporationActivities.get(corpName);
    const count = corpActivities.get(activity) || 0;
    corpActivities.set(activity, count + 1);
  };

  previousTurn.activities.forEach(({ id, data }) => {
    if (!data) return;

    switch (id) {
      case ACTIVITIES.establish:
        if (data.name) {
          addActivity(data.name, "FOUNDED");
        }
        break;

      case ACTIVITIES.buyStocks:
        if (Array.isArray(data)) {
          data.forEach(corpName => {
            addActivity(corpName, "BOUGHT");
          });
        }
        break;

      case ACTIVITIES.merge:
        if (data.acquirer) {
          addActivity(data.acquirer, "ACQUIRED");
        }
        if (data.defunct) {
          addActivity(data.defunct, "MERGED");
        }
        break;

      case ACTIVITIES.mergeConflict:
        if (Array.isArray(data)) {
          data.forEach(corpName => {
            addActivity(corpName, "CONFLICT");
          });
        }
        break;

      case ACTIVITIES.acquirerSelection:
        if (Array.isArray(data)) {
          data.forEach(corpName => {
            addActivity(corpName, "ACQUIRER?");
          });
        }
        break;

      case ACTIVITIES.defunctSelection:
        if (Array.isArray(data)) {
          data.forEach(corpName => {
            addActivity(corpName, "DEFUNCT?");
          });
        }
        break;
    }
  });

  return corporationActivities;
};

const highlightPreviousTurnCorporations = (corporationActivities) => {
  // Remove previous highlights
  previousTurnCorporations.forEach(corpName => {
    const corp = getCorporation(corpName);
    if (corp) {
      corp.classList.remove("previous-turn-highlight");
      corp.removeAttribute("data-activity");
      // Remove any existing activity badges
      const existingBadges = corp.querySelectorAll(".activity-badge");
      existingBadges.forEach(badge => badge.remove());
    }
  });

  // Add new highlights
  corporationActivities.forEach((activities, corpName) => {
    const corp = getCorporation(corpName);
    if (corp) {
      corp.classList.add("previous-turn-highlight");

      // Create badges for each unique activity with counts - positioned vertically in top-right corner
      let badgeIndex = 0;
      activities.forEach((count, activity) => {
        const badge = document.createElement("div");
        badge.className = "activity-badge";

        // Show count if greater than 1
        const displayText = count > 1 ? `${activity} x${count}` : activity;
        badge.textContent = displayText;
        badge.setAttribute("data-activity", activity);
        badge.style.top = `${2 + (badgeIndex * 18)}px`;
        badge.style.right = "2px";
        corp.appendChild(badge);
        badgeIndex++;
      });
    }
  });

  previousTurnCorporations = Array.from(corporationActivities.keys());

  // Auto-remove highlights after 8 seconds
  setTimeout(() => {
    corporationActivities.forEach((_, corpName) => {
      const corp = getCorporation(corpName);
      if (corp) {
        corp.classList.remove("previous-turn-highlight");
        corp.removeAttribute("data-activity");
        const badges = corp.querySelectorAll(".activity-badge");
        badges.forEach(badge => badge.remove());
      }
    });
    previousTurnCorporations = [];
  }, 8000);
};

const renderCorporations = ({ corporations }) => {
  Object.entries(corporations).forEach(([name, stats]) => {
    const corporation = getCorporation(name);

    if (stats.isSafe) corporation.classList.add("safe");

    const priceElement = corporation.querySelector(".price");
    const currentPrice = roundToTwoDecimalPlaces(stats.price);
    const previousPrice = previousPrices[name];

    // Add price change indicator
    if (previousPrice !== undefined && previousPrice !== currentPrice) {
      const changeClass = currentPrice > previousPrice ? 'price-up' : 'price-down';
      priceElement.classList.remove('price-up', 'price-down');
      priceElement.classList.add(changeClass);

      // Remove the class after animation
      setTimeout(() => {
        priceElement.classList.remove(changeClass);
      }, 2000);
    }

    priceElement.innerText = `$${currentPrice}`;
    corporation.querySelector(".size").innerText = stats.size;
    corporation.querySelector(".stocks").innerText = stats.stocks;

    // Store current price for next comparison
    previousPrices[name] = currentPrice;
  });
};

const fillSpace = (position, corpClass) => {
  const board = getBoard();
  const tileId = position.x * 12 + position.y;
  const tile = board[tileId];
  CORPORATIONS.forEach(corp => tile.classList.remove(corp));
  tile.classList.add(corpClass);
};

const disablePlayerTiles = () => {
  const tileContainer = getTileContainer();
  tileContainer.classList.add("disable-click");
  getTileSection().classList.remove("highlight-player-tile");
};

const setUpTiles = ({ position }) => {
  const gameId = window.location.pathname.split("/").pop();
  fetch(`/game/${gameId}/tile`, {
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

const addVisualAttribute = (tileElement, { isPlaced }) => {
  tileElement.classList.remove("unplayable-tile");
  if (isPlaced) tileElement.classList.add("used-tile");
};

const getBoardTile = position => {
  const board = getBoard();
  const tileId = position.x * 12 + position.y;
  return board[tileId];
};

const highlightTile = tile => {
  const onBoardTile = getBoardTile(tile.position);
  onBoardTile.classList.add("highlight");
};

const removeHighlight = tile => {
  const onBoardTile = getBoardTile(tile.position);
  onBoardTile.classList.remove("highlight");
};

const highlightAllTiles = (hoveredTile) => {
  currentTiles.forEach(tile => {
    if (!tile) return;
    const onBoardTile = getBoardTile(tile.position);
    if (tile === hoveredTile) {
      onBoardTile.classList.add("highlight-active");
    } else {
      onBoardTile.classList.add("highlight");
    }
  });
};

const removeAllHighlights = () => {
  currentTiles.forEach(tile => {
    if (!tile) return;
    const onBoardTile = getBoardTile(tile.position);
    onBoardTile.classList.remove("highlight", "highlight-active");
  });
};

const setUpHoverEventForTiles = (tiles, isMyTurn = true) => {
  const tileContainer = getTileContainer();

  // Store current tiles globally so hover always works
  currentTiles = tiles.filter(tile => tile);

  // Remove any existing event listeners to avoid duplicates
  tileContainer.onmouseover = null;
  tileContainer.onmouseleave = null;

  // Remove old individual tile listeners
  const tileElements = getTileElements();
  tileElements.forEach(tileElement => {
    tileElement.onmouseenter = null;
    tileElement.onmouseleave = null;
  });

  // Set up individual tile hover events - use original tiles array to maintain correct indices
  tiles.forEach((tile, index) => {
    const tileElement = tileElements[index];
    if (!tileElement || !tile) return;

    // Always allow hover events, but conditionally allow clicks
    if (isMyTurn) {
      tileElement.style.pointerEvents = "auto";
    } else {
      // Allow hover but prevent clicks by using a custom approach
      tileElement.style.pointerEvents = "auto";
      tileElement.style.cursor = "default";
    }

    tileElement.onmouseenter = () => {
      highlightAllTiles(tile);
      tileElement.classList.add("tile-hover");
    };

    tileElement.onmouseleave = () => {
      removeAllHighlights();
      tileElement.classList.remove("tile-hover");
    };
  });
};

const displayAndSetupAccountTiles = gameStatus => {
  const { tiles } = gameStatus.portfolio;
  const { players } = gameStatus;
  const tileElements = getTileElements();

  // Check if it's the current player's turn
  const self = players.find(({ you }) => you);
  const currentPlayer = players.find(({ isTakingTurn }) => isTakingTurn);
  const isMyTurn = self && currentPlayer && self.username === currentPlayer.username;

  setUpHoverEventForTiles(tiles.filter(tile => tile), isMyTurn);

  tiles.forEach((tile, tileID) => {
    const tileElement = tileElements[tileID];
    if (!tile) {
      tileElement.innerText = "";
      tileElement.classList.add("used-tile");
      tileElement.classList.remove("unplayable-tile");
      return;
    }

    displayTile(tileElement, tile.position);
    addVisualAttribute(tileElement, tile);

    // Only attach click listener if it's the player's turn
    if (isMyTurn) {
      attachListener(tileElement, tile);
      tileElement.style.cursor = "pointer";
    } else {
      // Remove any existing click listener and disable clicking
      tileElement.onclick = null;
      tileElement.style.cursor = "default";
    }

    if (tile.exchange === "yes") {
      tileElement.onclick = () => { };
      tileElement.classList.add("unplayable-tile");
    }
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

const displayPlayerProfile = gameStatus => {
  displayAndSetupAccountTiles(gameStatus);
};

const animateTile = (position, transitionType, duration = 1000) => {
  const board = getBoard();
  const tileId = position.x * 12 + position.y;
  const tile = board[tileId];

  tile.classList.add(transitionType);
  return new Promise((res) => {
    setTimeout(() => {
      tile.classList.remove(transitionType);
      res();
    }, duration);
  });
};

const renderBoard = ({ placedTiles }) => {
  const newTilePlaced = placedTiles.at(-1);

  animateTile(newTilePlaced.position, "new-tile")
    .then(() => {
      placedTiles.forEach(({ position, belongsTo }) => fillSpace(position, belongsTo));
    });
};

const isSamePlayer = (self, currentPlayer) =>
  self.username === currentPlayer.username;

const setupCorporationSelection = ({ players, corporations, state }) => {
  const self = players.find(({ you }) => you);
  const currentPlayer = players.find(({ isTakingTurn }) => isTakingTurn);
  const isInCorrectState = state === "establish-corporation";
  const corporationsContainer = getCorporations();

  if (!(isSamePlayer(self, currentPlayer) && isInCorrectState)) {
    corporationsContainer.classList.remove("selectable");
    [...document.querySelectorAll(".corporation")].forEach(corp =>
      corp.classList.add("non-selectable")
    );
    return;
  }

  corporationsContainer.classList.add("selectable");

  Object.entries(corporations)
    .filter(([, corp]) => !corp.isActive)
    .map(([name]) => {
      const corp = getCorporation(name);

      corp.onclick = () => {
        establishCorporation({ name });
        corporationsContainer.classList.remove("selectable");
      };
      return corp;
    })
    .forEach(corp => corp.classList.remove("non-selectable"));
};

const notifyGameEnd = () => {
  const activityConsole = document.querySelector("#activity-console");
  const gameEndElement = generateComponent([
    "div",
    [
      ["p", "Game Over"],
      ["button", "Stats", { onclick: "getGameResult()" }],
    ],
    { class: "game-over flex" },
  ]);

  getGameResult();
  activityConsole.innerHTML = "";
  activityConsole.append(gameEndElement);
};

const renderOnStatusUpdate = (gameStatus) => {
  if (previousState === gameStatus.state && gameStatus.state !== "merge")
    return;

  if (gameStatus.state === "game-end") {
    notifyGameEnd();
    displayPlayerProfile(gameStatus);
    previousState = gameStatus.state;
    return;
  }

  displayPlayerProfile(gameStatus, previousState);
  renderBoard(gameStatus);
  renderCorporations(gameStatus);

  // Highlight corporations from previous turn
  const previousTurnCorps = extractCorporationsFromPreviousTurn(gameStatus);
  highlightPreviousTurnCorporations(previousTurnCorps);

  previousState = gameStatus.state;
};

const flash = (element, time = 500) => {
  element.classList.add("flash");
  setTimeout(() => {
    element.classList.remove("flash");
  }, time);
};

const renderTilePlaceView = (_, activityConsole) => {
  activityConsole.innerText = "Place a tile ...";
  getTileContainer().classList.remove("disable-click");
  getTileSection().classList.add("highlight-player-tile");
};

const renderEstablishCorporationView = ({ corporations }, activityConsole) => {
  activityConsole.innerText = "Select a corporation to establish...";
  const corporationsContainer = getCorporations();
  corporationsContainer.classList.add("selectable");

  Object.entries(corporations)
    .filter(([, corp]) => !corp.isActive)
    .map(([name]) => {
      const corp = getCorporation(name);

      corp.onclick = () => {
        establishCorporation({ name });
        corporationsContainer.classList.remove("selectable");
        [...corporationsContainer.children].forEach(c =>
          c.classList.add("non-selectable")
        );
      };
      return corp;
    })
    .forEach(corp => corp.classList.remove("non-selectable"));
};

const createStock = corp => {
  return ["div", "", { class: `stock ${corp}` }];
};

export const createCard = (label, body = "", type = "pending") => {
  return generateComponent([
    "div",
    [
      ["div", label, { class: "label" }],
      ["div", body, { class: "body" }],
    ],
    { class: `card ${type}` },
  ]);
};

const createCorpIcon = corp => {
  return ["div", "", { class: `corp-icon ${corp}` }];
};

const createDealIcon = (type, quantity) => {
  return [
    "div",
    [
      ["div", "", { class: `${type}-icon` }],
      ["div", quantity],
    ],
    { class: `${type}-defunct-box` },
  ];
};

const createBonusTable = ({ majority, minority }) => {
  const bonusTable = generateComponent([
    "div",
    [
      [
        "div",
        [
          ["h5", "Majority"],
          ["h5", `$${roundToTwoDecimalPlaces(majority.bonus)}`],
          ...majority.players.map(name => ["p", name]),
        ],
      ],
      [
        "div",
        [
          ["h5", "Minority"],
          ["h5", `$${roundToTwoDecimalPlaces(minority.bonus)}`],
          ...minority.players.map(name => ["p", name]),
        ],
      ],
    ],
    { class: "flex bonus-table" },
  ]);

  return bonusTable;
};

const PENDING_CARD_GENERATORS = {
  [ACTIVITIES.tilePlace]: () => {
    return createCard("TILE");
  },

  [ACTIVITIES.establish]: () => {
    return createCard("FOUNDED");
  },

  [ACTIVITIES.buyStocks]: () => {
    return createCard("PURCHASED");
  },

  [ACTIVITIES.merge]: ({ acquirer, defunct }) => {
    return createCard("MERGING");

    // return createCard("MERGING", `${acquirer} >> ${defunct}`);
  },

  // [ACTIVITIES.mergeConflict]: equalCorporations => {
  //   return createCard("MERGING", `${acquirer} = ${defunct}`);
  // },
};

const createMergerTieCard = (corporations, label) => {
  const corpIcons = corporations.map(corpName => createCorpIcon(corpName));

  const mergingCard = createCard(
    label,
    [["div", corpIcons, { class: "merger" }]],
    "done"
  );

  if (corpIcons.length > 2) {
    mergingCard.classList.add("extra-width-card");
  }

  return mergingCard;
};

const CARD_GENERATORS = {
  [ACTIVITIES.tilePlace]: tile => {
    return createCard(
      "placed",
      [["div", getTile(tile.position), { class: "tile" }]],
      "done"
    );
  },

  [ACTIVITIES.establish]: corporation => {
    return createCard("founded", [createCorpIcon(corporation.name)], "done");
  },

  [ACTIVITIES.buyStocks]: stocks => {
    return createCard(
      "purchased",
      [["div", stocks.map(createStock), { class: "stocks-purchased" }]],
      "done"
    );
  },

  [ACTIVITIES.acquirerSelection]: potentialAcquirers =>
    createMergerTieCard(potentialAcquirers, "acquirer tie"),

  [ACTIVITIES.defunctSelection]: potentialDefunct =>
    createMergerTieCard(potentialDefunct, "defunct tie"),

  [ACTIVITIES.merge]: ({ acquirer, defunct, majority, minority, turns }) => {
    const mergeDiv = generateComponent(["div", "", { class: "flex" }]);
    const mergingCard = createCard(
      "merging",
      [
        [
          "div",
          [createCorpIcon(acquirer), ["p", ">>"], createCorpIcon(defunct)],
          { class: "merger" },
        ],
      ],
      "done"
    );
    const bonusesCard = createBonusTable({ majority, minority });
    const turnCards = turns.map(({ player, sell, trade }) =>
      createCard(
        `${player}'s deal`,
        [createDealIcon("sell", sell), createDealIcon("trade", trade)],
        "done player-deal"
      )
    );

    mergeDiv.append(mergingCard, bonusesCard, ...turnCards);
    return mergeDiv;
  },

  [ACTIVITIES.mergeConflict]: equalCorporations => {
    const mergeDiv = generateComponent(["div", "", { class: "flex" }]);
    const mergingCard = createCard(
      "merge conflict",
      [
        [
          "div",
          [
            createCorpIcon(equalCorporations[0]),
            ["p", "="],
            createCorpIcon(equalCorporations[1]),
          ],
          { class: "merger" },
        ],
      ],
      "done"
    );

    return mergingCard;
  },
};

const ACTIVE_VIEW_RENDERERS = {
  [ACTIVITIES.tilePlace]: renderTilePlaceView,
  [ACTIVITIES.buyStocks]: startPurchase,
  [ACTIVITIES.establish]: renderEstablishCorporationView,
  [ACTIVITIES.merge]: renderMerge,
  [ACTIVITIES.mergeConflict]: resolveMergeConflict,
  [ACTIVITIES.acquirerSelection]: selectAcquirer,
  [ACTIVITIES.defunctSelection]: selectDefunct,
};

const createComponents = gameStatus => {
  const { players, portfolio } = gameStatus;
  const balanceContainer = getBalanceContainer();
  const amountElement = balanceContainer.querySelector(".amount");
  const stockElements = getStockElements();
  const playerElements = getPlayerElements();
  const flashBalance = () => flash(balanceContainer);
  const flashStock = corp => flash(stockElements[corp].card);

  const displayPanelElement = getDisplayPanelElement();
  const renderers = ACTIVE_VIEW_RENDERERS;
  const cardGenerators = {
    done: CARD_GENERATORS,
    pending: PENDING_CARD_GENERATORS,
  };

  return {
    balance: new Balance(amountElement, flashBalance, portfolio.balance),
    stocks: new Stocks(stockElements, flashStock, portfolio.stocks),
    players: new Players(playerElements, players),
    displayPanel: new DisplayPanel(
      displayPanelElement,
      gameStatus,
      renderers,
      cardGenerators
    ),
  };
};

const setupGame = () => {
  setupInfoCard();
  setupToggleDetails();
  const gameId = window.location.pathname.split("/").pop();
  const gameGateway = new GameGateway(`/game/${gameId}`);

  return gameGateway.getStatus().then(gameStatus => {
    displayPlayerProfile(gameStatus);
    renderBoard(gameStatus);
    // displayInitialMessages(gameStatus);
    renderCorporations(gameStatus);
    setupCorporationSelection(gameStatus);

    // Highlight corporations from previous turn on initial load
    const previousTurnCorps = extractCorporationsFromPreviousTurn(gameStatus);
    highlightPreviousTurnCorporations(previousTurnCorps);

    const components = createComponents(gameStatus);
    const gameService = new GameService(components);

    return gameService;
  });
};

const keepGameUpdatedOnEvent = (gameService) => {
  const socket = io();
  const gameId = window.location.pathname.split("/").pop();
  socket.emit("registerGameStatus", { gameId });

  socket.on("gameStatus", (status) => {
    renderOnStatusUpdate(status);
    gameService.render(status);
  });
}

const keepPlayerProfileUpdated = async () => {
  setupGame().then(keepGameUpdatedOnEvent);

  setupHistory();
  setupToggleDetails();
};

window.onload = keepPlayerProfileUpdated;
