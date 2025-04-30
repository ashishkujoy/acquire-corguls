const express = require("express");
const cookieParser = require("cookie-parser");
const { logRequest } = require("./middleware/logger");
const { authorize } = require("./middleware/auth");
const { loginUser } = require("./routers/auth-router");
const { setupLobbyWebsocketEvents } = require("./routers/lobby-router");
const { setupGameEventRoutes } = require("./routers/game-router");

const serveHomePage = (_, res) => {
  res.sendFile("index.html", { root: "pages" });
};

const serveJoinOrHostPage = (_, res) => {
  res.sendFile("host-join.html", { root: "pages" });
}

const createApp = (lobbyRouter, gameRouter, context, preapp) => {
  const app = preapp || express();

  app.context = context;

  app.use(logRequest);
  app.use(express.json());
  app.use(cookieParser());
  app.use("/whoami", (req, res) => {
    const { username } = req.cookies;
    if (username) {
      res.json({ username });
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });
  app.get("/", serveHomePage);
  app.post("/login", loginUser)
  app.get("/joinorhost", authorize, serveJoinOrHostPage);
  app.use("/lobby", lobbyRouter);
  app.use("/game", gameRouter);

  app.use(express.static("public"));

  setupEventRoutes(context);

  return app;
};
const cookiePar = cookieParser();

const socketSessionMiddleware = (socket, next) => {
  const req = socket.request;
  cookiePar(req, {}, (err) => {
    if (err) {
      return next(err);
    }
    socket.username = req.cookies.username;
    next();
  });
};

const setupEventRoutes = (context) => {
  const { io } = context;
  // quick hack to keep existing test passing.
  // TODO: remove this when we know testing socket.io works
  if (!io) {
    return;
  }
  io.use(socketSessionMiddleware);

  io.on("connection", (socket) => {
    setupLobbyWebsocketEvents(context, socket);
    setupGameEventRoutes(context, socket)
  });
};

module.exports = { createApp };
