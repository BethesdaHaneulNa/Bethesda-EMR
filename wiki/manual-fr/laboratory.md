# Laboratoire

L'écran **Laboratoire** sert à saisir les résultats des analyses demandées par le médecin (NFS, glycémie, test rapide du paludisme…). Il est utilisé par l'infirmier ou l'infirmière, qui passe aussi par l'écran **Pharmacie** : un compte infirmier ouvre **Enregistrement**, **Pharmacie** et **Laboratoire**.

<!-- terme à vérifier sur place : « NFS » pour CBC, « test rapide du paludisme » pour Malaria RDT -->

## En bref

1. En haut, cliquez sur **Laboratoire**.
2. À gauche, vérifiez que **En attente** est sélectionné. Le chiffre indique le nombre de patients qui attendent un résultat.
3. Cliquez sur le nom du patient (exemple : **RAKOTO Jean**).
4. Au centre, saisissez chaque résultat dans la colonne **Valeur**.
5. En bas, cliquez sur **✓ Enregistrer · Terminer**.
6. Le patient passe dans **Terminé**. Passez au patient suivant.

La liste se met à jour toute seule toutes les 30 secondes. Pour la voir tout de suite, cliquez sur **↻**.

## Pas à pas

### Saisir les résultats du jour

1. Cliquez sur **Laboratoire**, puis sur **En attente**.
   - Un patient apparaît dès que le médecin a demandé l'analyse, même si la consultation n'est pas finie. Dans ce cas, **En consultation** est écrit en jaune à côté de son nom. Vous pouvez quand même saisir et enregistrer.
   - Seuls les patients venus **aujourd'hui** sont dans cette liste. Pour un jour précédent, voir « Ouvrir une analyse d'un autre jour ».
2. Cliquez sur le nom du patient. Au centre, les analyses demandées apparaissent en boutons (exemple : **CBC**, **Malaria RDT**).
   - S'il y a plusieurs analyses, le bouton **Tout** est déjà choisi : toutes les lignes sont affichées ensemble.
   - Pour une seule analyse, cliquez sur son bouton. Une analyse déjà enregistrée porte un **✓**.
   - Une ligne rouge **⚠** sous le nom indique une allergie du patient.
3. Pour chaque ligne, écrivez le résultat dans **Valeur**. Si besoin, ajoutez un commentaire dans **Note**.
4. Cliquez sur **✓ Enregistrer · Terminer** (avec **Tout**, le bouton affiche **✓ Enregistrer · Terminer (Tout)**).
5. Lisez le message en vert à côté du bouton :
   - **Enregistré et terminé: CBC** — l'analyse est terminée.
   - **Rien de saisi, reste en attente: Malaria RDT** — rien n'a été écrit pour cette analyse ; elle reste dans **En attente**. Revenez sur le patient quand le résultat est prêt.
6. Quand toutes les analyses du patient sont enregistrées, le centre affiche **Sélectionnez un patient à gauche**.

### Écrire les chiffres

- La virgule et le point sont acceptés : **12,5** et **12.5** donnent le même résultat.
- Les milliers avec un espace sont acceptés : **12 000**.
- Vous pouvez écrire **<5** ou **>500**. La couleur n'apparaît que si la conclusion est certaine.
- La couleur change pendant que vous écrivez :
  - **bleu** = en dessous de la **Référence** (bas) ;
  - **rouge** = au-dessus de la **Référence** (haut).

### Écrire un résultat en texte

- Pour les tests dont la référence est un mot (exemple : **Negative** pour le paludisme ou la bandelette urinaire), écrivez le résultat en toutes lettres : **Positive**, **Négatif**, **Trace**, **1+**…
- **Négatif**, **Neg**, **-** sont compris comme **Negative** (normal).
- Tout autre mot (**Positive**, **Trace**, **1+**…) s'affiche en **rouge** : résultat anormal. <!-- à revoir : « Trace » pourra devenir normal après avis du médecin -->

### Corriger un résultat déjà enregistré

1. Cliquez sur **Terminé**. Les patients dont vous avez enregistré un résultat aujourd'hui apparaissent.
2. Cliquez sur le patient, corrigez la valeur, puis cliquez sur **✓ Enregistrer · Terminer**.
3. L'écran garde seulement la nouvelle valeur. La correction est notée dans le **Journal**, que seul l'administrateur peut lire. Une première saisie n'est pas notée.

### Ouvrir une analyse d'un autre jour

