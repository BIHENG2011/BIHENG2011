'use strict';
// Registre en partie double. Règle : la somme des écritures d'une transaction vaut 0.
// Convention : un montant positif augmente le solde du compte.
const crypto = require('node:crypto');

function ensureAccount(db, id, label, kind) {
  db.prepare('INSERT OR IGNORE INTO accounts (id, label, kind) VALUES (?, ?, ?)').run(id, label, kind);
}

/**
 * Enregistre une transaction et ses écritures. À appeler dans une transaction SQL (db.tx).
 * @param {object} t   { userId, kind, label, detail, method, userAmount, at }
 * @param {Array<[string, number]>} lines  [compte, montant]
 */
function post(db, t, lines) {
  const sum = lines.reduce((s, l) => s + l[1], 0);
  if (sum !== 0) throw new Error('Transaction déséquilibrée (' + sum + ')');
  if (lines.some((l) => !Number.isInteger(l[1]))) throw new Error('Montant non entier');
  const id = t.id || 'tx_' + crypto.randomUUID();
  db.prepare(`INSERT INTO transactions (id, user_id, kind, label, detail, method, user_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, t.userId || null, t.kind, t.label, t.detail || null,
    t.method || null, t.userAmount ?? null, t.at || Date.now());
  const ins = db.prepare('INSERT INTO entries (txn_id, account_id, amount) VALUES (?, ?, ?)');
  for (const [account, amount] of lines) ins.run(id, account, amount);
  return id;
}

function balance(db, accountId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM entries WHERE account_id = ?').get(accountId).b;
}

/** Contrôle global : doit toujours valoir 0. */
function trialBalance(db) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM entries').get().s;
}

module.exports = { ensureAccount, post, balance, trialBalance };
