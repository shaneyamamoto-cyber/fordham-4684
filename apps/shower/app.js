(function(){
"use strict";

/* ============================================================
   DIMENSIONS — 1 unit = 1 inch. Origin: back-left floor corner.
   +X right · +Y up · +Z front
   ============================================================ */
const W = 51.5, D = 48, H = 96;
const CURB_H = 4, CURB_D = 4.5;
const GLASS_TOP = 78, PANEL_W = 22, DOOR_GAP = 1.5, DOOR_W = 27.5;
const GLASS_Z = D - CURB_D/2;
const BENCH_NOSE = 0.75;
const SNAP = 0.25;

/* ============================================================
   TILE LIBRARY
   ============================================================ */
const COLLECTIONS = [
{id:'modern', name:'Modern',
 note:'Large-format porcelain in matte and satin. Cool neutrals through saturated darks — fewer grout lines, calmer walls.',
 colours:[
  {id:'bianco',   name:'Bianco Matte',  base:[236,234,229], vein:'stone', finish:'matte'},
  {id:'pearl',    name:'Pearl Grey',    base:[199,200,198], vein:'stone', finish:'matte'},
  {id:'mushroom', name:'Mushroom',      base:[190,180,167], vein:'stone', finish:'satin'},
  {id:'anthra',   name:'Anthracite',    base:[70,73,76],    vein:'stone', finish:'satin'},
  {id:'midnight', name:'Midnight Blue', base:[41,55,76],    vein:'none',  finish:'gloss'},
  {id:'forest',   name:'Forest',        base:[47,66,56],    vein:'none',  finish:'gloss'}
 ]},
{id:'natural', name:'Natural',
 note:'Stone-effect porcelain. Limestone, travertine, marble and slate — the warm mineral palette leading 2026.',
 colours:[
  {id:'limestone', name:'Limestone Alba',  base:[216,210,199], vein:'stone',      finish:'matte'},
  {id:'travertine',name:'Travertine Noce', base:[188,163,133], vein:'travertine', finish:'matte'},
  {id:'calacatta', name:'Calacatta',       base:[240,238,234], vein:'marble',     finish:'gloss'},
  {id:'sandstone', name:'Sandstone Clay',  base:[201,170,142], vein:'stone',      finish:'matte'},
  {id:'basalt',    name:'Basalt Slate',    base:[80,81,82],    vein:'slate',      finish:'matte'},
  {id:'greige',    name:'Greige Quartz',   base:[176,168,157], vein:'stone',      finish:'satin'}
 ]},
{id:'deco', name:'Deco',
 note:'Hand-glazed zellige and terracotta. Heavy tone-to-tone variation and glossy pooling — best read in small formats.',
 colours:[
  {id:'zbone',   name:'Zellige Bone', base:[233,226,212], vein:'zellige', finish:'gloss'},
  {id:'zsage',   name:'Zellige Sage', base:[164,175,153], vein:'zellige', finish:'gloss'},
  {id:'zblue',   name:'Zellige Sea',  base:[124,154,168], vein:'zellige', finish:'gloss'},
  {id:'terra',   name:'Terracotta',   base:[186,111,79],  vein:'zellige', finish:'satin'},
  {id:'emerald', name:'Emerald Glaze',base:[38,90,75],    vein:'zellige', finish:'gloss'},
  {id:'ochre',   name:'Ochre Glaze',  base:[199,150,62],  vein:'zellige', finish:'gloss'}
 ]},
{id:'sauna', name:'Sauna',
 note:'The cedar-and-slate spa palette. Wood-look plank against dark stone — warm, low-glare, non-slip on the floor.',
 colours:[
  {id:'cedar',   name:'Red Cedar',     base:[152,95,62],   vein:'wood',  finish:'matte'},
  {id:'hemlock', name:'Hemlock',       base:[212,188,155], vein:'wood',  finish:'matte'},
  {id:'aspen',   name:'Aspen',         base:[228,215,192], vein:'wood',  finish:'matte'},
  {id:'teak',    name:'Teak',          base:[168,124,74],  vein:'wood',  finish:'satin'},
  {id:'charred', name:'Charred Slate', base:[62,60,58],    vein:'slate', finish:'matte'},
  {id:'river',   name:'River Pebble',  base:[158,150,140], vein:'stone', finish:'satin'}
 ]}
];
const SIZES = [
  {id:'2x2',   w:2,  h:2,  name:'2 × 2'},
  {id:'8x8',   w:8,  h:8,  name:'8 × 8'},
  {id:'12x12', w:12, h:12, name:'12 × 12'},
  {id:'16x16', w:16, h:16, name:'16 × 16'},
  {id:'24x24', w:24, h:24, name:'24 × 24'},
  {id:'2x8',   w:8,  h:2,  name:'2 × 8'},
  {id:'4x16',  w:16, h:4,  name:'4 × 16'},
  {id:'12x24', w:24, h:12, name:'12 × 24'},
  {id:'24x48', w:48, h:24, name:'24 × 48'},
  {id:'8x48',  w:48, h:8,  name:'8 × 48 plank'},
  {id:'48x96', w:96, h:48, name:'48 × 96 slab'}
];
const LB = window.LB4684 || {materials:[],colors:[],grouts:[],lays:[],tex:{}};
const LAYS = {};
LB.lays.forEach(function(l){ LAYS[l.id] = {offsets:l.offsets, rot:l.rot, geom:l.geom, label:l.label, caution:l.caution}; });
const PATTERNS = LB.lays.map(function(l){
  return {id:l.id, name:l.label, note: (l.caution ? l.caution + ' ' : '') +
    (l.offsets && l.offsets.length > 1 ? 'Row offsets ' + l.offsets.map(function(o){return Math.round(o*100)+'%';}).join(' / ') + '.' : '') +
    (l.geom ? ' ' + l.geom.charAt(0).toUpperCase() + l.geom.slice(1) + '.' : '')};
});
const GROUTS = LB.grouts.map(function(g){ return {id:g.id, name:g.label, c:hexToRgb(g.hex)}; })
  .concat([{id:'tone', name:'Tone-on-tone', c:null}]);

(function(){
  const VEINMAP = {'blue':['none','gloss'],'off-white':['stone','satin'],'marble':['marble','gloss'],
                   'stone':['stone','matte'],'stone-black':['slate','matte'],'wood':['wood','matte']};
  // De-duplicate: drop palette patches that are near-identical to a colour we
  // already offer in the designed collections or earlier in the palette, so the
  // list stays varied without a wall of the-same neutrals.
  const seen = [];
  COLLECTIONS.forEach(function(c){ (c.colours || []).forEach(function(k){ if(k.base) seen.push(k.base); }); });
  const near = function(a, b){ return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]) + Math.abs(a[2]-b[2]) < 24; };
  const paletteCols = [];
  LB.colors.forEach(function(c){
    const base = hexToRgb(c.hex);
    if(seen.some(function(s){ return near(s, base); })) return;   // too close to something we already have
    seen.push(base);
    const v = VEINMAP[c.family] || ['stone','satin'];
    paletteCols.push({id:'lb-'+c.id, name:c.label, base:base, vein:v[0], finish:v[1], family:c.family});
  });
  COLLECTIONS.push({id:'palette', name:'Palette 4684',
    note:'The sample book\u2019s exact sRGB colour patches (near-duplicates removed), driven through the parametric engine \u2014 any size, any lay pattern, any grout.',
    colours: paletteCols});
  COLLECTIONS.push({id:'book', name:'Sample book',
    note:'The 22 render-ready PBR materials from the 4684 pack \u2014 base colour, OpenGL +Y normal and packed ORM, scaled from the manifest. Lay pattern and grout are baked into the maps, so size and pattern are fixed per material.',
    lookbook:true,
    colours: LB.materials.map(function(m){
      return {id:'lb#'+m.id, name:m.label, base:[170,170,170], vein:'stone', finish:m.finish==='glazed'?'gloss':'satin', lb:m};
    })});
})();
const FINISH = {matte:{rough:0.62,sheen:0.05,env:0.35}, satin:{rough:0.34,sheen:0.10,env:0.60}, gloss:{rough:0.10,sheen:0.20,env:1.00}};

function isLB(cid){ return typeof cid === 'string' && cid.indexOf('lb#') === 0; }
function colourOf(cid){
  for(let i=0;i<COLLECTIONS.length;i++){
    const c = COLLECTIONS[i].colours;
    for(let j=0;j<c.length;j++) if(c[j].id === cid) return c[j];
  }
  return COLLECTIONS[1].colours[0];
}
function collOf(cid){
  if(isLB(cid)) return COLLECTIONS.filter(function(c){ return c.id === 'book'; })[0] || COLLECTIONS[1];
  for(let i=0;i<COLLECTIONS.length;i++){
    const c = COLLECTIONS[i].colours;
    for(let j=0;j<c.length;j++) if(c[j].id === cid) return COLLECTIONS[i];
  }
  return COLLECTIONS[1];
}
function sizeOf(sid){ for(let i=0;i<SIZES.length;i++) if(SIZES[i].id===sid) return SIZES[i]; return SIZES[7]; }
// resolve a surface's tile size, honouring a user-entered custom W × H
function resolveSize(sp){
  if(sp && sp.size === 'custom'){
    const w = Math.max(0.5, Math.min(120, +sp.customW || 12));
    const h = Math.max(0.5, Math.min(120, +sp.customH || 12));
    const tidy = function(n){ return (Math.round(n*100)/100) + ''; };
    return {id:'custom', w:w, h:h, name:tidy(w)+' × '+tidy(h)+' custom'};
  }
  return sizeOf(sp ? sp.size : null);
}
function groutOf(gid){ for(let i=0;i<GROUTS.length;i++) if(GROUTS[i].id===gid) return GROUTS[i]; return GROUTS[1]; }
function rgb(a){ return 'rgb('+a[0]+','+a[1]+','+a[2]+')'; }
function shade(a,d){ return 'rgb('+cl(a[0]+d)+','+cl(a[1]+d)+','+cl(a[2]+d)+')'; }
function cl(v){ return Math.max(0, Math.min(255, Math.round(v))); }
function hex(a){ return '#'+[a[0],a[1],a[2]].map(function(v){return cl(v).toString(16).padStart(2,'0');}).join(''); }
function hexToRgb(h){
  h = h.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function hash(n){ const x = Math.sin(n*127.1 + 11.7)*43758.5453; return x - Math.floor(x); }

/* ============================================================
   TEXTURE ENGINE — every surface gets a bespoke, non-repeating
   texture drawn at its true size, so any tile size and any
   pattern lands correctly with no tiling seam anywhere.
   ============================================================ */
const texCache = {};

/* lay patterns: the 4684 pack's nine, driven by rowOffsetFractions.
   Every entry is [cx, cy, w, h, rot, clip] with cx/cy the tile centre. */
function tileRects(SW, SH, tw, th, pattern){
  const out = [];
  const lay = LAYS[pattern] || LAYS['stacked-horizontal'];

  if(pattern === 'herringbone-90'){
    const hh = Math.min(tw, th), ww = hh*2;
    const N = Math.ceil((SW + SH)/hh) + 4;
    for(let m=-N; m<=N; m++) for(let n=-N; n<=N; n++){
      const ox = m*(ww+hh) + n*ww, oy = m*hh + n*ww;
      if(ox > SW + ww || oy > SH + ww || ox < -2*ww || oy < -2*ww) continue;
      out.push([ox + ww/2, oy + hh/2, ww, hh, 0]);
      out.push([ox + ww + hh/2, oy + ww/2, hh, ww, 0]);
    }
    return out;
  }
  if(pattern === 'basketweave'){
    const hh = Math.min(tw, th), ww = hh*2;
    const bc = Math.ceil(SW/ww) + 2, br = Math.ceil(SH/ww) + 2;
    for(let i=-1; i<bc; i++) for(let j=-1; j<br; j++){
      const ox = i*ww, oy = j*ww;
      if((i + j + 2) % 2 === 0){
        out.push([ox + ww/2, oy + hh/2, ww, hh, 0]);
        out.push([ox + ww/2, oy + hh*1.5, ww, hh, 0]);
      } else {
        out.push([ox + hh/2, oy + ww/2, hh, ww, 0]);
        out.push([ox + hh*1.5, oy + ww/2, hh, ww, 0]);
      }
    }
    return out;
  }
  if(pattern === 'chevron'){
    const L = Math.max(tw, th), T = Math.min(tw, th);
    const c45 = Math.cos(Math.PI/4);
    const bw = L*c45, step = T/c45;
    const bands = Math.ceil(SW/bw) + 2, per = Math.ceil(SH/step) + Math.ceil(bw/step) + 3;
    for(let c=-1; c<bands; c++){
      const bx = c*bw, sign = (((c%2)+2)%2) ? -1 : 1;
      for(let k=-2; k<per; k++){
        out.push([bx + bw/2, k*step + (sign>0 ? 0 : step/2), L*1.6, T, sign*Math.PI/4, [bx, -L, bw, SH + 2*L]]);
      }
    }
    return out;
  }

  let w = tw, h = th;
  if(lay.rot === 90){ w = th; h = tw; }
  const offs = lay.offsets && lay.offsets.length ? lay.offsets : [0];
  const vertical = lay.rot === 90 && offs.length > 1;

  if(vertical){
    const cols = Math.ceil(SW/w) + 3, rows = Math.ceil(SH/h) + 3;
    for(let c=-2; c<cols; c++){
      const dy = offs[((c % offs.length) + offs.length) % offs.length]*h;
      for(let r=-2; r<rows; r++) out.push([c*w + w/2, r*h + dy + h/2, w, h, 0]);
    }
    return out;
  }
  const rows = Math.ceil(SH/h) + 3, cols = Math.ceil(SW/w) + 3;
  for(let r=-2; r<rows; r++){
    const dx = offs[((r % offs.length) + offs.length) % offs.length]*w;
    for(let c=-2; c<cols; c++) out.push([c*w + dx + w/2, r*h + h/2, w, h, 0]);
  }
  return out;
}

function hexPolys(SW, SH, size){
  const w = size, r = w/Math.sqrt(3), vstep = 1.5*r, out = [];
  const rowMax = Math.ceil((SH + 2*r)/vstep) + 1;
  const colMax = Math.ceil((SW + 2*w)/w) + 1;
  for(let row=-1; row<=rowMax; row++){
    const y = row*vstep, xoff = (((row%2)+2)%2) ? w/2 : 0;
    for(let col=-1; col<=colMax; col++){
      const x = col*w + xoff, pts = [];
      for(let k=0;k<6;k++){
        const a = Math.PI/180*(60*k - 90);
        pts.push([x + r*Math.cos(a), y + r*Math.sin(a)]);
      }
      out.push(pts);
    }
  }
  return out;
}
function paintVein(g, x, y, w, h, col, seed){
  const t = col.vein;
  if(t === 'none') return;
  g.save();
  if(t === 'marble'){
    for(let i=0;i<3;i++){
      const s = seed*7.1 + i*4.3;
      g.strokeStyle = i%2 ? 'rgba(120,118,114,0.30)' : 'rgba(168,164,156,0.22)';
      g.lineWidth = hash(s)*2.6 + 0.5;
      g.beginPath();
      let px = x + hash(s+1)*w, py = y - h*0.1;
      g.moveTo(px, py);
      for(let k=0;k<5;k++){ px += (hash(s+k+2)-0.5)*w*0.55; py += h*0.28; g.lineTo(px, py); }
      g.stroke();
    }
  } else if(t === 'travertine'){
    for(let i=0;i<9;i++){
      const s = seed*3.9 + i*2.7;
      g.strokeStyle = i%2 ? 'rgba(140,118,94,0.22)' : 'rgba(228,214,192,0.20)';
      g.lineWidth = hash(s)*2.2 + 0.5;
      g.beginPath();
      const py = y + hash(s+1)*h;
      g.moveTo(x, py);
      g.bezierCurveTo(x+w*0.3, py+(hash(s+2)-0.5)*h*0.08, x+w*0.7, py+(hash(s+3)-0.5)*h*0.08, x+w, py);
      g.stroke();
    }
  } else if(t === 'wood'){
    const along = w >= h;
    for(let i=0;i<14;i++){
      const s = seed*5.3 + i*1.9;
      g.strokeStyle = i%3 ? 'rgba(72,48,28,0.16)' : 'rgba(255,238,212,0.13)';
      g.lineWidth = hash(s)*1.5 + 0.35;
      g.beginPath();
      if(along){
        const py = y + hash(s+1)*h;
        g.moveTo(x, py);
        g.bezierCurveTo(x+w*0.33, py+(hash(s+2)-0.5)*h*0.22, x+w*0.66, py+(hash(s+3)-0.5)*h*0.22, x+w, py+(hash(s+4)-0.5)*h*0.1);
      } else {
        const px = x + hash(s+1)*w;
        g.moveTo(px, y);
        g.bezierCurveTo(px+(hash(s+2)-0.5)*w*0.22, y+h*0.33, px+(hash(s+3)-0.5)*w*0.22, y+h*0.66, px+(hash(s+4)-0.5)*w*0.1, y+h);
      }
      g.stroke();
    }
  } else if(t === 'slate'){
    for(let i=0;i<11;i++){
      const s = seed*4.7 + i*3.1;
      g.strokeStyle = i%2 ? 'rgba(20,20,20,0.30)' : 'rgba(190,190,190,0.13)';
      g.lineWidth = hash(s)*1.8 + 0.3;
      g.beginPath();
      let px = x + hash(s+1)*w, py = y + hash(s+2)*h;
      g.moveTo(px, py);
      for(let k=0;k<3;k++){ px += (hash(s+k+3)-0.5)*w*0.5; py += (hash(s+k+6)-0.5)*h*0.5; g.lineTo(px, py); }
      g.stroke();
    }
  } else if(t === 'zellige'){
    const rg = g.createRadialGradient(x+w*(0.3+hash(seed)*0.4), y+h*0.28, w*0.02, x+w*0.5, y+h*0.5, w*0.85);
    rg.addColorStop(0, 'rgba(255,255,255,0.34)');
    rg.addColorStop(0.45,'rgba(255,255,255,0.05)');
    rg.addColorStop(1, 'rgba(0,0,0,0.20)');
    g.fillStyle = rg; g.fillRect(x, y, w, h);
    for(let i=0;i<4;i++){
      const s = seed*8.3 + i*2.2;
      g.strokeStyle = 'rgba(0,0,0,0.10)';
      g.lineWidth = hash(s)*2.4 + 0.5;
      g.beginPath();
      g.moveTo(x + hash(s+1)*w, y);
      g.lineTo(x + hash(s+2)*w, y + h);
      g.stroke();
    }
  } else {
    for(let i=0;i<6;i++){
      const s = seed*6.1 + i*3.3;
      g.fillStyle = i%2 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.045)';
      g.beginPath();
      g.ellipse(x + hash(s)*w, y + hash(s+1)*h, w*(0.12+hash(s+2)*0.3), h*(0.12+hash(s+3)*0.3), hash(s+4)*3.14, 0, 6.2832);
      g.fill();
    }
  }
  g.restore();
}
function buildTexture(SW, SH, spec){
  const key = SW.toFixed(2)+'|'+SH.toFixed(2)+'|'+spec.colour+'|'+spec.size+'|'+spec.pattern+'|'+spec.grout;
  if(texCache[key]) return texCache[key];

  const col = colourOf(spec.colour), sz = resolveSize(spec), fin = FINISH[col.finish];
  const gr = groutOf(spec.grout);
  const groutCol = gr.c ? gr.c : [cl(col.base[0]*0.78), cl(col.base[1]*0.78), cl(col.base[2]*0.78)];
  const tmin = Math.min(sz.w, sz.h);
  const gw = Math.max(0.0625, Math.min(0.25, tmin/26));
  const varAmt = col.vein === 'zellige' ? 26 : (col.vein === 'wood' ? 18 : 9);

  const ppi = Math.max(3.2, Math.min(15, 1150/Math.max(SW, SH)));
  const cw = Math.max(8, Math.round(SW*ppi)), ch = Math.max(8, Math.round(SH*ppi));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  const bv = document.createElement('canvas'); bv.width = cw; bv.height = ch;
  const b = bv.getContext('2d');

  g.setTransform(ppi, 0, 0, ppi, 0, 0);
  b.setTransform(ppi, 0, 0, ppi, 0, 0);
  g.fillStyle = rgb(groutCol); g.fillRect(0, 0, SW, SH);
  b.fillStyle = '#1a1a1a';     b.fillRect(0, 0, SW, SH);

  function finishPass(x, y, w, h, ctx){
    ctx = ctx || g;
    const lg = ctx.createLinearGradient(x, y, x + w*0.45, y + h);
    lg.addColorStop(0,   'rgba(255,255,255,'+fin.sheen+')');
    lg.addColorStop(0.55,'rgba(255,255,255,0)');
    lg.addColorStop(1,   'rgba(0,0,0,'+(fin.sheen*0.7)+')');
    ctx.fillStyle = lg; ctx.fillRect(x, y, w, h);
  }

  if(spec.pattern === 'hex'){
    const polys = hexPolys(SW, SH, tmin);
    polys.forEach(function(pts, i){
      let cx = 0, cy = 0;
      pts.forEach(function(p){ cx += p[0]; cy += p[1]; });
      cx /= 6; cy /= 6;
      if(cx < -tmin || cx > SW + tmin || cy < -tmin || cy > SH + tmin) return;
      const k = 1 - (gw/tmin)*1.15;
      const path = new Path2D();
      pts.forEach(function(p, j){
        const px = cx + (p[0]-cx)*k, py = cy + (p[1]-cy)*k;
        if(j === 0) path.moveTo(px, py); else path.lineTo(px, py);
      });
      path.closePath();
      g.save(); g.clip(path);
      g.fillStyle = shade(col.base, (hash(i*1.7)-0.5)*varAmt);
      g.fillRect(cx-tmin, cy-tmin, tmin*2, tmin*2);
      finishPass(cx-tmin/2, cy-tmin/2, tmin, tmin);
      paintVein(g, cx-tmin/2, cy-tmin/2, tmin, tmin, col, i*2.3);
      g.restore();
      b.fillStyle = '#ededed'; b.fill(path);
    });
  } else {
    let tw = sz.w, th = sz.h;
    if(spec.pattern === 'herring'){ const hh = Math.min(tw, th); tw = hh*2; th = hh; }
    const rects = tileRects(SW, SH, tw, th, spec.pattern);
    rects.forEach(function(r, i){
      const cx = r[0], cy = r[1], rot = r[4] || 0, clip = r[5];
      const w = r[2] - gw, h = r[3] - gw;
      if(w <= 0 || h <= 0) return;
      const reach = (Math.abs(r[2]) + Math.abs(r[3]))/2 + 1;
      if(cx - reach > SW || cy - reach > SH || cx + reach < 0 || cy + reach < 0) return;
      const tone = shade(col.base, (hash(i*2.9)-0.5)*varAmt);
      [[g, false],[b, true]].forEach(function(pair){
        const ctx = pair[0], isBump = pair[1];
        ctx.save();
        if(clip){ ctx.beginPath(); ctx.rect(clip[0], clip[1], clip[2], clip[3]); ctx.clip(); }
        ctx.translate(cx, cy);
        if(rot) ctx.rotate(rot);
        ctx.beginPath(); ctx.rect(-w/2, -h/2, w, h); ctx.clip();
        if(isBump){ ctx.fillStyle = '#ededed'; ctx.fillRect(-w/2, -h/2, w, h); }
        else {
          ctx.fillStyle = tone; ctx.fillRect(-w/2, -h/2, w, h);
          finishPass(-w/2, -h/2, w, h, ctx);
          paintVein(ctx, -w/2, -h/2, w, h, col, i*1.31);
        }
        ctx.restore();
      });
    });
  }

  const map = new THREE.CanvasTexture(cv), bump = new THREE.CanvasTexture(bv);
  [map, bump].forEach(function(t){
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = MAXANISO;
  });
  map.encoding = THREE.sRGBEncoding;
  const out = {map:map, bump:bump, rough:fin.rough, env:fin.env,
               bumpScale: Math.max(0.18, Math.min(0.75, gw*3.2)),
               swatch: hex(col.base), grout: hex(groutCol)};
  texCache[key] = out;
  return out;
}

