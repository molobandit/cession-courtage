# Cession de portefeuilles de courtage

Place de marché B2B (France) pour céder ou acquérir un portefeuille de courtage d'assurance, réservée aux intermédiaires immatriculés à l'ORIAS. Tickets 2 000–200 000 €. Concurrent d'Assurdeal, sans paiement réel et sans PII nominative de client final (grain max = code postal).

## Prérequis

- Node.js 20+
- Docker (PostgreSQL 16) **ou** une URL `DATABASE_URL` PostgreSQL
- `AUTH_SECRET` (32 octets)

## Démarrage (clone neuf)

```bash
cp .env.example .env          # renseigner AUTH_SECRET (et NEXTAUTH_SECRET identique)
docker compose up -d          # PostgreSQL local : cession / cession / cession_courtage
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm test
npm run dev                   # http://localhost:3000
```

Mot de passe unique du seed : `Demo2026!`

| Rôle | E-mail | Parcours |
|---|---|---|
| Admin | `admin@cession-courtage.demo` | `/admin/orias` |
| Cédant Marie | `marie.lefort@parisienne-courtage.demo` | listing **10001** brouillon |
| Isolation Julien | `julien.bernard@rhone-assurances.demo` | **10002** — pas dans les annonces de Marie |
| Scellé Nadia | `nadia.khelifi@mediterranee-courtage.demo` | **10003** fenêtre ouverte |
| Visible Claire | `claire.dubois@nord-assur-pro.demo` | **10005** fenêtre close |
| Data room Sofia | `sofia.martinez@occitanie-prevoyance.demo` | **10007** |
| LOI Yann | `yann.legoff@bretagne-courtage.demo` | **10008** |
| Rétention Hélène | `helene.wagner@est-protection.demo` | **10009** CLOSED |
| Acquéreur | `acquisition@expansion-idf.demo` | offres 10003 / 10005 / 10007 / 10008 |
| ORIAS pending | `aurore.petit@nouveau-cabinet.demo` | `/en-attente-orias` |

Annonces seed : `publicNumber` 10001–10010.

## Routes (réelles)

Le code n'utilise pas le préfixe `(dashboard)` du brief : l'espace membre est sous `/app`.

| Brief | Ici |
|---|---|
| `/boite-demo` | `/boite-demo` (et `/lien-envoye?email=`) |
| `/magic-link` | `/connexion/lien-magique` |
| catalogue | `/annonces`, fiche `/annonces/[numero]` |
| dashboard | `/app` |
| tunnel deal | `/app/dossiers/[id]` |
| import CSV | `/app/import` |
| admin ORIAS | `/admin/orias` |

## Différenciateurs

1. Valorisation en cascade (`ALGORITHM_VERSION = cascade-1.0`) — fourchette, jamais un prix unique.
2. Anonymat jusqu'à la LOI (alias `Portefeuille #NNNNN` / `Cédant #…`).
3. Offres scellées 21 jours : le code teste `offerWindowClosesAt`, pas seulement le statut. Un GET clôture en `OFFERS_CLOSED` si la date est passée (Claire 10005 reste `OFFERS_OPEN` en seed pour tester la règle temporelle).
4. Tunnel NDA → salle de données → LOI → KYC → acte → signature → séquestre → transfert → rétention.

## Tests

```bash
npm test
npx tsx scripts/verify-import.ts
```

Vitest : `lib/valuation/compute.test.ts` (cascade + facteurs), `lib/matching/score.test.ts`, `lib/retention/adjust.test.ts`, `lib/authz/policies.test.ts`.

## Hors périmètre

Pas de Stripe, pas de Playwright, pas d'e-mail SMTP, pas de déploiement (ni GitHub Pages, ni Cloudflare) dans ce dépôt tant que ce n'est pas demandé explicitement hors brief.
