# Pharmacie

L'écran **Pharmacie** sert à remettre les médicaments prescrits par le médecin, à imprimer l'ordonnance pour une pharmacie extérieure et à tenir le stock (entrées, inventaire, rebut, rapport de fin de mois). Il n'y a pas de pharmacien sur place : c'est l'infirmier ou l'infirmière qui l'utilise. Un compte infirmier ouvre **Enregistrement**, **Pharmacie** et **Laboratoire**.

## En bref

1. En haut, cliquez sur **Pharmacie**, puis sur **En attente**.
2. À gauche, cliquez sur le nom du patient (exemple : **RAKOTO Jean**, n° **26-00001**).
3. Lisez l'encadré rouge **Allergies** s'il apparaît.
4. Pour chaque médicament, laissez **Interne** (remis ici) ou choisissez **Externe** (acheté dehors).
5. S'il y a un médicament **Externe** : cliquez sur **💊 Ordonnance ext.**, puis **Émettre**, puis **🖨 Réimprimer**.
6. Préparez les médicaments **Interne** : le nombre à remettre est dans la colonne **Qté**.
7. Cliquez sur **✓ Terminer délivrance**, puis sur **OK**.
8. Le patient passe dans **Délivré**. Passez au patient suivant.

La liste se met à jour toute seule toutes les 30 secondes. Pour la voir tout de suite, cliquez sur **Rafraîchir**.

## Pas à pas

### Lire une ligne d'ordonnance

Au centre, chaque médicament a une ligne : **Médicament** · **Dose/jour** · **Dose/prise** · **Fréq.** · **Jours** · **Posologie** · **Qté** · **Note**.

- **Dose/jour** = la quantité prise dans la journée. **Dose/prise** = la quantité à chaque prise. **Fréq.** = combien de fois par jour. **Jours** = pendant combien de jours.
- **Qté** = le nombre total à remettre. C'est ce nombre qui sort du stock et qui est payé à la caisse.
- Exemple : **Dose/jour** 3 · **Dose/prise** 1 · **Fréq.** 3 · **Jours** 7 · **Qté** 21 → 1 comprimé 3 fois par jour pendant 7 jours, 21 comprimés en tout. **½** veut dire un demi-comprimé.
- Sirops, inhalateurs, collyres, pommades : la colonne **Qté** donne le nombre de flacons ou de tubes (exemple : **2 flacons**, **1 inhalateur**). Remettez ce nombre. Les autres colonnes disent seulement comment le prendre.

Ce qui peut apparaître en jaune ou en rouge :

- **⚠ À vérifier avec le médecin (pas en demi-comprimés)** sous **Dose/prise** : la dose du jour ne se partage pas en comprimés entiers ou en demi-comprimés. Demandez au médecin.
- **⚠ Nombre de prises absent — voir le médecin** sous **Fréq.** : le médecin n'a pas écrit combien de fois par jour. Vous pouvez remettre le médicament, mais demandez au médecin comment le prendre.
- **⚠ Quantité totale absente** dans **Qté** : le nombre total n'a pas été écrit. Ce médicament ne sortira pas du stock. Demandez au médecin.
- **Ancien calcul (dose×fois×jours)** sous **Qté** : ordonnance enregistrée avant le changement de calcul. Le nombre affiché reste celui à remettre.
- Un cadre rouge **⚠** sous le nom du médicament (exemple : « Même médicament prescrit il y a 3 j pour 7 j — encore 4 j de traitement ») : le patient a peut-être encore ce médicament. Vérifiez avec lui ou avec le médecin.

### Remettre les médicaments

1. Cliquez sur **Pharmacie**, puis sur **En attente**. Seuls les patients dont la consultation est **terminée aujourd'hui** sont dans la liste, dans l'ordre où le médecin a terminé.
   - Pour trouver vite un patient, tapez une partie du nom, du numéro de dossier ou du médicament dans **Patient / N° dossier / Médicament**.
2. Cliquez sur le patient. Lisez l'encadré **Allergies** s'il y en a un.
3. Sous chaque médicament, choisissez :
   - **Interne** : le médicament est remis ici. Il sort du stock et le patient le paie à la caisse.
   - **Externe** : le patient l'achète dans une pharmacie extérieure. Il ne sort pas du stock et n'est pas facturé ici.
