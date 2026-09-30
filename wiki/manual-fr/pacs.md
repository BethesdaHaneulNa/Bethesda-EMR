# Imagerie (PACS)

Ce guide sert au **manipulateur radio** (appareil de radiographie, échographe) et au **médecin**. Le médecin demande l'examen dans l'écran **Consultation** ; la demande arrive toute seule sur l'appareil (la « liste de travail ») ; le manipulateur choisit le patient dans cette liste, fait les images et les envoie ; le médecin regarde les images dans l'EMR et écrit le compte-rendu.

Les images ne sont pas gardées dans l'EMR mais sur le serveur d'images (le PACS). L'EMR les affiche dans la **Visionneuse** ; personne n'a besoin de mot de passe pour les voir.

<!-- à revoir : les noms de menus de chaque appareil (Worklist, MWL, Send, Store…) seront complétés le jour de l'installation des appareils -->

## En bref

Manipulateur radio :

1. Juste avant chaque patient, **rechargez la liste de travail** sur l'appareil.
2. Choisissez le patient dans la liste. Vérifiez le nom, le N° dossier (par exemple `26-00001`) et l'examen avec le patient devant vous.
3. Faites les images, puis envoyez-les au PACS.
4. Une à deux minutes après l'envoi, le patient sort tout seul de la liste.

Médecin :

1. Dans **Consultation**, sur la ligne d'imagerie, cliquez sur **🖼** (**Voir image**).
2. Regardez s'il y a un cadre rouge ou jaune au-dessus de l'image. S'il y en a un, lisez « Si ce message apparaît » avant d'écrire.
3. Écrivez le compte-rendu dans **Saisir le compte-rendu radiologique...**, puis cliquez sur **💾 Enregistrer**.
4. Cliquez sur **Fermer ✕**.

## Pas à pas

### 1. Médecin — demander un examen d'imagerie

