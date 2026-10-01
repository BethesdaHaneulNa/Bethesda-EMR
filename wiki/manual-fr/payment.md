# Paiement (caisse)

L'écran **Paiement** sert à encaisser les patients après la consultation : calculer ce que le patient doit, enregistrer l'argent reçu, rendre la monnaie, imprimer le reçu, encaisser plus tard un montant impayé et corriger un reçu quand la facture a changé. Il est utilisé par le personnel de caisse et d'accueil.

Pour ouvrir l'écran : cliquez sur **Paiement** dans la barre du haut. Si **Paiement** n'apparaît pas, votre compte n'a pas cette autorisation (voir « Qui appeler »).

Tous les montants sont en Ariary (Ar). La clinique encaisse en espèces : quand on a trop facturé, on **rend seulement la différence** avec une **Correction** (voir 7).

## En bref

Encaisser un patient qui sort de consultation :

1. Cliquez sur **En attente** (en haut à gauche). La liste montre les patients à encaisser.
2. Cliquez sur le nom du patient, par exemple **RAKOTO Jean**.
3. Vérifiez au milieu : **Consultation**, **Ordonnances**, **Examens / Actes**. À droite, le **Total**.
4. Prenez l'argent du patient. Dans **Montant Reçu**, tapez ce qu'il vous donne (ou cliquez sur **Exact**, **5 000**, **10 000**, **20 000**, **50 000**).
5. Lisez **Monnaie** et rendez ce montant au patient.
6. Cliquez sur **Confirmer**.
7. Le reçu s'ouvre. Cliquez sur **🖨 Imprimer Reçu**, donnez le reçu au patient, puis **Fermer**.

## Pas à pas

### 1. L'écran

