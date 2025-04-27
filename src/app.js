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

const createApp = (lobbyRouter, gameRouter, context) => {
  const app = express();

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

  return app;
};

module.exports = { createApp };
