# Contrats API

Base : `/api`. JSON ; dates ISO 8601 avec fuseau (`startsAt` en UTC). Jeton dans
`Authorization: Bearer …`. Aucun cookie de session. Les réponses utilisateurs n’exposent
ni mot de passe ni version interne du jeton.

| Méthode / route | Accès | Objet |
|---|---|---|
| POST /auth/register | public | firstName, lastName, email, password ; 201 |
| POST /auth/login | public | email/password ; token et user |
| POST /auth/logout | authentifié | révoque les jetons du compte ; 204 |
| GET /me | authentifié | profil courant |
| PUT /me | authentifié | firstName et lastName ; 204 |
| PUT /me/password | authentifié | currentPassword/newPassword ; révocation ; 204 |
| GET /me/export | authentifié | profil et vues des événements personnels |
| DELETE /me | authentifié hors admin | effacement ; 204, 409 si événements à venir |
| GET /events | public selon scope | liste paginée |
| GET /events/{id} | public | fiche sans données des participants |
| POST /events | organisateur/admin | EventInput ; 201 |
| PUT /events/{id} | propriétaire/admin | EventInput et revision ; 200 |
| DELETE /events/{id} | propriétaire/admin | annulation logique ; 204 |
| POST /events/{id}/registrations | participant | réservation atomique ; 201 |
| DELETE /events/{id}/registrations/me | inscrit | désinscription avant le début ; 204 |
| GET /events/{id}/participants | propriétaire/admin | noms et dates d’inscription |
| GET /categories | public | catégories actives et inactives |
| POST /admin/categories | admin | name/active ; 201 |
| PUT /admin/categories/{id} | admin | name/active |
| GET /admin/users | admin | comptes paginés |
| PUT /admin/users/{id} | admin | role/disabled ; révoque les jetons |
| GET /admin/audit | admin | actions paginées |
| GET /dashboard | authentifié | compteurs selon rôle |
| GET /health | public | application prête et ping MongoDB valide |

`GET /events` : `q` (titre littéral), `category` (id), `location` (littéral), `from`, `to`
(ISO Instant), `page` (0 par défaut), `size` (12, maximum 100). `scope=public` masque les
annulés ; `mine` exige organisateur/admin, `registrations` exige connexion, `admin` exige
administrateur. La réponse est `{items,total,page,size}`. Les tableaux admin utilisent
la même convention, avec une taille par défaut de 20.

Exemple EventInput :

```json
{"title":"Atelier créatif","description":"Une rencontre ouverte à tous.","startsAt":"2027-06-01T16:00:00Z","location":"Nantes","categoryId":"id-existant","capacity":20,"revision":0}
```

Les révisions changent après modification, inscription, désinscription ou annulation.
Un 409 à l’édition demande de recharger la fiche, pas de répéter aveuglément la requête.

Erreurs : 400 validation, 401 authentification/identifiants, 403 droits, 404 ressource,
409 conflit, 429 limitation au niveau du reverse proxy. Les erreurs métier utilisent
`application/problem+json` avec `status` et `detail`. Les validations ajoutent `errors`.
Les réponses inattendues restent gérées par Spring sans stacktrace ni détails internes.