/* ============================================================
   SCENE
   ============================================================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0B1014);
scene.fog = new THREE.Fog(0x0B1014, 260, 620);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const MAXANISO = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;

(function(){
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0,0,0,256);
  grd.addColorStop(0.00,'#eef4f8'); grd.addColorStop(0.40,'#c2ccd4');
  grd.addColorStop(0.52,'#6e6a63'); grd.addColorStop(1.00,'#292622');
  g.fillStyle = grd; g.fillRect(0,0,512,256);
  const rg = g.createRadialGradient(146,54,3,146,54,120);
  rg.addColorStop(0,'rgba(255,249,236,1)'); rg.addColorStop(1,'rgba(255,249,236,0)');
  g.fillStyle = rg; g.fillRect(0,0,512,256);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  pm.compileEquirectangularShader();
  scene.environment = pm.fromEquirectangular(tex).texture;
  tex.dispose(); pm.dispose();
})();

const camera = new THREE.PerspectiveCamera(38, window.innerWidth/window.innerHeight, 0.5, 2500);
scene.add(new THREE.AmbientLight(0xffffff, 0.30));
const hemi = new THREE.HemisphereLight(0xcfe0ea, 0x4b433c, 0.62); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff4e6, 1.05);
key.position.set(W/2 + 130, 190, D + 150);
key.castShadow = true; key.shadow.mapSize.set(2048,2048);
key.shadow.camera.left = -140; key.shadow.camera.right = 140;
key.shadow.camera.top = 190;   key.shadow.camera.bottom = -40;
key.shadow.camera.near = 20;   key.shadow.camera.far = 520;
key.shadow.bias = -0.0012; key.shadow.radius = 3;
key.target.position.set(W/2, 30, D/2); scene.add(key); scene.add(key.target);
const fillL = new THREE.DirectionalLight(0xbcd4e2, 0.34); fillL.position.set(-120, 90, -60); scene.add(fillL);
const inner = new THREE.PointLight(0xfff0dc, 0.55, 210, 2); inner.position.set(W/2, H-12, D/2); scene.add(inner);

const matBrass   = new THREE.MeshStandardMaterial({color:0xC39A61, metalness:0.92, roughness:0.28});
const matBrassDk = new THREE.MeshStandardMaterial({color:0x8A6E44, metalness:0.9,  roughness:0.42});
const matSteel   = new THREE.MeshStandardMaterial({color:0x9AA0A2, metalness:0.88, roughness:0.34});
// black lever/handle accent (the Tenzo Signature kit) — deliberately NOT part of
// the metal-finish set, so the levers stay black whatever finish the taps take
const matBlack   = new THREE.MeshStandardMaterial({color:0x161616, metalness:0.35, roughness:0.5});

/* ---- metal finish: one global choice, applied to every tap, head, jet,
        valve, drain grate, hinge and pull by mutating the shared materials ---- */
const METALS = [
  {id:'brass',  name:'Unlacquered brass', sw:'#C39A61',
   main:{c:0xC39A61, m:0.94, r:0.26}, dark:{c:0x8A6E44, m:0.90, r:0.44}, trim:{c:0xA98A57, m:0.90, r:0.34},
   note:'Living finish. Warm against limestone and off-white; it will patina unless lacquered.'},
  {id:'nickel', name:'Brushed nickel', sw:'#C2C4C0',
   main:{c:0xC2C4C0, m:0.92, r:0.36}, dark:{c:0x8E918F, m:0.88, r:0.50}, trim:{c:0xADB0AD, m:0.90, r:0.40},
   note:'Softest of the four. Hides water spots better than chrome, reads quieter than brass.'},
  {id:'black',  name:'Matte black', sw:'#2C2C2D',
   main:{c:0x2C2C2D, m:0.52, r:0.60}, dark:{c:0x191919, m:0.48, r:0.70}, trim:{c:0x262627, m:0.50, r:0.62},
   note:'Highest contrast. Strong graphic read on pale tile; shows limescale on hard water.'},
  {id:'chrome', name:'Polished chrome', sw:'#E6EAEC',
   main:{c:0xE6EAEC, m:1.00, r:0.05}, dark:{c:0xA8AEB1, m:1.00, r:0.13}, trim:{c:0xD2D7DA, m:1.00, r:0.08},
   note:'Mirror finish. Picks up the tile colour around it, so it changes character with the scheme.'}
];
let metalId = 'brass';
function metalOf(id){ for(let i=0;i<METALS.length;i++) if(METALS[i].id === id) return METALS[i]; return METALS[0]; }
function applyMetal(id){
  metalId = id;
  const f = metalOf(id);
  [[matBrass, f.main],[matBrassDk, f.dark],[matSteel, f.trim]].forEach(function(pair){
    const m = pair[0], v = pair[1];
    m.color.setHex(v.c); m.metalness = v.m; m.roughness = v.r;
    m.envMapIntensity = (id === 'black') ? 0.55 : 1.0;
    m.needsUpdate = true;
  });
}
const matGlass   = new THREE.MeshPhysicalMaterial({color:0xd9eef5, metalness:0, roughness:0.03,
  transparent:true, opacity:0.16, side:THREE.DoubleSide, clearcoat:1, clearcoatRoughness:0.02, depthWrite:false});

/* ============================================================
   SURFACES
   ============================================================ */
const SURF = {
  floor:  {name:'Floor',           spec:{colour:'limestone', size:'2x2',   pattern:'hex-grid',           grout:'taupe'}},
  back:   {name:'Back wall',       spec:{colour:'limestone', size:'12x24', pattern:'running-bond-33',    grout:'bone'}},
  left:   {name:'Left wall',       spec:{colour:'limestone', size:'12x24', pattern:'running-bond-33',    grout:'bone'}},
  right:  {name:'Right wall',      spec:{colour:'limestone', size:'12x24', pattern:'running-bond-33',    grout:'bone'}},
  ceiling:{name:'Ceiling',         spec:{colour:'limestone', size:'12x24', pattern:'running-bond-33',    grout:'bone'}},
  bench:  {name:'Bench + curb',    spec:{colour:'limestone', size:'12x12', pattern:'stacked-horizontal', grout:'bone'}},
  niche:  {name:'Niche interiors', spec:{colour:'zsage',     size:'2x8',   pattern:'running-bond-50',    grout:'warm-white'}}
};
const SURF_ORDER = ['floor','back','left','right','ceiling','bench','niche'];

const matCache = {};
const LBMAT = {}; LB.materials.forEach(function(m){ LBMAT[m.id] = m; });
const lbImg = {};      // url -> {img, texs:[], failed}
let lbBroken = false;
function lbTex(url, srgb, rx, ry){
  let rec = lbImg[url];
  if(!rec){
    rec = lbImg[url] = {img:null, texs:[], failed:false};
    const im = new Image();
    im.onload = function(){
      rec.img = im;
      rec.texs.forEach(function(t){ t.image = im; t.needsUpdate = true; });
    };
    im.onerror = function(){
      rec.failed = true;
      if(!lbBroken){ lbBroken = true; onLookbookUnavailable(); }
    };
    im.src = url;
  }
  const t = new THREE.Texture();
  if(rec.img){ t.image = rec.img; t.needsUpdate = true; }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = MAXANISO;
  t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
  t.repeat.set(rx, ry);
  rec.texs.push(t);
  return t;
}
/* if the host blocks data: images, fall back to flat mean colour rather than white */
function onLookbookUnavailable(){
  SURF_ORDER.forEach(function(id){
    const sp = SURF[id].spec;
    if(isLB(sp.colour)){
      const m = LBMAT[sp.colour.slice(3)];
      sp.colour = 'lb-' + nearestPaletteId(m.avg);
      sp.size = sp.size || '12x24';
    }
  });
  for(const k in matCache) delete matCache[k];
  buildFloor(); buildCeiling(); buildLeftWall(); buildRightWall(); buildBackWall(); buildBench();
  renderTileUI(); renderTileSchedule();
}
function nearestPaletteId(rgbA){
  let best = LB.colors[0], bd = 1e9;
  LB.colors.forEach(function(c){
    const v = hexToRgb(c.hex);
    const d = (v[0]-rgbA[0])*(v[0]-rgbA[0]) + (v[1]-rgbA[1])*(v[1]-rgbA[1]) + (v[2]-rgbA[2])*(v[2]-rgbA[2]);
    if(d < bd){ bd = d; best = c; }
  });
  return best.id;
}
const M_PER_IN = 0.0254;
function lbMaterial(mid, texW, texH, projected, side, sizeIn){
  const m = LBMAT[mid], tex = LB.tex[mid];
  // a tiled book material can be laid at the chosen (or custom) tile size — the
  // high-quality maps scale to it; continuous slabs keep their baked repeat
  const px = (sizeIn && m.tile) ? sizeIn.w : m.rep[0]/M_PER_IN;   // physical repeat, inches
  const py = (sizeIn && m.tile) ? sizeIn.h : m.rep[1]/M_PER_IN;
  const rx = projected ? 1/px : texW/px;
  const ry = projected ? 1/py : texH/py;
  const orm = lbTex(tex.orm, false, rx, ry);
  return new THREE.MeshStandardMaterial({
    map: lbTex(tex.baseColor, true, rx, ry),
    normalMap: lbTex(tex.normal, false, rx, ry),
    normalScale: new THREE.Vector2(m.ns[0], m.ns[1]),
    aoMap: orm, aoMapIntensity: 1,
    roughnessMap: orm, roughness: 1,
    metalnessMap: orm, metalness: 1,
    envMapIntensity: 0.85, side: side || THREE.FrontSide
  });
}
function surfMat(id, texW, texH, projected, side){
  const sp = SURF[id].spec;
  const key = id+'|'+sp.colour+'|'+sp.size+'|'+(sp.customW||'')+'x'+(sp.customH||'')+'|'+sp.pattern+'|'+sp.grout+'|'+texW.toFixed(2)+'|'+texH.toFixed(2)+'|'+(projected?1:0)+'|'+(side||0);
  if(matCache[key]) return matCache[key];
  if(sp.colour.indexOf('lb#') === 0){
    const m = lbMaterial(sp.colour.slice(3), texW, texH, projected, side, resolveSize(sp));
    matCache[key] = m; return m;
  }
  const t = buildTexture(texW, texH, sp);
  const map = t.map.clone(), bump = t.bump.clone();
  map.needsUpdate = bump.needsUpdate = true;
  map.encoding = THREE.sRGBEncoding;
  if(projected){ map.repeat.set(1/texW, 1/texH); bump.repeat.set(1/texW, 1/texH); }
  const m = new THREE.MeshStandardMaterial({
    map:map, bumpMap:bump, bumpScale:t.bumpScale, roughness:t.rough,
    metalness:0, envMapIntensity:t.env, side: side || THREE.FrontSide
  });
  matCache[key] = m;
  return m;
}
function withUv2(geo){
  const uv = geo.getAttribute('uv');
  if(uv && !geo.getAttribute('uv2')) geo.setAttribute('uv2', uv.clone());
  return geo;
}
function boxProjectUVs(geo){
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count*2);
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    let u, v;
    if(ny >= nx && ny >= nz){ u = x; v = z; }
    else if(nx >= nz){ u = z; v = y; }
    else { u = x; v = y; }
    uv[i*2] = u; uv[i*2+1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.deleteAttribute('uv2');
  withUv2(geo);
}
function clearGroup(g){
  while(g.children.length){
    const c = g.children[0]; g.remove(c);
    c.traverse && c.traverse(function(o){ if(o.isMesh && o.geometry) o.geometry.dispose(); });
  }
}
function plane(group, w, h, mat, pos, rot){
  const m = new THREE.Mesh(withUv2(new THREE.PlaneGeometry(w,h)), mat);
  m.position.set(pos[0],pos[1],pos[2]);
  m.rotation.set(rot[0],rot[1],rot[2]);
  m.receiveShadow = true;
  group.add(m);
  return m;
}

