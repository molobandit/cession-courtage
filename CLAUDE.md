# Reprise — Cession de courtage

Projet **déjà commencé** (étapes 1–10 livrées). Tu ne pars pas de zéro.
Ne mélange **jamais** ce dépôt avec Exxon-bat (BTP). Dépôt autonome.

Interface 100 % français. Code, tables, variables, commits : anglais.
Pas de paiement réel. Pas de PII nominative client final (grain max = code postal).

## Démarrage

```bash
cp .env.example .env   # AUTH_SECRET obligatoire
docker compose up -d   # PostgreSQL
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm test
npm run dev            # http://localhost:3000
```

Mot de passe unique seed : `Demo2026!`

| Rôle | E-mail | À tester |
|---|---|---|
| Admin | `admin@cession-courtage.demo` | `/admin/orias` |
| Cédant Marie | `marie.lefort@parisienne-courtage.demo` | listing **10001** brouillon, `pf_01` |
| Isolation Julien | `julien.bernard@rhone-assurances.demo` | **10002** — invisible pour Marie |
| Scellé Nadia | `nadia.khelifi@mediterranee-courtage.demo` | **10003** fenêtre ouverte → offres vides |
| Visible Claire | `claire.dubois@nord-assur-pro.demo` | **10005** fenêtre close → offres + alias |
| Data room Sofia | `sofia.martinez@occitanie-prevoyance.demo` | **10007** |
| Rétention Hélène | `helene.wagner@est-protection.demo` | **10009** CLOSED, 3 snapshots |
| LOI Yann | `yann.legoff@bretagne-courtage.demo` | **10008** LOI_SIGNED |
| Acquéreur | `acquisition@expansion-idf.demo` | offres 10003/10005/10007/10008 |
| ORIAS pending | `aurore.petit@nouveau-cabinet.demo` | `/en-attente-orias` |

Listings seed : `publicNumber` 10001–10010.

## Stack (ne pas changer)

Next.js 15 App Router, TypeScript strict, PostgreSQL + Prisma, Tailwind,
Auth.js **5.0.0-beta.32**, Zod, Server Actions.
Vitest **uniquement** valorisation / matching / rétention.
Pas de Playwright. Pas de Stripe.

## Différenciateurs

1. Valorisation en cascade (5 étages), `ALGORITHM_VERSION = cascade-1.0` — jamais un prix unique.
2. Anonymat jusqu’à la LOI (alias `Portefeuille #NNNNN`).
3. Offres scellées 21 jours (`windowClosesAt`, pas seulement le statut).
4. Tunnel NDA → LOI → due diligence → protocole → signature → séquestre → ORIAS → rétention.

## Fichiers clés

- `prisma/schema.prisma`, `prisma/seed.ts`
- `lib/authz/` — listings, deals, offers (`listOffersForListing` scellé vs visible)
- `lib/listing/constants.ts` — `ASKING_MIN = 2000` (jamais `export const` dans un `"use server"`)
- `lib/valuation/` cascade + tests
- `lib/matching/score.ts` seuil 40
- `lib/retention/adjust.ts` différé × (taux/0,90) clamp 50–100 %
- `lib/csv/` parse, map, detect-pii, persist
- `app/(dashboard)/annonces/`, `dossiers/`, `admin/orias/`

## Pièges

- `"use server"` : pas d’`export const`.
- Next 15 : `params` est une `Promise` → `await params`.
- Auth.js v5 : `auth()` serveur, pas `getServerSession` v4.
- HHI 50/50 = 0,50 → facteur **0,92** (seul HHI < 0,30 = 1,00).
- Fenêtre 21 j = **temporelle**. Le statut peut rester `OFFERS_OPEN` après la date (voulu pour Claire 10005).
- Messagerie listing un peu trop ouverte (cédant ou tout `canBuy`) — à resserrer.
- Tunnel Deal encore des boutons mock `AdvanceStageButton`.

## Dettes à traiter (priorité)

1. Restreindre la messagerie aux ayants droit (anti-IDOR).
2. Remplacer `AdvanceStageButton` par des actions métier avec garde d’ordre.
3. Passer le listing en `OFFERS_CLOSED` après `windowClosesAt` (GET ou job).
4. Isolation HTML : aucune raison sociale vendeur avant LOI.
5. Clone neuf : `migrate + seed + test + dev` doit marcher. Documenter les cassures.

## Tests à ne pas casser

```bash
npm test
```

`lib/valuation/cascade.test.ts`, `factors.test.ts`, `lib/matching/score.test.ts`, `lib/retention/adjust.test.ts`.

## Authz

- `assertCanViewListing` : publié **ou** owner. Julien 10002 invisible pour Marie.
- `assertCanManageListing` : owner seulement.
- Offres : acheteur = les siennes ; vendeur = sealed/visible selon `windowClosesAt`.
- Data room : `DealParticipant` + `DataRoomAccess`.
- `getListingByPublicNumber` : 404 si pas le droit (pas 403).

## Livrable

Corriger, tester, commits atomiques en anglais.
Rapport final **en français** : clone, fichiers, bugs, reste, commandes.
Ne déploie nulle part. Pas de secrets dans le git.
