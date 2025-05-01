const express = require("express");
const { authorize } = require("../middleware/auth");
const { authorizeLobbyMember } = require("../middleware/lobby");

const serveLobbyPage = (_, res) => {
  res.sendFile("lobby.html", { root: "pages" });
};

const doNotJoinIfLobbyIsFull = (req, res, next) => {
  const { lobby } = req.app.context;

  if (lobby.isFull()) {
    const error = "Lobby is full !";
    res.status(401).json({ error });
    return;
  }

  next();
};

const joinPlayer = (req, res) => {
  const { lobby } = req.app.context;
  const { username } = req.cookies;
  const { id } = req.params;

  lobby.addPlayer({ username });

  res.cookie("username", username).redirect(`/lobby/${id}`);
};

const sendLobbyStatus = (req, res) => {
  const { lobby } = req.app.context;
  const { username } = req.cookies;

  res.json(lobby.status(username));
};

const serveAvailableLobbies = (req, res) => {
  const { lobbyManager } = req.app.context;
  return res.json(lobbyManager.availableLobbies());
}

const createNewLobby = (req, res) => {
  const { name } = req.body;
  const size = { lowerLimit: 2, upperLimit: 6 };
  const { username } = req.cookies;
  const id = req.app.context.lobbyManager.createLobbyWithHost(size, name, username);

  res.json({ id, name });
}

const joinLobbyEvenHandler = (context, socket, data) => {
  const { lobbyManager, io } = context;
  const { lobbyId } = data;
  const lobby = lobbyManager.findById(lobbyId);
  socket.join(lobbyId);
  io.to(lobbyId).emit("lobbyupdate", lobby.status(socket.username));
}

const setupLobbyWebsocketEvents = (context, socket) => {
  if (!context.io) {
    return;
  }
  socket.on("joinlobby", (data) => joinLobbyEvenHandler(context, socket, data));
}

const extractLobby = (req, res, next) => {
  const { id } = req.params;
  const lobby = req.app.context.lobbyManager.findById(id);
  if (!lobby) {
    res.status(404);
    return res.json({ message: `Lobby Not Found: ${id}` });
  }
  req.app.context.lobby = lobby;
  return next();
}

const createLobbyRouter = () => {
  const router = new express.Router();
  router.get("/available", authorize, serveAvailableLobbies);
  router.post("/create", createNewLobby);

  router.use(["/:id", "/:id/*"], extractLobby);
  router.get("/:id", authorize, authorizeLobbyMember, serveLobbyPage);
  router.post("/:id/players", doNotJoinIfLobbyIsFull, joinPlayer);
  router.get("/:id/status", authorize, authorizeLobbyMember, sendLobbyStatus);

  return router;
};

module.exports = { createLobbyRouter, setupLobbyWebsocketEvents };
