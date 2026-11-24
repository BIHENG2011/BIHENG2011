# BluePay · démonstrateur

Application mobile cliquable et API simulée, pour les présentations aux financeurs et aux partenaires.
**Toutes les données sont fictives et aucun argent réel ne circule.**

## Lancer la démo

Il faut Node.js 22.5 ou plus récent.

```bash
cd bluepay
npm install
npm start
```

Ouvrir ensuite http://localhost:3000.

Pour montrer la démo sur un téléphone connecté au même Wi-Fi :

```bash
HOST=0.0.0.0 npm start
```

puis ouvrir `http://<adresse-IP-de-l-ordinateur>:3000` sur le téléphone.

Le bouton **Réinitialiser la démo** (en haut) remet toutes les données à zéro avant une présentation.

## Scénario de présentation (3 minutes)

1. **Accueil d'Aïcha** : solde de 4 750 FCFA et derniers mouvements.
2. **Trajets**, puis **Acheter le billet** : choisir un moyen de paiement (Orange Money, MoMo, solde BluePay…) et confirmer.
3. **Billet** : un vrai code QR signé est émis. Avec le solde BluePay, le solde baisse de 650 FCFA.
4. **Moto-taxi › Encaisser › Scanner** : le bouton de démonstration valide le billet d'Aïcha. Les 200 FCFA de la part moto sont crédités à Paul.
   Un second scan du même billet est refusé.
5. **Moto-taxi** : la recette du jour et la répartition (propriétaire, épargne, conducteur) se mettent à jour.
6. **Taximan** et **Ménage** : obligations épargnées au jour le jour, signalements des ménages.

## Ce qui est réel et ce qui est simulé

| Brique | Dans la démo |
|---|---|
| Registre comptable en partie double (chaque opération s'équilibre) | Réel |
| Billets signés (Ed25519), vérifiables sans connexion avec la clé publique | Réel |
| Validation unique de chaque segment, partage des recettes moto / BRT | Réel |
| Paiement Orange Money, MoMo, Visa, USSD | **Simulé** : accepté immédiatement (`server/payments.js`) |
| Caméra du conducteur | **Simulée** : un bouton remplace le scan |
| Comptes et connexion | **Absents** : trois personnes fixes (Aïcha, Paul, Jean-Paul) |
| Versements aux organismes (CNPS, assureur, Trésor) | **Absents** : pourcentages affichés |

## Organisation du code

- `public/` : l'application (HTML, CSS, JavaScript sans framework).
- `server/server.js` : serveur HTTP et liste des routes de l'API.
- `server/service.js` : règles métier et données de départ.
- `server/ledger.js` : registre comptable.
- `server/tickets.js` : signature et vérification des billets.
- `server/payments.js` : moyens de paiement et adaptateur de prestataire (simulé).
- `test/` : tests automatiques (`npm test`).

La base SQLite est créée dans `data/` (ignoré par git).

## API

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/api/users/:id/home` | Solde et derniers mouvements |
| GET | `/api/routes` | Trajets proposés |
| GET | `/api/users/:id/payment-methods` | Moyens de paiement |
| POST | `/api/users/:id/tickets` | Acheter un billet `{ routeId, method }` |
| GET | `/api/users/:id/tickets/latest` | Dernier billet, avec son QR en SVG |
| GET | `/api/tickets/:id` | Un billet |
| POST | `/api/drivers/:id/scan` | Validation par le conducteur `{ token }` |
| POST | `/api/validators/brt/scan` | Validation au portique BRT `{ token }` |
| GET | `/api/keys/tickets` | Clé publique pour vérifier les billets hors ligne |
| POST | `/api/drivers/:id/rides/cash` | Course payée en espèces `{ amount }` |
| GET | `/api/drivers/:id/day` | Recette du jour et répartition |
| GET | `/api/drivers/:id/obligations` | Obligations d'un conducteur |
| GET | `/api/households/:id` | Abonnement d'un ménage |
| POST | `/api/households/:id/reports` | Signalement `{ kind: "passage_manque" \| "depot_sauvage" }` |
| POST | `/api/demo/reset` | Remise à zéro (démo uniquement) |

## Avant de passer à l'argent réel

Ce démonstrateur n'est **pas** prêt pour la production. Il manque au minimum :

- un cadre légal : agrément d'émetteur de monnaie électronique (COBAC) ou partenariat avec un établissement agréé ;
- un vrai prestataire de paiement : paiement asynchrone, confirmation par webhook signé, gestion des échecs et des doublons ;
- des comptes et une authentification (code, OTP par SMS), et une vérification d'identité adaptée aux montants ;
- un stockage protégé de la clé de signature des billets (module matériel ou service de gestion de clés) ;
- une base de données serveur (PostgreSQL), des sauvegardes, des journaux d'audit, un outil de rapprochement comptable ;
- la conformité à la loi camerounaise sur les données personnelles.
