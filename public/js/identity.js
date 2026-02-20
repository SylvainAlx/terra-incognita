/**
 * Gestion de l'identité cryptographique pour Terra Incognita
 * Utilise l'API Web Crypto du navigateur (pas de dépendances externes)
 */

class Identity {
  constructor() {
    this.keyPair = null;
    this.address = null;
  }

  /**
   * Initialise l'identité : charge depuis localStorage ou génère une nouvelle paire de clés
   */
  async init() {
    const storedKey = localStorage.getItem("terra_incognita_key");

    if (storedKey) {
      try {
        const jwk = JSON.parse(storedKey);
        this.keyPair = {
          privateKey: await window.crypto.subtle.importKey(
            "jwk",
            jwk.privateKey,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign"],
          ),
          publicKey: await window.crypto.subtle.importKey(
            "jwk",
            jwk.publicKey,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"],
          ),
        };
      } catch (e) {
        console.error(
          "Erreur lors du chargement des clés, génération de nouvelles...",
          e,
        );
        await this.generateNewKeys();
      }
    } else {
      await this.generateNewKeys();
    }

    this.address = await this.deriveAddress(this.keyPair.publicKey);
    console.log("Identity initialized. Address:", this.address);
  }

  async generateNewKeys() {
    this.keyPair = await window.crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );

    // Sauvegarde en JWK (JSON Web Key) pour stockage facile
    const privateJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.privateKey,
    );
    const publicJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.publicKey,
    );

    localStorage.setItem(
      "terra_incognita_key",
      JSON.stringify({
        privateKey: privateJwk,
        publicKey: publicJwk,
      }),
    );
  }

  /**
   * Dérive une adresse courte (hash) à partir de la clé publique
   */
  async deriveAddress(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", exported);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return "0x" + hashHex.substring(0, 10).toUpperCase(); // On garde 10 caractères pour le côté ludique
  }

  /**
   * Exporte la clé publique en format SPKI Base64 pour l'envoyer au serveur
   */
  async getPublicKeyBase64() {
    const exported = await window.crypto.subtle.exportKey(
      "spki",
      this.keyPair.publicKey,
    );
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Signe un message (string)
   */
  async signMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const signature = await window.crypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      this.keyPair.privateKey,
      data,
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Exporte l'identité complète sous forme de chaîne JSON (JWK)
   */
  async exportIdentity() {
    const privateJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.privateKey,
    );
    const publicJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.publicKey,
    );
    return JSON.stringify({ privateKey: privateJwk, publicKey: publicJwk });
  }

  /**
   * Importe une identité depuis une chaîne JSON
   */
  async importIdentity(jsonString) {
    try {
      const jwk = JSON.parse(jsonString);
      if (!jwk.privateKey || !jwk.publicKey) throw new Error("Format invalide");

      const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        jwk.privateKey,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"],
      );
      const publicKey = await window.crypto.subtle.importKey(
        "jwk",
        jwk.publicKey,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"],
      );

      this.keyPair = { privateKey, publicKey };
      this.address = await this.deriveAddress(publicKey);

      localStorage.setItem("terra_incognita_key", jsonString);
      console.log("Identity imported. New Address:", this.address);
      return true;
    } catch (e) {
      console.error("Erreur d'importation:", e);
      throw e;
    }
  }
}

window.identity = new Identity();
