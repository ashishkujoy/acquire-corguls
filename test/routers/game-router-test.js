const request = require("supertest");
const assert = require("assert");
const { describe, it } = require("node:test");
const { createApp } = require("../../src/app");
const { createLobbyRouter } = require("../../src/routers/lobby-router");
const { createGameRouter } = require("../../src/routers/game-router");
const Lobby = require("../../src/models/lobby");
const LobbyManager = require("../../src/models/lobby-manager");
const GameManager = require("../../src/models/game-manager");
const sinon = require("sinon");
const express = require("express");
const cookieParser = require("cookie-parser");

const endMerge = (app, username) => {
  return request(app)
    .post("/game/0/end-merge")
    .set("cookie", `username=${username}`)
    .expect(200);
};

const resolveConflict = (app, username, body, statusCode = 200) => {
  return request(app)
    .post("/game/0/merger/resolve-conflict")
    .set("cookie", `username=${username}`)
    .send(body)
    .expect(statusCode);
};

const dealDefunctStocks = (app, username, cart, statusCode = 200) => {
  return request(app)
    .post("/game/0/merger/deal")
    .send(cart)
    .set("cookie", `username=${username}`)
    .expect(statusCode);
};

const gameResult = async (app, username) => {
  const result = await request(app)
    .get("/game/0/end-result")
    .set("cookie", `username=${username}`)
    .expect(200);

  return result.body;
};


const createTestApp = () => {
  const size = { lowerLimit: 1, upperLimit: 1 };
  const lobby = new Lobby("0", size);
  const username = "player";
  const lobbyManager = new LobbyManager({ 0: lobby });
  const gameManager = new GameManager({});
  const lobbyRouter = createLobbyRouter();
  const gameRouter = createGameRouter();
  const app = express();
  app.use(cookieParser());
  app.use((req, res, next) => {
    // if (req.cookies.username === username) {
    req.isAuthenticated = () => true;
    req.user = { username }
    // }
    next();
  });
  createApp(lobbyRouter, gameRouter, { lobbyManager, gameManager }, app);
  lobby.addPlayer({ username });

  return { app, lobby, lobbyManager, gameManager, username };
}

