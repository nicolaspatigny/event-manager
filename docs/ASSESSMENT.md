# Dossier de remplacement de stage et préparation de soutenance

## Présentation à personnaliser

**Faits connus** : projet individuel de Nicolas Patigny, formation CDA ENI, plateforme
de gestion d’événements, remplacement de stage. Le besoin et le périmètre proviennent
du cahier des charges et des consignes de l’enseignant.

**À compléter honnêtement** : structure réelle si applicable, statut du projet pédagogique,
interlocuteurs, dates effectives, contraintes matérielles, modalités d’accompagnement,
validation du sujet et du choix MongoDB seul. Ne pas inventer un client, une entreprise,
un tuteur ou des observations de terrain.

## Missions et trois blocs CDA

Les intitulés ci-dessous suivent l’organisation courante du titre CDA ; vérifier le code
RNCP et la version du référentiel de la promotion avant remise.

| Bloc | Missions / livrables | Preuves à présenter |
|---|---|---|
| Développer une application sécurisée | environnement, Angular, formulaires, composants métier, Git et tests | code, parcours filmé, rapports et captures |
| Concevoir et développer une application sécurisée organisée en couches | analyse, MCD, architecture REST/services/persistance, contrôle des données | DESIGN, API, mises à jour atomiques et tests concurrents |
| Préparer le déploiement d’une application sécurisée | builds, CI, conteneurs, configuration, recette et maintenance | Dockerfiles/Compose, workflow, rapports, procédure de sauvegarde |

Le schéma conceptuel ne prouve pas l’exécution d’une base relationnelle. Si le référentiel
exige cette compétence, demander à l’enseignant comment la démontrer séparément sans
présenter MongoDB comme du SQL. Le dossier doit refléter le travail compris et réalisé
par le candidat. L’assistance de génération de code doit être déclarée selon les règles
de l’établissement ; relire, expliquer, tester et adapter le code avant soutenance.

## Difficultés et solutions techniques observables

| Difficulté | Solution dans le projet | Preuve |
|---|---|---|
| Deux réservations pour la dernière place | filtre et écriture atomiques dans le document événement | test 12 requêtes / 3 places |
| Double inscription simultanée | condition utilisateur absent et push indivisibles | test 6 requêtes identiques |
| JWT valable après déconnexion | version persistée et relue à chaque requête | test révocation |
| Écrasement d’une modification | révision optimiste sur les éditions | test révision obsolète |
| Exposition des inscrits | vues publiques séparées et liste réservée au propriétaire | tests autorisations |
| Réseau cloud et navigateur | Chromium système en alternative au téléchargement interdit | configuration Playwright |

Ce tableau décrit des problèmes techniques réellement traités, pas des apprentissages
personnels attribués automatiquement au candidat.

## Journal personnel à remplir

Pour chaque session réelle : date, objectif, travail personnel réalisé, aide reçue,
difficulté, hypothèse, vérification, résultat, apprentissage, lien vers preuve anonymisée.

```text
Date : [date réelle]
Mission et bloc CDA : [à compléter]
Ce que j’ai réalisé et ce que j’ai compris : [à compléter]
Aide ou outils utilisés : [à compléter]
Problème observé et démarche : [à compléter]
Vérification / preuve : [lien réel]
Ce que je ferais autrement : [analyse personnelle]
```

## Analyse personnelle (questions, pas réponses fabriquées)

- Qu’ai-je appris sur MongoDB, les règles métier et les écritures concurrentes ?
- Quelles parties puis-je expliquer et modifier sans assistance ?
- Quel test a changé ma compréhension d’un défaut ?
- Pourquoi ce découpage en couches, et quelles limites ai-je constatées ?
- Qu’est-ce que je simplifierais ou renforcerais avec deux semaines de plus ?
- Comment ai-je organisé mon temps et adapté mon périmètre ?
- Quelle responsabilité reste à l’exploitant en sécurité et protection des données ?

## Proposition de soutenance

1. Contexte réel et problème utilisateur (2 min).
2. Périmètre, acteurs, MCD et architecture (3 min).
3. Démonstration participant / organisateur / admin (6 min).
4. Focus inscription atomique et contrôle des droits (3 min).
5. Tests, sécurité, RGPD et livraison (3 min).
6. Bilan personnel, limites et améliorations (3 min).

Ajuster à la durée officielle. Préparer une base fictive et un scénario sans dépendance
à un service externe. Capturer les rapports datés, citer le commit réellement présenté,
anonymiser les images et ne montrer ni secrets ni adresses de personnes réelles.
