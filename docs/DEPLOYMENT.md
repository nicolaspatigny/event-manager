# Livraison, maintenance et exploitation

## Configuration

Java 21 complet, Node 24 pour le build, MongoDB 8. Le wrapper Gradle versionne l’outil
de build ; npm utilise le lockfile via `npm ci`. MongoDB seul ; aucun serveur SQL.
Le backend reçoit `MONGODB_URI`, `JWT_SECRET`, et éventuellement `ADMIN_EMAIL`/
`ADMIN_PASSWORD` pour amorcer le premier compte. Le secret JWT doit être aléatoire,
privé et d’au moins 32 octets. Aucun secret livré en dur.

Le compte d’amorçage n’est créé que s’il n’existe pas. Ne pas confondre un changement
de variable avec une réinitialisation de mot de passe. Après amorçage, retirer le mot de
passe admin des variables quand le mode d’exploitation le permet et utiliser le profil
pour le changer. Une base existante peut exiger une migration des e-mails : normaliser
et résoudre les doublons avant l’index unique.

## Docker Compose

Voir le README. `docker compose up --build -d`, puis vérifier l’API via le proxy et effectuer
une vraie connexion. Le ping MongoDB et un processus HTTP ne prouvent pas le fonctionnement
métier : créer une catégorie, promouvoir un organisateur, publier et réserver une place.
Ne pas ouvrir les ports MongoDB/API au réseau public. Le bind web par défaut est local ;
ajouter un reverse proxy TLS administré pour une publication réelle.

`docker compose down` arrête les conteneurs sans supprimer le volume. **Ne pas ajouter
`-v` sur une base à conserver.** Une modification des identifiants MongoDB dans `.env`
ne réinitialise pas les utilisateurs d’un volume déjà initialisé : effectuer une rotation
avec MongoDB, puis mettre à jour la configuration de l’API.

## Sauvegarde / restauration

Depuis un terminal administré, sans journalisation shell des secrets :

```bash
mkdir -p backups
# Utilise les variables déjà injectées dans le conteneur, sans les afficher.
docker compose exec -T mongo sh -c 'mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db event_manager --archive --gzip' > backups/event-manager.archive.gz
# Restaurer uniquement dans une instance de recette isolée après validation de la cible.
# mongorestore --archive=... --gzip avec les identifiants de cette instance.
```

Chiffrer les sauvegardes, restreindre l’accès, définir leur durée et tester régulièrement
une restauration. Le mot de passe est passé à l’outil interne ; limiter aussi les droits
d’accès système au conteneur. La restauration réelle n’est pas attestée sans preuve
d’exécution. Réappliquer les demandes d’effacement après une restauration ancienne.

## Maintenance

1. Reproduire un défaut avec un ticket, impact et étapes précis ; exclure les données réelles.
2. Ajouter un test utile qui échoue, corriger sur une branche, relire la PR.
3. Exécuter tests API et navigateur, build frontend/backend, revue des dépendances.
4. Sauvegarder, déployer la nouvelle version, vérifier un parcours métier et les logs.
5. Revenir à l’image précédente si échec ; ne pas restaurer une base sans analyser les
   modifications de schéma et les données écrites depuis la livraison.

Surveiller disponibilité, erreurs HTTP, espace disque MongoDB, échecs de login et de
journalisation. Le TTL MongoDB est asynchrone ; 90 jours n’est pas une échéance à la
seconde près. Les erreurs applicatives n’exposent pas les stacktraces au navigateur.

## Limitations opérationnelles

Compose privilégie une démonstration reproductible, pas une infrastructure hautement
disponible. Le compte MongoDB root doit être remplacé par un utilisateur applicatif limité
avant production. Pas de réplication, monitoring central, sauvegarde automatique, TLS
managé ni rotation automatique. Les opérations de purge multi-documents sont à renforcer
avant forte concurrence. Le guide décrit les compléments requis sans prétendre les avoir
mis en exploitation.


## Construction derrière un proxy de confiance

Les Dockerfiles acceptent des secrets BuildKit optionnels : `gradle_properties` pour
les propriétés proxy Gradle, `java_truststore` pour le magasin de certificats Java,
et `proxy_ca` pour la CA Node. Ils ne sont pas incorporés aux images. Dans un réseau
cloud où le nom du proxy n’est pas résolu depuis Docker, fournir aussi un `extra_hosts`
de build avec son adresse actuelle. Ne pas copier de jeton dans un ARG, ne pas désactiver
TLS et ne pas désactiver les checksums. Le wrapper vérifie le SHA-256 officiel de sa
distribution Gradle, enregistré dans gradle-wrapper.properties.


## Compatibilité du noyau avec MongoDB

L’image MongoDB 8.0 utilisée dans cette livraison refuse les noyaux Linux 6.19
ou ultérieurs (voir https://jira.mongodb.org/browse/SERVER-121912). Les conteneurs
partagent le noyau hôte : Docker ne contourne pas cette incompatibilité. Utiliser
un hôte compatible ou une version MongoDB officiellement corrigée et revalidée.
La CI est fixée sur Ubuntu 22.04 (noyau 6.8 dans son manifeste officiel). Une première
fixation sur Ubuntu 24.04 n’a pas suffi sur le runner du job frontend ; le noyau
effectif est désormais affiché dans les logs de démarrage.
