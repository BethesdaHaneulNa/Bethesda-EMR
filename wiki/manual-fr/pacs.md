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
3. Pour voir plus grand : **Ouvrir dans un onglet ↗**. Pour comparer avec un examen d'une autre date : voir 8.
4. Écrivez dans **Saisir le compte-rendu radiologique...**, puis cliquez sur **💾 Enregistrer**. Au-dessus apparaît **Lu par** : votre nom et la date.
5. Cliquez sur **Fermer ✕**.

Attention : un clic sur la zone sombre **autour** de la fenêtre la ferme, et un compte-rendu non enregistré est perdu. Enregistrez d'abord.

Corriger un compte-rendu remplace l'ancien texte (l'ancien n'est pas gardé).

La fenêtre s'ouvre sur les images de la demande ouverte ; les autres examens du même patient ne viennent que si vous demandez une comparaison (8). Jamais les images d'un autre patient. Après 30 minutes, elle affiche **La session d'affichage a expiré** : fermez-la et cliquez de nouveau sur **🖼**.

### 5. « Not for diagnostic usage » : qu'est-ce que c'est ?

En haut à gauche des images, une phrase rouge en anglais dit : *For patients, researchers and quality assurance. Not for diagnostic usage.*

- C'est le programme d'affichage (Stone, livré avec le PACS) qui l'écrit **toujours**. Ce n'est pas une panne et ce n'est pas un problème de l'image.
- Il veut dire que ce programme n'est pas une station de diagnostic certifiée (écran médical étalonné, outils de mesure certifiés).
- Les images sont les vraies images de l'appareil. Si un détail est difficile à voir (écran trop petit ou trop clair), regardez aussi sur l'appareil ou sur un meilleur écran avant de conclure.

<!-- terme à vérifier sur place : « station de diagnostic », « manipulateur radio » -->

### 6. Tous les examens d'imagerie du patient

1. Dans la barre bleue de **Consultation**, cliquez sur **🩻 Imagerie**. (Ne pas confondre : **Imagerie** ouvre la liste des examens du patient ; **Compte-rendu** est la case où le médecin écrit, à droite des images.)
2. **À gauche, la liste** : une ligne par examen, le plus récent en haut — **Date**, **Type** (`CR`, `US`, `ES`…), **Examen**, **Images**, **Compte-rendu**. Les endoscopies (gastroscopie, coloscopie, rectoscopie — tout acte qui a un type d'appareil dans **Paramètres → Codes d'actes**) y sont aussi, même si elles sont facturées comme un acte.
   - **Images** : **N image(s)** (vert) = arrivées ; **en attente** = pas encore arrivées ; **—** = l'examen ne part pas vers les appareils.
   - **Compte-rendu** : **✓** et le nom du médecin = écrit ; **pas encore** = pas de compte-rendu.
   - **Annulé** (nom barré, gris) : examen annulé. **⚠ identité à vérifier** (rouge ou jaune) : les images portent un autre numéro de patient, ou aucun.
