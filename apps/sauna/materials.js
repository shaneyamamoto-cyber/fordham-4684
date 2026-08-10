// ============================================================================
// materials.js — Look Book library materials for the sauna (loads after
// app.js, before ui.js/sync.js).
//
// Lets the sauna's three big surfaces — walls, floor, bench — swap their
// default cedar for any photographic field in the shared platform library
// (platform/materials/manifest.js), at true physical scale. The choice lives
// in the design state as `libraryMats: {walls, floor, bench}` (library ids,
// '' = cedar default), added by wrapping getDesignState/applyDesignState so
// app.js needs no surgery and the 2D sheet can drive it through the normal
// work-state channel.
// ============================================================================
(function () {
  'use strict';
  var LIB = window.MATERIAL_LIBRARY;
  if (!LIB) { console.warn('materials.js: manifest not loaded'); return; }

  var BASE = '../../'; // repo root relative to apps/sauna/
  function resolveFile(file) {
    // Single-file bundles inject window.__MATLIB_DATA = {path: dataURI} so
    // the library still works with no filesystem around it.
    if (window.__MATLIB_DATA && window.__MATLIB_DATA[file]) return window.__MATLIB_DATA[file];
    return BASE + file;
  }

  var loader = new THREE.TextureLoader();
  var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;

  // Surface groups: the materials each id touches + the physical inches the
  // texture must span across that surface (repeat = span / entry span).
  var GROUPS = {
    walls: [
      { mat: woodWall,      span: [WIDTH * 12, CEIL_FLAT * 12] },
      { mat: woodWallFront, span: [WIDTH * 12, CEIL_FLAT * 12] },
      { mat: woodWallSide,  span: [DEPTH * 12, CEIL_FLAT * 12] },
    ],
    floor: [
      { mat: floorMat, span: [WIDTH * 12, DEPTH * 12] },
    ],
    bench: [
      { mat: benchMat, span: [48, 24] },
    ],
  };
  if (typeof closedMat !== 'undefined') GROUPS.bench.push({ mat: closedMat, span: [48, 24] });

  // Remember the cedar defaults so '' restores them exactly.
  var saved = {};
  Object.keys(GROUPS).forEach(function (g) {
    saved[g] = GROUPS[g].map(function (e) {
      return { map: e.mat.map || null, bumpMap: e.mat.bumpMap || null, color: e.mat.color.getHex() };
    });
  });

  var current = { walls: '', floor: '', bench: '' };

  window.setSurfaceLibraryMaterial = function (group, id) {
    var entries = GROUPS[group];
    if (!entries) return false;
    id = id || '';
    if (id === '') {
      entries.forEach(function (e, i) {
        e.mat.map = saved[group][i].map;
        e.mat.bumpMap = saved[group][i].bumpMap;
        e.mat.color.setHex(saved[group][i].color);
        e.mat.needsUpdate = true;
      });
      current[group] = '';
      return true;
    }
    var lib = LIB.byId(id);
    if (!lib) return false;
    loader.load(resolveFile(lib.file), function (tex) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.encoding = THREE.sRGBEncoding;
      tex.anisotropy = maxAniso;
      entries.forEach(function (e) {
        var t = tex.clone();
        t.needsUpdate = true;
        t.repeat.set(e.span[0] / lib.spanW, e.span[1] / lib.spanH);
        e.mat.map = t;
        e.mat.bumpMap = null;         // the photo carries its own relief
        e.mat.color.setHex(0xffffff); // don't tint the photograph; the tone
                                      // sliders still multiply on top if used
        e.mat.needsUpdate = true;
      });
    });
    current[group] = id;
    return true;
  };
  window.getSurfaceLibraryMaterials = function () { return Object.assign({}, current); };

  // ---- design-state integration (wrap, don't edit app.js) ----
  var origGet = window.getDesignState, origApply = window.applyDesignState;
  window.getDesignState = function () {
    var s = origGet();
    s.libraryMats = Object.assign({}, current);
    return s;
  };
  window.applyDesignState = function (st) {
    origApply(st);
    if (st && st.libraryMats) {
      Object.keys(GROUPS).forEach(function (g) {
        var want = st.libraryMats[g] || '';
        if (want !== current[g]) window.setSurfaceLibraryMaterial(g, want);
      });
    }
  };
})();
