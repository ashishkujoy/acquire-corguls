const assert = require("assert");
const request = require("supertest");
const { describe, it } = require("node:test");
const { createApp } = require("../../src/app");
const { createLobbyRouter } = require("../../src/routers/lobby-router");
const { createGameRouter } = require("../../src/routers/game-router");
const Lobby = require("../../src/models/lobby");
const LobbyManager = require("../../src/models/lobby-manager");

describe.only("GET /lobby/:id", { only: true }, () => {
  it("should serve the lobby page", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const username = "player";
    const lobby = new Lobby("0", size);
    lobby.addPlayer({ username });
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter({});
    const lobbyManager = new LobbyManager({ 0: lobby });
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager });
    request(app)
      .get("/lobby/0")
      .set("cookie", `username=${username}`)
      .expect(200)
      .expect("content-type", new RegExp("text/html"))
      .end(done);
  });

  it("should not allow unauthorized access", { only: true }, (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const username = "player";
    const lobby = new Lobby("0", size);
    lobby.addPlayer({ username });
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter({});
    const lobbyManager = new LobbyManager({ 0: lobby });
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager });

    request(app)
      .get("/lobby/0")
      .set("cookie", "username=abcd")
      .expect(302)
      .expect("location", "/")
      .end(done);
  });

  it("should not allow if player is not in lobby", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const username = "player";
    const lobby = new Lobby("0", size);
    lobby.addPlayer({ username });
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter({});
    const lobbyManager = new LobbyManager({ 0: lobby });
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager });
    request(app).get("/lobby/0").expect(302).expect("location", "/").end(done);
  });

  it("should error on non existing lobby", (_, done) => {
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter({});
    const lobbyManager = new LobbyManager({});
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager });
    request(app).get("/lobby/0").expect(404).end(done);
  });
});

describe("POST /lobby/:id/players", () => {
  it("should add the player in the lobby", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const lobby = new Lobby("0", size);
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter({});
    const shuffle = x => x;
    const lobbyManager = new LobbyManager({ 0: lobby });
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager, shuffle });

    const username = "player";
    request(app)
      .post("/lobby/0/players")
      .send({ username })
      .expect(302)
      .expect("location", "/lobby/0")
      .expect("set-cookie", new RegExp(`username=${username}`))
      .end(err => {
        assert.deepStrictEqual(lobby.status().players, [{ username }]);
        done(err);
      });
  });

  it("should not add player if the lobby is full", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const lobby = new Lobby("0", size);
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter();
    const shuffle = x => x;
    const lobbyManager = new LobbyManager({ 0: lobby });
    const app = createApp(lobbyRouter, gameRouter, { lobbyManager, shuffle });
    const players = [
      { username: "player1" },
      { username: "player2" },
      { username: "player3" },
    ];

    const player4 = { username: "player4" };

    lobby.addPlayer(players[0]);
    lobby.addPlayer(players[1]);

    request(app)
      .post("/lobby/0/players")
      .send(players[2])
      .end(() => {
        request(app)
          .post("/lobby/0/players")
          .send(player4)
          .expect(401)
          .expect({ error: "Lobby is full !" })
          .end(err => {
            assert.deepStrictEqual(lobby.isFull(), true);
            done(err);
          });
      });
  });
});

describe("GET /lobby/:id/status", () => {
  it("should provide fields to determine whether or not to start the game.", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const lobby = new Lobby("0", size);
    const lobbyManager = new LobbyManager({ 0: lobby });
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter();
    const shuffle = x => x;

    const app = createApp(lobbyRouter, gameRouter, { lobbyManager, shuffle });
    const player = { username: "player" };

    lobby.addPlayer(player);

    const expectedStatus = {
      id: "0",
      players: [player],
      isFull: false,
      hasExpired: false,
      isPossibleToStartGame: false,
      host: player,
      self: player,
    };

    request(app)
      .get("/lobby/0/status")
      .set("cookie", "username=player")
      .expect(200)
      .expect("content-type", new RegExp("application/json"))
      .expect(expectedStatus)
      .end(done);
  });

  it("should not allow if the player is not a member of the lobby", (_, done) => {
    const size = { lowerLimit: 3, upperLimit: 3 };
    const lobby = new Lobby("0", size);
    const lobbyRouter = createLobbyRouter();
    const gameRouter = createGameRouter();
    const lobbyManager = new LobbyManager({ 0: lobby });
    const shuffle = x => x;

    const app = createApp(lobbyRouter, gameRouter, { lobbyManager, shuffle });

    request(app)
      .get("/lobby/0/status")
      .set("cookie", "username=player")
      .expect(302)
      .expect("location", "/")
      .end(done);
  });
});
