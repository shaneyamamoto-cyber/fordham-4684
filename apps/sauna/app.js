const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0a08);
const sceneFog = new THREE.Fog(0x0d0a08, 15, 32);
scene.fog = sceneFog;

const app = document.getElementById('app');
const camera = new THREE.PerspectiveCamera(42, window.innerWidth/window.innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
app.appendChild(renderer.domElement);

// ---------- Procedural environment (image-based lighting for realistic reflections) ----------
// No external HDRI asset (keeps the file fully self-contained/offline) — instead we build a
// small tinted "room" scene and prefilter it with PMREMGenerator, exactly like three.js's own
// RoomEnvironment helper. This gives glass, metal and rock real reflected color/highlights
// instead of the flat single-color look of default lighting.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
function buildEnvScene(){
  const s = new THREE.Scene();
  function panel(w,h,d,color,x,y,z,ry){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshBasicMaterial({color}));
    m.position.set(x,y,z); if(ry) m.rotation.y = ry;
    s.add(m); return m;
  }
  // Kept deliberately dark/low-key — this env map is only meant to give glass/metal/rock a
  // believable reflected highlight, not act as a second ambient light. A bright surround here
  // was blowing the whole tone-mapped image out to pale/washed.
  panel(30,0.2,30, 0x0a0806, 0,-9,0);       // floor — near-black
  panel(30,0.2,30, 0x141a20, 0,15,0);       // ceiling — dark cool
  panel(0.2,20,30, 0x1c1712, -15,0,0);
  panel(0.2,20,30, 0x1c1712, 15,0,0);
  panel(30,20,0.2, 0x1c1712, 0,0,-15);
  panel(3,2.4,0.2, 0xfff2d8, 0,9,14.8);     // small warm highlight, like a window/softbox
  panel(2,1.4,0.2, 0xbfe0ff, -9,4,14.8);    // small cool secondary highlight
  return s;
}
const envRT = pmremGenerator.fromScene(buildEnvScene(), 0.035);
pmremGenerator.dispose();
scene.environment = envRT.texture;

// ---------- Post-processing (subtle bloom on the heater glow / LEDs / stars only) ----------
// HalfFloat render target so the bloom threshold reads true HDR radiance instead of an
// already-clamped 0-1 buffer — without it, the whole (bright, sunlit) scene blooms instead
// of just the actual light sources.
const composerTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType });
const composer = new THREE.EffectComposer(renderer, composerTarget);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.4, 1.35);
composer.addPass(bloomPass);

