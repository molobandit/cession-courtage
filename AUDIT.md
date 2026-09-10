# AUDIT — Cession courtage

Audit de l'existant au 08/09/2026. Aucun fichier du dépôt n'a été modifié.
Vérifications exécutées : `npm install`, `npx prisma generate`, `npx prisma db push`, `npm run db:seed`, `npx vitest run`, `npx tsc --noEmit`.

---

## 0. Résultat des vérifications

| Contrôle | Résultat |
|---|---|
| Installation dépendances | OK, exit 0 |
| `prisma generate` | OK |
| `prisma db push` (clone neuf) | OK, `prisma/dev.db` créé |
| `db:seed` | OK — 22 comptes, 7 663 lignes de contrat, 10 annonces, 15 offres, 4 dossiers |
| `npm test` | **35 tests au vert**, 4 fichiers |
| `tsc --noEmit` | **0 erreur** |

Un clone neuf démarre. La base de code est saine et typée.

---

## 1. Inventaire réel

### 1.1 Arborescence

```
app/
  page.tsx                    accueil publique
  annonces/                   catalogue anonymisé + fiche /annonces/[numero]
  connexion/ inscription/     authentification, magic link
  en-attente-orias/           écran d'attente de validation ORIAS
  boite-demo/ lien-envoye/    boîte de réception simulée (DEMO_INBOX)
  admin/orias/                back-office, file de validation ORIAS
  app/                        ESPACE MEMBRE (préfixe /app)
    page.tsx                    tableau de bord
    portefeuilles/[id]/         détail portefeuille
    import/ import/[id]/        dépôt de fichier + écran de correspondance
    annonces/nouvelle/          création d'annonce
    annonces/[id]/              gestion d'annonce
    annonces/[id]/offres/       offres reçues
    mandats/                    mandat d'achat
    opportunites/               dossiers correspondants
    dossiers/[id]/              tunnel de transaction
    dossiers/[id]/retention/    rapports de rétention
  actions/                    9 actions serveur
  api/auth/[...nextauth]/     Auth.js v5

lib/
  authz/       12 fichiers — couche d'accès (le socle sécurité)
  valuation/   compute, metrics, defaults, parse, run, types
  matching/    score + run
  retention/   adjust
  import/      parse-file, decode, pii, mapping, apply-mapping, hmac, persist, values
  auth/        password (bcrypt), magic-link, alias
  integrations/ mailer + mocks
  format/fr.ts, geo.ts, labels.ts, json-array.ts, listing/constants.ts

prisma/       schema.prisma, seed.ts, seed-helpers.ts
migrations/   0001_init.sql (D1, 17,8 ko)
components/   admin, auth, deal, import, listing, mandate, offer, ui, valuation
```

### 1.2 Schéma effectif

Fournisseur **sqlite** (`prisma/schema.prisma:10`), donc compatible D1. 25 modèles, 20 énumérations.

Modèles : `User`, `Firm`, `Portfolio`, `ContractLine`, `PortfolioImport`, `ValuationMultiple`, `Valuation`, `Listing`, `ListingLine`, `BuyerMandate`, `Match`, `Offer`, `Deal`, `Document`, `RetentionReport`, `Message`, `Subscription`, `Notification`, `AuditLog`, `DataRoomView`, `DataRequest`, `OutboundEmail`, `VerificationToken`.

Points remarquables, tous conformes à la logique métier :

- `User.publicAlias` unique — pseudonyme stable avant LOI.
- `Deal.sellerAlias` / `buyerAlias` — pseudonymes figés par dossier.
- `ContractLine.clientKey` — HMAC opaque, permet la concentration top 10 sans nominatif. `postalCode` + `department` seulement, aucun champ nom/e-mail/adresse.
- `Listing.publicNumber` unique, assigné en code (SQLite ne sait pas auto-incrémenter hors clé primaire).
- `Listing.departments` / `regions` en `Json` — SQLite n'a pas de tableau natif. Idem `BuyerMandate.riskTypes/carriers/zones/clientSegments`. Choix correct.
- `DataRoomView` — journal d'accès dédié, en plus de `AuditLog`.
- `ValuationMultiple` — coefficients en base, éditables, avec `updatedById`.

**Écarts avec `CLAUDE.md` :**