const gFloor = new THREE.Group(), gBack = new THREE.Group(), gLeft = new THREE.Group();
const gRight = new THREE.Group(), gCeil = new THREE.Group(), gBench = new THREE.Group();
const gGlass = new THREE.Group(), gFix = new THREE.Group(), gJets = new THREE.Group();
const gDims = new THREE.Group(), gLabels = new THREE.Group(), gFigure = new THREE.Group();
const gShellEdge = new THREE.Group();
scene.add(gFloor,gBack,gLeft,gRight,gCeil,gBench,gGlass,gFix,gJets,gDims,gLabels,gFigure,gShellEdge);
const gFixDims = new THREE.Group(), gBenchDims = new THREE.Group();
gDims.add(gFixDims); gDims.add(gBenchDims);

/* ---------- shell builders ---------- */
function buildFloor(){
  clearGroup(gFloor);
  plane(gFloor, W, D, surfMat('floor', W, D), [W/2, 0, D/2], [-Math.PI/2, 0, 0]);
  buildDrain();
}
/* Dropped "floating" ceiling: the tiled field drops ~3" below the structural
   slab, held off the walls by a perimeter reveal. A brass valance lines the
   reveal and a warm LED strip rings the whole ceiling, washing light up the
   cove — the classic floating-ceiling glow. */
const CEIL_DROP = 3, CEIL_REVEAL = 5;   // drop depth (2–4") and perimeter cove width
function buildCeiling(){
  clearGroup(gCeil);
  const drop = CEIL_DROP, reveal = CEIL_REVEAL;
  const iw = W - 2 * reveal, id = D - 2 * reveal, topGap = 0.8, slabT = drop;
  // structural ceiling — only the perimeter reveal shows it, lit by the cove
  plane(gCeil, W, D, surfMat('ceiling', W, D), [W/2, H, D/2], [Math.PI/2, 0, 0]);
  // the dropped tiled field, floating below with the reveal gap all around
  const slab = new THREE.Mesh(new THREE.BoxGeometry(iw, slabT, id), surfMat('ceiling', iw, id));
  slab.position.set(W/2, H - topGap - slabT / 2, D/2);
  slab.castShadow = true; slab.receiveShadow = true; gCeil.add(slab);
  // brass valance framing the reveal (a thin lip around the dropped field)
  const vy = H - topGap - slabT, vt = 0.6;
  [[iw + 2 * vt, vt, (W)/2, reveal - vt/2], [iw + 2 * vt, vt, (W)/2, D - reveal + vt/2],
   [vt, id, reveal - vt/2, D/2], [vt, id, W - reveal + vt/2, D/2]].forEach(function(s, i){
    const m = new THREE.Mesh(new THREE.BoxGeometry(s[0], slabT, s[1]), matBrass);
    m.position.set(s[2], H - topGap - slabT/2, s[3]); gCeil.add(m);
  });
  // warm LED cove strip ringing the ceiling, tucked in the reveal facing up
  const ledMat = new THREE.MeshStandardMaterial({color:0xfff2da, emissive:0xffd9a2, emissiveIntensity:1.9, roughness:0.5, metalness:0});
  const ledY = H - 1.0, lt = 0.6, ex0 = reveal - 0.4, ex1 = W - reveal + 0.4, ez0 = reveal - 0.4, ez1 = D - reveal + 0.4;
  [[ex1 - ex0, lt, (ex0 + ex1)/2, ez0], [ex1 - ex0, lt, (ex0 + ex1)/2, ez1],
   [lt, ez1 - ez0, ex0, (ez0 + ez1)/2], [lt, ez1 - ez0, ex1, (ez0 + ez1)/2]].forEach(function(s){
    const m = new THREE.Mesh(new THREE.BoxGeometry(s[0], 0.5, s[1]), ledMat);
    m.position.set(s[2], ledY, s[3]); gCeil.add(m);
  });
  // real light from the cove so the ring reads as illumination, not just a bright line
  [[reveal, reveal], [W - reveal, reveal], [reveal, D - reveal], [W - reveal, D - reveal]].forEach(function(p){
    const pl = new THREE.PointLight(0xffe7c2, 0.42, 46, 2); pl.position.set(p[0], H - 2.5, p[1]); gCeil.add(pl);
  });
}
/* Every wall is a shape with holes, so a niche cuts a real opening in
   whichever wall hosts it. Shape coords are (run, height) in inches;
   ShapeGeometry lays UVs out in those same inches, hence projected=true. */
const WALLS = {
  back:  {run:W, group:gBack,  pos:[0,0,0], rotY:0},
  left:  {run:D, group:gLeft,  pos:[0,0,D], rotY:Math.PI/2},
  right: {run:D, group:gRight, pos:[W,0,0], rotY:-Math.PI/2}
};
function wallU(wallId, n){                     // niche centre along that wall's run
  if(wallId === 'back') return n.p.x;
  if(wallId === 'left') return D - n.p.z;      // shape x runs opposite world z here
  return n.p.z;
}
function buildWall(wallId){
  const cfg = WALLS[wallId], g = cfg.group;
  clearGroup(g);
  const run = cfg.run;
  const sh = new THREE.Shape();
  sh.moveTo(0,0); sh.lineTo(run,0); sh.lineTo(run,H); sh.lineTo(0,H); sh.lineTo(0,0);
  niches.forEach(function(n){
    if(!n.on || n.host !== wallId) return;
    const u = wallU(wallId, n);
    const u0 = Math.max(0.25, u - n.nw/2), u1 = Math.min(run-0.25, u + n.nw/2);
    const v0 = Math.max(0.25, n.p.y - n.nh/2), v1 = Math.min(H-0.25, n.p.y + n.nh/2);
    if(u1 - u0 < 1 || v1 - v0 < 1) return;
    const hole = new THREE.Path();
    hole.moveTo(u0,v0); hole.lineTo(u0,v1); hole.lineTo(u1,v1); hole.lineTo(u1,v0); hole.lineTo(u0,v0);
    sh.holes.push(hole);
  });
  const geo = withUv2(new THREE.ShapeGeometry(sh));
  const m = new THREE.Mesh(geo, surfMat(wallId, run, H, true));
  m.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
  m.rotation.y = cfg.rotY;
  m.receiveShadow = true;
  g.add(m);
}
function buildLeftWall(){ buildWall('left'); }
function buildRightWall(){ buildWall('right'); }
function buildBackWall(){ buildWall('back'); }
function rebuildWalls(){ buildWall('back'); buildWall('left'); buildWall('right'); }


/* ---------- enclosure wireframe ---------- */
(function(){
  const e = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
    new THREE.LineBasicMaterial({color:0x3B4A54, transparent:true, opacity:0.7}));
  e.position.set(W/2, H/2, D/2);
  gShellEdge.add(e);
})();

/* ---------- bench: presets plus full parametric control ----------
   Built in a local frame (depth along +X, length along +Z) then baked
   into world space, so grout stays axis-aligned with the walls.        */
const BENCH = {type:'corner', wall:'left', corner:'bl', len:24, dep:16, h:18.5, off:0, leg:24};
const BENCH_PRESETS = {
  full:  {wall:'left', len:D,  dep:16, off:0},
  half:  {wall:'left', len:24, dep:16, off:0},
  small: {wall:'left', len:20, dep:12, off:0},
  corner:{leg:24}
};
function wallRun(){ return BENCH.wall === 'back' ? W : D; }
function benchClamp(){
  BENCH.len = Math.max(8, Math.min(wallRun(), BENCH.len));
  BENCH.dep = Math.max(8, Math.min(24, BENCH.dep));
  BENCH.h   = Math.max(14, Math.min(24, BENCH.h));
  BENCH.leg = Math.max(12, Math.min(Math.min(W,D) - 6, BENCH.leg));
  BENCH.off = Math.max(0, Math.min(wallRun() - BENCH.len, BENCH.off));
}
/* rectangular bench footprint in world inches, per wall.
   The bullnose is added on the seat face and on any end that is not
   already hard against a return wall.                                */
function benchBox(){
  const L = BENCH.len, SD = BENCH.dep, N = BENCH_NOSE, o = BENCH.off;
  const run = wallRun();
  const lo = o > 0.01 ? N : 0;                 // nose on the near end
  const hi = (o + L) < run - 0.01 ? N : 0;     // nose on the far end
  if(BENCH.wall === 'right')
    return {x0:W-SD, x1:W, z0:o, z1:o+L, cx0:W-SD-N, cx1:W, cz0:o-lo, cz1:o+L+hi};
  if(BENCH.wall === 'back')
    return {x0:o, x1:o+L, z0:0, z1:SD, cx0:o-lo, cx1:o+L+hi, cz0:0, cz1:SD+N};
  return   {x0:0, x1:SD, z0:o, z1:o+L, cx0:0, cx1:SD+N, cz0:o-lo, cz1:o+L+hi};
}
function boxBetween(x0,x1,y0,y1,z0,z1){
  const g = new THREE.BoxGeometry(x1-x0, y1-y0, z1-z0);
  g.translate((x0+x1)/2, (y0+y1)/2, (z0+z1)/2);
  return g;
}
function benchMatrix(){
  const m = new THREE.Matrix4();
  if(BENCH.type === 'corner'){
    if(BENCH.corner === 'br'){ m.makeRotationY(-Math.PI/2); m.setPosition(W, 0, 0); }
    else m.identity();
    return m;
  }
  if(BENCH.wall === 'right'){ m.makeRotationY(Math.PI); m.setPosition(W, 0, BENCH.off + BENCH.len); }
  else if(BENCH.wall === 'back'){ m.makeRotationY(-Math.PI/2); m.setPosition(BENCH.off + BENCH.len, 0, 0); }
  else { m.identity(); m.setPosition(0, 0, BENCH.off); }
  return m;
}
function buildBench(){
  clearGroup(gBench);
  clearGroup(gBenchDims);
  benchClamp();
  const mat = surfMat('bench', 60, 60, true);
  const edgeMat = new THREE.LineBasicMaterial({color:0x8A959B, transparent:true, opacity:0.45});

  (function(){                                   // curb, always present
    const g = new THREE.BoxGeometry(W, CURB_H, CURB_D);
    g.translate(W/2, CURB_H/2, D - CURB_D/2);
    boxProjectUVs(g);
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; gBench.add(m);
  })();
  if(BENCH.type === 'none'){ benchDims(); return; }

  const M = benchMatrix();
  const P = function(x,y,z){ return new THREE.Vector3(x,y,z).applyMatrix4(M).toArray(); };
  function solid(geo){
    geo.applyMatrix4(M); boxProjectUVs(geo);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true;
    gBench.add(m); return m;
  }
  const H1 = BENCH.h - 1;

  if(BENCH.type === 'corner'){
    const L = BENCH.leg, hyp = Math.SQRT2*L;
    const capL = L*(1 + BENCH_NOSE/((L*L)/hyp));
    function tri(legX, legZ, height, yBase){
      const sh = new THREE.Shape();
      sh.moveTo(0,0); sh.lineTo(legX,0); sh.lineTo(0,legZ); sh.lineTo(0,0);
      const g = new THREE.ExtrudeGeometry(sh, {depth:height, bevelEnabled:false});
      g.rotateX(Math.PI/2); g.translate(0, height + yBase, 0);
      return g;
    }
    solid(tri(L, L, H1, 0));
    solid(tri(capL, capL, 1, H1));
    [[L,0.05],[L,H1],[capL,H1],[capL,BENCH.h]].forEach(function(p){
      const geo = new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3().fromArray(P(0,p[1],p[0])), new THREE.Vector3().fromArray(P(p[0],p[1],0))]);
      gBench.add(new THREE.Line(geo, edgeMat));
    });
  } else {
    const b = benchBox();
    const g1 = boxBetween(b.x0, b.x1, 0, H1, b.z0, b.z1);
    boxProjectUVs(g1);
    const m1 = new THREE.Mesh(g1, mat); m1.castShadow = m1.receiveShadow = true; gBench.add(m1);
    const g2 = boxBetween(b.cx0, b.cx1, BENCH.h - 1, BENCH.h, b.cz0, b.cz1);
    boxProjectUVs(g2);
    const m2 = new THREE.Mesh(g2, mat); m2.castShadow = m2.receiveShadow = true; gBench.add(m2);
    const eg = new THREE.EdgesGeometry(boxBetween(b.cx0, b.cx1, 0, BENCH.h, b.cz0, b.cz1));
    gBench.add(new THREE.LineSegments(eg, edgeMat));
  }
  benchDims();
}
function benchDims(){
  clearGroup(gBenchDims);
  if(BENCH.type === 'none') return;
  const c = 0xC39A61, M = benchMatrix();
  const P = function(x,y,z){ return new THREE.Vector3(x,y,z).applyMatrix4(M).toArray(); };
  const V = function(x,y,z){                       // offsets rotate, positions translate
    const o = new THREE.Vector3(x,y,z).applyMatrix4(new THREE.Matrix4().extractRotation(M));
    return o.toArray();
  };
  if(BENCH.type === 'corner'){
    const L = BENCH.leg;
    dim(P(0,BENCH.h,0.4), P(L,BENCH.h,0.4), fmtIn(L), V(0,9,4), c, gBenchDims);
    dim(P(0.4,BENCH.h,0), P(0.4,BENCH.h,L), fmtIn(L), V(7,9,0), c, gBenchDims);
    dim(P(L,0,0.4), P(L,BENCH.h,0.4), fmtIn(BENCH.h), V(8,0,4), c, gBenchDims);
  } else {
    const b = benchBox(), h = BENCH.h;
    if(BENCH.wall === 'back'){
      dim([b.x1, h, 0], [b.x1, h, b.z1], fmtIn(BENCH.dep), [4,7,0], c, gBenchDims);
      dim([b.x1, 0, b.z1+0.4], [b.x1, h, b.z1+0.4], fmtIn(h), [4,0,6], c, gBenchDims);
      dim([b.x0, h+2, b.z1], [b.x1, h+2, b.z1], fmtIn(BENCH.len), [0,7,5], c, gBenchDims);
    } else {
      const sx = BENCH.wall === 'right' ? -1 : 1;
      const face = BENCH.wall === 'right' ? b.x0 : b.x1;
      dim([b.x0, h, b.z1+0.6], [b.x1, h, b.z1+0.6], fmtIn(BENCH.dep), [0,0,7], c, gBenchDims);
      dim([face, 0, b.z1+0.4], [face, h, b.z1+0.4], fmtIn(h), [sx*8,0,3], c, gBenchDims);
      dim([face - sx*0.4, h+2, b.z0], [face - sx*0.4, h+2, b.z1], fmtIn(BENCH.len), [sx*7,7,0], c, gBenchDims);
    }
  }
}

/* ---------- glass front ---------- */
function buildGlass(){
  clearGroup(gGlass);
  const gh = GLASS_TOP - CURB_H;
  [[0,PANEL_W],[PANEL_W+DOOR_GAP, PANEL_W+DOOR_GAP+DOOR_W]].forEach(function(sp){
    const wdt = sp[1]-sp[0];
    const p = new THREE.Mesh(new THREE.BoxGeometry(wdt, gh, 0.5), matGlass);
    p.position.set((sp[0]+sp[1])/2, CURB_H + gh/2, GLASS_Z);
    gGlass.add(p);
    const ln = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(wdt, gh, 0.5)),
      new THREE.LineBasicMaterial({color:0xBFE0EC, transparent:true, opacity:0.55}));
    ln.position.copy(p.position);
    gGlass.add(ln);
  });
  [22, 52].forEach(function(y){
    const hg = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4, 1.6), matBrass);
    hg.position.set(PANEL_W + DOOR_GAP/2, CURB_H + y, GLASS_Z);
    hg.castShadow = true; gGlass.add(hg);
  });
}

/* ============================================================
   FIXTURE FRAMEWORK
   ============================================================ */
