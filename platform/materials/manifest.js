// ============================================================================
// manifest.js — the platform's shared material library index.
//
// These are the Look Book's seamless photographic fields, promoted to a
// platform asset so every project renders from ONE library instead of
// per-project procedural fills. Each entry:
//
//   id      stable key stored in design state (yamazina.<project>.work)
//   name    label for pickers
//   cat     'tile' | 'wood' | 'stone'
//   file    path relative to the repo root (apps prefix with their own
//           offset — both apps/<x>/ pages use '../../' + file)
//   spanW/spanH  PHYSICAL inches one image repeat covers — this is what
//           makes the photo read at true scale: consumers set
//           texture.repeat = surface_inches / span. Spans follow the tile
//           sizes stated in the Look Book (e.g. 48x24 running bond staggered
//           half = a 96x48 seamless unit).
//   tone    representative hex, used to nearest-match a zone's chosen color
//           to a colorway.
// ============================================================================
(function () {
  'use strict';
  var DIR = 'platform/materials/';
  window.MATERIAL_LIBRARY = [
    // ---- running bond 48x24, half stagger (2x2 tile seamless unit) ----
    { id: 'running-greenstone', name: 'Running bond 48×24 — green stone', cat: 'tile', file: DIR + 'running-half-greenstone.png', spanW: 96, spanH: 48, tone: '#6f695c' },
    { id: 'running-ivory',      name: 'Running bond 48×24 — ivory',       cat: 'tile', file: DIR + 'running-half-ivory.png',      spanW: 96, spanH: 48, tone: '#6b6250' },
    { id: 'running-sand',       name: 'Running bond 48×24 — sand',        cat: 'tile', file: DIR + 'running-half-sand.png',       spanW: 96, spanH: 48, tone: '#705e42' },
    { id: 'running-charcoal',   name: 'Running bond 48×24 — charcoal',    cat: 'tile', file: DIR + 'running-half-charcoal.png',   spanW: 96, spanH: 48, tone: '#484641' },
    { id: 'running-olive',      name: 'Running bond 48×24 — olive',       cat: 'tile', file: DIR + 'running-half-olive.png',      spanW: 96, spanH: 48, tone: '#58563c' },
    { id: 'running-ochre',      name: 'Running bond 48×24 — ochre',       cat: 'tile', file: DIR + 'running-half-ochre.png',      spanW: 96, spanH: 48, tone: '#725928' },
    { id: 'running-oxblood',    name: 'Running bond 48×24 — oxblood',     cat: 'tile', file: DIR + 'running-half-oxblood.png',    spanW: 96, spanH: 48, tone: '#5c3939' },
    { id: 'running-slateblue',  name: 'Running bond 48×24 — slate blue',  cat: 'tile', file: DIR + 'running-half-slate-blue.png', spanW: 96, spanH: 48, tone: '#4c555d' },
    { id: 'running-terracotta', name: 'Running bond 48×24 — terracotta',  cat: 'tile', file: DIR + 'running-half-terracotta.png', spanW: 96, spanH: 48, tone: '#7e4b39' },
    // ---- other bonds ----
    { id: 'stack-greenstone',   name: 'Stack bond 12×12 — green stone',   cat: 'tile', file: DIR + 'stack-greenstone.png',   spanW: 24, spanH: 24, tone: '#6e6759' },
    { id: 'large-mineral',      name: 'Large format 36×24 — dark mineral',cat: 'tile', file: DIR + 'large-format-mineral.png', spanW: 72, spanH: 48, tone: '#443b26' },
    { id: 'brick-mineral',      name: 'Brick bond — dark mineral',        cat: 'tile', file: DIR + 'brick-mineral.png',      spanW: 32, spanH: 16, tone: '#3c3420' },
    { id: 'chevron-greenstone', name: 'Chevron — green stone',            cat: 'tile', file: DIR + 'chevron-greenstone.png', spanW: 36, spanH: 36, tone: '#746e61' },
    { id: 'chevron-mineral',    name: 'Chevron — dark mineral',           cat: 'tile', file: DIR + 'chevron-mineral.png',    spanW: 36, spanH: 36, tone: '#635239' },
    { id: 'subway-marble',      name: 'Subway 12×6 — pale marble',        cat: 'tile', file: DIR + 'subway-marble.png',      spanW: 24, spanH: 24, tone: '#b5aea5' },
    { id: 'third-offset',       name: 'Plank 24×4, ⅓ offset — marble',    cat: 'tile', file: DIR + 'third-offset-marble.png', spanW: 72, spanH: 24, tone: '#b2aaa0' },
    { id: 'hex-travertine',     name: 'Hexagon 6″ — travertine',          cat: 'tile', file: DIR + 'hexagon-travertine.png', spanW: 21, spanH: 18, tone: '#a39284' },
    { id: 'penny-travertine',   name: 'Penny round 2″ — travertine',      cat: 'tile', file: DIR + 'penny-round-travertine.png', spanW: 12, spanH: 12, tone: '#a09487' },
    { id: 'penny-marble',       name: 'Penny round 2″ — marble',          cat: 'tile', file: DIR + 'penny-round-marble.png', spanW: 12, spanH: 12, tone: '#9f998e' },
    // ---- stone fields ----
    { id: 'travertine-floor',   name: 'Travertine slab floor',            cat: 'stone', file: DIR + 'travertine-floor.png',  spanW: 48, spanH: 48, tone: '#b29e8c' },
    { id: 'floor-stone',        name: 'Warm stone floor',                 cat: 'stone', file: DIR + 'floor-stone.png',       spanW: 48, spanH: 48, tone: '#655a4b' },
    // ---- woods ----
    { id: 'teak',               name: 'Teak',                             cat: 'wood', file: DIR + 'teak.png',               spanW: 24, spanH: 24, tone: '#814d22' },
    { id: 'walnut-slab',        name: 'Dark walnut slab',                 cat: 'wood', file: DIR + 'dark-walnut-slab.png',   spanW: 24, spanH: 24, tone: '#5b4330' },
    { id: 'waterfall-walnut',   name: 'Waterfall walnut',                 cat: 'wood', file: DIR + 'waterfall-walnut.png',   spanW: 24, spanH: 24, tone: '#5d4234' },
    { id: 'smoked-oak',         name: 'Smoked oak',                       cat: 'wood', file: DIR + 'smoked-oak.png',         spanW: 24, spanH: 24, tone: '#44352c' },
  ];

  window.MATERIAL_LIBRARY.byId = function (id) {
    for (var i = 0; i < window.MATERIAL_LIBRARY.length; i++)
      if (window.MATERIAL_LIBRARY[i].id === id) return window.MATERIAL_LIBRARY[i];
    return null;
  };

  // Nearest library entry for a zone: filter by rough tile size / finish,
  // then pick the colorway closest to the zone's chosen color. Shared by the
  // bathroom 3D's auto-mapping; pickers use the list directly.
  window.MATERIAL_LIBRARY.matchSurf = function (surf) {
    if (!surf || surf.fin === 'paint') return null;
    var L = window.MATERIAL_LIBRARY;
    function hex2rgb(h) {
      h = (h || '#999999').replace('#', '');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    function dist(a, b) {
      var x = hex2rgb(a), y = hex2rgb(b);
      return (x[0]-y[0])*(x[0]-y[0]) + (x[1]-y[1])*(x[1]-y[1]) + (x[2]-y[2])*(x[2]-y[2]);
    }
    var pool;
    var tl = surf.tileL || 0, tw = surf.tileW || 0, pat = surf.pattern || '';
    if (surf.shape === 'hex') pool = ['hex-travertine'];
    else if (surf.shape === 'penny') pool = ['penny-travertine', 'penny-marble'];
    else if (pat === 'herring' || pat === 'chevron') pool = ['chevron-greenstone', 'chevron-mineral'];
    else if (tl >= 40 && tw >= 20) pool = ['running-greenstone','running-ivory','running-sand','running-charcoal','running-olive','running-ochre','running-oxblood','running-slateblue','running-terracotta'];
    else if (tl >= 30) pool = ['large-mineral'];
    else if (tl === 12 && tw === 12) pool = ['stack-greenstone'];
    else if (tl === 12 && tw <= 6) pool = ['subway-marble'];
    else if (tw <= 4) pool = ['third-offset'];
    else if (surf.fin === 'stone') pool = ['travertine-floor', 'floor-stone', 'large-mineral'];
    else pool = ['running-greenstone','running-ivory','running-sand','running-charcoal'];
    var best = null, bestD = Infinity;
    pool.forEach(function (id) {
      var e = L.byId(id);
      if (!e) return;
      var d = dist(surf.color, e.tone);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  };
})();