1. Cliquez sur **🔍 Trouver patient**.
2. Tapez le nom ou le numéro de dossier (exemple : **26-00001**) dans **Nom / n° dossier**, puis cliquez sur **Rechercher**.
3. Cliquez sur le patient. La fenêtre **Sélection visite** montre ses visites par date. Cliquez sur la bonne date.
4. Saisissez et enregistrez comme d'habitude. Le résultat apparaît aujourd'hui dans **Terminé**.

### Lire le tableau des résultats (à droite)

Le tableau **Résultats labo** montre tous les résultats du patient, une colonne par date.

- **▲** en rouge : haut. **▼** en bleu : bas. **!** en rouge : résultat en texte anormal (exemple : **! Positive**).
- **Analyse refaite le même jour** : la date apparaît deux fois, **(1)** et **(2)**, avec l'heure de saisie sous chaque valeur.
- **Analyse annulée par le médecin** : la valeur est **grise et barrée**, sans couleur, dans une colonne à la fin marquée **✕** (exemple : **2026-09-29 ✕**). Passez la souris dessus pour lire **Annulé** et la raison. Une analyse annulée ne revient pas dans les listes et ne peut plus recevoir de résultat.
- Passez la souris sur une valeur pour voir la **Référence** utilisée pour ce résultat. Sous la référence, un petit texte comme **F · ≥18y** ou **6–24m** indique la référence choisie selon le sexe et l'âge du patient.
- **📋 Dossier (vue)** ouvre le dossier du patient en lecture seule.

## Si ce message apparaît

| Message à l'écran | Ce que cela veut dire | Que faire |
|---|---|---|
| **Aucune analyse en attente de résultat** | Personne n'attend de résultat aujourd'hui. | Rien. Attendez ou cliquez sur **↻**. |
| **Rien n'a été saisi. Saisissez au moins une valeur ou une note.** | Vous avez cliqué sur Enregistrer sans rien écrire. | Écrivez au moins un résultat, puis enregistrez. |
| **La demande de cet examen a été supprimée en consultation. La liste est rechargée.** | Le médecin a supprimé cette analyse pendant que vous la saisissiez. | Rien à refaire. Les autres analyses du patient sont bien enregistrées. |
| **Cet examen a été annulé en consultation. La liste est rechargée.** | Le médecin a annulé cette analyse (résultat déjà présent). | Rien à refaire. Si vous pensez que c'est une erreur, parlez au médecin. |
| **Aucun item défini pour cette analyse : saisie sur une seule ligne (…)** | Cette analyse n'a pas encore de lignes détaillées. | Écrivez le résultat sur la seule ligne. Prévenez l'administrateur pour qu'il crée les lignes. |
| **Aucune analyse pour cette visite.** | La visite choisie n'a pas d'analyse (ou elle a été annulée). | Vérifiez la date dans **Sélection visite**. |
| **Impossible d'ouvrir les examens de cette visite. Réessayez dans un instant.** | Le serveur n'a pas répondu. | Attendez un peu et réessayez. Si cela continue, appelez l'administrateur. |
| **Ces items ont déjà des résultats** (écran **Paramètres → Items de test**, administrateur seulement) | On essaie de changer l'**Unité** d'une ligne qui a déjà des résultats : les anciens chiffres s'afficheraient avec la nouvelle unité. | Cliquez sur **Annuler**. Suivez la méthode sûre écrite dans la fenêtre : nouvelle ligne avec un nom différent, puis supprimer l'ancienne avec **✕**. |

## À ne pas faire

- Ne changez pas d'écran (par exemple vers **Pharmacie**) avant d'avoir cliqué sur **✓ Enregistrer · Terminer** : ce qui n'est pas enregistré est perdu. La liste **En attente**, elle, reste.
- N'écrivez pas un résultat dans une autre unité que celle de la colonne **Unité**.
- N'enregistrez pas une analyse « pour la vider » : une analyse enregistrée est considérée comme **terminée**.
- N'écrivez pas le résultat d'un patient sur la fiche d'un autre : vérifiez le nom et le numéro de dossier en haut du centre avant d'enregistrer.
- Ne changez pas les valeurs de référence vous-même : elles sont décidées par le médecin et saisies par l'administrateur.

## Qui appeler

Appelez l'**administrateur** :

- si un message d'erreur revient plusieurs fois ;
- s'il manque une analyse ou une ligne (exemple : un nouveau test sans lignes) ;
- si une référence ou une unité vous paraît fausse ;
- si un résultat a été enregistré sur le mauvais patient (le médecin peut annuler l'analyse ; la correction est notée).