const HOSTS = {
  ceiling:{label:'Ceiling',    rotY:0,           a:['x','z'], normal:[0,-1,0], point:[0,H,0]},
  floor:  {label:'Floor',      rotY:0,           a:['x','z'], normal:[0,1,0],  point:[0,0,0]},
  right:  {label:'Right wall', rotY:0,           a:['z','y'], normal:[-1,0,0], point:[W,0,0]},
  left:   {label:'Left wall',  rotY:Math.PI,     a:['z','y'], normal:[1,0,0],  point:[0,0,0]},
  back:   {label:'Back wall',  rotY:Math.PI/2,   a:['x','y'], normal:[0,0,1],  point:[0,0,0]},
  glass:  {label:'Door',       rotY:-Math.PI/2,  a:['x','y'], normal:[0,0,-1], point:[0,0,GLASS_Z]}
};
const RANGE = {x:[3, W-3], z:[3, D-3], y:[8, H-8]};
const AXIS_LABEL = {x:'From left wall', z:'From back wall', y:'Height AFF'};
function rangeFor(f, a){ return (f.range && f.range[a]) ? f.range[a] : RANGE[a]; }
function clampAxis(f, a, v){
  let r = rangeFor(f,a);
  if(f.wallCut){                       // keep the opening fully inside the wall
    const run = (f.host === 'back') ? W : D;
    if(a === 'x' || a === 'z') r = [f.nw/2 + 1, run - f.nw/2 - 1];
    if(a === 'y') r = [f.nh/2 + 4, H - f.nh/2 - 4];
  }
  return Math.min(r[1], Math.max(r[0], v));
}
function fmtIn(v){
  const q = Math.round(v*8)/8;
  const neg = q < 0, av = Math.abs(q);
  let whole = Math.floor(av), n = Math.round((av-whole)*8);
  if(n === 8){ whole++; n = 0; }
  const f = ['','1/8','1/4','3/8','1/2','5/8','3/4','7/8'][n];
  const s = n ? (whole ? whole+' '+f : f) : String(whole);
  return (neg?'-':'') + s + '"';
}
function anchorOf(f){
  const p = f.p;
  if(f.host === 'ceiling') return [p.x, H, p.z];
  if(f.host === 'floor')   return [p.x, 0, p.z];
  if(f.host === 'right')   return [W, p.y, p.z];
  if(f.host === 'left')    return [0, p.y, p.z];
  if(f.host === 'glass')   return [p.x, p.y, GLASS_Z];
  return [p.x, p.y, 0];
}
function centreFixture(f){
  if(f.locked) return;
  HOSTS[f.host].a.forEach(function(a){
    if(a === 'x'){ const r = rangeFor(f,'x'); f.p.x = clampAxis(f,'x', (f.range && f.range.x) ? (r[0]+r[1])/2 : W/2); }
    if(a === 'z'){ const r = rangeFor(f,'z'); f.p.z = clampAxis(f,'z', (f.range && f.range.z) ? (r[0]+r[1])/2 : D/2); }
  });
  placeFixture(f);
}
function lockedCount(){ let n = 0; fixtures.forEach(function(f){ if(f.locked) n++; }); return n; }
function placeFixture(f){
  if(f.wallCut) HOSTS[f.host].a.forEach(function(ax){ f.p[ax] = clampAxis(f, ax, f.p[ax]); });
  const a = anchorOf(f);
  f.group.position.set(a[0], a[1], a[2]);
  f.group.rotation.y = HOSTS[f.host].rotY;
}
function setHost(f, host){
  const from = f.host;
  if(host === 'back' && (from === 'right' || from === 'left')) f.p.x = clampAxis(f,'x', f.p.z*(W/D));
  else if(from === 'back' && (host === 'right' || host === 'left')) f.p.z = clampAxis(f,'z', f.p.x*(D/W));
  f.host = host;
  rebuildBody(f); placeFixture(f);
  if(f.wallCut) rebuildWalls();
}

function localPlate(r, t){
  t = t || 0.55;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, 40), matBrass);
  m.rotation.z = Math.PI/2; m.position.x = -t/2 - 0.05; m.castShadow = true;
  return m;
}
function headGeo(shape, dia, thick){
  return shape === 'square'
    ? new THREE.BoxGeometry(dia, thick, dia)
    : new THREE.CylinderGeometry(dia/2, dia/2, thick, 56);
}
function buildRain(g, f){
  const drop = Math.max(1.5, H - f.headY);
  const fl = new THREE.Mesh(f.shape === 'square' ? new THREE.BoxGeometry(5,0.6,5) : new THREE.CylinderGeometry(2.6,2.6,0.6,40), matBrass);
  fl.position.y = -0.3; g.add(fl);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,drop,24), matBrass);
  pipe.position.y = -drop/2; pipe.castShadow = true; g.add(pipe);
  const hd = new THREE.Mesh(headGeo(f.shape, f.dia, 1.5), matBrass);
  hd.position.y = -drop; hd.castShadow = true; g.add(hd);
  const fc = new THREE.Mesh(headGeo(f.shape, f.dia-1.4, 0.3), matBrassDk);
  fc.position.y = -drop-0.8; g.add(fc);
}
function buildShowerHead(g, f){
  g.add(localPlate(f.shape === 'square' ? 3.4 : 3.4));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,f.reach,20), matBrass);
  arm.rotation.z = Math.PI/2; arm.position.set(-f.reach/2, 0, 0); arm.castShadow = true; g.add(arm);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15,24,18), matBrass);
  ball.position.set(-f.reach, 0, 0); g.add(ball);
  let hd;
  if(f.shape === 'square'){
    hd = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 5.6), matBrass);
    hd.position.set(-f.reach-2.4, -2.1, 0); hd.rotation.z = 0.72;
  } else {
    hd = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.2, 2.6, 40), matBrass);
    hd.position.set(-f.reach-2.0, -1.9, 0); hd.rotation.z = Math.PI/2 + 0.72;
  }
  hd.castShadow = true; g.add(hd);
}
function buildValve(g){
  // Tenzo Signature thermostatic trim: a tall rounded-rectangle plate with three
  // round controls down it — two knobs with short black lever tabs (volume /
  // diverter) and a larger thermostatic handle with a black lever below.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 5.2), matBrass);
  plate.position.x = -0.25; plate.castShadow = true; g.add(plate);
  const rows = [{ y: 3.3, r: 1.0, kind: 'tab' }, { y: 0.3, r: 1.0, kind: 'tab' }, { y: -3.1, r: 1.45, kind: 'down' }];
  rows.forEach(function (rw) {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rw.r, rw.r, 1.6, 30), matBrass);
    hub.rotation.z = Math.PI / 2; hub.position.set(-1.05, rw.y, 0); hub.castShadow = true; g.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rw.r * 0.62, rw.r * 0.62, 0.5, 30), matBrassDk);
    cap.rotation.z = Math.PI / 2; cap.position.set(-1.95, rw.y, 0); g.add(cap);
    if (rw.kind === 'down') {
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.6, 0.5), matBlack);
      lv.position.set(-2.05, rw.y - 2.3, 0); lv.castShadow = true; g.add(lv);
    } else {
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 2.8), matBlack);
      lv.position.set(-2.05, rw.y, 1.5); lv.castShadow = true; g.add(lv);
    }
  });
}
/* Round hand-shower on an adjustable slide bar (the Tenzo Signature kit):
   two wall brackets, a vertical bar, an adjustable holder with a black clamp
   lever cradling a round multi-function hand shower, a wall supply elbow and the
   hose looping up to it. Built in local space where -x points into the room. */
function buildBarShower(g, f) {
  const L = f.barLen || 30, so = 2.6;                 // bar length, standoff from wall
  [L / 2 - 2, -L / 2 + 2].forEach(function (yb) {     // top + bottom brackets
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 32), matBrass);
    pad.rotation.z = Math.PI / 2; pad.position.set(-0.25, yb, 0); g.add(pad);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, so, 20), matBrass);
    post.rotation.z = Math.PI / 2; post.position.set(-so / 2, yb, 0); g.add(post);
  });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, L, 24), matBrass);
  bar.position.set(-so, 0, 0); bar.castShadow = true; g.add(bar);
  // adjustable holder + black clamp lever
  const hY = L * 0.14;
  const clamp = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.7, 28), matBrass);
  clamp.rotation.z = Math.PI / 2; clamp.position.set(-so, hY, 0); g.add(clamp);
  const clampLv = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.8, 16), matBlack);
  clampLv.rotation.x = Math.PI / 2; clampLv.position.set(-so, hY, 1.5); g.add(clampLv);
  // round hand shower cradled in the holder, angled up into the room
  const hand = new THREE.Group();
  hand.position.set(-so - 1.4, hY, 0); hand.rotation.z = 0.6;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.72, 7.0, 24), matBrass);
  handle.rotation.z = Math.PI / 2; handle.position.set(-2.4, 0, 0); handle.castShadow = true; hand.add(handle);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 24), matBrassDk);
  collar.rotation.z = Math.PI / 2; collar.position.set(-5.8, 0, 0); hand.add(collar);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.15, 1.2, 44), matBrass);
  face.rotation.z = Math.PI / 2; face.position.set(-6.8, 0, 0); face.castShadow = true; hand.add(face);
  const spray = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 0.28, 44), matBrassDk);
  spray.rotation.z = Math.PI / 2; spray.position.set(-7.45, 0, 0); hand.add(spray);
  g.add(hand);
  // wall supply elbow at the bottom + hose looping up to the hand shower
  const eY = -L / 2 + 0.5;
  const ePad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 32), matBrass);
  ePad.rotation.z = Math.PI / 2; ePad.position.set(-0.25, eY, 0); g.add(ePad);
  const elb = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 20), matBrass);
  elb.rotation.z = Math.PI / 2; elb.position.set(-1.4, eY, 0); g.add(elb);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, eY, 0),
    new THREE.Vector3(-7.0, eY - 4.5, 0),
    new THREE.Vector3(-6.4, hY - 9, 0),
    new THREE.Vector3(-so - 3.8, hY - 0.4, 0)
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 44, 0.5, 12, false), matBrassDk);
  hose.castShadow = true; g.add(hose);
}
function buildJet(g){
  g.add(localPlate(2.1, 0.5));
  const nz = new THREE.Mesh(new THREE.SphereGeometry(1.25,24,18), matBrassDk);
  nz.position.set(-1.15,0,0); g.add(nz);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.95,0.9,24), matBrass);
  tip.rotation.z = Math.PI/2; tip.position.set(-2.0,0,0); tip.castShadow = true; g.add(tip);
}
function buildHandle(g, f){
  const L = f.len, vert = f.orient === 'v';
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,L,20), matBrass);
  if(vert){ bar.position.set(2.4,0,0); }
  else { bar.rotation.x = Math.PI/2; bar.position.set(2.4,0,0); }
  bar.castShadow = true; g.add(bar);
  [-L/2 + 1.2, L/2 - 1.2].forEach(function(o){
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,2.4,16), matBrass);
    st.rotation.z = Math.PI/2;
    if(vert) st.position.set(1.2, o, 0); else st.position.set(1.2, 0, o);
    g.add(st);
    const st2 = st.clone(); st2.position.x = -1.2; g.add(st2);
  });
  const bar2 = bar.clone(); bar2.position.x = -2.4; g.add(bar2);
}
function buildDrainBody(g, f){
  const t = f.dtype;
  if(t === 'trench'){
    const L = f.tlen;
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, 0.7, 3.0), matSteel);
    body.position.y = 0.35; g.add(body);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(L-1.6, 0.35, 1.2), matBrassDk);
    slot.position.y = 0.62; g.add(slot);
  } else if(t === 'square5'){
    const body = new THREE.Mesh(new THREE.BoxGeometry(5,0.6,5), matSteel);
    body.position.y = 0.3; g.add(body);
    const gr = new THREE.Mesh(new THREE.BoxGeometry(3.6,0.35,3.6), matBrassDk);
    gr.position.y = 0.48; g.add(gr);
  } else {
    const r = t === 'round6' ? 3 : 2;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.6,44), matSteel);
    body.position.y = 0.3; g.add(body);
    const gr = new THREE.Mesh(new THREE.CylinderGeometry(r-0.7,r-0.7,0.35,44), matBrassDk);
    gr.position.y = 0.48; g.add(gr);
  }
}
function buildNicheBody(g, f){
  const nw = f.nw, nh = f.nh, nd = f.nd;
  const mB = surfMat('niche', nw, nh);
  const mT = surfMat('niche', nd, nw);
  plane(g, nw, nh, mB, [nd, 0, 0], [0, -Math.PI/2, 0]);
  plane(g, nd, nw, mT, [nd/2,  nh/2, 0], [Math.PI/2, 0, 0]);
  plane(g, nd, nw, mT, [nd/2, -nh/2, 0], [-Math.PI/2, 0, 0]);
  const mS = surfMat('niche', nd, nh);
  plane(g, nd, nh, mS, [nd/2, 0, -nw/2], [0, 0, 0]);
  plane(g, nd, nh, mS.clone ? mS : mS, [nd/2, 0,  nw/2], [0, Math.PI, 0]);
  const reveal = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(nw, nh)),
    new THREE.LineBasicMaterial({color:0xC39A61, transparent:true, opacity:0.6}));
  reveal.rotation.y = -Math.PI/2; reveal.position.set(0.12,0,0);
  g.add(reveal);
  const hit = new THREE.Mesh(new THREE.PlaneGeometry(nw, nh), new THREE.MeshBasicMaterial({visible:false}));
  hit.rotation.y = -Math.PI/2; hit.position.set(0.4,0,0);
  g.add(hit);
}

/* ---------- registry ---------- */
const fixtures = [];
let selected = null, labelsOn = true;

function rebuildBody(f){
  if(f.body){ f.group.remove(f.body); clearGroup(f.body); }
  f.body = new THREE.Group();
  f.build(f.body, f);
  f.body.traverse(function(o){ if(o.isMesh) o.userData.fix = f; });
  f.group.add(f.body);
}
function addFixture(spec){
  spec.group = new THREE.Group();
  (spec.parent || gFix).add(spec.group);
  spec.tag = new THREE.Group();
  const off = spec.tagOffset;
  const sp = makeLabel(spec.tagText, 0xE0C48F, spec.tagSmall);
  sp.position.set(off[0],off[1],off[2]);
  spec.tag.add(sp);
  line([[-1.5,0,0], off], 0xE0C48F, spec.tag, 0.55);
  spec.tag.visible = labelsOn;
  spec.group.add(spec.tag);
  spec.home = {host:spec.host, p:{x:spec.p.x, y:spec.p.y, z:spec.p.z}};
  fixtures.push(spec);
  rebuildBody(spec); placeFixture(spec);
  return spec;
}

/* ---------- annotation primitives ---------- */
const labelCache = {};
function makeLabel(text, color, small){
  const k = text+'|'+color+'|'+(small?1:0);
  let tex = labelCache[k];
  if(!tex){
    const pad = 16, fs = 46;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '500 '+fs+'px "IBM Plex Mono", monospace';
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(probe.measureText(text).width + pad*2);
    cv.height = Math.ceil(fs + pad*1.5);
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(11,16,20,0.80)'; g.fillRect(0,0,cv.width,cv.height);
    g.strokeStyle = '#'+color.toString(16).padStart(6,'0'); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(1,cv.height-1.5); g.lineTo(cv.width-1,cv.height-1.5); g.stroke();
    g.font = '500 '+fs+'px "IBM Plex Mono", monospace';
    g.fillStyle = '#'+color.toString(16).padStart(6,'0'); g.textBaseline = 'middle';
    g.fillText(text, pad, cv.height/2);
    tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding; tex.minFilter = THREE.LinearFilter;
    tex.userData = {ar: cv.width/cv.height};
    labelCache[k] = tex;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:false, depthWrite:false}));
  const hgt = small ? 3.0 : 3.9;
  sp.scale.set(hgt*tex.userData.ar, hgt, 1);
  sp.renderOrder = 999;
  return sp;
}
function addLabel(group, text, pos, color, small){
  const sp = makeLabel(text, color, small);
  sp.position.set(pos[0],pos[1],pos[2]); group.add(sp); return sp;
}
function line(pts, color, group, opacity){
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}));
  const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({color:color, transparent:true, opacity:opacity===undefined?0.9:opacity}));
  group.add(ln); return ln;
}
function dim(a, b, text, off, color, G){
  G = G || gDims;
  const A = new THREE.Vector3(a[0],a[1],a[2]), B = new THREE.Vector3(b[0],b[1],b[2]);
  const O = new THREE.Vector3(off[0],off[1],off[2]);
  const A2 = A.clone().add(O), B2 = B.clone().add(O);
  const c = color || 0x79AFC4;
  line([A.toArray(), A2.toArray()], c, G, 0.35);
  line([B.toArray(), B2.toArray()], c, G, 0.35);
  line([A2.toArray(), B2.toArray()], c, G, 0.95);
  const dir = B2.clone().sub(A2).normalize().multiplyScalar(2.0);
  const perp = O.clone().normalize().multiplyScalar(2.0);
  line([A2.clone().sub(dir).sub(perp).toArray(), A2.clone().add(dir).add(perp).toArray()], c, G, 0.95);
  line([B2.clone().sub(dir).sub(perp).toArray(), B2.clone().add(dir).add(perp).toArray()], c, G, 0.95);
  const mid = A2.clone().add(B2).multiplyScalar(0.5).add(O.clone().normalize().multiplyScalar(3.4));
  addLabel(G, text, mid.toArray(), 0xBEE0EC, true);
}

/* ---------- fixture instances ---------- */
const rainFix = addFixture({
  id:'rain', name:'Rain head', host:'ceiling', hostOptions:['ceiling'],
  p:{x:W/2, y:H, z:D/2}, headY:90, dia:12, shape:'round', locked:true,
  tagText:'1 · RAIN HEAD', tagOffset:[12,-4,0], build:buildRain,
  extra:[{key:'headY', label:'Head height AFF', min:66, max:H-3},
         {key:'dia',   label:'Face diameter',   min:6,  max:24}]
});
// (Wall-mounted shower head deleted from this kit — rain head + hand shower only.)
const valveFix = addFixture({
  id:'valve', name:'Control valve', host:'right', hostOptions:['right','left','back'],
  p:{x:W/2, y:48, z:D/2}, locked:true,
  tagText:'4 · VALVE', tagOffset:[-14,-9,0], build:buildValve
});
// Hand shower + slide bar on the TAP WALL (right), beside the valve — locked.
const barFix = addFixture({
  id:'bar', name:'Hand shower + bar', host:'right', hostOptions:['right','left','back'],
  p:{x:W/2, y:48, z:D/2 + 13}, barLen:30, locked:true,
  tagText:'3 · HAND SHOWER', tagOffset:[16,9,0], build:buildBarShower,
  extra:[{key:'barLen', label:'Slide bar length', min:18, max:42}]
});
const handleFix = addFixture({
  id:'handle', name:'Door handle', host:'glass', hostOptions:['glass'],
  p:{x:PANEL_W+DOOR_GAP+DOOR_W/2 + 8, y:CURB_H+38}, len:15, orient:'v',
  range:{x:[PANEL_W+DOOR_GAP+2.5, W-2.5], y:[CURB_H+9, GLASS_TOP-9]},
  tagText:'5 · HANDLE', tagOffset:[10,7,0], build:buildHandle,
  extra:[{key:'len', label:'Bar length', min:6, max:30}]
});
const DRAINS = [
  {id:'round4', name:'Round 4″',  note:'Standard 4″ round strainer on a four-way sloped pan.'},
  {id:'round6', name:'Round 6″',  note:'Oversized 6″ round — more open area, reads deliberate on a large-format floor.'},
  {id:'square5',name:'Square 5″', note:'Square tile-in strainer. Align it to the grout grid or it will fight the floor.'},
  {id:'trench', name:'Trench',    note:'Linear trench. Single-plane slope, so large-format floor tile can run uncut across the pan.'}
];
const drainFix = addFixture({
  id:'drain', name:'Drain', host:'floor', hostOptions:['floor'],
  p:{x:33.75, y:0, z:24}, dtype:'round4', tlen:W-8,
  tagText:'6 · DRAIN', tagOffset:[9,7,0], tagSmall:true, build:buildDrainBody,
  extra:[{key:'tlen', label:'Trench length', min:12, max:W-2}]
});
function buildDrain(){ if(drainFix) { rebuildBody(drainFix); placeFixture(drainFix); } }