4. En haut à droite, **Médicaments (interne)** donne le prix des médicaments **Interne** : c'est ce que la caisse demandera.
5. Préparez les médicaments **Interne** et remettez-les au patient.
6. Cliquez sur **✓ Terminer délivrance**, puis sur **OK**. Le stock est déduit à ce moment-là.

### Imprimer l'ordonnance pour une pharmacie extérieure

1. Le patient choisi, cliquez sur **💊 Ordonnance ext.** La fenêtre **Ordonnance externe** s'ouvre.
2. Seuls les médicaments **Externe** apparaissent, avec sous chaque nom la façon de le prendre (exemple : « 1 cp × 3 fois/jour pendant 7 jours (total 21) »).
3. Si besoin, écrivez à gauche **Pharmacie (optionnel)** et **Conseils / Remarques**.
4. Cliquez sur **Émettre** : l'ordonnance reçoit un numéro et s'ajoute à **Historique**. Puis cliquez sur **🖨 Réimprimer** pour l'imprimer.
   - **🖨 Imprimer** imprime un brouillon sans numéro (**(BROUILLON)**). Pour le patient, utilisez toujours **Émettre**.
   - Erreur ? Ouvrez l'ordonnance dans **Historique** et cliquez sur **Annuler**. Elle reste enregistrée avec la mention **ANNULÉ**.
5. Cliquez sur **Fermer ✕**.

### Un patient n'est pas venu chercher ses médicaments hier

La liste **En attente** ne montre que les consultations d'aujourd'hui.

1. Cliquez sur **🔍 Trouver patient**, cherchez le nom ou le numéro de dossier, puis cliquez sur le patient.
2. Un encadré orange montre ses ordonnances en attente des **7 derniers jours**, avec « Prescrit il y a 2 j (date) ».
3. Remettez les médicaments comme d'habitude (**Interne** / **Externe**, puis **✓ Terminer délivrance**).
4. Une ordonnance de **plus de 7 jours** ne peut pas être remise ici. Renvoyez le patient chez le médecin pour une nouvelle ordonnance.
5. Fermez l'encadré orange avec **Fermer**.

### Voir ce qui a été remis aujourd'hui

Cliquez sur **Délivré**. Les patients servis aujourd'hui apparaissent, le plus récent en haut. Pour réimprimer une ordonnance extérieure, choisissez le patient ici, puis **💊 Ordonnance ext.**

### Entrée de médicaments, inventaire, rebut

1. En haut, cliquez sur **📦 Stock**. À gauche : la liste des médicaments et le stock actuel. Un nombre en **rouge** veut dire **au minimum ou en dessous** : pensez à commander.
2. Cliquez sur un médicament. À droite : **Stock actuel**, trois boutons, et en dessous **Registre du stock** (tous les mouvements).
3. Choisissez le bouton, écrivez le nombre, puis cliquez sur **Sauver** :

| Bouton | Quand | Nombre à écrire | **Note** |
|---|---|---|---|
| **Entrée** | des médicaments arrivent | **Quantité reçue** : le nombre reçu | facultative (fournisseur, équipe missionnaire…) |
| **Inventaire** | vous avez compté le rayon | **Quantité comptée en rayon** : le nombre compté, tel quel (sans ajouter ni retirer) | obligatoire (exemple : inventaire de fin de mois) |
| **Mise au rebut** | médicaments cassés, abîmés, périmés | **Quantité jetée** | obligatoire : le motif |

- Nombres entiers seulement. Pour l'inventaire, **0** est accepté (rayon vide).
- Même si le nombre compté est égal au registre, enregistrez l'**Inventaire** : il reste la trace du contrôle.
- Les sirops et autres produits au flacon se comptent en flacons (exemple : **59 flacons**).
- Les médicaments remis avec **✓ Terminer délivrance** sortent du stock tout seuls : ne les notez pas.

### Médicaments marqués ⚠ (liste importée)

Les médicaments de l'ancien logiciel de stock (codes **MED-…**) ont été importés avec la quantité de la liste du 15/05/2026 (première ligne du registre : **Ouverture** · **Importé (liste du 15/05/2026)**). Certains ont un point à vérifier sur place.

