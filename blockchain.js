import SHA256 from "crypto-js/sha256.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "public", "blockchain.json");

// Couleurs autorisées et leur signification
export const COULEURS_VALIDES = {
  "#8B6040": "terre", // marron clair — terre
  "#6BAADD": "eau", // bleu clair — eau
  "#4CAF50": "végétation", // vert — végétation
  "#E53935": "ville", // rouge — ville
};

export class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data; // { x, y, color, owner }
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return SHA256(
      this.index +
        this.previousHash +
        this.timestamp +
        JSON.stringify(this.data),
    ).toString();
  }
}

export class Blockchain {
  constructor() {
    this.chain = this.loadChainFromFile() || [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(
      0,
      new Date().toLocaleString("fr-FR"),
      "Bloc de Genèse — Terra Incognita",
      "0",
    );
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
    this.saveChainToFile();
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  // Retourne l'état actuel de la grille 100x100
  getGridState() {
    const grid = {};
    // Ignorer le bloc genesis
    for (let i = 1; i < this.chain.length; i++) {
      const { x, y, color, owner } = this.chain[i].data;
      grid[`${x},${y}`] = { color, owner, timestamp: this.chain[i].timestamp };
    }
    return grid;
  }

  // Vérifie si une case est déjà acquise
  isCaseOwned(x, y) {
    return this.chain.some(
      (block) =>
        block.index !== 0 &&
        block.data.x === parseInt(x) &&
        block.data.y === parseInt(y),
    );
  }

  getLeaderboard() {
    const counts = {};
    // Ignorer le bloc genesis
    for (let i = 1; i < this.chain.length; i++) {
      const owner = this.chain[i].data.owner;
      counts[owner] = (counts[owner] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  getBlockchainStats() {
    return {
      totalBlocks: this.chain.length,
      isValid: this.isChainValid(),
    };
  }

  saveChainToFile() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(this.chain, null, 2), "utf-8");
  }

  loadChainFromFile() {
    try {
      if (fs.existsSync(DATA_PATH)) {
        const data = fs.readFileSync(DATA_PATH, "utf-8");
        const parsed = JSON.parse(data);

        return parsed.map(
          (b) => new Block(b.index, b.timestamp, b.data, b.previousHash),
        );
      }
      return null;
    } catch (err) {
      console.error("Erreur chargement blockchain:", err);
      return null;
    }
  }
}