1. **Aucun modèle de facturation dédié.** `Subscription.feeRate` porte le taux, mais il n'existe ni `lib/billing/` ni constante centrale. Voir §3, contradiction C1.
2. `DealStage` = `NDA, DATA_ROOM, LOI, KYC, DEED, SIGNATURE, ESCROW, TRANSFER, RETENTION, CLOSED`. L'ordre est cohérent avec le dévoilement par paliers, mais le NDA est une *étape* et non un état signé/non signé — `Deal.ndaAcceptedAt` compense.
3. Aucun modèle de notification programmée (relances J+3/J+10/J+21, rappels J-3/J-1/H-2). `Notification` est un journal, pas une file d'envoi.

### 1.3 Routes

**Vitrine publique** : `/`, `/annonces`, `/annonces/[numero]`, `/connexion`, `/inscription`, `/en-attente-orias`, `/lien-envoye`, `/boite-demo`.

**Espace membre** (`/app/*`) : tableau de bord, portefeuilles, import, annonces (création/gestion/offres), mandats, opportunités, dossiers, rétention.

**Back-office** : `/admin/orias` uniquement.

**Absentes alors que `CLAUDE.md` les cite dans la vérification de fin de chantier :** `/ceder`, `/acquerir`, `/valoriser`, `/tarifs`, `/journal`. Voir §3, contradiction C2.

### 1.4 Contenu des bibliothèques protégées

**`lib/authz`** — c'est la vraie force du dépôt. Séparation nette :
- `policies.ts` : fonctions **pures**, testables, sans I/O (`isStageAtLeast`, `ownsFirm`, `isDealParticipant`, `identitiesRevealed`, `hasOfferWindowExpired`, `isOfferWindowSealed`, `canViewListing`, `canManageListing`, `offerAccessFor`).
- `actor.ts` : `getActor` / `requireActor` / `requireOriasVerified` / `requireSeller` / `requireBuyer` / `requireAdmin`.
- `listings.ts`, `offers.ts`, `deals.ts`, `messages.ts`, `portfolios.ts`, `imports.ts`, `mandates.ts`, `admin.ts` : requêtes filtrées.

Trois mécanismes corrects et rares :
- `getListingByPublicNumber` renvoie **`null` (404)** et jamais 403 — l'existence d'une annonce non publiée ne fuit pas (`lib/authz/listings.ts:96`).
- Les offres scellées sont filtrées **au niveau de la requête** : `access === "sealed"` retourne `offers: []` sans jamais interroger la table (`lib/authz/offers.ts:44`). Le cédant n'obtient ni montant, ni compteur.
- La fenêtre est **temporelle** : `isOfferWindowSealed` teste `offerWindowClosesAt`, pas seulement le statut. `closeExpiredOfferWindows()` bascule en `OFFERS_CLOSED` paresseusement à chaque lecture.

**`lib/valuation/compute.ts`** — cascade pure, sans I/O. Valeur brute = Σ(commission annuelle × multiple du risque), avec `ADVANCED_COMMISSION_FACTOR = 0,5` sur les commissions précomptées. Puis sept facteurs séquentiels, chacun journalisant son `impactEur` :

| Étape | Facteurs |
|---|---|
| Concentration compagnies (HHI) | >0,60 → 0,80 · 0,30–0,60 → **0,92** · <0,30 → 1,00 |
| Concentration clients (top 10) | >40 % → 0,85 · >25 % → 0,93 · ≤25 % → 1,00 |
| Ancienneté | >72 mois → 1,15 · >36 → 1,05 · <12 → 0,88 |
| Résiliation 12 mois | >15 % → 0,70 · >10 % → 0,85 · <5 % → 1,10 |
| Mode de distribution | à distance 0,85 · agence 1,05 · bureau/mixte 1,00 |
| Accompagnement cédant | ≥6 mois 1,20 · 3 mois 1,10 · aucun 0,90 |
| Score de conformité | <50 → 0,75 · <80 → 0,90 · ≥80 → 1,00 |

Fourchette : `RANGE_LOW_FACTOR = 0,85`, `RANGE_HIGH_FACTOR = 1,15`. `ALGORITHM_VERSION = "cascade-1.0"`.

**Conforme aux chiffres intouchables** : HHI 50/50 → 0,50 → facteur **0,92** ✓. Le repère 72 675 / 85 500 / 98 325 est arithmétiquement cohérent avec ces bornes (85 500 × 0,85 = 72 675 ; × 1,15 = 98 325) ✓.

