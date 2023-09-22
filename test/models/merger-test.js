const assert = require("assert");
const { describe, it } = require("node:test");
const Merger = require("../../src/models/merger");
const { createCorporations } = require("../../src/models/corporation");

describe("Merger", () => {
  describe("start", () => {
    it("should find the acquirer and defunct corporation", () => {
      const connectedTiles = [
        { position: { x: 0, y: 0 }, isPlaced: true, belongsTo: "hydra" },
        { position: { x: 0, y: 1 }, isPlaced: true, belongsTo: "hydra" },
        { position: { x: 0, y: 2 }, isPlaced: true, belongsTo: "incorporated" },
        { position: { x: 0, y: 3 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 4 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 5 }, isPlaced: true, belongsTo: "zeta" },
      ];

      const merger = new Merger(2, createCorporations(), connectedTiles);
      merger.start();

      assert.strictEqual(merger.acquirer, "zeta");
      assert.strictEqual(merger.defunct, "hydra");
    });
  });

  describe("hasEnd", () => {
    it("should give true, if all players have dealt with there defunt stocks", () => {
      const merger = new Merger(3, createCorporations(), []);

      merger.endTurn();
      merger.endTurn();
      merger.endTurn();
      assert.ok(merger.hasEnd());
    });

    it("should give false, if all players haven't dealt with there defunt stocks", () => {
      const players = ["a", "b", "c"];
      const merger = new Merger(players, createCorporations(), []);

      merger.endTurn();
      merger.endTurn();
      assert.ok(!merger.hasEnd());
    });
  });

  describe("end", () => {
    it("should end the merger round and defunct corporation should be merged to acquirer corporation", () => {
      const players = ["a", "b"];
      const corporations = createCorporations();
      const connectedTiles = [
        { position: { x: 0, y: 0 }, isPlaced: true, belongsTo: "hydra" },
        { position: { x: 0, y: 1 }, isPlaced: true, belongsTo: "hydra" },
        { position: { x: 0, y: 2 }, isPlaced: true, belongsTo: "incorporated" },
        { position: { x: 0, y: 3 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 4 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 5 }, isPlaced: true, belongsTo: "zeta" },
      ];
      const acquiredTiles = [
        { position: { x: 0, y: 0 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 1 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 2 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 3 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 4 }, isPlaced: true, belongsTo: "zeta" },
        { position: { x: 0, y: 5 }, isPlaced: true, belongsTo: "zeta" },
      ];

      const merger = new Merger(players, corporations, connectedTiles);

      corporations.hydra.establish();
      corporations.hydra.increaseSize(2);
      corporations.zeta.establish();
      corporations.zeta.increaseSize(3);
      merger.start();
      merger.end();

      assert.deepStrictEqual(connectedTiles, acquiredTiles);
      assert.ok(!corporations.hydra.isActive);
      assert.deepStrictEqual(corporations.hydra.size, 0);
      assert.deepStrictEqual(corporations.zeta.size, 6);
    });
  });
});
