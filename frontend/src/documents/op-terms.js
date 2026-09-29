// French display text for the operation notes: the checkbox answers and the words drawn
// on the figures.
//
// The English strings are what gets STORED - a saved note holds "Yes", "3 o’clock",
// "Transsphincteric" - and op-figures.jsx matches on those same strings to decide what to
// draw. So they never change; French is applied only at display time, through tr() and
// showSel(). A document issued in English and reprinted in French therefore reads French,
// and every note issued before this file existed prints French too.
//
// Korean keeps the English terms, as the Korean paper form always did. A word with no
// entry here prints as stored.
//
// These are medical terms. The list is in wiki/modules/consultation.md (3.6) for the
// clinic's French-speaking doctors to check; change a translation here, never the key.

var FR = {
  // answers
  'Yes': 'Oui', 'No': 'Non', 'None': 'Néant', 'Other': 'Autre',
  'Right': 'Droit', 'Left': 'Gauche', 'Bilateral': 'Bilatéral',

  // soft-tissue mass
  'Skin': 'Peau', 'Soft tissue (subcutaneous)': 'Tissus mous (sous-cutané)',
  'Epidermal cyst': 'Kyste épidermoïde', 'Granuloma': 'Granulome', 'Lipoma': 'Lipome',
  'Hemangioma': 'Hémangiome', 'Fibroma': 'Fibrome', 'Giant cell tumor': 'Tumeur à cellules géantes',
  'Myositis ossificans': 'Myosite ossifiante', 'Sarcoma': 'Sarcome',

  // hernia (the answer, and the caption under its drawing)
  'Indirect - small': 'Indirecte - petite', 'Indirect - medium': 'Indirecte - moyenne',
  'Indirect - large': 'Indirecte - grande', 'Direct - small': 'Directe - petite',
  'Direct - medium': 'Directe - moyenne', 'Direct - large': 'Directe - grande',
  'Combined': 'Mixte', 'Femoral': 'Crurale',
  'Indirect Small': 'Indirecte petite', 'Indirect Medium': 'Indirecte moyenne',
  'Indirect Large': 'Indirecte grande', 'Direct Small': 'Directe petite',
  'Direct Medium': 'Directe moyenne', 'Direct Large': 'Directe grande',

  // appendix
  'Retrocecal': 'Rétrocæcale', 'Preileal': 'Pré-iléale', 'Postileal': 'Rétro-iléale',
  'Subcecal': 'Sous-cæcale', 'Pelvic': 'Pelvienne',
  'Free taenia': 'Bandelette libre', 'Ileum': 'Iléon', 'Cecum': 'Cæcum',
  'Perforation': 'Perforée', 'Gangrenous': 'Gangréneuse', 'Suppurative': 'Suppurée', 'Congestive': 'Congestive',
  'Pus': 'Pus', 'Turbid': 'Trouble', 'Serous': 'Séreux',
  'RLQ': 'FID', 'LLQ': 'FIG', 'Umbilicus': 'Ombilic',
  'Fascia: Vicryl 2-0': 'Fascia : Vicryl 2-0', 'Skin: Nylon 3-0': 'Peau : Nylon 3-0', 'Skin: Nylon 4-0': 'Peau : Nylon 4-0',

  // breast
  'Upper outer': 'Supéro-externe', 'Upper inner': 'Supéro-interne',
  'Lower outer': 'Inféro-externe', 'Lower inner': 'Inféro-interne',
  'Central / subareolar': 'Central / rétro-aréolaire', 'Axillary': 'Axillaire',

  // anorectal
  'Skin tag': 'Marisque', 'Anal fissure': 'Fissure anale', 'Anal papilla': 'Papille anale',
  'Submucosal': 'Sous-muqueuse', 'Intersphincteric': 'Intersphinctérienne',
  'Transsphincteric': 'Transsphinctérienne', 'Suprasphincteric': 'Suprasphinctérienne',
  'Extrasphincteric': 'Extrasphinctérienne',

  // words on the figures
  'Pile position (lithotomy view)': 'Position des paquets (vue en position gynécologique)',
  'pre-op': 'pré-op', 'post-op / additional': 'post-op / supplémentaire',
  'Openings (lithotomy view) and tract': 'Orifices (position gynécologique) et trajet',
  '● internal   ○ external': '● interne   ○ externe',
  'IAS': 'SAI', 'EAS': 'SAE', 'dentate': 'ligne pectinée',
  'levator ani': "releveur\nde l'anus",   // two lines: on one it runs off the section's edge
  'tract type not selected': 'type de trajet non précisé',
  // side letters on the anal dial and the breast map: droite / gauche
  'R': 'D', 'L': 'G',
};

// "3 o’clock" -> "3 h"
for (var h = 1; h <= 12; h++) FR[h + ' o’clock'] = h + ' h';

export var OP_FR = FR;

// One stored string, as shown in `lang`.
export function tr(s, lang) {
  return lang === 'fr' && Object.prototype.hasOwnProperty.call(FR, s) ? FR[s] : s;
}

// A stored checkbox value ("Yes, No", "3 o’clock, 7 o’clock"), as shown in `lang`.
export function showSel(v, lang) {
  if (lang !== 'fr') return v == null ? '' : v;
  return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    .map(function (s) { return tr(s, lang); }).join(', ');
}
