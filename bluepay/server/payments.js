'use strict';
// Moyens de paiement et « adaptateur » de prestataire.
// Démo : SimulatedProvider accepte tout instantanément, sans argent réel.
// Production (option 2) : remplacer par un adaptateur vers un agrégateur agréé
// (paiement asynchrone, confirmation par webhook signé, idempotence par référence).

const METHODS = [
  { id: 'om', name: 'Orange Money', sub: '6•• •• •• 41 · code de confirmation', short: 'OM', bg: '#FF7900', fg: '#1A0E00', external: true },
  { id: 'momo', name: 'MTN MoMo', sub: '6•• •• •• 18', short: 'MoMo', bg: '#FFCC00', fg: '#1B1300', external: true },
  { id: 'bp', name: 'Solde BluePay', sub: null, short: 'BP', bg: '#1A6FD8', fg: '#FFFFFF', external: false },
  { id: 'visa', name: 'Carte Visa', sub: '•••• 5521 · sans contact', short: 'VISA', bg: '#1A1F71', fg: '#FFFFFF', external: true },
  { id: 'vv', name: 'Visa virtuelle', sub: 'émise dans l’application', short: 'VV', bg: '#2D3A8C', fg: '#FFFFFF', external: true },
  { id: 'ussd', name: 'USSD, sans internet', sub: 'composez le code depuis tout téléphone', short: '*#', bg: '#0B1B33', fg: '#FFFFFF', external: true }
];

function getMethod(id) {
  return METHODS.find((m) => m.id === id) || null;
}

const SimulatedProvider = {
  name: 'simulation',
  /** @returns {{status: 'succeeded'|'pending'|'failed', providerRef: string}} */
  charge({ method, amount, reference }) {
    if (!Number.isInteger(amount) || amount <= 0) return { status: 'failed', providerRef: null };
    return { status: 'succeeded', providerRef: 'SIM-' + method + '-' + reference };
  }
};

module.exports = { METHODS, getMethod, provider: SimulatedProvider };
