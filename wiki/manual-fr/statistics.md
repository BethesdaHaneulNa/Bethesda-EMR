# Statistiques

L'écran **Statistiques** montre l'activité de l'hôpital sur une période : le nombre de visites, l'argent entré et sorti de la caisse, ce que les patients doivent encore, et les médicaments prescrits ou délivrés. Il est réservé aux **responsables** (compte avec le droit « Statistiques »). Il ne modifie rien : on peut regarder sans risque.

## En bref

1. En haut de l'écran, cliquez sur **Statistiques**.
2. Choisissez la période : **Aujourd'hui**, **Cette semaine** ou **Ce mois** (ou saisissez deux dates).
3. Lisez **Activité** : combien de patients sont venus.
4. Lisez **Recettes** : la carte **Caisse** donne l'argent entré moins l'argent rendu.
5. Pour savoir qui doit encore payer, cliquez sur la carte **Impayé ▼**.
6. Pour la caisse jour par jour, regardez **Caisse par période**.
7. Descendez à **Usage médicaments** pour les médicaments prescrits ou délivrés. **⬇ CSV** télécharge un tableau pour Excel.

## Pas à pas

### Choisir la période

1. Cliquez sur **Statistiques** dans la barre du haut.
2. L'écran s'ouvre sur **Ce mois** : du 1er du mois jusqu'à aujourd'hui.
3. Cliquez sur **Aujourd'hui**, **Cette semaine** (depuis lundi) ou **Ce mois**.
4. Pour une autre période, saisissez la date de début et la date de fin dans les deux cases à côté.
5. Les chiffres se mettent à jour tout seuls. Pendant le calcul, `···` s'affiche à côté des dates.

Les montants s'écrivent avec un espace pour les milliers (**39 300 Ar**) et les nombres avec leur unité (**3 cas**).

La période choisie compte pour **Activité** et **Recettes**. Elle ne compte pas pour les cartes **Impayé** et **Remboursement dû** (ce sont les montants d'aujourd'hui), ni pour **Caisse par période**, **Usage médicaments** et **Tendance mensuelle** (ils ont leurs propres dates).

### Lire « Activité » — combien de patients

| Carte | Ce qu'elle compte |
|---|---|
| **Visites totales** | Les visites de la période. **Les enregistrements annulés ne sont pas comptés.** En petit, **Patients uniques** : un patient venu trois fois compte pour un. |
| **Nouvelle** · **Suivi** · **Sans frais / autres** | Le type de visite choisi à l'accueil ou à la caisse. **Sans frais / autres** contient les visites sans frais de consultation, et les anciennes visites « urgence » ou « référé ». Les trois ensemble font **Visites totales**. |
| **Terminé** · **En cours** | Visites terminées / patients encore en attente ou en consultation. |
| **Annulé** | Enregistrements annulés. Ils ne sont comptés que dans cette carte. |
| **Par service** · **Par médecin** | Visites par service et par médecin. Sans service ou sans médecin choisi : ligne **Non attribué**. |

### Lire « Recettes » — combien d'argent

| Carte | Ce qu'elle compte |
|---|---|
| **Caisse** | L'argent **réellement entré dans la caisse moins l'argent rendu**, le jour où il a bougé. En petit : **Entrées** et **Sorties** (argent rendu lors d'une correction ou d'une annulation, monnaie rendue lors d'une nouvelle facturation). Corriger ou annuler un reçu plus tard **ne change pas les jours passés**. Un jour où l'on a surtout rendu de l'argent, **Caisse** peut être négative. |
| **Factures de soins** | Les reçus de soins de la période, même non payés. En petit : **Facturé** (montant facturé avant remise) et **+ N règlement(s) de solde** (reçus faits quand un patient a payé une ancienne dette). |
| **Moy. facturée / visite** | Montant facturé moyen par visite. |
| **Impayé ▼** | Ce que les patients doivent **aujourd'hui**, toutes dates confondues. |
| **Remboursement dû ▼** | Ce que l'hôpital doit rendre **aujourd'hui** (patient qui a trop payé). |
| **Annulés** | Reçus annulés par le personnel pendant la période (pas ceux remplacés par une correction). L'argent rendu est dans les **Sorties** de **Caisse**. |
| **Recettes par service — selon les reçus** · **Recettes par médecin — selon les reçus** | L'argent reçu, **selon les reçus**, réparti par service et par médecin : pour quel soin l'argent a été payé. Le total est écrit à côté du titre. Une ancienne dette payée plus tard compte pour le service et le médecin de la consultation d'origine. Ce total peut être différent de **Caisse** quand un reçu a été corrigé ou annulé un autre jour ; sur une longue période, les deux se rejoignent. |
| **Recettes par poste** | **Facturé** réparti en **Consultation**, **Médicaments**, **Examens / Actes**, **Documents**. |

### Voir qui doit de l'argent

1. Cliquez sur la carte **Impayé ▼**. La **Liste impayés** s'ouvre en dessous (**Chargement...** s'affiche un instant).
2. Pour chaque patient : **N° dossier**, **Nom**, **Téléphone**, montant **Impayé**, **Depuis** (date de la plus ancienne consultation encore non payée), **Factures**.
3. Les plus grosses dettes sont en haut. Exemple : 26-00001 · RAKOTO Jean · 15 000 Ar · Depuis 2026-08-28.
4. Le montant est le même que dans l'écran **Paiement** quand on ouvre ce patient.
5. Pour les remboursements, cliquez sur **Remboursement dû ▼** : la **Liste remboursements** s'ouvre.
6. Cliquez de nouveau sur la carte pour fermer la liste. À chaque ouverture, la liste est rechargée.