const niches = [];
function addNiche(id, name, x, y, nw, nh){
  const n = addFixture({
    id:id, name:name, host:'back', hostOptions:['back','left','right'],
    p:{x:x, y:y, z:0}, nw:nw, nh:nh, nd:3.5, on:true, wallCut:true,
    tagText:name.toUpperCase(), tagSmall:true, tagOffset:[-11,7,0], build:buildNicheBody,
    extra:[{key:'nw', label:'Opening width',  min:10, max:44},
           {key:'nh', label:'Opening height', min:5,  max:34},
           {key:'nd', label:'Recess depth',   min:2,  max:5}]
  });
  niches.push(n);
  return n;
}
const nicheA = addNiche('niche','Niche', 32, 50, 26, 15);

const JET_ROWS = {0:[], 4:[42,54], 6:[34,46,58], 8:[30,40,50,60]};
const JET_COLS = [D/2 - 7, D/2 + 7];   // column pair centred on the wall
let jetFixtures = [], jetCount = 4;
const jetSaved = {};                    // id -> remembered placement, so a count change never loses work
function buildJets(n, forceDefaults){
  if(n === jetCount && jetFixtures.length && !forceDefaults) return;   // re-picking the same count is a no-op
  if(forceDefaults){ for(const k in jetSaved) delete jetSaved[k]; }
  else jetFixtures.forEach(function(f){
    jetSaved[f.id] = {host:f.host, x:f.p.x, y:f.p.y, z:f.p.z, locked:!!f.locked};
  });
  jetCount = n;
  jetFixtures.forEach(function(f){
    gJets.remove(f.group);
    const i = fixtures.indexOf(f); if(i>=0) fixtures.splice(i,1);
    if(selected === f) selected = null;
  });
  jetFixtures = [];
  const rows = JET_ROWS[n] || [];
  let k = 0;
  rows.forEach(function(y){
    JET_COLS.forEach(function(z){
      k++;
      const sv = jetSaved['jet'+k];
      const f = addFixture({
        id:'jet'+k, name:'Body jet '+k, host: sv ? sv.host : 'right', hostOptions:['right','left','back'],
        parent:gJets, p: sv ? {x:sv.x, y:sv.y, z:sv.z} : {x:W/2, y:y, z:z},
        tagText:'3.'+k, tagSmall:true, tagOffset:[-9,3.6,0], build:buildJet
      });
      f.locked = sv ? sv.locked : true;
      f.home = {host:'right', p:{x:W/2, y:y, z:z}};
      jetFixtures.push(f);
    });
  });
}
function resetPlacement(){
  fixtures.forEach(function(f){
    if(f.locked) return;
    f.host = f.home.host;
    f.p.x = f.home.p.x; f.p.y = f.home.p.y; f.p.z = f.home.p.z;
    rebuildBody(f); placeFixture(f);
  });
  rebuildWalls();
}

/* ---------- static annotation ---------- */
dim([0,0,D],[W,0,D],'51 1/2"',[0,-1,12]);
dim([W,0,0],[W,0,D],'48"',[14,-1,0]);
dim([0,0,0],[0,H,0],'96"',[-12,0,-4]);
dim([0,GLASS_TOP,D],[PANEL_W,GLASS_TOP,D],'22"',[0,6,4]);
dim([PANEL_W+DOOR_GAP,GLASS_TOP,D],[W,GLASS_TOP,D],'27 1/2"',[0,6,4]);
addLabel(gLabels,'GLASS FRONT  78"',[W/2, GLASS_TOP+9, D+6], 0xBFE0EC);

function rebuildFixDims(){
  clearGroup(gFixDims);
  gFixDims.visible = true;
  const f = selected || rainFix, c = 0xC39A61;
  if(f.host === 'ceiling'){
    dim([0,f.headY+3.5,f.p.z],[f.p.x,f.headY+3.5,f.p.z], fmtIn(f.p.x), [0,4,0], c, gFixDims);
    dim([f.p.x,H-0.4,0],[f.p.x,H-0.4,f.p.z], fmtIn(f.p.z), [0,-5,0], c, gFixDims);
  } else if(f.host === 'floor'){
    dim([0,0.5,f.p.z],[f.p.x,0.5,f.p.z], fmtIn(f.p.x), [0,6,0], c, gFixDims);
    dim([f.p.x,0.5,0],[f.p.x,0.5,f.p.z], fmtIn(f.p.z), [0,6,0], c, gFixDims);
  } else if(f.host === 'back' || f.host === 'glass'){
    const zz = f.host === 'glass' ? GLASS_Z + 1 : 0.4;
    dim([f.p.x,0,zz],[f.p.x,f.p.y,zz], fmtIn(f.p.y), [8,0,0], c, gFixDims);
    dim([0,f.p.y,zz],[f.p.x,f.p.y,zz], fmtIn(f.p.x), [0,8,0], c, gFixDims);
  } else {
    const wx = f.host === 'right' ? W-0.4 : 0.4, sg = f.host === 'right' ? -1 : 1;
    dim([wx,0,f.p.z],[wx,f.p.y,f.p.z], fmtIn(f.p.y), [sg*8,0,4], c, gFixDims);
    dim([wx,f.p.y,0],[wx,f.p.y,f.p.z], fmtIn(f.p.z), [sg*5,8,0], c, gFixDims);
  }
}

/* ---------- 6'-0" scale figure ---------- */
(function(){
  const skin = new THREE.MeshStandardMaterial({color:0x3A4750, roughness:0.85, metalness:0,
    transparent:true, opacity:0.62, envMapIntensity:0.3});
  function add(geo,x,y,z,rz){ const m = new THREE.Mesh(geo, skin); m.position.set(x,y,z); if(rz) m.rotation.z = rz; m.castShadow = true; gFigure.add(m); }
  add(new THREE.SphereGeometry(4.0,24,18), 0,68,0);
  add(new THREE.CylinderGeometry(1.7,2.1,4.5,16), 0,61.5,0);
  add(new THREE.CylinderGeometry(6.4,5.2,22,20), 0,48,0);
  add(new THREE.CylinderGeometry(5.2,4.6,6,20), 0,34.5,0);
  [-7.6,7.6].forEach(function(x){ add(new THREE.CylinderGeometry(1.9,1.5,25,14), x,46,0, x<0?0.08:-0.08); });
  [-3.6,3.6].forEach(function(x){ add(new THREE.CylinderGeometry(3.0,2.0,32,16), x,16,0); });
  gFigure.position.set(36,0,30); gFigure.rotation.y = -0.5;
})();

/* ============================================================
   CAMERA
   ============================================================ */
const target = new THREE.Vector3(W/2, 40, D/2);
const sph = {r:166, theta:0.72, phi:1.14};
const goal = {r:166, theta:0.72, phi:1.14, t:target.clone()};
function applyCamera(){
  const sp = Math.sin(sph.phi), cp = Math.cos(sph.phi);
  camera.position.set(target.x + sph.r*sp*Math.sin(sph.theta), target.y + sph.r*cp, target.z + sph.r*sp*Math.cos(sph.theta));
  camera.lookAt(target);
}
applyCamera();
const VIEWS = {
  iso:  {r:166, theta:0.72,   phi:1.14,   t:[W/2,40,D/2]},
  front:{r:150, theta:0.0,    phi:1.5707, t:[W/2,44,D/2]},
  bench:{r:146, theta:1.5707, phi:1.5000, t:[W/2,34,D/2]},
  plumb:{r:146, theta:-1.5707,phi:1.4800, t:[W/2,50,D/2]},
  back: {r:150, theta:Math.PI,phi:1.4800, t:[W/2,44,D/2]},
  plan: {r:118, theta:0.0,    phi:0.045,  t:[W/2,20,D/2]}
};
function setView(name){
  const v = VIEWS[name]; if(!v) return;
  goal.r = v.r; goal.phi = v.phi; goal.t.set(v.t[0],v.t[1],v.t[2]);
  let dt = v.theta - sph.theta;
  while(dt >  Math.PI) dt -= Math.PI*2;
  while(dt < -Math.PI) dt += Math.PI*2;
  goal.theta = sph.theta + dt;
}

let drag = null;
const el = renderer.domElement;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const dragPlane = new THREE.Plane(), hitPt = new THREE.Vector3();
let fixDrag = null, selHelper = null;

function setNDC(cx, cy){
  ndc.x = (cx/window.innerWidth)*2 - 1;
  ndc.y = -(cy/window.innerHeight)*2 + 1;
  ray.setFromCamera(ndc, camera);
}
function pickFixture(cx, cy){
  setNDC(cx, cy);
  const targets = [];
  fixtures.forEach(function(f){ if(f.body && f.group.visible) targets.push(f.body); });
  const hits = ray.intersectObjects(targets, true);
  for(let i=0;i<hits.length;i++) if(hits[i].object.userData.fix) return hits[i].object.userData.fix;
  return null;
}
function hostPlane(host){
  const h = HOSTS[host];
  dragPlane.setFromNormalAndCoplanarPoint(
    new THREE.Vector3(h.normal[0],h.normal[1],h.normal[2]).normalize(),
    new THREE.Vector3(h.point[0],h.point[1],h.point[2]));
}
function selectFixture(f){
  selected = f;
  if(selHelper){ scene.remove(selHelper); selHelper = null; }
  if(f && f.body){
    selHelper = new THREE.BoxHelper(f.body, 0xE8C88E);
    selHelper.material.depthTest = false; selHelper.material.transparent = true;
    selHelper.material.opacity = 0.95; selHelper.renderOrder = 998;
    scene.add(selHelper);
  }
  revealElement(f);
  renderPlacement(); rebuildFixDims(); renderFixtureRows(); renderBuildUI();
}
el.addEventListener('contextmenu', function(e){ e.preventDefault(); });
el.addEventListener('pointerdown', function(e){
  el.setPointerCapture(e.pointerId);
  const pan = (e.button === 2 || e.shiftKey);
  if(!pan && !designLocked){
    const f = pickFixture(e.clientX, e.clientY);
    if(f){
      if(selected !== f) selectFixture(f);
      if(f.locked){ drag = {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, pan:false, moved:false}; return; }
      hostPlane(f.host);
      const ax = HOSTS[f.host].a;
      fixDrag = {f:f, ax:ax, off:{}};
      if(ray.ray.intersectPlane(dragPlane, hitPt)){
        fixDrag.off[ax[0]] = f.p[ax[0]] - hitPt[ax[0]];
        fixDrag.off[ax[1]] = f.p[ax[1]] - hitPt[ax[1]];
      } else { fixDrag.off[ax[0]] = 0; fixDrag.off[ax[1]] = 0; }
      gFixDims.visible = false;
      drag = null; return;
    }
  }
  drag = {x:e.clientX, y:e.clientY, sx:e.clientX, sy:e.clientY, pan:pan, moved:false};
});
el.addEventListener('pointermove', function(e){
  if(fixDrag){
    setNDC(e.clientX, e.clientY);
    if(ray.ray.intersectPlane(dragPlane, hitPt)){
      fixDrag.ax.forEach(function(a){
        const v = Math.round((hitPt[a] + fixDrag.off[a])/SNAP)*SNAP;
        fixDrag.f.p[a] = clampAxis(fixDrag.f, a, v);
      });
      placeFixture(fixDrag.f);
      if(fixDrag.f.wallCut) rebuildWalls();
      updateFieldValues(); renderFixtureRows();
    }
    return;
  }
  if(!drag) return;
  if(Math.abs(e.clientX-drag.sx) + Math.abs(e.clientY-drag.sy) > 4) drag.moved = true;
  const dx = e.clientX-drag.x, dy = e.clientY-drag.y;
  drag.x = e.clientX; drag.y = e.clientY;
  if(drag.pan){
    const s = goal.r*0.0016;
    const right = new THREE.Vector3(); camera.getWorldDirection(right);
    right.cross(camera.up).normalize();
    const up = right.clone().cross(camera.getWorldDirection(new THREE.Vector3())).normalize();
    goal.t.addScaledVector(right, -dx*s).addScaledVector(up, -dy*s);
  } else {
    goal.theta += dx*0.0062;
    goal.phi = Math.min(1.556, Math.max(0.035, goal.phi + dy*0.0055));
  }
});
function endDrag(){
  if(fixDrag){ fixDrag = null; rebuildFixDims(); commit(); }
  else if(drag && !drag.moved && !drag.pan && selected){ selectFixture(null); }
  drag = null;
}
el.addEventListener('pointerup', endDrag);
el.addEventListener('pointercancel', endDrag);
el.addEventListener('wheel', function(e){
  e.preventDefault();
  goal.r = Math.min(560, Math.max(26, goal.r*(1 + Math.sign(e.deltaY)*0.085)));
}, {passive:false});
let pinch = 0;
el.addEventListener('touchstart', function(e){
  if(e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
}, {passive:true});
el.addEventListener('touchmove', function(e){
  if(e.touches.length === 2 && pinch){
    const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    goal.r = Math.min(560, Math.max(26, goal.r*(pinch/d))); pinch = d;
  }
}, {passive:true});
el.addEventListener('touchend', function(){ pinch = 0; });


/* ============================================================
   HISTORY — snapshot undo / redo over the whole design state
   ============================================================ */
const FIXKEYS = ['headY','dia','reach','len','orient','shape','dtype','tlen','nw','nh','nd','on','locked'];
let history = [], hptr = -1, applying = false;
function captureState(){
  return JSON.stringify({
    v: 2,
    lock: designLocked,
    surf: SURF_ORDER.map(function(id){ const s = SURF[id].spec; return [s.colour, s.size, s.pattern, s.grout, s.customW, s.customH]; }),
    bench: {t:BENCH.type, w:BENCH.wall, c:BENCH.corner, l:BENCH.len, d:BENCH.dep, h:BENCH.h, o:BENCH.off, g:BENCH.leg},
    metal: metalId,
    jets: jetCount,
    fx: fixtures.map(function(f){
      const o = {i:f.id, h:f.host, p:[f.p.x, f.p.y, f.p.z]};
      FIXKEYS.forEach(function(k){ if(f[k] !== undefined) o[k] = f[k]; });
      return o;
    })
  });
}
function applyState(json){
  let st;
  try { st = JSON.parse(json); } catch(e){ return false; }
  if(!st || !st.surf || !st.fx) return false;
  applying = true;
  try {
  SURF_ORDER.forEach(function(id, i){
    const a = st.surf[i];
    SURF[id].spec = {colour:a[0], size:a[1], pattern:a[2], grout:a[3], customW:a[4], customH:a[5]};
  });
  const bs = st.bench;
  BENCH.type = bs.t; BENCH.wall = bs.w; BENCH.corner = bs.c;
  BENCH.len = bs.l; BENCH.dep = bs.d; BENCH.h = bs.h; BENCH.off = bs.o; BENCH.leg = bs.g;
  applyMetal(st.metal || 'brass');
  setDesignLock(!!st.lock);
  if(jetCount !== 0) buildJets(0);   // body jets removed from this kit — never restore them
  st.fx.forEach(function(o){
    for(let k=0;k<fixtures.length;k++){
      const f = fixtures[k];
      if(f.id !== o.i) continue;
      f.host = o.h; f.p.x = o.p[0]; f.p.y = o.p[1]; f.p.z = o.p[2];
      FIXKEYS.forEach(function(kk){ if(o[kk] !== undefined) f[kk] = o[kk]; });
      if(f.on !== undefined) f.group.visible = f.on;
      rebuildBody(f); placeFixture(f);
      break;
    }
  });
  buildFloor(); buildCeiling(); buildLeftWall(); buildRightWall(); buildBackWall(); buildBench();
  selectFixture(null);
  syncControls(); renderTileUI(); renderBuildUI(); renderTileSchedule(); renderFixtureRows(); syncLockAll();
  rebuildFixDims(); updateSubline();
  } catch(e){ applying = false; return false; }
  applying = false;
  return true;
}
let designLocked = false;
/* the CSS is only presentation — this is the real guard. Capture phase on the
   document, so a click never reaches any handler that could mutate state.     */
const EDIT_ZONES = '#pane-tile, #build-tree, #place-fields, #place-host, #seg-hist,' +
                   '#btn-import, #btn-factory, #btn-restore, #place-lock, #place-centre, #place-reset';
['click','change','input','keydown'].forEach(function(ev){
  document.addEventListener(ev, function(e){
    if(!designLocked) return;
    const t = e.target && e.target.closest && e.target.closest(EDIT_ZONES);
    if(!t) return;
    e.stopImmediatePropagation();
    if(e.cancelable) e.preventDefault();
  }, true);
});
function setDesignLock(on){
  designLocked = !!on;
  document.body.classList.toggle('dlock', designLocked);
  const b = document.getElementById('t-designlock');
  if(b){ b.setAttribute('aria-pressed', designLocked ? 'true':'false');
         b.firstChild.textContent = designLocked ? 'Design locked' : 'Lock design'; }
  const bar = document.getElementById('lockbar');
  if(bar) bar.hidden = !designLocked;
  if(designLocked && selected) selectFixture(null);
  renderHistoryUI();
}
const SAVE_KEY = 'shower-enclosure-design-v2';
let saveTimer = null;
function setSaveState(t){ const e = document.getElementById('save-state'); if(e) e.textContent = t; }
function saveDesign(){
  clearTimeout(saveTimer);
  setSaveState('saving\u2026');
  saveTimer = setTimeout(async function(){
    try {
      if(window.storage && window.storage.set){
        await window.storage.set(SAVE_KEY, captureState());
        setSaveState('saved');
      } else setSaveState('local only');
    } catch(e){ setSaveState('not saved'); }
  }, 450);
}
async function loadDesign(quiet){
  try {
    if(!(window.storage && window.storage.get)) return false;
    const r = await window.storage.get(SAVE_KEY);
    if(!r || !r.value) return false;
    const st = JSON.parse(r.value);
    if(!st || st.v !== 2) return false;
    applyState(r.value);
    if(!quiet) setSaveState('restored');
    return true;
  } catch(e){ return false; }
}
function commit(){
  if(applying) return;
  const snap = captureState();
  if(history[hptr] === snap) return;
  history = history.slice(0, hptr + 1);
  history.push(snap);
  if(history.length > 80){ history.shift(); }
  hptr = history.length - 1;
  renderHistoryUI();
  saveDesign();
  platformMirror();
}
function undo(){ if(designLocked) return; if(hptr > 0){ hptr--; applyState(history[hptr]); renderHistoryUI(); } }
function redo(){ if(designLocked) return; if(hptr < history.length - 1){ hptr++; applyState(history[hptr]); renderHistoryUI(); } }
function syncLockAll(){
  const b = document.getElementById('t-lockall'); if(!b) return;
  const all = fixtures.length && lockedCount() === fixtures.length;
  b.setAttribute('aria-pressed', all ? 'true' : 'false');
  b.firstChild.textContent = lockedCount() ? ('Locked \u2014 ' + lockedCount() + ' of ' + fixtures.length) : 'Lock all fixtures';
}
function renderHistoryUI(){
  const u = document.getElementById('btn-undo'), r = document.getElementById('btn-redo');
  if(!u) return;
  u.disabled = designLocked || hptr <= 0;
  r.disabled = designLocked || hptr >= history.length - 1;
  document.getElementById('hist-hint').textContent =
    (hptr) + ' / ' + Math.max(0, history.length - 1) + ' steps';
}
function syncControls(){ /* the build tree renders straight from state */ }

/* ============================================================
   UI
   ============================================================ */
function $(id){ return document.getElementById(id); }
function toggle(id, fn){
  const b = $(id);
  b.addEventListener('click', function(){
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on?'true':'false'); fn(on);
  });
}
toggle('t-glass',  function(on){ gGlass.visible = on; handleFix.group.visible = on; });
toggle('t-dims',   function(on){ gDims.visible = on; });
toggle('t-labels', function(on){ labelsOn = on; gLabels.visible = on; fixtures.forEach(function(f){ f.tag.visible = on; }); });
toggle('t-figure', function(on){ gFigure.visible = on; });
toggle('t-lockall', function(on){
  fixtures.forEach(function(f){ f.locked = on; });
  renderPlacement(); renderFixtureRows(); renderBuildUI(); syncLockAll(); commit();
});