1. Dans **Consultation**, ouvrez le patient (**☰ File d'Attente** ou **🔍 Trouver patient**).
2. Dans **Saisir médicament, code examen ou nom...**, tapez le nom de l'examen (par exemple `Chest`), puis Entrée. La liste montre l'appareil (`CR`, `US`…) et **WL** : l'examen part vers l'appareil.
3. La colonne de droite de la ligne montre **Envoyé** (l'appareil a reçu la demande), puis **Réalisé** quand toutes les images sont arrivées.
   <!-- à revoir : juste après l'ajout, « Envoyé » n'apparaît qu'en rouvrant le patient (test du 2026-09-30, session consultation) -->
4. L'examen n'apparaît sur l'appareil **que le jour où il est demandé**. Un examen demandé hier et fait aujourd'hui doit être demandé de nouveau aujourd'hui.

### 2. Manipulateur — faire les images

1. Sur l'appareil, ouvrez la **liste de travail** (Worklist / MWL). Elle montre les patients qui ont un examen demandé aujourd'hui.
2. **Rechargez la liste juste avant chaque patient.** Une liste chargée plus tôt peut encore montrer un examen retiré ou annulé entre-temps par le médecin. Des images faites sur un tel examen ne s'affichent pas correctement chez le médecin.
3. **Choisissez le bon patient.** Comparez le nom, le N° dossier et l'examen avec le patient devant vous. **C'est l'étape la plus importante** : si vous choisissez un autre patient, les images vont dans son dossier et l'EMR ne peut pas s'en apercevoir.
4. Faites les images, puis **envoyez-les** au PACS (Send / Store).
5. Une à deux minutes après l'envoi, le patient sort tout seul de la liste. Ainsi on ne choisit pas par erreur un patient déjà fait.

### 3. Manipulateur — le patient n'est pas dans la liste

1. **Ne tapez pas le nom du patient à la main sur l'appareil.** Des images saisies à la main ne sont reliées à aucune demande : le médecin ne les voit pas dans **Consultation**.
2. Demandez au médecin s'il a bien demandé l'examen **aujourd'hui**.
3. S'il vient de le demander, attendez 15 secondes, puis rechargez la liste.
4. Si la liste est **entièrement vide** (aucun patient), le PACS n'est pas relié : prévenez l'administrateur.

### 4. Médecin — voir les images et écrire le compte-rendu

1. Sur la ligne d'imagerie, cliquez sur **🖼** (**Voir image**). La **Visionneuse** s'ouvre : les images à gauche, le **Compte-rendu** à droite. En haut : le N° dossier et le nom du patient de l'EMR.
2. Les petites images à gauche sont les séries. Cliquez sur une série pour l'afficher au milieu. La première s'affiche toute seule.
3. Pour voir plus grand : **Ouvrir dans un onglet ↗**.
4. Écrivez dans **Saisir le compte-rendu radiologique...**, puis cliquez sur **💾 Enregistrer**. Au-dessus apparaît **Lu par** : votre nom et la date.
5. Cliquez sur **Fermer ✕**.

Attention : un clic sur la zone sombre **autour** de la fenêtre la ferme, et un compte-rendu non enregistré est perdu. Enregistrez d'abord.

Corriger un compte-rendu remplace l'ancien texte (l'ancien n'est pas gardé).

La fenêtre montre seulement les images de la demande ouverte. Après 30 minutes, elle affiche **La session d'affichage a expiré** : fermez-la et cliquez de nouveau sur **🖼**.

### 5. « Not for diagnostic usage » : qu'est-ce que c'est ?

En haut à gauche des images, une phrase rouge en anglais dit : *For patients, researchers and quality assurance. Not for diagnostic usage.*

- C'est le programme d'affichage (Stone, livré avec le PACS) qui l'écrit **toujours**. Ce n'est pas une panne et ce n'est pas un problème de l'image.
- Il veut dire que ce programme n'est pas une station de diagnostic certifiée (écran médical étalonné, outils de mesure certifiés).
- Les images sont les vraies images de l'appareil. Si un détail est difficile à voir (écran trop petit ou trop clair), regardez aussi sur l'appareil ou sur un meilleur écran avant de conclure.

<!-- terme à vérifier sur place : « station de diagnostic », « manipulateur radio » -->

### 6. Tous les examens d'imagerie du patient

1. Dans la barre bleue de **Consultation**, cliquez sur **Compte-rendu**.
2. La liste montre tous les examens d'imagerie du patient, le plus récent en haut : date, appareil (`US`, `CR`…), nom de l'examen, compte-rendu.
3. À côté du nom de l'examen :
   - **N image(s) reçue(s)** (vert) : toutes les images sont arrivées.
   - **Images en attente** (gris) : pas encore arrivées.
   - rien : l'examen ne part pas vers les appareils.
4. **Voir image** ouvre la **Visionneuse**.
5. La liste ne se met pas à jour toute seule : fermez-la et rouvrez-la pour voir si les images sont arrivées.

La caisse (**Paiement**) voit la même liste en lecture seule, sans images.

### 7. Un examen d'imagerie annulé

Un examen qui a déjà des images ou un compte-rendu ne peut pas être retiré ; on le **marque comme annulé** :

1. Dans **Consultation**, cliquez sur le ✕ rouge de la ligne (au survol : **A un résultat - cliquer pour le marquer comme annulé**).
2. Le message demande **Le marquer comme annulé ?** Écrivez le motif (facultatif), puis **OK**. **Annuler** ne change rien.
3. La ligne devient grise et barrée : **Annulé**. Elle sort de la facture. Si l'image n'était pas encore faite, le patient sort de la liste de l'appareil en 15 secondes.
4. Les images et le compte-rendu restent au dossier. Dans la **Visionneuse**, la ligne **⊘ Images d'une demande annulée** apparaît ; on peut regarder, mais pas enregistrer de nouveau compte-rendu.
5. L'annulation est définitive. En cas d'erreur, demandez l'examen de nouveau.
6. Si l'examen était déjà payé, la caisse fait le remboursement.

## Si ce message apparaît

| Message à l'écran | Ce que cela veut dire | Que faire |
|---|---|---|
| **Images en attente** | Les images ne sont pas encore arrivées au PACS. | Moins de 2 minutes après l'envoi : attendez, puis fermez et rouvrez la liste. Plus longtemps : demandez au manipulateur s'il a envoyé et s'il a choisi le patient **dans la liste**. Sinon, prévenez l'administrateur. |
| Cadre rouge : **Les images sont au nom de « … », qui ne correspond pas au numéro de dossier de ce patient.** | Le N° patient dans les images n'est pas celui de ce dossier. Ce sont peut-être les images d'un autre patient. | **N'écrivez pas encore le compte-rendu.** Ouvrez l'image et lisez le nom et le numéro écrits dessus. Demandez au manipulateur qui a été radiographié. Si c'est bien ce patient (numéro mal tapé), écrivez le compte-rendu et notez-le en une ligne. Si c'est un autre patient : marquez l'examen comme annulé (motif : « images d'un autre patient »), redemandez l'examen, et prévenez l'administrateur. |
| Cadre jaune : **Les images ne portent aucun numéro de patient.** | Le patient a été tapé à la main sur l'appareil. | Même chose que le cadre rouge : vérifiez l'identité dans l'image avant d'écrire. |
| **L'appareil a donné son propre numéro d'étude à ces images ; elles ont été liées à cette demande par le numéro d'accession.** | Les images ont été retrouvées par un autre numéro. En général c'est correct. | Vérifiez le nom dans l'image, puis écrivez normalement. |
| **Cette demande d'imagerie n'a pas été envoyée à la liste de travail des appareils : aucune image n'y est liée.** | Cet examen ne part pas vers les appareils. | Le compte-rendu peut être écrit. Si des images étaient attendues, prévenez l'administrateur (réglage de l'examen). |
| **Images d'une demande annulée.** | L'examen a été annulé. | Regardez les images si besoin ; pas de nouveau compte-rendu. |
| **Cet examen d'imagerie a été annulé en consultation : le compte-rendu ne peut pas être enregistré.** | Quelqu'un a annulé l'examen pendant que vous écriviez. | Copiez votre texte si vous en avez besoin, et parlez-en au médecin qui a annulé. |
| **La session d'affichage a expiré : fermez cette fenêtre et rouvrez l'image.** | La fenêtre est ouverte depuis plus de 30 minutes. | **Fermer ✕**, puis **🖼** de nouveau. |
| **Le serveur d'images n'est pas encore relié à ce dossier : l'administrateur doit lancer pair-with-emr.ps1 dans le dossier du PACS.** | L'EMR et le PACS ne sont pas (ou plus) reliés, par exemple après une restauration. | Prévenez l'administrateur. Le compte-rendu peut quand même être écrit. |
| **Le serveur d'images ne répond pas. Prévenez l'administrateur.** | Le PACS est arrêté ou bloqué. | Prévenez l'administrateur. |
| **Cette image n'a pas été ouverte depuis une demande d'imagerie. Ouvrez-la avec le bouton 🖼 dans l'écran Consultation.** | L'adresse a été copiée, ou l'onglet est ancien (après plusieurs examens ouverts). | Fermez l'onglet, puis cliquez sur **🖼** dans **Consultation**. |
| **Ce compte ne peut plus ouvrir les images (compte désactivé ou sans accès à la consultation). Prévenez l'administrateur.** | Le compte a été désactivé ou n'a plus l'accès **Consultation**. | Prévenez l'administrateur. |
| Les petites images sont à gauche, mais le milieu reste noir | Problème d'affichage. | Changez une fois la taille de la fenêtre du navigateur, ou cliquez sur **Ouvrir dans un onglet ↗**. Si c'est toujours noir, prévenez l'administrateur. |
| Une fenêtre demande un **nom d'utilisateur et un mot de passe** | Ce n'est pas normal. | Ne tapez rien. Prévenez l'administrateur. |

## À ne pas faire

- Ne tapez jamais le nom d'un patient à la main sur l'appareil : choisissez-le dans la liste de travail.
- N'utilisez pas une liste de travail chargée plus tôt : rechargez-la avant chaque patient.
- N'écrivez pas de compte-rendu tant qu'un cadre rouge ou jaune n'a pas été vérifié.
- Ne cliquez pas autour de la **Visionneuse** avant d'avoir enregistré le compte-rendu.
- L'absence de cadre rouge ne prouve pas que ce sont les bonnes images : si le manipulateur a choisi un autre patient dans la liste, rien ne s'affiche. Si l'image ne ressemble pas au patient, vérifiez.
- Ne débranchez pas le disque de sauvegarde du serveur, ne le prêtez pas et ne l'utilisez pas pour autre chose : il contient, sans chiffrement, les images des patients **et la copie de tout le dossier EMR**. Il doit rester rangé sous clé.

## Qui appeler

Prévenez l'**administrateur** si :

- la liste de travail de l'appareil est entièrement vide ;
- les images restent **Images en attente** alors que le manipulateur les a envoyées ;
- des images appartiennent à un autre patient (on ne peut pas encore les déplacer vers le bon dossier) ;
- la **Visionneuse** affiche **Le serveur d'images n'est pas encore relié…** ou **Le serveur d'images ne répond pas** ;
- une fenêtre demande un mot de passe ;
- l'écran d'état signale un problème de sauvegarde des images.

Pour l'administrateur : dans **Paramètres → Flux d'ordres**, le champ **Adresse du serveur d'images vue de l'intérieur du PC serveur (ne pas modifier)** reste `http://host.docker.internal:9090` (bouton **Par défaut**). Ce n'est pas l'adresse du PC sur le réseau. Le bouton **Tester le serveur d'images (EMR → 9090)** doit répondre **L'EMR atteint le serveur d'images.**
