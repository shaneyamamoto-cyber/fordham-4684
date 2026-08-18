/* ============================================================================
   Fordham 4684 — MAIN FLOOR canonical geometry  (v2, updated plan)
   Measured from the user's revised permit scan by black-wall pixel detection at
   23.5 px/ft (verified vs meeting 9'6" wide, living 12'11" wide & 23'-0" deep).
   Origin = NW corner. x = east, z = south, y = up. Units: FEET. 1 ft = 0.3048 m.
   Drives the 2D grid map, the 3D model, and the AR/AI export (GLB/OBJ/JSON).
   ========================================================================== */
(function (root) {
  const FT_M = 0.3048, CEIL = 8;

  // Rooms: [x0,z0,x1,z1, name, use]
  const ROOMS = [
    [0,   0,    9.4, 19.2, "MEETING ROOM",  "room"],
    [0,   19.2, 9.4, 23.0, "ENTRY",         "circ"],
    [9.4, 0,    22.3,23.0, "LIVING ROOM",   "room"],
    [22.3,3.5,  26.5,9.0,  "PANTRY",        "util"],
    [22.3,9.0,  26.5,23.0, "STAIRS",        "stair"],
    [26.5,0,    44.0,23.0, "KITCHEN / DINING","room"],
    [44.0,0,    47.5,4.0,  "HALL CLOSET",   "closet"],
    [44.0,4.0,  47.5,17.3, "HALL",          "circ"],
    [49.4,0,    54.9,3.5,  "VANITY",        "bath"],
    [47.5,6.9,  50.6,11.4, "TOILET",        "bath"],
    [50.6,6.9,  54.9,11.4, "SHOWER",        "bath"],
    [47.5,11.4, 54.9,15.2, "LAUNDRY",       "util"],
    [44.0,17.3, 54.9,31.3, "OFFICE",        "room"],
    [44.0,34.1, 54.9,43.3, "GARAGE",        "garage"],
    [22.3,23.0, 29.0,30.0, "FOYER",         "circ"],
    [9.4, 23.0, 44.0,31.7, "COVERED PORCH", "porch"],
  ];

  const W=(a,b,ext,ops)=>({a,b,ext:!!ext,ops:ops||[]});
  const win=(s,e,h)=>({s,e,kind:'win',h:h||6});
  const door=(s,e,h)=>({s,e,kind:'door',h:h||6.667});

  const WALLS = [
    /* ---- envelope (L-shape: main body x0-44 to z23 + right column x44-54.9 to z43.3) ---- */
    W([0,0],[54.9,0], true, [ win(1.5,4,3), win(10,15,6), win(18,23,6), win(27,31,3), win(35,41,6) ]), // NORTH
    W([54.9,0],[54.9,43.3], true, []),                       // EAST
    W([54.9,43.3],[44,43.3], true, [ {s:0.5,e:11,kind:'garage',h:7.5} ]),  // GARAGE S (12' door)
    W([44,43.3],[44,23], true, []),                          // right-column west (faces porch/garage)
    W([44,23],[29,23], true, [ win(6,11,5) ]),               // main body S (kitchen side, faces porch)
    W([29,23],[29,30], true, []),                            // foyer E (projects into porch)
    W([29,30],[22.3,30], true, [ door(1.5,7.5,6.667) ]),     // foyer S (front entry 6')
    W([22.3,30],[22.3,23], true, []),                        // foyer W
    W([22.3,23],[9.4,23], true, [ win(2,7,5) ]),             // main body S (living side)
    W([9.4,23],[0,23], true, [ door(1.5,4.5,6.5) ]),         // SW ext (eng-beam door)
    W([0,23],[0,0], true, [ win(4,9,6), win(11,16,6) ]),     // WEST (meeting windows)

    /* ---- interior partitions (no false doors) ---- */
    W([9.4,0],[9.4,19.2], false, [ door(15,17.7) ]),         // meeting | living
    W([0,19.2],[9.4,19.2], false, []),                        // meeting | entry
    W([22.3,0],[22.3,23], false, []),                         // living | stairs+pantry
    W([26.5,0],[26.5,23], false, []),                         // stairs+pantry | kitchen
    W([22.3,9],[26.5,9], false, []),                          // pantry | stairs
    W([44,0],[44,23], false, [ door(19,21.7) ]),              // kitchen | right column (office door)
    W([47.5,0],[47.5,15.2], false, [ door(5,7.7) ]),          // hall | wet rooms (bath door)
    W([49.4,0],[49.4,3.5], false, []),                        // hall | vanity
    W([47.5,3.5],[54.9,3.5], false, []),                      // vanity row bottom
    W([47.5,6.9],[54.9,6.9], false, []),                      // hall | toilet+shower
    W([50.6,6.9],[50.6,11.4], false, []),                     // toilet | shower
    W([47.5,11.4],[54.9,11.4], false, []),                    // wet | laundry
    W([47.5,15.2],[54.9,15.2], false, [ door(9,11.7) ]),      // laundry | office
    W([44,17.3],[54.9,17.3], false, []),                      // (office north)
    W([44,31.3],[54.9,31.3], false, []),                      // office | (garage lobby)
  ];

  // Furniture / fixtures massing: [x0,z0,x1,z1, h_ft, shape]  shape: 0 box, 1 cyl
  const FURN = [
    [10.2,3.0, 13.2,11.5, 2.4,0,"couch"],
    [14.0,6.0, 17.0,11.0, 1.4,0,"coffee table"],
    [13.0,20.0,18.5,22.4, 2.4,0,"loveseat"],
    [11.0,18.5,13.5,21.5, 1.6,0,"side table"],
    [33.5,9.5, 40.5,14.5, 3.0,1,"kitchen island"],
    [26.9,0.4,31.5,2.2, 3.0,0,"pantry/appliance"],
    [41.0,0.4,44.0,3.0, 3.0,0,"fridge/ovens"],
    [34.3,18.2,40.4,21.2,2.5,0,"dining table"],
    [49.6,0.4,54.6,2.0, 2.9,0,"vanity"],
    [50.8,7.1,54.6,11.0,0.4,0,"shower base"],
    [47.7,11.6,54.6,13.5,3.0,0,"wash/dry"],
    [45.0,24.5,48.0,30.5,2.4,0,"office couch"],
    [44.4,26.5,47.0,28.0,2.4,0,"office desk"],
  ];

  root.FLOOR = {
    units:"ft", FT_M, ceiling:CEIL,
    bounds:{ x0:0, z0:0, x1:54.9, z1:43.3 },
    scale_px_per_ft: 23.5,
    ROOMS, WALLS, FURN,
    porch:[9.4,23.0,44.0,31.7],
    foyer:[22.3,23.0,29.0,30.0],
  };
})(typeof window!=="undefined"?window:globalThis);
