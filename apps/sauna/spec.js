const BENCH_STYLE = 'closed'; // 'floating' | 'closed'

const ftIn = (ft,inch)=> ft + inch/12;

// Raw shed/stud dimensions as measured (before any interior finish is applied).
const RAW_WIDTH = ftIn(10,4);
const RAW_DEPTH = ftIn(6,4);
const RAW_BACK_H = ftIn(9,6);
const RAW_FRONT_H = ftIn(7,10);

// Finish build-up: floor (sleepers/insulation + T&G cedar decking over the existing slab),
// wall lining (foil + furring + T&G cedar, per wall face), ceiling lining (same assembly,
// mounted to the sloped rafters). These are standard-practice estimates — confirm against
// actual material choices once picked, but the model now reflects the FINISHED interior,
// not the raw framing.
const FLOOR_BUILDUP = ftIn(0,3);   // 3"
const WALL_LINING = ftIn(0,1.5);   // 1.5" per wall face (furring + T&G)
const CEIL_LINING = ftIn(0,1.5);   // 1.5" (furring + T&G on the ceiling)

const WIDTH = RAW_WIDTH - 2*WALL_LINING;              // x — finished interior
const DEPTH = RAW_DEPTH - 2*WALL_LINING;              // z — finished interior
const FRONT_H = RAW_FRONT_H - FLOOR_BUILDUP - CEIL_LINING; // y at z=DEPTH — the front (10'4") wall's
                                                             // true structural height, unchanged —
                                                             // this is what the flat ceiling has to
                                                             // ramp DOWN to meet right at that wall.
// Flat ceiling, per the latest revision: 7'8" everywhere except a short ramp right at the front
// (10'4") wall, where the real roof/wall structure (FRONT_H, ~89.5") is lower than the flat
// plane — the ceiling angles up from the wall over CEIL_TRANSITION, then runs flat the rest of
// the way back to the back wall (the natural roof slope no longer shows inside the room at all).
const CEIL_FLAT = ftIn(7,8);        // 92" — flat ceiling height across the whole build
const CEIL_TRANSITION = ftIn(0,10); // "a few inches" — width of the ramp at the front wall
const KINK_Z = DEPTH - CEIL_TRANSITION; // z where the flat ceiling begins ramping down to FRONT_H
const BACK_H = CEIL_FLAT; // interior back wall now reads to the flat ceiling height, not the
                          // shed's actual (taller) back structural height — the extra height
                          // becomes hidden loft space above the dropped flat ceiling.
// YamaZina Mark 2 spec — rear+right wall "foot bench" (lower tier) / "top bench" (upper tier).
// SEAT_LOW is the foot bench's seat/footrest height (design rule: rule 3 of the rear+right wall
// set — "the foot rest position of the foot bench will be at 32""). SEAT_HIGH is the top bench's
// seat height, defined by rule 4 as exactly 18" above the foot bench.
const SEAT_LOW = ftIn(2,8);  // 32"
const SEAT_HIGH = SEAT_LOW + ftIn(1,6); // 32" + 18" = 50"
// Ceiling/roofline height at a given z: flat at CEIL_FLAT from the back wall out to KINK_Z, then
// ramps down linearly to FRONT_H right at the front wall.
const heightAt = (z)=>{
  if(z <= KINK_Z) return CEIL_FLAT;
  const t = (z-KINK_Z)/(DEPTH-KINK_Z);
  return CEIL_FLAT - (CEIL_FLAT-FRONT_H)*t;
};

// Window opening (right wall) — defined early so the wall geometry can be cut with a real hole.
// Mutable (let, not const) — the click-to-edit panel can move/resize this window live, which
// rebuilds both the wall's cut hole and the frame/glass fixtures from these current values.
let WIN_W = 3.4, WIN_H = 1.5, WIN_Z = 2.5, WIN_Y = 6.6;
const WIN_TRIM = 0.09; // wider, single unbroken pane; raised so the solid wall below is clear to rest your back/head against
// Real-world-wide-but-still-buildable size bounds (2026-07-30 — see setWindowGeometry below for
// the position/height ranges, which are computed live from these rather than a flat number).
const WIN_W_MIN = ftIn(1,0), WIN_W_MAX = ftIn(5,0);  // 12in - 60in (DEPTH is only ~73in, so this still leaves real slide room at the SW1 wall's max)
const WIN_H_MIN = ftIn(0,7), WIN_H_MAX = ftIn(4,0);  // 7in - 48in

// ---------------------------------------------------------------------------
// SAUNA_SPEC — read-only snapshot of the parametric contract above, exposed
// for the 2D plan editor (plan.html) and any future module that needs the
// room's measured envelope without loading the full 3D app. The raw consts
// above stay the live bindings the 3D app script uses; this object is the
// shared vocabulary between the 2D and 3D views of the same build.
// ---------------------------------------------------------------------------
window.SAUNA_SPEC = {
  ftIn, heightAt,
  RAW_WIDTH, RAW_DEPTH, RAW_BACK_H, RAW_FRONT_H,
  FLOOR_BUILDUP, WALL_LINING, CEIL_LINING,
  WIDTH, DEPTH, FRONT_H, CEIL_FLAT, CEIL_TRANSITION, KINK_Z, BACK_H,
  SEAT_LOW, SEAT_HIGH,
  WIN_TRIM, WIN_W_MIN, WIN_W_MAX, WIN_H_MIN, WIN_H_MAX,
  defaults: {
    benchStyle: BENCH_STYLE,
    window: { w: WIN_W, h: WIN_H, z: WIN_Z, y: WIN_Y },
  },
};
