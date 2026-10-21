# Analyse et expression du besoin

## Contexte réel connu

Nicolas Patigny prépare une formation CDA à l’ENI. Ce projet remplace son stage et vise
à produire une application full-stack démontrable de gestion d’événements sur un périmètre
prévu de deux mois. Aucun nom d’entreprise d’accueil, activité commerciale, effectif,
organigramme ou tuteur n’a été communiqué. Le dossier présente donc un contexte de projet
pédagogique ; ces informations ne doivent pas être inventées.

## Besoin

Centraliser la découverte d’événements, leur publication et les inscriptions, avec des
droits adaptés aux participants, organisateurs et administrateurs. Éviter une double
inscription, une surcapacité ou la modification des événements d’un tiers.

## Acteurs

- Visiteur : consulter l’agenda, rechercher, lire un événement, créer un compte.
- Participant (`USER`) : gérer son profil, s’inscrire, se désinscrire avant le début,
  consulter ses événements à venir et passés, exporter/supprimer son compte.
- Organisateur : publier, modifier et annuler ses événements ; voir les noms des inscrits.
- Administrateur : gérer les comptes/rôles, catégories, tous les événements et les journaux.

L’organisateur ne s’inscrit pas en tant que participant. L’administrateur attribue les
rôles ; le formulaire public ne permet jamais de choisir un rôle privilégié.

## Décision de stockage

Le PDF prévoyait SQL Server pour le métier et MongoDB pour les journaux. Le porteur a
demandé explicitement **MongoDB seul**. Collections : users, events (inscriptions
embarquées), categories, audit. Les relations conceptuelles restent documentées dans
le MCD mais ne constituent pas un schéma SQL livré. Faire valider par l’enseignant la
couverture de la compétence relationnelle si elle est obligatoire pour la certification.
Le projet seul ne prouve pas une compétence SQL exécutée.

## Périmètre livré

Authentification JWT et révocation, profil, recherche, événements, inscriptions,
administration, tableaux de bord, journaux techniques, export et effacement, interface
Angular française, tests HTTP/MongoDB et navigateur, livraison Docker, documentation.

## Règles et acceptation

| ID | Règle | Résultat attendu |
|---|---|---|
| RM01 | Date future à la création | 400 pour une date passée |
| RM02 | Capacité maximale | Une écriture atomique refuse tout dépassement |
| RM03 | Unicité événement/participant | Une seule inscription, même simultanée |
| RM04 | Propriété | 403 pour l’organisateur tiers |
| RM05 | Complet | 409 pour toute place supplémentaire |
| RM06 | Annulé | Aucune nouvelle inscription |
| RM07 | Administration | 401 sans connexion, 403 sans rôle |
| RM08 | Validation serveur | 400 avec erreurs de champs |
| RM09 | Modification concurrente | Révision obsolète : 409 |
| RM10 | Réduction de capacité | Refus si inférieure aux inscrits |
| RM11 | Compte désactivé/supprimé | Jeton existant inutilisable |

L’annulation d’un événement conserve sa fiche et ses inscriptions afin d’informer les
participants. La désinscription retire la réservation ; l’historique affiche les événements
passés auxquels l’utilisateur est resté inscrit, pas une archive de chaque réservation
annulée. Les journaux conservent temporairement les actions de désinscription.

## Limites assumées

Pas de paiement, messagerie, application mobile native, recommandations, e-mails,
billets PDF, QR codes, mot de passe oublié ou notifications temps réel. Les places sont
bornées à 1 000 pour conserver des documents MongoDB raisonnables. Le MVP n’a pas fait
l’objet d’un audit externe ni d’un test de charge de production. Les données de test sont
fictives. Les lieux sont des champs structurés au niveau de l’événement, sans référentiel
indépendant à administrer.
