const express = require('express');
const { createServer } = require('node:http');
const { describe, it } = require('node:test');
const LobbyManager = require("../../src/models/lobby-manager");
const GameManager = require("../../src/models/game-manager");
const { io: clientIo } = require("socket.io-client");
const { createApp } = require("../../src/app");
const { createLobbyRouter } = require("../../src/routers/lobby-router");
const { createGameRouter } = require("../../src/routers/game-router");
const createSocketServer = require("socket.io");
const sinon = require("sinon");
const assert = require("assert");

class TestFixture {
  constructor(server, lobbyManager, gameManager) {
    this.server = server;
    this.clients = [];
    this.lobbyManager = lobbyManager;
    this.gameManager = gameManager;
  }

  async createClient(username) {
    const client = clientIo(`http://localhost:${this.server.address().port}`, {
      extraHeaders: {
        cookie: `username=${username}`,
      },
    });

    return new Promise((res, rej) => {
      client.on("connect", () => {
        const c = new Client(client);
        this.clients.push(c);
        res(c);
      });
      client.on("error", rej);
    });
  }

  static async createServer() {
    try {
      const app = express();
      const server = createServer(app);

      const lobbyManager = new LobbyManager({});
      const gameManager = new GameManager({});
      const io = createSocketServer(server);
      const lobbyRouter = createLobbyRouter();
      const gameRouter = createGameRouter();
      createApp(lobbyRouter, gameRouter, { lobbyManager, gameManager, io }, app);

      await (new Promise((res) => server.listen(0, () => {
        console.log("Server......");
        res();
      })));
      console.log("Got the server connected..")
      return new TestFixture(server, lobbyManager, gameManager);

    } catch (e) {
      console.error(e);
      return;
    }
  }

  close() {
    this.server.close();
    this.clients.forEach(client => client.close());
  }
}

class Client {
  constructor(client) {
    this.client = client;
    this.events = {};
  }

  listenEvent(eventName) {
    this.events[eventName] = [];
    this.client.on(eventName, (data) => {
      console.log("Received client side message");
      this.events[eventName].push(data);
    });
  }

  emit(eventName, data) {
    this.client.emit(eventName, data);
  }

  async getEvent(eventName, timeout) {
    const endsAt = Date.now() + timeout;
    return await new Promise((res) => {
      const intervalId = setInterval(() => {
        if (Date.now() >= endsAt || this.events[eventName].length !== 0) {
          clearInterval(intervalId);
          res(this.events[eventName])
        }
      }, 100);
    });
  }

  close() {
    this.client.close();
  }
}


describe("Lobby", () => {
  it("should receive updates on lobby status change", async () => {
    const fixture = await TestFixture.createServer();
    const client = await fixture.createClient("test-user");
    client.listenEvent("lobbyupdate");

    const lobby = { status: sinon.stub().returns({ full: true }) };
    fixture.lobbyManager.findById = sinon.stub().returns(lobby);

    client.emit("joinlobby", { lobbyId: "test-lobby" });

    const messages = await client.getEvent("lobbyupdate", 1000);
    assert.deepStrictEqual(messages, [{ full: false }]);

    fixture.close();
  });
});
