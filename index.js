import express from "express";
import { Blockchain } from "./blockchain.js";
import pkg from "body-parser";
const { urlencoded, json } = pkg;

import router from "./router.js";

const app = express();
const port = 3005;

app.set("view engine", "ejs");
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(express.static("public"));

let blockchain = new Blockchain();
// On rend la blockchain accessible aux contrôleurs via app.locals
app.locals.blockchain = blockchain;

// Middleware pour désactiver le cache sur les routes de données
app.use((req, res, next) => {
  if (
    req.url.startsWith("/gridstate") ||
    req.url.startsWith("/api/") ||
    req.url.startsWith("/blocks")
  ) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// Utilisation du routeur
app.use("/", router);

app.listen(port, () => {
  const stats = blockchain.getBlockchainStats();
  console.log(
    `\n🗺️  Serveur "Terra Incognita" démarré : http://localhost:${port}`,
  );
  console.log(`📊 Statistiques: ${stats.totalBlocks} blocs enregistrés`);
  console.log(`🛡️  Intégrité: ${stats.isValid ? "VALIDE" : "CORROMPUE"}\n`);
});
