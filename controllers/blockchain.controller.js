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

export const acquerirCase = async (req, res) => {
  const { blockchain } = req.app.locals;
  const { x, y, color, signature, publicKey } = req.body;

  // 1. Validation de base des entrées
  const ix = parseInt(x);
  const iy = parseInt(y);
  if (isNaN(ix) || isNaN(iy) || ix < 0 || ix >= 100 || iy < 0 || iy >= 100) {
    return res.status(400).json({ error: "Coordonnées invalides (0-99)" });
  }

  if (!COULEURS_VALIDES[color]) {
    return res.status(400).json({ error: "Couleur invalide." });
  }

  if (blockchain.isCaseOwned(ix, iy)) {
    return res
      .status(403)
      .json({ error: "Cette case appartient déjà à quelqu'un !" });
  }

  // 2. Vérification cryptographique
  if (!signature || !publicKey) {
    return res
      .status(401)
      .json({ error: "Signature ou clé publique manquante." });
  }

  try {
    // Reconstitution du message qui a été signé côté client
    const message = JSON.stringify({ x: ix, y: iy, color });

    // Import de la clé publique
    const pubKeyBuffer = Buffer.from(publicKey, "base64");
    const cryptoKey = await crypto.webcrypto.subtle.importKey(
      "spki",
      pubKeyBuffer,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"],
    );

    // Vérification de la signature
    const sigBuffer = Buffer.from(signature, "base64");
    const isValid = await crypto.webcrypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      cryptoKey,
      sigBuffer,
      new TextEncoder().encode(message),
    );

    if (!isValid) {
      return res.status(401).json({
        error: "Signature invalide ! Tentative d'usurpation détectée.",
      });
    }

    // 3. Dérivation de l'adresse (identifiant court pour le leaderboard)
    const hash = crypto.createHash("sha256").update(pubKeyBuffer).digest("hex");
    const address = "0x" + hash.substring(0, 10).toUpperCase();
    const owner = address;

    // 4. Ajout à la blockchain
    const newBlock = new Block(
      blockchain.chain.length,
      new Date().toLocaleString("fr-FR"),
      {
        x: ix,
        y: iy,
        color: color,
        terrain: COULEURS_VALIDES[color],
        owner: owner,
      },
    );

    blockchain.addBlock(newBlock);
    console.log(`🔐 Case acquise anonymement par ${address}: (${ix}, ${iy})`);
    res.json({ success: true, block: newBlock });
  } catch (err) {
    console.error("Erreur de vérification cryto:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la vérification de l'identité." });
  }
};
