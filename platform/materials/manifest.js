// ============================================================================
// manifest.js — the platform's shared material library index.
//
// The Look Book's seamless photographic fields plus the sauna's PBR wood
// sets, promoted to a platform asset so every project renders from ONE
// library. Each entry:
//
//   id       stable key stored in design state (yamazina.<project>.work)
//   name     label for pickers
//   cat      'tile' | 'wood' | 'stone'
//   file     diffuse map, path relative to the repo root (apps prefix with
//            their own offset — both apps/<x>/ pages use '../../' + file)
//   normal   optional tangent-space normal map (tile normals are generated
//            from the diffuse's luminance — grout and relief emboss true)
//   rough    optional roughness map
//   bump     optional bump map
//   tint     optional hex — multiply color for species variants that share
//            one grain photo (consumers set material.color to this instead
//            of white)
//   spanW/spanH  PHYSICAL inches one image repeat covers, VERIFIED against
//            the actual images (e.g. the running-bond field is one 48x24
//            tile plus two half-offset tiles: a 48x48 seamless unit).
//            Consumers set texture.repeat = surface_inches / span.
//   tone     average color sampled from the actual image, for nearest-
//            colorway matching.
// ============================================================================
(function () {
  'use strict';
  var DIR = 'platform/materials/';
  var NRM = DIR + 'normals/';
  window.MATERIAL_LIBRARY = [
    // ---- running bond 48x24, half stagger (1 tile + 2 halves = 48x48 unit) ----
    { id: 'running-greenstone', name: 'Running bond 48×24 — green stone', cat: 'tile', file: DIR + 'running-half-greenstone.png', normal: NRM + 'running-half-greenstone-n.png', spanW: 48, spanH: 48, tone: '#6f695c' },
    { id: 'running-ivory',      name: 'Running bond 48×24 — ivory',       cat: 'tile', file: DIR + 'running-half-ivory.png',      normal: NRM + 'running-half-ivory-n.png',      spanW: 48, spanH: 48, tone: '#6b6250' },
    { id: 'running-sand',       name: 'Running bond 48×24 — sand',        cat: 'tile', file: DIR + 'running-half-sand.png',       normal: NRM + 'running-half-sand-n.png',       spanW: 48, spanH: 48, tone: '#705e42' },
    { id: 'running-charcoal',   name: 'Running bond 48×24 — charcoal',    cat: 'tile', file: DIR + 'running-half-charcoal.png',   normal: NRM + 'running-half-charcoal-n.png',   spanW: 48, spanH: 48, tone: '#484641' },
    { id: 'running-olive',      name: 'Running bond 48×24 — olive',       cat: 'tile', file: DIR + 'running-half-olive.png',      normal: NRM + 'running-half-olive-n.png',      spanW: 48, spanH: 48, tone: '#58563c' },
    { id: 'running-ochre',      name: 'Running bond 48×24 — ochre',       cat: 'tile', file: DIR + 'running-half-ochre.png',      normal: NRM + 'running-half-ochre-n.png',      spanW: 48, spanH: 48, tone: '#725928' },
    { id: 'running-oxblood',    name: 'Running bond 48×24 — oxblood',     cat: 'tile', file: DIR + 'running-half-oxblood.png',    normal: NRM + 'running-half-oxblood-n.png',    spanW: 48, spanH: 48, tone: '#5c3939' },
    { id: 'running-slateblue',  name: 'Running bond 48×24 — slate blue',  cat: 'tile', file: DIR + 'running-half-slate-blue.png', normal: NRM + 'running-half-slate-blue-n.png', spanW: 48, spanH: 48, tone: '#4c555d' },
    { id: 'running-terracotta', name: 'Running bond 48×24 — terracotta',  cat: 'tile', file: DIR + 'running-half-terracotta.png', normal: NRM + 'running-half-terracotta-n.png', spanW: 48, spanH: 48, tone: '#7e4b39' },
    // ---- other bonds (spans read off the actual repeat units) ----
    { id: 'stack-greenstone',   name: 'Stack bond 12×12 — green stone',   cat: 'tile', file: DIR + 'stack-greenstone.png',   normal: NRM + 'stack-greenstone-n.png',   spanW: 12, spanH: 12, tone: '#6e6759' },
    { id: 'large-mineral',      name: 'Large format 36×24 — dark mineral',cat: 'tile', file: DIR + 'large-format-mineral.png', normal: NRM + 'large-format-mineral-n.png', spanW: 48, spanH: 34, tone: '#443b26' },
    { id: 'brick-mineral',      name: 'Brick bond — dark mineral',        cat: 'tile', file: DIR + 'brick-mineral.png',      normal: NRM + 'brick-mineral-n.png',      spanW: 24, spanH: 12, tone: '#3c3420' },
    { id: 'chevron-greenstone', name: 'Chevron — green stone',            cat: 'tile', file: DIR + 'chevron-greenstone.png', normal: NRM + 'chevron-greenstone-n.png', spanW: 24, spanH: 24, tone: '#746e61' },
    { id: 'chevron-mineral',    name: 'Chevron — dark mineral',           cat: 'tile', file: DIR + 'chevron-mineral.png',    normal: NRM + 'chevron-mineral-n.png',    spanW: 24, spanH: 24, tone: '#635239' },
    { id: 'subway-marble',      name: 'Subway 12×6 — pale marble',        cat: 'tile', file: DIR + 'subway-marble.png',      normal: NRM + 'subway-marble-n.png',      spanW: 12, spanH: 12, tone: '#b5aea5' },
    { id: 'third-offset',       name: 'Plank 24×4, ⅓ offset — marble',    cat: 'tile', file: DIR + 'third-offset-marble.png', normal: NRM + 'third-offset-marble-n.png', spanW: 24, spanH: 16, tone: '#b2aaa0' },
    { id: 'hex-travertine',     name: 'Hexagon 6″ — travertine',          cat: 'tile', file: DIR + 'hexagon-travertine.png', normal: NRM + 'hexagon-travertine-n.png', spanW: 21, spanH: 18, tone: '#a39284' },
    { id: 'penny-travertine',   name: 'Penny round 2″ — travertine',      cat: 'tile', file: DIR + 'penny-round-travertine.png', normal: NRM + 'penny-round-travertine-n.png', spanW: 12, spanH: 12, tone: '#a09487' },
    { id: 'penny-marble',       name: 'Penny round 2″ — marble',          cat: 'tile', file: DIR + 'penny-round-marble.png', normal: NRM + 'penny-round-marble-n.png', spanW: 12, spanH: 12, tone: '#9f998e' },
    // ---- stone fields ----
    { id: 'travertine-floor',   name: 'Travertine slab floor',            cat: 'stone', file: DIR + 'travertine-floor.png',  normal: NRM + 'travertine-floor-n.png',  spanW: 48, spanH: 48, tone: '#b29e8c' },
    { id: 'floor-stone',        name: 'Warm stone floor',                 cat: 'stone', file: DIR + 'floor-stone.png',       normal: NRM + 'floor-stone-n.png',       spanW: 48, spanH: 48, tone: '#655a4b' },
    // ---- woods: real seamless PBR sets (from the sauna's asset pack).
    //      One grain photo, species via tint — same trick real spec sheets
    //      pull with stained veneer. ----
    { id: 'wood-golden',  name: 'Golden hardwood — PBR', cat: 'wood', file: DIR + 'wood1Diff.jpg', rough: DIR + 'wood1Rough.jpg', normal: DIR + 'wood1Normal.png', spanW: 36, spanH: 36, tone: '#b07f52' },
    { id: 'wood-blond',   name: 'Blond hardwood — PBR',  cat: 'wood', file: DIR + 'wood8Diff.jpg', rough: DIR + 'wood8Rough.jpg', normal: DIR + 'wood8Normal.png', spanW: 36, spanH: 36, tone: '#c99a68' },
    { id: 'wood-walnut',  name: 'Walnut (stained) — PBR', cat: 'wood', file: DIR + 'wood1Diff.jpg', rough: DIR + 'wood1Rough.jpg', normal: DIR + 'wood1Normal.png', tint: '#8a6a4e', spanW: 36, spanH: 36, tone: '#5e4630' },
    { id: 'wood-teak',    name: 'Teak (stained) — PBR',   cat: 'wood', file: DIR + 'wood8Diff.jpg', rough: DIR + 'wood8Rough.jpg', normal: DIR + 'wood8Normal.png', tint: '#b28a55', spanW: 36, spanH: 36, tone: '#a3743e' },
    { id: 'cedar',        name: 'Cedar T&G — photographic', cat: 'wood', file: DIR + 'cedarDiff.jpg', bump: DIR + 'cedarBump.jpg', spanW: 24, spanH: 24, tone: '#c49a6c' },
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
