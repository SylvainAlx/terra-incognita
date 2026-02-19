import crypto from "crypto";
import { Block, COULEURS_VALIDES } from "../blockchain.js";

// Helper pour générer un suffixe numérique à partir de l'IP
const getIpSuffix = (ip) => {
  // On normalise l'IP : si c'est de l'IPv4 mappé en IPv6 (ex: ::ffff:127.0.0.1), on garde juste 127.0.0.1
  const normalizedIp = ip.replace(/^.*:/, "");
  const hash = crypto.createHash("md5").update(normalizedIp).digest("hex");
  // On récupère une partie du hash convertie en nombre pour avoir une suite de chiffres
  const numeric = parseInt(hash.substring(0, 8), 16).toString();
  return numeric.padStart(5, "0").slice(-5); // 5 derniers chiffres, toujours 5
};

export const getGridState = (req, res) => {
  const { blockchain } = req.app.locals;
  res.json(blockchain.getGridState());
};

export const getLeaderboard = (req, res) => {
  const { blockchain } = req.app.locals;
  res.json(blockchain.getLeaderboard());
};

export const getBlocks = (req, res) => {
  const { blockchain } = req.app.locals;
  res.json(blockchain.chain);
};

export const getIntegrity = (req, res) => {
  const { blockchain } = req.app.locals;
  res.json({ isValid: blockchain.isChainValid() });
};

export const acquerirCase = (req, res) => {
  const { blockchain } = req.app.locals;
  const { x, y, color, owner: prefix } = req.body;

  const ip = req.ip || "127.0.0.1";
  const suffix = getIpSuffix(ip);
  const owner = `${prefix.trim() || "Explorateur"}_${suffix}`;

  console.log(
    `🔍 Acquisition par IP: ${ip} (Normalisée -> suffixe: ${suffix})`,
  );

  const ix = parseInt(x);
  const iy = parseInt(y);

  // Validation des coordonnées (grille 100x100)
  if (isNaN(ix) || isNaN(iy) || ix < 0 || ix >= 100 || iy < 0 || iy >= 100) {
    return res.status(400).json({ error: "Coordonnées invalides (0-99)" });
  }

  // Validation de la couleur
  if (!COULEURS_VALIDES[color]) {
    return res.status(400).json({
      error: `Couleur invalide. Choix possibles : ${Object.keys(COULEURS_VALIDES).join(", ")}`,
    });
  }

  if (blockchain.isCaseOwned(ix, iy)) {
    return res
      .status(403)
      .json({ error: "Cette case appartient déjà à quelqu'un !" });
  }

  const newBlock = new Block(
    blockchain.chain.length,
    new Date().toLocaleString("fr-FR"),
    {
      x: ix,
      y: iy,
      color: color,
      terrain: COULEURS_VALIDES[color],
      owner: owner || "Anonyme",
    },
  );

  blockchain.addBlock(newBlock);
  console.log(
    `🗺️  Nouvelle case acquise: (${ix}, ${iy}) [${COULEURS_VALIDES[color]}] par ${owner}`,
  );
  res.json({ success: true, block: newBlock });
};