3. **À droite, l'examen choisi** : cliquez sur une ligne (ou les flèches **↑ ↓** du clavier). Le plus récent est choisi à l'ouverture. On y lit : la date de la demande, le service et le médecin qui a demandé, les images (nombre, date et heure d'arrivée), le N° d'accession, **Lu par** (médecin, date et heure) et le **compte-rendu en entier**. Un compte-rendu long défile dans sa case. Pour un examen annulé : le motif. Pour un avertissement d'identité : le message complet.
4. **🖼 Voir image** (à droite, en haut) ouvre la **Visionneuse** par-dessus la liste. Quand vous fermez l'image, la liste est toujours là, sur le même examen ; le compte-rendu que vous venez d'enregistrer y apparaît.
5. Beaucoup d'examens : au-dessus de la liste, le menu **Type : tous** (cliquez dessus et choisissez `CR`, `US`…) ne montre qu'un type d'appareil, et la case **Chercher : nom ou date…** ne garde que les examens dont le nom ou la date contient ce que vous écrivez (par exemple `chest` ou `2026-09`). Le nombre à droite indique combien de lignes sont affichées.
6. Les cases à cocher à gauche des lignes et, juste au-dessus, les boutons **⇆ Comparer (N)**, **🖨 Imprimer (N)** et **Tout décocher** : voir 8 et 9. Ils sont gris tant que rien n'est coché.
7. La liste se relit chaque fois que vous fermez une image. Sinon elle ne se met pas à jour toute seule : fermez-la et rouvrez-la pour voir si les images sont arrivées.

On n'écrit pas le compte-rendu dans cette fenêtre : il s'écrit dans la **Visionneuse** (4).

La caisse (**Paiement**) a le même bouton **🩻 Imagerie** : la même liste et les mêmes comptes-rendus, en lecture seule — sans images, sans cases à cocher.

### 7. Un examen d'imagerie annulé

Un examen qui a déjà des images ou un compte-rendu ne peut pas être retiré ; on le **marque comme annulé** :

1. Dans **Consultation**, cliquez sur le ✕ rouge de la ligne (au survol : **A un résultat - cliquer pour le marquer comme annulé**).
2. Le message demande **Le marquer comme annulé ?** Écrivez le motif (facultatif), puis **OK**. **Annuler** ne change rien.
3. La ligne devient grise et barrée : **Annulé**. Elle sort de la facture. Si l'image n'était pas encore faite, le patient sort de la liste de l'appareil en 15 secondes.
4. Les images et le compte-rendu restent au dossier. Dans la **Visionneuse**, la ligne **⊘ Images d'une demande annulée** apparaît ; on peut regarder, mais pas enregistrer de nouveau compte-rendu.
5. L'annulation est définitive. En cas d'erreur, demandez l'examen de nouveau.
6. Si l'examen était déjà payé, la caisse fait le remboursement.

### 8. Médecin — comparer avec un examen précédent

Deux radios du thorax à deux dates : on peut les mettre côte à côte.

1. Ouvrez l'examen le plus récent (**🖼** ou **Voir image**). Il s'ouvre seul, comme d'habitude.
2. Si le patient a d'autres examens d'imagerie, une ligne apparaît sous le titre de la fenêtre : le bouton violet **⇆ Comparer avec les examens précédents (N)**. À côté, **Même examen : … (date)** quand le même examen existe à une autre date.
3. Cliquez sur le bouton. Le **Compte-rendu** se replie pour laisser la place aux images, et **tous les examens du patient** sont maintenant dans la liste de gauche de la visionneuse, chacun avec sa date. L'examen ouvert reste affiché.
4. La première fois : en haut des images, cliquez sur le bouton **▦** (la grille, tout à gauche des outils) et choisissez **deux cases côte à côte**. La visionneuse s'en souvient : les fois suivantes, la fenêtre s'ouvre déjà en deux cases.
5. Faites glisser un examen de la liste de gauche vers une case (la case vide affiche **[ drop a series here ]**). Le nom et la date de l'examen sont écrits en haut à droite de chaque image.
6. Sous le titre, **Le compte-rendu est celui de : … (date)** rappelle pour quel examen vous écrivez : toujours l'examen ouvert, même si vous regardez un autre examen.
7. **✕ Fin de la comparaison** : retour à l'examen seul, et le **Compte-rendu** revient.
8. Pour comparer en grand : **Ouvrir dans un onglet ↗** pendant la comparaison ; le nouvel onglet contient les mêmes examens.

**Choisir soi-même les examens à comparer** (depuis la liste **🩻 Imagerie**) :

1. Dans la liste des examens du patient, cochez la case à gauche de chaque examen à comparer (deux ou plus, 9 au plus).
2. Juste au-dessus des cases, cliquez sur **⇆ Comparer (N)** (il s'allume quand deux examens au moins sont cochés). La visionneuse s'ouvre avec ces examens seulement, le **Compte-rendu** replié.
3. Le titre de la fenêtre et le **Compte-rendu** sont ceux de l'examen **le plus récent** parmi ceux cochés ; il s'affiche en premier. La ligne **Le compte-rendu est celui de : …** le rappelle.
4. Coupez l'écran et faites glisser les examens comme ci-dessus (4 et 5).
5. **Fermer ✕** : vous revenez à la liste, les cases restent cochées — décochez-en une, cochez-en une autre, et comparez de nouveau. Les cases s'effacent quand vous fermez la liste.

Une case grisée ne peut pas être cochée ; laissez la souris dessus pour lire pourquoi : examen annulé, images pas encore arrivées, ou avertissement d'identité sur les images.

- **Masquer le compte-rendu / Afficher le compte-rendu** (en haut de la fenêtre) : replie ou montre la case du compte-rendu. Le texte déjà écrit n'est pas perdu.
- Pas de ligne sous le titre : ce patient n'a pas d'autre examen avec images.
- Dans la liste de gauche de la visionneuse, les examens ne sont **pas rangés par date**. Regardez la date écrite sous le nom de chaque examen (et en haut à droite de chaque image).
- Ne sont pas proposés : les examens annulés, ceux dont les images ne sont pas arrivées, et ceux qui portent un avertissement d'identité (rouge ou jaune). Ceux-là s'ouvrent seulement depuis leur propre ligne. Au plus 9 autres examens, les plus récents.
- Une fenêtre qui s'ouvre coupée en deux avec une case vide **[ drop a series here ]** : c'est la disposition gardée par la visionneuse. Pour revenir à une seule image : bouton **▦** → une seule case.

### 9. Imprimer un compte-rendu pour un autre hôpital

Quand un patient est adressé ailleurs, le compte-rendu part avec les images : une feuille A4 par examen.

1. Ouvrez **🩻 Imagerie** (Consultation ou Paiement) et choisissez l'examen dans la liste.
2. À droite, cliquez sur **🖨 Imprimer**. La feuille s'affiche : en haut le titre et la date de l'examen, le patient (nom, N° dossier, sexe et âge, date de naissance), le nom de l'examen, le compte-rendu en entier ; en bas le nom de la clinique, le médecin qui a lu et la place pour signer.
3. **Langue de la feuille** : **FR**, **EN** ou **KO**, en haut de la fenêtre. La feuille est en français au départ, quelle que soit la langue de l'écran. Le compte-rendu lui-même reste tel que le médecin l'a écrit.
4. Cliquez sur **🖨 Émettre et imprimer**. L'impression est notée dans le dossier comme un document émis (historique de **Documents**, journal des modifications), comme les autres documents remis au patient. La feuille porte la date et l'heure d'émission, en bas à droite ; le numéro du document n'est pas imprimé — il reste dans l'EMR et s'affiche dans la fenêtre (**Émis : D26-…**).
5. **Imprimer de nouveau** réimprime la même feuille sans l'émettre une seconde fois. Si vous changez de langue, une nouvelle feuille est émise.
6. Plusieurs examens d'un coup (en Consultation) : cochez-les dans la liste, puis **🖨 Imprimer (N)** juste au-dessus des cases. Une feuille par examen. Un examen coché qui n'a pas de compte-rendu est laissé de côté. **Tout décocher** efface les coches.

- **🖨 Imprimer** est grisé : l'examen n'a pas de compte-rendu, ou il est annulé (laissez la souris sur le bouton pour lire pourquoi).
- Un compte-rendu long continue sur la page suivante ; le nom du patient, le N° dossier et l'examen sont rappelés en haut de chaque page, et le numéro de page est en bas.
- Un nom long n'est jamais coupé : il est écrit plus petit et sur plusieurs lignes, et la case s'agrandit s'il le faut. De même pour un long nom d'examen, de clinique ou de médecin.
- Les images ne sont pas sur la feuille : elles sont remises à part.
- Dans la fenêtre d'impression du navigateur, décochez **En-têtes et pieds de page** : sinon la date et l'adresse du site s'impriment aussi.
- Le nom, l'adresse et le téléphone de la clinique viennent de **Paramètres**. S'ils sont vides, la feuille s'imprime sans eux.

### 10. Les images sont sous la mauvaise demande

Sur l'appareil, le manipulateur a choisi une autre ligne du même patient : par exemple **Carotid US** au lieu de **Upper Abdomen US**. Les images de l'abdomen sont alors rangées sous « Carotid US », dans l'EMR et sur le serveur d'images. Rien ne le signale : le patient est le bon. C'est le médecin qui le voit en ouvrant les images.

Qui peut corriger : les médecins (écran **Consultation**) et l'administrateur. La correction est toujours notée dans le journal des modifications (qui, quand, quelles demandes) ; le motif est facultatif.

1. Ouvrez **🩻 Imagerie** et choisissez l'examen dont les images ne sont pas les bonnes.
2. À droite, sur la ligne **Images**, cliquez sur **⇄ Corriger la demande…**.
3. Regardez d'abord les images (**🖼 Voir image**) pour être sûr de ce qui a été fait.
4. Sous **Ces images sont en réalité celles de :**, cochez la bonne demande. Seules les demandes du même patient et du même type d'appareil peuvent être choisies ; pour les autres, la raison est écrite sur la ligne.
   - **→ déplacer ici** : la bonne demande n'a pas encore d'images. Les images y passent, et la demande qu'elles quittent redevient **en attente** : elle réapparaît sur la liste de l'appareil, pour être faite.
   - **⇄ échanger avec celle-ci** : les deux examens ont été faits, chacun sous la ligne de l'autre. Les deux demandes échangent leurs images.
5. Écrivez le **Motif** si vous le souhaitez (facultatif), lisez la phrase qui dit ce qui va se passer, puis cliquez sur **⇄ Déplacer les images** (ou **⇄ Échanger les images**). Ne fermez pas la fenêtre pendant **Correction en cours…** — quelques secondes.
6. **C'est fait** : la liste se met à jour. Le compte-rendu suit les images. Sur les deux demandes, une ligne rappelle la correction (qui, quand, et le motif s'il a été écrit) ; elle est aussi dans **Paramètres → Journal**.

À savoir :

- Le numéro et le nom de l'examen sont corrigés **dans les images elles-mêmes**, sur le serveur d'images : si elles sont envoyées à un autre hôpital, elles portent le bon nom. Les images ne sont pas modifiées.
- **Vous vous êtes trompé de demande ?** Refaites la même chose dans l'autre sens. Attendez une minute entre deux corrections des mêmes images (**Les images sont encore en cours d'arrivée…**).
- Si la bonne demande **a déjà son propre compte-rendu** et que l'examen à corriger en a un aussi, la ligne ne peut pas être cochée : effacez d'abord le compte-rendu écrit sans images, puis recommencez.
- Si le compte-rendu a déjà été **imprimé** pour un autre hôpital, un avertissement donne son numéro : la feuille déjà remise ne change pas ; réimprimez-la après la correction.
- **La correction est enregistrée. Le serveur d'images termine le rangement tout seul** : la correction est faite ; le serveur d'images était occupé ou arrêté, et le reste se fait sans vous dans les minutes qui suivent.
- Ce que cette fenêtre ne fait pas : un seul examen qui contient les images de deux examens (les deux parties faites à la suite sous la même ligne), et des images faites sous la ligne d'un **autre patient**. Dans ces deux cas, notez-le dans le compte-rendu et appelez (voir **Qui appeler**).


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
| **Les images de cette demande ne sont pas encore arrivées. Elles apparaîtront ici quand l'examen aura été fait et envoyé par l'appareil…** | Vous avez ouvert une demande dont les images ne sont pas encore au PACS (dans la liste : **Images en attente**). | Fermez la fenêtre et rouvrez-la plus tard. Vous pouvez déjà écrire le compte-rendu à droite. Si le manipulateur dit avoir envoyé depuis plus de 2 minutes, voir la ligne **Images en attente** ci-dessus. |
| **Les images de cette demande sont en cours de correction (déplacement vers une autre demande)…** | Quelqu'un vient de corriger la demande de ces images (voir 10) et le serveur d'images n'a pas fini. | Fermez la fenêtre et rouvrez-la dans quelques minutes. Si le message reste plus d'un quart d'heure, prévenez l'administrateur. |
| **L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas. Prévenez l'administrateur…** | Les images étaient arrivées, mais elles ne sont plus sur le serveur d'images (PACS réinstallé, sauvegarde des images pas encore restaurée), ou l'examen vient d'être modifié dans Orthanc (voir **À ne pas faire**). | Fermez, attendez une minute et rouvrez une fois. Si le message reste, prévenez l'administrateur : il doit restaurer les images depuis la sauvegarde. |
| **Cette demande n'a reçu que des données sans image (…) — par exemple un rapport ou des mesures envoyés par l'appareil.** | L'appareil a envoyé des données, mais aucune image (rapport, mesures). C'est normal pour certains appareils. | Écrivez le compte-rendu à droite comme d'habitude. Pour voir les images, regardez sur l'appareil. |
| **Ce compte ne peut plus ouvrir les images (compte désactivé ou sans accès à la consultation). Prévenez l'administrateur.** | Le compte a été désactivé ou n'a plus l'accès **Consultation**. | Prévenez l'administrateur. |
| Les petites images sont à gauche, mais le milieu reste noir | Problème d'affichage. | Changez une fois la taille de la fenêtre du navigateur, ou cliquez sur **Ouvrir dans un onglet ↗**. Si c'est toujours noir, prévenez l'administrateur. |
| Une fenêtre demande un **nom d'utilisateur et un mot de passe** | Ce n'est pas normal. | Ne tapez rien. Prévenez l'administrateur. |

