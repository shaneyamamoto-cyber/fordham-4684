// ============================================================================
// store.js — shared project persistence for the YamaZina design platform.
//
// Every project (sauna, bathroom, future modules) gets a namespaced slice of
// localStorage through one API, instead of each prototype inventing its own
// key scheme. Two slots per project:
//
//   versions — the named, deliberately saved design states (the "locked"
//              list each project's Versions panel renders).
//   work     — the LIVE design state, autosaved as the user edits. This is
//              the harmonization channel: the 2D plan editor and the 3D
//              build of the same project both read and write this slot, so
//              an edit in either view survives a reload of the other and
//              (via the storage event) syncs across open tabs immediately.
//
// Keys: "yamazina.<project>.versions.v1" / "yamazina.<project>.work.v1".
// Legacy single-app keys are migrated in place on first construction so
// nobody loses saved designs when a project moves onto the platform.
// ============================================================================
(function () {
  'use strict';

  var PREFIX = 'yamazina.';

  // legacy key -> {project, slot} — how pre-platform prototypes stored data.
  // Migration is a raw string copy: each project owns its slot's SHAPE
  // (sauna versions: bare array; bathroom versions: {versions, current, ...}),
  // the platform owns the KEY namespace. The loadVersions/saveVersions
  // conveniences below assume the array shape — projects with richer shapes
  // read their slots through their own code against the same keys.
  var MIGRATIONS = [
    { legacyKey: 'sauna3d_versions_v1', project: 'sauna', slot: 'versions' },
    { legacyKey: 'bathPlanner.v1', project: 'bathroom', slot: 'versions' },
    { legacyKey: 'bathPlanner.work.v1', project: 'bathroom', slot: 'work' },
  ];

  function key(project, slot) {
    return PREFIX + project + '.' + slot + '.v1';
  }

  function migrate(project) {
    MIGRATIONS.forEach(function (m) {
      if (m.project !== project) return;
      try {
        var newKey = key(project, m.slot);
        if (localStorage.getItem(newKey) != null) return; // already on platform keys
        var old = localStorage.getItem(m.legacyKey);
        if (old != null) localStorage.setItem(newKey, old);
        // Legacy key intentionally left in place — an old copy of the
        // standalone prototype might still be reading it. Harmless to keep.
      } catch (e) { /* storage unavailable — nothing to migrate */ }
    });
  }

  window.PlatformStore = function (project) {
    if (!project) throw new Error('PlatformStore: project id required');
    migrate(project);

    var versionsKey = key(project, 'versions');
    var workKey = key(project, 'work');

    function loadJSON(k, fallback) {
      try { var raw = localStorage.getItem(k); return raw == null ? fallback : JSON.parse(raw); }
      catch (e) { return fallback; }
    }
    function saveJSON(k, value) {
      try { localStorage.setItem(k, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    }

    return {
      project: project,
      versionsKey: versionsKey,
      workKey: workKey,

      // ----- named versions (the deliberate saves) -----
      loadVersions: function () { return loadJSON(versionsKey, []); },
      saveVersions: function (list) { return saveJSON(versionsKey, list); },

      // ----- live work state (the 2D<->3D harmonization channel) -----
      // Envelope: {state, savedAt, by} — `by` identifies which editor wrote
      // it ('2d' | '3d' | ...) so a view can ignore echoes of its own writes.
      loadWork: function () { return loadJSON(workKey, null); },
      saveWork: function (state, by) {
        return saveJSON(workKey, { state: state, savedAt: new Date().toISOString(), by: by || '' });
      },
      clearWork: function () {
        try { localStorage.removeItem(workKey); } catch (e) { /* ignore */ }
      },

      // Fires cb(workEnvelope) when ANOTHER tab writes this project's work
      // slot (storage events never fire in the tab that wrote). This is what
      // makes a drag in the 2D plan show up live in an open 3D tab.
      onWorkChange: function (cb) {
        window.addEventListener('storage', function (ev) {
          if (ev.key !== workKey) return;
          var env = null;
          try { env = ev.newValue == null ? null : JSON.parse(ev.newValue); } catch (e) { return; }
          cb(env);
        });
      },
    };
  };
})();
