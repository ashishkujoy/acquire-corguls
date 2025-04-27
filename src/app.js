const express = require("express");
const cookieParser = require("cookie-parser");
const { logRequest } = require("./middleware/logger");
const { authorize } = require("./middleware/auth");
const { loginUser } = require("./routers/auth-router");

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
    console.log("A user connected");
    socket.on("joinlobby", ({ lobbyId }) => {
      console.log("User joined lobby", lobbyId, socket.username);
      const { lobbyManager } = context;
      const lobby = lobbyManager.findById(lobbyId);
      socket.join(lobbyId);
      io.to(lobbyId).emit("lobbyupdate", lobby.status(socket.username));
    });
  });
};

module.exports = { createApp };
