'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../server/server');

let server, base, svc;

test.before(async () => {
  const s = await start({ port: 0, dbFile: ':memory:' });
  server = s.server;
  svc = s.svc;
  base = 'http://127.0.0.1:' + server.address().port;
});
test.after(() => server.close());
test.beforeEach(() => svc.seed());

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
}

test('les données de départ reprennent la maquette', async () => {
  const home = (await call('GET', '/api/users/aicha/home')).data;
  assert.equal(home.balance, 4750);
  assert.deepEqual(home.movements.map((m) => m.amount), [-550, -1000, 5000]);
  const day = (await call('GET', '/api/drivers/paul/day')).data;
  assert.equal(day.count, 12);
  assert.equal(day.total, 6800);
  assert.deepEqual(day.split, { owner: 3000, savings: 700, me: 3100 });
});

test('achat avec le solde BluePay : solde débité, billet signé émis', async () => {
  const r = await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'bp' });
  assert.equal(r.status, 200);
  assert.match(r.data.id, /^BP-\d{4}-\d{5}$/);
  assert.equal(r.data.valid, true);
  assert.equal((await call('GET', '/api/users/aicha/home')).data.balance, 4100);
  const latest = (await call('GET', '/api/users/aicha/tickets/latest')).data;
  assert.equal(latest.id, r.data.id);
  assert.match(latest.qrSvg, /^<svg/);
});

test('achat par Orange Money : le solde BluePay ne bouge pas', async () => {
  await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'om' });
  assert.equal((await call('GET', '/api/users/aicha/home')).data.balance, 4750);
});

test('solde insuffisant : refus et aucune écriture', async () => {
  for (let i = 0; i < 7; i++) await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'bp' });
  const home = (await call('GET', '/api/users/aicha/home')).data;
  assert.equal(home.balance, 4750 - 7 * 650);
  const r = await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'bp' });
  assert.equal(r.status, 402);
  assert.equal((await call('GET', '/api/users/aicha/home')).data.balance, 200);
});

test('entrées invalides refusées', async () => {
  assert.equal((await call('POST', '/api/users/aicha/tickets', { routeId: 'taxi', method: 'om' })).status, 400);
  assert.equal((await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'cb' })).status, 400);
  assert.equal((await call('POST', '/api/drivers/paul/rides/cash', { amount: -5 })).status, 400);
  assert.equal((await call('POST', '/api/drivers/jp/rides/cash', { amount: 300 })).status, 403);
  assert.equal((await call('GET', '/api/users/inconnu/home')).status, 404);
});

test('validation moto : une seule fois, la part va au conducteur', async () => {
  const t = (await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'om' })).data;
  const r1 = await call('POST', '/api/drivers/paul/scan', { token: t.token });
  assert.equal(r1.status, 200);
  assert.equal(r1.data.share, 200);
  assert.equal(svc.balance('driver:paul'), 200);
  const r2 = await call('POST', '/api/drivers/paul/scan', { token: t.token });
  assert.equal(r2.status, 409);
  const day = (await call('GET', '/api/drivers/paul/day')).data;
  assert.equal(day.total, 7000);
  assert.equal(day.lastRide.ticketId, t.id);
  // Le portique BRT valide le second segment ; le billet est alors entièrement utilisé.
  assert.equal((await call('POST', '/api/validators/brt/scan', { token: t.token })).status, 200);
  assert.equal(svc.balance('operator:brt'), 450);
  assert.equal(svc.balance('clearing:tickets'), 0);
  assert.equal((await call('GET', '/api/tickets/' + t.id)).data.valid, false);
});

test('billet falsifié ou expiré refusé', async () => {
  const t = (await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'om' })).data;
  const [body, sig] = t.token.split('.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  payload.e += 86400000;
  const forged = Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + sig;
  assert.equal((await call('POST', '/api/drivers/paul/scan', { token: forged })).status, 400);
  assert.equal((await call('POST', '/api/drivers/paul/scan', { token: 'n.importe.quoi' })).status, 400);
  assert.throws(() => svc.driverScan('paul', t.token, t.expiresAt + 1), /expiré/);
});

test('le registre reste équilibré après toutes les opérations', async () => {
  const t = (await call('POST', '/api/users/aicha/tickets', { routeId: 'moto-brt', method: 'bp' })).data;
  await call('POST', '/api/drivers/paul/scan', { token: t.token });
  await call('POST', '/api/drivers/paul/rides/cash', { amount: 300 });
  await call('POST', '/api/households/bonamoussadi-c/reports', { kind: 'depot_sauvage' });
  assert.equal((await call('GET', '/api/demo/ledger-check')).data.sum, 0);
  assert.equal((await call('GET', '/api/households/bonamoussadi-c')).data.reports, 1);
});

test('les fichiers de l\'application sont servis, pas ceux hors du dossier', async () => {
  const ok = await fetch(base + '/');
  assert.equal(ok.status, 200);
  const bad = await fetch(base + '/..%2fserver%2fserver.js');
  assert.notEqual(bad.status, 200);
});
