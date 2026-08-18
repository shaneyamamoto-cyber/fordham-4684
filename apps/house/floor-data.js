/* ============================================================================
   Fordham 4684 — MAIN FLOOR canonical geometry
   Measured from the permit scan by black-wall pixel detection at 22.6 px/ft
   (verified against the 12'11" living width, 23'-0" living depth, 18'-11"
   meeting depth). Origin = NW corner. x = east, z = south, y = up. Units: FEET.
   1 ft = 0.3048 m. Consumed by the 2D grid map, the 3D model, and the
   AR/AI export (GLB / OBJ / plan JSON).
   ========================================================================== */
(function (root) {
  const FT_M = 0.3048;
  const CEIL = 8;            // default ceiling height (ft)

  // Rooms: [x0,z0,x1,z1, name, use]
  const ROOMS = [
    [0,    0,   10.3, 18.5, "MEETING ROOM", "room"],
    [0,    18.5,10.3, 23.5, "HALL",         "circ"],
    [10.3, 0,   23.2, 23.5, "LIVING ROOM",  "room"],
    [23.2, 6,   27.5, 23.5, "STAIRS",       "stair"],
    [27.5, 0,   45.6, 23.5, "KITCHEN",      "room"],
    [45.6, 0,   49.3, 9.0,  "BATH HALL",    "circ"],
    [49.3, 0,   56.9, 5.4,  "VANITY",       "bath"],
    [49.3, 5.4, 52.8, 9.0,  "TOILET",       "bath"],
    [52.8, 5.4, 56.9, 9.0,  "SHOWER",       "bath"],
    [45.6, 9.0, 56.9, 13.0, "LAUNDRY",      "util"],
    [45.6, 13.0,56.9, 21.0, "OFFICE",       "room"],
    [45.6, 21.0,56.9, 46.0, "GARAGE",       "garage"],
    [45.6, 32.7,51.0, 35.0, "CLOSET",       "closet"],
    [23.2, 23.5,32.1, 31.0, "FOYER",        "circ"],
    [10.3, 23.5,45.6, 33.0, "COVERED PORCH","porch"],
  ];

  // Walls: {a:[x,z], b:[x,z], ext, ops:[{s,e,kind,h}]}  s/e = ft along wall from a.
  // kind: 'win' | 'door' | 'garage' ; h = opening height (ft). Windows sill computed at build.
  const W = (a,b,ext,ops)=>({a,b,ext:!!ext,ops:ops||[]});
  const win=(s,e,h)=>({s,e,kind:'win',h:h||6});
  const door=(s,e,h)=>({s,e,kind:'door',h:h||6.667});

  const WALLS = [
    /* ---- heated envelope (L-shape) ---- */
    W([0,0],[56.9,0], true, [            // NORTH
        win(2,5,3), win(12,17,6), win(18,23,6), win(30,34,3), win(37,43,6) ]),
    W([56.9,0],[56.9,46], true, []),     // EAST
    W([56.9,46],[45.6,46], true, [ {s:0.5,e:12.5,kind:'garage',h:7.5} ]), // GARAGE S (12' door)
    W([45.6,46],[45.6,23.5], true, []),  // right-column west (lower, faces porch/garage)
    W([45.6,23.5],[32.1,23.5], true, [ win(6,11,5) ]),   // main body S (kitchen side)
    W([32.1,23.5],[32.1,31],  true, []),                 // foyer E (projects out)
    W([32.1,31],[23.2,31],    true, [ door(3,9,6.667) ]),// foyer S (front entry 6')
    W([23.2,31],[23.2,23.5],  true, []),                 // foyer W
    W([23.2,23.5],[10.3,23.5],true, [ win(2,7,5) ]),     // main body S (living side)
    W([10.3,23.5],[0,23.5],   true, [ door(2,5,6.5) ]),  // SW ext (eng-beam door)
    W([0,23.5],[0,0],         true, [ win(5,10,6) ]),    // WEST (meeting window)

    /* ---- interior partitions ---- */
    W([10.3,0],[10.3,18.5], false, [ door(14,16.7) ]),   // meeting | living  (+ meeting entry door)
    W([0,18.5],[10.3,18.5], false, []),                  // meeting | hall
    W([23.2,0],[23.2,23.5], false, []),                  // living | stairs
    W([27.5,0],[27.5,18],   false, []),                  // stairs | kitchen
    W([45.6,0],[45.6,23.5], false, [ door(20,22.7), door(10,12.7) ]), // main | right-col (garage + laundry doors)
    W([49.3,0],[49.3,9],    false, [ door(2,4.7) ]),     // bath hall | wet (bathroom door)
    W([49.3,5.4],[56.9,5.4],false, []),                  // vanity | toilet+shower
    W([52.8,5.4],[52.8,9],  false, []),                  // toilet | shower
    W([45.6,9],[56.9,9],    false, []),                  // wet | laundry
    W([45.6,13],[56.9,13],  false, [ door(2,4.7) ]),     // laundry | office
    W([45.6,21],[56.9,21],  false, []),                  // office | garage
  ];

  root.FLOOR = {
    units:"ft", FT_M, ceiling:CEIL,
    bounds:{ x0:0, z0:0, x1:56.9, z1:46.0 },
    scale_px_per_ft: 22.6,
    ROOMS, WALLS,
    porch:[10.3,23.5,45.6,33.0],
    foyer:[23.2,23.5,32.1,31.0],
  };
})(typeof window!=="undefined"?window:globalThis);
