'use strict';
// Règles métier du démonstrateur. Aucune fonction ici ne touche au HTTP.
const crypto = require('node:crypto');
const { tx, wipe } = require('./db');
const ledger = require('./ledger');
const payments = require('./payments');
const tickets = require('./tickets');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const DOUALA_OFFSET = HOUR; // Afrique centrale : UTC+1, sans heure d'été

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function startOfDay(t) {
  return Math.floor((t + DOUALA_OFFSET) / DAY) * DAY - DOUALA_OFFSET;
}

/* ---------- Trajets (données fixes pour la démo) ---------- */

const ROUTES = [
  {
    id: 'moto-brt', title: 'Moto + BRT', best: true, minutes: 34, price: 650, validityMin: 120,
    legs: [
      { mode: 'moto', minutes: 7, label: "Moto-taxi jusqu'à la station Ndokoti", sub: 'Conducteur identifié · 200 FCFA', share: 200, ticketLabel: 'Moto' },
      { mode: 'brt', minutes: 20, label: 'BRT ligne 1, direction Akwa', sub: 'Ndokoti → Rond-point Deïdo · 450 FCFA', share: 450, ticketLabel: 'BRT ligne 1' },
      { mode: 'walk', minutes: 7, label: 'À pied, 450 m', sub: "jusqu'au boulevard de la Liberté", share: 0 }
    ]
  },
  { id: 'moto-bus', title: 'Moto + bus de ville', minutes: 45, price: 550, note: '1 correspondance', legs: [] },
  { id: 'taxi', title: 'Taxi direct', minutes: 32, price: 1000, note: 'selon le trafic', legs: [] }
];

