# Paramètres

L'écran **Paramètres** sert à l'administrateur : créer les comptes du personnel et leurs permissions, mettre les prix des médicaments, préparer les ordonnances types, régler les valeurs de référence des analyses, surveiller la sauvegarde et lire le **Journal** des modifications. Seuls les comptes qui ont la permission **Paramètres** voient cet écran.

Une partie de ce guide concerne **tout le personnel** : changer son propre mot de passe (voir « Changer mon mot de passe »).

## Après l'installation — dans cet ordre

Juste après avoir créé le compte **admin**, faites ces huit choses, dans cet ordre. L'EMR ne les coche pas pour vous : la colonne de droite dit comment savoir que c'est fait.

| # | Quoi | Où | C'est fait quand… |
|---|---|---|---|
| 1 | Informations de la clinique : nom (aussi en français), adresse, téléphone | **Paramètres** → **Établissement** → **Sauver** | Le nom et l'adresse sont les bons en haut d'un reçu imprimé |
| 2 | Un compte pour chaque personne, et un mot de passe à vous pour **admin** | **Paramètres** → **Personnel** (voir « Créer un compte ») | Chacun se connecte avec son propre identifiant ; **admin** n'a plus le mot de passe de l'installation |
| 3 | Le prix de chaque médicament utilisé (la liste importée arrive à 0) | **Paramètres** → **Médicaments** (voir « Mettre le prix d'un médicament ») | La colonne **Prix unitaire** n'affiche plus 0 pour les médicaments que vous donnez |
| 4 | Le prix des consultations, analyses, examens d'imagerie et actes | **Paramètres** → **Codes d'actes** | Les frais de consultation (C01 à C04) et les analyses ont leur vrai prix |
| 5 | Les ordonnances types, avec les vrais médicaments | **Paramètres** → **Ordonnances types** (voir « Créer une ordonnance type ») | Aucune ordonnance type n'affiche « ⚠ … absent(s) de la liste » |
| 6 | Une première sauvegarde | **Paramètres** → **Sauvegarde** → **Sauvegarder** | Le bandeau est vert : **Sauvegardes en ordre** |
| 7 | Le disque externe branché sur le PC serveur | Le responsable installe la sauvegarde de nuit (dossier PACS) | Le lendemain, dans le petit point d'état, **Copie des sauvegardes de l'EMR** est verte |
| 8 | L'imagerie reliée à l'EMR (si la clinique a le PACS) | Le responsable lance **pair-with-emr** (dossier PACS) ; dans **Flux d'ordres**, l'adresse du serveur d'images reste `http://host.docker.internal:9090` | Dans le petit point d'état, **Visionneuse → serveur d'images** est verte, et une image s'ouvre depuis un dossier |

## En bref

1. Cliquez sur **Paramètres** dans la barre du haut.
2. À gauche, choisissez la partie : **Personnel**, **Médicaments**, **Ordonnances types**, **Items de test**, **Sauvegarde**, **Journal**…
3. Pour ajouter : **+ Ajouter** (ou **Nouvel ensemble** pour une ordonnance type).
4. Pour changer une ligne : **Modifier**, changez, puis **Sauver**.
5. Regardez chaque jour le **petit point** en haut, juste avant l'heure : vert = tout va bien.
6. S'il est **jaune** ou **rouge**, cliquez dessus et lisez ce qui ne va pas.
7. Avant de fermer le soir, ouvrez **Sauvegarde** : le bandeau doit être vert (**Sauvegardes en ordre**).

## Pas à pas

### Créer un compte pour un membre du personnel

1. **Paramètres** → **Personnel** → **+ Ajouter**. La fenêtre **Nouveau membre du personnel** s'ouvre.
2. **Nom** : le nom de la personne (RAKOTO Jean).
3. **Identifiant** : le nom qu'elle tapera pour se connecter (par exemple `jrakoto`). Pas d'espace.
4. **Mot de passe** : un mot de passe initial est déjà rempli. Vous pouvez le garder ou en taper un autre. Cliquez sur **Afficher** pour le voir. Donnez-le à la personne ; elle pourra le changer elle-même.
5. **Rôle (étiquette)** : **Accueil**, **Médecin**, **Infirmier(ère)**, **Pharmacie**, **Laboratoire** ou **Administrateur**. Le rôle coche des permissions habituelles.
6. **Permissions (écrans accessibles)** : vérifiez les cases. Ce sont les cases qui décident ce que la personne peut ouvrir : **Enregistrement**, **Consultation**, **Paiement**, **Pharmacie**, **Laboratoire**, **Statistiques**, **Paramètres**.
7. **E-mail** si la personne en a un. Pour un médecin, choisissez son **Service** si besoin.
8. **Sauver**.

### Changer les permissions d'un compte

1. **Personnel** → **Modifier** sur la ligne de la personne.
2. Cochez ou décochez les **Permissions**. Laissez **Mot de passe** vide pour ne pas le changer (« Vide = inchangé »).
3. **Sauver**. Le changement s'applique tout de suite ; le menu de la personne se met à jour quand elle revient sur son écran (au plus tard en 5 minutes).

### Quelqu'un part : désactiver son compte

1. **Personnel** → **Supprimer** sur sa ligne.
2. Au message « Désactiver ce membre du personnel ? … », confirmez.
3. Le compte n'est pas effacé : il devient **inactif** et ne peut plus se connecter. Ses dossiers restent.

### Quelqu'un revient : réactiver son compte

1. **Personnel** : sur une ligne **inactif**, cliquez sur **Réactiver** (bouton vert). Seul un compte **Administrateur** voit ce bouton.
2. Confirmez « Réactiver … ? ». La personne se reconnecte avec le même identifiant, mot de passe et les mêmes permissions qu'avant.

### Changer mon mot de passe (tout le personnel)

1. En haut à droite, cliquez sur **votre nom** (avec la petite clé 🔑).
2. La fenêtre **Changer mon mot de passe** s'ouvre.
3. **Mot de passe actuel** : votre mot de passe d'aujourd'hui.
4. **Nouveau mot de passe** et **Confirmer le nouveau mot de passe** : le même nouveau mot de passe deux fois.
5. **Changer**. Le message « Mot de passe changé… » apparaît → **Fermer**. Utilisez le nouveau à la prochaine connexion.
6. En cas d'oubli : un administrateur en met un nouveau dans **Personnel** → **Modifier** → **Mot de passe**.

### Mettre le prix d'un médicament

1. **Paramètres** → **Médicaments**. Utilisez **Rechercher** pour trouver le médicament.
2. **Modifier** sur sa ligne.
3. **Prix unitaire** : le prix d'une unité (un comprimé, ou un flacon si la case « Délivré à l'unité de conditionnement » est cochée).
4. **Sauver** (en bas de la fenêtre ; sur un petit écran, seules les cases défilent, les boutons restent visibles). Le message **✓ Enregistré** confirme. Le changement de prix est noté dans le **Journal**.
5. Le **Stock** ne se change pas ici : il se change dans **Pharmacie** → **Stock**.

