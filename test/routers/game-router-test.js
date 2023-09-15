const request = require("supertest");
const { describe, it } = require("node:test");
const { createApp } = require("../../src/app");
const { createLobbyRouter } = require("../../src/routers/lobby-router");
const { createGameRouter } = require("../../src/routers/game-router");
const Lobby = require("../../src/models/lobby");

describe("GameRouter", () => {
  const corporations = {
    phoenix: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    quantum: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    fusion: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    hydra: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    america: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    zeta: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
    sackson: {
      stocks: 25,
      tiles: [],
      isActive: false,
      price: 0,
      majority: 2000,
      minority: 1000,
    },
  };

  describe("GET /game", () => {
    it("should serve the game page", (_, done) => {
      const lobby = new Lobby(3);
      const username = "player";
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      const app = createApp(lobbyRouter, gameRouter, { lobby });
      lobby.addPlayer({ username });

      request(app)
        .get("/game")
        .set("cookie", "username=player")
        .expect(200)
        .expect("content-type", new RegExp("text/html"))
        .end(done);
    });

    it("should not allow if the player is not in game", (_, done) => {
      const lobby = new Lobby(3);
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      const app = createApp(lobbyRouter, gameRouter, { lobby });
      request(app).get("/game").expect(302).expect("location", "/").end(done);
    });
  });

  describe("GET /game/status", () => {
    it("should get the players account details", (_, done) => {
      const lobby = new Lobby(1);
      const username = "player";
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      const shuffle = x => x;

      const app = createApp(lobbyRouter, gameRouter, { lobby, shuffle });
      const portfolio = {
        tiles: [
          { position: { x: 0, y: 0 }, isPlaced: false },
          { position: { x: 0, y: 1 }, isPlaced: false },
          { position: { x: 0, y: 2 }, isPlaced: false },
          { position: { x: 0, y: 3 }, isPlaced: false },
          { position: { x: 0, y: 4 }, isPlaced: false },
          { position: { x: 0, y: 5 }, isPlaced: false },
        ],
        stocks: {
          phoenix: 0,
          quantum: 0,
          hydra: 0,
          fusion: 0,
          america: 0,
          sackson: 0,
          zeta: 0,
        },
        balance: 6000,
      };

      const gameStatus = {
        setupTiles: [["player", { position: { x: 0, y: 6 }, isPlaced: true }]],
        state: "place-tile",
        tiles: {
          incorporatedTiles: [{ position: { x: 0, y: 6 }, isPlaced: true }],
        },
        players: [{ username, isTakingTurn: true, you: true }],
        portfolio,
        corporations,
      };

      request(app)
        .post("/lobby/players")
        .send({ username })
        .end(() => {
          request(app)
            .get("/game/status")
            .set("cookie", "username=player")
            .expect(200)
            .expect("content-type", new RegExp("application/json"))
            .expect(gameStatus)
            .end(done);
        });
    });
  });

  describe("POST /game/tile", () => {
    it("should place a tile on the board, in the specified position", (_, done) => {
      const lobby = new Lobby(1);
      const username = "player";
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      const shuffle = x => x;
      const app = createApp(lobbyRouter, gameRouter, { lobby, shuffle });

      const userDetails = {
        state: "tile-placed",
        setupTiles: [["player", { position: { x: 0, y: 6 }, isPlaced: true }]],
        tiles: {
          incorporatedTiles: [
            { position: { x: 0, y: 6 }, isPlaced: true },
            { position: { x: 0, y: 0 }, isPlaced: true },
          ],
        },
        players: [{ username, isTakingTurn: true, you: true }],
        portfolio: {
          tiles: [
            { position: { x: 0, y: 0 }, isPlaced: true },
            { position: { x: 0, y: 1 }, isPlaced: false },
            { position: { x: 0, y: 2 }, isPlaced: false },
            { position: { x: 0, y: 3 }, isPlaced: false },
            { position: { x: 0, y: 4 }, isPlaced: false },
            { position: { x: 0, y: 5 }, isPlaced: false },
          ],
          stocks: {
            phoenix: 0,
            quantum: 0,
            hydra: 0,
            fusion: 0,
            america: 0,
            sackson: 0,
            zeta: 0,
          },
          balance: 6000,
        },
        corporations,
      };

      request(app)
        .post("/lobby/players")
        .send({ username })
        .expect(200)
        .end(() => {
          request(app)
            .post("/game/tile")
            .set("cookie", "username=player")
            .send({ x: 0, y: 0 })
            .expect(200)
            .end(() => {
              request(app)
                .get("/game/status")
                .set("cookie", "username=player")
                .expect(200)
                .expect("content-type", new RegExp("application/json"))
                .expect(userDetails)
                .end(done);
            });
        });
    });
  });

  describe("POST /game/end-turn", () => {
    it("should change the turn of a player", (_, done) => {
      const lobby = new Lobby(2);
      const username1 = "player1";
      const username2 = "player2";
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      const shuffle = x => x;
      const app = createApp(lobbyRouter, gameRouter, { lobby, shuffle });

      const portfolio = {
        tiles: [
          { position: { x: 0, y: 0 }, isPlaced: false },
          { position: { x: 0, y: 1 }, isPlaced: false },
          { position: { x: 0, y: 2 }, isPlaced: false },
          { position: { x: 0, y: 3 }, isPlaced: false },
          { position: { x: 0, y: 4 }, isPlaced: false },
          { position: { x: 0, y: 5 }, isPlaced: false },
        ],
        stocks: {
          phoenix: 0,
          quantum: 0,
          hydra: 0,
          fusion: 0,
          america: 0,
          sackson: 0,
          zeta: 0,
        },
        balance: 6000,
        newTile: { position: { x: 1, y: 2 }, isPlaced: false },
      };
      
      const gameStatus = {
        setupTiles: [
          ["player1", { position: { x: 1, y: 0 }, isPlaced: true }],
          ["player2", { position: { x: 1, y: 1 }, isPlaced: true }],
        ],
        state: "place-tile",
        tiles: {
          incorporatedTiles: [
            { position: { x: 1, y: 0 }, isPlaced: true },
            { position: { x: 1, y: 1 }, isPlaced: true },
          ],
        },
        players: [
          { username: username1, isTakingTurn: false, you: true },
          { username: username2, isTakingTurn: true, you: false },
        ],
        portfolio,
        corporations,
      };

      request(app)
        .post("/lobby/players")
        .send({ username: username1 })
        .expect(200)
        .end(() => {
          request(app)
            .post("/lobby/players")
            .send({ username: username2 })
            .expect(200)
            .end(() => {
              request(app)
                .post("/game/end-turn")
                .set("cookie", "username=player1")
                .expect(200)
                .end(() => {
                  request(app)
                    .get("/game/status")
                    .set("cookie", "username=player1")
                    .expect(200)
                    .expect(gameStatus)
                    .end((err, res) => {
                      console.log(JSON.stringify(res.body, null, 2));
                      done(err);
                    });
                });
            });
        });
    });
  });
});
