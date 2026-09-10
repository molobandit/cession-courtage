# Passation

Document de reprise pour toute personne ou tout outil qui prend la main sur ce
dépôt. Lire en entier avant la première modification.

---

## 1. Accès

### Dépôt

```
https://github.com/molobandit/cession-courtage.git
```

Branche de travail : **`chantier-vitrine`**. `main` est en retard, tout le travail
récent est sur cette branche.

```bash
git clone https://github.com/molobandit/cession-courtage.git
cd cession-courtage
git checkout chantier-vitrine
```

### Cloudflare

Le compte est **`molobandit@hotmail.fr`**. L'authentification se fait de façon
interactive, il n'y a **aucun jeton à copier** et il ne faut surtout pas en
committer :

```bash
npx wrangler login
npx wrangler whoami          # doit afficher molobandit@hotmail.fr
```

Ressources déjà créées, déclarées dans `wrangler.jsonc` :

| Ressource | Nom | Identifiant |
|---|---|---|
| Worker | `cession-courtage` | — |
| Base D1 | `cession-courtage` | `98d5a611-8101-42ef-9cf5-033fff64ca65` |
| Bucket R2 | `cession-courtage-uploads` | binding `UPLOADS` |

Site en ligne : **https://cession-courtage.molobandit.workers.dev**

### Variables d'environnement

`cp .env.example .env`, puis générer le secret :

```bash
openssl rand -base64 32
```

La même valeur va dans `AUTH_SECRET` **et** `NEXTAUTH_SECRET`. Les autres clés
sont déjà bonnes dans l'exemple. Le fichier `.env` n'est pas versionné, et il ne
doit jamais l'être.

---

## 2. Démarrage

```bash
npm install
npm run setup     # prisma generate + migrations D1 locales + seed
npm test          # 152 tests, doivent tous passer
npm run dev       # http://localhost:3000
```

Mot de passe unique de tous les comptes de démonstration : *communique hors depot, demandez-le au proprietaire*
Comptes utiles : `marie.lefort@parisienne-courtage.demo` (cédante),
`acquisition@expansion-idf.demo` (acquéreur), `admin@cession-courtage.demo`.

---

## 3. Les sept pièges déjà rencontrés

Ils ont tous coûté du temps. Les lire évite de les repayer.

**1. La base est D1, en local comme en production.** Il n'existe **aucun** fichier
SQLite de développement et aucune `DATABASE_URL`. `next dev` reçoit le binding
`DB` via `initOpenNextCloudflareForDev()` dans `next.config.ts`, et les données
locales vivent dans `.wrangler/state/v3/d1`.

**2. Appliquer les migrations à distance, pas seulement en local.** Une migration
appliquée uniquement en local casse la production sans prévenir. Après chaque
migration :

```bash
npm run db:migrate           # local
npm run db:migrate:remote    # PRODUCTION, à ne jamais oublier
```

**3. `npm run db:reset` casse le serveur de développement s'il tourne.** Il
supprime le fichier de base que le serveur tient ouvert. Arrêter `npm run dev`
d'abord, puis relancer.

**4. D1 n'a pas de transactions.** `prisma.$transaction` est ignoré et exécuté en
requêtes séparées. Le code n'en utilise plus aucune. Pour toute séquence
d'écritures, suivre le modèle déjà en place : un point d'engagement, puis des
conséquences rejouables, appuyés sur une contrainte d'unicité. Voir
`app/actions/offers.ts` (`acceptOfferAction`) et `lib/import/apply-mapping.ts`
(`contractLineId`).

**5. Workers n'a pas de système de fichiers.** Aucun `fs`, aucun `writeFile`. Tout
fichier déposé passe par R2, via `lib/storage/objects.ts`.

**6. Les en-têtes de sécurité ne survivent ni au `headers()` de `next.config`, ni
au middleware.** OpenNext reconstruit la réponse et les perd. Ils sont posés dans
`worker/index.ts`, qui enveloppe le worker généré. **Cette enveloppe doit
réexporter les objets durables d'OpenNext**, sinon `wrangler` refuse le
déploiement.

**7. Un import de 50 000 lignes dure environ deux minutes.** Mesuré : 2 ms par
ligne, l'analyse du fichier ne coûte que 94 ms. Le coût est dans le nombre
d'allers-retours vers D1, pas dans leur taille. D'où le découpage en lots de 500
lignes piloté par le navigateur, dans `components/import/import-progress.tsx`.

---

## 4. Règles à ne pas casser

