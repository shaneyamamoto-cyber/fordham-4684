// ============================================================================
// sync.js — the sauna's 2D<->3D harmonization bridge (loads last).
//
// The 3D app already has a complete serializable design state
// (getDesignState / applyDesignState). This file wires that state into the
// platform's shared "work" slot so the 2D plan editor (plan.html) and this
// 3D build stay one design:
//
//   boot   — if the work slot has state (left by the 2D plan, or by a prior
//            3D session), apply it. applyDesignState routes everything
//            through the real setters, which re-clamp — so state written by
//            the (looser) 2D editor is always forced legal here.
//   save   — poll-and-diff every 1.5s; write the work slot only when the
//            serialized state actually changed. Cheap (state build is a
//            plain object walk) and avoids hooking every setter.
//   listen — storage events from OTHER tabs (the 2D plan) re-apply live.
// ============================================================================
(function () {
  'use strict';

  var store = window.PlatformStore('sauna');
  var lastJson = '';
  var applying = false;

  function applyEnvelope(env) {
    if (!env || !env.state || !window.applyDesignState) return false;
    applying = true;
    try {
      window.applyDesignState(env.state);
      lastJson = JSON.stringify(env.state);
      return true;
    } catch (e) {
      console.error('sauna sync: failed to apply shared work state', e);
      return false;
    } finally {
      applying = false;
    }
  }

  // ---- boot: pick up whatever the 2D plan (or last session) left ----
  applyEnvelope(store.loadWork());

  // ---- autosave: keep the work slot current for the 2D plan ----
  setInterval(function () {
    if (applying || !window.getDesignState) return;
    var s, j;
    try { s = window.getDesignState(); j = JSON.stringify(s); }
    catch (e) { return; }
    if (j === lastJson) return;
    lastJson = j;
    store.saveWork(s, '3d');
  }, 1500);

  // ---- live cross-tab sync: a drag in the open 2D plan lands here ----
  store.onWorkChange(function (env) {
    if (!env || env.by === '3d') return;
    if (env.state && JSON.stringify(env.state) === lastJson) return;
    applyEnvelope(env);
  });
})();
