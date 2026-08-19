# Audit — Cercles familiaux et recettes

## Conclusion recommandée

L’application doit utiliser le **cloisonnement strict par cercle actif**. Un membre de plusieurs cercles choisit un cercle dans le sélecteur ; chaque onglet familial affiche alors uniquement les données de ce cercle. Une vue consolidée éventuelle devra être une fonctionnalité séparée, clairement nommée, et non le résultat implicite d’un cache ou d’une requête mal filtrée.

Cette approche est la plus compréhensible pour les familles et la plus sûre : le changement de cercle devient un changement de contexte, pas une juxtaposition de données de deux familles.

| Domaine | Constat d’audit | Mesure recommandée |
|---|---|---|
| Événements, tâches, messages, demandes | Les routes serveur déterminent déjà la famille via `x-active-family-id`, puis vérifient l’appartenance du membre. | Conserver ce mécanisme, mais garantir que le client transmet toujours le cercle réellement sélectionné. |
| Repas, courses, récompenses | Les routes reçoivent un `familyId` et contrôlent l’appartenance au cercle. | Garder ce contrôle et invalider les données lors d’un changement de cercle. |
| Notes | La table de notes est aujourd’hui reliée à un utilisateur, pas à un `familyId`; la vue « famille » rassemble les notes de tous les membres. | Distinguer les notes personnelles des notes partagées et ajouter un `familyId` aux notes partagées avant de promettre un cloisonnement total. |
| Cache mobile | Plusieurs requêtes sans paramètre `familyId` ont une clé React Query identique entre les cercles. | Vider/invalider immédiatement les requêtes sensibles au changement de cercle, puis les recharger avec le nouvel en-tête. |
| En-tête tRPC | `FamilyContext` mémorise le cercle sous une clé liée à l’utilisateur, tandis que le client réseau lit encore une clé générique. | Unifier la source de vérité du cercle actif ; c’est la cause la plus probable du Calendrier Ixari visible dans Contemporains 75. |

## Recettes : comportement robuste

La base et le routeur prennent déjà en charge `sourceUrl` sur les repas et recettes. L’import depuis une URL tente également d’extraire ingrédients et étapes depuis les données Recipe/JSON-LD de la page, puis retourne toujours l’URL d’origine.

La solution recommandée est donc **hybride** : préserver la marche à suivre extraite lorsque le site la fournit, mais toujours sauvegarder le lien source. Sur la carte du repas et dans l’historique, une zone explicite « Voir la recette » — superposée à la photo lorsqu’elle existe et disponible en bouton de secours — ouvre la page dans le navigateur. Le retour à FRI2PLAN reste celui du système Android/iOS et ne dépend pas du site de recette.

## Correctifs à prévoir

1. Synchroniser l’en-tête `x-active-family-id` avec le cercle sélectionné par l’utilisateur connecté.
2. Invalider les caches Calendrier, Tâches, Messages, Demandes et Notes au changement de cercle, avant le rendu des nouvelles données.
3. Ajouter une couverture de test avec un même utilisateur actif dans Ixari et Contemporains 75.
4. Ajouter l’accès visible au `sourceUrl` sur les repas importés et réutilisés.
5. Décider séparément du modèle de notes : personnel ou partagé par cercle, puis migrer les notes partagées si nécessaire.

## Publication

L’accès au lien de recette et la correction de cache/en-tête sont du JavaScript/TypeScript et passent par une mise à jour OTA. Le durcissement des notes nécessitera aussi un déploiement serveur et une migration de base, mais pas de nouveau build Android/iOS tant qu’aucun module natif n’est ajouté.