`compute.ts` produit aussi des `actions` — recommandations chiffrées en euros (diversifier les compagnies, réduire la concentration client, maîtriser la résiliation, proposer un accompagnement). C'est exactement la cascade « impact en euros de chaque correctif » du chantier C : **déjà présente côté calcul**, il ne manque que l'écran.

**`lib/matching`** — 5 critères pondérés, seuil `score < 40 → continue` (`run.ts:77` et `run.ts:147`) ✓. Zones `NATIONAL` / région / département.

**`lib/retention/adjust.ts`** — `Math.min(1, Math.max(0.5, ratio))` avec cible 0,90 ✓, arrondi au centime.

**`lib/billing`** — **n'existe pas**.

### 1.5 Couverture des 35 tests

| Fichier | Tests | Ce qu'il couvre |
|---|---|---|
| `lib/valuation/compute.test.ts` | 15 | Cascade, multiples, HHI, concentration client, ancienneté, churn, bornes |
| `lib/authz/policies.test.ts` | 9 | Fenêtre scellée (dont statut `OFFERS_OPEN` périmé), `offerAccessFor`, isolation Marie/Julien, parties messagerie |
| `lib/matching/score.test.ts` | 8 | Score plein, budget >110 %, zones, risques disjoints, commissions hors fourchette |
| `lib/retention/adjust.test.ts` | 3 | Cible 90 %, plancher 50 %, plafond 100 % |

**Ce que les tests ne couvrent pas — c'est le point important :**

- **Aucun test ne touche la base.** Les 35 tests portent sur des fonctions pures. Les fonctions de `lib/authz` qui font les requêtes (`getListingByPublicNumber`, `listOffersForListing`, `listMyDeals`, `listListingMessages`…) ne sont **jamais exercées**. Un IDOR par identifiant deviné n'est donc testé nulle part.
- Aucun test ne vérifie l'absence de `legalName` cédant dans le HTML rendu ni dans une réponse d'action serveur.
- Aucun test sur la détection PII à l'import.
- Aucun test sur les actions serveur (dépôt d'offre, acceptation, avancement d'étape).
- Aucun test sur les cas limites de la fenêtre : dépôts simultanés, dépôt à la seconde de clôture, retrait.

Autrement dit : **la logique pure est bien testée, la surface d'attaque ne l'est pas du tout.**

---

## 2. État fonctionnalité par fonctionnalité

| Fonctionnalité | État | Détail |
|---|---|---|
| Inscription, connexion, session | **Fonctionnelle** | Auth.js v5, JWT, credentials + magic link. `DEMO_INBOX` → `/boite-demo`. |
| Vérification ORIAS | **Fonctionnelle** | `/admin/orias`, `verifyOrias` / `rejectOrias`, `middleware.ts` redirige les non validés vers `/en-attente-orias`. |
| Import de portefeuille | **Fonctionnelle (hors limites Workers)** | CSV + XLSX, `decode.ts` gère Windows-1252, `pii.ts` rejette en-têtes ET contenu, écran de correspondance, `hmac.ts` pour `clientKey`. **Non conçue pour Workers** : voir §3 G2. |
| Valorisation | **Fonctionnelle** | Cascade complète, coefficients en base, snapshots `Valuation`, recalcul manuel. |
| Création et publication d'annonce | **Fonctionnelle** | `/app/annonces/nouvelle`, `publicNumber` séquentiel, `ASKING_MIN` appliqué. |
| Cession partielle | **Coquille** | Modèle prêt (`ListingLine`, `isPartial`, `Valuation.listingId`) mais **aucun écran de sélection de lignes** ni recalcul sur sous-ensemble. |
| Mandat d'achat | **Fonctionnelle** | `/app/mandats`, dépôt et modification. |
| Mise en relation | **Fonctionnelle** | `lib/matching/run.ts`, seuil 40, `Match` avec `criteriaBreakdown`. |
| Alertes | **Coquille** | `Notification` est écrit en base, mais **aucun envoi, aucune cadence, aucune préférence de canal, aucun plafond d'un par jour**. |
| Dépôt d'offre | **Fonctionnelle, mode unique** | Un seul mode (scellé sur la fenêtre). Les **trois modes** du chantier E n'existent pas. Pas de prix de réserve, pas de tour final 72 h. |
| Messagerie | **Fonctionnelle avec une faille** | Voir §3 G1-2. |
| Data room | **Coquille** | `Document`, `DataRoomView` et le journal existent ; **aucune page data room**, aucun dépôt de pièce, aucun bordereau. |
| NDA | **Fonctionnelle** | `Deal.ndaAcceptedAt`, garde `isStageAtLeast(DATA_ROOM)`. |
| Suivi de dossier | **Fonctionnelle** | `/app/dossiers/[id]`, étapes ordonnées, dévoilement à LOI. |
| Rétention post-cession | **Fonctionnelle** | `RetentionReport`, `adjustedDeferredAmount`, écran dédié. Rappels M+3/6/12 absents. |
| Facturation | **Absente** | Ni `lib/billing/`, ni écran, ni tarifs conformes au brief. Voir C1. |
| Back-office | **Coquille** | Seule la file ORIAS existe. Pas de vue des dossiers, pas d'édition des coefficients, pas de journal d'audit filtrable, pas d'indicateur d'écart fourchette/prix obtenu. |

