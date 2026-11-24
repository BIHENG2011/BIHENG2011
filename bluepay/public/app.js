// BluePay · démonstrateur mobile, branché sur l'API simulée (données fictives, aucun argent réel).
(function () {
  'use strict';

  var app = document.getElementById('app');
  var USER = 'aicha', DRIVER = 'paul', TAXI = 'jp', HOUSEHOLD = 'bonamoussadi-c';
  var state = { payMethod: 'om', cashMode: 'scan', flash: null, busy: false };
  var renderId = 0;

  /* ---------- API ---------- */

  function api(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data && data.error ? data.error : 'Erreur ' + res.status);
        return data;
      });
    });
  }
  var get = function (url) { return api('GET', url); };
  var post = function (url, body) { return api('POST', url, body || {}); };

  /* ---------- Formatage ---------- */

  var TZ = 'Africa/Douala';
  function fcfa(n) { return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function time(ts) {
    var p = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).formatToParts(ts);
    var h = p.filter(function (x) { return x.type === 'hour'; })[0].value;
    var m = p.filter(function (x) { return x.type === 'minute'; })[0].value;
    return h + ' h ' + m;
  }
  function dayKey(ts) { return Math.floor((ts + 3600000) / 86400000); }
  function shortDate(ts) { return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short' }).format(ts); }
  function relDay(ts) {
    var d = dayKey(Date.now()) - dayKey(ts);
    if (d === 0) return "Aujourd'hui, " + time(ts);
    if (d === 1) return 'Hier, ' + time(ts);
    return shortDate(ts);
  }
  function longDate(ts) {
    var s = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'short' }).format(ts);
    var h = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(ts).filter(function (x) { return x.type === 'hour'; })[0].value);
    return s.charAt(0).toUpperCase() + s.slice(1) + ', ' + h + ' h';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Petits composants partagés ---------- */

  function icon(paths, opts) {
    opts = opts || {};
    var size = opts.size || 22;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' +
      (opts.stroke || 'currentColor') + '" stroke-width="' + (opts.width || 2) +
      '" stroke-linecap="round" aria-hidden="true">' + paths + '</svg>';
  }

  var ICONS = {
    back: '<path d="M15 5l-7 7 7 7"></path>',
    moto: '<circle cx="5.5" cy="17" r="3"></circle><circle cx="18.5" cy="17" r="3"></circle><path d="M5.5 17l4-7h6l3 7M12 6h3"></path>',
    taxi: '<path d="M3 16v-4l2-5h14l2 5v4z"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle>',
    bus: '<rect x="4" y="3" width="16" height="14" rx="2"></rect><path d="M4 11h16M7 20v-3M17 20v-3"></path>',
    brt: '<rect x="2" y="5" width="20" height="11" rx="2"></rect><path d="M2 10h20M6 19l2-3M18 19l-2-3"></path>',
    home: '<path d="M3 11l9-7 9 7v9H3z"></path>',
    route: '<circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="6" r="2"></circle><path d="M8 18h7a3 3 0 000-6H9a3 3 0 010-6h7"></path>',
    qr: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3h-3zM20 20h1M17 20h1v1"></path>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path>',
    check: '<circle cx="12" cy="12" r="10"></circle><path d="M7 12l3 3 7-7"></path>',
    alert: '<path d="M12 3l10 18H2z"></path><path d="M12 10v5M12 18v.5"></path>',
    pin: '<path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"></path><circle cx="12" cy="10" r="2.5"></circle>'
  };

  var LEG_COLORS = { moto: ['#FDEBD8', '#8A4608', '#F08A24'], brt: ['#ECE4FA', '#4A2A8F', '#7A4DD8'], walk: ['#EEF1F5', '#46566D', '#8FA0B6'] };

  function backBtn(href, label, dark) {
    return '<a href="' + href + '" class="icon-btn' + (dark ? ' icon-btn--on-dark' : '') +
      '" aria-label="' + label + '">' + icon(ICONS.back, { size: 20, width: 2.2 }) + '</a>';
  }
  function header(href, titleHtml, extra, dark) {
    return '<div class="header">' + backBtn(href, dark ? "Retour à l'accueil" : 'Retour', dark) + titleHtml + (extra || '') + '</div>';
  }
  function row(left, right, cls) {
    return '<div class="row' + (cls ? ' ' + cls : '') + '"><span>' + left + '</span>' + right + '</div>';
  }
  function flash() {
    if (!state.flash) return '';
    var f = state.flash;
    state.flash = null;
    return '<div class="flash flash--' + f.type + '" role="status">' + esc(f.text) + '</div>';
  }

  var demoBadge = '<span class="pill pill--demo push-bottom">Démonstrateur · données fictives</span>';

  /* ---------- Écrans : load() lit l'API, view() construit le HTML ---------- */

  var screens = {};

  screens.accueil = {
    load: function () { return get('/api/users/' + USER + '/home'); },
    view: function (d) {
      var modes = [
        ['Moto', ICONS.moto, '#FDEBD8', '#B35C0C'],
        ['Taxi', ICONS.taxi, '#FFF6CC', '#7A6200'],
        ['Bus', ICONS.bus, '#DDF4EA', '#0C7A50'],
        ['BRT', ICONS.brt, '#ECE4FA', '#5B33B0']
      ].map(function (m) {
        return '<a href="#/trajet" class="mode"><span class="mode__icon" style="background:' + m[2] + '">' +
          icon(m[1], { size: 24, stroke: m[3] }) + '</span>' + m[0] + '</a>';
      }).join('');

      var moves = d.movements.map(function (m) {
        var amount = m.amount >= 0
          ? '<b style="color:var(--green)">+ ' + fcfa(m.amount) + '</b>'
          : '<b>− ' + fcfa(m.amount) + '</b>';
        return row('<span class="stack"><b>' + esc(m.label) + '</b><span class="small muted">' + relDay(m.at) +
          ' · ' + esc(m.detail || m.methodName) + '</span></span>', amount);
      }).join('');

      return '<div class="screen home">' + flash() +
        '<div class="between">' +
          '<div class="stack"><span class="muted" style="font-size:14px">Bonjour</span><span style="font-size:22px;font-weight:800">' + esc(d.name) + '</span></div>' +
          '<span class="pill pill--demo">Démonstrateur · données fictives</span>' +
        '</div>' +
        '<section class="balance" aria-label="Solde">' +
          '<div class="between"><span class="balance__meta">Solde BluePay</span><span class="balance__meta" style="font-size:12px">Carte n° •••• ' + esc(d.cardLast4) + '</span></div>' +
          '<span class="balance__amount">' + fcfa(d.balance) + ' FCFA</span>' +
          '<div class="btn-row"><a href="#/payer" class="on-white">Recharger</a><a href="#/billet" class="on-glass">Mes billets</a></div>' +
        '</section>' +
        '<form class="card card--col" data-form="search">' +
          '<label for="dest" class="field-label">Où allez-vous ?</label>' +
          '<input id="dest" class="input" value="Akwa, boulevard de la Liberté">' +
          '<button type="submit" class="btn btn--dark">Voir les trajets</button>' +
        '</form>' +
        '<div class="modes">' + modes + '</div>' +
        '<div class="stack" style="gap:10px">' +
          '<span style="font-size:15px;font-weight:800">Derniers mouvements</span>' +
          '<div class="card card--list">' + moves + '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="tabbar" aria-label="Navigation principale">' +
        '<a href="#/accueil" aria-current="page">' + icon(ICONS.home) + 'Accueil</a>' +
        '<a href="#/trajet">' + icon(ICONS.route) + 'Trajets</a>' +
        '<a href="#/billet">' + icon(ICONS.qr) + 'Billets</a>' +
        '<a href="#/payer">' + icon(ICONS.card) + 'Payer</a>' +
      '</nav>';
    }
  };

  screens.trajet = {
    load: function () { return get('/api/routes'); },
    view: function (d) {
      var best = d.options.filter(function (o) { return o.best; })[0];
      var alts = d.options.filter(function (o) { return !o.best; });
      var total = best.legs.reduce(function (s, l) { return s + l.minutes; }, 0);
      var bar = best.legs.map(function (l) {
        return '<span style="width:' + Math.round((l.minutes / total) * 100) + '%;background:' + LEG_COLORS[l.mode][2] + '"></span>';
      }).join('');
      var legs = best.legs.map(function (l) {
        var c = LEG_COLORS[l.mode];
        return '<div class="leg"><span class="leg__time" style="background:' + c[0] + ';color:' + c[1] + '">' + l.minutes +
          ' min</span><span class="leg__text"><b>' + esc(l.label) + '</b><span class="small muted">' + esc(l.sub) + '</span></span></div>';
      }).join('');
      var altCards = alts.map(function (o) {
        return '<div class="card alt"><span class="stack" style="gap:4px"><b style="font-size:15px">' + esc(o.title) +
          '</b><span class="small muted">arrivée ' + time(o.arrival) + ' · ' + esc(o.note) + '</span></span><span class="alt__end"><b style="font-size:15px">' +
          o.minutes + ' min</b><span style="font-size:13px;font-weight:700">' + fcfa(o.price) + ' FCFA</span></span></div>';
      }).join('');

      return '<div class="screen">' +
        header('#/accueil', '<div class="stack"><span class="title">' + esc(d.from) + ' → ' + esc(d.to) + '</span><span class="muted" style="font-size:13px">Départ maintenant · ' + d.options.length + ' options</span></div>') +
        '<section class="card route--best" aria-label="Trajet recommandé">' +
          '<div class="between"><span class="pill pill--info">Le plus rapide</span><span class="muted" style="font-size:13px">arrivée ' + time(best.arrival) + '</span></div>' +
          '<div class="between" style="align-items:baseline"><span style="font-size:28px;font-weight:800">' + best.minutes + ' min</span><span style="font-size:20px;font-weight:800">' + fcfa(best.price) + ' FCFA</span></div>' +
          '<div class="bar" aria-hidden="true">' + bar + '</div>' +
          '<div>' + legs + '</div>' +
          '<span class="hint">Un seul billet QR couvre la moto et le BRT. Le BRT est proposé à la mise en service des lignes.</span>' +
        '</section>' +
        altCards +
        '<a href="#/payer" class="btn btn--primary push-bottom">Acheter le billet · ' + fcfa(best.price) + ' FCFA</a>' +
      '</div>';
    }
  };

  screens.payer = {
    load: function () {
      return Promise.all([get('/api/users/' + USER + '/payment-methods'), get('/api/routes')]).then(function (r) {
        return { methods: r[0], route: r[1].options.filter(function (o) { return o.purchasable; })[0] };
      });
    },
    view: function (d) {
      var chosen = d.methods.filter(function (m) { return m.id === state.payMethod; })[0] || d.methods[0];
      var methods = d.methods.map(function (m) {
        return '<button type="button" class="method" role="radio" aria-checked="' + (m.id === chosen.id) +
          '" data-pay="' + m.id + '"><span class="method__logo" style="background:' + m.bg + ';color:' + m.fg + '">' +
          esc(m.short) + '</span><span class="method__text"><b style="font-size:15px">' + esc(m.name) +
          '</b><span class="small muted">' + esc(m.sub) + '</span></span><span class="radio"></span></button>';
      }).join('');

      return '<div class="screen">' +
        header('#/trajet', '<span class="title">Payer ' + fcfa(d.route.price) + ' FCFA</span>') + flash() +
        '<div class="card between" style="align-items:flex-start;font-size:14px"><span class="stack-3"><b>Billet intermodal</b><span class="small muted">Moto + BRT ligne 1 · valable 2 h</span></span><b style="font-size:16px">' + fcfa(d.route.price) + '</b></div>' +
        '<span class="eyebrow" id="pay-label">Payer avec</span>' +
        '<div class="methods" role="radiogroup" aria-labelledby="pay-label">' + methods + '</div>' +
        '<span class="note">Wave et le mobile money de Camtel seront ajoutés dès que leur service sera ouvert au Cameroun. Quel que soit le moyen choisi, l\'argent arrive sur un compte cantonné en banque.</span>' +
        '<button type="button" class="btn btn--primary push-bottom" data-action="buy" data-route="' + d.route.id + '"' + (state.busy ? ' disabled' : '') + '>' +
          (state.busy ? 'Paiement en cours…' : 'Confirmer avec ' + esc(chosen.name)) + '</button>' +
      '</div>';
    }
  };

  screens.billet = {
    load: function () { return get('/api/users/' + USER + '/tickets/latest'); },
    view: function (t) {
      if (!t) {
        return '<div class="screen screen--dark">' +
          header('#/accueil', '<span class="title" style="color:#FFFFFF">Mes billets</span>', '', true) +
          '<div class="ticket"><span class="muted" style="text-align:center">Aucun billet pour le moment.</span>' +
          '<a href="#/trajet" class="btn btn--primary" style="width:100%">Choisir un trajet</a></div></div>';
      }
      function cell(label, value) { return '<span class="stack-3"><span class="muted">' + label + '</span>' + value + '</span>'; }
      var segs = t.legs.map(function (l, i) {
        var status = l.validatedAt
          ? '<span style="color:var(--green)">validé ' + time(l.validatedAt) + '</span>'
          : 'à valider';
        return cell('Segment ' + (i + 1), '<b>' + esc(l.label) + ' · ' + status + '</b>');
      }).join('');
      var expired = Date.now() >= t.expiresAt;
      var pill = t.valid
        ? '<span class="pill pill--valid" style="margin-left:auto">Valide</span>'
        : '<span class="pill pill--muted" style="margin-left:auto">' + (expired ? 'Expiré' : 'Utilisé') + '</span>';

      return '<div class="screen screen--dark">' +
        header('#/accueil', '<span class="title" style="color:#FFFFFF">Billet payé</span>', pill, true) + flash() +
        '<section class="ticket" aria-label="Billet">' +
          '<div class="between muted" style="width:100%;font-size:13px"><span>Billet intermodal</span><span>n° ' + esc(t.id) + '</span></div>' +
          '<div class="qr" role="img" aria-label="Code QR du billet, à présenter au valideur">' + t.qrSvg + '</div>' +
          '<span class="muted" style="font-size:13px;text-align:center">Présentez ce code au conducteur de moto, puis au portique du BRT. Il reste lisible sans connexion.</span>' +
          '<div class="dashed"></div>' +
          '<div class="ticket__grid">' +
            cell("Valable jusqu'à", '<b style="font-size:16px">' + time(t.expiresAt) + '</b>') +
            cell('Montant', '<b style="font-size:16px">' + fcfa(t.amount) + ' FCFA</b>') +
            segs +
          '</div>' +
        '</section>' +
        '<div class="btn-row"><a href="#/accueil" class="btn btn--ghost-dark">Reçu</a><a href="#/accueil" class="btn btn--ghost-dark">Partager le billet</a></div>' +
        '<span style="font-size:12px;color:var(--pale);text-align:center;line-height:1.5">Sans smartphone : le même titre se charge sur la carte BluePay ou s\'achète par USSD et chez un agent.</span>' +
      '</div>';
    }
  };

  screens.moto = {
    load: function () { return get('/api/drivers/' + DRIVER + '/day'); },
    view: function (d) {
      var accent = 'var(--orange)';
      var t = d.total || 1;
      function pct(n) { return Math.round((n / t) * 100); }
      function split(color, label, amount, strong) {
        return row('<span class="with-swatch"><span class="swatch" style="background:' + color + '"></span>' +
          (strong ? '<b>' + label + '</b>' : label) + '</span>', '<b>' + fcfa(amount) + '</b>', 'row--sm' + (strong ? ' row--strong' : ''));
      }
      var duties = d.obligations.map(function (o) {
        return '<div class="between" style="font-size:13px"><span>' + esc(o.name) + '</span><span class="muted">' + esc(o.status) + '</span></div>';
      }).join('');

      return '<div class="screen screen--flush">' +
        '<div class="driver-head">' +
          '<div class="between"><span class="stack"><span style="font-size:13px;color:var(--pale)">Moto-taxi · ' + esc(d.plate) + '</span><span class="title-lg">' + esc(d.name) + '</span></span><span class="pill pill--accent">En service</span></div>' +
          '<span style="font-size:13px;color:var(--pale)">Recette du jour · ' + d.count + ' course' + (d.count > 1 ? 's' : '') + '</span>' +
          '<span style="font-size:36px;font-weight:800;letter-spacing:-0.5px">' + fcfa(d.total) + ' FCFA</span>' +
          '<div class="bar" aria-hidden="true"><span style="width:' + pct(d.split.owner) + '%;background:#8FA0B6"></span><span style="width:' + pct(d.split.savings) + '%;background:#F4B400"></span><span style="width:' + pct(d.split.me) + '%;background:' + accent + '"></span></div>' +
        '</div>' +
        '<div class="driver-body">' + flash() +
          '<div class="card card--list">' +
            '<span class="eyebrow" style="display:block;padding:12px 0 4px">Répartition automatique ce soir</span>' +
            split('#8FA0B6', 'Versement au propriétaire', d.split.owner) +
            split('#F4B400', 'Épargne pour mes obligations', d.split.savings) +
            split(accent, 'Pour moi', d.split.me, true) +
          '</div>' +
          '<div class="card card--col">' +
            '<div class="between"><b style="font-size:15px">Mes obligations</b><span class="pill pill--ok">À jour</span></div>' +
            duties +
            '<span class="small muted">Vous ne payez aucuns frais BluePay sur ces obligations.</span>' +
          '</div>' +
          '<a href="#/encaisser" class="btn btn--accent">Encaisser une course</a>' +
          demoBadge +
        '</div>' +
      '</div>';
    }
  };

  screens.encaisser = {
    load: function () { return get('/api/drivers/' + DRIVER + '/day'); },
    view: function (d) {
      var mode = state.cashMode;
      var tabs = [['scan', 'Scanner'], ['show', 'Mon QR'], ['cash', 'Espèces']].map(function (t) {
        return '<button type="button" data-cash="' + t[0] + '" aria-pressed="' + (t[0] === mode) + '">' + t[1] + '</button>';
      }).join('');

      var panel;
      if (mode === 'scan') {
        panel = '<div class="panel panel--scan"><span class="viewfinder" aria-hidden="true"><span></span></span>' +
          '<span style="font-size:14px;color:#FFFFFF;text-align:center;padding:0 30px">Visez le billet QR ou posez la carte BluePay du client sur le téléphone</span>' +
          '<button type="button" class="demo-scan" data-action="scan">Démo : scanner le billet d\'Aïcha</button></div>';
      } else if (mode === 'show') {
        panel = '<div class="panel panel--light">' +
          '<span class="muted" style="font-size:13px">Le client scanne ce code avec son application</span>' +
          '<span style="font-size:40px;font-weight:800">300 FCFA</span>' +
          '<span class="muted" style="font-size:13px">Code marchand fixe · ' + esc(d.plate) + '</span>' +
          '<span class="hint" style="padding:8px 12px">Orange Money, MTN MoMo ou solde BluePay</span></div>';
      } else {
        panel = '<form class="panel panel--light panel--form" id="cash-form" data-form="cash">' +
          '<label for="cash" style="font-size:13px;font-weight:700;color:var(--muted)">Montant reçu en espèces</label>' +
          '<input id="cash" name="amount" class="input" value="300" inputmode="numeric" pattern="[0-9]*" required style="font-size:30px;font-weight:800;border-radius:12px">' +
          '<span class="muted" style="font-size:13px;line-height:1.5">La course est enregistrée. L\'épargne des obligations sera prélevée sur votre portefeuille ce soir, avec votre accord déjà donné.</span></form>';
      }

      var last = d.lastRide;
      var lastHtml = last
        ? '<div class="callout callout--ok">' + icon(ICONS.check, { size: 24, stroke: '#0C7A50', width: 2.4 }) +
          '<span class="stack"><b>Dernière course validée, ' + time(last.at) + '</b><span style="color:#2E4A3E">' +
          esc(last.passenger) + ' · ' + (last.ticketId ? 'billet ' + esc(last.ticketId) : (last.method === 'cash' ? 'espèces' : 'paiement mobile')) +
          '</span></span></div>'
        : '';

      var finish = mode === 'cash'
        ? '<button type="submit" form="cash-form" class="btn btn--accent push-bottom">Enregistrer et terminer</button>'
        : '<a href="#/moto" class="btn btn--accent push-bottom">Terminer</a>';

      return '<div class="screen">' +
        header('#/moto', '<span class="title">Encaisser une course</span>') +
        '<div class="segmented" role="group" aria-label="Mode d\'encaissement">' + tabs + '</div>' +
        flash() + panel +
        '<div class="card card--col" style="gap:8px;font-size:14px">' +
          '<div class="between"><span>Course : Bonamoussadi → Ndokoti</span><b>300</b></div>' +
          '<div class="between muted" style="font-size:13px"><span>Segment d\'un billet intermodal</span><span>part moto 200</span></div>' +
        '</div>' +
        lastHtml + finish +
      '</div>';
    }
  };

  screens.obligations = {
    load: function () { return get('/api/drivers/' + TAXI + '/obligations'); },
    view: function (d) {
      var items = d.items.map(function (it) {
        var done = it.pct >= 100;
        return '<div class="stack" style="gap:7px;padding:11px 0;border-bottom:1px solid var(--line)">' +
          '<div class="between" style="align-items:baseline"><b style="font-size:14px">' + esc(it.name) + '</b><span style="font-size:12px;font-weight:700;color:' + (done ? '#0C7A50' : '#46566D') + '">' + esc(it.status) + '</span></div>' +
          '<span class="progress" role="progressbar" aria-label="' + esc(it.name) + '" aria-valuenow="' + it.pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + it.pct + '%;background:' + (done ? '#14A06B' : '#1A6FD8') + '"></span></span>' +
          '<span class="small muted">' + esc(it.who) + '</span></div>';
      }).join('');
      var initials = d.name.split(/[\s-]+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();

      return '<div class="screen screen--tight">' +
        '<div class="between"><span class="stack"><span class="muted" style="font-size:13px">Taxi · ' + esc(d.plate) + ' · ' + esc(d.name) + '</span><span class="title-lg">Mes obligations</span></span><span class="avatar" aria-hidden="true">' + esc(initials) + '</span></div>' +
        '<div class="card--dark">' +
          '<span style="font-size:13px;color:var(--pale)">Épargne mise de côté chaque jour</span>' +
          '<span style="font-size:30px;font-weight:800">' + fcfa(d.savingsDaily) + ' FCFA</span>' +
          '<span style="font-size:13px;color:#DCE4EE;line-height:1.5">Chaque échéance est payée à temps, directement au bon organisme. Plus de grosse somme à trouver d\'un coup.</span>' +
        '</div>' +
        '<div class="card" style="padding:6px 16px">' + items + '</div>' +
        '<span class="note">Aucuns frais BluePay pour vous : la commission est réglée par l\'État, l\'assureur ou la CNPS. L\'impôt sur le revenu n\'est pas prélevé par BluePay.</span>' +
        demoBadge +
      '</div>';
    }
  };

  screens.menage = {
    load: function () { return get('/api/households/' + HOUSEHOLD); },
    view: function (h) {
      return '<div class="screen screen--tight">' +
        '<div class="stack"><span class="muted" style="font-size:13px">Ménage · ' + esc(h.label) + '</span><span class="title-lg">Collecte des déchets</span></div>' +
        flash() +
        '<div class="card card--lg card--col" style="gap:12px">' +
          '<div class="between"><span class="muted" style="font-size:13px">Prochain passage</span><span class="pill pill--ok">Abonnement actif</span></div>' +
          '<span style="font-size:26px;font-weight:800">' + longDate(h.nextPickup) + '</span>' +
          '<span class="muted" style="font-size:13px">Pré-collecteur : ' + esc(h.collector) + ' · ' + esc(h.pickupNote) + '</span>' +
        '</div>' +
        '<div class="card card--list">' +
          row('Abonnement mensuel', '<b>' + fcfa(h.monthlyFee) + ' FCFA</b>') +
          row('Paiement', '<b>' + esc(h.payMethod) + ', le ' + h.payDay + '</b>') +
          row('Passages ce mois', '<b>' + h.passagesDone + ' sur ' + h.passagesPlanned + '</b>') +
        '</div>' +
        '<div class="actions">' +
          '<button type="button" class="action" data-report="passage_manque">' + icon(ICONS.alert, { stroke: '#D94848' }) + 'Signaler un passage manqué</button>' +
          '<button type="button" class="action" data-report="depot_sauvage">' + icon(ICONS.pin, { stroke: '#1A6FD8' }) + 'Signaler un dépôt sauvage</button>' +
        '</div>' +
        '<div class="callout callout--info">Votre abonnement est versé sur le compte séquestre du Programme ÉcoSynergie. Il paie la collecte, la pré-collecte et la valorisation des déchets de votre quartier.</div>' +
        demoBadge +
      '</div>';
    }
  };

  /* ---------- Routage par ancre ---------- */

  function currentRoute() {
    var name = location.hash.replace(/^#\/?/, '');
    return screens[name] ? name : 'accueil';
  }

  function render() {
    var route = currentRoute();
    var id = ++renderId;
    document.querySelectorAll('.demo-nav a').forEach(function (a) {
      if (a.getAttribute('href') === '#/' + route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    app.setAttribute('aria-busy', 'true');
    return screens[route].load().then(function (data) {
      if (id !== renderId) return;
      app.innerHTML = screens[route].view(data);
    }, function (err) {
      if (id !== renderId) return;
      app.innerHTML = '<div class="screen"><div class="flash flash--error" role="alert">' +
        (err instanceof TypeError
          ? 'API injoignable. Lancez le serveur avec « npm start » dans le dossier bluepay, puis ouvrez http://localhost:3000.'
          : esc(err.message)) + '</div></div>';
    }).then(function () { app.removeAttribute('aria-busy'); });
  }

  function go(route, flashMsg) {
    state.flash = flashMsg || null;
    if (location.hash === '#/' + route) render();
    else location.hash = '#/' + route;
  }

  /* ---------- Actions ---------- */

  function fail(err) { state.busy = false; state.flash = { type: 'error', text: err.message }; render(); }

  app.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-pay]'))) { state.payMethod = t.getAttribute('data-pay'); render(); return; }
    if ((t = e.target.closest('[data-cash]'))) { state.cashMode = t.getAttribute('data-cash'); render(); return; }
    if ((t = e.target.closest('[data-action="buy"]'))) {
      state.busy = true; render();
      post('/api/users/' + USER + '/tickets', { routeId: t.getAttribute('data-route'), method: state.payMethod })
        .then(function (tk) { state.busy = false; go('billet', { type: 'ok', text: 'Paiement accepté. Billet ' + tk.id + ' émis.' }); }, fail);
      return;
    }
    if ((t = e.target.closest('[data-action="scan"]'))) {
      get('/api/demo/pending-ticket/' + USER).then(function (p) {
        if (!p) throw new Error("Aucun billet d'Aïcha à valider. Achetez-en un côté usager.");
        return post('/api/drivers/' + DRIVER + '/scan', { token: p.token });
      }).then(function (r) {
        state.flash = { type: 'ok', text: 'Billet ' + r.ticketId + ' validé : + ' + fcfa(r.share) + ' FCFA pour vous.' };
        render();
      }, fail);
      return;
    }
    if ((t = e.target.closest('[data-report]'))) {
      post('/api/households/' + HOUSEHOLD + '/reports', { kind: t.getAttribute('data-report') })
        .then(function () { state.flash = { type: 'ok', text: 'Signalement envoyé au Programme ÉcoSynergie.' }; render(); }, fail);
    }
  });

  app.addEventListener('submit', function (e) {
    var form = e.target.getAttribute('data-form');
    if (!form) return;
    e.preventDefault();
    if (form === 'search') { go('trajet'); return; }
    if (form === 'cash') {
      var amount = parseInt(e.target.elements.amount.value.replace(/\s/g, ''), 10);
      post('/api/drivers/' + DRIVER + '/rides/cash', { amount: amount })
        .then(function () { go('moto', { type: 'ok', text: 'Course de ' + fcfa(amount) + ' FCFA enregistrée.' }); }, fail);
    }
  });

  var reset = document.getElementById('demo-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      post('/api/demo/reset').then(function () {
        state.payMethod = 'om'; state.cashMode = 'scan';
        go('accueil', { type: 'ok', text: 'Démonstration réinitialisée.' });
      }, fail);
    });
  }

  window.addEventListener('hashchange', render);
  render();
})();
