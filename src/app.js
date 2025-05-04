const express = require("express");
const cookieParser = require("cookie-parser");
const { logRequest } = require("./middleware/logger");
const { authorize } = require("./middleware/auth");
const { createAuthRouter } = require("./routers/auth-router");
const { setupLobbyWebsocketEvents } = require("./routers/lobby-router");
const { setupGameEventRoutes } = require("./routers/game-router");

const serveHomePage = (req, res) => {
  const location = req.isAuthenticated() ? "/joinorhost" : "/login"
  res.redirect(location);
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
  if (process.env.PROD) {
    app.use(createAuthRouter());
  }
  app.get("/", serveHomePage);

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
    if (req.user) {
      socket.username = req.user.username;
    }
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