$('tabs').addEventListener('click', function(e){
  const b = e.target.closest('button'); if(!b) return;
  this.querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
  b.classList.add('on');
  ['spec','tile','build'].forEach(function(p){ $('pane-'+p).classList.toggle('on', p === b.dataset.p); });
});
$('views').addEventListener('click', function(e){
  const b = e.target.closest('button'); if(!b) return;
  this.querySelectorAll('button').forEach(function(x){ x.classList.remove('on'); });
  b.classList.add('on'); setView(b.dataset.v);
});
$('railtoggle').addEventListener('click', function(){ $('rail').classList.toggle('open'); });

/* ---------- placement card ---------- */
const fieldInputs = {};
function stepField(label, value, range, step, onChange, locked){
  const row = document.createElement('div'); row.className = 'field';
  const lb = document.createElement('label'); lb.textContent = label;
  const spin = document.createElement('div'); spin.className = 'spin';
  const minus = document.createElement('button'); minus.textContent = '\u2212';
  const inp = document.createElement('input');
  inp.type = 'number'; inp.step = step; inp.min = range[0]; inp.max = range[1]; inp.value = value;
  const plus = document.createElement('button'); plus.textContent = '+';
  const commit = function(v){
    v = Math.min(range[1], Math.max(range[0], v));
    v = Math.round(v/step)*step;
    inp.value = v; onChange(v);
  };
  minus.addEventListener('click', function(){ commit(parseFloat(inp.value) - step); });
  plus.addEventListener('click',  function(){ commit(parseFloat(inp.value) + step); });
  inp.addEventListener('change', function(){
    const v = parseFloat(inp.value);
    if(isNaN(v)){ inp.value = value; return; }      // bad input reverts, never jumps to the minimum
    commit(v);
  });
  spin.appendChild(minus); spin.appendChild(inp); spin.appendChild(plus);
  if(locked){ minus.disabled = plus.disabled = inp.disabled = true; spin.style.opacity = '.4'; }
  row.appendChild(lb); row.appendChild(spin);
  return {row:row, input:inp};
}
function renderPlacement(){
  const card = $('place');
  if(!selected){ card.hidden = true; return; }
  card.hidden = false;
  $('place-name').textContent = selected.name;
  const hostEl = $('place-host'); hostEl.innerHTML = '';
  const opts = selected.hostOptions || [selected.host];
  hostEl.style.display = opts.length > 1 ? 'flex' : 'none';
  opts.forEach(function(h){
    const b = document.createElement('button');
    b.textContent = HOSTS[h].label.replace(' wall','');
    if(h === selected.host) b.className = 'on';
    b.addEventListener('click', function(){ setHost(selected, h); renderPlacement(); rebuildFixDims(); renderFixtureRows(); commit(); });
    hostEl.appendChild(b);
  });
  const lk = $('place-lock');
  lk.setAttribute('aria-pressed', selected.locked ? 'true' : 'false');
  lk.firstChild.textContent = selected.locked ? 'Locked in place' : 'Lock in place';
  $('place-centre').disabled = !!selected.locked;
  hostEl.querySelectorAll('button').forEach(function(b){ b.disabled = !!selected.locked; });

  const wrap = $('place-fields'); wrap.innerHTML = '';
  for(const k in fieldInputs) delete fieldInputs[k];
  HOSTS[selected.host].a.forEach(function(a){
    const f = stepField(AXIS_LABEL[a], selected.p[a], rangeFor(selected,a), SNAP, function(v){
      selected.p[a] = v; placeFixture(selected);
      if(selected.wallCut) rebuildWalls();
      rebuildFixDims(); renderFixtureRows(); commit();
    }, selected.locked);
    fieldInputs[a] = f.input; wrap.appendChild(f.row);
  });
  (selected.extra || []).forEach(function(x){
    if(x.key === 'tlen' && selected.dtype !== 'trench') return;
    const f = stepField(x.label, selected[x.key], [x.min,x.max], SNAP, function(v){
      selected[x.key] = v; rebuildBody(selected);
      if(selected.wallCut) rebuildWalls();
      rebuildFixDims(); renderFixtureRows(); renderNicheUI(); commit();
    }, selected.locked);
    fieldInputs[x.key] = f.input; wrap.appendChild(f.row);
  });
}
function updateFieldValues(){
  if(!selected) return;
  HOSTS[selected.host].a.forEach(function(a){ if(fieldInputs[a]) fieldInputs[a].value = selected.p[a]; });
}
$('place-close').addEventListener('click', function(){ selectFixture(null); });
$('place-lock').addEventListener('click', function(){
  if(!selected) return;
  selected.locked = !selected.locked;
  renderPlacement(); renderFixtureRows(); renderBuildUI(); syncLockAll(); commit();
});
$('place-centre').addEventListener('click', function(){
  if(!selected) return;
  centreFixture(selected);
  renderPlacement(); rebuildFixDims(); renderFixtureRows(); renderBuildUI(); commit();
});
$('place-reset').addEventListener('click', function(){ resetPlacement(); renderPlacement(); rebuildFixDims(); renderFixtureRows(); commit(); });

/* ---------- live schedules ---------- */
function describe(f){
  if(f.host === 'ceiling') return fmtIn(f.p.x)+' L · '+fmtIn(f.p.z)+' B · '+fmtIn(f.headY)+' AFF';
  if(f.host === 'floor')   return fmtIn(f.p.x)+' L · '+fmtIn(f.p.z)+' B';
  if(f.host === 'back' || f.host === 'glass') return HOSTS[f.host].label.split(' ')[0]+' · '+fmtIn(f.p.x)+' L · '+fmtIn(f.p.y)+' AFF';
  return HOSTS[f.host].label.split(' ')[0]+' · '+fmtIn(f.p.z)+' B · '+fmtIn(f.p.y)+' AFF';
}
function renderFixtureRows(){
  const list = $('fixlist'); list.innerHTML = '';
  fixtures.forEach(function(f){
    const row = document.createElement('div');
    row.className = 'row fixrow' + (selected === f ? ' sel' : '');
    const k = document.createElement('span'); k.className = 'k'; k.textContent = f.name;
    const v = document.createElement('span'); v.className = 'v';
    v.textContent = (f.locked ? '\u25a0 ' : '') + describe(f);
    if(f.locked) v.style.color = 'var(--brass)';
    row.appendChild(k); row.appendChild(v);
    row.addEventListener('click', function(){ selectFixture(selected === f ? null : f); });
    list.appendChild(row);
  });
}
function renderTileSchedule(){
  const list = $('tilesched'); list.innerHTML = '';
  SURF_ORDER.forEach(function(id){
    const s = SURF[id], sz = sizeOf(s.spec.size);
    const pat = PATTERNS.filter(function(p){ return p.id === s.spec.pattern; })[0];
    const row = document.createElement('div'); row.className = 'row';
    const k = document.createElement('span'); k.className = 'k'; k.textContent = s.name;
    const v = document.createElement('span'); v.className = 'v';
    if(isLB(s.spec.colour)){
      const m = LBMAT[s.spec.colour.slice(3)];
      v.textContent = m.label + ' · 4684';
    } else {
      v.textContent = colourOf(s.spec.colour).name + ' · ' +
        (s.spec.pattern === 'hex-grid' ? Math.min(sz.w,sz.h)+'″ hex' : sz.name) + ' · ' + (pat ? pat.name : s.spec.pattern);
    }
    v.style.fontSize = '9.5px';
    row.appendChild(k); row.appendChild(v); list.appendChild(row);
  });
}

/* ---------- tile editor ---------- */
let uiSurf = 'back', uiColl = 'natural';
const BUILDERS = {floor:buildFloor, back:buildBackWall, left:buildLeftWall, right:buildRightWall,
                  ceiling:buildCeiling, bench:buildBench, niche:rebuildNiches};
function rebuildNiches(){ niches.forEach(function(n){ rebuildBody(n); placeFixture(n); }); rebuildWalls(); }
function applySurface(id){ BUILDERS[id](); renderTileSchedule(); commit(); }

function chip(label, on, fn, wide){
  const b = document.createElement('button');
  b.className = 'chip' + (on?' on':'') + (wide?' wide':'');
  b.textContent = label; b.addEventListener('click', fn);
  return b;
}
function renderTileUI(){
  const spec = SURF[uiSurf].spec;
  const sc = $('surf-chips'); sc.innerHTML = '';
  SURF_ORDER.forEach(function(id){
    sc.appendChild(chip(SURF[id].name, id === uiSurf, function(){ uiSurf = id; uiColl = collOf(SURF[id].spec.colour).id; renderTileUI(); }, true));
  });
  const cc = $('coll-chips'); cc.innerHTML = '';
  COLLECTIONS.forEach(function(c){
    cc.appendChild(chip(c.name, c.id === uiColl, function(){ uiColl = c.id; renderTileUI(); }));
  });
  const coll = COLLECTIONS.filter(function(c){ return c.id === uiColl; })[0];
  $('coll-note').textContent = coll.note;

  const cs = $('colour-sw'); cs.innerHTML = '';
  coll.colours.forEach(function(c){
    const b = document.createElement('button');
    b.className = 'sw-btn' + (c.id === spec.colour ? ' on' : '');
    const ch = document.createElement('div'); ch.className = 'sw-chip';
    if(c.lb){
      ch.style.backgroundImage = 'url('+LB.tex[c.lb.id].baseColor+')';
      ch.style.backgroundSize = '150% 150%';
      ch.style.backgroundPosition = 'center';
      ch.style.height = '46px';
    } else {
      ch.style.background = hex(c.base);
    }
    const nm = document.createElement('div'); nm.className = 'sw-name'; nm.textContent = c.name;
    b.appendChild(ch); b.appendChild(nm);
    b.addEventListener('click', function(){
      spec.colour = c.id;
      if(c.lb){
        if(LAYS[c.lb.lay]) spec.pattern = c.lb.lay;
        if(c.lb.grout && groutOf(c.lb.grout).id === c.lb.grout) spec.grout = c.lb.grout;
      }
      applySurface(uiSurf); renderTileUI();
    });
    cs.appendChild(b);
  });

  // sample-book materials bake their lay pattern + grout into the maps, but a
  // tiled one can still be laid at any (or custom) tile SIZE, so keep Size shown
  const isBook = !!coll.lookbook;
  const bookTiled = isBook && isLB(spec.colour) && !!(LBMAT[spec.colour.slice(3)] && LBMAT[spec.colour.slice(3)].tile);
  $('sec-size').style.display  = (isBook && !bookTiled) ? 'none' : '';
  $('sec-pat').style.display   = isBook ? 'none' : '';
  $('sec-grout').style.display = isBook ? 'none' : '';
  const meta = $('lb-meta'); meta.innerHTML = '';
  if(isBook && isLB(spec.colour)){
    const m = LBMAT[spec.colour.slice(3)];
    const wrap = document.createElement('div'); wrap.className = 'lb-meta';
    const gsw = LB.grouts.filter(function(x){ return x.id === m.grout; })[0];
    [['Category', m.category + ' \u00b7 ' + m.finish],
     ['Suggested use', m.use],
     ['Nominal tile', m.tile ? m.tile[0] + ' \u00d7 ' + m.tile[1] + ' mm' : 'continuous'],
     ['Lay pattern', (LAYS[m.lay] ? LAYS[m.lay].label : (m.lay.charAt(0).toUpperCase() + m.lay.slice(1) + ' \u2014 continuous'))],
     ['Grout', gsw ? gsw.label + ' \u00b7 ' + m.gw + ' mm' : '\u2014'],
     ['Physical repeat', m.rep[0] + ' \u00d7 ' + m.rep[1] + ' m'],
     ['Maps', 'base \u00b7 normal +Y \u00b7 ORM']
    ].forEach(function(r){
      const row = document.createElement('div'); row.className = 'row';
      const k = document.createElement('span'); k.className = 'k'; k.textContent = r[0];
      const v = document.createElement('span'); v.className = 'v'; v.textContent = r[1];
      row.appendChild(k); row.appendChild(v); wrap.appendChild(row);
    });
    meta.appendChild(wrap);
  }
  const zs = $('size-chips'); zs.innerHTML = '';
  SIZES.forEach(function(s){
    zs.appendChild(chip(s.name, s.id === spec.size, function(){ spec.size = s.id; applySurface(uiSurf); renderTileUI(); }));
  });
  zs.appendChild(chip('Custom…', spec.size === 'custom', function(){
    spec.size = 'custom'; if(spec.customW == null) spec.customW = 12; if(spec.customH == null) spec.customH = 12;
    applySurface(uiSurf); renderTileUI();
  }));
  if(spec.size === 'custom'){
    const row = document.createElement('div'); row.className = 'minirow'; row.style.cssText = 'margin-top:6px;gap:5px;align-items:center';
    const mk = function(k){
      const inp = document.createElement('input'); inp.type = 'number'; inp.step = '0.25'; inp.min = '0.5'; inp.max = '120';
      inp.value = spec[k] == null ? 12 : spec[k];
      inp.style.cssText = 'width:60px;font:inherit;background:#141210;color:#e8e3d8;border:1px solid rgba(255,255,255,0.25);border-radius:2px;padding:3px 5px';
      inp.addEventListener('change', function(){ spec[k] = Math.max(0.5, Math.min(120, +inp.value || 12)); applySurface(uiSurf); renderTileUI(); });
      return inp;
    };
    const lab = function(t){ const s = document.createElement('span'); s.textContent = t; s.style.color = '#9a948c'; return s; };
    row.appendChild(mk('customW')); row.appendChild(lab('×')); row.appendChild(mk('customH')); row.appendChild(lab('in'));
    zs.appendChild(row);
  }
  const ps = $('pat-chips'); ps.innerHTML = '';
  PATTERNS.forEach(function(p){
    ps.appendChild(chip(p.name, p.id === spec.pattern, function(){ spec.pattern = p.id; applySurface(uiSurf); renderTileUI(); }));
  });
  const patSel = PATTERNS.filter(function(p){ return p.id === spec.pattern; })[0];
  $('pat-note').textContent = patSel ? patSel.note : '';

  const gs = $('grout-sw'); gs.innerHTML = '';
  GROUTS.forEach(function(g){
    const b = document.createElement('button');
    b.className = 'gr-btn' + (g.id === spec.grout ? ' on' : '');
    b.title = g.name;
    b.style.background = g.c ? hex(g.c) : 'linear-gradient(135deg,'+hex(colourOf(spec.colour).base)+' 50%, #000 200%)';
    b.addEventListener('click', function(){ spec.grout = g.id; applySurface(uiSurf); renderTileUI(); });
    gs.appendChild(b);
  });
  $('surf-note').textContent = isLB(spec.colour)
    ? SURF[uiSurf].name + ' — ' + LBMAT[spec.colour.slice(3)].label + ' (4684 sample book).'
    : SURF[uiSurf].name + ' — ' + colourOf(spec.colour).name + ', ' + resolveSize(spec).name + ', ' + groutOf(spec.grout).name + ' grout.';
}
$('apply-walls').addEventListener('click', function(){
  const s = SURF[uiSurf].spec;
  ['back','left','right'].forEach(function(id){
    SURF[id].spec = {colour:s.colour, size:s.size, pattern:s.pattern, grout:s.grout, customW:s.customW, customH:s.customH};
    applySurface(id);
  });
  renderTileUI();
});
$('apply-every').addEventListener('click', function(){
  const s = SURF[uiSurf].spec;
  SURF_ORDER.forEach(function(id){
    SURF[id].spec = {colour:s.colour, size:s.size, pattern:s.pattern, grout:s.grout, customW:s.customW, customH:s.customH};
    applySurface(id);
  });
  renderTileUI();
});