**Le cadre jaune « À vérifier sur place (liste importée) »** : la liste des médicaments vient de l'ancien inventaire. Le cadre dit ce qui reste à contrôler sur ce médicament (par exemple une quantité différente de la note d'origine). Il ne bloque pas : vous pouvez mettre le prix. Le cadre disparaît quand la pharmacie marque le médicament « Vérifié » dans **Pharmacie** → **Stock**.

**Deux lignes avec le même nom** (par exemple deux « Amoxicillin 500mg Gélule », MED-0068 et MED-0069) : ce sont deux codes de l'ancien inventaire. La fenêtre l'indique (« Même nom sous un autre code — MED-0069 »). Mettez le prix sur **les deux**, et signalez-le à la pharmacie, qui décidera s'il faut n'en garder qu'un.

### Créer une ordonnance type

Une ordonnance type ajoute plusieurs médicaments et examens en un clic dans la consultation. **La dose, les fois et les jours se décident ici**, pour chaque ligne.

1. **Paramètres** → **Ordonnances types** → **Nouvel ensemble**.
2. **Nom de l'ensemble** (par exemple « Paludisme adulte »). **Groupe (dossier)** si vous voulez les ranger.
3. À droite, choisissez **Médicament** ou **Examen / Imagerie**, tapez le nom, **Rechercher**, puis cliquez sur le résultat. La ligne apparaît dans **Éléments**. Sous chaque médicament trouvé : son **Stock** et son **Prix** — utile quand deux médicaments ont le même nom.
4. Pour un médicament, remplissez sur la ligne :
   - **Dose/j** : la quantité totale par jour (par exemple 4 comprimés par jour).
   - **Fois** : en combien de prises par jour (par exemple 2).
   - **Jours** : pendant combien de jours (par exemple 3).
   - **Posologie** : l'abréviation (par exemple BID).
   Le total délivré est **Dose/j × Jours** (ici 4 × 3 = 12 comprimés).
