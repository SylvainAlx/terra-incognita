import express from "express";
import { Blockchain } from "./blockchain.js";
import pkg from "body-parser";
const { urlencoded, json } = pkg;

import router from "./router.js";

const app = express();
const port = 3000;
const basePath = process.env.BASE_PATH || "/terra-incognita";

app.set("view engine", "ejs");
app.use(urlencoded({ extended: true }));
app.use(json());

// On rend basePath accessible dans toutes les vues
app.locals.basePath = basePath;

// Serve public files under the basePath
app.use(basePath, express.static("public"));

let blockchain = new Blockchain();
// On rend la blockchain accessible aux contrôleurs via app.locals
app.locals.blockchain = blockchain;

// Middleware pour désactiver le cache sur les routes de données
app.use((req, res, next) => {
  const url = req.originalUrl || req.url;
  if (
    url.startsWith(`${basePath}/gridstate`) ||
    url.startsWith(`${basePath}/api/`) ||
    url.startsWith(`${basePath}/blocks`)
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

// Utilisation du routeur monté sur le basePath
app.use(basePath, router);

// Redirection de la racine vers le basePath si nécessaire
if (basePath !== "/" && basePath !== "") {
  app.get("/", (req, res) => res.redirect(basePath));
}

app.listen(port, () => {
  const stats = blockchain.getBlockchainStats();
  console.log(
    `\n🗺️  Serveur "Terra Incognita" démarré : http://localhost:${port}${basePath}`,
  );
  console.log(`📊 Statistiques: ${stats.totalBlocks} blocs enregistrés`);
  console.log(`🛡️  Intégrité: ${stats.isValid ? "VALIDE" : "CORROMPUE"}\n`);
});