/* ============================================================
   BUILD TREE — categories nest elements, elements nest controls
   ============================================================ */
const BENCH_OPTS = [
  {id:'full',  name:'Full 48\u2033',  note:'Full-depth bench on the left wall, 16\u2033 seat. Most seating, tightest standing zone.'},
  {id:'half',  name:'Half 24\u2033',  note:'Half bench held to the back wall. Front half of the left wall stays open for entry.'},
  {id:'small', name:'Small 20\u2033',  note:'Compact seat, 20\u2033 long \u00d7 12\u2033 deep, held to the back-left corner. Enough to sit or prop a foot without eating the standing zone.'},
  {id:'corner',name:'Corner',        note:'Triangular corner bench, 24\u2033 legs, 33 15/16\u2033 hypotenuse. Least floor taken, 288 sq in of seat.'},
  {id:'none',  name:'None',          note:'No bench. Curb remains.'},
  {id:'custom',name:'Custom',        note:'Dimensions edited off a preset. Length, depth, height, wall and start position are all free.'}
];
function benchPresetMatch(){
  if(BENCH.type === 'none' || BENCH.type === 'corner') return BENCH.type;
  const pre = BENCH_PRESETS[BENCH.type];
  if(pre && pre.len === BENCH.len && pre.dep === BENCH.dep && pre.wall === BENCH.wall && BENCH.off === 0) return BENCH.type;
  return 'custom';
}
const BUILD_TREE = [
  {id:'finish',    name:'Metal finish', els:['metal']},
  {id:'enclosure', name:'Enclosure', els:['glass','handle']},
  {id:'seating',   name:'Seating',   els:['bench']},
  {id:'water',     name:'Water',     els:['rain','bar','valve']},
  {id:'drainage',  name:'Drainage',  els:['drain']},
  {id:'storage',   name:'Storage',   els:['niche']}
];
const treeOpen = {finish:true, enclosure:false, seating:true, water:true, drainage:false, storage:false};
const elOpen = {};

function fixById(id){
  for(let i=0;i<fixtures.length;i++) if(fixtures[i].id === id) return fixtures[i];
  return null;
}
function segRow(opts, current, onPick){
  const d = document.createElement('div'); d.className = 'seg';
  opts.forEach(function(o){
    const b = document.createElement('button');
    b.textContent = o.name;
    if(o.id === current) b.className = 'on';
    b.addEventListener('click', function(e){ e.stopPropagation(); onPick(o.id); });
    d.appendChild(b);
  });
  return d;
}
function chipRow(opts, current, onPick, wide){
  const d = document.createElement('div'); d.className = 'chips';
  opts.forEach(function(o){
    d.appendChild(chip(o.name, o.id === current, function(e){ e.stopPropagation(); onPick(o.id); }, wide));
  });
  return d;
}
function noteEl(t){ const p = document.createElement('p'); p.className = 'el-note'; p.textContent = t; return p; }
function posFields(node, f, keys){
  (keys || HOSTS[f.host].a).forEach(function(a){
    const fl = stepField(AXIS_LABEL[a], f.p[a], rangeFor(f,a), SNAP, function(v){
      f.p[a] = v; placeFixture(f);
      if(f.wallCut) rebuildWalls();
      rebuildFixDims(); renderFixtureRows(); renderBuildUI(); commit();
    });
    node.appendChild(fl.row);
  });
}
function extraFields(node, f, only){
  (f.extra || []).forEach(function(x){
    if(only && only.indexOf(x.key) < 0) return;
    if(x.key === 'tlen' && f.dtype !== 'trench') return;
    const fl = stepField(x.label, f[x.key], [x.min,x.max], SNAP, function(v){
      f[x.key] = v; rebuildBody(f);
      if(f.wallCut) rebuildWalls();
      rebuildFixDims(); renderFixtureRows(); renderBuildUI(); commit();
    });
    node.appendChild(fl.row);
  });
}
function locateBtn(node, f){
  const lk = document.createElement('button');
  lk.className = 'tog'; lk.setAttribute('aria-pressed', f.locked ? 'true' : 'false');
  lk.innerHTML = (f.locked ? 'Locked in place' : 'Lock in place') + '<span class="sw"></span>';
  lk.addEventListener('click', function(e){
    e.stopPropagation(); f.locked = !f.locked;
    renderBuildUI(); renderFixtureRows(); renderPlacement(); syncLockAll(); commit();
  });
  node.appendChild(lk);
  const row = document.createElement('div'); row.className = 'minirow';
  const c = document.createElement('button');
  c.className = 'mini'; c.textContent = 'Centre'; c.disabled = !!f.locked;
  c.addEventListener('click', function(e){
    e.stopPropagation(); centreFixture(f);
    rebuildFixDims(); renderFixtureRows(); renderBuildUI(); renderPlacement(); commit();
  });
  const b = document.createElement('button');
  b.className = 'mini alt';
  b.textContent = selected === f ? 'Deselect' : 'Select in view';
  b.addEventListener('click', function(e){ e.stopPropagation(); selectFixture(selected === f ? null : f); });
  row.appendChild(c); row.appendChild(b);
  node.appendChild(row);
}

const ELEMENTS = {
  metal: {
    name:'Taps, heads + trim',
    summary:function(){ return metalOf(metalId).name; },
    body:function(n){
      const g = document.createElement('div'); g.className = 'swatches';
      METALS.forEach(function(f){
        const b = document.createElement('button');
        b.className = 'sw-btn' + (f.id === metalId ? ' on' : '');
        const ch = document.createElement('div'); ch.className = 'sw-chip';
        ch.style.background = 'linear-gradient(140deg,' + f.sw + ' 0%, ' + f.sw + ' 42%, rgba(0,0,0,.42) 100%)';
        const nm = document.createElement('div'); nm.className = 'sw-name'; nm.textContent = f.name;
        b.appendChild(ch); b.appendChild(nm);
        b.addEventListener('click', function(e){ e.stopPropagation(); applyMetal(f.id); renderBuildUI(); commit(); });
        g.appendChild(b);
      });
      n.appendChild(g);
      n.appendChild(noteEl(metalOf(metalId).note));
      n.appendChild(noteEl('Applies to the rain head, shower head, body jets, valve, drain grate, door hinges and pull \u2014 one finish across the enclosure.'));
    }
  },
  glass: {
    name:'Glass front',
    summary:function(){ return '22\u2033 + 27\u00bd\u2033 \u00b7 78\u2033'; },
    body:function(n){
      [['Fixed panel (left)','22\u2033'],['Hinged door (right)','27 1/2\u2033'],
       ['Glass height','78\u2033'],['Curb','4\u2033 H \u00d7 4 1/2\u2033 W'],
       ['Hinge side','Fixed panel \u00b7 swings right']].forEach(function(r){
        const row = document.createElement('div'); row.className = 'row';
        const k = document.createElement('span'); k.className = 'k'; k.textContent = r[0];
        const v = document.createElement('span'); v.className = 'v'; v.textContent = r[1];
        row.appendChild(k); row.appendChild(v); n.appendChild(row);
      });
      n.appendChild(noteEl('Toggle glass visibility from the Display card.'));
    }
  },
  handle: {
    fix:'handle',
    name:'Door handle',
    summary:function(f){ return (f.orient === 'v' ? 'Vertical' : 'Horizontal') + ' \u00b7 ' + fmtIn(f.len); },
    body:function(n, f){
      n.appendChild(segRow([{id:'v',name:'Vertical'},{id:'h',name:'Flip 90\u00b0'}], f.orient, function(o){
        f.orient = o; rebuildBody(f); renderBuildUI(); commit();
      }));
      extraFields(n, f, ['len']);
      posFields(n, f);
      locateBtn(n, f);
    }
  },
  bench: {
    name:'Tile bench',
    summary:function(){
      if(BENCH.type === 'none') return 'None';
      if(BENCH.type === 'corner') return 'Corner ' + fmtIn(BENCH.leg);
      return fmtIn(BENCH.len) + ' \u00d7 ' + fmtIn(BENCH.dep) + ' \u00b7 ' + BENCH.wall;
    },
    body:function(n){
      n.appendChild(chipRow(BENCH_OPTS, benchPresetMatch(), function(id){
        BENCH.type = id;
        const pre = BENCH_PRESETS[id];
        if(pre) for(const k in pre) BENCH[k] = pre[k];
        buildBench(); renderBuildUI(); updateSubline(); commit();
      }));
      n.appendChild(noteEl(BENCH_OPTS.filter(function(o){ return o.id === BENCH.type; })[0].note));
      if(BENCH.type === 'none') return;

      function num(label, key, min, max){
        const f = stepField(label, BENCH[key], [min, max], SNAP, function(v){
          BENCH[key] = v; buildBench(); renderBuildUI(); updateSubline(); commit();
        });
        n.appendChild(f.row);
      }
      if(BENCH.type === 'corner'){
        const cs = document.createElement('p'); cs.className = 'card-sub'; cs.textContent = 'Corner';
        n.appendChild(cs);
        n.appendChild(segRow([{id:'bl',name:'Back left'},{id:'br',name:'Back right'}], BENCH.corner, function(v){
          BENCH.corner = v; buildBench(); renderBuildUI(); updateSubline(); commit();
        }));
        num('Leg length', 'leg', 12, Math.min(W, D) - 6);
        num('Seat height', 'h', 14, 24);
        const hyp = document.createElement('div'); hyp.className = 'row';
        hyp.innerHTML = '<span class="k">Hypotenuse</span><span class="v">' + fmtIn(Math.SQRT2*BENCH.leg) + '</span>';
        n.appendChild(hyp);
      } else {
        const cs = document.createElement('p'); cs.className = 'card-sub'; cs.textContent = 'Wall';
        n.appendChild(cs);
        n.appendChild(segRow([{id:'left',name:'Left'},{id:'right',name:'Right'},{id:'back',name:'Back'}], BENCH.wall, function(v){
          BENCH.wall = v; buildBench(); renderBuildUI(); updateSubline(); commit();
        }));
        num('Length', 'len', 8, wallRun());
        num('Seat depth', 'dep', 8, 24);
        num('Seat height', 'h', 14, 24);
        num('From wall start', 'off', 0, Math.max(0, wallRun() - BENCH.len));
        const area = document.createElement('div'); area.className = 'row';
        area.innerHTML = '<span class="k">Seat area</span><span class="v">' +
          (BENCH.len*BENCH.dep).toFixed(0) + ' sq in \u00b7 ' + (BENCH.len*BENCH.dep/144).toFixed(1) + ' sq ft</span>';
        n.appendChild(area);
      }
    }
  },
  rain: {
    fix:'rain',
    name:'Rain head',
    summary:function(f){ return (f.shape === 'square' ? 'Square' : 'Round') + ' ' + fmtIn(f.dia) + ' \u00b7 ' + fmtIn(f.headY); },
    body:function(n, f){
      n.appendChild(segRow([{id:'round',name:'Round'},{id:'square',name:'Square'}], f.shape, function(sh){
        f.shape = sh; rebuildBody(f); renderBuildUI(); commit();
      }));
      extraFields(n, f);
      posFields(n, f);
      locateBtn(n, f);
    }
  },
  bar: {
    fix:'bar',
    name:'Hand shower + bar',
    summary:function(f){ return 'Round \u00b7 ' + fmtIn(f.barLen) + ' bar'; },
    body:function(n, f){
      extraFields(n, f);
      posFields(n, f);
      locateBtn(n, f);
    }
  },
  jets: {
    name:'Body jets',
    summary:function(){ return jetCount ? jetCount + ' \u00b7 2 columns' : 'None'; },
    body:function(n){
      n.appendChild(segRow([{id:0,name:'0'},{id:4,name:'4'},{id:6,name:'6'},{id:8,name:'8'}], jetCount, function(v){
        buildJets(v); selectFixture(null); renderFixtureRows(); renderBuildUI(); commit();
      }));
      n.appendChild(noteEl('Two columns centred on the wall at ' + fmtIn(JET_COLS[0]) + ' and ' + fmtIn(JET_COLS[1]) +
        ' from the back. Each jet then moves independently, and changing the count no longer disturbs the ones you have already placed.'));
      const row = document.createElement('div'); row.className = 'minirow';
      const rc = document.createElement('button');
      rc.className = 'mini'; rc.textContent = 'Re-centre all jets';
      rc.addEventListener('click', function(e){
        e.stopPropagation();
        buildJets(jetCount, true); selectFixture(null);
        renderFixtureRows(); renderBuildUI(); commit();
      });
      row.appendChild(rc); n.appendChild(row);
    }
  },
  valve: {
    fix:'valve',
    name:'Control valve',
    summary:function(f){ return fmtIn(f.p.y) + ' AFF'; },
    body:function(n, f){ posFields(n, f); locateBtn(n, f); }
  },
  drain: {
    fix:'drain',
    name:'Drain',
    summary:function(f){ return DRAINS.filter(function(o){ return o.id === f.dtype; })[0].name; },
    body:function(n, f){
      n.appendChild(chipRow(DRAINS, f.dtype, function(id){
        f.dtype = id;
        f.range = (id === 'trench') ? {x:[W/2, W/2], z:[4, D-6]} : null;
        if(id === 'trench'){ f.p.z = 8; f.p.x = W/2; }
        rebuildBody(f); placeFixture(f);
        renderBuildUI(); renderFixtureRows(); renderPlacement(); syncLockAll(); commit();
      }));
      n.appendChild(noteEl(DRAINS.filter(function(o){ return o.id === f.dtype; })[0].note));
      extraFields(n, f);
      posFields(n, f);
      locateBtn(n, f);
    }
  }
};
['niche'].forEach(function(id){
  ELEMENTS[id] = {
    fix:id,
    name:'Niche',
    summary:function(f){ return f.on ? fmtIn(f.nw) + ' \u00d7 ' + fmtIn(f.nh) + ' \u00b7 ' + f.host : 'Off'; },
    body:function(n, f){
      const t = document.createElement('button');
      t.className = 'tog'; t.setAttribute('aria-pressed', f.on ? 'true' : 'false');
      t.innerHTML = 'Recessed into back wall<span class="sw"></span>';
      t.addEventListener('click', function(e){
        e.stopPropagation();
        f.on = !f.on; f.group.visible = f.on;
        if(!f.on && selected === f) selectFixture(null);
        rebuildWalls(); renderBuildUI(); commit();
      });
      n.appendChild(t);
      if(!f.on) return;
      const cs = document.createElement('p'); cs.className = 'card-sub'; cs.textContent = 'Wall';
      n.appendChild(cs);
      n.appendChild(segRow([{id:'back',name:'Back'},{id:'left',name:'Left'},{id:'right',name:'Right'}], f.host, function(v){
        setHost(f, v); rebuildWalls(); renderBuildUI(); renderFixtureRows(); rebuildFixDims(); commit();
      }));
      extraFields(n, f);
      posFields(n, f);
      locateBtn(n, f);
    }
  };
});

function renderBuildUI(){
  const root = $('build-tree'); if(!root) return;
  root.innerHTML = '';
  BUILD_TREE.forEach(function(cat){
    const c = document.createElement('section');
    c.className = 'cat' + (treeOpen[cat.id] ? ' open' : '');
    const h = document.createElement('button');
    h.className = 'cat-h';
    h.innerHTML = '<span class="caret">\u25b6</span>' + cat.name + '<span class="count">' + cat.els.length + '</span>';
    h.addEventListener('click', function(){ treeOpen[cat.id] = !treeOpen[cat.id]; renderBuildUI(); });
    c.appendChild(h);
    const body = document.createElement('div'); body.className = 'cat-body';
    cat.els.forEach(function(eid){
      const def = ELEMENTS[eid]; if(!def) return;
      const f = def.fix ? fixById(def.fix) : null;
      if(def.fix && !f) return;
      const e = document.createElement('div');
      e.className = 'el' + (elOpen[eid] ? ' open' : '') + (f && selected === f ? ' sel' : '');
      const eh = document.createElement('button');
      eh.className = 'el-h';
      eh.innerHTML = '<span class="caret">\u25b6</span><span class="nm">' + def.name +
                     '</span><span class="sm">' + def.summary(f) + '</span>';
      eh.addEventListener('click', function(){ elOpen[eid] = !elOpen[eid]; renderBuildUI(); });
      e.appendChild(eh);
      const eb = document.createElement('div'); eb.className = 'el-body';
      if(elOpen[eid]) def.body(eb, f);
      e.appendChild(eb);
      body.appendChild(e);
    });
    c.appendChild(body);
    root.appendChild(c);
  });
}
function renderNicheUI(){ renderBuildUI(); }
function revealElement(f){
  if(!f) return;
  for(let i=0;i<BUILD_TREE.length;i++){
    const cat = BUILD_TREE[i];
    for(let j=0;j<cat.els.length;j++){
      const def = ELEMENTS[cat.els[j]];
      if(def && def.fix === f.id){ treeOpen[cat.id] = true; elOpen[cat.els[j]] = true; return; }
    }
  }
}
function updateSubline(){
  const m = benchPresetMatch();
  const b = BENCH_OPTS.filter(function(o){ return o.id === m; })[0];
  $('subline').textContent = (b ? b.name : 'Custom') + ' bench \u00b7 glass front';
}

