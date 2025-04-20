const { shuffle } = require("lodash");
const Lobby = require("./src/models/lobby");
const { createApp } = require("./src/app");
const { createGameRouter } = require("./src/routers/game-router");
const { createLobbyRouter } = require("./src/routers/lobby-router");
const LobbyManager = require("./src/models/lobby-manager");
const GameManager = require("./src/models/game-manager");

const PORT = process.env.PORT || 8080;

const logServerInfo = () => {
  console.log("Listening on", PORT);
  console.log("Local:", `http://localhost:${PORT}`);
};

const setUpLobbyManager = () => {
  const size = { lowerLimit: 2, upperLimit: 6 };
  let id = 0;
  return new LobbyManager({ 0: new Lobby("0", size) }, { generate: () => ++id });
};

const main = () => {
  const lobbyManager = setUpLobbyManager();
  const lobbyRouter = createLobbyRouter();
  const gameRouter = createGameRouter();
  const gameManager = new GameManager({}, shuffle);

  const app = createApp(lobbyRouter, gameRouter, { lobbyManager, shuffle, gameManager });
  app.listen(PORT, logServerInfo);
};

main();