5. Pour un médicament délivré par flacon ou tube, une case de plus apparaît (**Flacon**, **Tube**…) : le nombre de flacons.
6. Pour un examen : **Qté**, **Fois**, **Jours** (1, 1, 1 en général).
7. **Sauver**. Si **Dose/j** ou **Jours** manque sur une ligne de médicament, la case devient rouge et l'enregistrement est refusé : complétez-la.

**« ⚠ 2 médicament(s) absent(s) de la liste »** sur une ordonnance type : ces médicaments (barrés) ont été retirés de la liste des médicaments. Ils ne sont **pas prescrits** quand on applique l'ordonnance type en consultation. **Modifier** → ✕ sur la ligne barrée, ajoutez le bon médicament de la liste, **Sauver**.

### Ajouter ou corriger un acte (code d'acte)

Les **codes d'actes** sont ce que le médecin demande en consultation : frais de consultation, analyses, examens d'imagerie, actes.

1. **Paramètres** → **Codes d'actes**. Les boutons **Tous · Frais · Laboratoire · Imagerie · Acte** filtrent la liste.
2. **+ Ajouter**, ou **Modifier** sur une ligne. Remplissez **Code**, **Nom**, **Type**, **Groupe**, **Prix**, puis **Sauver**.
   - Pour le type **Acte**, la case **Posologie par défaut (facultatif)** peut rester vide. Si vous y écrivez des mots (QD, PRN…), ils sont recopiés dans la colonne **Posologie** quand l'acte est demandé en consultation. N'y mettez pas un nombre.