## À ne pas faire

- Ne tapez jamais le nom d'un patient à la main sur l'appareil : choisissez-le dans la liste de travail.
- N'utilisez pas une liste de travail chargée plus tôt : rechargez-la avant chaque patient.
- N'écrivez pas de compte-rendu tant qu'un cadre rouge ou jaune n'a pas été vérifié.
- Ne cliquez pas autour de la **Visionneuse** avant d'avoir enregistré le compte-rendu.
- L'absence de cadre rouge ne prouve pas que ce sont les bonnes images : si le manipulateur a choisi un autre patient dans la liste, rien ne s'affiche. Si l'image ne ressemble pas au patient, vérifiez.
- **Administrateur — ne modifiez pas un examen avec « Modify » dans l'écran d'administration d'Orthanc.** Le choix coché d'avance, *Modify the original study (generating new DICOM UIDs)*, donne un nouveau numéro à l'examen : l'EMR ne retrouve plus les images (la liste dit toujours **N image(s)**, mais **Voir image** affiche **L'EMR a noté l'arrivée de ces images, mais le serveur d'images ne les a pas**). Le choix *keeping the original DICOM UIDs* échoue sur ce serveur (**Unexpected error during modification**) et ne change rien. Le choix *Create a modified copy* laisse une copie inutile sur le serveur. Le nom de l'examen affiché dans l'EMR vient de la demande : le changer dans Orthanc ne le change pas dans l'EMR. Si des images sont sous la mauvaise demande (le manipulateur a choisi une autre ligne du même patient), ne corrigez rien dans Orthanc : le médecin le fait dans l'EMR (voir **10. Les images sont sous la mauvaise demande**). Si un examen a quand même été modifié avec le choix coché d'avance : attendez une minute, puis rouvrez-le avec **Voir image**. L'EMR retrouve les images par le numéro d'accession et affiche au-dessus d'elles **Ces images ne portent pas le numéro d'étude donné par cette demande…** ; l'opération est notée dans le journal des modifications (**Paramètres → Journal**). Si le message **…le serveur d'images ne les a pas** reste, c'est que deux examens portent le même numéro d'accession sur le serveur (une copie a été créée) ou qu'il n'y en a plus aucun : appelez (voir **Qui appeler**).
- Ne débranchez pas le disque de sauvegarde du serveur, ne le prêtez pas et ne l'utilisez pas pour autre chose : il contient, sans chiffrement, les images des patients **et la copie de tout le dossier EMR**. Il doit rester rangé sous clé.

## Qui appeler

Prévenez l'**administrateur** si :

- la liste de travail de l'appareil est entièrement vide ;
- les images restent **Images en attente** alors que le manipulateur les a envoyées ;
- des images appartiennent à un autre patient (on ne peut pas encore les déplacer vers le bon dossier) ;
- la **Visionneuse** affiche **Le serveur d'images n'est pas encore relié…** ou **Le serveur d'images ne répond pas** ;
- une fenêtre demande un mot de passe ;
- l'écran d'état signale un problème de sauvegarde des images.

Pour l'administrateur : dans **Paramètres → Flux d'ordres**, le champ **Adresse du serveur d'images vue de l'intérieur du PC serveur (ne pas modifier)** reste `http://host.docker.internal:9090` (bouton **Par défaut**). Ce n'est pas l'adresse du PC sur le réseau. Le bouton **Tester : visionneuse → serveur d'images** doit répondre **Joignable (Orthanc …)** — la même phrase que la ligne **Visionneuse → serveur d'images** du point d'état en haut de l'écran.
