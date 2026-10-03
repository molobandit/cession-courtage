# La bourse du portefeuille

Place de marché pour céder, acquérir ou financer un portefeuille de courtage d'assurance,
en France et en Suisse, pour tous les portefeuilles, petits, moyens et gros.

**Référence fonctionnelle** : les deux dossiers de `docs/reference/` font foi sur tout le site
(`Dossier_presentation_10412.pdf` pour l'achat et la vente, `Dossier_investisseurs.pdf`
pour l'investissement). Le site reprend ce qu'ils disent, et rien d'autre.

## Prérequis

- Node.js 20+
- `AUTH_SECRET` (32 octets)

**La base est Cloudflare D1, en local comme en production.** Il n'y a pas de fichier SQLite de
développement ni de `DATABASE_URL` : `next dev` reçoit le binding `DB` via
`initOpenNextCloudflareForDev()` (`next.config.ts`), et les données locales vivent dans
`.wrangler/state/v3/d1`. Le schéma est appliqué par les migrations de `migrations/`.

## Démarrage (clone neuf)

```bash
cp .env.example .env          # renseigner AUTH_SECRET (et NEXTAUTH_SECRET identique)
npm install
npm run setup                 # prisma generate + migrations D1 locales + seed
npm test
npm run dev                   # http://localhost:3000
```

`npm run db:reset` repart d'une base D1 locale vide.

Mot de passe unique du seed : *communique hors depot, demandez-le au proprietaire*

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

## Le modèle

1. **L'étude** : l'équipe étudie le portefeuille (plus de 50 points de contrôle) et fixe le montant de l'annonce.
2. **La mise en ligne** : annonce publiée avec son montant, sous un numéro de dossier, cédant anonyme, dossier de présentation PDF.
3. **Le positionnement** : dépôt de 2,5 % dans un trust, qui lance la procédure et révèle l'identité du cédant.
4. **La signature** : contrats contrôlés par les avocats, signature en ligne, fonds libérés par le trust, transfert des contrats.

Séquestre de conservation : 20 % du montant, rendu à l'acquéreur au prorata si la déperdition dépasse 10 %.
Honoraires : portefeuille certifié, 12,5 à 15 % HT, minimum 900 € HT, dus uniquement si la vente aboutit.

## Tests

```bash
npm test
npx tsx scripts/verify-import.ts
```

Vitest : `lib/valuation/compute.test.ts` (cascade + facteurs), `lib/matching/score.test.ts`, `lib/retention/adjust.test.ts`, `lib/authz/policies.test.ts`.

## En ligne

- **GitHub** : https://github.com/molobandit/cession-courtage
- **Cloudflare Workers** : https://site.labourseduportefeuille.workers.dev

Déploiement : `npm run deploy` (OpenNext + Wrangler). Secrets Cloudflare : `AUTH_SECRET`, `AUTH_URL` / `NEXTAUTH_URL`. La base est le binding D1 `DB` (pas de `DATABASE_URL` sur le Worker).

Schéma D1 distant : `npm run db:migrate:remote`.

## Stockage des fichiers déposés (R2)

Workers n'a pas de système de fichiers. Les bordereaux d'import et les pièces de
salle de données passent par un bucket **Cloudflare R2**, exposé par le binding
`UPLOADS`.

Bucket : `cession-courtage-uploads`, déclaré dans `wrangler.jsonc`. Code : `lib/storage/objects.ts`.

## Hors périmètre

Pas de Playwright. Pas d'e-mail SMTP.
