# Maquettes et expérience utilisateur

La direction visuelle est une interface française « Rassemble » : fond crème, vert
profond, accents terracotta, titres sérif et composants simples. Les illustrations sont
réalisées en CSS ; aucun service externe, police distante ou image tierce n’est nécessaire.

Les diagrammes suivants représentent la structure des écrans. Les captures réelles sont
produites dans `artifacts/screenshots` par le parcours Playwright ; elles ne constituent
pas une recherche utilisateur historique inventée.

```text
ACCUEIL DESKTOP
┌ logo ─ agenda ─ connexion ─ rejoindre ───────────────────┐
│ promesse / titre / explorer       illustration CSS       │
├ recherche ─ catégorie ─ lieu ─ date ─ bouton ────────────┤
│ carte événement    carte événement    carte événement    │
│ date / titre       date / titre       date / titre       │
│ lieu / places      lieu / places      lieu / places      │
├ pagination ─────────────────────────────────────────────┤
│ appel à organiser                                       │
└ confidentialité / projet CDA ────────────────────────────┘

DÉTAIL
┌ retour agenda ──────────────────────────────────────────┐
│ illustration / catégorie      │ date et heure            │
│ titre / description          │ lieu / places / réserver  │
│                              │ actions du propriétaire  │
└ participants (propriétaire uniquement) ──────────────────┘

ESPACE PERSONNEL
┌ navigation selon le rôle ────────────────────────────────┐
│ bonjour / compteurs        bouton créer (organisateur)   │
│ liste événements : date / titre / lieu / statut / détail │
└ pagination ─────────────────────────────────────────────┘

ADMINISTRATION
┌ utilisateurs | catégories | événements | journal ───────┐
│ tableau paginé / modification / confirmation             │
└ résultats, erreurs et retours d’action ───────────────────┘
```

## Accessibilité et adaptation

- Labels associés aux champs, navigation clavier et focus visible.
- Lien d’évitement, navigation sémantique, boutons de taille tactile.
- Retours d’erreur `role=alert`, confirmations `role=status`.
- Les illustrations décoratives sont masquées aux technologies d’assistance.
- Grilles ramenées à une colonne sur mobile ; tableaux défilants.
- Les places, erreurs et statuts sont exprimés par du texte, pas seulement une couleur.
- Confirmations avant suppression, désinscription et annulation.

Tests automatiques : parcours desktop et contrôle du débordement à 390 px. Une recette
clavier complète, des mesures de contraste exhaustives et un audit RGAA restent des
vérifications humaines à effectuer ; aucune certification d’accessibilité n’est revendiquée.