3. Pour un examen fait sur un appareil (échographe, radio, endoscope…) : dans **Feed d'ordres / Modality**, choisissez la **Modalité** (US — échographie, CR — radiographie, ES — endoscopie…), la **Région**, et activez **Créer le Feed Worklist**. Le patient apparaît alors dans la liste de l'appareil.
4. **La modalité doit être exactement celle que l'appareil demande, lettre pour lettre.** Si elle n'est pas dans la liste, choisissez **Autre — saisir la valeur…** et tapez-la (lettres, chiffres ; par exemple `AS` pour certains rectoscopes).
5. Si le patient n'apparaît pas sur l'appareil : sur le PC serveur, **device-watch** (dossier PACS) affiche la valeur *Modality* que l'appareil a demandée. Mettez cette valeur, telle quelle, dans le code d'acte. Voir le guide PACS (connexion d'un appareil).

### Préparer les phrases types

Les **phrases types** sont des phrases déjà écrites que le médecin ajoute à sa note d'un clic, dans l'écran de consultation.

1. **Paramètres** → **Phrases types**. La liste **Toutes les catégories** permet de n'afficher qu'une catégorie.
2. Pour ajouter une phrase : **+ Ajouter**. Choisissez la **Catégorie**, écrivez la **Phrase**, puis **Sauver**.
   - Écrivez la phrase **une seule fois**, dans la langue du dossier (le français). Elle s'affiche telle quelle, quelle que soit la langue de l'écran.
3. Pour changer une phrase : **Modifier** sur sa ligne. Pour l'enlever : **Supprimer**.
4. Pour les catégories : **🗂 Catégories**.
   - Nouvelle catégorie : écrivez son nom en bas, puis **+ Ajouter la catégorie**.
   - Changer un nom : corrigez-le dans la case, puis **Enregistrer le nom**.
   - Changer l'ordre : **▲** et **▼**. C'est l'ordre que le médecin voit.
   - Enlever une catégorie : **Supprimer**. S'il reste des phrases dedans, l'écran demande « Les déplacer vers : » — choisissez une autre catégorie, puis **Déplacer et supprimer la catégorie**. Les phrases ne sont pas perdues.

### Régler les valeurs de référence des analyses

1. **Paramètres** → **Items de test**.
2. **Panel** : choisissez l'analyse (par exemple L01 · CBC).
3. Sur chaque ligne : **Min** et **Max** (valeurs normales), ou **Réf. texte** pour un résultat en mots (par exemple « Négatif »).
4. Pour des valeurs selon le sexe ou l'âge : **▸ Par sexe et âge** → **+ Ajouter une ligne**.
5. **Sauver**. Si plusieurs tableaux **Par sexe et âge** sont ouverts, faites défiler vers le bas pour voir **Sauver**. L'écran du laboratoire signale ensuite les résultats hors normes.

Les résultats déjà enregistrés gardent leur couleur et leur référence. Seuls les résultats enregistrés ensuite — ou enregistrés à nouveau — suivent les nouvelles valeurs.

<!-- à revoir : onglet de la session Laboratoire ; les valeurs de référence sont en cours de validation par les médecins. -->

### La sauvegarde

1. **Paramètres** → **Sauvegarde**. Regardez le bandeau en haut :
   - vert **Sauvegardes en ordre** : rien à faire ;
   - jaune **La dernière sauvegarde est trop ancienne**, **Aucune sauvegarde** ou **La sauvegarde la plus récente date d'une version plus ancienne de l'EMR** : cliquez sur **Sauvegarder** ;
   - rouge **La dernière sauvegarde a échoué** : notez le texte de l'erreur et prévenez le responsable.
2. **Sauvegarder** fait une sauvegarde tout de suite (« Sauvegarde faite »).
3. De temps en temps, **Télécharger** la plus récente sur une clé USB.
4. Une sauvegarde automatique se fait chaque nuit.
5. Chaque nuit, les sauvegardes sont aussi **copiées sur le disque externe**, avec la sauvegarde des images. Le disque doit rester branché : le petit point d'état le dit (ligne **Copie des sauvegardes de l'EMR**).

### Le petit point d'état

