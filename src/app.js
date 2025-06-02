const express = require("express");
const cookieParser = require("cookie-parser");
const { logRequest } = require("./middleware/logger");
const { authorize } = require("./middleware/auth");
const { createAuthRouter } = require("./routers/auth-router");
const { setupLobbyWebsocketEvents } = require("./routers/lobby-router");
const { setupGameEventRoutes } = require("./routers/game-router");
const passport = require("passport");
const session = require("express-session");

const USE_SIMPLE_AUTH = process.env.USE_SIMPLE_AUTH === "true";

const serveHomePage = (req, res) => {
  const isAuthenticated = USE_SIMPLE_AUTH ?
    req.cookies.username :
    req.isAuthenticated();
  console.log("isAuthenticated", isAuthenticated);
  const location = isAuthenticated ? "/joinorhost" : "/login";
  res.redirect(location);
};

const serveJoinOrHostPage = (_, res) => {
  res.sendFile("host-join.html", { root: "pages" });
};

const sessionMiddleware = session({
  secret: process.env["SESSION_KEY"] || "keyboard cat",
  resave: false,
  saveUninitialized: false,
});

const createApp = (lobbyRouter, gameRouter, context, preapp) => {
  const app = preapp || express();

  app.context = context;

  if (!USE_SIMPLE_AUTH) {
    app.use(sessionMiddleware);
  }

  app.use(logRequest);
  app.use(express.json());
  app.use(cookieParser());
  app.use(createAuthRouter());
  app.get("/", serveHomePage);

  app.get("/joinorhost", authorize, serveJoinOrHostPage);
  app.use("/lobby", lobbyRouter);
  app.use("/game", gameRouter);
  app.get("/user", (req, res) => {
    if (USE_SIMPLE_AUTH) {
      return res.json({ username: req.cookies.username });
    }
    return res.json(req.user);
  });

  app.use(express.static("public"));

  setupEventRoutes(context);

  return app;
};

const handleUserAuthentication = (req, next) => {
  if (!req.session || !req.session.passport || !req.session.passport.user) {
    return next(new Error("Unauthorized"));
  }

  passport.deserializeUser(req.session.passport.user, (err, user) => {
    if (err) {
      console.log("Got error in deserialize user");
      return next(err);
    }
    if (!user) {
      console.log("User not found in session");
      return next(new Error("User not found"));
    }
    console.log("Found user in session", user);
    req.user = user;
    return { user };
  });
};

const socketSessionMiddleware = (socket, next) => {
  if (USE_SIMPLE_AUTH) {
    // Simple auth: get username from cookie
    const cookies = socket.handshake.headers.cookie;
    if (!cookies) {
      return next(new Error("No cookies found"));
    }

    const usernameCookie = cookies.split(";").find(c => c.trim().startsWith("username="));
    if (!usernameCookie) {
      return next(new Error("Username cookie not found"));
    }

    const username = usernameCookie.split("=")[1];
    socket.user = { username };
    socket.username = username;
    return next();
  }

  // OAuth authentication
  const req = socket.request;
  const res = {};
  sessionMiddleware(req, res, () => {
    try {
      const result = handleUserAuthentication(req, next);
      if (result && result.user) {
        socket.user = result.user;
        socket.username = result.user.username;
        next();
      }
    } catch (err) {
      next(err);
    }
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
    setupGameEventRoutes(context, socket);
  });
};

module.exports = { createApp };
