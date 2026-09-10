# Charte couleurs, cession-courtage

Palette generee depuis une teinte unique en OKLCH (252 degres), pas assemblee
a partir d'un catalogue. Tous les rapports de contraste sont calcules.

Deux proprietes verifiees :

- aucune valeur ne figure dans le catalogue Tailwind par defaut
- aucune valeur n'est commune avec assurdeal.fr

## Jetons

```css
:root {
  /* Accent */
  --indigo:      #0062b3;
  --indigo-dark: #004888;
  --indigo-soft: #eef7ff;
  --indigo-line: #cbe2fd;

  /* Surfaces */
  --page:        #f8fafd;
  --surface:     #ffffff;
  --surface-alt: #f1f5fa;
  --line:        #c8d0da;

  /* Texte */
  --ink:         #131b25;
  --muted:       #616a74;

  /* Etats */
  --ok:          #0d6332;
  --warn:        #a26000;
  --danger:      #b12725;

  /* Fond profond, pied de page uniquement */
  --deep:        #00274c;
  --deep-soft:   #123a63;
}
```

Les noms restent `--indigo*` bien que la couleur ne soit plus un indigo : ce
sont des noms de role, les renommer casserait tous les appels existants.

## Contrastes mesures

| Couple | Rapport |
|---|---|
| `--ink` sur `--page` | 16,58 |
| `--ink` sur `--surface` | 17,34 |
| `--ink` sur `--surface-alt` | 15,84 |
| `--ink` sur `--indigo-soft` | 16,00 |
| `--muted` sur `--page` | 5,25 |
| `--muted` sur `--surface` | 5,49 |
| `--muted` sur `--surface-alt` | 5,02 |
| `--muted` sur `--indigo-soft` | 5,07 |
| `--indigo` sur `--surface` | 6,18 |
| `--indigo` sur `--page` | 5,91 |
| `--indigo-dark` sur `--indigo-soft` | 8,49 |
| blanc sur `--indigo` | 6,18 |
| blanc sur `--indigo-dark` | 9,20 |
| blanc sur `--deep` | 15,06 |
| `--ok` sur `--surface` | 7,37 |
| `--warn` sur `--surface` | 4,99 |
| `--danger` sur `--surface` | 6,59 |

Les 17 couples passent AA. Seuil applique : 4,50.

## Le compromis sur les statuts, a connaitre

`--ok` et `--danger` ont des luminances proches (ecart 0,017). En niveaux de
gris, ou pour un daltonisme rouge-vert, **ils ne se distinguent pas**.

Ce n'est pas un oubli, c'est une contrainte impossible a lever : pour tenir
4,5:1 sur blanc, les trois statuts doivent rester sombres, ce qui comprime leur
plage de luminance. Un ambre reellement ambre plafonne a 3,88 et echoue AA. Les
tentatives de separation donnent un `--warn` brun sombre, correct en calcul et
faux en lecture.

**Consequence, non negociable : un etat porte toujours un libelle ecrit.** La
couleur accompagne, elle ne signifie jamais seule. Un point rouge sans texte est
un bug d'accessibilite dans ce projet.

## Graphiques

Une seule teinte, du clair au fonce. Jamais plusieurs teintes pour des
categories.

```
#d6eaff  #abd2fe  #6da9eb  #1c73c5  #0056a6  #00407c
```

Texte `--ink` sur les paliers 1 a 3, blanc sur les paliers 4 a 6. Le palier 4
vaut `#1c73c5` et non un bleu moyen : entre 3,94 en blanc et 4,40 en fonce, il
existe une plage ou aucun texte n'est lisible, et il fallait la franchir.

Pour comparer des entites, garder une seule marque et separer par le libelle.

## Regles d'emploi

1. **Aucun degrade, nulle part.** Assurdeal en utilise huit differents ; c'est
   le point qui nous distingue le plus, avant meme la teinte.
2. L'accent est un accent sur fond clair, jamais un aplat pleine largeur.
3. `--deep` est reserve au pied de page.
4. Les montants portent `--ink` et la classe `.tabular`, jamais la couleur de
   la serie.
5. Focus visible en `var(--indigo)` sur tout element interactif.

## Le detail qui fait la difference

`--ink` vaut `#131b25` et non le `#111827` universel ; `--page` vaut `#f8fafd`
et non `#f8fafc`. Le noir et le blanc portent la meme teinte que l'accent, tres
faiblement dosee. Invisible isolement, l'effet se lit sur une page entiere :
un ensemble coherent plutot qu'un assemblage de pieces prises ailleurs.
