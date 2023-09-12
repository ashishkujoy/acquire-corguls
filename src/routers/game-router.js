const express = require("express");
const { authorizeLobbyMember } = require("../middleware/lobby");

const servePlayerProfile = (req, res) => {
  const { player } = req.app.context;
  res.send(player.profile());
};

const serveGamePage = (_, res) => {
  res.sendFile("game.html", { root: "pages" });
};

const createGameRouter = () => {
  const router = new express.Router();

  router.get("/", authorizeLobbyMember, serveGamePage);
  router.get("/player-profile", authorizeLobbyMember, servePlayerProfile);

  return router;
};

module.exports = {
  createGameRouter,
};
