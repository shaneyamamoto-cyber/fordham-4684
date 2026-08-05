// ============================================================================
// design_core.js — shared parametric-design core library.
//
// every project file this platform produces — YamaZina Sauna + Ensuite today,
// the standalone Bathroom 2 shell, and future renovation modules (custom
// showers, cabinets, closets, finishing plans). One canonical implementation
// of the pieces every project needs, instead of copy-pasted logic that drifts
// project to project. Framework-light: only window.CoreHelpers.buildInstanced
// touches Three.js (and takes THREE as a parameter rather than assuming a
// global), so this file has no hard dependency load-order requirement beyond
// "before the app script that calls it."
// ============================================================================
(function () {
  'use strict';

  // ---------- Budget Engine ----------
  // A running materials/cost ledger. Each project's app script calls
  // window.Budget.clear() + addItem() to (re)populate it from current design
  // state (see computeBudget() in sauna_app.js for the reference
  // implementation), then reads it back via getBreakdown()/getTotal() to
  // render a live cost summary panel. Every addItem() call should be treated
  // as re-derivable from scratch each time geometry changes — this is a
  // recompute-on-demand ledger, not an incremental one, so there's no risk of
  // stale line items surviving a design change.
  const CATEGORIES = [
    'Framing & Structure',
    'Finish Wood & Cladding',
    'Fixtures & Appliances',
    'Electrical & Lighting',
    'Plumbing',
    'Glass & Glazing',
    'Hardware & Fasteners',
    'Other',
  ];

  let items = []; // {category, name, qty, unit, unitCost, note, placeholder}

  function addItem(entry) {
    const it = Object.assign(
      { category: 'Other', name: '', qty: 0, unit: 'ea', unitCost: 0, note: '', placeholder: false },
      entry
    );
    if (CATEGORIES.indexOf(it.category) === -1) it.category = 'Other';
    items.push(it);
    return it;
  }
  function clear() {
    items = [];
  }
  function getItems() {
    return items.slice();
  }
  function lineTotal(it) {
    return (Number(it.qty) || 0) * (Number(it.unitCost) || 0);
  }
  function getBreakdown() {
    const map = {};
    CATEGORIES.forEach((c) => (map[c] = { total: 0, items: [] }));
    items.forEach((it) => {
      const cat = map[it.category] ? it.category : 'Other';
      map[cat].total += lineTotal(it);
      map[cat].items.push(it);
    });
    return map;
  }
  function getTotal() {
    return items.reduce((s, it) => s + lineTotal(it), 0);
  }
  function hasPlaceholders() {
    return items.some((it) => it.placeholder);
  }
  function toCSV() {
    const rows = [['Category', 'Item', 'Qty', 'Unit', 'Unit Cost', 'Line Total', 'Placeholder?', 'Note']];
    items.forEach((it) =>
      rows.push([
        it.category,
        it.name,
        it.qty,
        it.unit,
        (Number(it.unitCost) || 0).toFixed(2),
        lineTotal(it).toFixed(2),
        it.placeholder ? 'YES - update pricing' : '',
        it.note || '',
      ])
    );
    rows.push(['', '', '', '', 'TOTAL', getTotal().toFixed(2), '', '']);
    return rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  }

  window.Budget = {
    CATEGORIES,
    addItem,
    clear,
    getItems,
    getBreakdown,
    getTotal,
    hasPlaceholders,
    toCSV,
    lineTotal,
  };

  // ---------- Shared Three.js helper ----------
  // Batches a list of identical-geometry placements into a single
  // THREE.InstancedMesh draw call. Generalizes the pattern already proven on
  // the sauna's exterior slats and rail standoff blocks (the fix for the
  // mobile "won't load" bug — too many individual Mesh objects) so future
  // modules — cabinet fronts, shower tile courses, closet shelving pins —
  // reuse one tested implementation instead of re-deriving it per project.
  window.CoreHelpers = {
    buildInstanced: function (THREE, geometry, material, placements) {
      // placements: [{pos:[x,y,z]|Vector3, quat:[x,y,z,w]|Quaternion (optional), scale:[x,y,z]|Vector3 (optional)}]
      const n = placements.length;
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, n));
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3(1, 1, 1);
      placements.forEach(function (p, i) {
        const pos = Array.isArray(p.pos) ? new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]) : p.pos;
        if (p.quat) {
          if (Array.isArray(p.quat)) q.set(p.quat[0], p.quat[1], p.quat[2], p.quat[3]);
          else q.copy(p.quat);
        } else {
          q.set(0, 0, 0, 1);
        }
        if (p.scale) {
          if (Array.isArray(p.scale)) s.set(p.scale[0], p.scale[1], p.scale[2]);
          else s.copy(p.scale);
        } else {
          s.set(1, 1, 1);
        }
        m.compose(pos, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = n;
      return mesh;
    },
  };
})();

