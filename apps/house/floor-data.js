/* ============================================================================
   Fordham 4684 — MAIN FLOOR canonical geometry  (v3 — segment-true)
   Re-measured from the revised permit scan at 23.5 px/ft using black-run
   segment detection: walls exist ONLY where the scan shows the double black
   line; every gap is a real opening (passages, doorways). Blue = windows on
   exterior walls. Named millwork/furniture taken from the scan labels.
   Origin = NW corner. x = east, z = south, y = up. Units: FEET.
   ========================================================================== */
(function (root) {
  const FT_M = 0.3048, CEIL = 8;

  // Rooms/zones: [x0,z0,x1,z1, name, use]
  const ROOMS = [
    [0,   0,    9.4, 19.2, "MEETING ROOM",  "room"],
    [9.4, 0,    22.35,23.15,"LIVING ROOM",  "room"],
    [22.35,9.7, 26.5,19.5, "STAIRS",        "stair"],
    [22.35,0,   43.8,23.15,"KITCHEN / DINING","room"],
    [43.8,0,    47.5,3.5,  "HALL CLOSET",   "closet"],
    [43.8,3.5,  47.5,11.4, "HALL",          "circ"],
    [47.5,0,    54.8,6.9,  "VANITY",        "bath"],
    [47.5,6.9,  50.7,11.4, "TOILET",        "bath"],
    [50.7,6.9,  54.8,11.4, "SHOWER",        "bath"],
    [47.5,11.4, 54.8,20.6, "LAUNDRY",       "util"],
    [47.5,20.6, 54.8,23.15,"CLOSET",        "closet"],
    [43.8,23.15,54.8,31.4, "OFFICE",        "room"],
    [43.8,31.4, 50.7,34.1, "CLOSET",        "closet"],
    [43.8,34.1, 54.8,41.7, "GARAGE",        "garage"],
    [23.6,23.15,30.9,31.4, "FOYER",         "circ"],
    [9.4, 23.15,43.8,31.4, "COVERED PORCH", "porch"],
  ];

  const W=(a,b,ext,ops)=>({a,b,ext:!!ext,ops:ops||[]});
  const win=(s,e,h)=>({s,e,kind:'win',h:h||6});
  const door=(s,e,h)=>({s,e,kind:'door',h:h||6.667});

  /* Walls are the measured black segments — gaps between them are real
     floor-to-ceiling openings (passages), per the scan. */
  const WALLS = [
    /* ---------- exterior ---------- */
    // NORTH (windows from blue runs)
    W([0,0],[54.8,0], true, [ win(2.8,7.0,3), win(10.8,15.3,6), win(17.1,21.3,6), win(25.2,28.9,5), win(34.0,41.3,6) ]),
    // EAST
    W([54.8,0],[54.8,41.7], true, []),
    // GARAGE SOUTH (12' overhead door)
    W([54.8,41.7],[43.8,41.7], true, [ {s:0.4,e:10.6,kind:'garage',h:7.5} ]),
    // WEST (meeting glass wall)
    W([0,0],[0,19.2], true, [ win(2.4,5.4,6), win(6.7,9.4,6), win(10.4,16.8,6) ]),
    // MEETING SOUTH (exterior; eng-beam door)
    W([0,19.2],[9.4,19.2], true, [ door(5.3,7.9,6.5) ]),
    // LIVING SOUTH (to porch; 5x5 window)
    W([9.4,23.15],[22.35,23.15], true, [ win(3.4,8.4,5) ]),
    // between living-south and foyer W (short stub)
    W([22.77,23.15],[24.0,23.15], true, []),
    // KITCHEN SOUTH (to porch; 5x5 window)  — foyer mouth is the gap 24.0..29.3
    W([29.3,23.15],[43.8,23.15], true, [ win(3.3,8.1,5) ]),
    // FOYER (projects into porch; 6' front door)
    W([23.6,23.15],[23.6,31.4], true, []),
    W([30.9,23.15],[30.9,31.4], true, []),
    W([23.6,31.4],[30.9,31.4], true, [ door(1.2,7.2,6.667) ]),

    /* ---------- interior (segment-true; gaps = passages) ---------- */
    // meeting | living — doorway near the NORTH end (playroom door)
    W([9.4,0],[9.4,2.5], false, []),
    W([9.4,4.3],[9.4,19.2], false, []),
    // living | kitchen strip — passage at the NORTH (kitchen<->living), open at the SOUTH
    W([22.35,0],[22.35,2.8], false, []),
    W([22.35,5.3],[22.35,20.0], false, []),
    // stairs east wall (contained run; open at its south end)
    W([26.5,0],[26.5,1.8], false, []),
    W([26.5,9.7],[26.5,19.5], false, []),
    // main body | right column: hallway entry is the gap z10.1..12.3;
    // window onto porch at the office desk (z26.9..28.9)
    W([43.8,0],[43.8,10.1], true, []),
    W([43.8,12.3],[43.8,26.9], true, []),
    W([43.8,26.9],[43.8,28.9], true, [ win(0,2,4) ]),
    W([43.8,28.9],[43.8,41.7], true, []),
    // hall closet bottom
    W([43.8,3.5],[47.5,3.5], false, []),
    // hall | wet rooms (door gap 6.0..6.8; opening 15.5..18.1)
    W([47.5,0],[47.5,6.0], false, []),
    W([47.5,6.8],[47.5,15.5], false, []),
    W([47.5,18.1],[47.5,22.8], false, []),
    // vanity | shower divider
    W([50.6,6.9],[54.8,6.9], false, []),
    // toilet | shower
    W([50.7,6.9],[50.7,11.4], false, []),
    // wet | laundry
    W([47.5,11.4],[54.8,11.4], false, []),
    // laundry | closet
    W([47.5,20.6],[53.8,20.6], false, []),
    // closet | office (office door = gap x43.8..46.6)
    W([46.6,23.15],[54.3,23.15], false, []),
    // office south
    W([43.8,31.4],[54.3,31.4], false, []),
    // garage closet
    W([43.8,34.1],[50.8,34.1], false, []),
    W([50.7,31.4],[50.7,34.1], false, []),
  ];

  // Named millwork & furniture (from the scan labels): [x0,z0,x1,z1,h_ft,shape,name]
  const FURN = [
    [22.9,0.3, 32.3,2.4, 3.0,0,"counter + sink"],
    [41.5,0.3, 43.8,10.2,3.0,0,"fridge · ovens · sink"],
    [23.3,5.4, 28.2,9.2, 3.0,0,"pantry / appl garage"],
    [33.0,4.5, 39.0,10.0,3.0,1,"kitchen island"],
    [34.3,18.2,40.4,21.2,2.5,0,"dining table"],
    [20.7,8.8, 22.3,13.9,3.5,0,"f.p."],
    [10.4,6.9, 14.0,17.3,2.4,0,"couch"],
    [15.2,9.2, 17.4,13.9,1.4,0,"coffee table"],
    [11.5,1.6, 14.3,3.9, 2.4,0,"arm chair"],
    [20.0,18.1,22.1,20.3,1.6,0,"side table"],
    [14.3,18.4,18.9,22.1,2.4,0,"loveseat"],
    [50.0,0.3, 54.5,2.0, 2.9,0,'54" vanity'],
    [47.9,7.2, 50.4,10.9,1.4,0,"toilet"],
    [50.9,7.1, 54.6,11.2,0.4,0,"shower"],
    [47.8,11.6,54.5,13.6,3.0,0,"sink · wash · dry"],
    [44.0,0.3, 47.2,3.2, 6.0,0,"hall closet"],
    [51.7,23.5,54.0,30.7,2.4,0,"couch"],
    [44.2,26.9,45.6,29.1,2.4,0,"desk"],
    [48.0,20.8,53.8,22.9,6.0,0,"closet"],
    [44.0,31.6,50.4,33.9,6.0,0,"closet"],
  ];

  root.FLOOR = {
    units:"ft", FT_M, ceiling:CEIL,
    bounds:{ x0:0, z0:0, x1:54.8, z1:41.7 },
    scale_px_per_ft: 23.5,
    ROOMS, WALLS, FURN,
    porch:[9.4,23.15,43.8,31.4],
    foyer:[23.6,23.15,30.9,31.4],
    stairs:[22.35,9.7,26.5,19.5],
  };
})(typeof window!=="undefined"?window:globalThis);