function create(db) {
  const keys = tickets.loadKeys(db);

  /* ---------- Données de départ ---------- */

  function seed(now = Date.now()) {
    const today = startOfDay(now);
    tx(db, () => {
      wipe(db);
      const u = db.prepare(`INSERT INTO users (id, name, short_name, role, phone, card_last4, plate, owner_daily, savings_daily)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      u.run('aicha', 'Aïcha', 'Aïcha N.', 'usager', '6•• •• •• 41', '2207', null, null, null);
      u.run('paul', 'Paul M.', 'Paul M.', 'moto', null, null, 'DLA 3-0418', 3000, 700);
      u.run('jp', 'Jean-Paul E.', 'Jean-Paul E.', 'taxi', null, null, 'LT 2-7731', null, 1050);

      const acc = [
        ['wallet:aicha', 'Portefeuille Aïcha', 'portefeuille'],
        ['driver:paul', 'Portefeuille Paul M.', 'portefeuille'],
        ['owner:paul', 'Propriétaire de la moto DLA 3-0418', 'tiers'],
        ['savings:paul', 'Épargne obligations Paul M.', 'epargne'],
        ['operator:brt', 'Exploitant BRT', 'exploitant'],
        ['collector:ecosynergie', 'Séquestre Programme ÉcoSynergie', 'sequestre'],
        ['clearing:tickets', 'Billets vendus, segments non validés', 'attente'],
        ['merchant:divers', 'Autres transporteurs', 'tiers']
      ];
      for (const m of payments.METHODS) if (m.external) acc.push(['ext:' + m.id, 'Entrées ' + m.name, 'externe']);
      acc.push(['ext:cash', 'Espèces', 'externe']);
      for (const a of acc) ledger.ensureAccount(db, a[0], a[1], a[2]);

      // Historique d'Aïcha : solde final 4 750 FCFA, comme sur la maquette.
      const p = (at, kind, label, detail, method, amt, lines) =>
        ledger.post(db, { userId: 'aicha', kind, label, detail, method, userAmount: amt, at }, lines);
      p(today - 14 * DAY + 9 * HOUR, 'recharge', 'Recharge', null, 'om', 2000, [['ext:om', -2000], ['wallet:aicha', 2000]]);
      p(today - 9 * DAY + 17 * HOUR, 'trajet', 'Trajet taxi', null, 'bp', -1000, [['wallet:aicha', -1000], ['merchant:divers', 1000]]);
      p(today - 7 * DAY + 8 * HOUR, 'trajet', 'Billet bus', null, 'bp', -250, [['wallet:aicha', -250], ['merchant:divers', 250]]);
      p(today - 4 * DAY + 12 * HOUR, 'recharge', 'Recharge', null, 'momo', 5000, [['ext:momo', -5000], ['wallet:aicha', 5000]]);
      p(today - 2 * DAY + 10 * HOUR, 'menage', 'Collecte des déchets', 'abonnement du ménage', 'bp', -1000,
        [['wallet:aicha', -1000], ['collector:ecosynergie', 1000]]);
      p(today - DAY + 18 * HOUR + 12 * 60000, 'trajet', 'Trajet moto + bus', null, 'om', -550, [['ext:om', -550], ['merchant:divers', 550]]);

      // Journée de Paul : 12 courses, 6 800 FCFA.
      const amounts = [500, 700, 600, 500, 800, 500, 600, 700, 400, 500, 600, 400];
      const span = Math.max(now - today - 10 * 60000, 12 * 60000);
      const r = db.prepare('INSERT INTO rides (driver_id, amount, method, label, passenger, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      amounts.forEach((a, i) => {
        r.run('paul', a, i % 3 === 0 ? 'cash' : 'om', 'Course', 'Client', now - span + Math.round((i * span) / amounts.length));
      });

      const o = db.prepare('INSERT INTO obligations (driver_id, position, name, who, pct, status) VALUES (?, ?, ?, ?, ?, ?)');
      [['Assurance COVA', null, 100, "couvert jusqu'au 31 déc."],
        ['CNPS, assurance volontaire', null, 100, 'novembre payé'],
        ['Permis de stationnement', null, 62, null]].forEach((x, i) => o.run('paul', i, x[0], x[1], x[2], x[3]));
      [['Vignette automobile', 'Trésor public · échéance annuelle', 72, null],
        ['Assurance COVA', 'via courtier agréé · prime échelonnée', 100, 'Couvert'],
        ['CNPS, assurance volontaire', 'retraite et risques professionnels', 100, 'Novembre payé'],
        ['Visite technique', 'centre de contrôle agréé · semestrielle', 45, null],
        ['Carte bleue et stationnement', 'Communauté urbaine · annuelle', 88, null],
        ['Licence de transport', 'Ministère des Transports · annuelle', 30, null]].forEach((x, i) => o.run('jp', i, x[0], x[1], x[2], x[3]));

      // Prochain jeudi, 7 h (heure de Douala).
      const weekday = new Date(today + DOUALA_OFFSET).getUTCDay();
      let days = (4 - weekday + 7) % 7;
      if (days === 0 && now > today + 7 * HOUR) days = 7;
      db.prepare(`INSERT INTO households (id, label, user_id, collector, pickup_note, monthly_fee, pay_method, pay_day,
        passages_done, passages_planned, next_pickup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run('bonamoussadi-c', 'Bonamoussadi, bloc C', 'aicha', 'Martin K.', 'sacs devant le portail', 1000, 'bp', 22, 7, 8,
          today + days * DAY + 7 * HOUR);
    });
  }

  /* ---------- Usager ---------- */

  function user(id) {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!u) throw new AppError(404, 'Utilisateur inconnu');
    return u;
  }

  function home(userId) {
    const u = user(userId);
    const movements = db.prepare(`SELECT label, detail, method, user_amount AS amount, created_at AS at
      FROM transactions WHERE user_id = ? AND user_amount IS NOT NULL ORDER BY created_at DESC LIMIT 3`).all(userId);
    return {
      name: u.name, cardLast4: u.card_last4,
      balance: ledger.balance(db, 'wallet:' + userId),
      movements: movements.map((m) => Object.assign({}, m, { methodName: methodName(m.method) }))
    };
  }

  function methodName(id) {
    const m = payments.getMethod(id);
    return m ? m.name : null;
  }

  function routes(now = Date.now()) {
    return {
      from: 'Bonamoussadi', to: 'Akwa',
      options: ROUTES.map((r) => ({
        id: r.id, title: r.title, best: !!r.best, minutes: r.minutes, price: r.price, note: r.note || null,
        arrival: now + r.minutes * 60000,
        legs: r.legs.map((l) => ({ mode: l.mode, minutes: l.minutes, label: l.label, sub: l.sub })),
        purchasable: !!r.best
      }))
    };
  }

  function paymentMethods(userId) {
    const bal = ledger.balance(db, 'wallet:' + userId);
    return payments.METHODS.map((m) => ({
      id: m.id, name: m.name, short: m.short, bg: m.bg, fg: m.fg,
      sub: m.id === 'bp' ? fcfa(bal) + ' FCFA disponibles' : m.sub
    }));
  }

  function buyTicket(userId, routeId, methodId, now = Date.now()) {
    user(userId);
    const route = ROUTES.find((r) => r.id === routeId && r.best);
    if (!route) throw new AppError(400, 'Trajet non disponible à la vente');
    const method = payments.getMethod(methodId);
    if (!method) throw new AppError(400, 'Moyen de paiement inconnu');

    return tx(db, () => {
      if (method.id === 'bp' && ledger.balance(db, 'wallet:' + userId) < route.price) {
        throw new AppError(402, 'Solde BluePay insuffisant');
      }
      const id = newTicketId(now);
      const charge = payments.provider.charge({ method: method.id, amount: route.price, reference: id });
      if (charge.status !== 'succeeded') throw new AppError(402, 'Paiement refusé');

      const source = method.id === 'bp' ? 'wallet:' + userId : 'ext:' + method.id;
      const txnId = ledger.post(db, {
        userId, kind: 'billet', label: 'Trajet ' + route.title.replace('Moto', 'moto'), detail: 'billet ' + id,
        method: method.id, userAmount: -route.price, at: now
      }, [[source, -route.price], ['clearing:tickets', route.price]]);

      const legs = route.legs.filter((l) => l.share > 0);
      const expires = now + route.validityMin * 60000;
      const token = tickets.sign(keys, { t: id, u: userId, e: expires, l: legs.map((l) => l.mode) });
      db.prepare(`INSERT INTO tickets (id, user_id, route_id, amount, method, created_at, expires_at, token, txn_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, route.id, route.price, method.id, now, expires, token, txnId);
      const ins = db.prepare('INSERT INTO ticket_legs (ticket_id, idx, mode, label, share) VALUES (?, ?, ?, ?, ?)');
      legs.forEach((l, i) => ins.run(id, i, l.mode, l.ticketLabel, l.share));
      return ticketView(id, now);
    });
  }

  function newTicketId(now) {
    const d = new Date(now + DOUALA_OFFSET);
    const dd = String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0');
    for (;;) {
      const id = 'BP-' + dd + '-' + String(crypto.randomInt(10000, 100000));
      if (!db.prepare('SELECT 1 FROM tickets WHERE id = ?').get(id)) return id;
    }
  }

  function ticketView(id, now = Date.now()) {
    const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    if (!t) throw new AppError(404, 'Billet introuvable');
    const legs = db.prepare('SELECT * FROM ticket_legs WHERE ticket_id = ? ORDER BY idx').all(id);
    return {
      id: t.id, amount: t.amount, method: t.method, createdAt: t.created_at, expiresAt: t.expires_at,
      valid: now < t.expires_at && legs.some((l) => !l.validated_at),
      token: t.token,
      legs: legs.map((l) => ({ mode: l.mode, label: l.label, validatedAt: l.validated_at }))
    };
  }

  function latestTicket(userId) {
    const t = db.prepare('SELECT id FROM tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
    return t ? ticketView(t.id) : null;
  }

  /* ---------- Validation d'un billet (moto ou portique BRT) ---------- */

  function scan(validator, token, now = Date.now()) {
    const payload = tickets.verify(keys, token);
    if (!payload) throw new AppError(400, 'Billet non reconnu : signature invalide');
    const t = db.prepare('SELECT * FROM tickets WHERE id = ?').get(payload.t);
    if (!t || t.token !== token) throw new AppError(400, 'Billet non reconnu');
    if (now >= t.expires_at) throw new AppError(409, 'Billet expiré');
    const leg = db.prepare('SELECT * FROM ticket_legs WHERE ticket_id = ? AND mode = ?').get(t.id, validator.mode);
    if (!leg) throw new AppError(409, 'Ce billet ne couvre pas ce trajet');
    if (leg.validated_at) throw new AppError(409, 'Segment déjà validé');

    const passenger = user(t.user_id).short_name;
    return tx(db, () => {
      db.prepare('UPDATE ticket_legs SET validated_at = ?, validated_by = ? WHERE ticket_id = ? AND idx = ?')
        .run(now, validator.id, t.id, leg.idx);
      ledger.post(db, {
        kind: 'validation', label: 'Validation ' + leg.label, detail: 'billet ' + t.id, at: now
      }, [['clearing:tickets', -leg.share], [validator.account, leg.share]]);
      if (validator.mode === 'moto') {
        db.prepare(`INSERT INTO rides (driver_id, amount, method, label, passenger, ticket_id, created_at)
          VALUES (?, ?, 'billet', 'Segment de billet', ?, ?, ?)`).run(validator.id, leg.share, passenger, t.id, now);
      }
      return { ticketId: t.id, passenger, segment: leg.label, share: leg.share, validatedAt: now };
    });
  }

  function driverScan(driverId, token, now) {
    const d = user(driverId);
    if (d.role !== 'moto') throw new AppError(403, 'Réservé aux conducteurs de moto-taxi');
    return scan({ id: driverId, mode: 'moto', account: 'driver:' + driverId }, token, now);
  }

  function brtScan(token, now) {
    return scan({ id: 'portique-brt', mode: 'brt', account: 'operator:brt' }, token, now);
  }

  /** Démo : billet d'un usager en attente de validation moto (remplace la caméra). */
  function pendingMotoTicket(userId, now = Date.now()) {
    const t = db.prepare(`SELECT t.token FROM tickets t JOIN ticket_legs l ON l.ticket_id = t.id
      WHERE t.user_id = ? AND l.mode = 'moto' AND l.validated_at IS NULL AND t.expires_at > ?
      ORDER BY t.created_at DESC LIMIT 1`).get(userId, now);
    return t ? { token: t.token } : null;
  }

  /* ---------- Conducteurs ---------- */

  function cashRide(driverId, amount, now = Date.now()) {
    const d = user(driverId);
    if (d.role !== 'moto') throw new AppError(403, 'Réservé aux conducteurs de moto-taxi');
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) throw new AppError(400, 'Montant invalide');
    db.prepare(`INSERT INTO rides (driver_id, amount, method, label, passenger, created_at)
      VALUES (?, ?, 'cash', 'Course en espèces', 'Client', ?)`).run(driverId, amount, now);
    return { amount, at: now };
  }

  function driverDay(driverId, now = Date.now()) {
    const d = user(driverId);
    const rides = db.prepare('SELECT * FROM rides WHERE driver_id = ? AND created_at >= ? ORDER BY created_at DESC')
      .all(driverId, startOfDay(now));
    const total = rides.reduce((s, r) => s + r.amount, 0);
    const owner = Math.min(d.owner_daily || 0, total);
    const savings = Math.min(d.savings_daily || 0, total - owner);
    const last = rides[0] || null;
    return {
      name: d.name, plate: d.plate, count: rides.length, total,
      split: { owner, savings, me: total - owner - savings },
      obligations: obligationRows(driverId),
      lastRide: last && { amount: last.amount, method: last.method, passenger: last.passenger, ticketId: last.ticket_id, at: last.created_at }
    };
  }

  function obligationRows(driverId) {
    return db.prepare('SELECT name, who, pct, status FROM obligations WHERE driver_id = ? ORDER BY position').all(driverId)
      .map((o) => Object.assign({}, o, { status: o.status || o.pct + ' % épargné' }));
  }

  function obligations(driverId) {
    const d = user(driverId);
    return { name: d.name, plate: d.plate, role: d.role, savingsDaily: d.savings_daily, items: obligationRows(driverId) };
  }

  /* ---------- Ménages ---------- */

  function household(id) {
    const h = db.prepare('SELECT * FROM households WHERE id = ?').get(id);
    if (!h) throw new AppError(404, 'Ménage inconnu');
    return {
      label: h.label, collector: h.collector, pickupNote: h.pickup_note, monthlyFee: h.monthly_fee,
      payMethod: methodName(h.pay_method), payDay: h.pay_day, passagesDone: h.passages_done,
      passagesPlanned: h.passages_planned, nextPickup: h.next_pickup,
      reports: db.prepare('SELECT COUNT(*) AS n FROM reports WHERE household_id = ?').get(id).n
    };
  }

  function report(id, kind, now = Date.now()) {
    household(id);
    if (kind !== 'passage_manque' && kind !== 'depot_sauvage') throw new AppError(400, 'Type de signalement inconnu');
    db.prepare('INSERT INTO reports (household_id, kind, created_at) VALUES (?, ?, ?)').run(id, kind, now);
    return { ok: true };
  }

  if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) seed();

  return {
    seed, home, routes, paymentMethods, buyTicket, ticketView, latestTicket,
    driverScan, brtScan, pendingMotoTicket, cashRide, driverDay, obligations, household, report,
    publicKey: () => keys.publicPem,
    trialBalance: () => ledger.trialBalance(db),
    balance: (account) => ledger.balance(db, account)
  };
}

function fcfa(n) {
  return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

module.exports = { create, AppError, startOfDay };