describe("GameRouter", () => {
  const corporations = {
    phoenix: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    quantum: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    fusion: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    hydra: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    america: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    zeta: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
    sackson: {
      stocks: 25,
      size: 0,
      isActive: false,
      isSafe: false,
      price: 0,
      majorityPrice: 0,
      minorityPrice: 0,
    },
  };

  describe("GET /game", () => {
    it("should serve the game page", async () => {
      const { app } = createTestApp();

      await request(app)
        .get("/game/0")
        .set("cookie", "username=player")
        .expect(200)
        .expect("content-type", new RegExp("text/html"));
    });

    it("should not allow if the player is not in game", async () => {
      const { app } = createTestApp();
      await request(app)
        .get("/game/0")
        .expect(302)
        .expect("location", "/");
    });
  });

  describe("GET /game/status", () => {
    it("should get current game status", async () => {
      const { app, username, gameManager } = createTestApp();

      const gameStatus = {
        id: "0",
        setupTiles: [["player", { position: { x: 0, y: 6 }, isPlaced: true }]],
        state: "place-tile",
        stateInfo: {},
        placedTiles: [],
        turns: {},
        players: [{ username, isTakingTurn: true, you: true }],
        corporations,
      };

      const game = { status: () => gameStatus };
      const statusSpy = sinon.spy(game, "status");
      sinon.stub(gameManager, "findById").returns(game);

      const res = await request(app)
        .get("/game/0/status")
        .set("cookie", "username=player")
        .expect(200);

      assert.deepStrictEqual(res.body, gameStatus);
      assert(statusSpy.calledWith("player"));
    });

    it("should error on non existing lobby", async () => {
      const { app } = createTestApp();

      await request(app)
        .get("/game/10/status")
        .set("cookie", "username=player")
        .expect(404)
    });

    it("should error on non existing game", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .get("/game/0/status")
        .set("cookie", "username=player")
        .expect(404);

      assert.deepStrictEqual(await res.body, { message: "Game Not found: 0" });
    });
  });

  describe("POST /game/tile", () => {
    it("should place a tile on the board, in the specified position", async () => {
      const { app, gameManager } = createTestApp();
      const game = { placeTile: sinon.fake, currentPlayerName: () => "player" };
      sinon.stub(gameManager, "findById").returns(game);
      const placeTileStub = sinon.stub(game, "placeTile").returns(true);

      await request(app)
        .post("/game/0/tile")
        .set("cookie", "username=player")
        .send({ x: 0, y: 1 })
        .expect(200);

      assert(placeTileStub.calledWith("player", { x: 0, y: 1 }));
    });
  });

  describe("POST /game/end-turn", () => {
    it("should change the turn of a player", async () => {
      const { app, gameManager } = createTestApp();
      const game = { changeTurn: sinon.fake, currentPlayerName: () => "player" };
      sinon.stub(gameManager, "findById").returns(game);
      const changeTurnStub = sinon.stub(game, "changeTurn").returns(true);

      await request(app)
        .post("/game/0/end-turn")
        .set("cookie", "username=player")
        .expect(200);

      assert(changeTurnStub.calledOnce);
    });
  });

  describe("POST /game/start", () => {
    it("should start the game when has enough players", async () => {
      const { app, gameManager, lobby } = createTestApp();
      const game = { start: sinon.fake, }
      const statusStub = sinon.stub(lobby, "status").returns({
        isPossibleToStartGame: true,
        players: [{ username: "player" }],
        self: { username: "player" },
        host: { username: "player" }
      });
      const createGameStub = sinon.stub(gameManager, "createGame").returns(game);

      await request(app)
        .post("/game/0/start")
        .set("cookie", "username=player")
        .expect(200);

      assert(statusStub.calledWith("player"));
      assert(createGameStub.calledWith(lobby));
    });

    it("should redirect to the home page when not enough players has joined", async () => {
      const { app, lobby } = createTestApp();
      const statusStub = sinon.stub(lobby, "status").returns({
        isPossibleToStartGame: false,
        players: [{ username: "player" }],
        self: { username: "player" },
        host: { username: "player" }
      });

      await request(app)
        .post("/game/0/start")
        .set("cookie", "username=player")
        .expect(302)
        .expect("location", "/lobby");

      assert(statusStub.calledWith("player"));
    });

    it("should start the game only on host request", async () => {
      const { app, lobby } = createTestApp();
      const statusStub = sinon.stub(lobby, "status").returns({
        isPossibleToStartGame: true,
        players: [{ username: "player" }],
        self: { username: "player" },
        host: { username: "player6" }
      });

      await request(app)
        .post("/game/0/start")
        .set("cookie", "username=player")
        .expect(400);

      assert(statusStub.calledWith("player"));
    });
  });

  describe("POST /game/establish", () => {
    it("should establish selected corporation", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        establishCorporation: sinon.fake,
      };
      sinon.stub(gameManager, "findById").returns(game);
      const establishCorporationStub = sinon.stub(game, "establishCorporation");

      await request(app)
        .post("/game/0/establish")
        .send({ name: "phoenix" })
        .set("cookie", "username=player")
        .expect(200);

      assert(establishCorporationStub.calledWith({ name: "phoenix" }))
    });

    it("should only allow current player to establish selected corporation", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player2",
        establishCorporation: sinon.fake,
      };
      sinon.stub(gameManager, "findById").returns(game);

      await request(app)
        .post("/game/0/establish")
        .send({ name: "phoenix" })
        .set("cookie", "username=player")
        .expect(400);
    });
  });

  describe("POST /game/buy-stocks", () => {
    it("should buy stocks of an active corporation", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        buyStocks: sinon.fake,
      };
      sinon.stub(gameManager, "findById").returns(game);
      const buyStocksStub = sinon.stub(game, "buyStocks").returns({});
      const stocks = [{ name: "phoenix", price: 1000 }];

      await request(app)
        .post("/game/0/buy-stocks")
        .set("cookie", `username=player`)
        .send(stocks)
        .expect(200);

      assert(buyStocksStub.calledWith(stocks));
    });
  });

  describe("POST /game/test", () => {
    it("should load a game from a state", async () => {
      const { app, gameManager } = createTestApp();
      const loadStub = sinon.stub(gameManager, "load").returns({});
      const fakeGameData = { players: ["Fake1", "Fake2"] };

      await request(app)
        .post("/game/0/test")
        .set("cookie", "username=biswa")
        .send(fakeGameData)
        .expect(201);

      assert(loadStub.calledWith("0", fakeGameData));
    });
  });

  describe("POST /game/end-merge", () => {
    it("should end the merge state", async () => {
      const { app, gameManager } = createTestApp();
      const game = { endMerge: sinon.fake };
      const endMergeStub = sinon.stub(game, "endMerge");
      sinon.stub(gameManager, "findById").returns(game);

      await endMerge(app, "player");
      assert.equal(endMergeStub.callCount, 1);
    });
  });

  describe("POST /game/resolve-conflict", () => {
    it("should resolve merge conflict by merge maker", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        mergeTwoCorporation: sinon.fake,
      }
      const conflictResolverStub = sinon.stub(game, "mergeTwoCorporation").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const companies = { acquirer: "phoenix", defunct: "quantum", };

      await resolveConflict(app, "player", companies);

      assert(conflictResolverStub.calledWith(companies));
    });

    it("should allow to resolve merge conflict by merge maker only", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player2",
        mergeTwoCorporation: sinon.fake,
      }
      const conflictResolverStub = sinon.stub(game, "mergeTwoCorporation").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const companies = { acquirer: "phoenix", defunct: "quantum", };

      await resolveConflict(app, "player", companies, 400);

      assert.equal(conflictResolverStub.callCount, 0);
    });
  });

  describe("POST /game/end-result", () => {
    it("should give the game result", async () => {
      const { app, gameManager } = createTestApp();
      const game = { result: { ended: true } };
      sinon.stub(gameManager, "findById").returns(game);

      const result = await gameResult(app, "player");

      assert.deepStrictEqual(result, game.result);
    });
  });

  describe("POST /game/merger/deal", () => {
    it("should deal defunct stocks", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        dealDefunctStocks: sinon.fake,
      };
      const dealStub = sinon.stub(game, "dealDefunctStocks").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const deal = { sell: 5, trade: 2 };
      await dealDefunctStocks(app, "player", deal);

      assert(dealStub.calledWith(deal));
    });

    it("should allow only current playe to deal defunct stocks", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player2",
        dealDefunctStocks: sinon.fake,
      };
      const dealStub = sinon.stub(game, "dealDefunctStocks").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      await dealDefunctStocks(app, "player", { sell: 5, trade: 2 }, 400);

      assert.equal(dealStub.callCount, 0);
    });
  });

  describe("POST /game/merge/resolve-acquirer", () => {
    it("should select acquirer from multiple acquirer", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        selectAcquirer: sinon.fake,
      }
      const selectAcquirerStub = sinon.stub(game, "selectAcquirer").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const acquirer = { name: "zeta" };

      await request(app)
        .post("/game/0/merger/resolve-acquirer")
        .set("cookie", `username=player`)
        .send({ acquirer })
        .expect(200);

      assert(selectAcquirerStub.calledWith(acquirer));
    });

    it("should allow select acquirer for current user", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player2",
        selectAcquirer: sinon.fake,
      }
      const selectAcquirerStub = sinon.stub(game, "selectAcquirer").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const acquirer = { name: "zeta" };

      await request(app)
        .post("/game/0/merger/resolve-acquirer")
        .set("cookie", `username=player`)
        .send({ acquirer })
        .expect(400);

      assert.equal(selectAcquirerStub.callCount, 0);
    });
  });

  describe("POST /game/merge/confirm-defunct", () => {
    it("should select defunct from defunct acquirer", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player",
        confirmDefunct: sinon.fake,
      }
      const confirmDefunctStub = sinon.stub(game, "confirmDefunct").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const defunct = { stock: 1 };

      await request(app)
        .post("/game/0/merger/confirm-defunct")
        .set("cookie", `username=player`)
        .send({ defunct })
        .expect(200);

      assert(confirmDefunctStub.calledWith(defunct));
    });

    it("should allow select defunct for current player only", async () => {
      const { app, gameManager } = createTestApp();
      const game = {
        currentPlayerName: () => "player2",
        confirmDefunct: sinon.fake,
      }
      const confirmDefunctStub = sinon.stub(game, "confirmDefunct").returns({});
      sinon.stub(gameManager, "findById").returns(game);
      const defunct = { stock: 1 };

      await request(app)
        .post("/game/0/merger/confirm-defunct")
        .set("cookie", `username=player`)
        .send({ defunct })
        .expect(400);

      assert.equal(confirmDefunctStub.callCount, 0);
    });
  });
});
