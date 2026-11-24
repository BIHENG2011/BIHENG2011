'use strict';
// Billets signés Ed25519 : le valideur n'a besoin que de la clé publique,
// il peut donc vérifier un billet sans connexion.
const crypto = require('node:crypto');

function loadKeys(db) {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'ticket_keys'").get();
  if (row) {
    const k = JSON.parse(row.value);
    return {
      privateKey: crypto.createPrivateKey(k.privateKey),
      publicKey: crypto.createPublicKey(k.publicKey),
      publicPem: k.publicKey
    };
  }
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const stored = {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKey: publicKey.export({ type: 'spki', format: 'pem' })
  };
  db.prepare("INSERT INTO meta (key, value) VALUES ('ticket_keys', ?)").run(JSON.stringify(stored));
  return { privateKey, publicKey, publicPem: stored.publicKey };
}

function sign(keys, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.sign(null, Buffer.from(body), keys.privateKey).toString('base64url');
  return body + '.' + sig;
}

/** @returns {object|null} le contenu du billet si la signature est valide, sinon null */
function verify(keys, token) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  let ok = false;
  try {
    ok = crypto.verify(null, Buffer.from(parts[0]), keys.publicKey, Buffer.from(parts[1], 'base64url'));
  } catch (e) {
    return null;
  }
  if (!ok) return null;
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
}

module.exports = { loadKeys, sign, verify };