---

## 3. Problèmes, par gravité décroissante

### Gravité 1 — failles d'accès

**G1-1. Aucune validation Zod sur 6 des 9 actions serveur.**
`app/actions/auth.ts`, `deals.ts`, `listings.ts`, `mandates.ts`, `offers.ts`, `retention.ts` lisent le `FormData` brut avec `String(formData.get(...))` et des conversions maison. Seuls `admin-orias.ts` et `import-portfolio.ts` utilisent Zod.
Conséquence : les contrôles de bornes existent (par exemple `ASKING_MIN`/`ASKING_MAX` dans `offers.ts:45`) mais sont dispersés, non systématiques et non testés. Toute entrée non bornée finit en base via Prisma.

**G1-2. Fuite entre acquéreurs dans la messagerie d'annonce.**
`lib/authz/messages.ts:70-76` — pour un non-cédant, la clause est :
```ts
OR: [
  { senderId: actor.id },
  { recipientId: actor.id },
  { recipientId: null, senderId: { not: actor.id } },   // ← ici
]
```
La troisième branche donne à un acquéreur **tout message sans destinataire émis par quelqu'un d'autre**. L'intention est de diffuser les annonces du cédant à tous. Mais rien n'impose que l'émetteur d'un message `recipientId: null` soit le cédant : un acquéreur A qui poste sans destinataire est lu par l'acquéreur B. Deux candidats concurrents peuvent se découvrir.
Correctif : restreindre à `{ recipientId: null, senderId: <userId du cédant> }`.

**G1-3. Les fonctions d'accès à la base ne sont couvertes par aucun test.**
Ce n'est pas une faille en soi, mais c'est ce qui empêche d'affirmer qu'il n'y en a pas. Aucun test ne tente d'atteindre une ressource d'autrui par identifiant.

### Gravité 2 — isolation et environnement

**G2-1. `getActor()` requête la base à chaque appel, sans mémoïsation inter-actions.**
`lib/authz/actor.ts:24`. Plusieurs actions appellent `getActor()` puis re-requêtent l'utilisateur (`app/actions/offers.ts:139`). Sur Workers, chaque requête D1 compte. Impact performance, pas sécurité.

**G2-2. `bcryptjs` au moment de la connexion — risque réel sur Workers.**
`lib/auth/password.ts` utilise `bcrypt.hash(plain, 10)` et `bcrypt.compare`. `bcryptjs` est du JavaScript pur : 10 tours coûtent de l'ordre de 100 ms de CPU. C'est au-delà du budget CPU d'un Worker sur l'offre gratuite (10 ms) et cela consomme une part notable du budget sur l'offre payante.
`CLAUDE.md` demande explicitement de signaler ce qui est incompatible avec Workers : **c'est le cas ici**. Le remplacement naturel est PBKDF2 via Web Crypto (`crypto.subtle`), disponible nativement sur Workers. Cela impose de re-hacher les mots de passe du seed — donc de toucher `prisma/seed.ts`, zone protégée.

