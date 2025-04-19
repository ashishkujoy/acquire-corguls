const { describe, it } = require("node:test");
const LobbyManager = require("../../src/models/lobby-manager");
const sinon = require("sinon");
const assert = require("node:assert");
const Lobby = require("../../src/models/lobby");

describe("Lobby Manager", () => {
  it("create a new lobby", () => {
    const idGenerator = { generate: sinon.stub().returns("abcd") };
    const lobbyManager = new LobbyManager({}, idGenerator);

    const lobbyId = lobbyManager.createLobby({ lowerLimit: 2, upperLimit: 6 });
    assert.equal(lobbyId, "abcd");
    assert(idGenerator.generate.calledOnce);
  });

  it("find existing lobby by id", () => {
    const lobby = new Lobby("0", { lowerLimit: 2, upperLimit: 6 });
    const lobbyManager = new LobbyManager({ "abcd": lobby }, {});

    const actualLobby = lobbyManager.findById("abcd");

    assert.deepEqual(actualLobby, lobby);
  });

  it("find non existing lobby by id", () => {
    const lobby = new Lobby("0", { lowerLimit: 2, upperLimit: 6 });
    const lobbyManager = new LobbyManager({ "abcd": lobby }, {});

    const actualLobby = lobbyManager.findById("abce");

    assert.equal(actualLobby, undefined);
  });
});