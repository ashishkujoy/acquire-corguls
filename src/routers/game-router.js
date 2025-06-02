const express = require("express");
const { authorizeLobbyMember } = require("../middleware/lobby");

const USE_SIMPLE_AUTH = process.env.USE_SIMPLE_AUTH === "true";

const getUserFromRequest = (req) => {
  if (USE_SIMPLE_AUTH) {
    return { username: req.cookies.username };
  }
  return req.user;
};

const serveGameStats = (req, res) => {
  const { game } = req.app.context;
  const user = getUserFromRequest(req);
  const { username } = user;
  res.send(game.status(username));
};

const serveGamePage = (_, res) => {
  res.sendFile("game.html", { root: "pages" });
};

const updateClients = (game, io) => {
  game.statusForAll()
    .forEach(status => {
      const roomId = `${status.id}_${status.username}`;
      io.to(roomId).emit("gameStatus", status);
    });
};

const placeTile = (req, res) => {
  const { game } = req.app.context;
  const user = getUserFromRequest(req);
  const { username } = user;
  const tile = req.body;

  game.placeTile(username, tile);
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const endPlayerTurn = (req, res) => {
  const { game } = req.app.context;
  game.changeTurn();
  res.end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const gameResult = (req, res) => {
  const { game } = req.app.context;
  res.json(game.result);
};

const buyStocks = (req, res) => {
  const { game } = req.app.context;
  const stocks = req.body;

  game.buyStocks(stocks);
  res.end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const establishCorporation = (req, res) => {
  const { game } = req.app.context;
  const { name } = req.body;

  game.establishCorporation({ name });
  res.end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const verifyStart = (req, res, next) => {
  const lobby = getLobby(req);
  const { isPossibleToStartGame } = lobby.status();

  if (!isPossibleToStartGame) {
    res.redirect("/lobby");
    return;
  }

  next();
};

const getLobby = (req) => {
  const { id } = req.params;
  return req.app.context.lobbyManager.findById(id);
};

const startGame = (req, res) => {
  const lobby = getLobby(req);
  const user = getUserFromRequest(req);
  const { username } = user;
  const game = req.app.context.gameManager.createGame(lobby);
  req.app.context.game = game;
  game.start();
  lobby.expire();
  const status = lobby.status(username);
  if (req.app.context.io) {
    console.log("Emitting lobby update", status.id);
    req.app.context.io.to(status.id).emit("lobbyupdate", status);
  }
  res.end();
};

const verifyHost = (req, res, next) => {
  const user = getUserFromRequest(req);
  const { username } = user;
  const lobby = getLobby(req);
  const { self, host } = lobby.status(username);

  if (self.username !== host.username) {
    const error = "Invalid request !";
    return res.status(400).json({ error });
  }

  next();
};

const configureGame = (req, res) => {
  const gameData = req.body;
  const { id } = req.params;
  const game = req.app.context.gameManager.load(id, gameData);
  req.app.context.game = game;
  res.status(201).end();
};

const endMerge = (req, res) => {
  const { game } = req.app.context;
  game.endMerge();
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const endMergerTurn = (req, res) => {
  const { game } = req.app.context;
  game.endMergerTurn();
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const dealDefunctStocks = (req, res) => {
  const { game } = req.app.context;
  const { sell, trade } = req.body;

  game.dealDefunctStocks({ sell, trade });
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const resolveConflict = (req, res) => {
  const { game } = req.app.context;
  game.mergeTwoCorporation(req.body);
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const validatePlayer = (req, res, next) => {
  const { game } = req.app.context;
  const user = getUserFromRequest(req);
  const { username } = user;
  const currentPlayerName = game.currentPlayerName();
  if (username === currentPlayerName) return next();
  res.status(400).end();
};

const selectAcquirer = (req, res) => {
  const { game } = req.app.context;
  const { acquirer } = req.body;
  game.selectAcquirer(acquirer);
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const confirmDefunct = (req, res) => {
  const { game } = req.app.context;
  const { defunct } = req.body;
  game.confirmDefunct(defunct);
  res.status(200).end();
  if (req.app.context.io) {
    updateClients(game, req.app.context.io);
  }
};

const extractGame = (req, res, next) => {
  const { id } = req.params;
  const game = req.app.context.gameManager.findById(id);
  if (!game) {
    res.status(404);
    return res.json({ message: `Game Not found: ${id}` });
  }

  req.app.context.game = game;
  return next();
};

const setupGameEventRoutes = (context, socket) => {
  socket.on("registerGameStatus", ({ gameId }) => {
    const game = context.gameManager.findById(gameId);
    const username = decodeURIComponent(socket.username);
    if (!game) {
      socket.emit("error", { message: `Game Not found: ${gameId}` });
      return;
    }
    const roomId = `${gameId}_${username}`;
    socket.join(roomId);
    context.io.to(roomId).emit("gameStatus", game.status(username));
  });
};

const createGameRouter = () => {
  const router = new express.Router();

  router.post("/:id/test", configureGame);
  router.use(["/:id", "/:id/*"], authorizeLobbyMember);
  router.get("/:id", verifyStart, serveGamePage);
  router.post("/:id/start", verifyHost, verifyStart, startGame);
  router.use(["/:id", "/:id/*"], extractGame);
  router.get("/:id/status", serveGameStats);
  router.post("/:id/tile", validatePlayer, placeTile);
  router.post("/:id/end-turn", validatePlayer, endPlayerTurn);
  router.post("/:id/merger/deal", validatePlayer, dealDefunctStocks);
  router.post("/:id/merger/end-turn", validatePlayer, endMergerTurn);
  router.post("/:id/merger/resolve-conflict", validatePlayer, resolveConflict); // {acquirer, defunct}

  router.post("/:id/merger/resolve-acquirer", validatePlayer, selectAcquirer); // {acquirer}
  router.post("/:id/merger/confirm-defunct", validatePlayer, confirmDefunct); // {defunct}

  router.get("/:id/end-result", gameResult);
  router.post("/:id/buy-stocks", validatePlayer, buyStocks);
  router.post("/:id/establish", validatePlayer, establishCorporation);
  router.post("/:id/end-merge", endMerge);

  return router;
};

module.exports = {
  createGameRouter,
  setupGameEventRoutes,
};