const FACTORY = captureState();
const io = $('spec-io'), ioHint = $('io-hint');
let ioMode = null;
function showIO(mode, text, hint){
  ioMode = mode; io.hidden = false; ioHint.hidden = false;
  io.classList.toggle('tall', mode === 'spec');
  io.value = text; ioHint.textContent = hint;
  if(mode === 'export'){ io.select && io.select(); }
  else io.focus();
}
function hideIO(){ ioMode = null; io.hidden = true; ioHint.hidden = true; }
$('btn-export').addEventListener('click', function(){
  const json = captureState();
  showIO('export', json, 'Select all and copy. Paste it back into any later version.');
  try { navigator.clipboard && navigator.clipboard.writeText(json).then(function(){
    ioHint.textContent = 'Copied to clipboard \u2014 paste into any later version.'; }); } catch(e){}
});
$('btn-import').addEventListener('click', function(){
  if(ioMode === 'import'){
    const ok = applyState(io.value.trim());
    ioHint.textContent = ok ? 'Spec applied.' : 'That does not look like a saved spec.';
    if(ok){ commit(); setTimeout(hideIO, 900); }
    return;
  }
  showIO('import', '', 'Paste a saved spec, then press Paste spec again to apply.');
});
$('btn-restore').addEventListener('click', async function(){
  const ok = await loadDesign();
  setSaveState(ok ? 'restored' : 'nothing saved');
  if(ok) hideIO();
});
$('btn-factory').addEventListener('click', function(){
  applyState(FACTORY); commit(); hideIO(); setSaveState('reset');
});
$('t-designlock').addEventListener('click', function(){
  setDesignLock(!designLocked);
  commit();
  if(designLocked) showIO('spec', specSheet(), 'Design frozen. This sheet is the record \u2014 copy it somewhere safe.');
  else hideIO();
});

/* ---------- written specification of the frozen design ---------- */
function specSheet(){
  const pad = function(t, n){ t = String(t); return t + ' '.repeat(Math.max(1, n - t.length)); };
  const L = [];
  const d = new Date();
  L.push('SHOWER ENCLOSURE \u2014 DESIGN SPECIFICATION');
  L.push('Locked ' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') +
         '   All dimensions in inches, model 1:1');
  L.push('');
  L.push('ENVELOPE');
  L.push('  ' + pad('Width (glass front)', 26) + '51 1/2"');
  L.push('  ' + pad('Depth (front to back)', 26) + '48"');
  L.push('  ' + pad('Ceiling height', 26) + '96"');
  L.push('');
  L.push('GLASS FRONT');
  L.push('  ' + pad('Fixed panel (left)', 26) + '22"');
  L.push('  ' + pad('Hinged door (right)', 26) + '27 1/2"  hinged off the panel, swings right');
  L.push('  ' + pad('Glass height', 26) + '78"   on a 4" H x 4 1/2" W curb');
  L.push('  ' + pad('Handle', 26) + (handleFix.orient === 'v' ? 'Vertical' : 'Horizontal') + '  ' +
         fmtIn(handleFix.len) + ' bar, ' + fmtIn(handleFix.p.x) + ' from left, ' + fmtIn(handleFix.p.y) + ' AFF');
  L.push('');
  L.push('TILE SCHEDULE');
  SURF_ORDER.forEach(function(id){
    const sp = SURF[id].spec;
    let desc;
    if(isLB(sp.colour)){
      const m = LBMAT[sp.colour.slice(3)];
      desc = m.label + '  [4684 sample book, ' + m.category + '/' + m.finish + ', repeat ' + m.rep[0] + 'x' + m.rep[1] + ' m]';
    } else {
      const pat = PATTERNS.filter(function(x){ return x.id === sp.pattern; })[0];
      const sz = resolveSize(sp);
      desc = colourOf(sp.colour).name + '  ' + (sp.pattern === 'hex-grid' ? Math.min(sz.w,sz.h) + '" hex' : sz.name) +
             '  ' + (pat ? pat.name : sp.pattern) + '  /  ' + groutOf(sp.grout).name + ' grout';
    }
    L.push('  ' + pad(SURF[id].name, 18) + desc);
  });
  L.push('');
  L.push('METAL FINISH');
  L.push('  ' + pad('All trim', 26) + metalOf(metalId).name);
  L.push('  ' + 'Rain head, shower head, body jets, valve, drain grate, hinges, pull.');
  L.push('');
  L.push('BENCH');
  if(BENCH.type === 'none') L.push('  None. Curb only.');
  else if(BENCH.type === 'corner'){
    L.push('  ' + pad('Type', 26) + 'Corner, ' + (BENCH.corner === 'bl' ? 'back left' : 'back right'));
    L.push('  ' + pad('Legs', 26) + fmtIn(BENCH.leg) + ' x ' + fmtIn(BENCH.leg));
    L.push('  ' + pad('Hypotenuse (seat face)', 26) + fmtIn(Math.SQRT2*BENCH.leg));
    L.push('  ' + pad('Finished seat height', 26) + fmtIn(BENCH.h) + '   1" bullnose, 3/4" overhang');
  } else {
    L.push('  ' + pad('Type', 26) + 'Rectangular, ' + BENCH.wall + ' wall');
    L.push('  ' + pad('Length', 26) + fmtIn(BENCH.len));
    L.push('  ' + pad('Seat depth', 26) + fmtIn(BENCH.dep));
    L.push('  ' + pad('Finished seat height', 26) + fmtIn(BENCH.h) + '   1" bullnose, 3/4" overhang');
    L.push('  ' + pad('From wall start', 26) + fmtIn(BENCH.off));
    L.push('  ' + pad('Seat area', 26) + (BENCH.len*BENCH.dep).toFixed(0) + ' sq in');
  }
  L.push('');
  L.push('RECESSED NICHE');
  const nn = niches[0];
  if(!nn || !nn.on) L.push('  None.');
  else {
    L.push('  ' + pad('Wall', 26) + HOSTS[nn.host].label);
    L.push('  ' + pad('Opening', 26) + fmtIn(nn.nw) + ' W x ' + fmtIn(nn.nh) + ' H');
    L.push('  ' + pad('Recess depth', 26) + fmtIn(nn.nd));
    L.push('  ' + pad('Centre', 26) + (nn.host === 'back' ? fmtIn(nn.p.x) + ' from left' : fmtIn(nn.p.z) + ' from back') +
           ', ' + fmtIn(nn.p.y) + ' AFF');
  }
  L.push('');
  L.push('DRAIN');
  L.push('  ' + pad('Type', 26) + DRAINS.filter(function(o){ return o.id === drainFix.dtype; })[0].name +
         (drainFix.dtype === 'trench' ? '  ' + fmtIn(drainFix.tlen) + ' long' : ''));
  L.push('  ' + pad('Centre', 26) + fmtIn(drainFix.p.x) + ' from left, ' + fmtIn(drainFix.p.z) + ' from back');
  L.push('');
  L.push('FIXTURE SCHEDULE     L = from left wall, B = from back wall, AFF = above finished floor');
  fixtures.forEach(function(f){
    if(f.id === 'drain' || f.id === 'handle' || f.wallCut) return;
    L.push('  ' + pad(f.name, 18) + pad(describe(f), 34) + (f.locked ? 'LOCKED' : ''));
  });
  L.push('  ' + pad('Rain head face', 18) + (rainFix.shape === 'square' ? 'Square ' : 'Round ') + fmtIn(rainFix.dia) +
         ', drop to ' + fmtIn(rainFix.headY) + ' AFF');
  L.push('  ' + pad('Hand shower', 18) + 'Round, on a ' + fmtIn(barFix.barLen) + ' slide bar (tap wall)');
  L.push('');
  L.push('NOTES');
  L.push('  Pan slopes to the drain; verify fall against the selected floor format before setting.');
  L.push('  Confirm blocking behind the niche and bench, and valve rough-in depth, before close-in.');
  L.push('');
  L.push('--- RESTORE STRING (paste into Paste spec to rebuild this design) ---');
  L.push(captureState());
  return L.join('\n');
}
$('btn-spec').addEventListener('click', function(){
  const t = specSheet();
  showIO('spec', t, 'Full written specification. Select all and copy.');
  try { navigator.clipboard && navigator.clipboard.writeText(t).then(function(){
    ioHint.textContent = 'Spec sheet copied to clipboard.'; }); } catch(e){}
});
$('btn-undo').addEventListener('click', undo);
$('btn-redo').addEventListener('click', redo);
window.addEventListener('keydown', function(e){
  const z = e.key === 'z' || e.key === 'Z';
  if(!(e.metaKey || e.ctrlKey) || !z) return;
  if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
  e.preventDefault();
  if(e.shiftKey) redo(); else undo();
});
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   PLATFORM — YamaZina shared store: live work-state mirror (the
   2D floor plan reads it), named versions, and the Look Book's
   global HOUSE PICK applied to the active surface.
   ============================================================ */
const PSTORE = window.PlatformStore ? window.PlatformStore('shower') : null;
let psTimer = null, psBooted = false; // don't let the boot-time commit of the
                                      // factory default clobber a saved design
function platformMirror(){
  if(!PSTORE || !psBooted) return;
  clearTimeout(psTimer);
  psTimer = setTimeout(function(){
    try { PSTORE.saveWork(JSON.parse(captureState()), '3d'); } catch(e){ /* storage full */ }
  }, 400);
}
if(PSTORE){
  // another tab (versions panel elsewhere, future 2D editing) rewrote the design
  PSTORE.onWorkChange(function(env){
    if(env && env.state && env.by !== '3d') { applyState(JSON.stringify(env.state)); commit(); }
  });

  const dock = document.createElement('div');
  dock.style.cssText = 'position:fixed;left:334px;bottom:18px;z-index:11;display:flex;gap:10px;align-items:flex-end;' +
    "font-family:'IBM Plex Mono',ui-monospace,monospace";
  document.body.appendChild(dock);

  // ---- named versions on the platform store ----
  const vbox = document.createElement('div');
  vbox.style.cssText = 'background:rgba(20,18,16,0.92);border:1px solid rgba(255,255,255,0.18);border-radius:2px;' +
    'padding:9px 10px;color:#e8e3d8;font-size:9px;letter-spacing:0.08em';
  vbox.innerHTML = '<div style="font-weight:600;letter-spacing:0.16em;margin-bottom:6px;opacity:0.65">VERSIONS</div>' +
    '<div style="display:flex;gap:6px"><select id="pv-list" style="max-width:150px;font:inherit;background:#141210;color:#e8e3d8;border:1px solid rgba(255,255,255,0.25);border-radius:2px;padding:3px"></select>' +
    '<button id="pv-load" type="button" style="font:inherit;font-weight:600;background:transparent;color:#e8e3d8;border:1px solid rgba(255,255,255,0.4);border-radius:2px;padding:3px 8px;cursor:pointer">LOAD</button>' +
    '<button id="pv-save" type="button" style="font:inherit;font-weight:600;background:#e8e3d8;color:#141210;border:1px solid #e8e3d8;border-radius:2px;padding:3px 8px;cursor:pointer">LOCK CURRENT</button></div>';
  dock.appendChild(vbox);
  const pvList = vbox.querySelector('#pv-list');
  function pvRefresh(){
    const list = PSTORE.loadVersions() || [];
    pvList.innerHTML = '';
    list.forEach(function(v, i){
      const o = document.createElement('option');
      o.value = i; o.textContent = v.name;
      pvList.appendChild(o);
    });
    if(list.length) pvList.selectedIndex = list.length - 1;
    pvList.disabled = !list.length;
  }
  pvRefresh();
  vbox.querySelector('#pv-save').addEventListener('click', function(){
    const list = PSTORE.loadVersions() || [];
    const d = new Date();
    list.push({ name: 'v' + (list.length + 1) + ' · ' + d.toISOString().slice(0, 16).replace('T', ' '),
                at: d.toISOString(), state: JSON.parse(captureState()) });
    PSTORE.saveVersions(list);
    pvRefresh();
  });
  vbox.querySelector('#pv-load').addEventListener('click', function(){
    if(designLocked) return;
    const list = PSTORE.loadVersions() || [];
    const v = list[Number(pvList.value)];
    if(v && v.state){ applyState(JSON.stringify(v.state)); commit(); }
  });

  // ---- house pick (written by the Look Book) ----
  const hbox = document.createElement('div');
  hbox.style.cssText = 'display:none;background:rgba(20,18,16,0.92);border:1px solid rgba(255,255,255,0.18);border-radius:2px;' +
    'padding:9px 10px;color:#e8e3d8;font-size:9px;letter-spacing:0.08em;max-width:250px';
  hbox.innerHTML = '<div style="font-weight:600;letter-spacing:0.16em;margin-bottom:5px;color:#c9a35c">HOUSE PICK</div>' +
    '<div id="hp-name" style="font-weight:600;margin-bottom:7px"></div>' +
    '<button id="hp-apply" type="button" style="font:inherit;font-weight:600;background:#c9a35c;color:#141210;border:1px solid #c9a35c;border-radius:2px;padding:4px 9px;cursor:pointer;letter-spacing:0.1em"></button>';
  dock.appendChild(hbox);
  function houseEnv(){
    try { return JSON.parse(localStorage.getItem('yamazina.house.work.v1') || 'null'); }
    catch(e){ return null; }
  }
  function hpRefresh(){
    const env = houseEnv();
    const pick = env && env.state && env.state.pick;
    hbox.style.display = pick ? 'block' : 'none';
    if(pick){
      hbox.querySelector('#hp-name').textContent = pick.name || pick.id;
      hbox.querySelector('#hp-apply').textContent = 'APPLY TO ' + SURF[uiSurf].name.toUpperCase();
    }
  }
  hpRefresh();
  window.addEventListener('storage', function(ev){ if(ev.key === 'yamazina.house.work.v1') hpRefresh(); });
  const hpTick = setInterval(hpRefresh, 1500); // uiSurf changes have no event — keep the button label honest
  void hpTick;
  hbox.querySelector('#hp-apply').addEventListener('click', function(){
    if(designLocked) return;
    const env = houseEnv();
    const pick = env && env.state && env.state.pick;
    if(!pick) return;
    let target = null;
    if(pick.id.indexOf('lb4684-') === 0){
      // the pick IS one of this app's own sample-book materials
      const raw = pick.id.slice('lb4684-'.length);
      if(LBMAT[raw]) target = 'lb#' + raw;
    }
    if(!target){
      // photographic look-book field: nearest parametric colour by tone
      const t = hexToRgb(pick.tone || '#999999');
      let bd = Infinity;
      COLLECTIONS.forEach(function(c){
        if(c.lookbook) return;
        c.colours.forEach(function(col){
          const d = (col.base[0]-t[0])*(col.base[0]-t[0]) + (col.base[1]-t[1])*(col.base[1]-t[1]) + (col.base[2]-t[2])*(col.base[2]-t[2]);
          if(d < bd){ bd = d; target = col.id; }
        });
      });
    }
    if(!target) return;
    const spec = SURF[uiSurf].spec;
    spec.colour = target;
    uiColl = collOf(target).id;
    applySurface(uiSurf); renderTileUI();
  });
}

/* ============================================================
   RUN
   ============================================================ */
buildFloor(); buildCeiling(); buildLeftWall(); buildRightWall(); buildBackWall();
buildBench(); buildGlass(); buildJets(0); applyMetal('brass');   // body jets deleted from this kit
renderTileUI(); renderBuildUI(); renderTileSchedule(); renderFixtureRows(); rebuildFixDims(); updateSubline();
syncLockAll(); commit(); renderHistoryUI();
loadDesign(true).then(function(ok){
  if(!ok && PSTORE){
    // static hosting has no dc storage bridge — the platform work slot is
    // the real persistence there, and it's what the 2D floor plan reads
    const env = PSTORE.loadWork();
    if(env && env.state && applyState(JSON.stringify(env.state))) ok = true;
  }
  if(ok){ history = [captureState()]; hptr = 0; renderHistoryUI(); setSaveState('restored'); }
  else setSaveState(window.storage ? 'saved' : 'local only');
  psBooted = true; platformMirror(); // publish the settled truth for the 2D plan
}).catch(function(){ setSaveState('local only'); psBooted = true; platformMirror(); });

(function loop(){
  requestAnimationFrame(loop);
  const k = 0.11;
  sph.r += (goal.r - sph.r)*k;
  sph.theta += (goal.theta - sph.theta)*k;
  sph.phi += (goal.phi - sph.phi)*k;
  target.lerp(goal.t, k);
  applyCamera();
  if(selHelper && selected && selected.body) selHelper.setFromObject(selected.body);
  renderer.render(scene, camera);
})();

})();
