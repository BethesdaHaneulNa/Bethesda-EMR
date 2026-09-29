// Operation-note figures.
//
// The paper Operation Note carries anatomical drawings the surgeon circles by hand. A web
// form cannot be drawn on, so the checkbox selections drive these figures instead: pick
// "3 o'clock" and the printed clock face is marked at 3. That keeps both halves - the
// selections stay countable, and the printed record still reads like the paper one.
//
// Every figure is hand-drawn SVG rather than a scanned illustration: no third-party artwork
// travels with the record, and it stays crisp at print resolution. Strokes are dark grey and
// selections are solid black, so nothing depends on colour surviving a mono printer.

import { HERNIA_PANELS, APPENDIX_PLATE, APPENDIX_ANCHORS } from './op-plates.js';

var INK = '#333';
var FAINT = '#bbb';
var MARK = '#111';

// The checkbox field stores selections as one comma-joined string.
export function sel(v) {
  return String(v || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}
function has(v, name) { return sel(v).indexOf(name) >= 0; }
function hourOf(s) { var m = /^(\d{1,2})/.exec(s); return m ? parseInt(m[1], 10) : 0; }

// The figure sits beside the procedure-detail table (see OpNoteLayout), so it carries no
// outer margin of its own and keeps its drawings tight together.
function FigBox(props) {
  return (
    <div style={{ flex: '0 0 auto', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {props.caption ? <div style={{ fontSize: 10.5, color: '#555', marginBottom: 2 }}>{props.caption}</div> : null}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>{props.children}</div>
    </div>
  );
}

// Every figure is drawn in its own coordinate box and printed at a set width, so resizing
// one for the page never means redrawing it.
function fit(W, H, dw) {
  return { flex: 'none', width: dw, height: Math.round(dw * H / W) };
}

/* ── Anal clock (hemorrhoid, fistula) ─────────────────────────────────────────
   Lithotomy view, matching the paper: A anterior at 12, P posterior at 6, and the
   patient's right on the viewer's left. Six dashed cushions sit inside, as on the
   paper form. The dial is shared; what gets marked on it differs per procedure. */
// Room reserved above and below the dial for the A / P labels and the caption, so none
// of them can land on top of each other.
var CLK = (function () {
  var W = 168, PAD_T = 18, PAD_B = 30, r = 58, c = W / 2, cy = PAD_T + r;
  return { W: W, H: PAD_T + 2 * r + PAD_B, r: r, c: c, cy: cy,
    pt: function (h, rad) {
      var a = (h % 12) * Math.PI / 6;            // 0 = 12 o'clock, clockwise
      return [c + rad * Math.sin(a), cy - rad * Math.cos(a)];
    } };
})();
function hours(v) { return sel(v).map(hourOf).filter(function (h) { return h >= 1 && h <= 12; }); }

function Dial(props) {
  var g = CLK, c = g.c, cy = g.cy, r = g.r;
  var cushions = [], ticks = [];
  for (var i = 0; i < 6; i++) {
    var p = g.pt(i * 2 + 1, 26);
    cushions.push(<circle key={'c' + i} cx={p[0]} cy={p[1]} r={17} fill="none" stroke={FAINT} strokeWidth="1" strokeDasharray="3 2" />);
  }
  // No hour numbers on the dial: the marks already show where, and the same hours are
  // printed as text in the detail row beside it. Numbers here only collided with marks.
  for (var h = 1; h <= 12; h++) {
    var a = g.pt(h, r), b = g.pt(h, r - 6);
    ticks.push(<line key={'t' + h} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={h % 3 === 0 ? 1.4 : 0.8} />);
  }
  return (
    <svg width={g.W} height={g.H} viewBox={'0 0 ' + g.W + ' ' + g.H} style={fit(g.W, g.H, props.width || 124)}>
      <circle cx={c} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx={c} cy={cy} r={9} fill="none" stroke={FAINT} strokeWidth="1" />
      {cushions}{ticks}{props.children}
      {/* sized for the ~124 px the dial prints at, where 11 was barely legible */}
      <text x={c} y={13} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>A</text>
      <text x={c} y={cy + r + 15} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>P</text>
      <text x={3} y={cy + 5} fontSize="13" fontWeight="700" fill={INK}>R</text>
      <text x={g.W - 12} y={cy + 5} fontSize="13" fontWeight="700" fill={INK}>L</text>
      {props.title ? <text x={c} y={g.H - 4} textAnchor="middle" fontSize="11" fill="#555">{props.title}</text> : null}
    </svg>
  );
}

// Hemorrhoid: each marked hour is a spoke from the centre ending in a solid peg.
export function AnalClock(props) {
  var g = CLK;
  return (
    <Dial width={props.width} title={props.title}>
      {hours(props.value).map(function (h) {
        var m = g.pt(h, g.r - 14);
        return <g key={'m' + h}>
          <line x1={g.c} y1={g.cy} x2={m[0]} y2={m[1]} stroke={MARK} strokeWidth="1.6" />
          <circle cx={m[0]} cy={m[1]} r="6.5" fill={MARK} />
        </g>;
      })}
    </Dial>
  );
}

/* Fistula: both openings on one dial, the way the tract is drawn on a Goodsall diagram.
   The internal opening sits at the dentate line (inner ring, solid) and the external
   opening out on the perianal skin (near the rim, hollow), joined by the tract. Two
   separate dials could not show which external opening leads to which internal one.

   With a single internal opening every external one is joined to it - the ordinary
   case, and what Goodsall's rule predicts. With several, the joins would be a guess, so
   the openings are marked but left unjoined. */
export function FistulaClock(props) {
  var g = CLK, ins = hours(props.internal), outs = hours(props.external);
  var IN_R = 24, OUT_R = g.r - 10;
  return (
    <Dial width={props.width} title="● internal   ○ external">
      {ins.length === 1 ? outs.map(function (h) {
        var a = g.pt(h, OUT_R), b = g.pt(ins[0], IN_R);
        return <line key={'j' + h} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={MARK} strokeWidth="2" />;
      }) : null}
      {outs.map(function (h) {
        var a = g.pt(h, OUT_R);
        return <circle key={'o' + h} cx={a[0]} cy={a[1]} r="6" fill="#fff" stroke={MARK} strokeWidth="2.2" />;
      })}
      {ins.map(function (h) {
        var a = g.pt(h, IN_R);
        return <circle key={'i' + h} cx={a[0]} cy={a[1]} r="6" fill={MARK} />;
      })}
    </Dial>
  );
}

/* ── Breast map (breast) ──────────────────────────────────────────────────────
   Chest outline with both breasts and the quadrant crosshair, as on the paper.
   The selected side is outlined heavier and the selected quadrant is shaded. */
export function BreastMap(props) {
  var side = sel(props.side), quad = sel(props.quadrant);
  var W = 300, H = 196;
  var SHADE = '#d5d5d5';   // solid grey, not an opacity - some print paths drop alpha
  var breast = function (cx, isRight) {
    var on = side.indexOf(isRight ? 'Right' : 'Left') >= 0 || side.indexOf('Bilateral') >= 0;
    var r = 52, cy = 108;
    // Outer = away from the sternum, which is the middle of the image.
    var outerSign = isRight ? -1 : 1;
    // A quarter *disc*, not a square: a rect spills outside the breast outline.
    var wedge = function (name, sx, sy) {
      if (!on || quad.indexOf(name) < 0) return null;
      var d = 'M' + cx + ',' + cy + ' L' + (cx + sx * r) + ',' + cy +
              ' A' + r + ',' + r + ' 0 0 ' + (sx * sy > 0 ? 1 : 0) + ' ' + cx + ',' + (cy + sy * r) + ' Z';
      return <path d={d} fill={SHADE} stroke="none" />;
    };
    return (
      <g>
        {wedge('Upper outer', outerSign, -1)}
        {wedge('Upper inner', -outerSign, -1)}
        {wedge('Lower outer', outerSign, 1)}
        {wedge('Lower inner', -outerSign, 1)}
        {on && quad.indexOf('Central / subareolar') >= 0 ? <circle cx={cx} cy={cy} r={16} fill={SHADE} /> : null}
        {on && quad.indexOf('Axillary') >= 0 ? <circle cx={cx + outerSign * (r + 6)} cy={cy - r + 10} r={10} fill={SHADE} stroke={INK} strokeWidth="0.8" /> : null}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={on ? MARK : FAINT} strokeWidth={on ? 1.8 : 1} />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={INK} strokeWidth="0.8" />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={INK} strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r={4.5} fill={INK} />
      </g>
    );
  };
  return (
    <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H} style={fit(W, H, props.width || 230)}>
      {/* shoulders / chest outline */}
      <path d={'M40,44 C70,20 110,14 150,14 C190,14 230,20 260,44'} fill="none" stroke={INK} strokeWidth="1.4" />
      <path d={'M40,44 C34,70 32,120 40,176'} fill="none" stroke={INK} strokeWidth="1.4" />
      <path d={'M260,44 C266,70 268,120 260,176'} fill="none" stroke={INK} strokeWidth="1.4" />
      <line x1={150} y1={30} x2={150} y2={176} stroke={FAINT} strokeWidth="1" strokeDasharray="4 3" />
      {breast(96, true)}
      {breast(204, false)}
      <text x={96} y={186} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>R</text>
      <text x={204} y={186} textAnchor="middle" fontSize="12" fontWeight="700" fill={INK}>L</text>
    </svg>
  );
}

/* ── Fistula coronal section (fistula) ────────────────────────────────────────
   Coronal view of the anal canal. What separates one Parks type from the next is which
   structures the tract passes through, not how far out it surfaces - so the internal
   sphincter, external sphincter and levator ani are drawn as filled bands, and each type
   gets its own route through them:

     Submucosal        stays between the lining and the internal sphincter
     Intersphincteric  crosses the internal sphincter, runs down between the two
     Transsphincteric  crosses both sphincters into the ischioanal fossa
     Suprasphincteric  climbs between the sphincters, over the top of the external
                       sphincter / puborectalis, then down through the levator
     Extrasphincteric  starts in the rectum above the levator and goes through it,
                       outside the whole sphincter complex

   The anatomy is mirrored so both walls read naturally; the tract and the labels use the
   left half and the right half respectively, so neither sits on the other. */
var FIS_W = 260, FIS_H = 190;
var FIS_TRACT = {
  // [path, internal opening, external opening]
  'Submucosal':       ['M114,118 C112.5,130 112,144 111.5,152 C111,158 110,163 109,168',                               [114, 118], [109, 168]],
  'Intersphincteric': ['M114,118 C109,119 103,120 100.5,126 L100.5,150 C100.5,157 101.5,162 102,168',                  [114, 118], [102, 168]],
  'Transsphincteric': ['M114,118 C104,120 90,124 76,128 C64,132 58,150 54,169',                                        [114, 118], [54, 169]],
  'Suprasphincteric': ['M114,118 C108,118 101,116 100.5,108 L100.5,84 C100.5,70 92,62 82,62 C70,62 62,70 58,80 C53,100 48,140 44,170', [114, 118], [44, 170]],
  'Extrasphincteric': ['M105,40 C92,44 74,54 64,68 C58,78 55,86 52,100 C48,124 44,148 38,170',                          [105, 40], [38, 170]],
};
var FIS_ORDER = ['Submucosal', 'Intersphincteric', 'Transsphincteric', 'Suprasphincteric', 'Extrasphincteric'];

function FistulaAnatomy() {
  var band = { fill: '#e6e6e6', stroke: '#555', strokeWidth: 0.8 };
  return (
    <g>
      <path d="M104,8 C104,40 110,60 113,74 L115,160" fill="none" stroke={INK} strokeWidth="1.4" />
      <path d="M97,8 C97,40 101,60 104,74" fill="none" stroke={INK} strokeWidth="1" />
      {/* levator ani, running up and out from the top of the external sphincter */}
      <path d="M96,91 C74,78 44,62 18,50 L13,59 C40,72 66,86 80,97 Z" {...band} />
      {/* external sphincter, its subcutaneous part curving in under the internal */}
      <path d="M80,94 Q80,90 88,90 Q96,90 96,94 L96,150 Q96,158 98,161 Q99,166 93,166 Q83,164 81,150 Z" {...band} />
      {/* internal sphincter = the thickened end of the rectal circular muscle */}
      <path d="M104,78 Q104,74 107.5,74 Q111,74 111,78 L111,144 Q111,148 107.5,148 Q104,148 104,144 Z" {...band} />
      <path d="M115,160 C108,167 60,169 6,170" fill="none" stroke={INK} strokeWidth="1.4" />
    </g>
  );
}

/* Several types selected = several tracts in one patient. They are all drawn on this one
   section, each in its own line pattern with a legend underneath. Separate sections side
   by side were tried first: they no longer fit beside the detail table, dropped onto a
   line of their own, and pushed a note with ordinary-length findings onto a second page.
   Patterns rather than colours, so a mono printer keeps them apart. */
var FIS_DASH = [null, '7 3.5', '2.4 2.6', '10 3 2.4 3', '4 2'];
var FIS_LEG = 12;                               // legend row height, viewBox units

export function FistulaSection(props) {
  var picks = sel(props.tractType).filter(function (k) { return !!FIS_TRACT[k]; });
  var ts = FIS_ORDER.filter(function (k) { return picks.indexOf(k) >= 0; });
  var t = ts[0] || null;
  var tr = t ? FIS_TRACT[t] : null;
  var multi = ts.length > 1;
  var H = FIS_H + (multi ? 4 + FIS_LEG * ts.length : 0);
  var dw = props.width || 200;
  var lab = { fontSize: 10.5, fill: '#666' };   // ~8 px at the 200 px it prints at
  return (
    <svg width={FIS_W} height={H} viewBox={'0 0 ' + FIS_W + ' ' + H}
         style={{ flex: 'none', width: dw, height: Math.round(dw * H / FIS_W) }}>
      <FistulaAnatomy />
      <g transform={'matrix(-1 0 0 1 ' + FIS_W + ' 0)'}><FistulaAnatomy /></g>
      <line x1={114} y1={118} x2={146} y2={118} stroke={FAINT} strokeWidth="1" strokeDasharray="3 2" />

      {/* labels live on the right half, clear of the tract */}
      <line x1={153} y1={82} x2={168} y2={66} stroke="#999" strokeWidth="0.6" />
      <text x={170} y={66} {...lab}>IAS</text>
      <line x1={178} y1={140} x2={196} y2={146} stroke="#999" strokeWidth="0.6" />
      <text x={198} y={149} {...lab}>EAS</text>
      <text x={196} y={44} {...lab}>levator ani</text>
      <line x1={146} y1={118} x2={196} y2={120} stroke="#999" strokeWidth="0.6" />
      <text x={198} y={123} {...lab}>dentate</text>

      {ts.map(function (k, i) {
        var r = FIS_TRACT[k], dash = FIS_DASH[i % FIS_DASH.length];
        return <g key={k}>
          <path d={r[0]} fill="none" stroke={MARK} strokeWidth="2.4"
                strokeLinecap={dash ? 'butt' : 'round'} strokeDasharray={dash || undefined} />
          <circle cx={r[1][0]} cy={r[1][1]} r="3.6" fill={MARK} />
          <circle cx={r[2][0]} cy={r[2][1]} r="3.6" fill={MARK} />
        </g>;
      })}
      {/* int./ext. once, on the first tract: enough to say what the dots are, and the
          external openings of two tracts can sit a few units apart. */}
      {tr ? <g>
        <text x={tr[1][0] + 5} y={tr[1][1] + 12} fontSize="9.5" fontWeight="700" fill={MARK}>int.</text>
        <text x={tr[2][0]} y={FIS_H - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={MARK}>ext.</text>
      </g> : null}
      {multi ? ts.map(function (k, i) {
        var y = FIS_H + 4 + FIS_LEG * i + 8, dash = FIS_DASH[i % FIS_DASH.length];
        return <g key={'leg' + k}>
          <line x1={8} y1={y - 3.5} x2={34} y2={y - 3.5} stroke={MARK} strokeWidth="2.4"
                strokeLinecap={dash ? 'butt' : 'round'} strokeDasharray={dash || undefined} />
          <text x={40} y={y} fontSize="10.5" fontWeight="700" fill={MARK}>{k}</text>
        </g>;
      }) : (
        <text x={FIS_W - 4} y={13} textAnchor="end" fontSize="10.5" fontWeight={t ? 700 : 400} fill={t ? MARK : '#999'}>
          {t || 'tract type not selected'}
        </text>
      )}
    </svg>
  );
}

/* ── Hernia panels (hernia) ───────────────────────────────────────────────────
   The clinic's own drawings, one panel per type, and only the selected type(s) get
   printed. The paper form shows all eight side by side because the surgeon rings one
   with a pen; a record that already knows the answer does not need the other seven,
   and dropping them is what lets each panel print several times larger.

   The panel name is SVG text, not part of the image - see op-plates.js. */
var PANEL_W = 410, PANEL_H = 450, PANEL_CAP = 58;   // a shared box so two selected
// panels line up, rather than each drawing setting its own size.
export function HerniaPlate(props) {
  var picks = sel(props.value).filter(function (k) { return !!HERNIA_PANELS[k]; });
  if (!picks.length) return null;
  return picks.map(function (k) {
    var P = HERNIA_PANELS[k];
    return (
      <svg key={k} width={PANEL_W} height={PANEL_H + PANEL_CAP}
           viewBox={'0 0 ' + PANEL_W + ' ' + (PANEL_H + PANEL_CAP)}
           style={fit(PANEL_W, PANEL_H + PANEL_CAP, props.width || 140)}>
        <image href={P.src} xlinkHref={P.src} width={P.w} height={P.h}
               x={(PANEL_W - P.w) / 2} y={(PANEL_H - P.h) / 2} />
        <text x={PANEL_W / 2} y={PANEL_H + 40} textAnchor="middle"
              fontSize="31" fontWeight="700" fill={MARK}>{P.cap}</text>
      </svg>
    );
  });
}

/* ── Appendix plate (appendectomy) ────────────────────────────────────────────
   The clinic's own cecum drawing with its leader lines, labelled here in vector text.
   Unlike the hernia sheet this is a single anatomical drawing, so there is no panel to
   drop: every position points into the same cecum. The selected position is therefore
   set in solid black and ringed, and the rest stay faint - a leader line whose word had
   been removed would just look like a line drawn to nowhere.

   ANATOMY are landmarks rather than choices, so they never take the mark. */
var APPY_ANATOMY = ['Free taenia', 'Ileum', 'Cecum'];
var APPY_ANCHOR_SIDE = {                     // which way each word reads off its leader
  'Preileal': 'start', 'Postileal': 'start', 'Ileum': 'start', 'Pelvic': 'start',
  'Retrocecal': 'end',
  'Free taenia': 'middle', 'Cecum': 'middle', 'Subcecal': 'middle',
};
// The plate prints at ~240 px beside the detail table. At that size the old 42-unit words
// came out around 7 px; 54 keeps them near 9 px, and the viewBox widens so the longest
// ones (Postileal, Retrocecal) still fit.
var APPY_FS = 54;
export function AppendixPlate(props) {
  var picks = sel(props.value);
  var P = APPENDIX_PLATE;
  // Several labels sit off the plate (the words were erased from its edges), so the
  // viewBox is wider and taller than the image on every side.
  var VB = { x: -175, y: -110, w: 1470, h: 1680 };
  var keys = Object.keys(APPENDIX_ANCHORS);
  return (
    <svg width={VB.w} height={VB.h} viewBox={VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h}
         style={fit(VB.w, VB.h, props.width || 240)}>
      <image href={P.src} xlinkHref={P.src} x="0" y="0" width={P.w} height={P.h} />
      {keys.map(function (k) {
        var a = APPENDIX_ANCHORS[k];
        var anch = APPY_ANCHOR_SIDE[k] || 'start';
        var on = picks.indexOf(k) >= 0;
        var isAnat = APPY_ANATOMY.indexOf(k) >= 0;
        var x = anch === 'end' ? a[1] : anch === 'middle' ? (a[0] + a[1]) / 2 : a[0];
        var y = a[2] + APPY_FS * 0.36;       // a[2] is the word's middle, not its baseline
        var w = k.length * APPY_FS * 0.5, box = null;
        if (on) {
          var bx = anch === 'end' ? x - w : anch === 'middle' ? x - w / 2 : x;
          box = <rect x={bx - 9} y={a[2] - APPY_FS * 0.62} width={w + 18} height={APPY_FS * 1.24}
                      rx={APPY_FS * 0.5} fill="none" stroke={MARK} strokeWidth="3" />;
        }
        return (
          <g key={k}>
            {box}
            <text x={x} y={y} textAnchor={anch} fontSize={APPY_FS}
                  fontWeight={on ? 700 : 400} fill={on ? MARK : isAnat ? '#6d6d6d' : '#8a8a8a'}>{k}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* Pick the figure block for a template, given the record's values. Returns null when a
   template has no figure or nothing has been selected yet - an empty diagram on a signed
   record reads as "normal", which it does not mean. */
export function OpFigures(props) {
  var v = props.values || {}, kind = props.figure;
  if (kind === 'anal') {
    if (!sel(v.position).length && !sel(v.position2).length) return null;
    return <FigBox caption="Pile position (lithotomy view)">
      <AnalClock value={v.position} title="pre-op" />
      {sel(v.position2).length ? <AnalClock value={v.position2} title="post-op / additional" /> : null}
    </FigBox>;
  }
  if (kind === 'fistula') {
    // Each drawing only when its own fields were filled: a dial with no openings on it,
    // or a section with no tract, would read as "none found".
    var openings = sel(v.extOpening).length || sel(v.intOpening).length;
    var tract = sel(v.tractType).length;
    if (!openings && !tract) return null;
    // Every selected type is drawn in the one section (see FistulaSection) - drawing
    // only the first left the table saying two types beside a figure showing one.
    return <FigBox caption="Openings (lithotomy view) and tract">
      {openings ? <FistulaClock internal={v.intOpening} external={v.extOpening} width={124} /> : null}
      {tract ? <FistulaSection tractType={v.tractType} width={200} /> : null}
    </FigBox>;
  }
  // The next three carry their own labels (R/L, the panel name, the ringed position),
  // so a caption line above them would only repeat the detail row beside them.
  if (kind === 'breast') {
    if (!sel(v.side).length && !sel(v.quadrant).length) return null;
    return <FigBox><BreastMap side={v.side} quadrant={v.quadrant} /></FigBox>;
  }
  if (kind === 'hernia') {
    if (!sel(v.herniaType).length) return null;
    return <FigBox><HerniaPlate value={v.herniaType} /></FigBox>;
  }
  if (kind === 'appendix') {
    if (!sel(v.appyPosition).length) return null;
    return <FigBox><AppendixPlate value={v.appyPosition} width={230} /></FigBox>;
  }
  return null;
}