1. En haut, juste avant l'heure, un petit point (seulement pour les comptes **Paramètres**) :
   - vert **Tout fonctionne** ; jaune **À surveiller** ; rouge **Problème** ; gris **État inconnu** (le serveur ne répond pas, l'EMR reste utilisable).
2. **S'il est jaune ou rouge, cliquez dessus** : la liste dit ce qui ne va pas (base, disque, sauvegarde, appareils, imagerie…). Faites ce qui est écrit, ou prévenez le responsable.
3. Une ligne grise « Non utilisé » n'est pas un problème.
4. **Copie des sauvegardes de l'EMR (disque externe)** en jaune (« Disque externe absent », « Pas de copie depuis … h », « Échec de la copie … ») : branchez le disque externe (le même que pour les images). Si la ligne reste jaune le lendemain, prévenez le responsable.
5. **Visionneuse → serveur d'images** en jaune : l'EMR n'arrive pas au serveur d'images, et les images ne s'ouvrent pas depuis le dossier.
   - « Rien ne répond à … » : le serveur d'images est arrêté, ou l'adresse est fausse. Dans **Flux d'ordres**, l'adresse du serveur d'images est en général `http://host.docker.internal:9090` — **pas** l'adresse du PC sur le réseau.
   - « … refuse le mot de passe enregistré » : lancez **pair-with-emr** dans le dossier PACS (prévenez le responsable).
   - « Autre chose que le serveur d'images répond … » : un autre programme utilise ce port — prévenez le responsable.
6. **Adresses de l'imagerie** en jaune « La visionneuse n'est pas appairée au serveur d'images … » : les images ne s'ouvrent pas depuis le dossier. Sur le PC serveur, dans le dossier PACS, il faut lancer **pair-with-emr** — prévenez le responsable. « Ancien port … » : dans **Flux d'ordres**, remplacez 8080 par 9080 (adresse de l'EMR) ou 8090 par 9090 (serveur d'images), puis **Sauver**.

### Lire le Journal

Le **Journal** montre qui a modifié ou supprimé quoi (résultats d'analyse, dossiers terminés, ordonnances, reçus, patients, changements de service ou de médecin d'une visite, comptes du personnel, prix des médicaments, prix des actes, catégories de phrases types), et chaque **document émis ou annulé** (lettre de référence, certificat, ordonnance externe…).

1. **Paramètres** → **Journal**. Il montre les 7 derniers jours.
2. Pour chercher : **Du** / **Au** (dates), **Tout le personnel** (une personne), **Tous les types** (un type), **Nom du patient ou n° de dossier** → **Rechercher**.
3. Les colonnes : **Quand**, **Qui**, **Quoi**, **Patient**, **Modification** (ancienne valeur barrée → nouvelle valeur).
4. **◀ Précédent** / **Suivant ▶** pour les pages.
5. Personne ne peut modifier ni effacer ce journal. Un mot de passe changé est noté, jamais sa valeur.
6. Le **prix d'un médicament** est noté quand il change (« Prix d'un médicament modifié », ancien prix → nouveau prix), même le premier prix d'un médicament importé (0 → 100). Le **prix d'un acte** (**Codes d'actes** : frais de consultation, analyses, imagerie, actes) aussi (« Prix d'un acte modifié »). Un médicament ou un acte ajouté avec **+ Ajouter** ne l'est pas.
7. Chaque **document** émis est noté (« Document émis » : son numéro, le document, la langue), et son annulation aussi (« Document annulé » et le motif). Le contenu du document n'est pas dans le Journal. Il y en a beaucoup chaque jour, donc le Journal s'ouvre **sans les documents émis** : au-dessus de la liste, « 📄 N ligne(s) « Document émis » masquée(s) ». Pour les voir, cochez **Afficher aussi les documents émis** (ou choisissez « Document émis » dans **Tous les types**). À la prochaine ouverture, ils sont de nouveau masqués. Les documents **annulés** sont toujours affichés.
8. Ne sont **pas** notés : les ordonnances types, une première saisie, un document seulement imprimé en brouillon.

## Si ce message apparaît

