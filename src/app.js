const express = require("express");
const cookieParser = require("cookie-parser");
const { logRequest } = require("./middleware/logger");
const { authorize } = require("./middleware/auth");
const { createAuthRouter } = require("./routers/auth-router");
const { setupLobbyWebsocketEvents } = require("./routers/lobby-router");
const { setupGameEventRoutes } = require("./routers/game-router");
const passport = require("passport");
const session = require('express-session');

const serveHomePage = (req, res) => {
  const location = req.isAuthenticated() ? "/joinorhost" : "/login"
  res.redirect(location);
};

const serveJoinOrHostPage = (_, res) => {
  res.sendFile("host-join.html", { root: "pages" });
}

const sessionMiddleware = session({
  secret: process.env['SESSION_KEY'] || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
});

const createApp = (lobbyRouter, gameRouter, context, preapp) => {
  const app = preapp || express();

  app.context = context;
  app.use(sessionMiddleware);
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
  app.get("/user", (req, res) => {
    return res.json(req.user);
  });

  app.use(express.static("public"));

  setupEventRoutes(context);

  return app;
};
const cookiePar = cookieParser();

const socketSessionMiddleware = (socket, next) => {
  const req = socket.request;
  const res = {};
  sessionMiddleware(req, res, async () => {
    if (!req.session || !req.session.passport || !req.session.passport.user) {
      console.log("No session, no passport in session or no user in session passport");
      return next(new Error("Unauthorized"));
    }

    try {
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
        socket.user = user;
        next();
      });
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
    setupGameEventRoutes(context, socket)
  });
};

module.exports = { createApp };
