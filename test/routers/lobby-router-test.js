const assert = require("assert");
const express = require("express");
const request = require("supertest");
const { describe, it } = require("node:test");
const { createApp } = require("../../src/app");
const { createLobbyRouter } = require("../../src/routers/lobby-router");
const { createGameRouter } = require("../../src/routers/game-router");
const Lobby = require("../../src/models/lobby");
const LobbyManager = require("../../src/models/lobby-manager");
const sinon = require("sinon");
const cookieParser = require("cookie-parser");

const createTestApp = (loggedInUser = "player") => {
  const size = { lowerLimit: 3, upperLimit: 3 };
  const username = "player";
  const lobby = new Lobby("0", size);
  lobby.addPlayer({ username });
  const lobbyRouter = createLobbyRouter();
  const gameRouter = createGameRouter({});
  const lobbyManager = new LobbyManager({ 0: lobby });
  const app = express();

  app.use(cookieParser());
  app.use((req, _, next) => {
    const { username } = req.cookies;
    req.isAuthenticated = () => username === loggedInUser;
    req.user = { username };
    next();
  });
  createApp(lobbyRouter, gameRouter, { lobbyManager }, app);

  return { app, lobbyManager, username, lobby };
}


describe("GET /lobby/:id", () => {
  it("should serve the lobby page", async () => {
    const { app, username } = createTestApp();

    await request(app)
      .get("/lobby/0")
      .set("cookie", `username=${username}`)
      .expect(200)
      .expect("content-type", new RegExp("text/html"));
  });

  it("should not allow unauthorized access", async () => {
    const { app } = createTestApp();

    await request(app)
      .get("/lobby/0")
      .set("cookie", "username=abcd")
      .expect(302)
      .expect("location", "/login");
  });

  it("should not allow if player is not logged in", async () => {
    const { app } = createTestApp();

    await request(app)
      .get("/lobby/0")
      .set("cookie", "username=james")
      .expect(302)
      .expect("location", "/login");
  });

  it("should error on non existing lobby", async () => {
    const { app } = createTestApp();
    await request(app)
      .get("/lobby/1")
      .set("cookie", "username=abcd")
      .expect(404);
  });
});

describe("POST /lobby/:id/players", () => {
  it("should add the player in the lobby", async () => {
    const { app, lobbyManager, username } = createTestApp();
    const lobby = new Lobby("1", {}, "Foo");
    const findByIdStub = sinon.stub(lobbyManager, "findById");
    findByIdStub.returns(lobby);

    await request(app)
      .post("/lobby/1/players")
      .set("cookie", "username=player2")
      .send({ username })
      .expect(302)
      .expect("location", "/lobby/1");

    assert.deepStrictEqual(lobby.status().players, [{ username: "player2" }]);
  });

  it("should not add player if the lobby is full", async () => {
    const { app, lobby } = createTestApp();
    sinon.stub(lobby, "isFull").returns(true);

    await request(app)
      .post("/lobby/0/players")
      .expect(401)
      .expect({ error: "Lobby is full !" });
  });
});

describe("GET /lobby/:id/status", () => {
  it("should provide status of the game", async () => {
    const { app, username, lobby } = createTestApp();
    const player = { username };
    const expectedStatus = {
      id: "0",
      players: [player],
      isFull: false,
      hasExpired: false,
      isPossibleToStartGame: false,
      host: {},
      self: player,
    };

    sinon.stub(lobby, "status").returns(expectedStatus);

    await request(app)
      .get("/lobby/0/status")
      .set("cookie", "username=player")
      .expect(200)
      .expect("content-type", new RegExp("application/json"))
      .expect(expectedStatus);
  });

  it("should not allow if the player is not a member of the lobby", async () => {
    const { app } = createTestApp("player2");

    await request(app)
      .get("/lobby/0/status")
      .set("cookie", "username=player2")
      .expect(302)
      .expect("location", "/");
  });
});