// ---------- Procedural textures ----------
function plankTexture(baseA, baseB, plankPx, seed){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseA;
  ctx.fillRect(0,0,512,512);
  let x = 0, i=0;
  while(x < 512){
    const w = plankPx + (((seed+i)*37)%9 - 4);
    const shade = (i%2===0) ? baseA : baseB;
    ctx.fillStyle = shade;
    ctx.fillRect(x,0,w,512);
    ctx.fillStyle = 'rgba(40,24,10,0.35)';
    ctx.fillRect(x+w-2,0,2,512);
    ctx.strokeStyle = 'rgba(255,235,205,0.06)';
    for(let g=0;g<3;g++){
      ctx.beginPath();
      const gx = x + 4 + g*(w/3);
      ctx.moveTo(gx,0); ctx.lineTo(gx+6,512);
      ctx.stroke();
    }
    x += w; i++;
  }
  // subtle overall noise for realism
  const id = ctx.getImageData(0,0,512,512);
  for(let p=0;p<id.data.length;p+=4){
    const n = (Math.random()-0.5)*14;
    id.data[p] = Math.min(255,Math.max(0,id.data[p]+n));
    id.data[p+1] = Math.min(255,Math.max(0,id.data[p+1]+n));
    id.data[p+2] = Math.min(255,Math.max(0,id.data[p+2]+n));
  }
  ctx.putImageData(id,0,0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
function glowSprite(color){
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}
function rockTexture(){
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#75726c';
  ctx.fillRect(0,0,128,128);
  for(let i=0;i<900;i++){
    const v = 40+Math.random()*80;
    ctx.fillStyle = `rgba(${v},${v-4},${v-10},${0.15+Math.random()*0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random()*128, Math.random()*128, Math.random()*2.2, 0, Math.PI*2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// Real-world board width for the T&G cedar (~5" face) — used to size texture repeats so
// boards read at true scale instead of the hairline-thin stripes from the first pass.
const BOARD_W_FT = 0.42;
function boardRepeat(plankPx, lengthFt){
  const boardsPerTile = 512/plankPx;
  const tileSpanFt = boardsPerTile*BOARD_W_FT;
  return lengthFt/tileSpanFt;
}
const rockTex = rockTexture();
rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;

// ---------- Real photo wood textures (replaces the procedural plank canvases above) ----------
// window.__TEX is injected by build_render2.py as small base64 data URIs — interior cedar
// (diffuse + a subtle relief/bump map) for every touchable interior wood surface (walls, ceiling,
// door, benches, landing, the new floor deck), and the genuinely OUTDOOR rear deck/stair boards
// (weathered gray-brown diffuse + a roughness map) for deckMat only — that's a real physically
// different, weather-exposed structure per the design brief, not just a color variant.
const TEX = (typeof window !== 'undefined' && window.__TEX) ? window.__TEX : null;
const texLoader = new THREE.TextureLoader();
// isColorMap=true marks a texture as photographed color data (sRGB) rather than raw linear data
// (bump/roughness maps stay linear). The renderer runs ACESFilmicToneMapping + sRGBEncoding output
// (see the renderer setup above) — without flagging diffuse photos as sRGB source data here, that
// pipeline treats them as linear and blows them out into the washed-out, overly glossy/saturated
// look real photos got on the first pass (the old procedural canvas textures happened to be muted
// enough that the same missing flag was much less visible).
function loadTex(dataUri, repeatX, repeatY, isColorMap){
  const t = texLoader.load(dataUri);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  if(isColorMap) t.encoding = THREE.sRGBEncoding;
  return t;
}
// Counted directly off the source photos: ~13 boards/tile at the cedar's true ~5" face width,
// ~9 boards/tile at the deck photo's wider ~7" weathered board face.
const CEDAR_TILE_FT = 13 * BOARD_W_FT;      // ~5.5ft square tile
const DECK_BOARD_W_FT = 0.58;
const DECK_TILE_FT = 9 * DECK_BOARD_W_FT;   // ~5.2ft square tile
function cedarMap(wFt, hFt){ return TEX ? loadTex(TEX.cedarDiff, wFt/CEDAR_TILE_FT, hFt/CEDAR_TILE_FT, true) : null; }
function cedarBump(wFt, hFt){ return TEX ? loadTex(TEX.cedarBump, wFt/CEDAR_TILE_FT, hFt/CEDAR_TILE_FT, false) : null; }
function deckMap(wFt, hFt){ return TEX ? loadTex(TEX.deckDiff, wFt/DECK_TILE_FT, hFt/DECK_TILE_FT, true) : null; }
function deckRoughMap(wFt, hFt){ return TEX ? loadTex(TEX.deckRough, wFt/DECK_TILE_FT, hFt/DECK_TILE_FT, false) : null; }
// Real light-oak door photo (user-supplied), used only on the door panel itself — the door frame,
// window trim and glass-block trim stay on the darker deck texture (the earlier "different wood
// for the door/window frame" request), so the door panel now reads as a third, distinct wood.
const DOOR_TILE_FT = 3; // photo tiled at roughly a 3ft square repeat
function doorMap(wFt, hFt){ return TEX ? loadTex(TEX.doorDiff, wFt/DOOR_TILE_FT, hFt/DOOR_TILE_FT, true) : null; }
// Real HUUM heater photo (user-supplied) — a genuine rock+wire-cage crop, pre-processed into a
// seamlessly-wrapping tile (textures/rock_diff.jpg) so it can repeat around the barrel and over the
// loose rock crown without a visible seam, instead of the old procedural gray-noise canvas.
function rockMap(repeatX, repeatY){ return TEX ? loadTex(TEX.rockDiff, repeatX, repeatY, true) : null; }
function rockBumpMap(repeatX, repeatY){ return TEX ? loadTex(TEX.rockBump, repeatX, repeatY, false) : null; }

// Two real PBR wood sets (base color + roughness + true normal map, not just a bump) — used as the
// mullion/spacer frame between individual panes in the glass-block grid, selectable between the two
// (see setGlassBlockFrameWood below): a proper "feature wall" grid frame, per spec, instead of the
// blocks just butting up against each other with a bare gap.
const WOOD_TILE_FT = 1.3;
function woodPbrMat(diffKey, roughKey, normalKey){
  if(!TEX || !TEX[diffKey]) return new THREE.MeshStandardMaterial({color:0x6b4a2c, roughness:0.6});
  const rep = 1/WOOD_TILE_FT;
  const m = new THREE.MeshStandardMaterial({
    map: loadTex(TEX[diffKey], rep, rep, true),
    roughnessMap: loadTex(TEX[roughKey], rep, rep, false),
    normalMap: loadTex(TEX[normalKey], rep, rep, false),
    normalScale: new THREE.Vector2(0.7,0.7),
    roughness: 1.0, envMapIntensity: 0.3
  });
  return m;
}
const CEDAR_BUMP_SCALE = 0.018; // subtle — this is a lighting-only relief (bumpMap), not true geometry displacement; dialed down from the first pass, which read as slightly too sparkly under this scene's bloom pass

const wallTexBack = TEX ? cedarMap(WIDTH, BACK_H) : plankTexture('#d9ac76','#cf9f68', 22, 1);
const wallBumpBack = TEX ? cedarBump(WIDTH, BACK_H) : null;
if(!TEX) wallTexBack.repeat.set(boardRepeat(22, WIDTH), 1);
const wallTexFront = TEX ? cedarMap(WIDTH, FRONT_H) : plankTexture('#d9ac76','#cf9f68', 22, 5);
const wallBumpFront = TEX ? cedarBump(WIDTH, FRONT_H) : null;
if(!TEX) wallTexFront.repeat.set(boardRepeat(22, WIDTH), 1);
const wallTexSide = TEX ? cedarMap(DEPTH, Math.max(BACK_H,FRONT_H)) : plankTexture('#d3a670','#c99c64', 20, 9);
const wallBumpSide = TEX ? cedarBump(DEPTH, Math.max(BACK_H,FRONT_H)) : null;
if(!TEX) wallTexSide.repeat.set(boardRepeat(20, DEPTH), 1);
const ceilTex = TEX ? cedarMap(WIDTH, DEPTH*1.3) : plankTexture('#dcb27e','#d0a56f', 26, 13);
const ceilBump = TEX ? cedarBump(WIDTH, DEPTH*1.3) : null;
if(!TEX) ceilTex.repeat.set(boardRepeat(26, WIDTH), 1);
const floorTex = plankTexture('#c9985f','#bd8850', 16, 33); // stays procedural — this is the concrete slab now (see the floor-deck section), not a wood finish
floorTex.repeat.set(boardRepeat(16, WIDTH), boardRepeat(16, DEPTH));
const benchTex = TEX ? cedarMap(6, 6) : plankTexture('#c8925a','#bd8850', 18, 21);
const benchBump = TEX ? cedarBump(6, 6) : null;

// Dry sauna cedar is matte, not glossy — roughness stays high (no tight specular highlight) but
// envMapIntensity came back up from the first matte pass, which cut it so far it also killed the
// room's ambient fill and read as flat-out dark. Roughness (highlight sharpness) and
// envMapIntensity (how much ambient/reflected light a surface picks up) are independent knobs —
// this keeps the surface matte while still catching real light.
const CEDAR_ROUGH = 0.85, CEDAR_ENV = 0.45;
const woodWall = new THREE.MeshStandardMaterial({map:wallTexBack, bumpMap:wallBumpBack, bumpScale:CEDAR_BUMP_SCALE, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV, metalness:0, side:THREE.DoubleSide});
// LW1 (the door's wall) goes translucent in the default outside view instead of just vanishing —
// same "translucent, with a real adjustable option, like the door" pattern as doorMat below: a
// live opacity slider (wallOutsideOpacity), forced fully solid the moment you step inside, and
// snapping back to whatever the slider's set to once you step back out. Replaces the old flat
// backWall.visible=true/false toggle (see setView/setTopView).
woodWall.transparent = true;
woodWall.depthWrite = false;
let wallOutsideOpacity = 0; // reverted back to fully open/invisible by default — the translucent
                             // version was too subtle to read as "translucent" and, combined with
                             // the exterior slats on the two adjacent walls, made the whole default
                             // outside view look like a closed-up box instead of an open cutaway.
                             // The slider mechanism (setWallTransparency) is still here if you ever
                             // want to dial some of it back in — it just starts at 0 (=old behavior)
                             // instead of defaulting to a value that changed the look unasked.
function applyWallOutsideOpacity(){ woodWall.opacity = wallOutsideOpacity; }
applyWallOutsideOpacity();
window.setWallTransparency = function(v){
  wallOutsideOpacity = Math.min(1, Math.max(0, parseFloat(v)));
  if(!insideMode) applyWallOutsideOpacity();
  // Re-evaluate the SW1/SW2 rail corner trim (see railSWCornerClear/lw1IsOpen) — dialing the LW1
  // wall back toward solid should let the rails run flush to the corner again, live.
  if(typeof buildValanceGroup === 'function') buildValanceGroup();
  if(typeof buildFakeValanceGroup === 'function') buildFakeValanceGroup();
};
const woodWallFront = new THREE.MeshStandardMaterial({map:wallTexFront, bumpMap:wallBumpFront, bumpScale:CEDAR_BUMP_SCALE, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV, metalness:0, side:THREE.DoubleSide});
const woodWallSide = new THREE.MeshStandardMaterial({map:wallTexSide, bumpMap:wallBumpSide, bumpScale:CEDAR_BUMP_SCALE, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV, metalness:0, side:THREE.DoubleSide});
const woodCeil = new THREE.MeshStandardMaterial({map:ceilTex, bumpMap:ceilBump, bumpScale:CEDAR_BUMP_SCALE, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV, side:THREE.DoubleSide});
// Corner posts (SW1/LW1 and SW2/LW1 building corners) — own material, deliberately NOT woodWall,
// so it never follows wallOutsideOpacity/insideMode. See buildCornerPosts() below for why this
// exists: a real timber-frame corner post is there in any real build regardless of whether the
// door-wall cladding (LW1) is on, off, or translucent — it's structural, not decorative.
const cornerPostMat = new THREE.MeshStandardMaterial({map: TEX ? cedarMap(1,1) : null, color: TEX ? 0xffffff : 0xc79361, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV, metalness:0});
const floorMat = new THREE.MeshStandardMaterial({map:floorTex, roughness:0.55, metalness:0.0, envMapIntensity:0.6});
const benchMat = new THREE.MeshStandardMaterial({map:benchTex, bumpMap:benchBump, bumpScale:CEDAR_BUMP_SCALE, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV});
const closedMat = new THREE.MeshStandardMaterial({map: TEX ? cedarMap(4,3) : null, bumpMap: TEX ? cedarBump(4,3) : null, bumpScale:CEDAR_BUMP_SCALE, color: TEX ? 0xffffff : 0xc79361, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV});
const benchEdge = new THREE.MeshStandardMaterial({map: TEX ? cedarMap(2,1.5) : null, color: TEX ? 0xffffff : 0xa9713f, roughness:CEDAR_ROUGH, envMapIntensity:CEDAR_ENV});
// The floor panels (the new full deck tiling + the entry landing top) get their OWN material —
// the deck/weathered photo, not the wall cedar — per the request to keep the floor visually
// distinct from the walls/benches, on top of the door already using it. Also matte (roughness 1,
// low envMapIntensity), same reasoning as the cedar above.
// Warm tint (was pure white/untinted, letting the photo's cooler weathered-gray cast show as-is)
// multiplied over the deck photo so the floor boards read a little warmer underfoot, per request —
// still the same real texture/grain, just nudged toward amber instead of straight gray.
const floorPanelMat = new THREE.MeshStandardMaterial({map: TEX ? deckMap(4,3) : null, roughnessMap: TEX ? deckRoughMap(4,3) : null, color: TEX ? 0xf7dcb8 : 0xc79361, roughness: TEX ? 1.0 : 0.55, envMapIntensity:0.12});
// Door + every window/glass-block frame member deliberately use the OTHER real photo (the
// weathered deck-board set), not the wall cedar — a real build almost always trims doors/windows
// in a contrasting species/finish from the field paneling, and reusing the same photo everywhere
// would read as one flat, un-detailed material. roughness stays at 1 so the roughness map alone
// drives the sheen variation, same approach as the exterior deck itself.
const doorMat = new THREE.MeshStandardMaterial({map: TEX ? doorMap(2,6) : null, color: TEX ? 0xffffff : 0x4a2f1c, roughness: TEX ? 0.55 : 0.5, envMapIntensity: TEX ? 0.35 : 0.12}); // real light-oak door photo; frame/trim stay on the deck wood for contrast
const doorGlassMat = new THREE.MeshPhysicalMaterial({color:0xeaf4ff, roughness:0.5, transmission:0.4, transparent:true, opacity:0.88}); // lightly frosted, per spec
const glassMat = new THREE.MeshPhysicalMaterial({color:0x88bfa8, roughness:0.1, transmission:0.6, transparent:true, opacity:0.92});
const windowGlassMat = new THREE.MeshPhysicalMaterial({color:0xbfe3ff, roughness:0.05, transmission:0.85, transparent:true, opacity:0.55});
const heaterMat = new THREE.MeshStandardMaterial({color:0x161616, roughness:0.3, metalness:0.75});
const metalMat = new THREE.MeshStandardMaterial({color:0x2a2a2a, roughness:0.35, metalness:0.85});

// ---------- Lighting scheme system ----------
// Base (natural/ambient) light is kept deliberately low now — a "real lighting engine" reads
// as real precisely because the accent fixtures (stars/downlights/LEDs/heater glow) are what
// actually shape the room, not a flat wash that makes every toggle invisible.
const ambientLight = new THREE.AmbientLight(0xffe6c2, 0.16);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xffe0b3, 0.24);
sun.position.set(6, 12, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
scene.add(sun);
const fillWarm = new THREE.PointLight(0xffcf9e, 0.16, 14);
fillWarm.position.set(WIDTH*0.3, BACK_H*0.7, DEPTH*0.3);
scene.add(fillWarm);
const heaterGlow = new THREE.PointLight(0xff8a3d, 1.4, 7, 2);
scene.add(heaterGlow);

const ledMaterials = [];
const ledLights = [];
const starMaterials = [];
const starSprites = [];
const downFixtureMats = [];
const downLights = [];
const benchMeshes = [];
const ledStripMeshes = [];
const downFixtureMeshes = [];
let accentLight, accentMat, accentMeshRef=null, thermoDiscRef=null, thermoMatRef=null;
let windowGroupRef=null, windowPaneRef=null, windowBlockGroupRef=null, windowBlockMat=null;
let glassBlockFrameMat=null, currentGlassBlockFrameWood='wood1';
let doorGlassRef=null;
let heaterRockGroup=null, heaterGuardMatRef=null;
// Notes were previously inert saved text with no real effect once written ("saves now but
// doesn't do anything" — the actual user complaint). This app can't safely have an AI parse free
// text and auto-edit 3D geometry from it, so the honest, real fix is turning each note into an
// actual tracked to-do: open/resolved state that persists, shows up as a punch-list count, and can
// be checked off as it's actually acted on — not a bigger claim than that.
// Stored as {text, done}; a bare string is accepted on read for back-compat with notes saved
// before this change (old localStorage "Versions" / exported JSON).
const elementNotes = {};
function normalizeNote(raw){
  if(raw == null) return {text:'', done:false};
  if(typeof raw === 'string') return {text:raw, done:false};
  return {text: raw.text || '', done: !!raw.done};
}
window.setElementNote = function(index, text){
  const cur = normalizeNote(elementNotes[index]);
  elementNotes[index] = {text, done: text ? cur.done : false}; // clearing the text also clears any resolved flag
};
window.getElementNote = function(index){ return normalizeNote(elementNotes[index]).text; };
window.isElementNoteDone = function(index){ return normalizeNote(elementNotes[index]).done; };
window.setElementNoteDone = function(index, done){
  const cur = normalizeNote(elementNotes[index]);
  if(!cur.text) return false; // nothing to resolve
  elementNotes[index] = {text: cur.text, done: !!done};
  return true;
};

// ---------- Click-to-edit / numbered element-list registry ----------
// Declared early (rather than after everything is built) so individual pieces — a single
// bench run, a single LED strip, a single downlight — can register themselves right at their
// own construction site instead of getting lumped into one big "Bench" or "LED" catch-all.
// Every editable surface/fixture gets tagged with userData.editableRef so a raycast hit on any
// of its child meshes resolves back to one entry; the same entries also back the sidebar's
// numbered "Elements" list, so clicking a number and clicking the object in 3D land on the
// exact same focused edit UI.
const editables = [];
function registerEditable(objects, type, label){
  const arr = Array.isArray(objects) ? objects : [objects];
  const entry = {type, label, index: editables.length, objects: arr.filter(Boolean)};
  arr.forEach(o=>{ if(o) o.userData.editableRef = entry; });
  editables.push(entry);
  return entry;
}

const SCHEMES = [
  {name:'Warm Amber', amb:0xffe6c2, ambI:0.16, sunC:0xffe0b3, sunI:0.24, fillC:0xffcf9e, fillI:0.16, ledC:0xffb066, starC:0xfff3e0, downC:0xffd9a8, accentC:0x3fd18a},
  {name:'Cool Spa',   amb:0xdcefff, ambI:0.18, sunC:0xcfe6ff, sunI:0.22, fillC:0xbfe0ff, fillI:0.15, ledC:0x8fd8ff, starC:0xe8f5ff, downC:0xcfeaff, accentC:0x66d9c9},
  {name:'Chromo',     amb:0xdac2ff, ambI:0.13, sunC:0xb98cff, sunI:0.19, fillC:0xd08cff, fillI:0.19, ledC:0xaa5cff, starC:0xe4c8ff, downC:0xd6a6ff, accentC:0xff5ca8},
  {name:'Showroom',   amb:0xffffff, ambI:0.24, sunC:0xffffff, sunI:0.25, fillC:0xffffff, fillI:0.12, ledC:0xffffff, starC:0xffffff, downC:0xffffff, accentC:0x66d9ff},
];
let schemeIndex = 0;
let ambientBase=0.16, sunBase=0.24, fillBase=0.16;

// Independent on/off + intensity level (0..2) state per fixture category — this is what makes
// toggling/sliding an actual lighting engine rather than a cosmetic checkbox: every category
// scales its own materials AND its own point lights together.
const lightState = {
  stars:   {on:true, level:1},
  down:    {on:true, level:1},
  led:     {on:true, level:1},
  valance: {on:true, level:1},
  heater:  {level:1},
  ambient: {level:1},
};
function applyLightLevels(){
  ambientLight.intensity = ambientBase * lightState.ambient.level;
  sun.intensity = sunBase * lightState.ambient.level;
  fillWarm.intensity = fillBase * lightState.ambient.level;

  starSprites.forEach(s=>{
    s.visible = lightState.stars.on;
    s.material.opacity = (s.userData.baseOpacity!=null ? s.userData.baseOpacity : 0.7) * lightState.stars.level;
  });
  downFixtureMats.forEach(m=> m.emissiveIntensity = lightState.down.on ? 0.9*lightState.down.level : 0);
  downLights.forEach(l=>{
    l.visible = lightState.down.on;
    l.intensity = (l.userData.baseIntensity!=null ? l.userData.baseIntensity : 0.55) * lightState.down.level;
  });
  ledMaterials.forEach(m=> m.emissiveIntensity = lightState.led.on ? 1.6*lightState.led.level : 0);
  ledLights.forEach(l=>{
    l.visible = lightState.led.on;
    l.intensity = (l.userData.baseIntensity!=null ? l.userData.baseIntensity : 0.35) * lightState.led.level;
  });
  valanceLedMaterials.forEach(m=> m.emissiveIntensity = lightState.valance.on ? 1.4*lightState.valance.level : 0);
  valanceLedLights.forEach(l=>{
    l.visible = lightState.valance.on;
    l.intensity = (l.userData.baseIntensity!=null ? l.userData.baseIntensity : 0.4) * lightState.valance.level;
  });
  heaterGlow.intensity = 1.4 * lightState.heater.level;
}

function applyScheme(i){
  schemeIndex = ((i%SCHEMES.length)+SCHEMES.length)%SCHEMES.length;
  const s = SCHEMES[schemeIndex];
  ambientLight.color.setHex(s.amb); ambientBase = s.ambI;
  sun.color.setHex(s.sunC); sunBase = s.sunI;
  fillWarm.color.setHex(s.fillC); fillBase = s.fillI;
  ledMaterials.forEach(m=>{ m.color.setHex(s.ledC); m.emissive.setHex(s.ledC); });
  ledLights.forEach(l=> l.color.setHex(s.ledC));
  // Valance wrap shares the LED scheme color (same warm/cool/etc family as the bench strips) —
  // still independently overridable via its own swatch/level, same as everything else here.
  valanceLedMaterials.forEach(m=>{ m.color.setHex(s.ledC); m.emissive.setHex(s.ledC); });
  valanceLedLights.forEach(l=> l.color.setHex(s.ledC));
  starMaterials.forEach(m=> m.color.setHex(s.starC));
  downFixtureMats.forEach(m=> m.emissive.setHex(s.downC));
  downLights.forEach(l=> l.color.setHex(s.downC));
  if(accentLight) accentLight.color.setHex(s.accentC);
  if(accentMat) accentMat.color.setHex(s.accentC);
  applyLightLevels();
  const el = document.getElementById('schemeName');
  if(el) el.textContent = s.name;
}
window.setScheme = applyScheme;

// ---------- Direct color overrides (independent of the 4 preset scenes) ----------
window.setLedColor = function(hexStr){
  const c = new THREE.Color(hexStr);
  ledMaterials.forEach(m=>{ m.color.copy(c); m.emissive.copy(c); });
  ledLights.forEach(l=> l.color.copy(c));
};
window.setAmbientColor = function(hexStr){
  ambientLight.color.set(hexStr);
};
window.setDownColor = function(hexStr){
  const c = new THREE.Color(hexStr);
  downFixtureMats.forEach(m=> m.emissive.copy(c));
  downLights.forEach(l=> l.color.copy(c));
};
window.setStarsColor = function(hexStr){
  const c = new THREE.Color(hexStr);
  starMaterials.forEach(m=> m.color.copy(c));
};

// ---------- Per-fixture on/off toggles + intensity sliders ----------
window.toggleStars = function(on){ lightState.stars.on = on; applyLightLevels(); };
window.toggleDownlights = function(on){ lightState.down.on = on; applyLightLevels(); };
window.toggleLedStrips = function(on){ lightState.led.on = on; applyLightLevels(); };
window.setStarsLevel = function(v){ lightState.stars.level = parseFloat(v); applyLightLevels(); };
window.setDownLevel = function(v){ lightState.down.level = parseFloat(v); applyLightLevels(); };
window.setLedLevel = function(v){ lightState.led.level = parseFloat(v); applyLightLevels(); };
window.setHeaterLevel = function(v){ lightState.heater.level = parseFloat(v); applyLightLevels(); };
window.setAmbientLevel = function(v){ lightState.ambient.level = parseFloat(v); applyLightLevels(); };

// ---------- Room shell ----------
const room = new THREE.Group();

const floor = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, DEPTH), floorMat);
floor.rotation.x = -Math.PI/2;
floor.position.set(WIDTH/2, 0, DEPTH/2);
floor.receiveShadow = true;
room.add(floor);

// Wall naming (per the client's naming structure): LW1 = "Long Wall 1", the door's wall (z=0,
// this backWall mesh) — now the designated FRONT of the build. LW2 = "Long Wall 2", the opposite
// wall (z=DEPTH, this frontWall mesh) — now the designated
// BACK. (Internal variable names below are unchanged from earlier revisions — only the
// human-facing "front/back" meaning flipped, along with which wall the outside cutaway hides.)
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, BACK_H), woodWall);
backWall.position.set(WIDTH/2, BACK_H/2, 0);
backWall.receiveShadow = true;
backWall.visible = false; // cut away (LW1/door wall) so the interior is visible — this is now the DEFAULT outside view's vantage
room.add(backWall);

const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, FRONT_H), woodWallFront);
frontWall.position.set(WIDTH/2, FRONT_H/2, DEPTH);
frontWall.rotation.y = Math.PI;
frontWall.receiveShadow = true;
room.add(frontWall);

function buildGeom(vertsArr, triIdx, uvArr){
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertsArr.flat()),3));
  if(uvArr) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvArr.flat()),2));
  geo.setIndex(triIdx);
  geo.computeVertexNormals();
  return geo;
}

// Left/right wall top edge and the ceiling both now follow the flat-with-a-front-ramp roofline
// (heightAt) instead of a single straight slope from back to front — flat at BACK_H (=CEIL_FLAT)
// out to KINK_Z, then down to FRONT_H right at the front wall.
const leftGeo = buildGeom(
  [[0,0,0],[0,0,DEPTH],[0,FRONT_H,DEPTH],[0,CEIL_FLAT,KINK_Z],[0,BACK_H,0]],
  [0,1,2, 0,2,3, 0,3,4],
  [[0,0],[1,0],[1,FRONT_H/CEIL_FLAT],[KINK_Z/DEPTH,1],[0,1]]
);
const leftWall = new THREE.Mesh(leftGeo, woodWallSide);
leftWall.receiveShadow = true;
room.add(leftWall);

// Right wall built as a shape with an actual cut hole for the window (visible from both
// inside and outside, not just an overlay that the solid wall would occlude). Wrapped in a
// function so the click-to-edit window-resize control can regenerate the real cut opening,
// not just move an overlay in front of a solid wall.
function buildRightWallGeo(){
  const shape = new THREE.Shape();
  shape.moveTo(0,0);
  shape.lineTo(DEPTH,0);
  shape.lineTo(DEPTH,FRONT_H);
  shape.lineTo(KINK_Z,CEIL_FLAT);
  shape.lineTo(0,BACK_H);
  shape.lineTo(0,0);
  {
    const holeU0 = WIN_Z - WIN_W/2 - WIN_TRIM, holeU1 = WIN_Z + WIN_W/2 + WIN_TRIM;
    const holeV0 = WIN_Y - WIN_H/2 - WIN_TRIM, holeV1 = WIN_Y + WIN_H/2 + WIN_TRIM;
    const hole = new THREE.Path();
    hole.moveTo(holeU0,holeV0); hole.lineTo(holeU1,holeV0); hole.lineTo(holeU1,holeV1); hole.lineTo(holeU0,holeV1); hole.lineTo(holeU0,holeV0);
    shape.holes.push(hole);
  }
  const geo = new THREE.ShapeGeometry(shape);
  // remap generated UVs (0..1 over the shape bbox) to align with our plank texture repeat
  const uvAttr = geo.attributes.uv;
  const posAttr = geo.attributes.position;
  for(let i=0;i<uvAttr.count;i++){
    uvAttr.setXY(i, posAttr.getX(i)/DEPTH, posAttr.getY(i)/BACK_H);
  }
  return geo;
}
const rightWall = new THREE.Mesh(buildRightWallGeo(), woodWallSide);
rightWall.rotation.y = -Math.PI/2;
rightWall.position.set(WIDTH,0,0);
rightWall.receiveShadow = true;
room.add(rightWall);

// Ceiling: flat quad (back wall to KINK_Z) + a short ramp quad (KINK_Z down to the front wall).
const ceilGeo = buildGeom(
  [[0,BACK_H,0],[WIDTH,BACK_H,0],[WIDTH,CEIL_FLAT,KINK_Z],[0,CEIL_FLAT,KINK_Z],[WIDTH,FRONT_H,DEPTH],[0,FRONT_H,DEPTH]],
  [0,1,2, 0,2,3, 3,2,4, 3,4,5],
  [[0,0],[1,0],[1,KINK_Z/DEPTH],[0,KINK_Z/DEPTH],[1,1],[0,1]]
);
const ceiling = new THREE.Mesh(ceilGeo, woodCeil);
room.add(ceiling);

// ---------- Corner posts (real fix for the recurring "floating framing" bug) ----------
// ROOT CAUSE (confirmed via scene inspection, same method used for the two earlier rounds of this
// bug): LW1 (the door wall) renders invisible by default in the outside cutaway view. The SW1/SW2
// rail runs — after the backrest-bar fix that made them span the FULL wall length on direct
// request — end right at that z=0 corner with nothing behind them, which reads as loose framing
// hanging in open air. Pulling the rails back again would undo the explicit "extend to the wall"
// fix, so instead: add a REAL corner post at both SW1/LW1 and SW2/LW1 corners, floor to roofline,
// on its own material (cornerPostMat, not woodWall) so it stays solid regardless of
// wallOutsideOpacity/insideMode. This isn't a rendering trick — a timber-frame build has a real
// structural post at every corner whether or not the wall cladding between posts is up, so this is
// also more architecturally honest than the wall panel it's standing in for. Gives every rail run
// (light rail + both backrests) a solid, grounded terminus at the open end, and will keep doing so
// for any future feature that needs to reach this corner — the fix isn't specific to one rail.
const CORNER_POST_W = ftIn(0,4); // 4" square post, sized like a real corner timber
function buildCornerPosts(){
  const g = new THREE.Group();
  [0, WIDTH].forEach(x=>{
    const post = new THREE.Mesh(new THREE.BoxGeometry(CORNER_POST_W, BACK_H, CORNER_POST_W), cornerPostMat);
    post.position.set(x, BACK_H/2, 0);
    post.castShadow = true; post.receiveShadow = true;
    g.add(post);
  });
  return g;
}
room.add(buildCornerPosts());

scene.add(room);

// ---------- Window (right wall) — hollow frame + glass pane filling the cut opening ----------
// Built by a rebuild function (not inline) so the click-to-edit panel can move/resize the
// window live — this regenerates the ACTUAL cut hole in the wall geometry, not just an overlay.
const windowTrimMat = new THREE.MeshStandardMaterial({map: TEX ? deckMap(1.5,4) : null, roughnessMap: TEX ? deckRoughMap(1.5,4) : null, color: TEX ? 0xffffff : 0x3a2414, roughness: TEX ? 1.0 : 0.55, envMapIntensity:0.12});

// ---------- Imported real window panel model (user-supplied OBJ+MTL) ----------
// Parsed once at startup into a reusable, recentered template group; buildWindowFixtures() clones
// + non-uniformly rescales it per rebuild in place of the 4 procedural trim bars, when it loaded
// successfully. Falls back to the procedural bars (below) if the model or loaders aren't present.
let windowModelTemplate = null;
(function loadWindowModelTemplate(){
  const MODEL = (typeof window !== 'undefined' && window.__MODEL) ? window.__MODEL : null;
  if(!MODEL || !THREE.MTLLoader || !THREE.OBJLoader) return;
  try{
    const mtlLoader = new THREE.MTLLoader();
    const materials = mtlLoader.parse(MODEL.windowMtl, '');
    materials.preload();
    const objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    const root = objLoader.parse(MODEL.windowObj);

    const template = new THREE.Group();
    root.updateMatrixWorld(true);
    root.traverse(function(child){
      if(!child.isMesh) return;
      const matName = (child.material && child.material.name) ? child.material.name : '';
      // Keep only the real frame wood (Wood_5 / Material.001). Discard Glass (we use our own
      // procedural pane so the glass-type toggle keeps working) and hidden_material, which belongs
      // to the "CTRL_Hole" object — a Blender boolean-cutter helper mesh, not a visible part.
      if(matName !== 'Wood_5' && matName !== 'Material.001') return;
      const m = new THREE.Mesh(child.geometry.clone().applyMatrix4(child.matrixWorld), windowTrimMat);
      m.castShadow = true; m.receiveShadow = true;
      template.add(m);
    });
    if(!template.children.length){ windowModelTemplate = null; return; }

    // Recenter the assembled frame at the local origin (template has identity transform so far).
    const box0 = new THREE.Box3().setFromObject(template);
    const center = box0.getCenter(new THREE.Vector3());
    template.children.forEach(function(m){ m.geometry.translate(-center.x, -center.y, -center.z); });

    // Remap axes: the model's native X = width (~2.5), Y = height (~2.0), Z = thickness (~0.05).
    // The target wall (SW1, x=WIDTH) needs thickness along world X, width along world Z, height
    // along world Y — rotate the whole template 90° about Y so native X lands on world Z.
    template.rotation.y = Math.PI/2;
    template.updateMatrixWorld(true);
    const box1 = new THREE.Box3().setFromObject(template);
    const size1 = box1.getSize(new THREE.Vector3());
    template.userData.nativeSize = size1; // post-rotation {x:thickness, y:height, z:width}

    windowModelTemplate = template;
  }catch(e){
    windowModelTemplate = null;
  }
})();

const winGroup = new THREE.Group();
let exteriorGlow = null;
let currentWindowGlassType = 'clear';
function disposeGroupChildren(g){
  while(g.children.length){
    const c = g.children.pop();
    if(c.geometry) c.geometry.dispose();
    g.remove(c);
  }
}
function buildWindowFixtures(){
  disposeGroupChildren(winGroup);
  const winW = WIN_W, winH = WIN_H, winZ = WIN_Z, winY = WIN_Y, trim = WIN_TRIM;
  const wallX = WIDTH;

  if(windowModelTemplate){
    // Real imported panel model, standing in for the 4 procedural trim bars — cloned + rescaled
    // non-uniformly per rebuild to match the live window width/height/trim controls.
    const frame = windowModelTemplate.clone(true);
    const native = windowModelTemplate.userData.nativeSize || {x:0.12, y:2, z:2.5};
    const FRAME_THICK = 0.12;
    frame.scale.set(FRAME_THICK/Math.max(native.x,1e-4), (winH+trim*2)/Math.max(native.y,1e-4), (winW+trim*2)/Math.max(native.z,1e-4));
    frame.position.set(wallX, winY, winZ);
    winGroup.add(frame);
  } else {
  // 4 trim bars forming a hollow frame (top, bottom, left, right)
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, trim, winW+trim*2), windowTrimMat);
  topBar.position.set(wallX, winY+winH/2+trim/2, winZ);
  winGroup.add(topBar);
  const botBar = topBar.clone(); botBar.position.set(wallX, winY-winH/2-trim/2, winZ);
  winGroup.add(botBar);
  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, winH, trim), windowTrimMat);
  leftBar.position.set(wallX, winY, winZ-winW/2-trim/2);
  winGroup.add(leftBar);
  const rightBar = leftBar.clone(); rightBar.position.set(wallX, winY, winZ+winW/2+trim/2);
  winGroup.add(rightBar);
  }

  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, winH-0.06, winW-0.06), windowGlassMat);
  pane.position.set(wallX, winY, winZ);
  winGroup.add(pane);

  // Glass-block variant (grid of small frosted blocks filling the same opening) — real wood
  // mullions/spacers run between every row and column (selectable species, see
  // setGlassBlockFrameWood), so this reads as a proper framed feature-wall grid rather than
  // blocks just butted against each other with a bare gap.
  const blockGroup = new THREE.Group();
  const bCols = Math.max(2, Math.round(winW/0.55)), bRows = Math.max(1, Math.round(winH/0.5));
  const bw = (winW-0.06)/bCols, bh = (winH-0.06)/bRows;
  const SPACER_T = 0.045; // wood spacer thickness in-plane, real reveal between panes
  for(let r=0;r<bRows;r++){
    for(let ci=0;ci<bCols;ci++){
      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.05, bh-SPACER_T, bw-SPACER_T), windowBlockMat);
      blk.position.set(wallX, winY-winH/2+bh/2+r*bh, winZ-winW/2+bw/2+ci*bw);
      blockGroup.add(blk);
    }
  }
  // Horizontal spacers (between rows)
  for(let r=1;r<bRows;r++){
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.052, SPACER_T, winW-0.06), glassBlockFrameMat);
    sp.position.set(wallX, winY-winH/2+bh*r, winZ);
    blockGroup.add(sp);
  }
  // Vertical spacers (between columns)
  for(let ci=1;ci<bCols;ci++){
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.052, winH-0.06, SPACER_T), glassBlockFrameMat);
    sp.position.set(wallX, winY, winZ-winW/2+bw*ci);
    blockGroup.add(sp);
  }
  blockGroup.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  blockGroup.visible = (currentWindowGlassType === 'block');
  winGroup.add(blockGroup);
  windowBlockGroupRef = blockGroup;
  windowGroupRef = winGroup;
  windowPaneRef = pane;
  pane.visible = (currentWindowGlassType !== 'block');

  if(exteriorGlow) exteriorGlow.position.set(WIDTH+0.6, winY, winZ);
}
windowBlockMat = new THREE.MeshStandardMaterial({color:0xdcefff, roughness:0.7, transparent:true, opacity:0.78, envMapIntensity:0.15});
glassBlockFrameMat = woodPbrMat('wood1Diff','wood1Rough','wood1Normal');
buildWindowFixtures();
room.add(winGroup);
exteriorGlow = new THREE.PointLight(0xcfe8ff, 0.4, 5);
exteriorGlow.position.set(WIDTH+0.6, WIN_Y, WIN_Z);
scene.add(exteriorGlow);

// ---------- Window glass options (Clear / Frosted / Ocean Tint / Glass Block) ----------
window.setWindowGlass = function(type){
  currentWindowGlassType = type;
  if(!windowPaneRef) return;
  if(type === 'block'){
    windowPaneRef.visible = false;
    if(windowBlockGroupRef) windowBlockGroupRef.visible = true;
    return;
  }
  if(windowBlockGroupRef) windowBlockGroupRef.visible = false;
  windowPaneRef.visible = true;
  if(type === 'frosted'){
    windowGlassMat.color.set(0xeaf4ff); windowGlassMat.roughness = 0.55; windowGlassMat.transmission = 0.35; windowGlassMat.opacity = 0.9;
  } else if(type === 'tint'){
    windowGlassMat.color.set(0x8fd6c2); windowGlassMat.roughness = 0.08; windowGlassMat.transmission = 0.75; windowGlassMat.opacity = 0.65;
  } else {
    windowGlassMat.color.set(0xbfe3ff); windowGlassMat.roughness = 0.05; windowGlassMat.transmission = 0.85; windowGlassMat.opacity = 0.55;
  }
};

// Glass-block spacer/frame wood — selectable between the two real PBR sets, per spec ("a
// selectable set of these as a frame/spacer for rows of the glass blocks"). Rebuilds the block
// grid's mullions with the new material; only relevant when the glass-block variant is selected.
window.setGlassBlockFrameWood = function(kind){
  currentGlassBlockFrameWood = (kind === 'wood8') ? 'wood8' : 'wood1';
  glassBlockFrameMat = (currentGlassBlockFrameWood === 'wood8')
    ? woodPbrMat('wood8Diff','wood8Rough','wood8Normal')
    : woodPbrMat('wood1Diff','wood1Rough','wood1Normal');
  buildWindowFixtures();
};

// ---------- Window position & size (real geometry — moves/resizes the actual cut opening) ----------
// BUG FIX (2026-07-30, direct report: "the reigns taken off of width/height/place on the wall/
// height off floor - set to weird settings that make it so you cannot move it where you want"):
// the old z/y clamps were flat numbers computed off a FIXED window size, so shrinking the window
// never actually freed up more travel room the way it should have (the UI slider bounds were
// separately hardcoded too — see build_render2.py's structuralFieldsFor, now computed the same
// live way in JS instead of a second, driftable set of numbers). The height range also used the
// flat BACK_H instead of the real (sloped, near the KINK_Z/front-wall end) roofline via heightAt().
// z/y now genuinely reclamp every time ANY of w/h/z/y changes, against the CURRENT window size and
// the real z=0 corner post (see CORNER_POST_W — the only actual obstruction at that end; the
// z=DEPTH/LW2 end has no post, just a smaller constructive trim margin).
function reclampWindowGeometry(){
  const z0Margin = WIN_W/2 + CORNER_POST_W/2 + ftIn(0,1); // clear the real corner post at z=0
  const z1Margin = DEPTH - WIN_W/2 - ftIn(0,4);           // modest corner-framing trim at the z=DEPTH/LW2 end (no post there)
  const zLo = Math.min(z0Margin, z1Margin), zHi = Math.max(z0Margin, z1Margin);
  WIN_Z = Math.min(zHi, Math.max(zLo, WIN_Z));
  const roofAtZ = heightAt(WIN_Z);
  const yMin = WIN_H/2 + ftIn(0,8);                       // real minimum — low enough for a picture-style window, still clear of the floor
  const yMax = Math.max(yMin, roofAtZ - WIN_H/2 - ftIn(0,3)); // real roofline headroom AT this window's own z (sloped near the front), not a flat BACK_H
  WIN_Y = Math.min(yMax, Math.max(yMin, WIN_Y));
}
window.setWindowGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'w') WIN_W = Math.min(WIN_W_MAX, Math.max(WIN_W_MIN, v));
  else if(field === 'h') WIN_H = Math.min(WIN_H_MAX, Math.max(WIN_H_MIN, v));
  else if(field === 'z') WIN_Z = v; // clamped below by reclampWindowGeometry, using the current w/h
  else if(field === 'y') WIN_Y = v;
  reclampWindowGeometry();
  const old = rightWall.geometry;
  rightWall.geometry = buildRightWallGeo();
  old.dispose();
  buildWindowFixtures();
  window.setWindowGlass(currentWindowGlassType);
  // The SW1 exterior slats' own clearance gap AND the new rainscreen backing panel behind them
  // (see extSlatBackingMat) both cut around this same window opening — keep them live with it too,
  // same as the door-tracking calls elsewhere, instead of freezing them at whatever the window's
  // position/size was on first load.
  if(typeof buildExtSlatGroup === 'function') buildExtSlatGroup();
};
// Exposed so the toolbar can render sliders whose bounds always match this exact live logic,
// instead of a second hardcoded set of numbers on the Python/HTML side that can drift out of sync.
window.getWindowRanges = function(){
  const z0Margin = WIN_W/2 + CORNER_POST_W/2 + ftIn(0,1);
  const z1Margin = DEPTH - WIN_W/2 - ftIn(0,4);
  const roofAtZ = heightAt(WIN_Z);
  const yMin = WIN_H/2 + ftIn(0,8);
  const yMax = Math.max(yMin, roofAtZ - WIN_H/2 - ftIn(0,3));
  return {
    w: {min: WIN_W_MIN, max: WIN_W_MAX},
    h: {min: WIN_H_MIN, max: WIN_H_MAX},
    z: {min: Math.min(z0Margin, z1Margin), max: Math.max(z0Margin, z1Margin)},
    y: {min: yMin, max: yMax},
  };
};

// ---------- SW2 "tank window" — DELETED (2026-07-29) ----------
// Direct instruction: "delete the tank windows the go through to the bathroom - no point." This
// frosted-glass-block clerestory strip on SW2 was originally sized/positioned as a real interior
// window looking through to the ensuite/bathroom that used to sit on the other side of that wall —
// once the ensuite itself was deleted earlier this session, the window had nothing left to look
// into, so it's gone too: buildFrontGlassGroup(), setFrontGlassTone/setFrontGlassGeometry,
// frontGlassGroupRef/frontGlassBlockMat and their light, plus the matching sidebar panel, budget
// line, and getDesignState/applyDesignState fields, all removed. (The real SW1 window and its own
// separate "Glass Block" pane STYLE option are unrelated and untouched — that's a different feature
// entirely, just sharing similar name.)
// (SW1's warm 3-layer glass block accent was removed per an earlier request — the SW1 window stands
// alone on that wall.)

// ---------- Yard: plain ground, no trees (kept out of the field of view) ----------
{
  function grassTexture(){
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#3c5a34';
    ctx.fillRect(0,0,256,256);
    for(let i=0;i<3000;i++){
      const g = 60+Math.random()*70;
      ctx.fillStyle = `rgba(${g*0.55},${g},${g*0.45},${0.15+Math.random()*0.25})`;
      const x=Math.random()*256, y=Math.random()*256;
      ctx.fillRect(x,y,1.5,3+Math.random()*3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  const grassTex = grassTexture();
  grassTex.repeat.set(14,14);
  const groundMat = new THREE.MeshStandardMaterial({map:grassTex, roughness:0.95});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70,70), groundMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.set(WIDTH/2, -0.04, DEPTH/2);
  ground.receiveShadow = true;
  scene.add(ground);
}

// Star ceiling lights + recessed downlights are built further down, AFTER the bench-zone
// soffit — their ceiling-mount height needs to know where the dropped canopy is so fixtures
// don't end up mounted above it (invisible from inside).

// ---------- Door — YamaZina Mark 2 spec ----------
// Real dimensions default to the design spec (smaller than a residential door): 72"H x 24"W,
// cedar, glass viewing window in the top half with a mandatory 5" wood margin on every side of
// the glass, lightly frosted by default. BUG FIX (2026-07-30, direct report: "the reigns taken
// off of width/height... set to weird settings that make it so you cannot move it where you
// want"): these used to be hard-locked consts with no-op setters. Real, working sliders now —
// see window.setDoorWidth/setDoorHeight below and rebuildDoorGeometry() — still real-world
// bounded (DOOR_W_MIN/MAX, DOOR_H_MIN/MAX, and the roofline-aware sill-height max in
// getDoorHeightRangeIn) so a change here can't produce a door that doesn't actually fit the
// building, just no longer locked to one specific number.
let doorW = ftIn(2,0);   // 24" default
let doorH = ftIn(6,0);   // 72" default
const DOOR_GLASS_MARGIN = ftIn(0,5); // 5" mandatory wood margin on every side of the glass
let DECK_H = ftIn(2,0); // exterior deck height above the concrete slab — real-world starting number
                         // per your note, will need fine-tuning once the actual slab-to-deck rise is
                         // field-measured; live-adjustable below (setStairGeometry('deckH', ...)).
// Door sill defaults to the INTERIOR floor deck's height (4-1/4", same as LANDING_H) — the exterior
// DECK_H default was a misread of an earlier note and got corrected back per spec: "the target
// depth for the bottom of the stairs / the landing with the door is the same height as the flooring
// deck in the sauna, not the exterior deck." So the door sits flush with the sauna's own 4-1/4" floor
// deck, and the stair flight outside makes up the real remaining rise up to the exterior DECK_H.
const DOOR_LEFT_MARGIN = ftIn(0,6);  // 6" off the left wall
// NOTE: uses the literal 4.25" value (not a reference to LANDING_H) because LANDING_H is declared
// further down this file and DOOR_FLOAT_H is evaluated here first — same real height either way.
const DOOR_FLOAT_H = ftIn(0,4.25);   // sill flush with the interior 4-1/4" floor deck, not the exterior deck
const doorGroup = new THREE.Group();
const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW-0.05, doorH, 0.1), doorMat);
doorGroup.add(doorPanel);
const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.02), doorGlassMat); // sized by setDoorGlassExtent below; lightly frosted per spec
doorGlass.position.set(0,0,0.06);
doorGroup.add(doorGlass);
doorGlassRef = doorGlass;
const doorFrameMat = new THREE.MeshStandardMaterial({map: TEX ? deckMap(2.2,6.2) : null, roughnessMap: TEX ? deckRoughMap(2.2,6.2) : null, color: TEX ? 0xffffff : 0x2a1a10, roughness: TEX ? 1.0 : 0.5, envMapIntensity:0.12});
const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW+0.08, doorH+0.1, 0.05), doorFrameMat);
doorFrame.position.set(0,0,-0.03);
doorGroup.add(doorFrame);
const DOOR_Y_DEFAULT = DOOR_FLOAT_H + doorH/2;
// Version 6 default (2026-07-29): door centered on LW1 — was DOOR_LEFT_MARGIN + doorW/2 (6" off the
// left/SW2 corner). DOOR_LEFT_MARGIN itself is left in place — it still defines the minimum-clear
// bound used elsewhere (setDoorPosition's clamp range), just no longer the door's own resting spot.
doorGroup.position.set(WIDTH/2, DOOR_Y_DEFAULT, 0.05); // flush with the interior 4-1/4" floor deck, centered on the wall
room.add(doorGroup);
// Door panel AND frame need to go translucent for the default outside view (see setView below)
// without that state getting lost on other tone changes — starts translucent since the outside
// dollhouse cutaway is the default view (matches backWall.visible=false above), so the SW1
// window and interior actually read through it instead of a solid cedar slab blocking that corner.
// The frame sits nearer the outside camera than the panel and is larger than it in x/y, so it was
// fully occluding the panel+glass behind it while it stayed opaque — both have to go translucent
// together or the door still reads as one solid rectangle from outside.
// depthWrite:false so these two overlapping layers (frame sits nearest the outside camera,
// almost the same screen footprint as the panel behind it) don't depth-cull each other or the
// glass pane and interior sitting behind both of them once they're translucent.
doorMat.transparent = true;
doorMat.depthWrite = false;
doorFrameMat.transparent = true;
doorFrameMat.depthWrite = false;
// User-adjustable "how see-through in the default outside view" level (0 = invisible, 1 = fully
// solid) — a real slider instead of a fixed baked-in amount. Only applies outside/default; still
// forced solid the moment you step inside (see setView), then this is what it snaps back to.
let doorOutsideOpacity = 0.22;
function applyDoorOutsideOpacity(){
  doorMat.opacity = doorOutsideOpacity;
  doorFrameMat.opacity = Math.max(0, doorOutsideOpacity - 0.02);
}
applyDoorOutsideOpacity();
window.setDoorTransparency = function(v){
  doorOutsideOpacity = Math.min(1, Math.max(0, parseFloat(v)));
  if(!insideMode) applyDoorOutsideOpacity();
};

// ---------- Door glass extent (top half / top two-thirds / solid) + wood tone ----------
// Glass rectangle is computed from the actual door dimensions and DOOR_GLASS_MARGIN — not
// hand-tuned numbers — so the 5" wood-margin rule holds even if doorW/doorH ever change.
// (The imported circular-window FBX accent that used to live here was pulled out during the
// 2026-07-29 cleanup pass — real load-time/complexity cost for a minor decorative option, per
// SAUNA_APP_TODO_CLEANUP.md. 'circular' is still accepted as an input alias below and just falls
// back to the 'half' rectangular glass so any old saved state doesn't break.)
let doorGlassExtent = 'half';
function applyDoorGlassExtent(extent){
  if(extent === 'circular') extent = 'half';
  doorGlassExtent = extent;
  if(!doorGlassRef) return;
  if(extent === 'solid'){
    doorGlassRef.visible = false;
    return;
  }
  doorGlassRef.visible = true;
  const zoneBottomLocal = extent === 'twoThirds' ? (doorH/2 - doorH*(2/3)) : 0; // door-local, center = 0
  const glassTop = doorH/2 - DOOR_GLASS_MARGIN;
  const glassBottom = zoneBottomLocal + DOOR_GLASS_MARGIN;
  const glassH = Math.max(0.1, glassTop - glassBottom);
  const glassW = Math.max(0.1, doorW - 2*DOOR_GLASS_MARGIN);
  const old = doorGlassRef.geometry;
  doorGlassRef.geometry = new THREE.BoxGeometry(glassW, glassH, 0.02);
  old.dispose();
  doorGlassRef.position.y = (glassTop+glassBottom)/2;
}
applyDoorGlassExtent('half');
window.setDoorStyle = function(style){
  // 'full' kept as an accepted alias for 'twoThirds' so any older saved version still applies.
  if(style === 'solid') applyDoorGlassExtent('solid');
  else if(style === 'circular') applyDoorGlassExtent('circular');
  else if(style === 'twoThirds' || style === 'full') applyDoorGlassExtent('twoThirds');
  else applyDoorGlassExtent('half');
};
window.setDoorTone = function(hex){
  doorMat.color.set(hex);
};

// ---------- Door position (size is fixed per spec — see doorW/doorH above) ----------
// Phase 3: the back wall no longer carries a bench run (that moved to the front+right walls),
// so the door's only real constraint left on this wall is the right-wall bench's own footprint,
// which still reaches all the way back to this wall at its corner. Slides along the full clear
// span of LW1 — from right next to SW2 (where it starts) out toward SW1 on the other end.
// (LOW_DEPTH/runB_wall aren't defined yet at this point in the file — the min/max are computed
// lazily inside the function, evaluated only once it's actually called after the full script has
// run, same as it worked before this was refactored.) Wall-aware: the return-leg bench (see the
// bench-run section below) can now live on SW1 (x=WIDTH, the original default) or SW2 (x=0) — the
// door's forbidden zone flips sides to match wherever that bench actually is.
// DOOR_CORNER_CLEAR: the two real corner posts (see buildCornerPosts, room-shell section above)
// stand CORNER_POST_W/2 proud of each x=0/x=WIDTH wall corner. The old flat 0.05ft (~0.6") margin
// on the corner-facing clamp bounds predates those posts and would let the door's jamb swing into
// solid post geometry at the extreme end of its travel — found via a live drag test after adding
// the posts, same as the earlier heater/wall-clip bug. Only the two clamp expressions that actually
// approach a post corner (minX below when the door's forbidden zone is on the SW1 side, maxX when
// it's on the SW2 side) need the bigger margin — the other bound is limited by the landing/deck
// footprint, not a post, so it keeps the old tight clearance.
const DOOR_CORNER_CLEAR = CORNER_POST_W/2 + ftIn(0,1); // post half-width + a 1" reveal past its face
window.setDoorPosition = function(v){
  const val = parseFloat(v);
  let minX, maxX;
  if(typeof runB_wall === 'undefined' || runB_wall === 'SW1'){
    minX = doorW/2 + DOOR_CORNER_CLEAR;
    maxX = Math.max(minX, (WIDTH-LOW_DEPTH) - doorW/2 - 0.05);
  } else {
    minX = Math.min(WIDTH - doorW/2 - 0.05, LOW_DEPTH + doorW/2 + 0.05);
    maxX = WIDTH - doorW/2 - DOOR_CORNER_CLEAR;
  }
  doorGroup.position.x = Math.min(maxX, Math.max(minX, val));
  if(typeof buildDeckGroup === 'function') buildDeckGroup();
  if(typeof buildValanceGroup === 'function') buildValanceGroup(); // the LW1 valance gap tracks the door live, same as the deck notch above
  if(typeof buildFakeValanceGroup === 'function') buildFakeValanceGroup(); // the backrest rails' LW1 gap tracks the door live too
  if(typeof buildExtSlatGroup === 'function') buildExtSlatGroup(); // the LW1 exterior slat gap tracks the door live too
  if(typeof buildLandingGroup === 'function') buildLandingGroup(); // the interior landing platform tracks the door live too — see the BUG FIX note above LANDING_W
  // A dragged door could in principle push the (now door-tracking) landing platform into the return
  // leg's SW2 footprint — re-check and only compromise the return leg's length if that's actually
  // happened, same real-overlap logic the wall-reassignment control uses.
  if(typeof reclampReturnRunForLanding === 'function'){ reclampReturnRunForLanding(); buildBenchGroup(); }
};
// Second plane of motion, so the door isn't only draggable along the wall — an absolute sill
// height off the sauna floor, in inches, defaulting to flush with the 4-1/4" deck. Real range
// (not just a small trim) so it can genuinely be repositioned, clamped to stay buildable against
// the landing/steps outside; the floor deck top (4.25") is the physical floor for the minimum —
// the door can't sit below the surface leading up to it.
// BUG FIX (2026-07-30): the old flat 36in ceiling here was never actually checked against the
// real roofline — at BACK_H (92in) with a 72in door, sill heights past ~20in already push the
// door's TOP through the ceiling, a real physical break the flat 36in number let you drag right
// into. Replaced with a real roofline-aware max (computed fresh from the CURRENT doorH, so a
// height change re-derives it too) — this is what "much wider, but still physically valid" means
// here: the true buildable range for a 72in door in a 92in flat ceiling tops out well under 36in,
// so the honest fix makes the number smaller/correct, not just bigger.
const DOOR_HEIGHT_IN_MIN = 4.25; // 4.25in — the floor deck top; the door can't sit below the surface leading up to it
const DOOR_HEAD_MARGIN = ftIn(0,2); // 2in header clearance kept between the door top and the roofline
window.getDoorHeightRangeIn = function(){
  const maxIn = Math.max(DOOR_HEIGHT_IN_MIN, (BACK_H - doorH - DOOR_HEAD_MARGIN) * 12);
  return { min: DOOR_HEIGHT_IN_MIN, max: maxIn };
};
window.setDoorHeightAboveFloor = function(inches){
  const range = window.getDoorHeightRangeIn();
  const inch = Math.min(range.max, Math.max(range.min, parseFloat(inches)));
  doorGroup.position.y = inch/12 + doorH/2;
};
// Real width/height controls (was: hard-locked to the 24"x72" spec with no-op setters — see the
// BUG FIX note above doorW/doorH). Still real-world bounded, not "anything goes": DOOR_W_MAX/
// DOOR_H_MAX are picked so even at their extremes the door still physically fits the wall/roofline
// (DOOR_H_MAX=84in leaves real headroom under BACK_H=92in at the minimum sill height, checked via
// getDoorHeightRangeIn above rather than assumed).
const DOOR_W_MIN = ftIn(1,8), DOOR_W_MAX = ftIn(3,0);   // 20in - 36in
const DOOR_H_MIN = ftIn(5,6), DOOR_H_MAX = ftIn(7,0);   // 66in - 84in
function rebuildDoorGeometry(){
  const oldPanelGeo = doorPanel.geometry;
  doorPanel.geometry = new THREE.BoxGeometry(doorW-0.05, doorH, 0.1);
  oldPanelGeo.dispose();
  const oldFrameGeo = doorFrame.geometry;
  doorFrame.geometry = new THREE.BoxGeometry(doorW+0.08, doorH+0.1, 0.05);
  oldFrameGeo.dispose();
  applyDoorGlassExtent(doorGlassExtent); // re-derives the glass pane size/position from the new doorW/doorH + the fixed 5in margin rule
}
window.setDoorWidth = function(value){
  const v = Math.min(DOOR_W_MAX, Math.max(DOOR_W_MIN, parseFloat(value)));
  if(Number.isNaN(v)) return;
  doorW = v;
  rebuildDoorGeometry();
  // Re-clamp the door's own position against the new width AND refresh every doorW-dependent
  // group in one call (rail door-gaps, ext-slat door-gap, deck notch, landing platform) — this is
  // the exact same rebuild set window.setDoorPosition already triggers, so routing through it here
  // instead of duplicating the list keeps the two paths from drifting apart.
  window.setDoorPosition(doorGroup.position.x);
};
window.setDoorHeight = function(value){
  const v = Math.min(DOOR_H_MAX, Math.max(DOOR_H_MIN, parseFloat(value)));
  if(Number.isNaN(v)) return;
  const sillFt = doorGroup.position.y - doorH/2; // capture the CURRENT sill height before doorH changes
  doorH = v;
  rebuildDoorGeometry();
  // Re-applies (and re-clamps — a taller door leaves less roofline headroom) using the new doorH.
  window.setDoorHeightAboveFloor(sillFt*12);
};

// Shared by every THREE.InstancedMesh built below (the 3 wall rails' standoff blocks, exterior
// slat boards) — one identity quaternion/scale reused across every matrix.compose() call rather
// than allocating a fresh one per instance.
const IDENTITY_QUAT = new THREE.Quaternion();
const ONE_VEC = new THREE.Vector3(1,1,1);

// ---------- The 3 wall rails, shared construction ----------
// All three — the LED "light rail" (middle) and the two plain "backrest" rails above/below it —
// are now the SAME physical thing: a board held off the wall on individually-spaced standoff
// blocks, same standoff distance, same block pitch. Only the middle one carries LEDs. Wraps
// LW2/SW1/SW2 by default; LW1 (the door wall) defaults OFF for all three, same reasoning
// everywhere it comes up in this file — it's the wall the app's default outside cutaway looks
// straight through, and dressing that wall in trim reads as floating framing once the wall itself
// goes invisible behind it. It's a real per-rail toggle now (RAIL_WALLS below), not a hard rule.
let RAIL_STANDOFF = ftIn(0,1);      // shared by all 3 rails — how far each stands proud of the wall
let RAIL_BLOCK_PITCH = ftIn(1,2);   // ~14" on-center between support blocks — "spread out"
const RAIL_H = ftIn(0,2.5);
const RAIL_T = ftIn(0,1);
const RAIL_BLOCK_W = ftIn(0,2), RAIL_BLOCK_H = ftIn(0,2);
const RAIL_DOOR_CLEAR = ftIn(0,4);  // extra clearance each side of the door opening before a rail resumes
// Declared here (moved up from the camera/view section further down) so lw1IsOpen() below can read
// it safely — the very first buildValanceGroup()/buildFakeValanceGroup() call happens at initial
// script load, before the camera section would otherwise run. setView() (camera section) still owns
// updating this on every inside/outside toggle.
let insideMode = false;
// BUG FIX v2 (2026-07-29 — reported twice now: "reveals the framing outside"). ROOT CAUSE FOUND
// this round via a real Playwright inspection of the actual scene graph, not a guess: the SW1/SW2
// rail runs (light rail + both backrest rails) always span the FULL depth (z:0..DEPTH), including
// the end at z=0 where they meet LW1. LW1 (the door wall) is INVISIBLE by design in the default
// outside "cutaway" view (wallOutsideOpacity defaults to 0) — so that rail end just hangs in open
// air with nothing behind it to read as "mounted to a wall," which looks exactly like loose,
// disconnected framing boards floating outside the building. The previous attempt at this fix
// (v1) tied the trim to whether the DOOR happened to be pushed flush into that exact corner — WRONG
// premise, confirmed by direct inspection: the bug reproduces at ANY door position, because the
// real cause is LW1 being open, not where the door sits. Fixed properly now: trim is unconditional
// on door position and tied directly to whether LW1 currently reads as open (outside view, wall
// slider low) — and re-evaluated live any time that changes (see setView/setWallTransparency below,
// which now call buildValanceGroup()/buildFakeValanceGroup() on every toggle).
function lw1IsOpen(){
  return !insideMode && wallOutsideOpacity < 0.4;
}
const RAIL_LW1_CLEAR = ftIn(1,6); // 18" pull-back from the open LW1 corner — enough that the rail
                                   // reads as running along the wall, not cut off at the open edge.
function railSWCornerClear(wallX){
  return lw1IsOpen() ? RAIL_LW1_CLEAR : 0;
}
const railWoodMat = new THREE.MeshStandardMaterial({map: TEX ? cedarMap(1,1) : null, color: TEX ? 0xe8c99a : 0xd8ac76, roughness:0.68, envMapIntensity:0.25});
const valanceWoodMat = railWoodMat; // old name kept as an alias — several other sections still reference it directly

// ---------- Wall valance (middle rail) — houses a "string style" LED wrap ----------
// Board-on-blocks, same as the two plain rails below, but the LEDs mount on the BACK of the
// board (the wall-facing side, tucked in the gap the standoff creates) instead of being boxed in
// behind a separate fascia lip — there's no lip/bottom-channel at all now, so light spills both up
// AND down around the board's edges instead of being confined to a single glow direction. Half as
// many bulbs as before, each twice as bright, net similar total light output but a more visible
// "string of bulbs" look per the request. Runs at roughly "ear height" (60in/5ft off the floor).
const VALANCE_H = ftIn(5,0);
let valanceGroupRef = null, valanceEditableEntry = null;
const valanceLedLights = [];
const valanceLedMaterials = [];
let RAIL_WALLS = { LW1:false, LW2:true, SW1:true, SW2:true }; // shared by all 3 rails
function buildValanceGroup(){
  const g = valanceGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  valanceLedLights.forEach(l=> scene.remove(l));
  valanceLedLights.length = 0;
  valanceLedMaterials.length = 0;
  const pieces = [];
  // One shared bead material for the whole wrap (same "one circuit" pattern as the bench LED
  // strips/downlights) so the color/intensity controls change every bead at once.
  const beadMat = new THREE.MeshStandardMaterial({color:0xffcf9e, emissive:0xffcf9e, emissiveIntensity:2.8, roughness:0.4});
  valanceLedMaterials.push(beadMat);
  const boardY = VALANCE_H;

  // isXWall=true: wall face is at fixed z (LW1/LW2), run travels along X, cx=run center, len=run length.
  // isXWall=false: wall face is at fixed x (SW1/SW2), run travels along Z, cz=run center, len=run length.
  // inwardSign: +1 if the room interior is toward increasing x/z from the wall face, -1 otherwise.
  function segment(cx, cz, len, isXWall, wallFaceCoord, inwardSign){
    if(len <= 0.05) return;
    const boardCenter = wallFaceCoord + inwardSign*(RAIL_STANDOFF + RAIL_T/2);
    let board;
    if(isXWall){
      board = new THREE.Mesh(new THREE.BoxGeometry(len, RAIL_H, RAIL_T), railWoodMat);
      board.position.set(cx, boardY, boardCenter);
    } else {
      board = new THREE.Mesh(new THREE.BoxGeometry(RAIL_T, RAIL_H, len), railWoodMat);
      board.position.set(boardCenter, boardY, cz);
    }
    board.castShadow = true; board.receiveShadow = true;
    g.add(board); pieces.push(board);
    // Standoff blocks, same instanced approach as the plain rails.
    const n = Math.max(2, Math.round(len/RAIL_BLOCK_PITCH));
    const blockCenter = wallFaceCoord + inwardSign*RAIL_STANDOFF/2;
    const blockGeo = isXWall
      ? new THREE.BoxGeometry(RAIL_BLOCK_W, RAIL_BLOCK_H, RAIL_STANDOFF)
      : new THREE.BoxGeometry(RAIL_STANDOFF, RAIL_BLOCK_H, RAIL_BLOCK_W);
    const blockInst = new THREE.InstancedMesh(blockGeo, railWoodMat, n);
    const bm = new THREE.Matrix4();
    for(let i=0;i<n;i++){
      const t = n===1?0.5:i/(n-1);
      const along = -len/2 + RAIL_BLOCK_W/2 + (len-RAIL_BLOCK_W)*t;
      const pos = isXWall ? new THREE.Vector3(cx+along, boardY, blockCenter) : new THREE.Vector3(blockCenter, boardY, cz+along);
      bm.compose(pos, IDENTITY_QUAT, ONE_VEC);
      blockInst.setMatrixAt(i, bm);
    }
    blockInst.instanceMatrix.needsUpdate = true;
    blockInst.castShadow = true; blockInst.receiveShadow = true;
    g.add(blockInst); pieces.push(blockInst);
    // Bulbs mounted on the BACK of the board (the wall-facing side, inside the standoff gap) —
    // half the density of the old design, each twice as bright. No lip means light spills both
    // above and below the board instead of being confined by a fascia channel.
    const bulbInset = wallFaceCoord + inwardSign*(RAIL_STANDOFF*0.35);
    const n2 = Math.max(1, Math.round(len/ftIn(0,10)));
    for(let i=0;i<n2;i++){
      const t = n2===1 ? 0.5 : i/(n2-1);
      const along = -len/2 + 0.2 + (len-0.4)*t;
      const px = isXWall ? cx+along : bulbInset;
      const pz = isXWall ? bulbInset : cz+along;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), beadMat);
      bead.position.set(px, boardY, pz);
      g.add(bead); pieces.push(bead);
      const l = new THREE.PointLight(0xffcf9e, 0.8, 3.2, 2);
      l.position.set(px, boardY, pz);
      l.userData.baseIntensity = 0.8;
      scene.add(l);
      valanceLedLights.push(l);
    }
  }

  if(RAIL_WALLS.LW2) segment(WIDTH/2, DEPTH, WIDTH, true, DEPTH, -1);   // LW2 (back wall) — full run
  // SW1/SW2 — full run UNLESS the door has been moved into that wall's own corner with LW1 (z=0),
  // in which case trim back from z=0 by railSWCornerClear() so the rail doesn't float across the
  // open doorway (see railSWCornerClear's comment for the full failure mode).
  if(RAIL_WALLS.SW1){
    const clr = railSWCornerClear(WIDTH);
    const len = DEPTH - clr;
    if(len > 0.1) segment(WIDTH, clr + len/2, len, false, WIDTH, -1);
  }
  if(RAIL_WALLS.SW2){
    const clr = railSWCornerClear(0);
    const len = DEPTH - clr;
    if(len > 0.1) segment(0, clr + len/2, len, false, 0, 1);
  }
  // LW1 (door wall) — split around the door's live position, when enabled.
  if(RAIL_WALLS.LW1){
    const doorCenterX = doorGroup.position.x;
    const gapX0 = Math.max(0, doorCenterX - doorW/2 - RAIL_DOOR_CLEAR);
    const gapX1 = Math.min(WIDTH, doorCenterX + doorW/2 + RAIL_DOOR_CLEAR);
    if(gapX0 > 0.1) segment(gapX0/2, 0, gapX0, true, 0, 1);
    if(WIDTH-gapX1 > 0.1) segment(gapX1+(WIDTH-gapX1)/2, 0, WIDTH-gapX1, true, 0, 1);
  }

  if(valanceEditableEntry){ valanceEditableEntry.deleted = true; valanceEditableEntry.objects = []; }
  valanceEditableEntry = registerEditable(pieces, 'valanceled', 'Wall Valance — LED Light Rail (middle)');
  valanceGroupRef = g;
  if(!g.parent) room.add(g);
  applyLightLevels(); // new lights need the current on/off + level state applied immediately, not just on the next global change
}
buildValanceGroup();
window.setValanceLedColor = function(hexStr){
  valanceAutoRotateOn = false; // a manual color pick always wins over auto-rotate
  const c = new THREE.Color(hexStr);
  valanceLedMaterials.forEach(m=>{ m.color.copy(c); m.emissive.copy(c); });
  valanceLedLights.forEach(l=> l.color.copy(c));
};
window.setValanceLedLevel = function(v){ lightState.valance.level = parseFloat(v); applyLightLevels(); };
window.toggleValanceLed = function(on){ lightState.valance.on = on; applyLightLevels(); };
// "Make a colour change or rotate function" — this is the "rotate" half: continuously cycles the
// light rail's hue over time instead of sitting on one fixed color. The manual color swatch still
// works for a one-off change and switching it off auto-rotate (see setValanceLedColor above).
let valanceAutoRotateOn = false;
let valanceHue = 0.07;
const _valanceRotateColor = new THREE.Color();
window.setValanceAutoRotate = function(on){ valanceAutoRotateOn = !!on; };
function tickValanceAutoRotate(dt){
  if(!valanceAutoRotateOn) return;
  valanceHue = (valanceHue + dt*0.06) % 1;
  _valanceRotateColor.setHSL(valanceHue, 0.85, 0.55);
  valanceLedMaterials.forEach(m=>{ m.color.copy(_valanceRotateColor); m.emissive.copy(_valanceRotateColor); });
  valanceLedLights.forEach(l=> l.color.copy(_valanceRotateColor));
}
// Shared standoff/wall-selection setter, used by the light rail and both plain rails alike —
// "match the other rails": dragging this one slider keeps all three in sync since they share the
// same RAIL_STANDOFF/RAIL_WALLS state, rather than three independent numbers that can drift apart.
window.setRailGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'standoff') RAIL_STANDOFF = Math.min(ftIn(0,6), Math.max(ftIn(0,0.75), v));
  else if(field === 'blockPitch') RAIL_BLOCK_PITCH = Math.min(ftIn(3,0), Math.max(ftIn(0,6), v));
  buildValanceGroup();
  if(typeof buildFakeValanceGroup === 'function') buildFakeValanceGroup();
};
window.toggleRailWall = function(wallKey, on){
  if(!RAIL_WALLS.hasOwnProperty(wallKey)) return false;
  RAIL_WALLS[wallKey] = !!on;
  buildValanceGroup();
  if(typeof buildFakeValanceGroup === 'function') buildFakeValanceGroup();
  return true;
};

// ---------- "Fake" valance rails — upper & lower, block-standoff-mounted, no lighting ----------
// "Make the valance skinnier off the wall [done above] and make fake valances above and below
// that just have blocks spread out to keep them off the wall — that will function as backrests."
// Two slim rails echoing the main LED valance's wrap (same wall runs, same door gap, same shared
// RAIL_STANDOFF/RAIL_WALLS as the light rail above — "match the other rails"), each held off the
// wall on individually visible spaced-out support blocks instead of a solid shelf — no light row
// (that's what makes them "fake"). The LOWER rail is the functional one: it's a real backrest —
// positioned to land right behind whoever's sitting on the SEAT_HIGH (50") bench, not just
// decoration. The UPPER rail mirrors it above the light rail for a consistent 3-band rhythm
// around the room. Height offsets, run length and which walls are on are live via
// window.setFakeValanceGeometry(field, value) / window.toggleFakeValanceWall(wallKey, on) —
// standoff/blockPitch/wall-toggle route through the SHARED setters (window.setRailGeometry /
// window.toggleRailWall) so all 3 rails move together; flag if the backrest height needs tuning
// once there's a body in the room to check it against.
// BUG FIX (reported, real geometry collision: "the right side bench is being blocked by the lower
// rail"): the lower rail's height was computed as VALANCE_H - FAKE_LOWER_OFFSET = 60in - 13in =
// 47in — the comment next to it claimed that "lands ~9in above the SEAT_HIGH bench's seat surface",
// but the SEAT_HIGH bench surface is at 50in, so 47in is actually 3in BELOW it, not above — bad
// arithmetic on my part, not just a bad screenshot angle. At 47in, mounted ~1.5in off the wall, the
// rail board sits directly inside the high-tier bench's own seat box right where they're both close
// to the wall — a real collision, not a rendering glitch. Rebased off SEAT_HIGH directly (a real
// anchor point) instead of an arbitrary offset below VALANCE_H (which has no defined relationship to
// the bench at all): FAKE_LOWER_OFFSET now means "clearance above the actual bench seat", and the
// upper rail mirrors that same gap on the other side of the light rail, so "the one with lights is
// in the middle" holds by construction instead of by coincidentally-equal numbers.
let FAKE_LOWER_OFFSET = ftIn(0,4);        // 4" of clearance above the SEAT_HIGH bench's seat surface
// "Ensure we can adjust length" — LENGTH_FRAC trims every run symmetrically shorter than the full
// wall span (1.0 = full length, centered).
let FAKE_VALANCE_LENGTH_FRAC = 1.0;
let fakeValanceGroupRef = null, fakeValanceEditableEntry = null;
function buildFakeValanceGroup(){
  const g = fakeValanceGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  const pieces = [];

  function railRun(y, cx, cz, len, isXWall, wallFaceCoord, inwardSign){
    if(len <= 0.05) return;
    const railCenter = wallFaceCoord + inwardSign*(RAIL_STANDOFF + RAIL_T/2);
    let rail;
    if(isXWall){
      rail = new THREE.Mesh(new THREE.BoxGeometry(len, RAIL_H, RAIL_T), railWoodMat);
      rail.position.set(cx, y, railCenter);
    } else {
      rail = new THREE.Mesh(new THREE.BoxGeometry(RAIL_T, RAIL_H, len), railWoodMat);
      rail.position.set(railCenter, y, cz);
    }
    rail.castShadow = true; rail.receiveShadow = true;
    g.add(rail); pieces.push(rail);
    // Individually visible standoff blocks between the rail and the wall face — "blocks spread
    // out to keep them off the wall", not a continuous shelf. Batched into ONE InstancedMesh per
    // rail run instead of a separate Mesh+BoxGeometry per block (keeps draw-call count low — see
    // the mobile-loading fix notes elsewhere in this file).
    const n = Math.max(2, Math.round(len/RAIL_BLOCK_PITCH));
    const blockCenter = wallFaceCoord + inwardSign*RAIL_STANDOFF/2;
    const blockGeo = isXWall
      ? new THREE.BoxGeometry(RAIL_BLOCK_W, RAIL_BLOCK_H, RAIL_STANDOFF)
      : new THREE.BoxGeometry(RAIL_STANDOFF, RAIL_BLOCK_H, RAIL_BLOCK_W);
    const blockInst = new THREE.InstancedMesh(blockGeo, railWoodMat, n);
    const m = new THREE.Matrix4();
    for(let i=0;i<n;i++){
      const t = n===1?0.5:i/(n-1);
      const along = -len/2 + RAIL_BLOCK_W/2 + (len-RAIL_BLOCK_W)*t;
      const pos = isXWall ? new THREE.Vector3(cx+along, y, blockCenter) : new THREE.Vector3(blockCenter, y, cz+along);
      m.compose(pos, IDENTITY_QUAT, ONE_VEC);
      blockInst.setMatrixAt(i, m);
    }
    blockInst.instanceMatrix.needsUpdate = true;
    blockInst.castShadow = true; blockInst.receiveShadow = true;
    g.add(blockInst); pieces.push(blockInst);
  }
  // len is trimmed by FAKE_VALANCE_LENGTH_FRAC, centered on the same cx/cz — so shortening it
  // pulls both ends in evenly rather than shifting the whole run toward one side.
  function bothRails(cx, cz, len, isXWall, wallFaceCoord, inwardSign){
    const trimmedLen = len * FAKE_VALANCE_LENGTH_FRAC;
    // Lower rail anchored off the ACTUAL bench seat height (SEAT_HIGH), not an offset below the
    // light rail — see the comment above FAKE_LOWER_OFFSET for why. Upper rail mirrors the same
    // gap on the other side of the light rail so it stays centered by construction.
    const lowerY = SEAT_HIGH + FAKE_LOWER_OFFSET;
    const upperY = VALANCE_H + (VALANCE_H - lowerY);
    railRun(upperY, cx, cz, trimmedLen, isXWall, wallFaceCoord, inwardSign);
    railRun(lowerY, cx, cz, trimmedLen, isXWall, wallFaceCoord, inwardSign);
  }

  if(RAIL_WALLS.LW2) bothRails(WIDTH/2, DEPTH, WIDTH, true, DEPTH, -1);   // LW2 (back wall)
  // BUG FIX (2026-07-29, direct report: "the backrest bars need to be extended to the wall"): these
  // two used to share the light rail's railSWCornerClear() pull-back — an 18" trim off the LW1
  // corner, added so the (LED-carrying) light rail wouldn't visually float in open air behind the
  // now-invisible LW1 wall in the app's default outside-cutaway view. These plain backrest rails are
  // a real functional backrest, not a lighting detail, and now that the return leg bench runs the
  // FULL wall length (see runB_offset/runB_length above), a backrest 18" short of that would leave
  // the near-wall third of the bench with nothing behind it — a real, physical mismatch, not just a
  // rendering quirk. So these two now always run the full DEPTH, unconditionally, matching the
  // bench underneath them; the light rail's own trim is untouched (not reported as an issue here).
  if(RAIL_WALLS.SW1) bothRails(WIDTH, DEPTH/2, DEPTH, false, WIDTH, -1);
  if(RAIL_WALLS.SW2) bothRails(0, DEPTH/2, DEPTH, false, 0, 1);
  // LW1 (door wall) — split around the door's live position, when enabled.
  if(RAIL_WALLS.LW1){
    const doorCenterX = doorGroup.position.x;
    const gapX0 = Math.max(0, doorCenterX - doorW/2 - RAIL_DOOR_CLEAR);
    const gapX1 = Math.min(WIDTH, doorCenterX + doorW/2 + RAIL_DOOR_CLEAR);
    if(gapX0 > 0.1) bothRails(gapX0/2, 0, gapX0, true, 0, 1);
    if(WIDTH-gapX1 > 0.1) bothRails(gapX1+(WIDTH-gapX1)/2, 0, WIDTH-gapX1, true, 0, 1);
  }

  fakeValanceGroupRef = g;
  if(fakeValanceEditableEntry){ fakeValanceEditableEntry.deleted = true; fakeValanceEditableEntry.objects = []; }
  fakeValanceEditableEntry = registerEditable(pieces, 'fakevalance', 'Backrest Rails — Upper & Lower (block-mounted, no lights)');
  if(!g.parent) room.add(g);
  return g;
}
buildFakeValanceGroup();
window.setFakeValanceGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'standoff' || field === 'blockPitch'){ window.setRailGeometry(field, value); return; }
  // 'upperOffset' is now DERIVED (mirrors the lower rail's gap to the light rail — see bothRails())
  // rather than independently stored, so the light rail always stays exactly centered between the
  // two backrests. Kept as a harmless no-op, not removed, so an older saved version that still has
  // this field in its JSON doesn't throw on load.
  else if(field === 'upperOffset') { /* no-op — derived, see comment above */ }
  else if(field === 'lowerOffset') FAKE_LOWER_OFFSET = Math.min(ftIn(0,10), Math.max(ftIn(0,2), v));
  else if(field === 'length') FAKE_VALANCE_LENGTH_FRAC = Math.min(1, Math.max(0.25, v));
  buildFakeValanceGroup();
};
// Per-wall on/off — the "wall position" half of "adjust length and wall position". wallKey is one
// of 'LW1'/'LW2'/'SW1'/'SW2'. Routes through the shared toggle so all 3 rails stay in sync.
window.toggleFakeValanceWall = function(wallKey, on){
  return window.toggleRailWall(wallKey, on);
};

// ---------- Exterior wall slat cladding — vertical open-joint battens on all 4 outside faces ----------
// "Build some slats with lots of space between them, more of them, along the exterior walls" —
// this is a decorative/rainscreen-style batten treatment on the OUTSIDE of the building envelope,
// not the heater's safety guard (that one's spacing is code-driven, see GUARD_GAP above). These
// gaps are deliberately much wider than a guard-rail would ever be allowed to use — there's no
// fall-safety requirement on a wall cladding board, so the gap-to-board ratio here can go past
// what'd pass for a baluster/guard spacing (which typically caps around 4"). Defaults below run
// about 1" boards on ~3" gaps — flag if you want them tighter/wider or a different ratio.
// Mounted with a small standoff off the wall face (true rainscreen practice — an air gap behind
// the boards) using the same weathered exterior board material as the deck/stairs, so it reads as
// a distinct "outside" material from the interior cedar. Live-adjustable via
// window.setExtSlatGeometry(field, value) — 'width' (board width), 'gap' (space between boards),
// 'standoff' (air gap off the wall). Skips a clearance zone over the LW1 door (tracks it live, same
// pattern as the deck notch/valance) and over the SW1 window cut-out; SW2 and LW2 run uninterrupted
// (neither has a real cut wall opening).
let EXT_SLAT_W = ftIn(0,1.1);       // ~1.1" board face
let EXT_SLAT_GAP = ftIn(0,3.2);     // ~3.2" open gap — well past typical guard-spacing practice, by design
let EXT_SLAT_THICK = ftIn(0,0.9);   // ~0.9" board thickness
let EXT_SLAT_STANDOFF = ftIn(0,1);  // ~1" air gap off the wall face (rainscreen cavity)
const EXT_SLAT_DOOR_CLEAR = ftIn(0,4);
const extSlatMat = new THREE.MeshStandardMaterial({map: TEX ? deckMap(1,10) : null, roughnessMap: TEX ? deckRoughMap(1,10) : null, color: TEX ? 0xffffff : 0x6b5236, roughness: TEX ? 1.0 : 0.78, envMapIntensity:0.15});
// BUG FIX (2026-07-30, reported: "the outside has wood slats all over"): confirmed via a quick
// material-swap test (temporarily recoloring the boards bright red) that the actual slat geometry
// and spacing were already correct — real ~1.1in boards on real ~3.2in gaps, verified by decoding
// the instance matrices. The complaint is real anyway: with the boards standing only ~1in off a
// backing wall that's ALSO a similar-toned cedar wood, the gap between boards shows you more of
// that same wood color instead of a shadowed reveal, so the whole wall reads as one dense mass of
// wood instead of a legible open-joint batten pattern - exactly "wood slats all over." A real
// rainscreen build behind open-joint siding almost always has a dark weather-resistive
// membrane/furring cavity for this exact reason, so a dark backing panel here is honest
// construction, not a rendering trick - see the backing meshes added in buildExtSlatGroup() below.
const extSlatBackingMat = new THREE.MeshStandardMaterial({color:0x272420, roughness:0.95, metalness:0, envMapIntensity:0.08});
let extSlatGroupRef = null, extSlatEditableEntry = null;
function buildExtSlatGroup(){
  const g = extSlatGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  const pieces = [];
  const pitch = EXT_SLAT_W + EXT_SLAT_GAP;

  // A run of vertical boards along one straight wall face. axis 'x' = boards spaced along world X
  // (LW1/LW2, the long walls), axis 'z' = boards spaced along world Z (SW1/SW2, the short walls).
  // heightFn(coord) returns the board height at that position (flat for LW1/LW2, following the
  // sloped roofline via heightAt() for SW1/SW2). skipLo/skipHi (in the same coord space) punch a
  // clearance gap for a door/window opening when supplied.
  // Built as ONE THREE.InstancedMesh per wall run (a unit-height box, scaled per instance) instead
  // of a separate THREE.Mesh+BoxGeometry per board — this run alone used to be 15-30+ individual
  // draw calls/geometry buffers; now it's 1. Flagged as the likely fix for the build not loading on
  // mobile (a phone's GPU/memory budget for a page this dense in one WebGL context is a lot tighter
  // than a desktop's — this and the matching change in the backrest-rail blocks below cut total
  // mesh count from this pass by roughly 100+ down to a double-digit number).
  function slatRun(axis, coord0, coord1, faceCoord, outwardDir, heightFn, skipLo, skipHi){
    const span = coord1 - coord0;
    const n = Math.max(1, Math.floor(span / pitch));
    const usedSpan = n * pitch - EXT_SLAT_GAP;
    const start = coord0 + (span - usedSpan) / 2 + EXT_SLAT_W/2;
    const outward = faceCoord + outwardDir*(EXT_SLAT_STANDOFF + EXT_SLAT_THICK/2);
    const mats = [];
    for(let i=0;i<n;i++){
      const c = start + i*pitch;
      if(skipLo!=null && c > skipLo - EXT_SLAT_W/2 && c < skipHi + EXT_SLAT_W/2) continue;
      const h = Math.max(0.3, heightFn(c));
      const m = new THREE.Matrix4();
      const pos = axis==='x' ? new THREE.Vector3(c, h/2, outward) : new THREE.Vector3(outward, h/2, c);
      const scale = new THREE.Vector3(axis==='x'?EXT_SLAT_W:EXT_SLAT_THICK, h, axis==='x'?EXT_SLAT_THICK:EXT_SLAT_W);
      m.compose(pos, IDENTITY_QUAT, scale);
      mats.push(m);
    }
    if(!mats.length) return;
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), extSlatMat, mats.length);
    mats.forEach((m,i)=> inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    g.add(inst);
    pieces.push(inst);
  }

  // LW1 (z=0, door wall) is deliberately SKIPPED — this is the same wall backWall.visible=false
  // cuts away for the app's default outside vantage, specifically so you can see straight into
  // the room. A dense run of full-height slats right there defeated that on sight (looked like a
  // fence of bars across the one view that's supposed to stay open) — checked it, didn't like it,
  // pulled it rather than ship it. If you want a slatted screen across the entry on the real
  // build, say so and this comes back (with a lighter/sparser pass, not this density).
  // LW2 (z=DEPTH, opposite wall) — flat height FRONT_H, no openings.
  slatRun('x', 0, WIDTH, DEPTH, 1, ()=>FRONT_H, null, null);
  // SW1 (x=WIDTH, window wall) — sloped roofline via heightAt(z), gap around the window cut-out.
  slatRun('z', 0, DEPTH, WIDTH, 1, (z)=>heightAt(z), WIN_Z - WIN_W/2 - WIN_TRIM, WIN_Z + WIN_W/2 + WIN_TRIM);
  // SW2 (x=0, door-adjacent short wall) — sloped roofline via heightAt(z), no real cut opening.
  slatRun('z', 0, DEPTH, 0, -1, (z)=>heightAt(z), null, null);

  // Dark rainscreen backing panels — sit in the standoff cavity behind the slats (well short of the
  // boards' own outward offset, so nothing clips) on the same 3 walls, same shapes the real solid
  // walls already use (rightWall's shape includes the live window cut-out, so it's never a dark
  // smear behind the glass). See the extSlatBackingMat comment above for why this exists. Rebuilt
  // every time this function runs, so it stays live with the window/door same as the slats do.
  const backingInset = ftIn(0,0.5); // inside the ~1in standoff cavity, well clear of the boards
  const backLW2 = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, FRONT_H), extSlatBackingMat);
  backLW2.rotation.y = Math.PI;
  backLW2.position.set(WIDTH/2, FRONT_H/2, DEPTH + backingInset);
  g.add(backLW2); pieces.push(backLW2);
  const backSW1 = new THREE.Mesh(buildRightWallGeo(), extSlatBackingMat);
  backSW1.rotation.y = -Math.PI/2;
  backSW1.position.set(WIDTH + backingInset, 0, 0);
  g.add(backSW1); pieces.push(backSW1);
  // leftGeo.clone() — NOT the shared leftGeo reference: disposeGroupChildren() above disposes every
  // child's geometry on the next rebuild, and leftGeo is also the REAL leftWall's live geometry, so
  // sharing it here would free leftWall's buffers out from under it the next time this group rebuilds.
  const backSW2 = new THREE.Mesh(leftGeo.clone(), extSlatBackingMat);
  backSW2.position.set(-backingInset, 0, 0);
  g.add(backSW2); pieces.push(backSW2);

  extSlatGroupRef = g;
  if(extSlatEditableEntry){ extSlatEditableEntry.deleted = true; extSlatEditableEntry.objects = []; }
  extSlatEditableEntry = registerEditable(pieces, 'extslats', 'Exterior Wall Slats (LW2, SW1, SW2 — LW1 kept open for the interior view)');
  if(!g.parent) room.add(g);
  return g;
}
buildExtSlatGroup();
window.setExtSlatGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'width') EXT_SLAT_W = Math.min(ftIn(0,4), Math.max(ftIn(0,0.5), v));
  else if(field === 'gap') EXT_SLAT_GAP = Math.min(ftIn(0,8), Math.max(ftIn(0,1), v));
  else if(field === 'standoff') EXT_SLAT_STANDOFF = Math.min(ftIn(0,4), Math.max(0, v));
  buildExtSlatGroup();
};

// ---------- Landing platform — on the floor, centered under the floating door ----------
// The door floats 10" above the sauna floor (DOOR_FLOAT_H) — this platform bridges that gap. Cedar
// 2x4-on-edge frame + 3/4" cedar deck boards, per spec. Shares the bench's own materials
// (closedMat/benchMat) so the "Finish tone" bench control actually retones it too, instead of being
// a decorative non-functional swatch.
// BUG FIX (2026-07-29, direct report: "the return bench... must run the full length of the sw wall"):
// this used to be FIXED at the old LW1/SW2 corner (x:0..LANDING_W) — a leftover from when the door
// itself lived in that corner. Once the door moved to center (the Version 6 change), the platform
// was left stranded under nothing while the actual door had no landing under it at all, AND it kept
// eating into the return leg's footprint on SW2 even though the door — the thing it's actually FOR —
// wasn't there anymore. Fixed at the root: the platform now tracks the door's live X position (see
// buildLandingGroup below and the rebuild hook in window.setDoorPosition), so it's always centered
// under the door bridging the real gap, and the SW2 corner is fully free for the return leg to run
// its own full length (see runB_offset/runB_length and the landing-overlap check further down).
let LANDING_W = ftIn(2,0);    // 24" wide, centered on the door's own X (x-direction) — live-adjustable, see setLandingSize
// Back to its original 4'0" (was temporarily shrunk to 3'0" while the platform still shared the SW2
// corner with the return leg — moot now that the platform tracks the door instead, see above).
let LANDING_D = ftIn(4,0);    // 48" deep from the front wall (z-direction) — live-adjustable
const LANDING_H = ftIn(0,4.25); // 4-1/4" high off the sauna floor — fixed per spec
let landingGroupRef = null;
function buildLandingGroup(){
  const g = landingGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  const cx = doorGroup.position.x; // centered on the door, not a fixed corner — see BUG FIX note above
  const deckThick = LANDING_H*0.4;
  const landingTop = new THREE.Mesh(new THREE.BoxGeometry(LANDING_W, deckThick, LANDING_D), floorPanelMat);
  landingTop.position.set(cx, LANDING_H-deckThick/2, LANDING_D/2);
  landingTop.castShadow = true; landingTop.receiveShadow = true;
  g.add(landingTop);
  const frameH = LANDING_H - deckThick;
  function landingFrameEdge(w,d,x,z){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, frameH, d), closedMat);
    m.position.set(x, frameH/2, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    return m;
  }
  landingFrameEdge(LANDING_W, 0.09, cx, 0.045);
  landingFrameEdge(LANDING_W, 0.09, cx, LANDING_D-0.045);
  landingFrameEdge(0.09, LANDING_D, cx-LANDING_W/2+0.045, LANDING_D/2);
  landingFrameEdge(0.09, LANDING_D, cx+LANDING_W/2-0.045, LANDING_D/2);
  landingGroupRef = g;
  return g;
}
room.add(buildLandingGroup());
// Real size control.
window.setLandingSize = function(field, value){
  const v = parseFloat(value);
  if(field === 'w') LANDING_W = Math.min(ftIn(3,4), Math.max(ftIn(2,0), v));
  else if(field === 'd') LANDING_D = Math.min(ftIn(4,6), Math.max(ftIn(3,0), v));
  buildLandingGroup();
};

// ---------- Existing rear deck: flush against the back wall, top matches the door sill ----------
// This is the raised deck the shed backs onto (per the brief) — modeled so the door reads as a
// real threshold onto a real structure, not floating over open air. Rebuildable (disposeGroupChildren
// + persistent group ref, same pattern as the window/landing/heater-guard fixtures) so the notch/
// stair cut into it always tracks the door's LIVE x position — dragging the door slider (or a
// layout preset that moves the door) now relocates this cutout instead of leaving it stranded at
// the original default.
const deckTex = TEX ? deckMap(6, 20) : plankTexture('#b5875a', '#a97a4d', 20, 41);
if(!TEX) deckTex.repeat.set(1, 4);
const deckRoughTex = TEX ? deckRoughMap(6, 20) : null;
// The real weathered exterior deck-board photo — genuinely different material from the interior
// cedar (this structure sits outside in the weather), so it keeps its own diffuse + roughness map
// instead of the cedar set. roughness stays at 1 so the roughness map alone drives the variation.
const deckMat = new THREE.MeshStandardMaterial({map: deckTex, roughnessMap: deckRoughTex, roughness: TEX ? 1.0 : 0.85});
const fasciaMat = new THREE.MeshStandardMaterial({color:0x4a3018, roughness:0.75});
const postMat2 = new THREE.MeshStandardMaterial({color:0x3a2414, roughness:0.7});
let deckGroupRef = null;
let deckEditableEntry = null;
// 'out' = original straight-out notch (landing, then a real N-step flight continuing away from
// the wall). 'along' = the landing stays flush at the door (code still requires a level landing
// right at the threshold before any turn), then the stair turns 90° and the flight runs SIDEWAYS
// along the wall instead of straight out.
// DEFAULT is 'along', per spec: the descent runs the same direction as the long wall (LW1, the
// 10'4" wall the door sits on), not straight out away from it — dir=+1 (toward SW1/x=WIDTH, the
// "right" side), matching the exact plan-view description: "runs along the LW1 top at the right and
// bottom at the left."
// DOOR_FLOAT_H is the interior floor deck's own 4-1/4" height, not the exterior DECK_H (that was a
// mistaken reading of an earlier note and has been corrected), so there IS a real rise between the
// door's landing and the main deck — the flight actually builds real steps (n = round(rise/riserH),
// 7" default target riser), climbing from the 4-1/4" interior floor deck up to DECK_H at the top,
// with the main deck itself (5' deep) standing in as the landing once you reach it.
let deckStairOrientation = 'along';
// +1 = turns toward SW1 (x=WIDTH, the "right" side in plan view) | -1 = turns toward SW2 (x=0, "left").
// Version 7 default (2026-07-29, direct report: "the orientation of the stairs is wrong flip 180" —
// confirmed via a follow-up question: turn the other way, not a different kind of flip) — back to -1
// (left/SW2), reversing the Version 6 choice. Makes sense given the rest of this round's changes: the
// heater (and the window it now sits next to) moved to the SW1/right side, so having the stairs also
// climb toward the right put the exterior stair run right past where the heater now lives; turning
// them left instead keeps the stairs on the return-bench/SW2 side and the heater/window side clear.
let deckStairDir = -1;
// Real-world adjustable stair geometry — all placeholder numbers per your note ("starting at 2'
// high... will need to be fine-tuned later"), not locked design values yet:
//   stairRiserH    — TARGET riser height per step. The actual number of steps is
//                     ceil(totalRise/stairRiserH), and the ACTUAL riser height used is
//                     totalRise/numSteps (evenly split across the run — standard/code practice,
//                     never an odd leftover step) — so this is "roughly how tall a step should
//                     be", not an exact value that has to divide evenly.
//   stairTreadDepth — depth (front-to-back run) of each step.
//   stairLandingDepth/stairLandingWidth — size of the flush landing right at the door.
//   stairStartOffset — shifts the whole landing+stair assembly sideways off the door's own
//                      centerline, in case the real stair needs to land somewhere other than
//                      dead-center on the doorway.
let stairRiserH = ftIn(0,7);       // 7" per step — common comfortable/code-friendly default
let stairTreadDepth = ftIn(0,11);  // 11" tread depth
let stairLandingDepth = ftIn(2,0); // 24" — code minimum for a landing at a door
let stairLandingWidth = doorW + ftIn(1,0); // 3' — matches the door + margin
let stairStartOffset = 0;
window.setDeckStairOrientation = function(mode){
  deckStairOrientation = (mode === 'along') ? 'along' : 'out';
  buildDeckGroup();
};
window.setDeckStairSide = function(side){
  deckStairDir = (side === 'left') ? -1 : 1;
  if(deckStairOrientation === 'along') buildDeckGroup();
};
window.setStairGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'riserH') stairRiserH = Math.min(ftIn(0,8), Math.max(ftIn(0,4), v));       // 4"-8"
  else if(field === 'treadDepth') stairTreadDepth = Math.min(ftIn(1,6), Math.max(ftIn(0,9), v)); // 9"-18"
  else if(field === 'landingDepth') stairLandingDepth = Math.min(ftIn(4,0), Math.max(ftIn(2,0), v)); // 24"-48", 24" code min
  else if(field === 'landingWidth') stairLandingWidth = Math.min(ftIn(6,0), Math.max(doorW+ftIn(0,6), v));
  else if(field === 'startOffset') stairStartOffset = Math.min(ftIn(3,0), Math.max(ftIn(-3,0), v));
  else if(field === 'deckH') DECK_H = Math.min(ftIn(3,0), Math.max(ftIn(1,0), v));
  buildDeckGroup();
};
// Lays down a real flight of N evenly-risered tread+riser pairs from startY up to endY, either
// running in -z ('z' axis, straight out from the wall) or sideways in x ('x' axis, for the
// 'along' dogleg). Riser count is derived from the actual vertical rise, not hardcoded — this is
// what makes "how many stairs for how much drop" and "height of the step" real, linked numbers
// instead of a fixed 2-piece approximation.
function buildStairFlight(g, mat, fMat, pieces, x0, z0, axis, dirSign, startY, endY, treadDepth, riserH, runWidth){
  const rise = endY - startY;
  if(rise <= 0.001) return {endX:x0, endZ:z0};
  const n = Math.max(1, Math.round(rise/riserH));
  const stepRise = rise/n; // evenly split so the top step always lands exactly flush with endY
  for(let i=0;i<n;i++){
    const topY = startY + stepRise*(i+1);
    const treadCenterOffset = treadDepth*(i+0.5);
    const riserOffset = treadDepth*i;
    let tread, riser;
    if(axis === 'z'){
      tread = new THREE.Mesh(new THREE.BoxGeometry(runWidth, 0.12, treadDepth), mat);
      tread.position.set(x0, topY-0.06, z0+dirSign*treadCenterOffset);
      riser = new THREE.Mesh(new THREE.BoxGeometry(runWidth, stepRise, 0.06), fMat);
      riser.position.set(x0, topY-stepRise/2, z0+dirSign*riserOffset);
    } else {
      tread = new THREE.Mesh(new THREE.BoxGeometry(treadDepth, 0.12, runWidth), mat);
      tread.position.set(x0+dirSign*treadCenterOffset, topY-0.06, z0);
      riser = new THREE.Mesh(new THREE.BoxGeometry(0.06, stepRise, runWidth), fMat);
      riser.position.set(x0+dirSign*riserOffset, topY-stepRise/2, z0);
    }
    g.add(tread); pieces.push(tread);
    g.add(riser); pieces.push(riser);
  }
  const totalRun = treadDepth*n;
  return { endX: (axis==='x') ? x0+dirSign*totalRun : x0, endZ: (axis==='z') ? z0+dirSign*totalRun : z0, totalRun };
}
function buildDeckGroup(){
  const g = deckGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  if(deckEditableEntry){ deckEditableEntry.deleted = true; deckEditableEntry.objects = []; }

  const deckDepth = 5.0;                 // how far the deck runs out from the house
  // The default 'along' stair flight now runs toward SW1/x=WIDTH (dir=+1, the "right" side), well
  // within deckX1 = WIDTH+4's own clearance, so this side no longer needs the extra -4 widening a
  // dir=-1 default used to require — back to its original, more proportional -1.5.
  const deckX0 = -1.5, deckX1 = WIDTH + 4; // spans past both corners — an existing full-width deck
  const deckW = deckX1 - deckX0;
  const deckTop = DECK_H;                // flush with the door sill, no gap

  // ---- Step-down notch: the door now floats at DOOR_FLOAT_H (10"), well under the deck's height —
  // cut a notch out of the deck surface right in front of the door (LIVE position, not the
  // original default). Code requires a level landing right at the door (not an immediate step
  // down), so this is a flush landing at the door's own height first, THEN either continues
  // straight out ('out') or turns and runs sideways along the wall ('along').
  const doorCenterX = doorGroup.position.x + stairStartOffset;
  const STEP_W = stairLandingWidth;
  const LANDING_DEPTH = stairLandingDepth;

  const stairPieces = [];

  if(deckStairOrientation === 'out'){
    const STEP_X0 = doorCenterX - STEP_W/2;
    const STEP_X1 = doorCenterX + STEP_W/2;

    // Landing (flush with DOOR_FLOAT_H) — level with the door sill, right outside the threshold,
    // so stepping out of the door lands on a flat surface, not a step edge.
    const landing = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, 0.12, LANDING_DEPTH), deckMat);
    landing.position.set(doorCenterX, DOOR_FLOAT_H-0.06, -LANDING_DEPTH/2);
    g.add(landing); stairPieces.push(landing);

    // Real flight, straight out, from the landing's outer edge up to the main deck.
    const flight = buildStairFlight(g, deckMat, fasciaMat, stairPieces, doorCenterX, -LANDING_DEPTH, 'z', -1, DOOR_FLOAT_H, deckTop, stairTreadDepth, stairRiserH, STEP_W);

    // Deck surface split into two flanking pieces (skipping the notch) + a filler for the notch's
    // outer portion (past where the flight actually ends), still at full deck height.
    const deckSurfaceL = new THREE.Mesh(new THREE.BoxGeometry(STEP_X0-deckX0, 0.12, deckDepth), deckMat);
    deckSurfaceL.position.set(deckX0+(STEP_X0-deckX0)/2, deckTop-0.06, -deckDepth/2);
    g.add(deckSurfaceL); stairPieces.push(deckSurfaceL);
    const deckSurfaceR = new THREE.Mesh(new THREE.BoxGeometry(deckX1-STEP_X1, 0.12, deckDepth), deckMat);
    deckSurfaceR.position.set(STEP_X1+(deckX1-STEP_X1)/2, deckTop-0.06, -deckDepth/2);
    g.add(deckSurfaceR); stairPieces.push(deckSurfaceR);
    const notchFillerDepth = Math.max(0.05, deckDepth + flight.endZ);
    const deckSurfaceNotch = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, 0.12, notchFillerDepth), deckMat);
    deckSurfaceNotch.position.set(doorCenterX, deckTop-0.06, -deckDepth+notchFillerDepth/2);
    g.add(deckSurfaceNotch); stairPieces.push(deckSurfaceNotch);
  } else {
    // 'along' — landing stays flush at the door, then the stair DOGLEGS: turns deckStairDir and
    // the flight runs sideways, staying within the same LANDING_DEPTH band off the wall the whole
    // time (never reaching further out than the landing already does), instead of continuing
    // straight out. The notch cut into the existing deck is sized to this whole L-shaped footprint.
    const dir = deckStairDir;

    // Landing (unchanged shape/position — always flush right at the door first).
    const landing = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, 0.12, LANDING_DEPTH), deckMat);
    landing.position.set(doorCenterX, DOOR_FLOAT_H-0.06, -LANDING_DEPTH/2);
    g.add(landing); stairPieces.push(landing);

    // Real flight, turned sideways, starting at the landing's outer x-edge, staying within the
    // landing's own depth band off the wall (runWidth = LANDING_DEPTH here, not STEP_W).
    const flightX0 = doorCenterX + dir*STEP_W/2;
    const flight = buildStairFlight(g, deckMat, fasciaMat, stairPieces, flightX0, -LANDING_DEPTH/2, 'x', dir, DOOR_FLOAT_H, deckTop, stairTreadDepth, stairRiserH, LANDING_DEPTH);

    const landingX0 = doorCenterX - STEP_W/2, landingX1 = doorCenterX + STEP_W/2;
    // Clamped well inside the existing deck's own footprint (deckX0..deckX1) so an extreme door
    // position combined with the sideways turn can never push the notch past the deck's real edge.
    const notchX0 = Math.max(deckX0+0.3, Math.min(landingX0, flightX0, flight.endX));
    const notchX1 = Math.min(deckX1-0.3, Math.max(landingX1, flightX0, flight.endX));

    const deckSurfaceL = new THREE.Mesh(new THREE.BoxGeometry(notchX0-deckX0, 0.12, deckDepth), deckMat);
    deckSurfaceL.position.set(deckX0+(notchX0-deckX0)/2, deckTop-0.06, -deckDepth/2);
    g.add(deckSurfaceL); stairPieces.push(deckSurfaceL);
    const deckSurfaceR = new THREE.Mesh(new THREE.BoxGeometry(deckX1-notchX1, 0.12, deckDepth), deckMat);
    deckSurfaceR.position.set(notchX1+(deckX1-notchX1)/2, deckTop-0.06, -deckDepth/2);
    g.add(deckSurfaceR); stairPieces.push(deckSurfaceR);
    // Fills the rest of the notch column (below LANDING_DEPTH, out to the deck's far edge) at full height.
    const farDepth = deckDepth - LANDING_DEPTH;
    const deckSurfaceNotch = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.05,notchX1-notchX0), 0.12, farDepth), deckMat);
    deckSurfaceNotch.position.set((notchX0+notchX1)/2, deckTop-0.06, -deckDepth+farDepth/2);
    g.add(deckSurfaceNotch); stairPieces.push(deckSurfaceNotch);
  }

  deckEditableEntry = registerEditable(stairPieces, 'bench', 'Exterior Steps & Landing (LW1)');

  const fasciaFront = new THREE.Mesh(new THREE.BoxGeometry(deckW, deckTop-0.02, 0.08), fasciaMat);
  fasciaFront.position.set(deckX0+deckW/2, (deckTop-0.02)/2, -deckDepth-0.02);
  g.add(fasciaFront);
  const fasciaLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, deckTop-0.02, deckDepth), fasciaMat);
  fasciaLeft.position.set(deckX0-0.02, (deckTop-0.02)/2, -deckDepth/2);
  g.add(fasciaLeft);
  const fasciaRight = fasciaLeft.clone();
  fasciaRight.position.set(deckX1+0.02, (deckTop-0.02)/2, -deckDepth/2);
  g.add(fasciaRight);

  function deckPost(x,z){
    const postH = deckTop - 0.13; // stop just under the decking so it doesn't poke through the top
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, postH, 0.16), postMat2);
    p.position.set(x, postH/2, z);
    g.add(p);
  }
  deckPost(deckX0+0.3, -deckDepth+0.3);
  deckPost(deckX1-0.3, -deckDepth+0.3);
  deckPost(deckX0+0.3, -0.3);
  deckPost(deckX1-0.3, -0.3);
  deckPost(WIDTH/2, -deckDepth+0.3);

  g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  deckGroupRef = g;
  scene.add(g);
}
buildDeckGroup();

// ================= YamaZina Mark 2: rear+right "foot bench"/"top bench" L, left entrance bench =================
// Door sill sits at deck height (2' above the sauna floor, matching the raised deck outside).
// Terminology per the design rules: "foot bench" = lower tier on the rear+right walls, "top
// bench" = upper tier on the rear+right walls (rule set: rear wall & right wall). The left-wall
// entrance bench is a separate, single-tier run at ITS OWN height — deliberately not flush with
// the foot bench where the two meet (a stepped joint: footprints align in plan, heights step —
// your explicit call, not a defect).
const HIGH_DEPTH = ftIn(2,0);        // 24" — top bench depth from the wall, fixed (rule 6)
const FOOT_TUCK = ftIn(0,6);         // 6" — how far the foot bench reaches back under the top bench (rule 8)
// Foot bench width is SELECTABLE at 18/20/22/24" (rule 7) — this build uses 20". Per the new
// versioning rule ("iteration that requires code... will get a new version"), picking a different
// width is a real design decision, not a live slider: ask for 18/22/24" and it ships as a new
// version, the same way bench tone is live-editable but bench footprint is not.
const FOOT_BENCH_WIDTH = ftIn(1,8);  // 20" — one of 18/20/22/24" (rule 7)
const LOW_DEPTH = HIGH_DEPTH + FOOT_BENCH_WIDTH; // 44" — foot bench's total reach from the wall
const FOOT_Z0 = HIGH_DEPTH - FOOT_TUCK;          // 18" — foot bench's box starts here, not at the wall
// Both bench boxes must be at least 10" thick (rule 9) — built at exactly that minimum so the
// riser gap between the foot bench's seat and the top bench's underside is as open as the spec
// allows (this is the same "don't recreate the bunk-bed defect" reasoning as before, just re-run
// against the new 18"-apart seat heights).
const TOP_BOX_THICK = ftIn(0,10);    // 10"
const gapY = SEAT_HIGH - TOP_BOX_THICK; // 40" — underside of the top bench box

const legLen2 = DEPTH; // right wall bench — full depth

// Phase 3 floor-plan reversal: the left-wall entrance bench is deleted entirely, and the L-shaped
// foot/top bench now runs the FULL length of the front wall (10'4") and right wall (6'4") instead
// of the back wall + right wall. Neither run needs a door-clearance cutout anymore, since the
// door moved to the back wall along with the heater — see the leg1/leg2 declarations below.

// ---------- Heater — YamaZina Mark 2 spec: HUUM Hive Mini 9kW / Hive 11kW ----------
// Per the real HUUM Hive manual (Table 3): ~18-1/8" (460mm) diameter, ~29-17/32" (750mm) tall —
// and per the product photo, that ENTIRE height is a wire-cage basket packed edge-to-edge with
// stones. Rebuilt per direct feedback on the first pass ("too pointy... weird ball of fluff on
// top... needs to be all grey real rock with a stainless steel frame"): a near-barrel silhouette
// (slight taper, NOT an egg/cone) with a much flatter, gently rounded top instead of a peak, wrapped
// in a dense real stainless-steel-toned wire cage, no loose floating "fluff" rocks — the flatter
// lathe top itself, textured with the real (now neutral-gray) rock photo, reads as the flat mounded
// stone bed on its own. Both real models (Mini 9kW / 11kW) share this envelope, so this build only
// ever models that one real, purchasable shape.
const heaterGroup = new THREE.Group();
const heaterSize = ftIn(1,6.1);       // 18.1" diameter — HUUM Hive Mini/Hive footprint
const heaterH = ftIn(2,3);            // 27" — reference shoulder height
const HEATER_ROCK_TOP = ftIn(2,6);    // 30" — mandated top-of-rock reference height (design rule 1)
const heaterRadius = heaterSize/2;
const HEATER_LEG_H = ftIn(0,2);       // 2" — small adjustable legs, per the HUUM install manual

const rockMatBase = new THREE.MeshStandardMaterial({map:rockTex, roughness:0.97, metalness:0.02});
// The barrel body — wrapped in the real HUUM product photo (textures/rock_diff.jpg, a genuine
// rock+wire-cage crop from the reference image, pre-processed into a seamlessly-wrapping tile AND
// desaturated to true neutral grey — the raw crop reads warm/tan under this room's cedar-reflected
// lighting, which isn't what real river stone looks like) in place of the old procedural gray-noise
// canvas. Repeat counts are sized off the real barrel's own geometry (~57" circumference, ~28" rock
// height) against the ~13"x13" physical patch the photo crop represents, so individual stones come
// out roughly true-to-scale when the texture wraps around. Falls back to the old procedural rockTex
// when no photo has been supplied (TEX null).
// Emissive stays, but neutral grey now (was a warm brown 0x2c1608 that tinted the whole barrel
// orange/brown regardless of the diffuse map — the actual root cause of the first pass reading
// brown instead of grey) — still needed since the barrel reads near-black under this room's
// deliberately low base ambient without some emissive floor.
// "Scale up the rocks so they look real — right now they look like a grey leather, not
// individual rocks." Two real changes, not just a bigger repeat number: (1) the source photo got
// a contrast/sharpen pass to bring back the crisp boundary between one stone and the next that the
// original seamless-tile edge-feathering had smoothed away, and (2) a real bumpMap now rides
// alongside the diffuse map, so the scene's actual lighting carves out facets/shadow between
// stones instead of the diffuse texture alone trying to fake depth on a flat surface — this is
// usually the bigger lever for "reads as individual rocks" vs. "reads as a printed pattern".
const heaterBarrelMat = new THREE.MeshStandardMaterial({
  map: TEX ? rockMap(4.4, 2.1) : rockTex,
  bumpMap: TEX ? rockBumpMap(4.4, 2.1) : null,
  bumpScale: 0.045,
  roughness: 0.94, metalness: 0.02,
  color: TEX ? 0xd8d8d8 : 0x9c9c9c, // neutral grey tint either way — no warm cast
  emissive: 0x1a1a1a, emissiveIntensity: 0.45,
});
// Barrel silhouette: near-cylindrical sides (a touch of inward taper at the very base only, like
// the real unit resting on its narrower foot ring) running almost the full height at full radius,
// then a SHORT rounded-over shoulder into a comparatively wide, flat-ish top cap — not a long
// gradual taper to a point like the first pass. capR stays a large fraction of the body radius
// (0.72) and the whole shoulder-to-top transition happens in the last ~14% of the height, so the
// silhouette reads as "slightly oval with a flatter top", per spec, instead of an egg/cone.
function barrelProfile(baseY, topY, footR, bodyR, capR, nFoot, nShoulder, nCap){
  const totalH = topY - baseY;
  const shoulderY = baseY + totalH*0.82; // straight body run lasts up to 82% of the height
  const capY = baseY + totalH*0.96;      // shoulder finishes into the flat-ish cap by 96%
  const pts = [new THREE.Vector2(footR, baseY)];
  for(let i=1;i<=nFoot;i++){
    const t = i/nFoot;
    pts.push(new THREE.Vector2(footR + (bodyR-footR)*Math.sin(t*Math.PI/2), baseY + (shoulderY-baseY)*0.12*t));
  }
  pts.push(new THREE.Vector2(bodyR, shoulderY));
  for(let i=1;i<=nShoulder;i++){
    const t = i/nShoulder;
    pts.push(new THREE.Vector2(bodyR + (capR-bodyR)*(1-Math.cos(t*Math.PI/2)), shoulderY + (capY-shoulderY)*t));
  }
  for(let i=1;i<=nCap;i++){
    const t = i/nCap;
    // Eases from capR down to 0 across the last sliver of height — a small rounded closure, not a
    // long taper, so the cap reads as flat with just a soft edge instead of a peak.
    pts.push(new THREE.Vector2(Math.max(0, capR*Math.cos(t*Math.PI/2*0.98)), capY + (topY-capY)*t));
  }
  return pts;
}
function profileRadiusAt(profile, y){
  for(let i=1;i<profile.length;i++){
    const a=profile[i-1], b=profile[i];
    if(y>=a.y && y<=b.y){ const t=(y-a.y)/Math.max(1e-6,(b.y-a.y)); return a.x+(b.x-a.x)*t; }
  }
  return profile[profile.length-1].x;
}
const heaterProfile = barrelProfile(HEATER_LEG_H, HEATER_ROCK_TOP, heaterRadius*0.88, heaterRadius, heaterRadius*0.72, 4, 7, 4);
const heaterBase = new THREE.Mesh(new THREE.LatheGeometry(heaterProfile, 32), heaterBarrelMat);
heaterBase.castShadow = true; heaterBase.receiveShadow = true;
heaterGroup.add(heaterBase);

// Small legs (adjustable legs x4 per the manual) — barely visible, just enough to read as
// standing slightly proud of the floor rather than melted into it.
for(let i=0;i<4;i++){
  const ang = (i/4)*Math.PI*2 + Math.PI/4;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,HEATER_LEG_H,8), metalMat);
  leg.position.set(Math.cos(ang)*heaterRadius*0.55, HEATER_LEG_H/2, Math.sin(ang)*heaterRadius*0.55);
  heaterGroup.add(leg);
}

// Dense stainless-steel wire cage — per spec ("stainless steel frame around it"), a real basket of
// closely-spaced horizontal bands (12, roughly every ~2"), not the sparse 5-hoop stand-in from the
// first pass, plus a single vertical riser bar (matching the real photo's badge-carrying strip) so
// it reads as an actual welded cage rather than a few disconnected rings. Bright, low-roughness
// metal so it visibly reads as polished stainless against the matte stone.
const wireMat = new THREE.MeshStandardMaterial({color:0xe4e7ea, roughness:0.22, metalness:0.95});
const HOOP_COUNT = 12;
const hoopHeights = Array.from({length:HOOP_COUNT}, (_,i) => HEATER_LEG_H + (HEATER_ROCK_TOP-HEATER_LEG_H)*((i+0.5)/HOOP_COUNT));
hoopHeights.forEach(hy=>{
  // Interpolated radius matching the barrel profile at that height, so every hoop hugs the stone
  // surface instead of floating away from it.
  const hr = Math.max(0.03, profileRadiusAt(heaterProfile, hy) * 1.012);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(hr, 0.009, 8, 32), wireMat);
  hoop.rotation.x = Math.PI/2;
  hoop.position.y = hy;
  heaterGroup.add(hoop);
});
// Vertical riser bar — one straight rod up the front face, hugging the profile radius at its own
// height band-by-band (a real welded basket has several of these; one is enough to read correctly
// and carry the badge without cluttering the silhouette).
{
  const riserSegs = 24;
  for(let i=0;i<riserSegs;i++){
    const y0 = HEATER_LEG_H + (HEATER_ROCK_TOP-HEATER_LEG_H)*(i/riserSegs);
    const y1 = HEATER_LEG_H + (HEATER_ROCK_TOP-HEATER_LEG_H)*((i+1)/riserSegs);
    const rMid = profileRadiusAt(heaterProfile, (y0+y1)/2) * 1.015;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,y1-y0+0.01,6), wireMat);
    seg.position.set(0, (y0+y1)/2, rMid);
    heaterGroup.add(seg);
  }
}
// Small branded cap plaque partway up the riser bar (stands in for the "HU/UM" badge in the real photo).
const heaterBadge = new THREE.Mesh(new THREE.BoxGeometry(0.09,0.14,0.014), new THREE.MeshStandardMaterial({color:0x181818, roughness:0.5, metalness:0.3}));
heaterBadge.position.set(0, HEATER_LEG_H + (HEATER_ROCK_TOP-HEATER_LEG_H)*0.62, profileRadiusAt(heaterProfile, HEATER_LEG_H + (HEATER_ROCK_TOP-HEATER_LEG_H)*0.62) * 1.02);
heaterGroup.add(heaterBadge);
// No separate loose-rock crown on top — per direct feedback it read as "a weird ball of fluff".
// The barrel's own flatter top cap, textured with the real rock photo, stands in as the flat
// mounded stone bed instead.
heaterRockGroup = new THREE.Group();
heaterGroup.add(heaterRockGroup);

// wood safety guard — slatted low fence on the 3 open sides (the 4th, facing the wall, needs no
// fence). Phase 3 rework: "the surround around the heater made tighter to the heater & higher
// with the vent slats horizontal not vertical" — tighter radius, taller (still under the 24"
// rule-3 max), and rebuilt with stacked HORIZONTAL boards instead of vertical pickets. Height,
// slat thickness, gap, and slat count are all live-adjustable (see setHeaterGuardGeometry) —
// height acts as the hard ceiling (posts are always exactly this tall); the requested slat count
// is capped to however many actually fit within that height at the chosen thickness/gap, so
// combinations can't silently poke slats up past the guard's own posts.
let GUARD_H = ftIn(1,11);           // 23" — raised per request, still under the 24" rule-3 ceiling
const GUARD_H_MAX = ftIn(1,11.5);   // stay just under the 24" rule-3 max
const GUARD_R = heaterRadius + ftIn(0,2); // 2" clearance — tight to the barrel, fixed (not a slider)
let GUARD_SLAT_H = 0.045, GUARD_GAP = 0.05;
let GUARD_COUNT = Math.floor(GUARD_H/(GUARD_SLAT_H+GUARD_GAP)); // default: fill the height, same as before
const guardMat = benchEdge.clone();
heaterGuardMatRef = guardMat;
let heaterGuardGroupRef = null;
// Adds one side's slats+posts directly into the (flat) guard group at world-ish offset
// (ox,oz) — flat rather than nested sub-groups so disposeGroupChildren's single-level sweep
// actually reclaims every slat/post mesh on rebuild instead of leaking them.
function railSide(g, len, axis, ox, oz){
  const n = Math.max(1, Math.min(GUARD_COUNT, Math.floor(GUARD_H/(GUARD_SLAT_H+GUARD_GAP))));
  for(let i=0;i<n;i++){
    const slat = new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?len:0.05, GUARD_SLAT_H, axis==='x'?0.05:len), guardMat);
    const y = i*(GUARD_SLAT_H+GUARD_GAP) + GUARD_SLAT_H/2; // stays at/under GUARD_H by construction
    slat.position.set(ox,y,oz);
    slat.castShadow = true;
    g.add(slat);
  }
  // corner posts holding the horizontal boards, capped flush at GUARD_H
  const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, GUARD_H, 0.06), guardMat);
  post1.position.set(ox+(axis==='x'?-len/2+0.03:0), GUARD_H/2, oz+(axis==='x'?0:-len/2+0.03));
  g.add(post1);
  const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, GUARD_H, 0.06), guardMat);
  post2.position.set(ox+(axis==='x'?len/2-0.03:0), GUARD_H/2, oz+(axis==='x'?0:len/2-0.03));
  g.add(post2);
}
function buildHeaterGuard(){
  const g = heaterGuardGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  // Open side faces the WALL (Phase 3: heater moved from the front wall to the back wall, so the
  // near-wall side flips from +z to -z) — "front" (room-facing) fence panel moves accordingly.
  railSide(g, GUARD_R*2, 'x', 0, GUARD_R);
  railSide(g, GUARD_R*2, 'z', -GUARD_R, 0);
  railSide(g, GUARD_R*2, 'z', GUARD_R, 0);
  heaterGuardGroupRef = g;
  return g;
}
heaterGroup.add(buildHeaterGuard());
window.setHeaterGuardGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'h') GUARD_H = Math.min(GUARD_H_MAX, Math.max(ftIn(1,0), v));
  else if(field === 'thick') GUARD_SLAT_H = Math.min(0.09, Math.max(0.02, v));
  else if(field === 'gap') GUARD_GAP = Math.min(0.12, Math.max(0.015, v));
  else if(field === 'count') GUARD_COUNT = Math.round(Math.min(24, Math.max(2, v)));
  buildHeaterGuard();
};

// ---------- Heater default position ----------
// Clear zone on the back wall runs between the SW2 corner, the door (centered — the landing platform
// now tracks it, see LANDING_W above), and whichever wall currently carries the return-leg bench's
// LOW_DEPTH footprint.
// heaterClearX0()/heaterClearX1(), defined further down once the bench-run state exists, are the LIVE
// versions setHeaterPosition and the bench wall-reassignment logic actually use — every one of these
// terms is computed fresh from LANDING_W/runB_wall/doorGroup.position.x each time, not baked into a
// stale constant, so reassigning the return leg's wall or moving the door keeps the heater out of
// whatever's actually occupied automatically.
// Real 1" air gap kept between the guard's outer face and the door edge, whichever side the heater
// ends up living on.
const HEATER_DOOR_GAP = ftIn(0,1);
// doorGroup already has its position set (see doorGroup.position.set(...) above, earlier in file
// load order) by the time either of these is ever called, including at the HEATER_X_DEFAULT line
// just below. doorHeaterClearX1 = latest safe X if the heater sits LEFT of the door; doorHeaterClearX0
// = earliest safe X if the heater sits RIGHT of the door (the door's right edge, plus guard radius,
// plus the gap).
function doorHeaterClearX1(){ return doorGroup.position.x - doorW/2 - GUARD_R - HEATER_DOOR_GAP; }
function doorHeaterClearX0(){ return doorGroup.position.x + doorW/2 + GUARD_R + HEATER_DOOR_GAP; }
// BUG FIX (2026-07-29, found while moving the default toward the SW1/window wall): the flat "4 inches
// off the wall" margin used below for the corner/wall limits was measuring from the heater's CENTER,
// not the guard's outer face — harmless on the old SW2/landing side, where LANDING_W's own 2ft
// minimum happened to leave far more room than that, but on the SW1 side (once freed of the old
// SW1-return-bench reservation) it let the default push the guard's outer face ~1" THROUGH the real
// exterior wall. Guard against that directly: the guard's outer face needs the same kind of real
// standoff off any wall it's near as the heater already gets off the back wall in Z (see
// HEATER_STANDOFF_DEFAULT — a 6"-12" mandated band); apply the low end of that same band here, in X.
const HEATER_WALL_STANDOFF = ftIn(0,6);
// Version 7 default (2026-07-29, direct report: "the heater need to move adjacent to the window" —
// the real window is on SW1/x=WIDTH, see WIN_Z/WIN_W above): was pushed to the SW2/left end of its
// clear zone, by the landing; now pushed to the SW1/right end instead, by the (guard-safe) wall
// margin, since the return leg's move to SW2 (see runB_wall above) freed up the whole SW1 side and
// the window itself sits close to the LW1/SW1 corner (WIN_Z=2.5, near the z=0 wall the heater already
// hugs). Upper-bounded by the real, guard-aware wall margin, lower-bounded by doorHeaterClearX0() —
// the door's own right edge, not its left, since the heater now lives on the opposite side of the
// door from before.
const HEATER_WALL_LIMIT_DEFAULT = WIDTH - GUARD_R - HEATER_WALL_STANDOFF;
const HEATER_X_DEFAULT = Math.min(HEATER_WALL_LIMIT_DEFAULT, Math.max(HEATER_WALL_LIMIT_DEFAULT - ftIn(0,6), doorHeaterClearX0()));
const HEATER_STANDOFF_DEFAULT = ftIn(0,9); // 9" — centered inside the 6-12" mandated standoff band, off the back wall now
heaterGroup.position.set(HEATER_X_DEFAULT, 0, HEATER_STANDOFF_DEFAULT);
room.add(heaterGroup);
heaterGlow.position.set(HEATER_X_DEFAULT, heaterH+0.3, HEATER_STANDOFF_DEFAULT);
// Live clear-zone functions — bodies only evaluated once actually called (after the whole script,
// including the bench-run section's `runB_wall`, has finished loading), same lazy pattern already
// used elsewhere in this file (see setDoorPosition).
// BUG FIX (2026-07-29, found while moving the return leg's default to SW2): whichever wall the
// return leg is on used to block the heater's ENTIRE X-corridor on that side unconditionally — a
// worst-case assumption that made sense back when the return leg always ran the full DEPTH from the
// z=0 wall, but no longer holds now that a return leg on SW2 gets pushed away from that wall by the
// landing-clearance clamp (see setBenchRun's SW2 branch above — runB_offset starts past LANDING_D,
// not at 0). A heater sitting near the wall on the OTHER axis (its own Z standoff) can no longer
// physically reach a return leg that's been shoved deep into the room, so blocking it anyway was
// pure over-restriction. Fixed by checking real Z-overlap (heater guard footprint vs the return leg's
// actual z:[offset,offset+length] span) before applying the X-corridor restriction, so it only kicks
// in when the two runs could actually collide, on either wall, at whatever offset the return leg
// currently has.
function heaterZOverlapsReturnRun(){
  if(typeof runB_wall === 'undefined') return false;
  const heaterZ0 = heaterGroup.position.z - GUARD_R, heaterZ1 = heaterGroup.position.z + GUARD_R;
  const benchZ0 = runB_offset, benchZ1 = runB_offset + runB_length;
  return heaterZ0 < benchZ1 && heaterZ1 > benchZ0;
}
// Door-awareness (2026-07-29, moved to the SW1/window side): the heater now lives to the RIGHT of
// the door, so it's heaterClearX0 — the LEFT-hand boundary — that has to stay past the door's own
// right edge, permanently, so a live drag can't pull the heater (or its guard) back through the
// door. heaterClearX1 doesn't need its own door term any more: since reclampHeaterX always clamps
// heaterX to be >= heaterClearX0(), and X0 already sits past the door's right edge, X1 can never be
// dragged back through the door either — one boundary now fully owns the door-safety invariant.
function heaterClearX0(){
  const swReach = (runB_wall === 'SW2' && heaterZOverlapsReturnRun()) ? LOW_DEPTH : 0;
  const cornerLimit = Math.max(LANDING_W, swReach) + ftIn(0,4);
  // Guard-safe floor against the real x=0 (SW2) wall — see HEATER_WALL_STANDOFF above. Normally
  // slack (LANDING_W's own minimum already clears it) but keeps the guard off the actual wall even
  // if LANDING_W is ever trimmed down further live.
  const wallSafeLimit = GUARD_R + HEATER_WALL_STANDOFF;
  return Math.max(cornerLimit, wallSafeLimit, doorHeaterClearX0());
}
function heaterClearX1(){
  const swReach = ((typeof runB_wall === 'undefined' || runB_wall === 'SW1') && heaterZOverlapsReturnRun()) ? LOW_DEPTH : 0;
  const wallLimit = (WIDTH - swReach) - ftIn(0,4);
  // Guard-safe ceiling against the real x=WIDTH (SW1) wall — this is the one that actually bites
  // with the heater's new default near the window (see the BUG FIX note above HEATER_WALL_STANDOFF).
  const wallSafeLimit = WIDTH - GUARD_R - HEATER_WALL_STANDOFF;
  // Never let the cap fall below heaterClearX0() itself — that would invert the range and jam the
  // slider (this is what keeps the door-crossing-from-the-left term above harmless in the common case).
  return Math.max(heaterClearX0(), Math.min(wallLimit, wallSafeLimit));
}
function reclampHeaterX(){
  heaterGroup.position.x = Math.min(heaterClearX1(), Math.max(heaterClearX0(), heaterGroup.position.x));
  heaterGlow.position.x = heaterGroup.position.x;
  syncFloorHoleToHeater();
}
// BUG FIX (reported, with screenshot: heater moved but the floor cutout and the bottom of the guard
// were left behind, showing a gap): HOLE_X used to be computed ONCE at load time from the heater's
// ORIGINAL default position and never touched again — every layout preset or manual heater move
// left the floor's precut opening sitting wherever the heater USED to be. The whole point of that
// opening is to stay under the heater (real reason: a heater needs bare concrete underneath, not
// combustible decking), so it has to track the heater's live X position, not a one-time snapshot.
// `buildFloorDeck`/`buildFloorHoleTrim` are declared later in this file but function declarations
// hoist, and this only ever runs from a live user/preset interaction (after full script load), so
// calling them here is safe.
function syncFloorHoleToHeater(){
  if(typeof heaterGroup === 'undefined' || typeof HOLE_W === 'undefined') return; // not built yet (initial load ordering)
  HOLE_X = Math.max(0, Math.min(WIDTH - HOLE_W, heaterGroup.position.x - HOLE_W/2));
  if(typeof buildFloorDeck === 'function') buildFloorDeck();
  if(typeof buildFloorHoleTrim === 'function') buildFloorHoleTrim();
}

// ---------- Heater options: real purchasable model + guard tone ----------
// There is no "style" choice anymore — this is a fixed real heater, not a placeholder — so
// setHeaterStyle is kept ONLY as a harmless no-op for any older saved version that still calls it.
window.setHeaterStyle = function(){};
let heaterModelRef = 'mini9';
// Both real models (HUUM Hive Mini 9kW / HUUM Hive 11kW) share the identical physical envelope
// modeled above, so picking one doesn't resize anything here — it locks in the exact product spec
// that later feeds the still-render JSON/prompt generator and the Overview/Elements labels.
window.setHeaterModel = function(model){
  heaterModelRef = (model === 'hive11') ? 'hive11' : 'mini9';
};
window.getHeaterModel = function(){ return heaterModelRef; };
window.setHeaterGuardTone = function(hex){
  if(heaterGuardMatRef) heaterGuardMatRef.color.set(hex);
};

// ---------- Heater position ----------
// x is now an ABSOLUTE room coordinate (was: an offset from a fixed HEATER_X_DEFAULT) — switched
// because the legal clear zone itself moves when the return-leg bench is reassigned to the other
// wall, so "offset from a fixed center" stopped being a stable reference point. Clamped live via
// heaterClearX0()/X1() (defined above), which read the bench run's current wall. z is unchanged —
// the standoff distance off the back wall, hard-clamped to the mandated 6"-12" band (design rule 2).
window.setHeaterPosition = function(field, value){
  const v = parseFloat(value);
  if(field === 'x'){
    heaterGroup.position.x = Math.min(heaterClearX1(), Math.max(heaterClearX0(), v));
    syncFloorHoleToHeater(); // keep the floor's precut opening under the heater — see reclampHeaterX
  } else if(field === 'z'){
    heaterGroup.position.z = Math.min(ftIn(1,0), Math.max(ftIn(0,6), -v));
  }
  heaterGlow.position.x = heaterGroup.position.x;
  heaterGlow.position.z = heaterGroup.position.z;
};
// Legacy no-op — a real, fixed-size heater can't be arbitrarily resized away from its actual
// purchasable dimensions; kept only so an older saved version calling this doesn't error.
window.setHeaterScale = function(){};

// ================= L-shaped double-tier bench =================
function slatBench(length, depth, thickness, nSlats, axis, mat){
  const g = new THREE.Group();
  for(let i=0;i<nSlats;i++){
    const geo = new THREE.BoxGeometry(axis==='x'?length:(depth/nSlats-0.03), thickness, axis==='x'?(depth/nSlats-0.03):length);
    const slat = new THREE.Mesh(geo, mat);
    const offset = (i - (nSlats-1)/2) * (depth/nSlats);
    if(axis==='x') slat.position.set(0,0,offset);
    else slat.position.set(offset,0,0);
    slat.castShadow = true; slat.receiveShadow = true;
    g.add(slat);
  }
  return g;
}
function slatFront(length, height, thickness, nSlats, axis, mat){
  // vertical cladding boards for a closed-box bench front face — proud of the box face
  // by `thickness`, so the grooves between boards read as real shadow lines.
  const g = new THREE.Group();
  const gap = 0.015;
  const w = length/nSlats - gap;
  for(let i=0;i<nSlats;i++){
    const geo = new THREE.BoxGeometry(axis==='x'?w:thickness, height, axis==='x'?thickness:w);
    const slat = new THREE.Mesh(geo, mat);
    const offset = (i - (nSlats-1)/2) * (length/nSlats);
    if(axis==='x') slat.position.set(offset,0,0);
    else slat.position.set(0,0,offset);
    slat.castShadow = true; slat.receiveShadow = true;
    g.add(slat);
  }
  return g;
}
// Horizontal-course cladding boards for a closed-box bench front face — boards run the full panel
// length and stack in rows up the height, with a gap between each course, instead of narrow
// vertical strips. Same "proud of the box face by `thickness`" shadow-line approach as slatFront.
function slatFrontHorizontal(length, height, thickness, nBoards, axis, mat){
  const g = new THREE.Group();
  const gap = 0.015;
  const bh = height/nBoards - gap;
  for(let i=0;i<nBoards;i++){
    const geo = new THREE.BoxGeometry(axis==='x'?length:thickness, bh, axis==='x'?thickness:length);
    const slat = new THREE.Mesh(geo, mat);
    const offset = (i - (nBoards-1)/2) * (height/nBoards);
    slat.position.set(0, offset, 0);
    slat.castShadow = true; slat.receiveShadow = true;
    g.add(slat);
  }
  return g;
}
// Real board-width based counts (~2.4in fascia courses, ~4.5in seat slats with gaps — widened
// from ~3in per request) instead of magic numbers scattered at each call site.
function fasciaBoardCount(h){ return Math.max(2, Math.round(h/0.2)); }
function seatSlatCount(d){ return Math.max(2, Math.round(d/0.38)); }
function ledStrip(length, axis){
  const mat = new THREE.MeshStandardMaterial({color:0xffb066, emissive:0xffb066, emissiveIntensity:1.6, roughness:0.4});
  ledMaterials.push(mat);
  const geo = new THREE.BoxGeometry(axis==='x'?length:0.05, 0.04, axis==='x'?0.05:length);
  const strip = new THREE.Mesh(geo, mat);
  return strip;
}
function ledPointRow(x0,z0,x1,z1,y,n){
  for(let i=0;i<n;i++){
    const t = n===1?0.5:i/(n-1);
    // Intensity/range raised well above the original (0.35/2.6) — the strip color picker was
    // changing the emissive material but the room's actual cast light barely moved, since these
    // point lights were too weak/short-range to be more than a slight decoration next to the
    // (now much lower) base ambient. This is the fixture that has to visibly tint the room.
    const l = new THREE.PointLight(0xffb066, 0.95, 4.5, 2);
    l.position.set(x0+(x1-x0)*t, y, z0+(z1-z0)*t);
    l.userData.baseIntensity = 0.95;
    scene.add(l);
    ledLights.push(l);
  }
}

// ================= Rearrangeable L-bench: RUN A + RUN B =================
// Every element except the room's actual wall panels is up for rearrangement (per request) —
// this is the bench half of that. Two independent runs form the L:
//   RUN A — always mounted on LW2 (the back wall, z=DEPTH). This is the only long wall not
//     already claimed by the door + heater + landing platform on LW1, so it isn't offered a wall
//     picker — but it CAN be slid along the wall and trimmed shorter (a straight "stadium" single-
//     wall layout is just Run B trimmed down to its minimum).
//   RUN B — the "return leg". Reassignable between the two short walls: SW1 (x=WIDTH, the window
//     wall — the original default) or SW2 (x=0, the plain wall). Also slidable/trimmable along
//     whichever wall it's on. LW1 isn't offered here either — door, heater and landing all live
//     there and a bench run would collide with at least one of them.
// Rebuilt into a persistent group (disposeGroupChildren pattern, same as the window/landing/
// heater-guard fixtures) every time any of these change, so slide/trim/reassign is instant and
// leak-free — including this run's own LED point lights, tracked separately in benchLedLights so
// a rebuild can remove exactly those from the scene without touching downlights or other fixtures.
let runA_offset = 0, runA_length = WIDTH;     // along x, mounted on LW2 (z=DEPTH)
// Return leg moved to SW2 (2026-07-29, direct report: "the top and bottom SW bench get rebuilt
// correctly on the opposite wall"): was 'SW1'.
// BUG FIX (2026-07-29, direct report: "the return bench... must run the full length of the sw wall
// its beside — both the top bench and the foot bench"): this used to be shrunk to ~2'11.8" and offset
// off the wall, to share the SW2 corner with the interior landing platform. The landing platform now
// tracks the door's own X position instead of sitting fixed at that corner (see LANDING_W/
// buildLandingGroup above), so the corner is genuinely free and the return leg runs its full DEPTH
// from the wall like Run A does — see the landingOverlapsReturnRunSW2() check further down, which
// only re-introduces a compromise if the landing's LIVE position (e.g. after the door is dragged) ever
// actually overlaps it, instead of assuming a conflict unconditionally like before.
let runB_wall = 'SW2';                        // 'SW1' (x=WIDTH) | 'SW2' (x=0)
let runB_offset = 0, runB_length = DEPTH;     // along z, mounted on runB_wall — full wall length
const RUN_MIN_LEN = ftIn(2,0); // 24" — shortest a run can be trimmed to and still seat someone

let benchGroupRef = null;
let benchLedLights = [];
let benchEditableEntries = [];

function buildBenchGroup(){
  const g = benchGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  benchLedLights.forEach(l=>{ scene.remove(l); const i=ledLights.indexOf(l); if(i>=0) ledLights.splice(i,1); });
  benchLedLights = [];
  benchEditableEntries.forEach(e=>{ e.deleted = true; e.objects = []; });
  benchEditableEntries = [];
  benchMeshes.length = 0;
  ledStripMeshes.length = 0;

  const cladT = 0.035;
  const footBoxD = LOW_DEPTH - FOOT_Z0;
  const FOOT_BOX_THICK = ftIn(0,8);
  const footReveal = SEAT_LOW - FOOT_BOX_THICK;

  const aX0 = runA_offset, aLen = runA_length;
  const bWallX = (runB_wall === 'SW1') ? WIDTH : 0;
  const bDir = (runB_wall === 'SW1') ? -1 : 1;
  const bZ0 = runB_offset, bLen = runB_length;
  function az(K){ return DEPTH - K; }        // Run A always hugs LW2 (z=DEPTH)
  function bx(K){ return bWallX + bDir*K; }  // Run B hugs whichever wall it's assigned to

  function trackedLedPointRow(x0,z0,x1,z1,y,n){
    const before = ledLights.length;
    ledPointRow(x0,z0,x1,z1,y,n);
    for(let i=before;i<ledLights.length;i++) benchLedLights.push(ledLights[i]);
  }
  function reg(objs, type, label){
    const e = registerEditable(objs, type, label);
    benchEditableEntries.push(e);
    return e;
  }

  if(BENCH_STYLE === 'closed'){
    // ---- Run A (LW2) — foot bench ----
    const low1 = new THREE.Mesh(new THREE.BoxGeometry(aLen, FOOT_BOX_THICK, footBoxD), closedMat);
    low1.position.set(aX0+aLen/2, SEAT_LOW-FOOT_BOX_THICK/2, az(FOOT_Z0+footBoxD/2));
    low1.castShadow = true; low1.receiveShadow = true; g.add(low1);
    const clad1 = slatFrontHorizontal(aLen, FOOT_BOX_THICK, cladT, fasciaBoardCount(FOOT_BOX_THICK), 'x', benchMat);
    clad1.position.set(aX0+aLen/2, SEAT_LOW-FOOT_BOX_THICK/2, az(LOW_DEPTH+cladT/2)); g.add(clad1);
    const strip1 = ledStrip(aLen,'x'); strip1.position.set(aX0+aLen/2, footReveal-0.05, az(LOW_DEPTH-0.28)); g.add(strip1);
    trackedLedPointRow(aX0+0.4, az(LOW_DEPTH-0.1), aX0+aLen-0.4, az(LOW_DEPTH-0.1), footReveal-0.05, 4);

    // ---- Run A — top bench ----
    const high1 = new THREE.Mesh(new THREE.BoxGeometry(aLen, SEAT_HIGH-gapY, HIGH_DEPTH), closedMat);
    high1.position.set(aX0+aLen/2, gapY+(SEAT_HIGH-gapY)/2, az(HIGH_DEPTH/2));
    high1.castShadow = true; high1.receiveShadow = true; g.add(high1);
    const clad1h = slatFrontHorizontal(aLen, SEAT_HIGH-gapY, cladT, fasciaBoardCount(SEAT_HIGH-gapY), 'x', benchMat);
    clad1h.position.set(aX0+aLen/2, gapY+(SEAT_HIGH-gapY)/2, az(HIGH_DEPTH+cladT/2)); g.add(clad1h);
    const strip1b = ledStrip(aLen,'x'); strip1b.position.set(aX0+aLen/2, gapY-0.05, az(HIGH_DEPTH*0.5)); g.add(strip1b);

    const top1 = slatBench(aLen, footBoxD, 0.05, seatSlatCount(footBoxD), 'x', benchMat);
    top1.position.set(aX0+aLen/2, SEAT_LOW+0.025, az(FOOT_Z0+footBoxD/2)); g.add(top1);
    const top1h = slatBench(aLen, HIGH_DEPTH, 0.05, seatSlatCount(HIGH_DEPTH), 'x', benchMat);
    top1h.position.set(aX0+aLen/2, SEAT_HIGH+0.025, az(HIGH_DEPTH/2)); g.add(top1h);

    // ---- Run B (SW1 or SW2) — foot bench ----
    const low2 = new THREE.Mesh(new THREE.BoxGeometry(footBoxD, FOOT_BOX_THICK, bLen), closedMat);
    low2.position.set(bx(FOOT_Z0+footBoxD/2), SEAT_LOW-FOOT_BOX_THICK/2, bZ0+bLen/2);
    low2.castShadow = true; low2.receiveShadow = true; g.add(low2);
    const clad2 = slatFrontHorizontal(bLen, FOOT_BOX_THICK, cladT, fasciaBoardCount(FOOT_BOX_THICK), 'z', benchMat);
    clad2.position.set(bx(LOW_DEPTH+cladT/2), SEAT_LOW-FOOT_BOX_THICK/2, bZ0+bLen/2); g.add(clad2);
    const strip2 = ledStrip(bLen,'z'); strip2.position.set(bx(LOW_DEPTH-0.28), footReveal-0.05, bZ0+bLen/2); g.add(strip2);
    trackedLedPointRow(bx(0.1), bZ0+0.4, bx(0.1), bZ0+bLen-0.4, footReveal-0.05, 4);

    // ---- Run B — top bench ----
    const high2 = new THREE.Mesh(new THREE.BoxGeometry(HIGH_DEPTH, SEAT_HIGH-gapY, bLen), closedMat);
    high2.position.set(bx(HIGH_DEPTH/2), gapY+(SEAT_HIGH-gapY)/2, bZ0+bLen/2);
    high2.castShadow = true; high2.receiveShadow = true; g.add(high2);
    const clad2h = slatFrontHorizontal(bLen, SEAT_HIGH-gapY, cladT, fasciaBoardCount(SEAT_HIGH-gapY), 'z', benchMat);
    clad2h.position.set(bx(HIGH_DEPTH+cladT/2), gapY+(SEAT_HIGH-gapY)/2, bZ0+bLen/2); g.add(clad2h);
    const strip2b = ledStrip(bLen,'z'); strip2b.position.set(bx(HIGH_DEPTH*0.5), gapY-0.05, bZ0+bLen/2); g.add(strip2b);

    const top2 = slatBench(bLen, footBoxD, 0.05, seatSlatCount(footBoxD), 'z', benchMat);
    top2.position.set(bx(FOOT_Z0+footBoxD/2), SEAT_LOW+0.025, bZ0+bLen/2); g.add(top2);
    const top2h = slatBench(bLen, HIGH_DEPTH, 0.05, seatSlatCount(HIGH_DEPTH), 'z', benchMat);
    top2h.position.set(bx(HIGH_DEPTH/2), SEAT_HIGH+0.025, bZ0+bLen/2); g.add(top2h);

    benchMeshes.push(low1,high1,top1,top1h,clad1,clad1h, low2,high2,top2,top2h,clad2,clad2h);

    reg([low1,clad1,top1], 'bench', 'Back Bench — Foot Bench (LW2)');
    reg([high1,clad1h,top1h], 'bench', 'Back Bench — Top Bench (LW2)');
    reg([low2,clad2,top2], 'bench', 'Return Bench — Foot Bench (' + runB_wall + ')');
    reg([high2,clad2h,top2h], 'bench', 'Return Bench — Top Bench (' + runB_wall + ')');
    reg(strip1, 'led', 'LED Strip — Back Foot Bench');
    reg(strip1b, 'led', 'LED Strip — Back Top Bench');
    reg(strip2, 'led', 'LED Strip — Return Foot Bench');
    reg(strip2b, 'led', 'LED Strip — Return Top Bench');
    ledStripMeshes.push(strip1,strip1b,strip2,strip2b);

  } else {
    // Floating slatted benches on posts/brackets, with an LED strip tucked under the foot bench.
    const leg1Low = slatBench(aLen, footBoxD, 0.14, seatSlatCount(footBoxD), 'x', benchMat);
    leg1Low.position.set(aX0+aLen/2, SEAT_LOW, az(FOOT_Z0+footBoxD/2));
    g.add(leg1Low);
    const leg1High = slatBench(aLen, HIGH_DEPTH, 0.12, 3, 'x', benchMat);
    leg1High.position.set(aX0+aLen/2, SEAT_HIGH, az(HIGH_DEPTH/2));
    g.add(leg1High);
    const lip1 = new THREE.Mesh(new THREE.BoxGeometry(aLen, 0.22, 0.06), benchEdge);
    lip1.position.set(aX0+aLen/2, SEAT_LOW-0.1, az(LOW_DEPTH));
    g.add(lip1);
    const strip1 = ledStrip(aLen,'x'); strip1.position.set(aX0+aLen/2, SEAT_LOW-0.22, az(FOOT_Z0+footBoxD*0.35)); g.add(strip1);
    trackedLedPointRow(aX0+0.4, az(FOOT_Z0+footBoxD*0.35), aX0+aLen-0.4, az(FOOT_Z0+footBoxD*0.35), SEAT_LOW-0.22, 4);
    const strip1b = ledStrip(aLen,'x'); strip1b.position.set(aX0+aLen/2, SEAT_HIGH-0.15, az(HIGH_DEPTH*0.5)); g.add(strip1b);

    const leg2Low = slatBench(bLen, footBoxD, 0.14, seatSlatCount(footBoxD), 'z', benchMat);
    leg2Low.position.set(bx(FOOT_Z0+footBoxD/2), SEAT_LOW, bZ0+bLen/2);
    g.add(leg2Low);
    const leg2High = slatBench(bLen, HIGH_DEPTH, 0.12, 3, 'z', benchMat);
    leg2High.position.set(bx(HIGH_DEPTH/2), SEAT_HIGH, bZ0+bLen/2);
    g.add(leg2High);
    const lip2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, bLen), benchEdge);
    lip2.position.set(bx(LOW_DEPTH), SEAT_LOW-0.1, bZ0+bLen/2);
    g.add(lip2);
    const strip2 = ledStrip(bLen,'z'); strip2.position.set(bx(FOOT_Z0+footBoxD*0.35), SEAT_LOW-0.22, bZ0+bLen/2); g.add(strip2);
    trackedLedPointRow(bx(FOOT_Z0+footBoxD*0.35), bZ0+0.4, bx(FOOT_Z0+footBoxD*0.35), bZ0+bLen-0.4, SEAT_LOW-0.22, 4);
    const strip2b = ledStrip(bLen,'z'); strip2b.position.set(bx(HIGH_DEPTH*0.5), SEAT_HIGH-0.15, bZ0+bLen/2); g.add(strip2b);

    const postMat = benchEdge;
    function post(x,z,h){
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1,h,0.1), postMat);
      p.position.set(x,h/2,z);
      p.castShadow = true;
      g.add(p);
    }
    // Each run gets its own 2 posts, at its own two ends — NOT a shared corner post assumption
    // (the two runs no longer necessarily meet flush at a shared corner once they're independently
    // slid/trimmed/reassigned), so every run's floating bench is always actually supported along
    // its own real footprint.
    post(aX0+0.15, az(LOW_DEPTH-0.15), SEAT_LOW);
    post(aX0+aLen-0.15, az(LOW_DEPTH-0.15), SEAT_LOW);
    post(bx(0.15), bZ0+0.15, SEAT_LOW);
    post(bx(0.15), bZ0+bLen-0.15, SEAT_LOW);

    function bracket(x,y,z, rotY){
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,HIGH_DEPTH), postMat);
      b.position.set(x,y,z);
      if(rotY) b.rotation.y = rotY;
      g.add(b);
    }
    // BUG FIX (2026-07-29, found via Playwright raycast forensics while chasing the "framing
    // outside" report — a SECOND, smaller instance, not the rail one): Run A's brackets correctly
    // center on az(HIGH_DEPTH/2) — i.e. the wall face minus half the bracket's own length, so the
    // bracket spans wall-to-inward with its near edge flush AT the wall. Run B's two rotated
    // brackets used bx(0.15) instead (the small fixed offset meant for the thin square posts()
    // above, copy-pasted here) — for a HIGH_DEPTH-long bracket that put its CENTER only 0.15ft from
    // the wall, so half its own length (HIGH_DEPTH/2, typically ~1ft) stuck out THROUGH the wall
    // into open exterior space — invisible before only because nothing had reason to look at that
    // exact spot; visible now as a thin disconnected board once the return bench (and the camera
    // angle through the now-open LW1 corner) made it reachable. Fixed to match Run A's own correct
    // pattern: bx(HIGH_DEPTH/2), flush at the wall, extending inward only.
    bracket(aX0+0.3, SEAT_HIGH-0.15, az(HIGH_DEPTH/2));
    bracket(aX0+aLen-0.3, SEAT_HIGH-0.15, az(HIGH_DEPTH/2));
    bracket(bx(HIGH_DEPTH/2), SEAT_HIGH-0.15, bZ0+0.3, Math.PI/2);
    bracket(bx(HIGH_DEPTH/2), SEAT_HIGH-0.15, bZ0+bLen-0.3, Math.PI/2);

    benchMeshes.push(leg1Low,leg1High,lip1, leg2Low,leg2High,lip2);

    reg([leg1Low,leg1High,lip1], 'bench', 'Back Bench (Foot + Top) — LW2');
    reg([leg2Low,leg2High,lip2], 'bench', 'Return Bench (Foot + Top) — ' + runB_wall);
    reg(strip1, 'led', 'LED Strip — Back Foot Bench');
    reg(strip1b, 'led', 'LED Strip — Back Top Bench');
    reg(strip2, 'led', 'LED Strip — Return Foot Bench');
    reg(strip2b, 'led', 'LED Strip — Return Top Bench');
    ledStripMeshes.push(strip1,strip1b,strip2,strip2b);
  }

  benchGroupRef = g;
  if(!g.parent) room.add(g);
}
buildBenchGroup();

// Real overlap check between the return leg's SW2 footprint and the landing platform's LIVE,
// door-tracking box (see LANDING_W/buildLandingGroup above) — replaces the old unconditional "SW2
// always shares this corner" assumption now that the landing isn't fixed at the corner any more.
function landingOverlapsReturnRunSW2(){
  if(runB_wall !== 'SW2') return false;
  const landingX0 = doorGroup.position.x - LANDING_W/2, landingX1 = doorGroup.position.x + LANDING_W/2;
  const landingZ0 = 0, landingZ1 = LANDING_D;
  const benchX0 = 0, benchX1 = LOW_DEPTH;
  const benchZ0 = runB_offset, benchZ1 = runB_offset + runB_length;
  return landingX0 < benchX1 && landingX1 > benchX0 && landingZ0 < benchZ1 && landingZ1 > benchZ0;
}
// Only compromises the return leg's length if the two would actually collide (e.g. the door dragged
// close to the SW2 corner with a widened landing) — otherwise leaves it at its full requested length,
// unlike the old blanket clamp that shrank it unconditionally just for being on SW2.
function reclampReturnRunForLanding(){
  if(!landingOverlapsReturnRunSW2()) return;
  runB_offset = Math.max(runB_offset, LANDING_D + 0.1);
  runB_length = Math.min(runB_length, DEPTH - runB_offset);
  if(runB_length < RUN_MIN_LEN){ runB_length = RUN_MIN_LEN; runB_offset = Math.min(runB_offset, DEPTH - RUN_MIN_LEN); }
}

// ---------- Bench run controls — slide/trim + return-leg wall reassignment ----------
window.setBenchRun = function(run, field, value){
  if(run === 'A'){
    if(field === 'offset'){
      runA_offset = Math.min(WIDTH - runA_length, Math.max(0, parseFloat(value)));
    } else if(field === 'length'){
      runA_length = Math.min(WIDTH, Math.max(RUN_MIN_LEN, parseFloat(value)));
      runA_offset = Math.min(runA_offset, WIDTH - runA_length);
    }
  } else if(run === 'B'){
    if(field === 'wall'){
      // ROOT FIX (per direct report: the wall dropdown itself — not just the separate "flip" button
      // — was "absolutely not working" for a return trip back to a wall you'd already left): this
      // used to only change runB_wall and leave whatever length/offset the OLD wall had in place, so
      // switching SW1->SW2->SW1 via this exact selector left the return leg shrunken/offset (a
      // leftover from SW2's landing-clearance clamp below) instead of filling the new wall again.
      // Reset to a full-wall run on every wall change, from the ONE place both the dropdown and
      // flipReturnWall() ultimately call, so neither path can drift out of sync with the other again.
      runB_wall = (value === 'SW2') ? 'SW2' : 'SW1';
      runB_length = DEPTH;
      runB_offset = 0;
    } else if(field === 'offset'){
      runB_offset = Math.min(DEPTH - runB_length, Math.max(0, parseFloat(value)));
    } else if(field === 'length'){
      runB_length = Math.min(DEPTH, Math.max(RUN_MIN_LEN, parseFloat(value)));
      runB_offset = Math.min(runB_offset, DEPTH - runB_length);
    }
    // The interior landing platform now tracks the door's live X position (see LANDING_W/
    // buildLandingGroup above) rather than sitting fixed at the SW2 corner, so it's normally nowhere
    // near the return leg's own SW2 footprint (x:0..LOW_DEPTH) — but check for real, don't assume,
    // in case an extreme door position + a widened landing ever does reach that far.
    reclampReturnRunForLanding();
  }
  buildBenchGroup();
  reclampHeaterX();
  window.setDoorPosition(doorGroup.position.x); // re-clamps the door + rebuilds the deck notch for the new wall
};

// ---------- Layout presets / single-button wall flip — REMOVED (2026-07-29 cleanup pass) ----------
// Direct instruction: "delete the quick swap version buttons" — this whole bundle-many-things-into-
// one-click mechanism (window.applyLayoutPreset + window.flipReturnWall, and the "L-Shape LEFT/
// RIGHT" + "Layout presets" buttons that called them, removed from build_render2.py's sidebar) was
// the single biggest source of the reported cascade bugs (a preset click reassigns the bench wall,
// which re-clamps the heater, which repositions the door, which rebuilds the deck + both rail
// systems + ext slats — any one broken link left something stranded). The exact configuration those
// presets used to bundle is now just the literal cold-start default (see the door/heater/stair
// default values above, and runB_wall/runB_offset/runB_length below) — reached by opening the file,
// not by a function call chain. Every individual control (return-leg Wall dropdown in its own edit
// panel, door/heater position sliders, stair side control) is still fully live-adjustable on its
// own; only the "bundle several of them into one click" shortcuts are gone. If you want one back as
// a real one-click bundle again, say so and it can be rebuilt on top of this simpler baseline.

// ---------- Ceiling height lookup ----------
// A dropped soffit canopy used to sit here to hold a strict 4ft bench-to-ceiling clearance,
// but it read as a set of flat slabs floating under the real roofline — removed per feedback.
// The natural sloped ceiling now runs uninterrupted from the back wall to the front wall.
function ceilingYAt(x, z){
  return heightAt(z);
}

// ---------- Star ceiling lights (mounted on whichever ceiling — soffit or sloped — is above each point) ----------
const starTex = glowSprite('rgba(255,250,235,1)');
for(let i=0;i<70;i++){
  const mat = new THREE.SpriteMaterial({map:starTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending});
  starMaterials.push(mat);
  const s = new THREE.Sprite(mat);
  starSprites.push(s);
  const zx = Math.random()*DEPTH;
  const xx = 0.3 + Math.random()*(WIDTH-0.6);
  const yTop = ceilingYAt(xx, zx) - 0.04;
  s.position.set(xx, yTop, zx);
  const sc = 0.06 + Math.random()*0.08;
  s.scale.set(sc,sc,1);
  s.material.opacity = 0.55 + Math.random()*0.45;
  s.userData.baseOpacity = s.material.opacity;
  scene.add(s);
}

// ---------- Recessed ceiling downlights ----------
// Pulled into a real constructor function (not just an inline forEach) so "+ Add Downlight"
// (point-and-click ceiling placement, wired up further down near the raycaster) can create
// more of these later using the exact same real fixture+light pair, not a fake stand-in.
const DOWNLIGHT_LABELS = ['Back Left','Back Right','Mid Left','Mid Right','Front Center'];
let addedDownlightCount = 0;
// Real photometric profile (Kurt Versen C7303, 250W PAR-38 SP — the uploaded 20.IES file) instead
// of a generic point light: candela drops to 50% of peak (34000cd) at roughly 5° off-axis and to
// 10% at roughly 13.6° — i.e. a true beam angle (full cone, 50%) of ~10° and a field angle (full
// cone, 10%) of ~27°. SpotLight.angle is the half-angle of the cone, so angle = field/2; penumbra
// is how much of that cone (from the hotspot edge outward) is the soft falloff — real fixtures
// aren't a hard-edged cutoff, so penumbra = 1 - beam/field gives that same hot-center/soft-edge
// shape instead of a uniform disc.
const IES_BEAM_DEG = 10, IES_FIELD_DEG = 27.2;
const IES_SPOT_ANGLE = THREE.MathUtils.degToRad(IES_FIELD_DEG/2);
const IES_SPOT_PENUMBRA = 1 - (IES_BEAM_DEG/IES_FIELD_DEG);
function createDownlight(x, z, label, isAdded){
  const y = ceilingYAt(x,z) - 0.03;
  // Match whatever color the existing fixtures currently have (scheme default or a manual
  // override) so a newly-added one doesn't pop in looking different from the rest of the room.
  const matchColor = downFixtureMats.length ? downFixtureMats[0].emissive.getHex() : 0xffd9a8;
  const fixMat = new THREE.MeshStandardMaterial({color:0x181818, roughness:0.4, metalness:0.5, emissive:matchColor, emissiveIntensity:0.9});
  downFixtureMats.push(fixMat);
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.03,16), fixMat);
  fixture.position.set(x,y,z);
  scene.add(fixture);
  downFixtureMeshes.push(fixture);
  const dl = new THREE.SpotLight(matchColor, 1.7, 7, IES_SPOT_ANGLE, IES_SPOT_PENUMBRA, 1.7);
  dl.position.set(x, y-0.05, z);
  dl.target.position.set(x, y-1.5, z); // straight down — a recessed can, not an aimable fixture
  scene.add(dl.target);
  dl.userData.baseIntensity = 1.7;
  dl.userData.isDownSpot = true;
  scene.add(dl);
  downLights.push(dl);
  fixture.userData.pairedLight = dl;
  fixture.userData.pairedLightOffset = new THREE.Vector3(0,-0.05,0); // generic transform system keeps the light flush under the fixture as it's dragged around the ceiling
  fixture.userData.pairedMat = fixMat;
  fixture.userData.isAdded = !!isAdded;
  applyLightLevels(); // pick up the current on/off + level state instead of always full brightness
  return registerEditable(fixture, 'down', label);
}
{
  const positions = [
    [WIDTH*0.22, DEPTH*0.18], [WIDTH*0.78, DEPTH*0.18],
    [WIDTH*0.22, DEPTH*0.52], [WIDTH*0.78, DEPTH*0.52],
    [WIDTH*0.5,  DEPTH*0.85],
  ];
  positions.forEach(([x,z],i)=> createDownlight(x, z, 'Downlight — '+(DOWNLIGHT_LABELS[i] || ('#'+(i+1)))));
}

// ---------- Footstool ---------- (real constructor — was a bare mesh with zero controls, which
// violates the project rule that every visible feature is either load-bearing to spec or has a
// real functional control; now it's a freeform-movable/copyable fixture like the bucket)
const STOOL_X_DEFAULT = WIDTH/2 + 1.6, STOOL_Z_DEFAULT = DEPTH - 1.6;
let addedStoolCount = 0;
function createStool(x, z, y, label, isAdded){
  const s = new THREE.Mesh(new THREE.BoxGeometry(1.1,0.42,0.75), benchMat);
  s.position.set(x, y!=null ? y : 0.21, z);
  s.castShadow = true; s.receiveShadow = true;
  s.userData.isAdded = !!isAdded;
  room.add(s);
  return registerEditable(s, 'stool', label);
}
const stoolEntry0 = createStool(STOOL_X_DEFAULT, STOOL_Z_DEFAULT, 0.21, 'Footstool');

// ---------- Bucket + ladle ---------- (real constructor, so "Copy" can duplicate it — see createBucket)
const BUCKET_X_DEFAULT = HEATER_X_DEFAULT + heaterRadius + 0.9, BUCKET_Z_DEFAULT = HEATER_STANDOFF_DEFAULT + 0.5;
let addedBucketCount = 0;
function createBucket(x, z, y, label, isAdded){
  const bucketGroup = new THREE.Group();
  // Real cooper's-bucket profile (tapered, narrower at the base) instead of a plain open cylinder,
  // with two metal hoop bands and a proper ladle — the old version had no ladle at all despite the
  // "Water Bucket & Ladle" label.
  const woodMat = new THREE.MeshStandardMaterial({map: TEX ? cedarMap(1,1) : null, color: TEX ? 0xe8c99a : 0xd8ac76, roughness:0.7, envMapIntensity:0.3, side:THREE.DoubleSide});
  const bandMat = new THREE.MeshStandardMaterial({color:0x8a8f94, roughness:0.35, metalness:0.7});

  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.28,0.5,24,1,true), woodMat);
  bucket.position.y = 0.29;
  bucketGroup.add(bucket);
  const bucketBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.035,24), woodMat);
  bucketBottom.position.y = 0.055;
  bucketGroup.add(bucketBottom);

  function band(yPos, radius){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,0.035,24,1,true), bandMat);
    b.position.y = yPos;
    bucketGroup.add(b);
  }
  band(0.5, 0.345);
  band(0.1, 0.303);

  function ear(sign){
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.08,0.03), woodMat);
    e.position.set(sign*0.36, 0.5, 0);
    bucketGroup.add(e);
  }
  ear(1); ear(-1);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.36,0.016,8,20,Math.PI), bandMat);
  handle.rotation.x = Math.PI/2;
  handle.position.y = 0.56;
  bucketGroup.add(handle);

  // Ladle — small carved cup on an angled handle, resting hooked on the bucket rim.
  const ladleGroup = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.075,16,10,0,Math.PI*2,0,Math.PI*0.62), woodMat);
  cup.rotation.x = Math.PI;
  ladleGroup.add(cup);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014,0.017,0.42,10), woodMat);
  shaft.position.set(0.22,0.05,0);
  shaft.rotation.z = Math.PI*0.46;
  ladleGroup.add(shaft);
  ladleGroup.position.set(0.16, 0.56, 0.02);
  ladleGroup.rotation.y = 0.4;
  bucketGroup.add(ladleGroup);

  bucketGroup.position.set(x, y||0, z);
  bucketGroup.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
  bucketGroup.userData.isAdded = !!isAdded;
  // Stashed so this specific bucket/copy's own wood tone can be changed independently (see
  // window.setFreeformTone below) — each bucket gets its own woodMat instance (declared above,
  // local to this call), not a shared module-level material, so copies don't all repaint together.
  bucketGroup.userData.toneMat = woodMat;
  room.add(bucketGroup);
  return registerEditable(bucketGroup, 'bucket', label);
}
const bucketEntry0 = createBucket(BUCKET_X_DEFAULT, BUCKET_Z_DEFAULT, 0, 'Water Bucket & Ladle');
const bucketGroup = bucketEntry0.objects[0]; // kept for the legacy setBucketPosition below
// Legacy offset-based setter, kept working for old saved versions — the generic toolbar move
// (window.setEditableTransform, see the global-toolbar section) is the real/primary control now
// and works on this and any copies the same way.
window.setBucketPosition = function(field, value){
  const v = parseFloat(value);
  if(field === 'x') bucketGroup.position.x = Math.min(BUCKET_X_DEFAULT+1.5, Math.max(BUCKET_X_DEFAULT-1.5, BUCKET_X_DEFAULT + v));
  else if(field === 'z') bucketGroup.position.z = Math.min(1.7, Math.max(0.5, v));
};

// ---------- Thermometer ---------- (real constructor — mounts flush on whichever wall/x,y it's given)
let addedThermoCount = 0;
function createThermo(x, y, label, isAdded){
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.22,24), new THREE.MeshStandardMaterial({color:0xf5f0e6, roughness:0.4}));
  disc.position.set(x, y, 0.03);
  disc.userData.isAdded = !!isAdded;
  room.add(disc);
  return registerEditable(disc, 'thermo', label);
}
const thermoEntry0 = createThermo(WIDTH*0.4, BACK_H*0.72, 'Thermometer');
thermoDiscRef = thermoEntry0.objects[0]; thermoMatRef = thermoDiscRef.material;
window.setThermoTone = function(hex){ if(thermoMatRef) thermoMatRef.color.set(hex); };

// ---------- Accent glass panel ---------- (real constructor — mounted mesh + its own paired point light)
let addedAccentCount = 0;
function createAccent(x, y, label, isAdded){
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.05), glassMat.clone());
  accent.position.set(x, y, 0.04);
  room.add(accent);
  const light = new THREE.PointLight(0x3fd18a, 0.5, 2);
  const lightOffset = new THREE.Vector3(0,0,0.3);
  light.position.copy(accent.position).add(lightOffset);
  scene.add(light);
  accent.userData.pairedLight = light;
  accent.userData.pairedLightOffset = lightOffset; // lets the generic transform system keep the glow attached when the panel moves
  accent.userData.isAdded = !!isAdded;
  return registerEditable(accent, 'accent', label);
}
const accentEntry0 = createAccent(WIDTH*0.66, BACK_H*0.6, 'Accent Glass Light');
accentMeshRef = accentEntry0.objects[0]; accentMat = accentMeshRef.material; accentLight = accentMeshRef.userData.pairedLight;
// Real color control, independent of the active lighting scheme (the scheme still sets a
// default whenever it's switched — this just lets it be overridden per-render). Only touches the
// FIRST/default accent panel, same legacy-compat approach as setBucketPosition above — any copies
// get their own color via the toolbar or their own per-element panel.
window.setAccentColor = function(hex){
  if(accentMat) accentMat.color.set(hex);
  if(accentLight) accentLight.color.set(hex);
};

// ---------- Wall / floor / bench material tone (finish swap) ----------
window.setSurfaceTone = function(type, hex){
  const c = new THREE.Color(hex);
  if(type === 'walls'){ [woodWall, woodWallFront, woodWallSide, woodCeil].forEach(m=> m.color.copy(c)); }
  else if(type === 'floor'){ floorMat.color.copy(c); }
  else if(type === 'bench'){ [benchMat, closedMat, benchEdge].forEach(m=> m.color.copy(c)); }
};

// ---------- Full floor deck: modular 4'x3' landing-deck tiles covering the whole interior floor,
// with a precut, repositionable opening left over the heater. Real reason this exists, not just
// decorative: a heater standing on wood decking needs the decking cut back to bare concrete under
// it (combustible-clearance practice), and building the WHOLE floor as one raised deck (instead of
// just the entry landing) would also raise the heater itself by the deck's own 4-1/4in thickness if
// it sat on top of it — eating into the already-tight clearance to the sloped ceiling. Cutting the
// tiles out over the heater keeps it sitting right on the slab, same height as before.
const FLOOR_TILE_W = ftIn(3,0);   // 36" module, laid along X (WIDTH) — the "3' (LW side)" dimension
const FLOOR_TILE_D = ftIn(4,0);   // 48" module, laid along Z (DEPTH) — the "4' (SW side)" dimension
const FLOOR_DECK_H = LANDING_H;   // same 4-1/4" reveal as the entry landing — one consistent deck system
const FLOOR_DECK_GAP = 0.02;      // small reveal between tiles so the modules actually read as tiles
const HOLE_MIN = ftIn(1,6), HOLE_MAX = ftIn(4,0);
let HOLE_W = ftIn(2,6), HOLE_D = ftIn(2,6); // 30"x30" default — clears the heater guard (~22" across) with margin
// Default: centered on the heater's default X position, flush against the wall the heater backs
// onto (its own Z is just the 6-12in standoff off that wall, so anchoring the hole AT the wall
// and letting it extend inward is what actually clears the heater rather than straddling the wall).
let HOLE_X = Math.max(0, Math.min(WIDTH - HOLE_W, HEATER_X_DEFAULT - HOLE_W/2));
let HOLE_Z = 0;
let floorDeckGroupRef = null, floorHoleTrimGroupRef = null;
function tileGridEdges(total, size){
  // Cumulative tile boundaries along one axis: full-size modules, with a single shorter fitted
  // module absorbing the remainder at the far edge. If that remainder would be a sliver (under a
  // quarter-module), it's folded into the previous module instead — a real 1" leftover tile isn't
  // a buildable module, so the last two rows/columns split the remainder evenly-ish instead.
  let n = Math.floor(total / size);
  let remainder = total - n*size;
  if(remainder > 1e-6 && remainder < size*0.25 && n >= 1){ n -= 1; remainder += size; }
  const edges = [0];
  for(let i=0; i<n; i++) edges.push(Math.min(total, edges[edges.length-1] + size));
  if(remainder > 1e-6) edges.push(total);
  return edges;
}
function rectsOverlap(ax0,ax1,az0,az1,bx0,bx1,bz0,bz1){
  return ax0 < bx1-1e-6 && ax1 > bx0+1e-6 && az0 < bz1-1e-6 && az1 > bz0+1e-6;
}
function buildFloorDeck(){
  const g = floorDeckGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  const xEdges = tileGridEdges(WIDTH, FLOOR_TILE_W);
  const zEdges = tileGridEdges(DEPTH, FLOOR_TILE_D);
  const holeX0 = HOLE_X, holeX1 = HOLE_X+HOLE_W, holeZ0 = HOLE_Z, holeZ1 = HOLE_Z+HOLE_D;
  for(let xi=0; xi<xEdges.length-1; xi++){
    for(let zi=0; zi<zEdges.length-1; zi++){
      const x0=xEdges[xi], x1=xEdges[xi+1], z0=zEdges[zi], z1=zEdges[zi+1];
      // Whole tile is simply omitted wherever it overlaps the requested opening — a real precut
      // deck is assembled from whichever tiles you leave out, not carved with a jigsaw afterward.
      if(rectsOverlap(x0,x1,z0,z1, holeX0,holeX1,holeZ0,holeZ1)) continue;
      const w = (x1-x0) - FLOOR_DECK_GAP, d = (z1-z0) - FLOOR_DECK_GAP;
      if(w<=0.02 || d<=0.02) continue;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(w, FLOOR_DECK_H, d), floorPanelMat);
      tile.position.set(x0+w/2+FLOOR_DECK_GAP/2, FLOOR_DECK_H/2, z0+d/2+FLOOR_DECK_GAP/2);
      tile.castShadow = true; tile.receiveShadow = true;
      g.add(tile);
    }
  }
  floorDeckGroupRef = g;
  return g;
}
room.add(buildFloorDeck());
// Thin trim frame tracing the actual requested opening rectangle (independent of the tile grid it
// snaps to) — doubles as a real edge detail (a finished, moisture/heat-safe nosing around the cut,
// same as any real deck opening would need) and as the clickable/draggable handle for the hole.
function buildFloorHoleTrim(){
  const g = floorHoleTrimGroupRef || new THREE.Group();
  disposeGroupChildren(g);
  const y = 0.03, h = 0.05, t = 0.06;
  const x0=HOLE_X, x1=HOLE_X+HOLE_W, z0=HOLE_Z, z1=HOLE_Z+HOLE_D;
  const cx=(x0+x1)/2, cz=(z0+z1)/2;
  const trimMat = heaterGuardMatRef || closedMat;
  function edge(w,d,x,z){
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), trimMat);
    m.position.set(x, y, z);
    m.castShadow = false; m.receiveShadow = true;
    g.add(m);
  }
  edge(HOLE_W+t, t, cx, z0+t/2);
  edge(HOLE_W+t, t, cx, z1-t/2);
  edge(t, HOLE_D+t, x0+t/2, cz);
  edge(t, HOLE_D+t, x1-t/2, cz);
  floorHoleTrimGroupRef = g;
  return g;
}
room.add(buildFloorHoleTrim());
window.setFloorHoleGeometry = function(field, value){
  const v = parseFloat(value);
  if(field === 'w') HOLE_W = Math.min(HOLE_MAX, Math.max(HOLE_MIN, v));
  else if(field === 'd') HOLE_D = Math.min(HOLE_MAX, Math.max(HOLE_MIN, v));
  else if(field === 'x') HOLE_X = v;
  else if(field === 'z') HOLE_Z = v;
  HOLE_X = Math.min(WIDTH - HOLE_W, Math.max(0, HOLE_X));
  HOLE_Z = Math.min(DEPTH - HOLE_D, Math.max(0, HOLE_Z));
  buildFloorDeck();
  buildFloorHoleTrim();
};
// Debug/test hook: current tile count + the hole rect actually being cut, so a headless test can
// confirm the omitted tiles genuinely track the hole rather than just checking the stored numbers.
window.__debugFloorDeck = function(){
  return {
    tileCount: floorDeckGroupRef ? floorDeckGroupRef.children.length : 0,
    hole: {x: HOLE_X, z: HOLE_Z, w: HOLE_W, d: HOLE_D},
  };
};

// ---------- Remaining registry entries ----------
// Bench segments and LED strips register themselves individually at their own construction
// site (see the bench-building section above); everything here is either a single real object
// (heater, door, window, front glass, the heater's top vent) or a genuinely single collective
// system (walls & ceiling share one shell, all 70 ceiling stars are one fiber-optic system).
registerEditable(heaterGroup, 'heater', 'Sauna Heater');
registerEditable(doorGroup, 'door', 'Door');
if(windowGroupRef) registerEditable(windowGroupRef, 'window', 'Window (left wall — SW1)');
registerEditable([backWall, frontWall, leftWall, rightWall, ceiling], 'walls', 'Walls & Ceiling');
registerEditable(floor, 'floor', 'Floor');
// NOTE: bucket/thermo/accent are now registered inside createBucket/createThermo/createAccent
// at their construction site above — do NOT re-register here (was a leftover duplicate-registration
// bug from before the constructor refactor).
if(landingGroupRef) registerEditable(landingGroupRef, 'landing', 'Landing Platform (LW1)');
if(floorDeckGroupRef) registerEditable(floorDeckGroupRef, 'floordeck', 'Sauna Floor Deck (4×3 tiles)');
if(floorHoleTrimGroupRef) registerEditable(floorHoleTrimGroupRef, 'floorhole', 'Heater Floor Cutout (concrete access)');
if(starSprites.length) registerEditable(starSprites, 'stars', 'Ceiling Stars');

// ============================================================================
// (Ensuite/Bathroom 1 placeholder footprint removed in the 2026-07-29 cleanup pass — it was an
// unfinished translucent-box placeholder with no real value until a real sketch/measurements
// exist, per SAUNA_APP_TODO_CLEANUP.md. Bathroom 1 will be rebuilt properly once those
// measurements are in hand, kept out of this file's cascade in the meantime. window.setEnsuiteWall
// / setEnsuiteGeometry / toggleEnsuite are intentionally gone; old saved-state JSON with an
// `ensuite` block is simply ignored on load — see applyDesignState below.)
// ============================================================================
// Budget Engine wiring — recompute-on-demand bill of materials
// ============================================================================
// Reads window.Budget from design_core.js (must be loaded before this file —
// see build_render2.py's __COREDATA__ script tag, ahead of __APP__). Every
// unit price here is a rough placeholder (flagged placeholder:true) until you
// send real supplier pricing — the point right now is the live category
// breakdown and the fact that it recomputes from the actual current geometry
// (wall dimensions, which rail walls are on, ensuite footprint, etc.) every
// time you open the Budget tab, not a one-time guess that goes stale.
function computeBudget(){
  if(!window.Budget) return;
  window.Budget.clear();
  const B = window.Budget;
  const perim = 2*(WIDTH+DEPTH);
  const avgH = (FRONT_H+BACK_H)/2;
  const wallSqft = perim*avgH + WIDTH*DEPTH; // walls + ceiling, rough

  B.addItem({category:'Finish Wood & Cladding', name:'Cedar T&G — walls & ceiling', qty: Math.round(wallSqft), unit:'sqft', unitCost:9.5, placeholder:true, note:'Interior lining, material only'});
  B.addItem({category:'Framing & Structure', name:'Framing lumber & insulation allowance', qty: Math.round(WIDTH*DEPTH), unit:'sqft floor', unitCost:14, placeholder:true, note:'Existing structure conversion — interior build only, per your scope note'});
  B.addItem({category:'Finish Wood & Cladding', name:'L-shaped cedar bench (both tiers)', qty:1, unit:'lump sum', unitCost:1450, placeholder:true});
  B.addItem({category:'Fixtures & Appliances', name: heaterModelRef==='hive11' ? 'HUUM Hive 11kW heater' : 'HUUM Hive Mini 9kW heater', qty:1, unit:'ea', unitCost: heaterModelRef==='hive11' ? 1550 : 1250, placeholder:true});
  B.addItem({category:'Fixtures & Appliances', name:'Sauna rocks', qty:1, unit:'lump sum', unitCost:120, placeholder:true});

  const railWallLenFt = { LW1: WIDTH, LW2: WIDTH, SW1: DEPTH, SW2: DEPTH };
  let railWallsOn = 0;
  Object.keys(RAIL_WALLS).forEach(k=>{ if(RAIL_WALLS[k]) railWallsOn += railWallLenFt[k]||0; });
  if(railWallsOn>0) B.addItem({category:'Finish Wood & Cladding', name:'Rail boards — light rail + 2 backrest rails', qty: Math.round(railWallsOn*3), unit:'linear ft', unitCost:4.2, placeholder:true, note:'3 rails × active wall runs'});
  B.addItem({category:'Electrical & Lighting', name:'LED strip + driver (light rail)', qty:1, unit:'lump sum', unitCost:220, placeholder:true});
  B.addItem({category:'Electrical & Lighting', name:'Downlights, ceiling stars, wiring allowance', qty:1, unit:'lump sum', unitCost:480, placeholder:true});

  const extSlatWallLenFt = WIDTH + 2*DEPTH; // LW2 + SW1 + SW2 (LW1 excluded by design)
  B.addItem({category:'Finish Wood & Cladding', name:'Exterior wall slats (LW2, SW1, SW2)', qty: Math.round(extSlatWallLenFt), unit:'linear ft', unitCost:6.8, placeholder:true});

  B.addItem({category:'Glass & Glazing', name:'Cedar/glass entry door', qty:1, unit:'ea', unitCost:1100, placeholder:true});
  B.addItem({category:'Glass & Glazing', name:'Window (SW1)', qty: Math.round(WIN_W*10)/10, unit:'sqft', unitCost:65, placeholder:true});

  const deckSqftEst = (WIDTH+4)*8; // rough footprint incl. stairs/landing, until the deck resize/relayout task lands
  B.addItem({category:'Framing & Structure', name:'Exterior deck & stairs — existing deck, layout allowance', qty: Math.round(deckSqftEst), unit:'sqft', unitCost:11, placeholder:true, note:'Deck itself is existing per your note — this covers re-layout/finish work only'});

  B.addItem({category:'Hardware & Fasteners', name:'Fasteners, brackets, sealant allowance', qty:1, unit:'lump sum', unitCost:260, placeholder:true});
}
window.computeBudget = computeBudget;
computeBudget();

const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();
function findEditableFromObject(obj){
  let o = obj;
  while(o){
    if(o.userData && o.userData.editableRef) return o.userData.editableRef;
    o = o.parent;
  }
  return null;
}
function findEditableAtClient(clientX, clientY){
  const rect = renderer.domElement.getBoundingClientRect();
  clickMouse.x = ((clientX-rect.left)/rect.width)*2 - 1;
  clickMouse.y = -((clientY-rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(clickMouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  for(const h of hits){
    if(!h.object.visible) continue;
    const entry = findEditableFromObject(h.object);
    if(entry) return entry;
  }
  return null;
}
// ---------- Add mode: point-and-click placement for new fixtures ----------
// window.startAddMode(kind) arms it; the next real click on the 3D view (not a drag-to-orbit)
// raycasts against the relevant surface and places a new instance there instead of opening an
// edit panel. Currently supports 'downlight' (click the ceiling).
let addMode = null;
window.startAddMode = function(kind){
  addMode = kind;
  if(window.onAddModeChange) window.onAddModeChange(kind);
};
window.cancelAddMode = function(){
  addMode = null;
  if(window.onAddModeChange) window.onAddModeChange(null);
};
function handleAddModeClick(clientX, clientY){
  const rect = renderer.domElement.getBoundingClientRect();
  clickMouse.x = ((clientX-rect.left)/rect.width)*2 - 1;
  clickMouse.y = -((clientY-rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(clickMouse, camera);
  if(addMode === 'downlight'){
    const hits = raycaster.intersectObject(ceiling, true);
    const hit = hits.find(h=>h.object.visible);
    addMode = null;
    if(window.onAddModeChange) window.onAddModeChange(null);
    if(!hit){ if(window.onAddModeMiss) window.onAddModeMiss('Click directly on the ceiling to place a downlight.'); return; }
    addedDownlightCount++;
    const entry = createDownlight(hit.point.x, hit.point.z, 'Downlight — Added #'+addedDownlightCount, true);
    if(window.onEditableAdded) window.onEditableAdded(entry);
  }
}
function handleEditClick(clientX, clientY){
  if(addMode){ handleAddModeClick(clientX, clientY); return; }
  const entry = findEditableAtClient(clientX, clientY);
  if(!entry && window.hideContextualMeasurements) window.hideContextualMeasurements();
  if(window.onEditableClick) window.onEditableClick(entry);
}
window.__handleEditClick = handleEditClick;
// Non-navigating lookup used by the markup/annotation tools: identifies which real, editable
// piece a note/pencil/lasso mark is nearest to, WITHOUT jumping the sidebar there immediately —
// the mark's own "Edit" pin decides when to actually open the panel.
window.__findEditableAt = findEditableAtClient;

// ---------- Construction-standard measurement overlay ----------
// Toggleable dimension lines + labels, drawn as real unlit geometry so they read on top of
// everything regardless of lighting/angle — the same idea as dimension strings on a
// construction drawing, just placed directly in the 3D model instead of a flat elevation.
function fmtFtIn(ft){
  const totalIn = Math.round(ft*12);
  const sign = totalIn < 0 ? '-' : '';
  const abs = Math.abs(totalIn);
  const f = Math.floor(abs/12), i = abs%12;
  return sign + f + "'" + i + '"';
}
function makeTextSprite(text, opts){
  opts = opts || {};
  const fontSize = opts.fontSize || 44;
  const worldScale = opts.scale || 0.0095;
  const c = document.createElement('canvas');
  const ctx0 = c.getContext('2d');
  ctx0.font = `bold ${fontSize}px -apple-system, sans-serif`;
  const textW = Math.ceil(ctx0.measureText(text).width);
  c.width = textW + 28; c.height = fontSize + 22;
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(18,13,9,0.88)';
  ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle = '#f5c98a'; ctx.lineWidth = 3;
  ctx.strokeRect(1.5,1.5,c.width-3,c.height-3);
  ctx.fillStyle = '#ffe9c7';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14, c.height/2 + 2);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({map:tex, depthTest:false, depthWrite:false, sizeAttenuation:true});
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(c.width*worldScale, c.height*worldScale, 1);
  sprite.renderOrder = 1001;
  return sprite;
}
const dimLineMat = new THREE.LineBasicMaterial({color:0xfff3d6, depthTest:false, transparent:true, opacity:0.95});
function dimTick(p){
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.028,8,8), new THREE.MeshBasicMaterial({color:0xfff3d6, depthTest:false}));
  m.position.copy(p);
  m.renderOrder = 1000;
  return m;
}
function makeDim(pA, pB, label, labelAt){
  const group = new THREE.Group();
  const geo = new THREE.BufferGeometry().setFromPoints([pA,pB]);
  const line = new THREE.Line(geo, dimLineMat);
  line.renderOrder = 1000;
  group.add(line);
  group.add(dimTick(pA));
  group.add(dimTick(pB));
  const mid = labelAt || pA.clone().lerp(pB, 0.5);
  // Deliberately much smaller than the wall-orientation labels: there are a dozen-plus of these
  // packed into a room that's only ~10ft x 6ft, so the wall-label sprite size (fine for 4 labels
  // spread across the room's perimeter) made the measurement overlay an illegible, overlapping
  // wall of text. Roughly a third the area fixes that without needing to touch every call site.
  const sprite = makeTextSprite(label, {fontSize:24, scale:0.0048});
  sprite.position.copy(mid);
  group.add(sprite);
  return group;
}
const measureGroup = new THREE.Group();
scene.add(measureGroup);
measureGroup.visible = false;

// ---------- Wall labels (LW1/LW2/SW1/SW2) ----------
// Rev. B naming: LW1 = door's wall = z=0 (backWall/FRONT). LW2 = opposite wall = z=DEPTH
// (frontWall/BACK). SW1 = bench-return/window wall = x=WIDTH (rightWall/LEFT). SW2 = door-adjacent
// wall = x=0 (leftWall/RIGHT). Orbiting to an unfamiliar angle (or the "along LW1"/SW2-return
// layout presets, which visually mirror the default) easily turns you around about which wall is
// which — this overlay just labels them, reusing the same always-on-top text-sprite look as the
// measurement overlay so it reads clearly from outside OR inside.
const wallLabelGroup = new THREE.Group();
scene.add(wallLabelGroup);
wallLabelGroup.visible = false;
(function(){
  const labelY = Math.min(BACK_H, FRONT_H) * 0.55;
  const OUT = 1.25; // ft clear of the envelope, so labels always float outside the structure
  const defs = [
    {text:'LW1 — DOOR WALL',        pos:new THREE.Vector3(WIDTH/2, labelY, -OUT)},
    {text:'LW2 — BACK WALL',        pos:new THREE.Vector3(WIDTH/2, labelY, DEPTH+OUT)},
    {text:'SW1 — WINDOW / RETURN',  pos:new THREE.Vector3(WIDTH+OUT, labelY, DEPTH/2)},
    {text:'SW2 — DOOR-ADJACENT',    pos:new THREE.Vector3(-OUT, labelY, DEPTH/2)},
  ];
  defs.forEach(d=>{
    const sprite = makeTextSprite(d.text, {fontSize:28, scale:0.0055});
    sprite.position.copy(d.pos);
    wallLabelGroup.add(sprite);
  });
})();
window.toggleWallLabels = function(on){
  wallLabelGroup.visible = on;
};

// Every dimension is tagged with which element it's actually about, and starts hidden — the
// overlay used to dump all dozen-plus of these on screen at once (illegible, overlapping wall of
// text). Now there are two ways to see any of them: the "Room Dimensions" toggle shows just the
// simple room envelope (width/depth/wall heights — 'walls'), and selecting any element auto-shows
// ONLY the dimensions tagged for that element's type, clearing when you deselect. Simple by
// default, detailed exactly when — and only when — you've clicked on the thing it's about.
function tagDim(obj, relatedType){ obj.userData.relatedType = relatedType; obj.visible = false; measureGroup.add(obj); return obj; }
measureGroup.visible = true;

// Room footprint (width along the front, depth along the right side, floor level)
tagDim(makeDim(
  new THREE.Vector3(0,0.02,DEPTH+0.5), new THREE.Vector3(WIDTH,0.02,DEPTH+0.5),
  'Width '+fmtFtIn(WIDTH)
), 'walls');
tagDim(makeDim(
  new THREE.Vector3(WIDTH+0.5,0.02,0), new THREE.Vector3(WIDTH+0.5,0.02,DEPTH),
  'Depth '+fmtFtIn(DEPTH)
), 'walls');
// Wall heights (LW1 = door wall = new FRONT, LW2 = opposite wall = new BACK)
tagDim(makeDim(
  new THREE.Vector3(-0.5,0,0), new THREE.Vector3(-0.5,BACK_H,0),
  'Front wall (LW1) '+fmtFtIn(BACK_H)
), 'walls');
tagDim(makeDim(
  new THREE.Vector3(-0.5,0,DEPTH), new THREE.Vector3(-0.5,FRONT_H,DEPTH),
  'Back wall (LW2) '+fmtFtIn(FRONT_H)
), 'walls');
// Bench seat heights (floor to seat top)
tagDim(makeDim(
  new THREE.Vector3(0.3,0,DEPTH-LOW_DEPTH-0.35), new THREE.Vector3(0.3,SEAT_LOW,DEPTH-LOW_DEPTH-0.35),
  'Foot bench seat '+fmtFtIn(SEAT_LOW)
), 'bench');
tagDim(makeDim(
  new THREE.Vector3(0.3,0,DEPTH-HIGH_DEPTH-0.35), new THREE.Vector3(0.3,SEAT_HIGH,DEPTH-HIGH_DEPTH-0.35),
  'Top bench seat '+fmtFtIn(SEAT_HIGH)
), 'bench');
tagDim(makeDim(
  new THREE.Vector3(LANDING_W*0.5,0,LANDING_D*0.5), new THREE.Vector3(LANDING_W*0.5,LANDING_H,LANDING_D*0.5),
  'Landing platform '+fmtFtIn(LANDING_H)
), 'landing');
// Bench depths (foot/top tier, floor level, LW2/back-wall run) — the foot bench's own box only
// spans FOOT_Z0..LOW_DEPTH from the wall (rule 8's 6" tuck-under, not flush to the wall), so its
// depth arrow is drawn against its actual footprint rather than the wall — mirrored off DEPTH
// since this run is on LW2 (the back wall). These reference
// annotations are drawn against the DEFAULT full-length Run A layout — they're spec call-outs
// for the bench's depth profile (which doesn't change with slide/trim/reassign, only the along-
// wall position/length do), not a live readout of the current bench-run state.
tagDim(makeDim(
  new THREE.Vector3(WIDTH*0.3,0.03,DEPTH-FOOT_Z0), new THREE.Vector3(WIDTH*0.3,0.03,DEPTH-LOW_DEPTH),
  'Foot bench '+fmtFtIn(LOW_DEPTH-FOOT_Z0)+' deep'
), 'bench');
tagDim(makeDim(
  new THREE.Vector3(WIDTH*0.6,0.03,DEPTH), new THREE.Vector3(WIDTH*0.6,0.03,DEPTH-HIGH_DEPTH),
  'Top bench '+fmtFtIn(HIGH_DEPTH)+' deep'
), 'bench');
// Window opening — width, height, sill height, all read off the live WIN_* values so this
// stays correct even after using the click-to-edit window resize controls.
tagDim(makeDim(
  new THREE.Vector3(WIDTH+0.35, WIN_Y-WIN_H/2-0.3, WIN_Z-WIN_W/2), new THREE.Vector3(WIDTH+0.35, WIN_Y-WIN_H/2-0.3, WIN_Z+WIN_W/2),
  'Window '+fmtFtIn(WIN_W)+' wide'
), 'window');
tagDim(makeDim(
  new THREE.Vector3(WIDTH+0.35, WIN_Y-WIN_H/2, WIN_Z-WIN_W/2-0.3), new THREE.Vector3(WIDTH+0.35, WIN_Y+WIN_H/2, WIN_Z-WIN_W/2-0.3),
  fmtFtIn(WIN_H)+' tall'
), 'window');
tagDim(makeDim(
  new THREE.Vector3(WIDTH+0.35, 0, WIN_Z-WIN_W/2-0.3), new THREE.Vector3(WIDTH+0.35, WIN_Y-WIN_H/2, WIN_Z-WIN_W/2-0.3),
  'Sill '+fmtFtIn(WIN_Y-WIN_H/2)+' off floor'
), 'window');
// Call-out A: high-bench-seat-to-ceiling clearance measured right at the window position on
// SW1 (the left wall in current terms — bench-return wall, x=WIDTH) — the exact spot referenced
// ("seating height on the upper bench to the ceiling... along the window").
{
  const clr = heightAt(WIN_Z) - SEAT_HIGH;
  tagDim(makeDim(
    new THREE.Vector3(WIDTH-0.25, SEAT_HIGH, WIN_Z), new THREE.Vector3(WIDTH-0.25, heightAt(WIN_Z), WIN_Z),
    'Seat-to-ceiling here '+fmtFtIn(clr)
  ), 'bench');
}
// Call-out B: the ceiling slope profile directly over SW1's high bench (left wall in current
// terms, x=WIDTH), seen end to end — clearance at the LW1/door (new front) end, which sits deep
// in the flat 7'8" ceiling zone, vs. the LW2 (new back) end, where the short ramp
// down to the roofline lives — plus a line tracing the actual slope between them.
{
  const doorEndClr = heightAt(0) - SEAT_HIGH;
  const tankEndClr = heightAt(DEPTH) - SEAT_HIGH;
  const xLine = WIDTH - HIGH_DEPTH/2;
  tagDim(makeDim(
    new THREE.Vector3(xLine, SEAT_HIGH, 0.05), new THREE.Vector3(xLine, heightAt(0.05), 0.05),
    'Front (LW1) end '+fmtFtIn(doorEndClr)+' clear'
  ), 'bench');
  tagDim(makeDim(
    new THREE.Vector3(xLine, SEAT_HIGH, DEPTH-0.05), new THREE.Vector3(xLine, heightAt(DEPTH-0.05), DEPTH-0.05),
    'Back (LW2) end '+fmtFtIn(tankEndClr)+' clear'
  ), 'bench');
  // the slope line itself, tracing the actual roofline over the bench from LW1 to LW2
  const slopeGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(xLine, heightAt(0), 0),
    new THREE.Vector3(xLine, heightAt(DEPTH), DEPTH),
  ]);
  const slopeLine = new THREE.Line(slopeGeo, new THREE.LineBasicMaterial({color:0xff8a3d, depthTest:false, transparent:true, opacity:0.95}));
  slopeLine.renderOrder = 1000;
  tagDim(slopeLine, 'bench');
}
function setDimVisibility(relatedType, on){
  measureGroup.children.forEach(c=>{ if(c.userData.relatedType === relatedType) c.visible = on; });
}
// Simple baseline: just the room envelope (width/depth/wall heights), independent of selection.
window.toggleMeasurements = function(on){
  setDimVisibility('walls', on);
};
// Contextual: whatever's tagged for the currently-selected element's type, and nothing else —
// this is what actually answers "the measurements of what I clicked on."
window.showMeasurementsFor = function(relatedType){
  measureGroup.children.forEach(c=>{ if(c.userData.relatedType && c.userData.relatedType !== 'walls') c.visible = false; });
  if(relatedType) setDimVisibility(relatedType, true);
};
window.hideContextualMeasurements = function(){
  measureGroup.children.forEach(c=>{ if(c.userData.relatedType && c.userData.relatedType !== 'walls') c.visible = false; });
};
// Debug/test hook: visibility counts per relatedType tag, e.g. {walls:{total:4,visible:0}, bench:{total:7,visible:3}}.
window.__debugDimVisibility = function(){
  const out = {};
  measureGroup.children.forEach(c=>{
    const t = c.userData.relatedType || 'untagged';
    out[t] = out[t] || {total:0, visible:0};
    out[t].total++;
    if(c.visible) out[t].visible++;
  });
  return out;
};

// ---------- Numbered element list (sidebar "Elements" tab) ----------
// Same registry the click-to-edit raycaster uses — this just gives the sidebar a way to open
// the identical focused-edit UI for something the client picks from a list instead of clicking
// it in the 3D view directly (useful for small/hard-to-click pieces like a single downlight).
function boundsCenterAndSize(objects){
  const box = new THREE.Box3();
  let has = false;
  (objects||[]).forEach(o=>{ if(!o) return; box.union(new THREE.Box3().setFromObject(o)); has = true; });
  if(!has) return null;
  const center = new THREE.Vector3(); box.getCenter(center);
  const size = new THREE.Vector3(); box.getSize(size);
  return {center, size};
}
window.getEditablesList = function(){
  return editables.filter(e=>!e.deleted).map(e => ({ index: e.index, type: e.type, label: e.label }));
};
// Delete is only exposed (see build_render2.py's DELETABLE_TYPES) for genuinely optional
// accessories — bucket, thermometer, accent light, individual downlights — never for spec'd
// structural pieces (walls, bench, door, heater, windows) where deleting would leave the design
// no longer buildable as drawn.
window.deleteEditable = function(index){
  const entry = editables[index];
  if(!entry || entry.deleted) return false;
  // Stash whether this was a user-added copy BEFORE clearing objects below — deletedIndices
  // (used by save/load) needs this after the fact to tell a real deletion of an original,
  // singular fixture apart from routine internal churn (addedFixtures/addedDownlights already
  // clear-and-recreate every added copy on every load, so re-flagging those as "deleted" too
  // would just be redundant noise growing the list forever).
  entry.wasAdded = entry.objects.some(o=> o && o.userData && o.userData.isAdded);
  entry.objects.forEach(obj=>{
    if(!obj) return;
    if(obj.userData && obj.userData.pairedLight){
      const dl = obj.userData.pairedLight;
      scene.remove(dl);
      const li = downLights.indexOf(dl);
      if(li>=0) downLights.splice(li,1);
    }
    if(obj.userData && obj.userData.pairedMat){
      const mi = downFixtureMats.indexOf(obj.userData.pairedMat);
      if(mi>=0) downFixtureMats.splice(mi,1);
    }
    const di = downFixtureMeshes.indexOf(obj);
    if(di>=0) downFixtureMeshes.splice(di,1);
    if(obj.parent) obj.parent.remove(obj); else scene.remove(obj);
    if(obj.geometry) obj.geometry.dispose();
  });
  entry.deleted = true;
  entry.objects = [];
  return true;
};
window.focusEditableByIndex = function(i){
  const entry = editables[i];
  if(!entry) return;
  const b = boundsCenterAndSize(entry.objects);
  if(b && !topMode){
    if(insideMode){
      const aim = aimAt(insidePos, b.center);
      lookYaw = aim.yaw; lookPitch = aim.pitch;
    } else {
      target.copy(b.center);
      radius = Math.max(3.5, Math.min(16, Math.max(b.size.x,b.size.y,b.size.z)*2.6 + 2.5));
      autoRotate = false;
    }
    updateCamera();
  }
  if(window.showMeasurementsFor) window.showMeasurementsFor(entry.type);
  if(window.onEditableClick) window.onEditableClick(entry);
};

// ---------- Generic freeform transform (backs the global toolbar) ----------
// Two movement tiers, matching how the design actually has to behave:
//  - FREEFORM_TYPES (bucket, thermo, accent, down, stool): single, never-rebuilt loose fixtures.
//    These get true unconstrained XYZ + rotation + scale — "move anywhere in the room", including
//    vertically onto another surface (e.g. the bucket up onto the bench top), per the explicit
//    request. Known, documented scope boundary: thermo/accent stay flush-facing whichever wall
//    they started on (moving them to a different wall's plane, with a matching 90°/180° reorient,
//    is a bigger feature than this pass — same category of work as the bench wall-reassignment —
//    and isn't wired up here).
//  - Everything else (bench, door, heater, window, landing, deck/stairs) is spec-governed
//    structural geometry and keeps its existing real-but-bounded parametric controls (setBenchRun,
//    setDoorPosition, setHeaterPosition, setStairGeometry, ...) because free movement there could
//    produce a design that isn't actually buildable (see the door/window width/height/position
//    fixes above for what "wider but still bounded" means in practice for THIS tier).
// BUG FIX (2026-07-30, direct report: "we really need a copy and paste function that is global to
// all elements" — confirmed: yes, including the door/heater/window, not just loose fixtures):
// GENERIC_COPY below gives every type a real Copy, including the structural tier above. A generic
// copy is a frozen visual snapshot — an independent deep clone, wrapped in its own group so it
// gets true freeform x/y/z/rotate/scale/delete via the SAME machinery as bucket/thermo/etc (see
// isFreeformEntry) — NOT a live second instance wired into that type's real parametric setters
// (there's still exactly one real door/heater/window/bench-run governing the actual build; a copy
// of one is a decoration you can pose anywhere, same category as a second bucket). Editing a
// generic copy's material/style isn't wired up (that lives in the per-type bottom panel, which is
// keyed to the ONE real structural element's shared materials) — see build_render2.py's bodyFor,
// which shows a plain "frozen copy" note instead of the type's real controls when
// userData.isGenericCopy is set.
const FREEFORM_TYPES = ['bucket','thermo','accent','down','stool'];
const FREEFORM_CREATORS = {
  bucket: (x,y,z,label) => { addedBucketCount++; return createBucket(x, z, y, label, true); },
  thermo: (x,y,z,label) => { addedThermoCount++; return createThermo(x, y, label, true); },
  accent: (x,y,z,label) => { addedAccentCount++; return createAccent(x, y, label, true); },
  down:   (x,y,z,label) => { addedDownlightCount++; return createDownlight(x, z, label, true); },
  stool:  (x,y,z,label) => { addedStoolCount++; return createStool(x, z, y, label, true); },
};
// Copy is denied only for the true whole-envelope groupings — duplicating "the entire building
// shell" or "the entire floor slab" isn't a meaningful "copy this element" action the way duplicating
// a door or a bench run is. Everything else (including door/heater/window/landing/floorhole/rails/
// stairs/individual bench runs) is real and copyable now.
// UPDATE (2026-07-30, direct report: "why cant i copy and paste or move or make more of the sauna
// floor boards?"): 'floordeck' was originally lumped in with walls/floor on the assumption it was
// part of the fixed envelope, but it isn't — it's a modular grid of 4x3 (48"x36") tile boards, built
// fresh by buildFloorDeck() the same way a bench run or rail wrap is, just laid out as one group.
// There's no structural reason it can't be copied and moved as a unit, so it's been pulled off this
// list. The single "real" deck still auto-fills the room and follows the heater cutout as before;
// Copy makes an independent, freely posable duplicate of the whole tile grid.
const NO_COPY_TYPES = ['walls', 'floor'];
const ROOM_Y_MAX = Math.max(BACK_H, FRONT_H);
function clamp(v,lo,hi){ return Math.min(hi, Math.max(lo, v)); }
function isFreeformEntry(e){
  return !!(e && !e.deleted && e.objects[0] && (FREEFORM_TYPES.indexOf(e.type) !== -1 || e.objects[0].userData.isGenericCopy));
}
window.isFreeform = function(index){
  return isFreeformEntry(editables[index]);
};
window.isCopyable = function(index){
  const e = editables[index];
  return !!(e && !e.deleted && e.objects[0] && NO_COPY_TYPES.indexOf(e.type) === -1);
};
function syncPairedLight(o){
  if(!o.userData.pairedLight) return;
  const light = o.userData.pairedLight;
  if(o.userData.pairedLightOffset) light.position.copy(o.position).add(o.userData.pairedLightOffset);
  else light.position.copy(o.position);
  // Downlights are real SpotLights now (IES-profiled) — keep the aim target directly under the
  // fixture as it's dragged, so it always shines straight down instead of the cone staying pinned
  // at its original spot.
  if(light.userData.isDownSpot && light.target){
    light.target.position.set(light.position.x, light.position.y-1.5, light.position.z);
  }
}
window.getEditableTransform = function(index){
  const e = editables[index];
  if(!e || e.deleted || !e.objects[0]) return null;
  const o = e.objects[0];
  return {
    index, type: e.type, label: e.label, freeform: isFreeformEntry(e),
    x: o.position.x, y: o.position.y, z: o.position.z,
    rotYDeg: (o.rotation.y * 180/Math.PI + 360) % 360,
    scaleH: o.userData.scaleH != null ? o.userData.scaleH : 1,
    scaleV: o.userData.scaleV != null ? o.userData.scaleV : 1,
    yLocked: e.type === 'down', // ceiling fixtures stay flush-mounted; y is computed, not free
  };
};
// field: 'x' | 'y' | 'z' | 'rotYDeg' | 'scaleH' | 'scaleV'
window.setEditableTransform = function(index, field, value){
  const e = editables[index];
  if(!e || e.deleted || !e.objects[0] || !isFreeformEntry(e)) return false;
  const o = e.objects[0];
  const v = parseFloat(value);
  if(Number.isNaN(v)) return false;
  if(field === 'x') o.position.x = clamp(v, 0, WIDTH);
  else if(field === 'z') o.position.z = clamp(v, 0, DEPTH);
  else if(field === 'y'){
    if(e.type === 'down') return false; // ceiling-flush fixtures: y follows the ceiling, not manual
    o.position.y = clamp(v, 0, ROOM_Y_MAX);
  }
  else if(field === 'rotYDeg') o.rotation.y = (((v % 360) + 360) % 360) * Math.PI/180;
  else if(field === 'scaleH'){ const s = clamp(v, 0.4, 2.5); o.userData.scaleH = s; o.scale.x = s; o.scale.z = s; }
  else if(field === 'scaleV'){ const s = clamp(v, 0.4, 2.5); o.userData.scaleV = s; o.scale.y = s; }
  else return false;
  // Ceiling downlights stay flush to the (possibly sloped) ceiling as they're dragged around it.
  if(e.type === 'down' && (field === 'x' || field === 'z')){
    o.position.y = ceilingYAt(o.position.x, o.position.z) - 0.03;
  }
  syncPairedLight(o);
  return true;
};
// Rotate by a fixed increment (used by the toolbar's free/10°-snap toggle).
window.nudgeEditableRotation = function(index, deltaDeg){
  const t = window.getEditableTransform(index);
  if(!t || !t.freeform) return false;
  return window.setEditableTransform(index, 'rotYDeg', t.rotYDeg + deltaDeg);
};
// Generic deep-clone copy — see the BUG FIX note above NO_COPY_TYPES for why this exists. Works for
// ANY entry, including ones made of several independent top-level pieces (a bench run, a rail
// wrap), not just a single group: every piece gets deep-cloned and re-parented into one new wrapper
// group, each rebased relative to the ORIGINAL's own bounding-box center so the wrapper's own
// .position is a single meaningful "where is this copy" value (and rotate/scale below pivot around
// that same center, not some arbitrary room corner) — same generic x/y/z/rotate/scale contract the
// FREEFORM_TYPES creators already give the toolbar. Materials/geometry are shared with the
// original by default (a visual snapshot, not a resource-heavy full duplication) — see the
// isGenericCopy comment above FREEFORM_TYPES for the real tradeoff this makes.
function genericCopyEntry(e){
  const b = boundsCenterAndSize(e.objects);
  if(!b) return null;
  const wrapper = new THREE.Group();
  e.objects.forEach(o=>{
    if(!o) return;
    // THREE's Object3D.copy() (which .clone() calls under the hood) JSON-round-trips userData —
    // and registerEditable gives every registered object a userData.editableRef that points BACK
    // to an entry whose own .objects array includes this SAME object: a real circular reference
    // that blew the call stack the first time this ran (JSON.stringify <-> toJSON looping forever)
    // before this fix. Strip it right before cloning, restore it on the ORIGINAL right after — the
    // clone gets its own fresh editableRef from registerEditable below, same as every other
    // registered object, so nothing is lost.
    const savedRef = o.userData.editableRef;
    delete o.userData.editableRef;
    const clone = o.clone(true);
    o.userData.editableRef = savedRef;
    clone.position.sub(b.center);
    wrapper.add(clone);
  });
  wrapper.position.copy(b.center);
  wrapper.position.x = clamp(wrapper.position.x + 0.9, 0, WIDTH);
  wrapper.position.z = clamp(wrapper.position.z, 0, DEPTH);
  wrapper.userData.isGenericCopy = true;
  // Also flagged isAdded (same flag the FREEFORM_TYPES copies use) so the existing
  // wasAdded/deletedIndices exclusion logic already covers generic copies too — deleting one
  // shouldn't grow the save file's deletedIndices list, since addedGenericCopies above already
  // only ever exports whatever copies are actually still alive at save time.
  wrapper.userData.isAdded = true;
  wrapper.userData.scaleH = 1;
  wrapper.userData.scaleV = 1;
  room.add(wrapper);
  const label = e.label.replace(/\s*\(copy.*\)$/,'') + ' (copy)';
  return registerEditable([wrapper], e.type, label);
}
// Copy/paste — global to every element (2026-07-30; used to be limited to FREEFORM_TYPES only).
// FREEFORM_TYPES keep their existing dedicated creator (a real, independently-built new instance —
// e.g. a fresh bucket with its own geometry, not a clone); everything else (door, heater, window,
// bench runs, rails, stairs, landing, floor cutout, ...) now gets a generic deep-clone copy via
// genericCopyEntry. NO_COPY_TYPES (walls/floor) are the only remaining "no, not this" — see the
// comment above that list for why.
window.copyEditable = function(index){
  const e = editables[index];
  if(!e || e.deleted || !e.objects[0]) return null;
  if(NO_COPY_TYPES.indexOf(e.type) !== -1) return null;
  const creator = FREEFORM_CREATORS[e.type];
  if(creator){
    const o = e.objects[0];
    const nx = clamp(o.position.x + 0.7, 0, WIDTH);
    const nz = clamp(o.position.z + (e.type === 'down' ? 0.7 : 0), 0, DEPTH);
    const label = e.label.replace(/\s*\(copy.*\)$/,'') + ' (copy)';
    const newEntry = creator(nx, o.position.y, nz, label);
    if(!newEntry) return null;
    const no = newEntry.objects[0];
    no.rotation.y = o.rotation.y;
    if(o.userData.scaleH != null) window.setEditableTransform(newEntry.index, 'scaleH', o.userData.scaleH);
    if(o.userData.scaleV != null) window.setEditableTransform(newEntry.index, 'scaleV', o.userData.scaleV);
    // Carry over any per-instance tone override (see window.setFreeformTone below) so a re-tinted
    // piece's copy starts out matching it instead of silently reverting to the default wood color.
    if(o.userData.toneMat && no.userData.toneMat) no.userData.toneMat.color.copy(o.userData.toneMat.color);
    return newEntry.index;
  }
  const newEntry = genericCopyEntry(e);
  return newEntry ? newEntry.index : null;
};
// Per-instance color override for freeform pieces that stash a `toneMat` reference on their group
// (currently: bucket — see createBucket above). Generic/reusable: any future freeform creator that
// sets `group.userData.toneMat = someMaterial` picks this up automatically, one piece at a time,
// instead of the old pattern where a handful of fixture types only had ONE shared material recolored
// for every copy at once (real gap behind the "no color/texture control" report for pieces like the
// bucket, which had no swatch at all before this).
window.setFreeformTone = function(index, hex){
  const e = editables[index];
  if(!e || e.deleted || !e.objects[0]) return false;
  const mat = e.objects[0].userData.toneMat;
  if(!mat) return false;
  mat.color.set(hex);
  return true;
};
// Rename — per-instance label override, freeform pieces only (structural elements' labels are
// regenerated on every rebuild — e.g. a bench run's wall side — so a manual rename there wouldn't
// stick; this is scoped to the same freeform set the copy/delete/move toolbar covers, which now
// includes generic copies of structural types too — a COPY's label is static, not regenerated).
window.renameEditable = function(index, newLabel){
  const e = editables[index];
  if(!isFreeformEntry(e)) return false;
  const trimmed = (newLabel || '').trim().slice(0, 60);
  if(!trimmed) return false;
  e.label = trimmed;
  return true;
};

// ---------- Design-state save/load (sidebar "Versions" tab) ----------
// Reads back every live, currently-adjustable parameter (materials, lighting, door/heater/
// window/front-glass overrides, view mode) into one plain JSON-safe object, and can replay it
// by calling the exact same window.set___ functions the UI controls already use — so loading a
// version can't drift out of sync with what a control actually does.
window.getDesignState = function(){
  return {
    v: 1,
    scheme: schemeIndex,
    lightState: JSON.parse(JSON.stringify(lightState)),
    ledColor: ledLights[0] ? '#'+ledLights[0].color.getHexString() : null,
    valanceColor: valanceLedLights[0] ? '#'+valanceLedLights[0].color.getHexString() : null,
    ambientColor: '#'+ambientLight.color.getHexString(),
    downColor: downLights[0] ? '#'+downLights[0].color.getHexString() : null,
    starsColor: starMaterials[0] ? '#'+starMaterials[0].color.getHexString() : null,
    wallsTone: '#'+woodWall.color.getHexString(),
    wallTransparency: wallOutsideOpacity,
    floorTone: '#'+floorMat.color.getHexString(),
    benchTone: '#'+benchMat.color.getHexString(),
    door: {
      style: doorGlassExtent, // 'solid' | 'half' | 'twoThirds'
      tone: '#'+doorMat.color.getHexString(),
      posX: doorGroup.position.x,
      heightIn: (doorGroup.position.y - doorH/2) * 12, // absolute sill height off the floor, inches
      transparency: doorOutsideOpacity,
      widthFt: doorW, panelHeightFt: doorH, // real size now (2026-07-30) — was fixed at 24"x72"; see setDoorWidth/setDoorHeight
    },
    heater: {
      model: window.getHeaterModel ? window.getHeaterModel() : 'mini9',
      guardTone: heaterGuardMatRef ? '#'+heaterGuardMatRef.color.getHexString() : null,
      posX: heaterGroup.position.x, posZ: heaterGroup.position.z,
      guardH: GUARD_H, guardThick: GUARD_SLAT_H, guardGap: GUARD_GAP, guardCount: GUARD_COUNT,
    },
    window: { glass: currentWindowGlassType, w: WIN_W, h: WIN_H, z: WIN_Z, y: WIN_Y },
    landing: { w: LANDING_W, d: LANDING_D },
    floorHole: { x: HOLE_X, z: HOLE_Z, w: HOLE_W, d: HOLE_D },
    deckStair: {
      orientation: deckStairOrientation, dir: (deckStairDir === -1 ? 'left' : 'right'),
      riserH: stairRiserH, treadDepth: stairTreadDepth,
      landingDepth: stairLandingDepth, landingWidth: stairLandingWidth,
      startOffset: stairStartOffset, deckH: DECK_H,
    },
    bench: {
      runA: { offset: runA_offset, length: runA_length },
      runB: { wall: runB_wall, offset: runB_offset, length: runB_length },
    },
    bucket: { x: bucketGroup.position.x, z: bucketGroup.position.z }, // legacy fields, kept for old saved versions
    accentColor: accentMat ? '#'+accentMat.color.getHexString() : null,
    thermoTone: thermoMatRef ? '#'+thermoMatRef.color.getHexString() : null,
    extSlats: { width: EXT_SLAT_W, gap: EXT_SLAT_GAP, standoff: EXT_SLAT_STANDOFF },
    // 'ensuite' field intentionally removed (2026-07-29 cleanup — placeholder feature deleted);
    // applyDesignState below just ignores that block if an old saved JSON still has one.
    // railStandoff/railBlockPitch/railWalls are SHARED by all 3 wood wall rails (the LED light
    // rail + both plain backrest rails) — one set of numbers, not three independent ones.
    railStandoff: RAIL_STANDOFF, railBlockPitch: RAIL_BLOCK_PITCH, railWalls: Object.assign({}, RAIL_WALLS),
    valanceAutoRotate: valanceAutoRotateOn,
    fakeValance: { lowerOffset: FAKE_LOWER_OFFSET, length: FAKE_VALANCE_LENGTH_FRAC }, // upperOffset removed — now derived, see setFakeValanceGeometry
    notes: JSON.parse(JSON.stringify(elementNotes)),
    // Full freeform transform (position/rotation/scale) for the four "default" single-instance
    // loose fixtures — supersedes the legacy `bucket:{x,z}` above (that's kept only so a version
    // saved before this pass still loads). Stool wasn't previously saveable at all.
    fixtureTransforms: {
      bucket: window.getEditableTransform(bucketEntry0.index),
      thermo: window.getEditableTransform(thermoEntry0.index),
      accent: window.getEditableTransform(accentEntry0.index),
      stool:  window.getEditableTransform(stoolEntry0.index),
    },
    // User-added COPIES of any freeform fixture type (via the toolbar's Copy), generalizing the
    // downlight-only mechanism this used to be limited to.
    addedDownlights: downFixtureMeshes.filter(f=>f.userData.isAdded).map(f=>({
      x: f.position.x, z: f.position.z, label: f.userData.editableRef ? f.userData.editableRef.label : 'Downlight — Added'
    })),
    addedFixtures: editables.filter(e=>!e.deleted && e.objects[0] && e.objects[0].userData.isAdded && e.type!=='down' && !e.objects[0].userData.isGenericCopy).map(e=>{
      const t = window.getEditableTransform(e.index);
      // Deliberately NOT spreading all of `t` — `index` is this session's live array position and
      // is meaningless once the fixture is recreated on load (it lands at a new index), so persist
      // only the actual reconstructable fields.
      return { type: e.type, label: e.label, x: t.x, y: t.y, z: t.z, rotYDeg: t.rotYDeg, scaleH: t.scaleH, scaleV: t.scaleV };
    }),
    // Generic copies (2026-07-30 — see the global-copy BUG FIX note above NO_COPY_TYPES) of any
    // OTHER type: door/heater/window/bench/rail/stairs/landing/etc. Reconstructed on load by
    // re-cloning whatever the CURRENT primary (non-copy) element of that type looks like at that
    // point in the load sequence, then replaying the saved transform — see applyDesignState below.
    addedGenericCopies: editables.filter(e=>!e.deleted && e.objects[0] && e.objects[0].userData.isGenericCopy).map(e=>{
      const t = window.getEditableTransform(e.index);
      return { type: e.type, label: e.label, x: t.x, y: t.y, z: t.z, rotYDeg: t.rotYDeg, scaleH: t.scaleH, scaleV: t.scaleV };
    }),
    // Bench/LED entries get invalidated-and-re-registered on every bench-run rebuild (slide/trim/
    // wall-reassign), and added fixture copies get cleared-and-recreated on every load (see
    // addedFixtures/addedDownlights above) — both are internal churn, not a user deletion, so both
    // are excluded here (otherwise a session with a lot of slider-dragging, or any save/load cycle
    // with copies present, would save/export an ever-growing, meaningless deletedIndices list).
    deletedIndices: editables.filter(e=>e.deleted && e.type!=='bench' && e.type!=='led' && !e.wasAdded).map(e=>e.index),
    topMode, measurementsOn: measureGroup.visible, wallLabelsOn: wallLabelGroup.visible,
  };
};
window.applyDesignState = function(s){
  if(!s) return;
  try{
    if(typeof s.scheme === 'number') applyScheme(s.scheme);
    if(s.lightState){ Object.assign(lightState, s.lightState); applyLightLevels(); }
    if(s.ledColor) window.setLedColor(s.ledColor);
    if(s.valanceColor) window.setValanceLedColor(s.valanceColor);
    if(s.extSlats){
      if(s.extSlats.width!=null) window.setExtSlatGeometry('width', s.extSlats.width);
      if(s.extSlats.gap!=null) window.setExtSlatGeometry('gap', s.extSlats.gap);
      if(s.extSlats.standoff!=null) window.setExtSlatGeometry('standoff', s.extSlats.standoff);
    }
    // s.ensuite (old saved-state field) intentionally ignored — placeholder feature deleted.
    if(s.railStandoff!=null) window.setRailGeometry('standoff', s.railStandoff);
    if(s.railBlockPitch!=null) window.setRailGeometry('blockPitch', s.railBlockPitch);
    if(s.railWalls){
      Object.keys(s.railWalls).forEach(k=> window.toggleRailWall(k, s.railWalls[k]));
    }
    if(s.valanceAutoRotate!=null) window.setValanceAutoRotate(s.valanceAutoRotate);
    if(s.fakeValance){
      if(s.fakeValance.upperOffset!=null) window.setFakeValanceGeometry('upperOffset', s.fakeValance.upperOffset);
      if(s.fakeValance.lowerOffset!=null) window.setFakeValanceGeometry('lowerOffset', s.fakeValance.lowerOffset);
      if(s.fakeValance.length!=null) window.setFakeValanceGeometry('length', s.fakeValance.length);
    }
    if(s.ambientColor) window.setAmbientColor(s.ambientColor);
    if(s.downColor) window.setDownColor(s.downColor);
    if(s.starsColor) window.setStarsColor(s.starsColor);
    if(s.wallsTone) window.setSurfaceTone('walls', s.wallsTone);
    if(s.wallTransparency!=null) window.setWallTransparency(s.wallTransparency);
    if(s.floorTone) window.setSurfaceTone('floor', s.floorTone);
    if(s.benchTone) window.setSurfaceTone('bench', s.benchTone);
    if(s.bench){
      // Applied before door/heater below — their position clamps read the return leg's current
      // wall (runB_wall), so the bench layout has to land first or a saved SW2 layout would
      // briefly get clamped against the (still-default) SW1 assumption before catching up.
      if(s.bench.runB && s.bench.runB.wall) window.setBenchRun('B', 'wall', s.bench.runB.wall);
      if(s.bench.runA){
        if(s.bench.runA.length!=null) window.setBenchRun('A', 'length', s.bench.runA.length);
        if(s.bench.runA.offset!=null) window.setBenchRun('A', 'offset', s.bench.runA.offset);
      }
      if(s.bench.runB){
        if(s.bench.runB.length!=null) window.setBenchRun('B', 'length', s.bench.runB.length);
        if(s.bench.runB.offset!=null) window.setBenchRun('B', 'offset', s.bench.runB.offset);
      }
    }
    if(s.door){
      if(s.door.style) window.setDoorStyle(s.door.style);
      if(s.door.tone) window.setDoorTone(s.door.tone);
      // Width/height applied BEFORE position/sill height below: both real setters (2026-07-30)
      // re-clamp the door's position and sill height as a safety net when the size changes, and
      // the explicit posX/heightIn from the saved state should be what actually wins once loading
      // is done, not whatever that safety-net re-clamp left it at mid-load.
      if(s.door.widthFt!=null) window.setDoorWidth(s.door.widthFt);
      if(s.door.panelHeightFt!=null) window.setDoorHeight(s.door.panelHeightFt);
      // s.door.scaleX/scaleY (old field names, from back when these were no-ops) intentionally
      // ignored now — same backward-compat pattern as the old removed 'frontGlass' field: no saved
      // state ever had a meaningful value there since the setters never did anything with it.
      if(s.door.posX!=null) window.setDoorPosition(s.door.posX);
      if(s.door.heightIn!=null) window.setDoorHeightAboveFloor(s.door.heightIn);
      if(s.door.transparency!=null) window.setDoorTransparency(s.door.transparency);
    }
    if(s.heater){
      if(s.heater.model) window.setHeaterModel(s.heater.model);
      if(s.heater.style) window.setHeaterStyle(s.heater.style); // legacy field — harmless no-op now
      if(s.heater.guardTone) window.setHeaterGuardTone(s.heater.guardTone);
      if(s.heater.guardH!=null) window.setHeaterGuardGeometry('h', s.heater.guardH);
      if(s.heater.guardThick!=null) window.setHeaterGuardGeometry('thick', s.heater.guardThick);
      if(s.heater.guardGap!=null) window.setHeaterGuardGeometry('gap', s.heater.guardGap);
      if(s.heater.guardCount!=null) window.setHeaterGuardGeometry('count', s.heater.guardCount);
      if(s.heater.posX!=null) window.setHeaterPosition('x', s.heater.posX); // now an absolute room x, not an offset
      if(s.heater.posZ!=null) window.setHeaterPosition('z', -s.heater.posZ);
      if(s.heater.scale!=null) window.setHeaterScale(s.heater.scale); // legacy field — harmless no-op now
    }
    if(s.window){
      if(s.window.w!=null) window.setWindowGeometry('w', s.window.w);
      if(s.window.h!=null) window.setWindowGeometry('h', s.window.h);
      if(s.window.z!=null) window.setWindowGeometry('z', s.window.z);
      if(s.window.y!=null) window.setWindowGeometry('y', s.window.y);
      if(s.window.glass) window.setWindowGlass(s.window.glass);
    }
    // s.frontGlass (the deleted SW2 "tank window") is deliberately not handled — an older saved/
    // exported version that still has this field just has it silently ignored on import, same as
    // the old 'circular' door-style value elsewhere in this file, rather than throwing.
    if(s.landing){
      if(s.landing.w!=null) window.setLandingSize('w', s.landing.w);
      if(s.landing.d!=null) window.setLandingSize('d', s.landing.d);
    }
    if(s.floorHole){
      // Size first, then position — setFloorHoleGeometry reclamps position against the CURRENT
      // width/depth each call, so landing on the right size before restoring position avoids a
      // saved (x,z) getting silently pulled in by a still-default (w,d).
      if(s.floorHole.w!=null) window.setFloorHoleGeometry('w', s.floorHole.w);
      if(s.floorHole.d!=null) window.setFloorHoleGeometry('d', s.floorHole.d);
      if(s.floorHole.x!=null) window.setFloorHoleGeometry('x', s.floorHole.x);
      if(s.floorHole.z!=null) window.setFloorHoleGeometry('z', s.floorHole.z);
    }
    if(s.deckStair){
      if(s.deckStair.riserH!=null) window.setStairGeometry('riserH', s.deckStair.riserH);
      if(s.deckStair.treadDepth!=null) window.setStairGeometry('treadDepth', s.deckStair.treadDepth);
      if(s.deckStair.landingDepth!=null) window.setStairGeometry('landingDepth', s.deckStair.landingDepth);
      if(s.deckStair.landingWidth!=null) window.setStairGeometry('landingWidth', s.deckStair.landingWidth);
      if(s.deckStair.startOffset!=null) window.setStairGeometry('startOffset', s.deckStair.startOffset);
      if(s.deckStair.deckH!=null) window.setStairGeometry('deckH', s.deckStair.deckH);
      if(s.deckStair.dir) window.setDeckStairSide(s.deckStair.dir);
      if(s.deckStair.orientation) window.setDeckStairOrientation(s.deckStair.orientation);
    }
    if(s.fixtureTransforms){
      // Preferred path: full freeform transform for each default fixture instance.
      const applyT = (entry, t) => {
        if(!entry || !t) return;
        ['x','y','z','rotYDeg','scaleH','scaleV'].forEach(f=>{ if(t[f]!=null) window.setEditableTransform(entry.index, f, t[f]); });
      };
      applyT(bucketEntry0, s.fixtureTransforms.bucket);
      applyT(thermoEntry0, s.fixtureTransforms.thermo);
      applyT(accentEntry0, s.fixtureTransforms.accent);
      applyT(stoolEntry0, s.fixtureTransforms.stool);
    } else if(s.bucket){
      // Legacy fallback for versions saved before fixtureTransforms existed.
      if(s.bucket.x!=null) window.setBucketPosition('x', s.bucket.x - BUCKET_X_DEFAULT);
      if(s.bucket.z!=null) window.setBucketPosition('z', s.bucket.z);
    }
    if(s.accentColor) window.setAccentColor(s.accentColor);
    if(s.thermoTone) window.setThermoTone(s.thermoTone);
    if(s.notes){ Object.keys(s.notes).forEach(k=>{ elementNotes[k] = normalizeNote(s.notes[k]); }); }
    if(Array.isArray(s.addedDownlights)){
      // Clear any already-added downlights from the current live session first — otherwise
      // loading a version twice (or loading one after manually adding some) would double them up.
      editables.forEach(e=>{
        if(e.deleted || e.type !== 'down') return;
        const obj = e.objects[0];
        if(obj && obj.userData && obj.userData.isAdded) window.deleteEditable(e.index);
      });
      s.addedDownlights.forEach(d=>{
        addedDownlightCount++;
        createDownlight(d.x, d.z, d.label || ('Downlight — Added #'+addedDownlightCount), true);
      });
    }
    if(Array.isArray(s.addedFixtures)){
      // Same clear-then-recreate pattern as addedDownlights above, generalized to bucket/thermo/
      // accent/stool copies made via the toolbar's Copy button. Generic copies (isGenericCopy) are
      // deliberately excluded here — they're a separate list (addedGenericCopies below) with their
      // own clear-then-recreate pass, even though both share the isAdded flag.
      editables.forEach(e=>{
        if(e.deleted || e.type === 'down') return;
        const obj = e.objects[0];
        if(obj && obj.userData && obj.userData.isAdded && !obj.userData.isGenericCopy) window.deleteEditable(e.index);
      });
      s.addedFixtures.forEach(f=>{
        const creator = FREEFORM_CREATORS[f.type];
        if(!creator) return;
        const newEntry = creator(f.x, f.y, f.z, f.label);
        if(!newEntry) return;
        ['rotYDeg','scaleH','scaleV'].forEach(field=>{ if(f[field]!=null) window.setEditableTransform(newEntry.index, field, f[field]); });
      });
    }
    if(Array.isArray(s.addedGenericCopies)){
      // Same clear-then-recreate pattern as addedFixtures above. Each copy is reconstructed by
      // re-cloning whatever the CURRENT primary (non-copy) element of that type looks like right
      // now — which is correct precisely because this runs near the end of load, after door/
      // heater/window/bench/etc state above has already been applied, so the clone matches the
      // saved version's actual look, not whatever the default/previous session state was.
      editables.forEach(e=>{
        if(e.deleted || !e.objects[0] || !e.objects[0].userData.isGenericCopy) return;
        window.deleteEditable(e.index);
      });
      s.addedGenericCopies.forEach(f=>{
        const primary = editables.find(e=> !e.deleted && e.type === f.type && e.objects[0] && !e.objects[0].userData.isGenericCopy);
        if(!primary) return;
        const newEntry = genericCopyEntry(primary);
        if(!newEntry) return;
        if(f.label) newEntry.label = f.label;
        ['x','y','z','rotYDeg','scaleH','scaleV'].forEach(field=>{ if(f[field]!=null) window.setEditableTransform(newEntry.index, field, f[field]); });
      });
    }
    if(Array.isArray(s.deletedIndices)){
      s.deletedIndices.forEach(i=> window.deleteEditable(i));
    }
    if(typeof s.topMode === 'boolean') setTopView(s.topMode);
    if(typeof s.measurementsOn === 'boolean') window.toggleMeasurements(s.measurementsOn);
    if(typeof s.wallLabelsOn === 'boolean') window.toggleWallLabels(s.wallLabelsOn);
    return true;
  } catch(err){
    console.error('applyDesignState failed', err);
    return false;
  }
};

applyScheme(0);

// ---------- Camera: dollhouse orbit (outside) + true first-person walkthrough (inside) ----------
// Default outside "dollhouse" framing now looks in from the DOOR side (LW1, z=0) instead of the
// old default (LW2, z=DEPTH) — target.z biased toward the door, and theta
// flipped (Math.PI*0.75, was 0.25) so the z-offset sign reverses and the camera sits beyond z=0
// instead of beyond z=DEPTH. Because the camera now faces the opposite direction, the short walls
// swap screen sides too: SW1 (bench-return wall, x=WIDTH — the old "right wall") now reads on
// the LEFT, and SW2 (door-adjacent wall, x=0 — the old "left wall") now reads on the RIGHT.
const VIEW_OUTSIDE = {target:new THREE.Vector3(WIDTH/2, 2.6, DEPTH*0.45), radius:14.5, theta:Math.PI*0.75, phi:Math.PI*0.34};

const target = VIEW_OUTSIDE.target.clone();
let radius = VIEW_OUTSIDE.radius, theta = VIEW_OUTSIDE.theta, phi = VIEW_OUTSIDE.phi;
let autoRotate = true;
// insideMode itself now declared much earlier (see near lw1IsOpen/RAIL_LW1_CLEAR above) — moved
// there because the very first buildValanceGroup()/buildFakeValanceGroup() call at initial script
// load happens before this point in the file, and referencing a `let` before its declaration line
// has run throws "Cannot access before initialization" even through a typeof guard (a real bug,
// caught via Playwright: the whole app failed to load). Left this comment as a breadcrumb.

// ---------- Top (bird's-eye plan) view ----------
// Reuses the single existing camera rather than swapping cameras in the render pipeline —
// just repositions it high above room-center looking straight down, with an explicit up
// vector (0,0,-1) so it doesn't hit the gimbal-lock singularity of a default (0,1,0) up
// when the look direction is parallel to it. Door/back wall (z=0) reads at the top of the
// screen, front/heater wall (z=DEPTH) at the bottom — a natural architectural plan layout.
let topMode = false;
const ROOM_SPAN = Math.max(WIDTH, DEPTH);
// A construction plan view needs to read close to flat/orthographic, not like a perspective
// shot looking down into a dollhouse — walls "lean" and foreshorten badly at a wide FOV from
// a modest height. Rather than add a second (orthographic) camera and have to keep the
// composer's RenderPass and the click-to-edit raycaster in sync with two cameras, top mode
// narrows this same camera's FOV and backs it off proportionally — same object throughout,
// near-orthographic result.
const TOP_FOV = 20;
const NORMAL_FOV = camera.fov;
const topFovHalfTan = Math.tan((TOP_FOV * Math.PI/180)/2);
const TOP_HEIGHT_MIN = (ROOM_SPAN / (2*topFovHalfTan)) * 0.8;
const TOP_HEIGHT_MAX = 85; // stay comfortably under the camera's far plane (100)
const TOP_HEIGHT_DEFAULT = (ROOM_SPAN / (2*topFovHalfTan)) * 1.3;
let topHeight = TOP_HEIGHT_DEFAULT;
let preTopInsideMode = false; // remembers inside/outside so leaving top view restores it

// First-person state: a real position INSIDE the room that a look-around camera pivots from,
// clamped so it can never pass through a wall — no floating outside looking back through it.
// Three calibrated eye heights for a ~5'10" person: standing, seated on the low bench, seated
// on the high bench — since "generally it will be a seated position" is the primary use case.
const EYE_STANDING = 5.42;
const EYE_SEATED_LOW = SEAT_LOW + 2.55;
const EYE_SEATED_HIGH = SEAT_HIGH + 2.55;
const WALL_MARGIN = 0.85;          // how close the eye can get to a wall before it's clamped
let eyeMode = 'standing';
const insidePos = new THREE.Vector3(WIDTH/2, EYE_STANDING, 1.3); // just inside the door, facing in
let lookYaw = 0, lookPitch = -0.04;
function eyeHeightFor(mode){
  if(mode==='seatedLow') return EYE_SEATED_LOW;
  if(mode==='seatedHigh') return EYE_SEATED_HIGH;
  return EYE_STANDING;
}
// Every standing/seated preset aims at the heater by default (the room's actual focal point)
// instead of a fixed yaw/pitch — computed live off the heater's real position, so it stays
// correct even after using the click-to-edit heater-position sliders. Was previously a flat
// yaw:0/pitch:-0.04 for "entry", which — this close to the wall, at standing eye height —
// framed nothing but blank plank texture (the heater sits low, well under eye-level sightline).
function aimAt(fromPos, atPos){
  const dx = atPos.x - fromPos.x, dy = atPos.y - fromPos.y, dz = atPos.z - fromPos.z;
  const horiz = Math.sqrt(dx*dx + dz*dz) || 0.0001;
  return { yaw: Math.atan2(dx, dz), pitch: Math.max(-1.25, Math.min(1.25, Math.atan2(dy, horiz))) };
}
function heaterAimPoint(){
  return new THREE.Vector3(heaterGroup.position.x, heaterH*0.65, heaterGroup.position.z);
}
const VIEW_POSITIONS = {
  // Phase 3 moved the L-shaped bench off the back wall onto the front wall — seated presets now
  // sit near z=DEPTH facing back toward -z (where the heater is now, on the back wall). aimAt()
  // recomputes the actual yaw/pitch toward the heater's live position below, so the yaw here is
  // just a reasonable starting default. "entry" is pushed further off the back wall than before
  // (was z:1.3) since the heater now sits on that SAME wall — right next to it, the old distance
  // made aimAt() pitch almost straight down at it instead of framing the room.
  entry:      {x: WIDTH/2,      z: 3.2,              eye:'standing',   yaw: 0,   pitch:-0.04},
  walk:       {x: WIDTH*0.35,   z: DEPTH*0.5,        eye:'standing',   yaw: 0.5, pitch:-0.02},
  seatedLow:  {x: WIDTH*0.42,   z: DEPTH-(FOOT_Z0+(LOW_DEPTH-FOOT_Z0)*0.55), eye:'seatedLow',  yaw: Math.PI, pitch: 0.02},
  seatedHigh: {x: WIDTH*0.42,   z: DEPTH-HIGH_DEPTH*0.55,  eye:'seatedHigh', yaw: Math.PI, pitch: 0.02},
};
// Return-leg (Run B) seated presets are computed live off the current runB_wall/offset/length
// instead of baked into VIEW_POSITIONS, since that run can be reassigned to either short wall
// and resized/repositioned live via the bench-run editor — a static position would go stale.
function returnBenchSeatPos(depthFrac){
  const bWallX = (typeof runB_wall === 'undefined' || runB_wall === 'SW1') ? WIDTH : 0;
  const bDir = (bWallX === WIDTH) ? -1 : 1;
  const bZ0 = (typeof runB_offset !== 'undefined') ? runB_offset : 0;
  const bLen = (typeof runB_length !== 'undefined') ? runB_length : DEPTH;
  return { x: bWallX + bDir*depthFrac, z: bZ0 + bLen*0.42 };
}
window.setViewPosition = function(name){
  let v = VIEW_POSITIONS[name];
  if(!v && name === 'seatedLowReturn'){
    const p = returnBenchSeatPos(FOOT_Z0+(LOW_DEPTH-FOOT_Z0)*0.55);
    v = { x:p.x, z:p.z, eye:'seatedLow', yaw:0, pitch:0.02 };
  }
  if(!v && name === 'seatedHighReturn'){
    const p = returnBenchSeatPos(HIGH_DEPTH*0.55);
    v = { x:p.x, z:p.z, eye:'seatedHigh', yaw:0, pitch:0.02 };
  }
  if(!v) return;
  if(!insideMode) setView(true);
  eyeMode = v.eye;
  insidePos.set(v.x, eyeHeightFor(v.eye), v.z);
  clampInsidePos(insidePos);
  const aim = aimAt(insidePos, heaterAimPoint());
  lookYaw = aim.yaw; lookPitch = aim.pitch;
  updateCamera();
  document.querySelectorAll('.posBtn').forEach(b=> b.classList.toggle('active', b.dataset.pos===name));
};

function clampInsidePos(p){
  p.x = Math.min(Math.max(p.x, WALL_MARGIN), WIDTH-WALL_MARGIN);
  p.z = Math.min(Math.max(p.z, WALL_MARGIN), DEPTH-WALL_MARGIN);
  const ceil = heightAt(p.z) - 0.6;
  p.y = Math.min(Math.max(p.y, 3.2), Math.max(3.2, ceil));
  return p;
}

function updateCamera(){
  if(topMode){
    camera.up.set(0,0,-1);
    camera.position.set(WIDTH/2, topHeight, DEPTH/2);
    camera.lookAt(WIDTH/2, 0, DEPTH/2);
  } else if(insideMode){
    camera.up.set(0,1,0);
    clampInsidePos(insidePos);
    camera.position.copy(insidePos);
    const p = Math.min(Math.max(lookPitch, -1.25), 1.25);
    const dir = new THREE.Vector3(Math.sin(lookYaw)*Math.cos(p), Math.sin(p), Math.cos(lookYaw)*Math.cos(p));
    camera.lookAt(insidePos.x+dir.x, insidePos.y+dir.y, insidePos.z+dir.z);
  } else {
    camera.up.set(0,1,0);
    camera.position.x = target.x + radius*Math.sin(phi)*Math.sin(theta);
    camera.position.y = target.y + radius*Math.cos(phi);
    camera.position.z = target.z + radius*Math.sin(phi)*Math.cos(theta);
    camera.lookAt(target);
  }
}
updateCamera();

function setView(inside){
  if(topMode) setTopView(false); // top view uses its own camera framing; exit it first
  insideMode = inside;
  autoRotate = false;
  // The back wall (LW1, the door's wall — now the designated FRONT of the build) used to just
  // vanish for the outside "dollhouse" cutaway view. Now it stays visible and goes translucent
  // instead (see wallOutsideOpacity/setWallTransparency above) — same live-adjustable pattern as
  // the door itself, right below. Forced fully solid the instant you step inside.
  backWall.visible = true;
  if(inside){ woodWall.opacity = 1; } else { applyWallOutsideOpacity(); }
  // The door lives on that same LW1 wall — go translucent (panel AND frame) right along with it
  // in the outside cutaway view so it doesn't block the sightline to the SW1 window/interior;
  // solid once you step inside, where it needs to read as a real door. Outside, it returns to
  // whatever level the transparency slider was last set to (doorOutsideOpacity), not a fixed value.
  if(inside){ doorMat.opacity = 1; doorFrameMat.opacity = 1; } else { applyDoorOutsideOpacity(); }
  if(inside){
    eyeMode = 'standing';
    insidePos.set(WIDTH/2, EYE_STANDING, 1.3);
    clampInsidePos(insidePos);
    const aim = aimAt(insidePos, heaterAimPoint());
    lookYaw = aim.yaw; lookPitch = aim.pitch;
  }
  updateCamera();
  // Re-evaluate the SW1/SW2 rail corner trim (see railSWCornerClear/lw1IsOpen) — LW1 goes solid the
  // instant you step inside, so the rails should run flush to that corner; back outside, they
  // should pull back again. Rebuild both rail systems live on every inside/outside toggle.
  if(typeof buildValanceGroup === 'function') buildValanceGroup();
  if(typeof buildFakeValanceGroup === 'function') buildFakeValanceGroup();
  const btn = document.getElementById('viewBtn');
  if(btn) btn.textContent = insideMode ? 'Step Outside' : 'Step Inside';
  const posBar = document.getElementById('posBar');
  if(posBar) posBar.style.display = insideMode ? 'flex' : 'none';
  document.querySelectorAll('.posBtn').forEach(b=> b.classList.toggle('active', b.dataset.pos==='entry' && insideMode));
}
window.toggleView = function(){ setView(!insideMode); };

// Bird's-eye plan view — toggles independently of inside/outside, and restores whichever of
// those two the user was in when it exits. Hides the ceiling (and, if the door happens to be
// open toward the viewer, the front wall stays as-is since it reads edge-on from directly
// above and doesn't occlude anything).
function setTopView(on){
  if(on === topMode) { if(on) updateCamera(); return; }
  if(on){
    preTopInsideMode = insideMode;
    topMode = true;
    autoRotate = false;
    ceiling.visible = false;
    camera.fov = TOP_FOV;
    camera.updateProjectionMatrix();
    // The scene's atmospheric fog (tuned for ~15-32ft orbit distances) fully blacks out
    // anything at the 25-85ft camera distance a plan view needs — suspend it up here.
    scene.fog = null;
  } else {
    topMode = false;
    ceiling.visible = true;
    insideMode = preTopInsideMode;
    backWall.visible = true;
    if(insideMode){ doorMat.opacity = 1; doorFrameMat.opacity = 1; woodWall.opacity = 1; } else { applyDoorOutsideOpacity(); applyWallOutsideOpacity(); }
    camera.fov = NORMAL_FOV;
    camera.updateProjectionMatrix();
    scene.fog = sceneFog;
  }
  updateCamera();
  const btn = document.getElementById('topViewBtn');
  if(btn) btn.classList.toggle('active', topMode);
  const posBar = document.getElementById('posBar');
  if(posBar) posBar.style.display = (insideMode && !topMode) ? 'flex' : 'none';
}
window.toggleTopView = function(){ setTopView(!topMode); };

// Shared drag-to-look: orbit outside (around a target), true look-around in first-person inside.
function applyDrag(dx,dy){
  if(topMode){
    return; // straight-down plan view — dragging doesn't tilt/rotate it, only the wheel zooms
  } else if(insideMode){
    lookYaw -= dx*0.006;
    lookPitch = Math.min(Math.max(lookPitch - dy*0.006, -1.25), 1.25);
  } else {
    theta -= dx*0.006;
    phi = Math.min(Math.max(phi - dy*0.006, 0.12), Math.PI-0.08);
  }
  updateCamera();
}
// Wheel/pinch: zoom outside, walk forward/back along the view direction inside (still clamped
// to stay inside the walls by updateCamera's clampInsidePos on every frame), altitude in top view.
function applyDolly(delta){
  if(topMode){
    topHeight = Math.min(Math.max(topHeight + delta*0.02, TOP_HEIGHT_MIN), TOP_HEIGHT_MAX);
  } else if(insideMode){
    const p = Math.min(Math.max(lookPitch, -1.25), 1.25);
    const dir = new THREE.Vector3(Math.sin(lookYaw)*Math.cos(p), 0, Math.cos(lookYaw)*Math.cos(p));
    insidePos.addScaledVector(dir, -delta*0.012);
    clampInsidePos(insidePos);
  } else {
    const min = 4, max = 50;
    radius = Math.min(Math.max(radius + delta*0.01, min), max);
  }
  updateCamera();
}

let dragging=false, lastX=0, lastY=0;
let mouseDownPos=null;
renderer.domElement.addEventListener('mousedown', e=>{dragging=true; autoRotate=false; lastX=e.clientX; lastY=e.clientY; mouseDownPos={x:e.clientX,y:e.clientY};});
window.addEventListener('mouseup', e=>{
  dragging=false;
  if(mouseDownPos){
    const dx=e.clientX-mouseDownPos.x, dy=e.clientY-mouseDownPos.y;
    if(Math.sqrt(dx*dx+dy*dy) < 5 && e.target === renderer.domElement){
      handleEditClick(e.clientX, e.clientY);
    }
  }
  mouseDownPos=null;
});
window.addEventListener('mousemove', e=>{
  if(!dragging) return;
  applyDrag(e.clientX-lastX, e.clientY-lastY);
  lastX=e.clientX; lastY=e.clientY;
});
renderer.domElement.addEventListener('wheel', e=>{
  applyDolly(e.deltaY);
  e.preventDefault();
}, {passive:false});

let touchLastX=0, touchLastY=0, touchDragging=false;
let pinchStartDist=0, pinchStartRadius=0;
let touchStartX=0, touchStartY=0, touchMoved=false;
function touchDist(t){
  const dx=t[0].clientX-t[1].clientX, dy=t[0].clientY-t[1].clientY;
  return Math.sqrt(dx*dx+dy*dy);
}
renderer.domElement.addEventListener('touchstart', e=>{
  autoRotate = false;
  if(e.touches.length===1){
    touchDragging = true;
    touchLastX=e.touches[0].clientX; touchLastY=e.touches[0].clientY;
    touchStartX=touchLastX; touchStartY=touchLastY; touchMoved=false;
  } else if(e.touches.length===2){
    touchDragging = false;
    pinchStartDist = touchDist(e.touches);
    pinchStartRadius = radius;
  }
}, {passive:false});
renderer.domElement.addEventListener('touchend', e=>{
  if(e.touches.length===0 && !touchMoved){
    handleEditClick(touchLastX, touchLastY);
  }
  touchDragging = e.touches.length===1;
  if(e.touches.length===1){ touchLastX=e.touches[0].clientX; touchLastY=e.touches[0].clientY; }
});
renderer.domElement.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(e.touches.length===2){
    const dist = touchDist(e.touches);
    if(topMode || insideMode){
      applyDolly((dist - pinchStartDist) * -0.35);
    } else {
      const scale = pinchStartDist / Math.max(dist, 1);
      const min = 3.5, max = 50;
      radius = Math.min(Math.max(pinchStartRadius * scale, min), max);
      updateCamera();
    }
    return;
  }
  if(!touchDragging || e.touches.length!==1) return;
  if(Math.abs(e.touches[0].clientX-touchStartX) > 6 || Math.abs(e.touches[0].clientY-touchStartY) > 6) touchMoved = true;
  applyDrag(e.touches[0].clientX-touchLastX, e.touches[0].clientY-touchLastY);
  touchLastX=e.touches[0].clientX; touchLastY=e.touches[0].clientY;
  updateCamera();
}, {passive:false});

window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

let __lastFrameT = null;
function animate(tMs){
  requestAnimationFrame(animate);
  const dt = __lastFrameT!=null ? Math.min(0.1, (tMs-__lastFrameT)/1000) : 0.016;
  __lastFrameT = tMs;
  if(autoRotate){ theta += 0.0016; updateCamera(); }
  if(typeof tickValanceAutoRotate === 'function') tickValanceAutoRotate(dt);
  composer.render();
}
animate();

