# Conception

## Modèle conceptuel de données (indépendant du stockage)

```mermaid
erDiagram
 UTILISATEUR ||--o{ EVENEMENT : organise
 UTILISATEUR ||--o{ INSCRIPTION : effectue
 EVENEMENT ||--o{ INSCRIPTION : accueille
 CATEGORIE ||--o{ EVENEMENT : classe
 UTILISATEUR o|--o{ JOURNAL : declenche
 UTILISATEUR { string id PK string email UK string passwordHash string role boolean disabled long tokenVersion }
 EVENEMENT { string id PK string organizerId FK string categoryId FK string title datetime startsAt string location int capacity string status long revision }
 INSCRIPTION { string eventId FK string userId FK datetime registeredAt }
 CATEGORIE { string id PK string normalizedName UK boolean active }
 JOURNAL { string id PK string actorId string action string resourceId datetime createdAt }
```

## Passage au modèle documentaire

`events.registrations` est un tableau de `{ userId, registeredAt }`. Le couple conceptuel
événement/participant est unique grâce au filtre de mise à jour, pas à un index unique
multikey (qui ne garantirait pas l’unicité dans un même document). Les coordonnées du
participant ne sont pas recopiées dans les événements. L’API publique retourne une vue
sans le tableau ni les identifiants des participants.

Indexes : `users.email` unique, `categories.normalizedName` unique, date et organisateur
des événements, TTL sur `audit.createdAt` (90 jours). Les utilisateurs historiques doivent
être normalisés avant création de l’index e-mail ; résoudre les collisions explicitement,
sans suppression automatique de comptes. Un index unique simple n’est pas insensible
à la casse ; c’est la normalisation à chaque écriture qui l’assure.

La suppression d’une catégorie est remplacée par une désactivation pour conserver les
références. L’effacement d’un utilisateur retire ses inscriptions et ses données personnelles ;
les événements restent avec un identifiant organisateur non résolu et sans coordonnées.

## Cas d’utilisation

```mermaid
flowchart LR
 V[Visiteur] --> C[Consulter et rechercher les événements]
 V --> A[Créer un compte / se connecter]
 P[Participant] --> C
 P --> I[S’inscrire / annuler son inscription]
 P --> H[Consulter prochains événements et historique]
 P --> PR[Modifier profil / exporter / supprimer compte]
 O[Organisateur] --> E[Créer / modifier / annuler ses événements]
 O --> L[Consulter ses participants]
 O --> PR
 AD[Administrateur] --> U[Gérer comptes et rôles]
 AD --> CA[Gérer catégories]
 AD --> G[Gérer tous les événements]
 AD --> J[Consulter journal et synthèse]
 E --> CO{Propriété vérifiée côté serveur}
 I --> CP{Date, statut, unicité et capacité}
```

## Architecture

```mermaid
flowchart TB
 B[Navigateur · Angular] --> N[Nginx · fichiers statiques / reverse proxy]
 N --> S[Spring Security · JWT / rôles]
 S --> C[Contrôleurs REST / DTO validés]
 C --> M[Services métier]
 M --> R[MongoTemplate / UserRepository]
 R --> DB[(MongoDB)]
 M --> J[AuditService]
 J --> DB
```

Contrôleurs : adaptation HTTP et validation. Services : règles métier et autorisations.
Modèles : documents persistants. DTO/vues : exposition contrôlée. Angular ne décide
jamais des permissions réelles : les gardes servent uniquement à l’ergonomie.

## Inscription atomique

```mermaid
sequenceDiagram
 participant U as Participant
 participant API as API / JWT
 participant S as EventService
 participant DB as MongoDB
 U->>API: POST /events/id/registrations
 API->>S: User authentifié, rôle USER
 S->>DB: findAndModify(id, PUBLISHED, startsAt > now, utilisateur absent, size < capacity)
 alt Document admissible
  DB-->>S: Push inscription et revision + 1 dans une seule écriture
  S-->>API: Vue mise à jour
  API-->>U: 201
 else Filtre non satisfait
  DB-->>S: Aucun document modifié
  API-->>U: 409
 end
```

L’annulation, la réservation et l’édition portent sur le même document. L’édition compare
la révision ; les réservations incrémentent cette révision. Pas de lecture puis écriture
non protégée pour le dernier siège. Aucun verrou Java en mémoire : la garantie fonctionne
sur plusieurs instances d’API. Les tests lancent des requêtes HTTP concurrentes réelles.

Les opérations d’effacement d’un compte touchent plusieurs documents et sont des
opérations de maintenance réessayables, pas une transaction globale. Pour une exploitation
à fort trafic, prévoir une désactivation préalable et une file de purge contrôlée pour
traiter les requêtes déjà en vol, ainsi qu’un rapprochement des références orphelines.
