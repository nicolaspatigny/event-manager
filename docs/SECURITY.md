# Sécurité, OWASP 2025 et RGPD

Référence demandée : https://owasp.org/Top10/2025/. Le site a répondu HTTP 403 dans
cet environnement ; la nomenclature a été vérifiée dans le dépôt officiel OWASP :
https://github.com/OWASP/Top10/blob/master/2025/docs/en/index.md (consulté le 21 octobre 2026).
Ce tableau est une analyse de risques et de contrôles, pas une certification de conformité.

| OWASP 2025 | Contrôles présents | Compléments d’exploitation |
|---|---|---|
| A01 Broken Access Control | rôles serveur, propriété, vues sans participants, tests 401/403 | recette des habilitations réelles |
| A02 Security Misconfiguration | pas de stacktrace, réseau Docker interne, utilisateur non-root, en-têtes | TLS, secrets, configuration de l’hôte |
| A03 Software Supply Chain Failures | lock npm, Gradle wrapper, CI, dépendances versionnées | audit récurrent, signatures et pins d’images/actions |
| A04 Cryptographic Failures | BCrypt, JWT signé et expirant, secrets hors Git | TLS obligatoire, chiffrement sauvegardes/disques |
| A05 Injection | DTO typés, recherche regex échappée, Angular interpolation | test offensif, limites de charge |
| A06 Insecure Design | règles capacité/duplication atomiques, droits documentés | revue indépendante, modèle de menaces élargi |
| A07 Authentication Failures | mots de passe 12 caractères, erreurs génériques, JWT révoqués, comptes désactivables | MFA et récupération de compte hors MVP |
| A08 Software or Data Integrity Failures | index uniques, contrôle de révision, pas de rôle venant de l’inscription | provenance des artefacts de livraison |
| A09 Security Logging and Alerting Failures | audit minimal, TTL 90 jours, absence de secrets | centralisation, alertes, procédure d’incident |
| A10 Mishandling of Exceptional Conditions | ProblemDetail, conflits explicites, tests de refus, audit non bloquant | résilience DB, tests de panne et supervision |

## Choix d’authentification

Le JWT est stocké seulement en mémoire du navigateur et expire après une heure. Un
rechargement demande une reconnexion. La signature contient l’identifiant du compte et
une version ; chaque requête vérifie le compte et sa version en base. Déconnexion,
changement de mot de passe et modification des droits invalident les anciens jetons.
Les rôles sont relus côté serveur, pas acceptés depuis le navigateur.

CSRF est désactivé parce que l’API utilise uniquement un en-tête Bearer explicitement
ajouté ; aucune authentification par cookie n’est utilisée. L’interface et l’API sont de
même origine. Les contrôles CORS permissifs ne sont pas activés.

Le reverse proxy Docker limite les tentatives login/inscription (10 requêtes/minute et
burst 10 par adresse IP). L’API doit rester sur le réseau interne ; le serveur de
développement n’offre pas cette protection. En cas de proxy supplémentaire, configurer
l’adresse client de confiance sans accepter aveuglément un X-Forwarded-For utilisateur.

Le contrôle de longueur BCrypt est fait en octets UTF-8 (72 maximum), en plus de la
validation en caractères. Le jeton et le hash du mot de passe ne figurent jamais dans
les vues ou journaux. L’échec d’audit est signalé dans les logs techniques sans annuler
une opération métier déjà réalisée.

## RGPD : minimisation et droits

| Données | Finalité | Exposition / conservation |
|---|---|---|
| prénom, nom, email, hash | compte et service demandé | compte jusqu’à suppression ; accès limité |
| événement, inscription | organisation et réservation | compte et organisateur concerné (noms seulement) |
| acteur/action/ressource/date | diagnostic et sécurité | administrateurs ; TTL 90 jours |
| JWT en mémoire | authentification | fin de page/session ou une heure, révocable |

Fonctions : rectification du nom, export JSON, effacement du compte et de ses inscriptions,
effacement des traces d’audit liées. Pas de marketing ni traceur. Les acteurs sont
identifiés par identifiants techniques dans le journal (pseudonymisation, pas anonymisation
absolue). Les sauvegardes exigent une politique d’expiration et de réapplication des
suppressions après restauration.

Avant un usage réel, l’exploitant doit renseigner : responsable et contact, base légale
adaptée (exécution du service pour le compte, intérêt légitime documenté pour les traces
ou autre fondement approprié), sous-traitants/hébergement, transferts, registre, durée
métier des événements et demandes de droits. Une page de confidentialité et des endpoints
ne suffisent pas à établir la conformité RGPD.

## Points à durcir avant ouverture publique

TLS, compte MongoDB applicatif à privilèges minimaux (Compose utilise un compte root de
démonstration), gestionnaire de secrets, surveillance et rotation, limitation API globale,
MFA admin, scans de dépendances avec traitement des alertes, audit d’accessibilité, tests
de charge, procédure de purge résiliente et contacts RGPD. Les images Docker sont
versionnées par majeure ; les figer par digest dans une livraison d’exploitation revue.
