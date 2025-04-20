const express = require("express");
const { authorizeLobbyMember } = require("../middleware/lobby");

const serveGameStats = (req, res) => {
  const { game } = req.app.context;
  const { username } = req.cookies;
  res.send(game.status(username));
};

const serveGamePage = (_, res) => {
  res.sendFile("game.html", { root: "pages" });
};

const placeTile = (req, res) => {
  const { game } = req.app.context;
  const { username } = req.cookies;
  const tile = req.body;

  game.placeTile(username, tile);
  res.status(200).end();
};

const endPlayerTurn = (req, res) => {
  const { game } = req.app.context;
  game.changeTurn();
  res.end();
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
};

const establishCorporation = (req, res) => {
  const { game } = req.app.context;
  const { name } = req.body;

  game.establishCorporation({ name });
  res.end();
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
  return req.app.context.lobbyManager.findById(0);
};

const startGame = (req, res) => {
  const lobby = getLobby(req);

  const game = req.app.context.gameManager.createGame(lobby);
  req.app.context.game = game;
  game.start();
  lobby.expire();
  res.end();
};

const verifyHost = (req, res, next) => {
  const { username } = req.cookies;
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
};

const endMergerTurn = (req, res) => {
  const { game } = req.app.context;
  game.endMergerTurn();
  res.status(200).end();
};

const dealDefunctStocks = (req, res) => {
  const { game } = req.app.context;
  const { sell, trade } = req.body;

  game.dealDefunctStocks({ sell, trade });
  res.status(200).end();
};

const resolveConflict = (req, res) => {
  const { game } = req.app.context;
  game.mergeTwoCorporation(req.body);
  res.status(200).end();
};

const validatePlayer = (req, res, next) => {
  const { game } = req.app.context;
  const { username } = req.cookies;
  const currentPlayerName = game.currentPlayerName();
  if (username === currentPlayerName) return next();
  res.status(400).end();
};

const selectAcquirer = (req, res) => {
  const { game } = req.app.context;
  const { acquirer } = req.body;
  game.selectAcquirer(acquirer);
  res.status(200).end();
};

const confirmDefunct = (req, res) => {
  const { game } = req.app.context;
  const { defunct } = req.body;
  game.confirmDefunct(defunct);
  res.status(200).end();
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
};