**G2-3. Import de fichier incompatible avec les limites de Workers.**
`lib/import/parse-file.ts` charge le fichier entier en mémoire et `xlsx` décompresse tout le classeur. Le seed produit jusqu'à 1 400 lignes par portefeuille. Sur Worker : requête plafonnée à 100 Mo mais surtout **pas de système de fichiers** (`FILE_STORAGE_DIR="./uploads"` dans `.env.example` n'a aucun sens sur Worker) et budget CPU contraint.
`Portfolio.sourceStorageKey` et `PortfolioImport.storageKey` supposent un stockage objet qui n'est **pas configuré** : `wrangler.jsonc` ne déclare aucun binding R2.

**G2-4. Aucune fuite d'identité cédant détectée dans la vitrine.**
Contrôle effectué : `legalName` / `firmName` n'apparaissent dans aucune page publique ni composant hors `/admin`. Les seules occurrences de `fullName` concernent l'utilisateur connecté lui-même (`app/app/page.tsx:46`, `components/site-header.tsx:31`). `presentParty` (`lib/authz/deals.ts:88`) ne révèle l'identité que si `self || identitiesRevealed(stage)`. **Point conforme**, mais non verrouillé par un test.

### Gravité 3 — dette structurante

- `.env.example` mentionne `DATABASE_URL` et `FILE_STORAGE_DIR` qui ne s'appliquent pas au Worker — source de confusion.
- `docker-compose.yml` est un reliquat de la période Postgres, désormais sans objet.
- **La base locale se crée au mauvais endroit, et elle n'est pas ignorée par git.** `prisma/schema.prisma:10` code en dur `url = "file:./prisma/dev.db"`. Prisma résout ce chemin **relativement au dossier du schéma**, donc la base atterrit dans `prisma/prisma/dev.db` et non `prisma/dev.db`. Or `.gitignore:40-43` ne couvre que `prisma/dev.db` et `prisma/*.db` — le motif ne descend pas d'un niveau. Vérifié : après le `prisma db push` documenté dans le README, `git status` fait apparaître `?? prisma/prisma/` comme fichier à suivre. **Tout clone neuf qui suit le README risque de committer sa base SQLite.** Le README annonce par ailleurs `prisma/dev.db`, ce qui est faux.
  Correctif : `url = "file:./dev.db"` (résolu depuis `prisma/`, donc `prisma/dev.db`), ou lecture depuis l'environnement. Touche une zone protégée.
- Deux chemins de migration coexistent : `prisma db push` en local, `migrations/0001_init.sql` pour D1. Rien ne garantit qu'ils restent synchronisés.
- `lib/authz/index.ts` réexporte tout, mais plusieurs modules importent directement `@/lib/authz/policies` — la couche unique demandée au chantier A n'est pas encore imposée.

---

## 4. Contradictions entre `CLAUDE.md` et le code — arbitrage requis

Conformément à la règle « si une consigne contredit le code existant, me le signaler au lieu de trancher », je n'ai rien modifié.

**C1 — Tarifs.** `CLAUDE.md` fixe comme intouchables : **honoraires 8 % HT**, **Croissance 190 € HT/an**.
Le code applique : `feeRate: "0.1500"` et `"0.1350"` (`prisma/seed.ts:866` et `:898`), soit **15 % et 13,5 %** — ce sont exactement les taux d'Assurdeal. Aucun montant d'abonnement n'est stocké.
`lib/billing/rates.ts`, cité comme zone protégée, **n'existe pas**.
→ Faut-il aligner le seed sur 8 % / 190 €, et créer `lib/billing/rates.ts` comme source unique ? Cela touche une zone protégée (le seed).

**C2 — Vitrine.** `CLAUDE.md` indique que « la vitrine marketing et le copy français ont été traités » et fait de `/`, `/ceder`, `/acquerir`, `/valoriser`, `/annonces?partiel=1`, `/tarifs`, `/journal`, `/connexion` le parcours de vérification de fin de chantier.
Seules `/`, `/annonces` et `/connexion` existent. **`/ceder`, `/acquerir`, `/valoriser`, `/tarifs` et `/journal` sont absentes.**
Conséquence directe : le repère de non-régression « widget à 45 000 en particuliers → 72 675 / 85 500 / 98 325 € » **ne peut pas être vérifié**, faute de widget. J'ai pu confirmer que les bornes ±15 % du moteur sont cohérentes avec ces trois nombres, mais pas la valeur médiane de 85 500 €.
→ Cette vitrine a-t-elle été faite ailleurs (autre branche, autre dépôt) ? Ou faut-il la construire ?