1. Dans **📦 Stock**, ouvrez la liste **Toutes catégories** et choisissez **⚠ Médicaments à vérifier**.
2. Cliquez sur un médicament. L'encadré **À vérifier sur place (liste importée)** dit quoi vérifier (exemple : « Quantité différente de la note d'origine — à compter »).
3. Comptez le rayon et enregistrez le nombre avec **Inventaire**.
4. Quand tous les points sont vus, cliquez sur **✓ Vérifié**, puis sur **OK**. Le **⚠** disparaît ; « Vérifié par … » reste affiché. Ce bouton ne change pas le stock.

<!-- terme à vérifier sur place : « Mise au rebut » / « Rebut » pour les médicaments jetés -->

### Rapport de fin de mois

1. Dans **📦 Stock**, cliquez sur **📊 Rapport mensuel de stock**.
2. Choisissez le **Mois**. Une ligne par médicament : **Stock début** · **Entrées** · **Délivré** · **Manque au registre** · **Ajust. inventaire** · **Rebut** · **Stock fin** · **Contrôle**.
3. Cliquez sur **⬇ CSV** pour ouvrir le rapport dans Excel.
4. **Contrôle** doit montrer **✓**. Sinon, prévenez l'administrateur.

## Si ce message apparaît

| Message | Ce que cela veut dire | Que faire |
|---|---|---|
| « Ce patient a déjà été servi par quelqu'un d'autre. Le stock n'a été déduit qu'une fois. La liste est actualisée. » | Un collègue a terminé ce patient juste avant vous. | Rien à corriger. Vérifiez seulement que les médicaments n'ont pas été remis deux fois. |
| « Ce patient n'est plus en attente. Quelqu'un l'a peut-être déjà servi… » (encadré jaune) | Le patient a été servi pendant que vous regardiez. | Cliquez sur **Rafraîchir** avant de remettre quoi que ce soit. |
| « Certains médicaments n'ont pas de quantité totale… » | Des lignes n'ont pas de **Qté** : elles ne sortiront pas du stock. | Demandez au médecin, puis **OK** ou **Annuler**. |
| « Le stock enregistré était inférieur à la quantité délivrée — vérifiez le stock réel » | L'ordinateur avait moins que ce qui a été remis. Le chiffre apparaît dans **Manque au registre**. | Comptez le rayon et faites un **Inventaire**. |
| « Ce médicament a déjà été délivré : interne/externe ne peut plus être changé… » | La ligne a déjà été remise. | Rien : la liste se met à jour. |
| « … de plus de 7 jours — impossible à délivrer ici… » | Ordonnance trop ancienne. | Renvoyez le patient chez le médecin. |
| « Impossible de jeter plus que le stock enregistré. Faites d'abord l'inventaire. » | Vous jetez plus que le registre n'en compte. | Faites d'abord l'**Inventaire**, puis le rebut. |
| « Veuillez écrire une note. » | **Inventaire** et **Mise au rebut** demandent une note. | Écrivez le motif, puis **Sauver**. |

## À ne pas faire

- Ne cliquez pas sur **✓ Terminer délivrance** avant d'avoir remis les médicaments : le stock est déduit à ce moment-là, et cela ne s'annule pas.
- N'écrivez pas une différence dans **Inventaire** : écrivez le nombre compté sur le rayon.
- Ne remettez pas une ordonnance de plus de 7 jours : le médecin doit represcrire.
- Ne mettez pas **Externe** sur un médicament que vous remettez vous-même : il ne serait ni déduit du stock ni payé.
- Ne cliquez pas sur **✓ Vérifié** sans avoir compté le rayon.

## Qui appeler

Appelez l'administrateur si :

- un médicament a été remis par erreur (**✓ Terminer délivrance** ne s'annule pas : il faut rendre les médicaments au rayon et faire un **Inventaire** avec une note) ;
- **Contrôle** du rapport de fin de mois ne montre pas **✓** ;
- un médicament manque dans la liste ou a un mauvais prix (ils se modifient dans **Paramètres**) ;
- vous ne voyez pas le menu **Pharmacie**.
