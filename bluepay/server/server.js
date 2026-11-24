'use strict';
// Serveur HTTP du démonstrateur : API JSON sous /api et fichiers de l'application.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const { open } = require('./db');
const { create, AppError } = require('./service');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function buildApp(svc) {
  const routes = [];
  const on = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern + '$'), handler });

  // Usager
  on('GET', '/api/users/(\\w+)/home', (m) => svc.home(m[1]));
  on('GET', '/api/routes', () => svc.routes());
  on('GET', '/api/users/(\\w+)/payment-methods', (m) => svc.paymentMethods(m[1]));
  on('POST', '/api/users/(\\w+)/tickets', (m, b) => svc.buyTicket(m[1], b.routeId, b.method));
  on('GET', '/api/users/(\\w+)/tickets/latest', async (m) => withQr(svc.latestTicket(m[1])));
  on('GET', '/api/tickets/([\\w-]+)', async (m) => withQr(svc.ticketView(m[1])));

  // Validation (conducteur moto, portique BRT) et clé publique pour la validation hors ligne
  on('POST', '/api/drivers/(\\w+)/scan', (m, b) => svc.driverScan(m[1], b.token));
  on('POST', '/api/validators/brt/scan', (m, b) => svc.brtScan(b.token));
  on('GET', '/api/keys/tickets', () => ({ alg: 'Ed25519', publicKey: svc.publicKey() }));

  // Conducteurs
  on('POST', '/api/drivers/(\\w+)/rides/cash', (m, b) => svc.cashRide(m[1], Number(b.amount)));
  on('GET', '/api/drivers/(\\w+)/day', (m) => svc.driverDay(m[1]));
  on('GET', '/api/drivers/(\\w+)/obligations', (m) => svc.obligations(m[1]));

  // Ménages
  on('GET', '/api/households/([\\w-]+)', (m) => svc.household(m[1]));
  on('POST', '/api/households/([\\w-]+)/reports', (m, b) => svc.report(m[1], b.kind));

  // Outils de démonstration
  on('GET', '/api/demo/pending-ticket/(\\w+)', (m) => svc.pendingMotoTicket(m[1]));
  on('POST', '/api/demo/reset', () => { svc.seed(); return { ok: true }; });
  on('GET', '/api/demo/ledger-check', () => ({ sum: svc.trialBalance() }));

  async function withQr(ticket) {
    if (!ticket) return null;
    const qr = await QRCode.toString(ticket.token, {
      type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1B33', light: '#FFFFFF' }
    });
    return Object.assign({}, ticket, { qrSvg: qr });
  }

  async function handleApi(req, res, url) {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) return send(res, 404, { error: 'Route inconnue' });
    try {
      const body = req.method === 'POST' ? await readJson(req) : {};
      const out = await route.handler(url.pathname.match(route.re), body);
      send(res, 200, out);
    } catch (err) {
      if (err instanceof AppError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: 'Erreur interne' });
    }
  }

  function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Interdit' });
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, { error: 'Introuvable' });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  }

  return function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
    if (req.method !== 'GET') return send(res, 405, { error: 'Méthode non permise' });
    serveStatic(req, res, url);
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) { reject(new AppError(413, 'Requête trop grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(new AppError(400, 'JSON invalide')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function start({ port = 3000, host = '127.0.0.1', dbFile } = {}) {
  const file = dbFile || path.join(__dirname, '..', 'data', 'bluepay.db');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const svc = create(open(file));
  const server = http.createServer(buildApp(svc));
  return new Promise((resolve) => server.listen(port, host, () => resolve({ server, svc })));
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  start({ port, host }).then(() => {
    console.log('BluePay démo : http://' + (host === '0.0.0.0' ? 'localhost' : host) + ':' + port);
    console.log('Données fictives, aucun argent réel.');
  });
}

module.exports = { start };
