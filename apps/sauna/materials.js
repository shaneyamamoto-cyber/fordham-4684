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
    if (file.indexOf('data:') === 0) return file; // 4684 pack maps are data URIs
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
        e.mat.normalMap = null;      // cedar defaults carry bump, not PBR maps
        e.mat.roughnessMap = null;
        e.mat.color.setHex(saved[group][i].color);
        e.mat.needsUpdate = true;
      });
      current[group] = '';
      return true;
    }
    var lib = LIB.byId(id);
    if (!lib && id.indexOf('lb4684-') === 0 && LIB.ensurePack) {
      // a 4684 sample-book pick arrived before the pack was loaded — pull
      // the pack in, then re-apply for real
      LIB.ensurePack(BASE, function () {
        if (LIB.byId(id)) window.setSurfaceLibraryMaterial(group, id);
      });
      current[group] = id; // keep the intent so the state round-trips
      return true;
    }
    if (!lib) return false;
    // Full PBR set where the library carries it: diffuse + normal/rough/bump
    // maps, all repeated at the surface's true physical scale.
    function loadOne(path, srgb) {
      return new Promise(function (res) {
        if (!path) return res(null);
        loader.load(resolveFile(path), function (t) {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          if (srgb) t.encoding = THREE.sRGBEncoding;
          t.anisotropy = maxAniso;
          res(t);
        }, undefined, function () { res(null); });
      });
    }
    Promise.all([loadOne(lib.file, true), loadOne(lib.normal), loadOne(lib.rough), loadOne(lib.bump)])
      .then(function (r) {
        var map = r[0], nrm = r[1], rgh = r[2], bmp = r[3];
        if (!map) return;
        entries.forEach(function (e) {
          function mk(t) {
            if (!t) return null;
            var c = t.clone();
            c.repeat.set(e.span[0] / lib.spanW, e.span[1] / lib.spanH);
            c.needsUpdate = true;
            return c;
          }
          e.mat.map = mk(map);
          e.mat.normalMap = mk(nrm);
          if (nrm) e.mat.normalScale = new THREE.Vector2(0.55, 0.55);
          e.mat.roughnessMap = mk(rgh);
          if (rgh) e.mat.roughness = 1.0;
          e.mat.bumpMap = mk(bmp);
          // Species tint if the entry has one; otherwise leave the photo
          // untinted. The tone sliders still multiply on top if used.
          e.mat.color.set(lib.tint || '#ffffff');
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
