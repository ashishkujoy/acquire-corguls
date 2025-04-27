const { shuffle } = require("lodash");
const Lobby = require("./src/models/lobby");
const { createApp } = require("./src/app");
const { createGameRouter } = require("./src/routers/game-router");
const { createLobbyRouter } = require("./src/routers/lobby-router");
const LobbyManager = require("./src/models/lobby-manager");
const GameManager = require("./src/models/game-manager");
const server = require("http");
const { Server } = require("socket.io");
const express = require("express");

const PORT = process.env.PORT || 8080;

const logServerInfo = () => {
  console.log("Listening on", PORT);
  console.log("Local:", `http://localhost:${PORT}`);
};

const setUpLobbyManager = () => {
  const size = { lowerLimit: 2, upperLimit: 6 };
  let id = 0;
  return new LobbyManager({ 0: new Lobby("0", size, "First Lobby") }, { generate: () => ++id });
};

const main = () => {
  const lobbyManager = setUpLobbyManager();
  const lobbyRouter = createLobbyRouter();
  const gameRouter = createGameRouter();
  const gameManager = new GameManager({}, shuffle);
  const app = express()
  const serverInstance = server.createServer(app);
  const io = new Server(serverInstance, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  const context = {
    lobbyManager,
    gameManager,
    shuffle,
    io,
  };
  createApp(lobbyRouter, gameRouter, context, app);
  serverInstance.listen(PORT, logServerInfo);
};

main();