**C3 — Mode d'offre.** Le chantier E décrit trois modes. Le code n'en implémente qu'un. Rien à corriger aujourd'hui, mais la machine à états devra être soumise avant écriture, comme demandé.

**C4 — Vocabulaire.** `CLAUDE.md` interdit « scellé » hors de l'expression « offres scellées ». Les commentaires de code emploient `sealed` — en anglais, dans le code, donc conforme à la règle « code en anglais ». Aucun texte d'interface fautif détecté.

---

## 5. Écart jusqu'à la démonstration

Parcours visé : création de compte → import → valorisation → publication → réception d'une offre → dossier jusqu'à la LOI.

**Ce parcours est déjà déroulable aujourd'hui en local**, avec les comptes du seed (*communique hors depot, demandez-le au proprietaire*). Les six étapes existent et fonctionnent.

Travaux minimaux pour le tenir devant un courtier :

1. **Corriger G1-2** (fuite messagerie) — sinon deux acquéreurs peuvent se voir.
2. **Zod sur les six actions** — une saisie aberrante en démonstration produit aujourd'hui une erreur brute.
3. **Un test d'IDOR et un test d'absence de `legalName`** — pour pouvoir l'affirmer, pas seulement l'espérer.
4. **Trancher C2** — sans `/valoriser`, il n'y a pas de démonstration publique de la cascade, qui est pourtant l'argument différenciant le plus fort.
5. **Trancher C1** — annoncer 8 % à l'écran alors que la base calcule 15 % est intenable en démonstration.

Non bloquant pour la démonstration : data room, alertes, trois modes d'offre, back-office étendu, facturation.

---

## 6. Plan de reprise ordonné

| # | Chantier | Effort | Zones protégées touchées |
|---|---|---|---|
| 0 | **Arbitrages C1 et C2** — décision tarifs et vitrine | discussion | — |
| A | **Verrouillage des accès** — correction G1-2 ; Zod sur les 6 actions ; couche d'accès unique imposée ; test IDOR ; test anti-fuite `legalName` | 1 à 1,5 j | `lib/authz` (ajout), tests existants (ajout seulement) |
| A′ | **Compatibilité Workers** — bcrypt → PBKDF2 Web Crypto ; décision sur le stockage des fichiers (R2 ou renoncement) | 0,5 à 1 j | `prisma/seed.ts` (re-hachage), `wrangler.jsonc` |
| B | **Import** — approche à valider avant écriture : découpage client, traitement par lots, reprise sur erreur | 2 à 3 j | `wrangler.jsonc` si R2 |
| C | **Espace cédant** — répartitions, cascade à l'écran (le calcul existe déjà), cession partielle + recalcul sur sous-ensemble, suivi d'annonce | 3 à 4 j | `lib/valuation/compute.ts` si le recalcul partiel exige une signature différente |
| D | **Espace acquéreur** — mandat, tri par score avec détail des critères, comparateur | 2 j | `lib/matching` (lecture seule a priori) |
| E | **Offres et fenêtre** — machine à états à soumettre d'abord, `lib/offers/`, cas limites | 3 à 4 j | `lib/authz/policies.ts`, `prisma/` (prix de réserve, tour final) |
| F | **Dévoilement par paliers** — data room, bordereau, journalisation par palier | 2 à 3 j | `prisma/` (bordereau) |
| G | **Notifications** — `lib/notifications/`, trois implémentations simulées, cadences, préférences | 2 à 3 j | `prisma/` (file d'envoi, préférences) |
| H | **Back-office** — dossiers, coefficients avec historique et rejeu, journal filtrable, écart fourchette/prix | 2 à 3 j | `prisma/` (versions de coefficients) |

**Recommandation d'ordre :** A′ avant B. Concevoir l'import sans avoir tranché le stockage de fichiers sur Workers ferait retravailler le chantier B deux fois.

---

## 7. Ce que j'attends de votre part

1. **C1** — tarifs : aligner sur 8 % HT et 190 € HT/an ? (touche le seed)
2. **C2** — vitrine : existe-t-elle ailleurs, ou faut-il la construire ?
3. **A′** — remplacement de bcrypt par PBKDF2 : je le fais dans le chantier A, ou à part ?
4. **Stockage des fichiers** — ajouter un binding R2, ou rester sans dépôt binaire (hash et libellé seulement) ?

Aucun code ne sera écrit avant votre validation.