| Message à l'écran | Ce que cela veut dire | Que faire |
|---|---|---|
| Cet identifiant existe déjà. Choisissez-en un autre. | Un autre compte a cet identifiant | Prenez un autre identifiant |
| Saisissez un identifiant. / Saisissez un mot de passe. | Case vide dans **Nouveau membre du personnel** | Remplissez-la, puis **Sauver** |
| Vous n'avez pas l'autorisation pour cela… | Le compte n'a pas la permission | Demandez à un administrateur de cocher la permission |
| C'est le dernier administrateur actif pouvant ouvrir les Paramètres… | On retirerait le dernier accès aux Paramètres | Donnez d'abord le rôle **Administrateur** et **Paramètres** à un autre compte |
| Le compte administrateur créé à l'installation ne peut pas être désactivé. | Ce compte (identifiant admin) est protégé | Normal — ne rien faire |
| Seul un administrateur peut réactiver un compte du personnel. | Votre rôle n'est pas **Administrateur** | Demandez à un administrateur |
| Le mot de passe actuel n'est pas correct. | Erreur dans **Mot de passe actuel** | Retapez-le |
| Les deux nouveaux mots de passe ne sont pas identiques. | Les deux cases diffèrent | Retapez le même mot de passe deux fois |
| Indiquez la dose par jour et le nombre de jours… | Une ligne de médicament d'une ordonnance type est incomplète | Remplissez **Dose/j** et **Jours** sur la ligne nommée |
| Vérifiez les nombres… | Un nombre est hors limites | Corrigez (Fois 1–24, Jours 1–365…) |
| La visionneuse n'est pas appairée au serveur d'images — lancez pair-with-emr… | Les images ne s'ouvrent pas depuis le dossier | Prévenez le responsable (dossier PACS du PC serveur) |
| Ligne 2 : la dose par jour doit être supérieure à 0. (et autres « Ligne n : … ») | Une ligne d'ordonnance type a un nombre refusé | Corrigez la ligne indiquée |
| … phrase(s) type(s) sont dans cette catégorie. Déplacez-les vers une autre catégorie ou supprimez-les d'abord. | On supprime une catégorie qui contient encore des phrases | Choisissez où les déplacer, ou supprimez d'abord les phrases |
| Une catégorie porte déjà ce nom. | Deux catégories ne peuvent pas avoir le même nom | Prenez un autre nom |
| Fenêtre d'état : « Fichier .env de l'EMR — ligne(s) absente(s) … » ou « DB_PASSWORD n'est pas celui de l'EMR en marche » | Le fichier .env de l'EMR a été modifié à la main | **Ne redémarrez pas** le PC serveur ni l'EMR ; prévenez tout de suite le responsable |
| Le serveur ne répond pas… | Le serveur est arrêté ou lent | Regardez la fenêtre d'état sur le PC serveur ; prévenez le responsable |
| Fenêtre d'état : « Autres programmes sur les ports — port 9080 : DownloadServer … » | Un autre programme (téléchargement, serveur web…) écoute un port de l'EMR ou du PACS ; l'écran peut s'ouvrir alors que la liste de travail des appareils ne marche plus | Fermez ou désinstallez ce programme, redémarrez le PC ; sinon prévenez le responsable |

## À ne pas faire

- Ne donnez pas la permission **Paramètres** à tout le monde : elle permet de changer les comptes et les prix.
- Ne partagez pas un compte entre deux personnes : le **Journal** doit dire qui a fait quoi.
- Ne changez pas le stock en dehors de **Pharmacie** → **Stock**.
- Ne laissez pas le bandeau de **Sauvegarde** jaune ou rouge plusieurs jours.
- N'écrivez pas les mots de passe sur un papier collé à l'écran.
- Ne modifiez pas à la main le fichier **.env** du dossier de l'EMR sur le PC serveur (lignes `DB_PASSWORD` et `JWT_SECRET`). Changer ces lignes ne change aucun mot de passe : au prochain démarrage, l'EMR ne pourrait plus ouvrir sa base. Pour le mot de passe d'une personne : **Paramètres** → **Personnel**. Pour le mot de passe du serveur d'images : le responsable le change dans le dossier PACS, puis lance **pair-with-emr**.

## Qui appeler

Prévenez le responsable (l'administrateur principal) si :

- le point d'état reste **rouge**, ou gris plus d'une heure ;
- **La dernière sauvegarde a échoué** revient après **Sauvegarder** ;
- plus personne ne peut ouvrir les **Paramètres** ;
- un compte agit sans que la personne l'ait fait (voir le **Journal**).
