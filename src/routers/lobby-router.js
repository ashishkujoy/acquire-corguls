const express = require("express");
const { authorize } = require("../middleware/auth");
const { authorizeLobbyMember } = require("../middleware/lobby");

const USE_SIMPLE_AUTH = process.env.USE_SIMPLE_AUTH === "true";

const getUserFromRequest = (req) => {
  if (USE_SIMPLE_AUTH) {
    return { username: req.cookies.username };
  }
  return req.user;
};

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
  const user = getUserFromRequest(req);
  const { username } = user;
  const { id } = req.params;

  try {
    lobby.addPlayer({ username });
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.cookie("username", username).redirect(`/lobby/${id}`);
};

const sendLobbyStatus = (req, res) => {
  const { lobby } = req.app.context;
  const user = getUserFromRequest(req);
  const { username } = user;

  res.json(lobby.status(username));
};

const serveAvailableLobbies = (req, res) => {
  const { lobbyManager } = req.app.context;
  return res.json(lobbyManager.availableLobbies());
};

const createNewLobby = (req, res) => {
  const { name } = req.body;
  const size = { lowerLimit: 2, upperLimit: 6 };
  const user = getUserFromRequest(req);
  const { username } = user;
  const id = req.app.context.lobbyManager.createLobbyWithHost(size, name, username);

  res.json({ id, name });
};

const joinLobbyEvenHandler = (context, socket, data) => {
  const { lobbyManager, io } = context;
  const { lobbyId } = data;
  const lobby = lobbyManager.findById(lobbyId);
  socket.join(lobbyId);
  io.to(lobbyId).emit("lobbyupdate", lobby.status(socket.username));
};

const setupLobbyWebsocketEvents = (context, socket) => {
  if (!context.io) {
    return;
  }
  socket.on("joinlobby", (data) => {
    console.log("Got a join lobby request", data);
    return joinLobbyEvenHandler(context, socket, data);
  });
};

const extractLobby = (req, res, next) => {
  const { id } = req.params;
  const lobby = req.app.context.lobbyManager.findById(id);
  if (!lobby) {
    res.status(404);
    return res.json({ message: `Lobby Not Found: ${id}` });
  }
  req.app.context.lobby = lobby;
  return next();
};

const createLobbyRouter = () => {
  const router = new express.Router();
  router.get("/available", authorize, serveAvailableLobbies);
  router.post("/create", authorize, createNewLobby);

  router.use(["/:id", "/:id/*"], extractLobby);
  router.get("/:id", authorize, authorizeLobbyMember, serveLobbyPage);
  router.post("/:id/players", authorize, doNotJoinIfLobbyIsFull, joinPlayer);
  router.get("/:id/status", authorize, authorizeLobbyMember, sendLobbyStatus);

  return router;
};

module.exports = { createLobbyRouter, setupLobbyWebsocketEvents };
