// BluePay · démonstrateur mobile. Toutes les données sont fictives.
(function () {
  'use strict';

  var app = document.getElementById('app');
  var state = { payMethod: 'om', cashMode: 'scan' };

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

  var demoBadge = '<span class="pill pill--demo push-bottom">Démonstrateur · données fictives</span>';

  /* ---------- Écrans ---------- */

  var screens = {};

  screens.accueil = function () {
    var modes = [
      ['Moto', ICONS.moto, '#FDEBD8', '#B35C0C'],
      ['Taxi', ICONS.taxi, '#FFF6CC', '#7A6200'],
      ['Bus', ICONS.bus, '#DDF4EA', '#0C7A50'],
      ['BRT', ICONS.brt, '#ECE4FA', '#5B33B0']
    ].map(function (m) {
      return '<a href="#/trajet" class="mode"><span class="mode__icon" style="background:' + m[2] + '">' +
        icon(m[1], { size: 24, stroke: m[3] }) + '</span>' + m[0] + '</a>';
    }).join('');

    var moves = [
      ['Trajet moto + bus', 'Hier, 18 h 12 · Orange Money', '<b>− 550</b>'],
      ['Collecte des déchets', '22 nov. · abonnement du ménage', '<b>− 1 000</b>'],
      ['Recharge', '20 nov. · MTN MoMo', '<b style="color:var(--green)">+ 5 000</b>']
    ].map(function (m) {
      return row('<span class="stack"><b>' + m[0] + '</b><span class="small muted">' + m[1] + '</span></span>', m[2]);
    }).join('');

    return '<div class="screen home">' +
      '<div class="between">' +
        '<div class="stack"><span class="muted" style="font-size:14px">Bonjour</span><span style="font-size:22px;font-weight:800">Aïcha</span></div>' +
        '<span class="pill pill--demo">Démonstrateur · données fictives</span>' +
      '</div>' +
      '<section class="balance" aria-label="Solde">' +
        '<div class="between"><span class="balance__meta">Solde BluePay</span><span class="balance__meta" style="font-size:12px">Carte n° •••• 2207</span></div>' +
        '<span class="balance__amount">4 750 FCFA</span>' +
        '<div class="btn-row"><a href="#/payer" class="on-white">Recharger</a><a href="#/billet" class="on-glass">Mes billets</a></div>' +
      '</section>' +
      '<form class="card card--col" action="#/trajet" onsubmit="location.hash=\'#/trajet\';return false">' +
        '<label for="dest" class="field-label">Où allez-vous ?</label>' +
        '<input id="dest" class="input" value="Akwa, boulevard de la Liberté">' +
        '<button type="submit" class="btn btn--dark">Voir les trajets</button>' +
      '</form>' +
      '<div class="modes">' + modes + '</div>' +
      '<div class="card--col" style="display:flex">' +
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
  };

  screens.trajet = function () {
    var legs = [
      ['7 min', '#FDEBD8', '#8A4608', "Moto-taxi jusqu'à la station Ndokoti", 'Conducteur identifié · 200 FCFA'],
      ['20 min', '#ECE4FA', '#4A2A8F', 'BRT ligne 1, direction Akwa', 'Ndokoti → Rond-point Deïdo · 450 FCFA'],
      ['7 min', '#EEF1F5', '#46566D', 'À pied, 450 m', "jusqu'au boulevard de la Liberté"]
    ].map(function (l) {
      return '<div class="leg"><span class="leg__time" style="background:' + l[1] + ';color:' + l[2] + '">' + l[0] +
        '</span><span class="leg__text"><b>' + l[3] + '</b><span class="small muted">' + l[4] + '</span></span></div>';
    }).join('');

    function alt(name, sub, time, price) {
      return '<div class="card alt"><span class="stack" style="gap:4px"><b style="font-size:15px">' + name +
        '</b><span class="small muted">' + sub + '</span></span><span class="alt__end"><b style="font-size:15px">' +
        time + '</b><span style="font-size:13px;font-weight:700">' + price + '</span></span></div>';
    }

    return '<div class="screen">' +
      header('#/accueil', '<div class="stack"><span class="title">Bonamoussadi → Akwa</span><span class="muted" style="font-size:13px">Départ maintenant · 3 options</span></div>') +
      '<section class="card route--best" aria-label="Trajet recommandé">' +
        '<div class="between"><span class="pill pill--info">Le plus rapide</span><span class="muted" style="font-size:13px">arrivée 08 h 41</span></div>' +
        '<div class="between" style="align-items:baseline"><span style="font-size:28px;font-weight:800">34 min</span><span style="font-size:20px;font-weight:800">650 FCFA</span></div>' +
        '<div class="bar" aria-hidden="true"><span style="width:22%;background:#F08A24"></span><span style="width:58%;background:#7A4DD8"></span><span style="width:20%;background:#8FA0B6"></span></div>' +
        '<div>' + legs + '</div>' +
        '<span class="hint">Un seul billet QR couvre la moto et le BRT. Le BRT est proposé à la mise en service des lignes.</span>' +
      '</section>' +
      alt('Moto + bus de ville', 'arrivée 08 h 52 · 1 correspondance', '45 min', '550 FCFA') +
      alt('Taxi direct', 'arrivée 08 h 39 · selon le trafic', '32 min', '1 000 FCFA') +
      '<a href="#/payer" class="btn btn--primary push-bottom">Acheter le billet · 650 FCFA</a>' +
    '</div>';
  };

  var PAY_METHODS = [
    { id: 'om', name: 'Orange Money', sub: '6•• •• •• 41 · code de confirmation', short: 'OM', bg: '#FF7900', fg: '#1A0E00' },
    { id: 'momo', name: 'MTN MoMo', sub: '6•• •• •• 18', short: 'MoMo', bg: '#FFCC00', fg: '#1B1300' },
    { id: 'bp', name: 'Solde BluePay', sub: '4 750 FCFA disponibles', short: 'BP', bg: '#1A6FD8', fg: '#FFFFFF' },
    { id: 'visa', name: 'Carte Visa', sub: '•••• 5521 · sans contact', short: 'VISA', bg: '#1A1F71', fg: '#FFFFFF' },
    { id: 'vv', name: 'Visa virtuelle', sub: 'émise dans l’application', short: 'VV', bg: '#2D3A8C', fg: '#FFFFFF' },
    { id: 'ussd', name: 'USSD, sans internet', sub: 'composez le code depuis tout téléphone', short: '*#', bg: '#0B1B33', fg: '#FFFFFF' }
  ];

  screens.payer = function () {
    var chosen = PAY_METHODS.filter(function (m) { return m.id === state.payMethod; })[0];
    var methods = PAY_METHODS.map(function (m) {
      return '<button type="button" class="method" role="radio" aria-checked="' + (m.id === state.payMethod) +
        '" data-pay="' + m.id + '"><span class="method__logo" style="background:' + m.bg + ';color:' + m.fg + '">' +
        m.short + '</span><span class="method__text"><b style="font-size:15px">' + m.name +
        '</b><span class="small muted">' + m.sub + '</span></span><span class="radio"></span></button>';
    }).join('');

    return '<div class="screen">' +
      header('#/trajet', '<span class="title">Payer 650 FCFA</span>') +
      '<div class="card between" style="align-items:flex-start;font-size:14px"><span class="stack-3"><b>Billet intermodal</b><span class="small muted">Moto + BRT ligne 1 · valable 2 h</span></span><b style="font-size:16px">650</b></div>' +
      '<span class="eyebrow" id="pay-label">Payer avec</span>' +
      '<div class="methods" role="radiogroup" aria-labelledby="pay-label">' + methods + '</div>' +
      '<span class="note">Wave et le mobile money de Camtel seront ajoutés dès que leur service sera ouvert au Cameroun. Quel que soit le moyen choisi, l\'argent arrive sur un compte cantonné en banque.</span>' +
      '<a href="#/billet" class="btn btn--primary push-bottom">Confirmer avec ' + chosen.name + '</a>' +
    '</div>';
  };

  screens.billet = function () {
    function cell(label, value) {
      return '<span class="stack-3"><span class="muted">' + label + '</span>' + value + '</span>';
    }
    return '<div class="screen screen--dark">' +
      header('#/accueil', '<span class="title" style="color:#FFFFFF">Billet payé</span>', '<span class="pill pill--valid" style="margin-left:auto">Valide</span>', true) +
      '<section class="ticket" aria-label="Billet">' +
        '<div class="between muted" style="width:100%;font-size:13px"><span>Billet intermodal</span><span>n° BP-2611-80417</span></div>' +
        '<svg width="236" height="236" viewBox="-2 -2 29 29" role="img" aria-label="Code QR du billet, à présenter au valideur"><rect x="-2" y="-2" width="29" height="29" fill="#FFFFFF"></rect><path fill="#0B1B33" d="' + window.BP_QR_PATH + '"></path></svg>' +
        '<span class="muted" style="font-size:13px;text-align:center">Présentez ce code au conducteur de moto, puis au portique du BRT. Il reste lisible sans connexion.</span>' +
        '<div class="dashed"></div>' +
        '<div class="ticket__grid">' +
          cell("Valable jusqu'à", '<b style="font-size:16px">10 h 07</b>') +
          cell('Montant', '<b style="font-size:16px">650 FCFA</b>') +
          cell('Segment 1', '<b>Moto · <span style="color:var(--green)">validé 08 h 09</span></b>') +
          cell('Segment 2', '<b>BRT ligne 1 · à valider</b>') +
        '</div>' +
      '</section>' +
      '<div class="btn-row"><a href="#/accueil" class="btn btn--ghost-dark">Reçu</a><a href="#/accueil" class="btn btn--ghost-dark">Partager le billet</a></div>' +
      '<span style="font-size:12px;color:var(--pale);text-align:center;line-height:1.5">Sans smartphone : le même titre se charge sur la carte BluePay ou s\'achète par USSD et chez un agent.</span>' +
    '</div>';
  };

  screens.moto = function () {
    var accent = 'var(--orange)';
    function split(color, label, amount, strong) {
      return row('<span class="with-swatch"><span class="swatch" style="background:' + color + '"></span>' +
        (strong ? '<b>' + label + '</b>' : label) + '</span>', '<b>' + amount + '</b>', 'row--sm' + (strong ? ' row--strong' : ''));
    }
    function duty(name, status) {
      return '<div class="between" style="font-size:13px"><span>' + name + '</span><span class="muted">' + status + '</span></div>';
    }
    return '<div class="screen screen--flush">' +
      '<div class="driver-head">' +
        '<div class="between"><span class="stack"><span style="font-size:13px;color:var(--pale)">Moto-taxi · DLA 3-0418</span><span class="title-lg">Paul M.</span></span><span class="pill pill--accent">En service</span></div>' +
        '<span style="font-size:13px;color:var(--pale)">Recette du jour · 12 courses</span>' +
        '<span style="font-size:36px;font-weight:800;letter-spacing:-0.5px">6 800 FCFA</span>' +
        '<div class="bar" aria-hidden="true"><span style="width:44%;background:#8FA0B6"></span><span style="width:11%;background:#F4B400"></span><span style="width:45%;background:' + accent + '"></span></div>' +
      '</div>' +
      '<div class="driver-body">' +
        '<div class="card card--list">' +
          '<span class="eyebrow" style="display:block;padding:12px 0 4px">Répartition automatique ce soir</span>' +
          split('#8FA0B6', 'Versement au propriétaire', '3 000') +
          split('#F4B400', 'Épargne pour mes obligations', '700') +
          split(accent, 'Pour moi', '3 100', true) +
        '</div>' +
        '<div class="card card--col">' +
          '<div class="between"><b style="font-size:15px">Mes obligations</b><span class="pill pill--ok">À jour</span></div>' +
          duty('Assurance COVA', "couvert jusqu'au 31 déc.") +
          duty('CNPS, assurance volontaire', 'novembre payé') +
          duty('Permis de stationnement', '62 % épargné') +
          '<span class="small muted">Vous ne payez aucuns frais BluePay sur ces obligations.</span>' +
        '</div>' +
        '<a href="#/encaisser" class="btn btn--accent">Encaisser une course</a>' +
        demoBadge +
      '</div>' +
    '</div>';
  };

  screens.encaisser = function () {
    var mode = state.cashMode;
    var tabs = [['scan', 'Scanner'], ['show', 'Mon QR'], ['cash', 'Espèces']].map(function (t) {
      return '<button type="button" data-cash="' + t[0] + '" aria-pressed="' + (t[0] === mode) + '">' + t[1] + '</button>';
    }).join('');

    var panel;
    if (mode === 'scan') {
      panel = '<div class="panel panel--scan"><span class="viewfinder" aria-hidden="true"><span></span></span>' +
        '<span style="font-size:14px;color:#FFFFFF;text-align:center;padding:0 30px">Visez le billet QR ou posez la carte BluePay du client sur le téléphone</span></div>';
    } else if (mode === 'show') {
      panel = '<div class="panel panel--light">' +
        '<span class="muted" style="font-size:13px">Le client scanne ce code avec son application</span>' +
        '<span style="font-size:40px;font-weight:800">300 FCFA</span>' +
        '<span class="muted" style="font-size:13px">Code marchand fixe · DLA 3-0418</span>' +
        '<span class="hint" style="padding:8px 12px">Orange Money, MTN MoMo ou solde BluePay</span></div>';
    } else {
      panel = '<div class="panel panel--light panel--form">' +
        '<label for="cash" style="font-size:13px;font-weight:700;color:var(--muted)">Montant reçu en espèces</label>' +
        '<input id="cash" class="input" value="300" inputmode="numeric" style="font-size:30px;font-weight:800;border-radius:12px">' +
        '<span class="muted" style="font-size:13px;line-height:1.5">La course est enregistrée. L\'épargne des obligations sera prélevée sur votre portefeuille ce soir, avec votre accord déjà donné.</span></div>';
    }

    return '<div class="screen">' +
      header('#/moto', '<span class="title">Encaisser une course</span>') +
      '<div class="segmented" role="group" aria-label="Mode d\'encaissement">' + tabs + '</div>' +
      panel +
      '<div class="card card--col" style="gap:8px;font-size:14px">' +
        '<div class="between"><span>Course : Bonamoussadi → Ndokoti</span><b>300</b></div>' +
        '<div class="between muted" style="font-size:13px"><span>Segment d\'un billet intermodal</span><span>part moto 200</span></div>' +
      '</div>' +
      '<div class="callout callout--ok">' + icon(ICONS.check, { size: 24, stroke: '#0C7A50', width: 2.4 }) +
        '<span class="stack"><b>Dernière course validée, 08 h 09</b><span style="color:#2E4A3E">Aïcha N. · billet BP-2611-80417</span></span></div>' +
      '<a href="#/moto" class="btn btn--accent push-bottom">Terminer</a>' +
    '</div>';
  };

  screens.obligations = function () {
    var items = [
      ['Vignette automobile', 'Trésor public · échéance annuelle', 72, '72 % épargné'],
      ['Assurance COVA', 'via courtier agréé · prime échelonnée', 100, 'Couvert'],
      ['CNPS, assurance volontaire', 'retraite et risques professionnels', 100, 'Novembre payé'],
      ['Visite technique', 'centre de contrôle agréé · semestrielle', 45, '45 % épargné'],
      ['Carte bleue et stationnement', 'Communauté urbaine · annuelle', 88, '88 % épargné'],
      ['Licence de transport', 'Ministère des Transports · annuelle', 30, '30 % épargné']
    ].map(function (it) {
      var done = it[2] === 100;
      return '<div class="stack" style="gap:7px;padding:11px 0;border-bottom:1px solid var(--line)">' +
        '<div class="between" style="align-items:baseline"><b style="font-size:14px">' + it[0] + '</b><span style="font-size:12px;font-weight:700;color:' + (done ? '#0C7A50' : '#46566D') + '">' + it[3] + '</span></div>' +
        '<span class="progress" role="progressbar" aria-label="' + it[0] + '" aria-valuenow="' + it[2] + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + it[2] + '%;background:' + (done ? '#14A06B' : '#1A6FD8') + '"></span></span>' +
        '<span class="small muted">' + it[1] + '</span></div>';
    }).join('');

    return '<div class="screen screen--tight">' +
      '<div class="between"><span class="stack"><span class="muted" style="font-size:13px">Taxi · LT 2-7731 · Jean-Paul E.</span><span class="title-lg">Mes obligations</span></span><span class="avatar" aria-hidden="true">JP</span></div>' +
      '<div class="card--dark">' +
        '<span style="font-size:13px;color:var(--pale)">Épargne mise de côté chaque jour</span>' +
        '<span style="font-size:30px;font-weight:800">1 050 FCFA</span>' +
        '<span style="font-size:13px;color:#DCE4EE;line-height:1.5">Chaque échéance est payée à temps, directement au bon organisme. Plus de grosse somme à trouver d\'un coup.</span>' +
      '</div>' +
      '<div class="card" style="padding:6px 16px">' + items + '</div>' +
      '<span class="note">Aucuns frais BluePay pour vous : la commission est réglée par l\'État, l\'assureur ou la CNPS. L\'impôt sur le revenu n\'est pas prélevé par BluePay.</span>' +
      demoBadge +
    '</div>';
  };

  screens.menage = function () {
    return '<div class="screen screen--tight">' +
      '<div class="stack"><span class="muted" style="font-size:13px">Ménage · Bonamoussadi, bloc C</span><span class="title-lg">Collecte des déchets</span></div>' +
      '<div class="card card--lg card--col" style="gap:12px">' +
        '<div class="between"><span class="muted" style="font-size:13px">Prochain passage</span><span class="pill pill--ok">Abonnement actif</span></div>' +
        '<span style="font-size:26px;font-weight:800">Jeudi 26 nov., 7 h</span>' +
        '<span class="muted" style="font-size:13px">Pré-collecteur : Martin K. · sacs devant le portail</span>' +
      '</div>' +
      '<div class="card card--list">' +
        row('Abonnement mensuel', '<b>1 000 FCFA</b>') +
        row('Paiement', '<b>Orange Money, le 22</b>') +
        row('Passages ce mois', '<b>7 sur 8</b>') +
      '</div>' +
      '<div class="actions">' +
        '<button type="button" class="action">' + icon(ICONS.alert, { stroke: '#D94848' }) + 'Signaler un passage manqué</button>' +
        '<button type="button" class="action">' + icon(ICONS.pin, { stroke: '#1A6FD8' }) + 'Signaler un dépôt sauvage</button>' +
      '</div>' +
      '<div class="callout callout--info">Votre abonnement est versé sur le compte séquestre du Programme ÉcoSynergie. Il paie la collecte, la pré-collecte et la valorisation des déchets de votre quartier.</div>' +
      demoBadge +
    '</div>';
  };

  /* ---------- Routage par ancre ---------- */

  function currentRoute() {
    var name = location.hash.replace(/^#\/?/, '');
    return screens[name] ? name : 'accueil';
  }

  function render() {
    var route = currentRoute();
    app.innerHTML = screens[route]();
    app.scrollTop = 0;
    document.querySelectorAll('.demo-nav a').forEach(function (a) {
      if (a.getAttribute('href') === '#/' + route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  app.addEventListener('click', function (e) {
    var pay = e.target.closest('[data-pay]');
    if (pay) { state.payMethod = pay.getAttribute('data-pay'); render(); return; }
    var cash = e.target.closest('[data-cash]');
    if (cash) { state.cashMode = cash.getAttribute('data-cash'); render(); }
  });

  window.addEventListener('hashchange', render);
  render();
})();