**Isolation.** Aucune raison sociale de cédant ne doit apparaître dans une page
publique avant la lettre d'intention. Contrôle rapide :

```bash
curl -s https://cession-courtage.molobandit.workers.dev/annonces \
  | grep -E "Parisienne de Courtage|Nord Assur Pro" && echo FUITE || echo OK
```

**Droits d'accès au niveau des requêtes**, jamais de l'affichage. Un identifiant
deviné ne doit rien rendre. Toute lecture passe par `lib/authz/`. Les tests
`tests/authz-access.test.ts` le vérifient sur la vraie base.

**Offres scellées.** Pendant la fenêtre, le cédant ne reçoit **aucune ligne**, pas
même un compteur. Le filtrage est fait dans la requête, dans
`lib/authz/offers.ts`.

**Aucune donnée nominative de client final.** Grain maximal : le code postal.
L'import refuse les colonnes nominatives, en-têtes et contenu.

**Repère de non-régression.** Sur `/valoriser`, 45 000 € en clientèle de
particuliers doit donner **72 675 / 85 500 / 98 325 €**. Verrouillé par
`lib/valuation/public-estimate.test.ts`.

**Vocabulaire de l'interface.** Interdits : tiret cadratin, flèches décoratives,
« livre », « books », « pipeline », « IA », et « scellé » hors de l'expression
« offres scellées ». Vouvoiement partout.

---

## 5. Charte visuelle actuelle

Attention : `CLAUDE.md` décrit encore l'ancienne charte, charbon et or. **Elle a
été remplacée** sur demande, par une palette indigo sur fond clair, inspirée
d'assurdeal.fr. Les valeurs font foi dans `app/globals.css`.

| Rôle | Valeur | Contraste vérifié |
|---|---|---|
| Indigo principal | `#4f46e5` | 6,29:1 sur blanc |
| Indigo foncé | `#4338ca` | 7,90:1 |
| Fond de page | `#f8fafc` | — |
| Surface | `#ffffff` | — |
| Texte | `#111827` | 16,96:1 |
| Texte secondaire | `#6b7280` | 4,62:1 |
| Succès | `#047857` | 5,24:1 |
| Attention | `#b45309` | 4,80:1 |

Les tons vifs `#059669` et `#d97706` **échouent** au contraste sur blanc, ne pas
les réintroduire.

Conventions : cartes `rounded-3xl`, boutons pill, corps de texte à 15 px minimum,
chiffres en `tabular`, formats français avec espace insécable et virgule
décimale.

---

## 6. Où en est le produit

**Fait et déployé** : vitrine complète, pages légales, FAQ, catalogue avec
filtres, demandes d'acquisition, tableau de bord, analyse de portefeuille,
transfert des codes de courtage, bordereau de pièces, import par lots.

**Reste à faire**, dans l'ordre discuté avec le fondateur :

1. **Mur d'abonnement** : un non-abonné voit la liste des annonces mais pas le
   détail. Le modèle `Subscription` existe déjà et ne verrouille rien.
2. **Dépôt de 2,5 %** qui déclenche l'échange des coordonnées entre cédant et
   acquéreur, à la place de la lettre d'intention.
3. **Paiement réel et séquestre.** Point bloquant : encaisser des fonds pour le
   compte d'un tiers est un service de paiement réglementé en France. Il faut un
   prestataire agréé (Lemonway, MangoPay, Stripe Connect, Trustap), et
   l'ouverture de compte demande plusieurs semaines. `EscrowStage` existe en base
   mais tout est simulé.
4. **Bouton de publication d'un mandat** sur `/app/mandats`. L'action serveur
   `toggleMandatePublicationAction` existe et est protégée, l'interface manque.
5. **Identité juridique** à renseigner dans `lib/legal/entity.ts`. Un bandeau
   rouge s'affiche sur les pages légales tant que ce n'est pas fait. **Bloquant
   avant toute mise en ligne publique.**

---

## 7. Vérifier avant de déployer

```bash
npx tsc --noEmit
npx eslint app components lib middleware.ts
npm test                      # 152 tests
npm run db:migrate:remote     # si une migration a été ajoutée
npm run deploy
```

Puis contrôler en production : les pages publiques répondent 200, `/app` répond
307, et les six en-têtes de sécurité sont présents.

```bash
curl -sI https://cession-courtage.molobandit.workers.dev/ \
  | grep -icE "content-security-policy|x-frame-options|strict-transport|referrer-policy|x-content-type|permissions-policy"
# doit afficher 6
```