- *Tout en haut à gauche* — **Date de travail** : le jour dont l'écran montre les visites. Elle est sur aujourd'hui ; **◀** et **▶** changent de jour (voir 10). La liste se recharge toute seule toutes les 30 secondes ; **↻** la recharge tout de suite.
- *En haut* — **En attente (N)** : les patients à encaisser. **Payé aujourd’hui (N)** : les reçus du jour ; en haut de cette liste, **💵 Caisse du jour** montre **Encaissé**, **Rendu** et **Net** du jour (à comparer avec l’argent du tiroir en fin de journée). **🔍 Trouver patient** : chercher un patient qui n'est pas dans la liste.
- *À gauche* — la liste. Sous chaque nom, un badge : **En Attente** (pas encore payé), **Supplément** (articles ajoutés après paiement, voir 6), **Correction** (articles retirés après paiement, voir 7), **Re-facturer** (reçu annulé, voir 9).
- *Au milieu* — ce qui est facturé : **Consultation** (le type : **Nouvelle**, **Suivi** ou **Sans frais**), **Ordonnances** (médicaments donnés par la pharmacie de la clinique), **Examens / Actes**, **Délivrance / Autres** (certificat, CD… ajoutés à la caisse avec **+ Ajouter**).
- *À droite du milieu* — les totaux : **Sous-total**, **Remise**, **Total**, **Montant Reçu**, **Monnaie**.
- *Tout à droite* — **Dossier Patient** et **Reçus** (l'historique des reçus du patient).

### 2. Encaisser et rendre la monnaie

1. Choisissez le patient dans **En attente**.
2. Si le patient vous donne 20 000 Ar pour un total de 18 000 Ar : tapez `20000` dans **Montant Reçu**.
3. **Monnaie** affiche **2 000 Ar**. Rendez 2 000 Ar.
4. Cliquez sur **Confirmer**. Le reçu indique **Montant remis** 20 000 Ar et **Monnaie rendue** 2 000 Ar.
5. Si un certificat ou un CD est payé à la caisse : avant **Confirmer**, choisissez-le dans **Délivrance / Autres** → **+ Ajouter**.
6. Pour une remise : tapez le montant dans **Remise** avant **Confirmer**.

Le patient disparaît de **En attente** et apparaît dans **Payé aujourd’hui**.

### 3. Le patient ne paie pas tout

- **Il paie une partie** (par exemple 10 000 Ar sur 18 000 Ar) : tapez `10000` dans **Montant Reçu**, puis **Confirmer**. Les 8 000 Ar restent **impayés** sur son compte. Le reçu indique **Reste à payer**.
- **Il ne paie rien** : cliquez sur **Impayé** (en haut à droite). Tout le total reste impayé.

Le patient quitte la liste **En attente**. Pour encaisser le reste plus tard, voir 4.

### 4. Encaisser un impayé plus tard

1. Trouvez le patient : dans **Payé aujourd’hui** s'il a été encaissé aujourd'hui, sinon avec **🔍 Trouver patient**.
2. À droite, cliquez sur **Reçus**. Le reçu non soldé montre **Impayé: N Ar**.
3. Cliquez sur **💵 Encaisser impayé**. Dans **Montant reçu**, le montant dû est déjà écrit. S'il paie une partie seulement, changez le montant.
4. Cliquez sur **Confirmer**. Un **nouveau reçu daté d'aujourd'hui** s'ouvre (« Règlement du reçu R-… ») : **🖨 Imprimer Reçu**, puis **Fermer**.
5. Plusieurs reçus impayés : cliquez sur **💵 Tout encaisser** en haut des reçus. Un reçu est émis par visite.
6. Le reçu d’origine indique ensuite **Reporté** et « → solde réglé sur le reçu R-… » : son impayé est à 0, le reste a été encaissé sur le nouveau reçu.

Si le patient revient pour une nouvelle consultation, son impayé s'ajoute tout seul : la liste montre **+ Solde antérieur dû: N Ar** et le **Total** le contient.

### 5. Consultation : Nouvelle, Suivi, Sans frais

L'accueil choisit le type de visite. Vous pouvez le changer à côté de **Consultation** avant **Confirmer**. Les prix viennent des **Paramètres** (codes C01 et C02). Une visite terminée à l'accueil sans consultation (bouton **Terminer →**) est en **Sans frais** : le jour même, elle apparaît dans **En attente** à 0 Ar, pour encaisser par exemple un certificat (**Délivrance / Autres** → **+ Ajouter**). Une visite d'un **jour passé** terminée ainsi, sans médicament ni examen, n'apparaît pas : il n'y a rien à encaisser. Si un certificat est demandé plus tard, cherchez le patient avec **🔍 Trouver patient**.

### 6. Supplément — le médecin a ajouté quelque chose après le paiement

1. Le patient revient dans **En attente** avec le badge **Supplément** et **➕ Charge suppl.: N Ar**.
2. Cliquez sur son nom. Seuls les nouveaux articles sont facturés (**Déjà facturé** rappelle ce qui a déjà été payé).
3. Encaissez comme en 2.

### 7. Correction — on a trop facturé (le cas normal)

Exemple : RASOA Marie a payé 18 000 Ar (consultation 15 000 + médicament 3 000). Ensuite le médecin retire le médicament.

1. Elle revient dans **En attente** avec le badge **Correction** et **↩ À rembourser: 3 000 Ar**.
2. Cliquez sur son nom. L'écran montre **Articles actuels**, **Montant correct** 15 000, **Déjà encaissé** 18 000 et **Remboursement dû** 3 000.
3. Cliquez sur **↩ Appliquer la correction**. La fenêtre dit « Appliquer la correction ? … **Rendez 3 000 Ar au patient.** ». Cliquez sur OK.
4. **Rendez 3 000 Ar** à la patiente. Un nouveau reçu (15 000 Ar) remplace l'ancien : il indique « Remplace le(s) reçu(s) » et « Remboursé au patient : 3 000 Ar ». L'ancien reçu est marqué **Remplacé** (« → remplacé par R-… », bord violet), pas **ANNULÉ** ; dans **Payé aujourd’hui**, il est rangé sous **▸ Annulés / remplacés**.

Avant de cliquer, le cadre **Ce qui change** montre chaque ligne modifiée, par exemple « CBC (annulé) 1 → 0 −12 000 » (examen annulé par le médecin) ou « Amoxicilline 3 → 0 −1 500 » (médicament retiré).

Si le patient **n'avait pas tout payé**, il n'y a rien à rendre : la liste montre **↩ Reste impayé: N Ar**, et la fenêtre dit « **N Ar resteront impayés.** ». Son impayé diminue.

Si la liste montre **↩ Sans différence d’argent**, il n'y a ni argent à rendre ni impayé : le reçu est seulement réémis.

Un médicament **déjà délivré** par la pharmacie et emporté par le patient n'est pas repris : il ne disparaît pas de la facture et il n'y a pas de remboursement. La correction ne concerne que les médicaments retirés **avant** la délivrance, et les examens ou imageries annulés.

### 8. Annuler un reçu (rare)

N'annulez un reçu que si le reçu lui-même est faux (mauvais patient, par exemple). **Si seulement des articles ont changé, faites une Correction (7).**

1. Choisissez le patient, cliquez sur **Reçus**, puis sur **Annuler** à côté du reçu.
2. Lisez le cadre jaune, puis écrivez le **Motif de l’annulation**.
3. La fenêtre demande : « **Avez-vous rendu au patient les N Ar encaissés sur ce reçu ?** ». Répondez ce que vous avez **vraiment** fait :
   - **Oui — N Ar rendus** : vous rendez tout l'argent au patient.
   - **Non — l’argent reste à la caisse** : l'argent reste dans la caisse ; il servira quand vous re-facturerez (9).
   - Si le reçu n'avait rien encaissé, il n'y a qu'un bouton : **Annuler le reçu**.
4. Le reçu devient **ANNULÉ** (bord rouge). Dans **Reçus**, il indique **Rendu à l’annulation** ou **Gardé à l’annulation**.

### 9. Re-facturer après une annulation

1. Le patient revient dans **En attente** avec le badge **Re-facturer**.
2. Cliquez sur son nom.
   - Si vous aviez répondu **Non** (argent gardé), le cadre **↺ Re-facturer** montre **Paiement reporté: N Ar** et ce montant est déjà dans **Montant Reçu**. Ne redemandez pas cet argent au patient.
   - Si vous aviez répondu **Oui** (argent rendu), **Montant Reçu** est vide : encaissez normalement.
3. Cliquez sur **Confirmer**.

### 10. Date de travail et visites des jours passés (📅)

Les listes montrent seulement les visites de la **Date de travail** (en haut à gauche). Elle est sur aujourd'hui et passe toute seule au nouveau jour après minuit. On ne peut pas choisir une date future.

**Ce qui reste des jours passés.** Quand il reste quelque chose à traiter d'un jour précédent, une ligne jaune apparaît en haut de **En attente** : **▸ 📅 Jours passés à traiter (3)**. Cliquez dessus : les patients s'affichent avec leur date (📅 2026-09-30) et un bord jaune à gauche. On y trouve :

- les visites jamais encaissées — **📅 2026-09-30 · visite d’un jour passé · pas encore encaissée** (par exemple une visite de la veille terminée ce matin par l'accueil) ;
- les **Supplément**, **Correction** et **Re-facturer** de ces jours.

Traitez-les comme d'habitude ; le reçu est daté d'aujourd'hui. Seules les visites avec quelque chose à facturer (consultation, médicament, examen) apparaissent ainsi. Quand tout est traité, la ligne jaune disparaît.

**Regarder un autre jour.** Cliquez sur **◀**, ou choisissez la date. Le haut de la liste devient jaune : « Date passée (2026-09-30) : un encaissement fait maintenant est daté d’aujourd’hui (2026-10-01) — reçu et caisse du jour. »

- **En attente** : ce qui reste à traiter pour les visites de ce jour. S'il n'y a rien : « Rien à encaisser à cette date. »
- **Payé le 2026-09-30** : les reçus faits ce jour-là et **💵 Caisse du 2026-09-30**.
- Vous pouvez encaisser une visite de ce jour. Le reçu et la caisse sont **à la date d'aujourd'hui**, parce que l'argent entre aujourd'hui : après **Confirmer**, le reçu se trouve dans **Payé aujourd’hui**, pas dans la liste du jour passé.
- **Aujourd’hui** : revenir à aujourd'hui.
- Si vous changez de date, le patient ouvert se ferme.

Un patient ouvert avec **🔍 Trouver patient** dont la visite n'est pas d'aujourd'hui porte la date de la visite (📅) à droite de son nom.

### 11. Articles sans prix, quantité manquante

- **Sans prix** à la place du prix, et le cadre jaune « **N article(s) sans prix — vérifiez les prix** » : le médicament ou l'examen n'a pas de prix. Au moment de **Confirmer**, une fenêtre demande « Encaisser quand même ? ». S'il est donné gratuitement, confirmez. Sinon, annulez et demandez au médecin ou à la pharmacie.
- **⚠ Quantité manquante** (et dans la liste **Quantité de médicament manquante**) : la quantité totale n'est pas écrite. L'encaissement est bloqué. Demandez au médecin d'enregistrer à nouveau la prescription (pour un sirop ou une crème : le **nombre de flacons / tubes**), puis cliquez sur **↻** et encaissez.
- Pour un sirop, une crème, un inhalateur, la quantité s'écrit en flacons ou tubes (par exemple **2 flacons**), aussi sur le reçu.

### 12. Réimprimer un reçu

1. Choisissez le patient (**Payé aujourd’hui** ou **🔍 Trouver patient**), puis **Reçus**.
2. Cliquez sur **🖨 Réimprimer** à côté du reçu. Le reçu est identique au premier. Un reçu annulé porte **ANNULÉ** sur le papier — aussi un reçu remplacé par une correction ; c'est le nouveau reçu qui indique « Remplace le(s) reçu(s) ».

### 13. Le patient n'est pas dans la liste

Cliquez sur **🔍 Trouver patient**, cherchez le nom, choisissez la visite. Si la visite a été annulée à l'accueil, l'écran le dit et il n'y a rien à encaisser.

## Si ce message apparaît

| Message | Ce que cela veut dire | Que faire |
|---|---|---|
| « Ce patient vient d’être encaissé ailleurs, ou le solde antérieur a déjà été réglé… » | Un autre poste a encaissé ce patient en même temps. Aucun reçu en double n'a été créé. | Regardez la liste rechargée ; encaissez de nouveau seulement si nécessaire. |
| « Aucun montant reçu. Laisser les N Ar impayés ? » | **Montant Reçu** est vide. | OK seulement si le patient ne paie rien. |
| « Les N Ar saisis ne seront pas enregistrés ; la totalité (N Ar) restera impayée. Continuer ? » | Vous avez cliqué **Impayé** avec un montant écrit. | Si le patient a payé : annulez puis **Confirmer**. |
| « Déjà payé en totalité » | Rien de nouveau à facturer pour cette visite. | Rien à faire. |
| « Quantité totale manquante pour : … » / « Nombre de flacons / tubes non indiqué pour : … » | La prescription n'a pas de quantité. | Demandez au médecin de la compléter, puis **↻**. |
| « Code de consultation C0x introuvable — la consultation compte 0 Ar… » | Le prix de la consultation manque dans les Paramètres. | Prévenez l'administrateur avant d'encaisser la consultation. |
| « Ne peut dépasser l'impayé » | Le montant est plus grand que l'impayé. | Tapez au plus le montant dû. |
| « Le solde de ce reçu a été reporté sur le reçu R-…, qui le facture maintenant. Annulez d’abord R-…, puis ce reçu. » | Cet impayé a été ajouté à un reçu plus récent. | Annulez d'abord le reçu indiqué. |
| « Le solde de cette visite a été reporté sur le reçu R-… Annulez d’abord R-… » | Même chose, lors d'une correction. | Annulez d'abord le reçu indiqué, puis corrigez. |
| « Le solde de ce reçu a déjà été reporté sur le reçu R-… Encaissez-le sur ce reçu. » | Cet impayé est maintenant sur un autre reçu. | Utilisez **Encaisser impayé** sur le reçu indiqué. |
| « Cette visite a été annulée à l’accueil — rien à encaisser. » | Visite annulée. | Rien à encaisser. |
| « Le navigateur a bloqué la fenêtre d'impression… » | Le navigateur a bloqué la fenêtre du reçu. | Autorisez les fenêtres pop-up pour ce site, puis **Imprimer Reçu** de nouveau. |

## À ne pas faire

- N'annulez pas un reçu parce qu'un médicament a été retiré : faites une **Correction** et rendez seulement la différence.
- Au moment d'annuler, ne répondez pas **Oui** si vous n'avez pas rendu l'argent (ni **Non** si vous l'avez rendu) : la caisse du jour serait fausse.
- Ne redemandez pas l'argent déjà écrit dans **Paiement reporté** lors d'une re-facturation.
- Ne cliquez pas deux fois sur **Confirmer** en attendant : un seul reçu est créé, le deuxième clic est refusé.
- Ne tapez pas dans **Montant Reçu** une somme que le patient n'a pas donnée.

## Qui appeler

Appelez l'administrateur (Paramètres) si :

- **Paiement** n'apparaît pas dans la barre du haut (autorisation du compte) ;
- un prix manque (consultation, médicament, examen) ;
- un montant du reçu vous semble faux et vous ne savez pas s'il faut une **Correction** ;
- la caisse du jour ne correspond pas aux reçus.