Le numéro de dossier commence par l'année (26-…, 27-…) et repart de 00001 chaque année.

### La caisse jour par jour : « Caisse par période »

1. Sous **Recettes**, dans **Caisse par période**, cliquez sur **Jour**, **Mois** ou **Année**. Au départ : 30 derniers jours, 12 derniers mois, 5 dernières années.
2. Pour une autre période, saisissez les deux dates à droite.
3. Pour chaque jour (ou mois, ou année) : **Entrées**, **Sorties**, **Net**, puis le détail : **Paiements**, **Règlements de solde**, **Rendu (correction)**, **Rendu (annulation)**. Pour les jours d'avant le journal de caisse, une colonne **Avant le journal de caisse** apparaît (le montant des reçus de ce jour).
4. La ligne **Total** donne la période entière.
5. Le **Net** d'un jour doit être égal à l'argent de la caisse ce jour-là. Si ce n'est pas le cas, prévenez l'administrateur.
6. Cliquez sur **⬇ CSV** pour télécharger le tableau.

### Médicaments : « Usage médicaments »

1. Cliquez sur **Jour**, **Mois** ou **Année**. Au départ : 30 derniers jours, 12 derniers mois, 5 dernières années. Les deux cases de dates à droite montrent la période.
2. Pour une autre période, saisissez les deux dates. Cliquer de nouveau sur **Jour** / **Mois** / **Année** remet la période de départ.
3. Choisissez **Tous**, **Interne** (délivré par la pharmacie de l'hôpital) ou **Externe** (ordonnance à acheter dehors).
4. Choisissez **Toutes Rx** ou **Dispensé**. La phrase en petit au-dessus du tableau rappelle la règle :
   - **Toutes Rx** : ce que les médecins ont prescrit, à la date de la visite, en quantité prescrite.
   - **Dispensé** : ce que la pharmacie a remis, à la date de remise, médicaments internes seulement, arrondi à l'unité. **C'est le même chiffre que les sorties du rapport de stock de la pharmacie.** Avec **Externe**, le tableau est donc vide.
5. Une ligne par médicament. La colonne **Total** est le total de ce médicament sur la période. Il n'y a pas de total de tous les médicaments (comprimés et flacons ne s'additionnent pas).
6. Un mot jaune à côté du nom (**Flacon**, **Tube**, **Inhalateur**, **Unité**) : la quantité est un nombre de flacons, tubes… et non de comprimés. Le même médicament peut avoir deux lignes : une ancienne en doses, une en flacons.
7. Cliquez sur **⬇ CSV** pour télécharger le tableau (s'ouvre dans Excel ; la colonne « unit » donne le flacon/tube).

### Tendance mensuelle

En bas : les 6 derniers mois, **Visites totales** et **Caisse** (net du mois). Un mois sans activité s'affiche à 0.

## Si ce message apparaît

| Ce que vous voyez | Ce que cela veut dire | Que faire |
|---|---|---|
| **Aucune donnée** | Rien pour cette période (ou le calcul n'a pas pu se faire). | Vérifiez les deux dates. Si la période est bonne et que le problème reste, prévenez l'administrateur. |
| **Chargement...** qui ne part pas | Le serveur ne répond pas. | Rechargez la page (touche F5). Si cela continue, prévenez l'administrateur. |
| Le menu **Statistiques** n'apparaît pas | Votre compte n'a pas le droit « Statistiques ». | Demandez à l'administrateur (écran **Paramètres**). |
| Le nombre de visites d'un jour passé a changé | Un enregistrement de ce jour a été annulé ou terminé plus tard. Un patient en attente terminé sans consultation passe de **Nouvelle** à **Sans frais / autres**. | Rien : c'est normal. |
| **Caisse** d'un jour est négative | Ce jour-là, on a rendu plus d'argent qu'on n'en a reçu (par exemple une correction d'un reçu de la veille). | Rien : c'est normal. |
| Le total de **Recettes par service** n'est pas égal à **Caisse** | Les graphiques comptent selon les reçus, la caisse selon le jour de l'argent. Un reçu corrigé ou annulé un autre jour les sépare. | Rien : sur une période plus longue, les deux se rejoignent. Pour la caisse, regardez **Caisse par période**. |
| **Visites totales** plus petit que la liste de l'accueil | Les enregistrements annulés ne sont pas comptés. | Regardez la carte **Annulé**. |
| **Aucune donnée** juste après avoir changé une date en haut | La date de début est après la date de fin. (Dans le tableau des médicaments, une telle date est simplement ignorée.) | Corrigez l'une des deux dates. |

## À ne pas faire

- Ne laissez pas l'écran ouvert sans surveillance : la **Liste impayés** montre des noms et des numéros de téléphone.
- N'envoyez pas le fichier **CSV** ou une capture de la liste des impayés en dehors de l'hôpital.
- Ne comparez pas **Toutes Rx** avec le rapport de stock : pour le stock, utilisez **Dispensé**.
- N'additionnez pas les lignes de médicaments entre elles (comprimés et flacons).
- Ne donnez pas le droit « Statistiques » à tout le monde : seulement aux responsables.

## Qui appeler

Prévenez l'**administrateur** de l'EMR si :
- le **Net** d'un jour dans **Caisse par période** n'est pas égal à l'argent compté dans la caisse ;
- un montant **Impayé** ne correspond pas à ce que montre l'écran **Paiement** pour le même patient ;
- **Chargement...** reste affiché après avoir rechargé la page ;
- un médicament délivré ne correspond pas aux sorties du rapport de stock pour le même mois.

Notez la période choisie, le chiffre vu et l'heure : cela aide à trouver la cause.
