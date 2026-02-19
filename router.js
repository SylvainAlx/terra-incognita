import express from "express";
import * as pageController from "./controllers/page.controller.js";
import * as blockchainController from "./controllers/blockchain.controller.js";

const router = express.Router();

// Routes pour les pages (views)
router.get("/", pageController.home);
router.get("/explorer", pageController.explorer);
router.get("/about", pageController.about);

// Routes pour l'API Blockchain
router.get("/gridstate", blockchainController.getGridState);
router.get("/api/leaderboard", blockchainController.getLeaderboard);
router.get("/blocks", blockchainController.getBlocks);
router.get("/integrity", blockchainController.getIntegrity);
router.post("/acquerir-case", blockchainController.acquerirCase);

export default router;
