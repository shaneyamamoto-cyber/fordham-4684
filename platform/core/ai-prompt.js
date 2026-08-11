// ============================================================================
// ai-prompt.js — the platform's AI render-prompt generator.
//
// Claude (and Anthropic models generally) generate text, not images, so the
// platform's job is to hand an OUTSIDE photoreal engine (Midjourney, Stable
// Diffusion / ComfyUI, DALL·E, Krea, a 3D render service, …) a prompt that is
// dimensionally and materially faithful to the measured design. This module
// reads a project's live design + the global Look Book pick and assembles a
// rich, structured prompt, mounted as a floating button + modal on any page.
//
//   AIPrompt('bathroom')                       // auto-reads the work slot
//   AIPrompt('shower', { describe: fn })        // page supplies its own summary
//
// A page can pass opts.describe() returning {roomType, dims, surfaces:[],
// fixtures:[], metal, extra:[]} to override the built-in reader.
// ============================================================================
(function () {
  'use strict';

  var NAMED = [
    ['#6f695c', 'warm green-grey stone'], ['#58563c', 'olive green'], ['#746e61', 'sage green stone'],
    ['#4a5442', 'deep green mineral'], ['#3c3420', 'dark mineral'], ['#443b26', 'dark mineral'],
    ['#6b6250', 'ivory stone'], ['#b5aea5', 'pale marble'], ['#b2aaa0', 'pale marble'],
    ['#a39284', 'travertine'], ['#b29e8c', 'travertine'], ['#655a4b', 'warm grey stone'],
    ['#705e42', 'warm sand'], ['#725928', 'ochre'], ['#7e4b39', 'terracotta'], ['#5c3939', 'oxblood'],
    ['#4c555d', 'slate blue'], ['#484641', 'charcoal'], ['#e8e3d8', 'soft warm white'],
    ['#f7f6f2', 'white'], ['#8a5325', 'walnut'], ['#8a6a4e', 'walnut'], ['#b98b53', 'teak'],
    ['#b28a55', 'teak'], ['#c49a6c', 'cedar'], ['#c9a35c', 'aged brass'], ['#b87a55', 'copper'],
    ['#b76e79', 'rose gold'], ['#7d6552', 'dark bronze'], ['#bdb5a6', 'warm stone'],
    ['#9aa79b', 'green-grey stone'], ['#c8cec4', 'pale green stone'],
  ];
  function hex2rgb(h) { h = (h || '#999999').replace('#', ''); return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]; }
  function colorWord(hex) {
    if (!hex) return '';
    var t = hex2rgb(hex), best = '', bd = Infinity;
    NAMED.forEach(function (p) { var c = hex2rgb(p[0]); var d = (c[0]-t[0])*(c[0]-t[0])+(c[1]-t[1])*(c[1]-t[1])+(c[2]-t[2])*(c[2]-t[2]); if (d < bd) { bd = d; best = p[1]; } });
    return best;
  }
  var PAT = { offset2: 'running-bond', offset3: 'third-offset', stack: 'stacked', herring: 'herringbone', chevron: 'chevron', vstack: 'vertical stacked', basket: 'basketweave' };
  function prettyId(id) { return String(id).replace(/^lb4684-/, '').replace(/^lb#/, '').replace(/[-_]/g, ' ').trim(); }

  var LIB = function () { return window.MATERIAL_LIBRARY; };

  // material phrase from a bathroom-style surf object {fin,color,tileL,tileW,pattern,lib}
  function surfPhrase(s) {
    if (!s) return null;
    if (s.lib && LIB() && LIB().byId(s.lib)) {
      var e = LIB().byId(s.lib);
      return e.name.replace(/\s+—.*$/, '').replace(/\s*\d+×\d+\s*/, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    var fin = s.fin || 'tile', col = colorWord(s.color);
    if (fin === 'paint') return col + ' painted plaster';
    if (fin === 'wood') return col + ' wood';
    if (fin === 'stone') return col + ' stone slab';
    var sz = (s.tileL && s.tileW) ? (Math.round(s.tileL) + '×' + Math.round(s.tileW) + '″ ') : '';
    var pat = (s.pattern && PAT[s.pattern] && s.pattern !== 'stack') ? (PAT[s.pattern] + ' ') : '';
    return col + ' ' + sz + pat + 'tile';
  }

  function readWork(project) { try { return JSON.parse(localStorage.getItem('yamazina.' + project + '.work.v1') || 'null'); } catch (e) { return null; } }
  function housePick() {
    try { var e = JSON.parse(localStorage.getItem('yamazina.house.work.v1') || 'null'); return e && e.state && e.state.pick ? e.state.pick : null; } catch (e) { return null; }
  }

  var BATH_FIX = { tub:'freestanding-look alcove tub', van:'floating wood vanity', vessel:'stone vessel basin',
    wc:'wall-look toilet', tower:'full-height storage tower', shelf:'floating shelves', mir:'framed mirror',
    door:'door', stone:'stone counter landing', splash:'tiled splash' };

  // ---- built-in describers per project ----
  function describeBathroom() {
    var d = readWork('bathroom');
    var surf = (d && d.surf) || {};
    var surfaces = [];
    function add(zone, label) { if (surf[zone]) { var p = surfPhrase(surf[zone]); if (p) surfaces.push(label + ': ' + p); } }
    add('bay', 'shower & tub wall'); add('splash', 'vanity splash'); add('floor', 'floor');
    add('wall', 'walls'); add('slope', 'dormer ceiling');
    var fixtures = [];
    if (d && d.items) d.items.forEach(function (it) { if (BATH_FIX[it.id]) fixtures.push(BATH_FIX[it.id]); });
    if (!fixtures.length) fixtures = ['alcove tub', 'floating wood vanity with stone vessel basin', 'walk-in shower', 'toilet', 'storage tower'];
    return { roomType: 'primary bathroom with a dormer (sloped) ceiling',
      dims: '14 ft 1 in wall run, about 5 ft 11 in deep, 7 ft 8 in ceiling stepping down to the dormer knee wall',
      surfaces: surfaces, fixtures: fixtures, metal: 'aged brass fixtures', extra: [] };
  }
  function describeShower() {
    var env = readWork('shower'); var st = env && env.state;
    var surfaces = [], metal = 'brass';
    if (st) {
      metal = st.metal || 'brass';
      var ORDER = ['floor','back','left','right','ceiling','bench','niche'];
      (st.surf || []).forEach(function (a, i) {
        if (!a) return;
        var colour = prettyId(a[0]), pat = a[2] ? String(a[2]).replace(/-/g, ' ') : '';
        surfaces.push(ORDER[i] + ': ' + colour + (pat ? ' tile, ' + pat + ' layout' : ' tile') + (a[3] ? ', ' + String(a[3]).replace(/-/g, ' ') + ' grout' : ''));
      });
    }
    return { roomType: 'walk-in shower enclosure with a glass front and corner bench',
      dims: '51.5 in wide, 48 in deep, 96 in tall, 78 in glass with a 4 in curb',
      surfaces: surfaces, fixtures: ['ceiling rain head', 'hand shower', 'body jets', 'recessed lit niche', 'corner bench'],
      metal: metal + ' fixtures', extra: [] };
  }
  function describeSauna() {
    var env = readWork('sauna'); var st = env && env.state; var lm = (st && st.libraryMats) || {};
    function name(id, dflt) { var e = id && LIB() && LIB().byId(id); return e ? e.name.replace(/\s+—.*$/, '').toLowerCase() : dflt; }
    return { roomType: 'finished cedar sauna interior',
      dims: '10 ft 4 in by 6 ft 4 in, roughly 7 ft 8 in flat ceiling',
      surfaces: ['walls: ' + name(lm.walls, 'cedar tongue-and-groove'),
        'floor: ' + name(lm.floor, 'cedar decking'), 'benches: ' + name(lm.bench, 'clear cedar')],
      fixtures: ['two-tier closed-front benches (32 in and 50 in)', 'HUUM electric heater with guard', 'sliding glass window', 'glass door'],
      metal: 'blackened steel and glass', extra: ['warm low-lit interior, backrests, light rail'] };
  }
  var DESCRIBE = { bathroom: describeBathroom, shower: describeShower, sauna: describeSauna };

  // ---- prompt styles ----
  var STYLES = {
    photo: { label: 'Architectural photo', lead: 'Photorealistic architectural interior photograph of',
      cam: 'shot on a 35mm lens at f/8, eye-level, natural perspective (no fisheye)',
      light: 'soft natural daylight with warm practical fixtures, realistic soft shadows and material reflections',
      tail: 'physically based materials, high detail, natural white balance, magazine interior photography' },
    viz: { label: 'Architectural viz', lead: '3D architectural visualization render of',
      cam: 'clean three-quarter interior view, vertical lines kept vertical',
      light: 'even studio-daylight lighting, subtle global illumination and ambient occlusion',
      tail: 'ray-traced, physically based rendering, crisp edges, product-visualization quality' },
    bright: { label: 'Bright listing', lead: 'Bright, airy real-estate listing photo of',
      cam: 'wide but undistorted interior view from the doorway',
      light: 'bright even daylight, light and airy, clean and staged',
      tail: 'realtor photography, inviting, well-lit, neutral tones' },
    evening: { label: 'Moody evening', lead: 'Moody evening interior render of',
      cam: 'low intimate camera angle',
      light: 'warm low lighting from the sconces and lit niches, deep soft shadows, glowing practicals',
      tail: 'cinematic, high contrast, cozy, physically based materials' },
  };

  function buildPrompt(project, styleKey) {
    var d;
    try { d = (window.__aiDescribe && window.__aiDescribe[project]) ? window.__aiDescribe[project]() : DESCRIBE[project](); }
    catch (e) { d = { roomType: project + ' interior', dims: '', surfaces: [], fixtures: [] }; }
    var s = STYLES[styleKey] || STYLES.photo;
    var pick = housePick();
    var lines = [];
    lines.push(s.lead + ' a ' + d.roomType + '.');
    if (d.dims) lines.push('Dimensions: ' + d.dims + '.');
    if (d.surfaces && d.surfaces.length) lines.push('Materials — ' + d.surfaces.join('; ') + '.');
    if (d.metal) lines.push('Metal finish: ' + d.metal + '.');
    if (d.fixtures && d.fixtures.length) lines.push('Fixtures: ' + d.fixtures.join(', ') + '.');
    if (pick) lines.push('Overall look anchored to the house Look Book selection: ' + (pick.name || pick.id) + '.');
    (d.extra || []).forEach(function (x) { lines.push(x + '.'); });
    lines.push('Lighting: ' + s.light + '.');
    lines.push('Camera: ' + s.cam + '.');
    lines.push('Style: ' + s.tail + '.');
    var pos = lines.join(' ');
    var neg = 'Negative prompt: cartoon, illustration, distorted proportions, warped walls, extra or duplicated fixtures, floating objects, text, labels, watermark, signature, fisheye, lens distortion, cluttered, low quality.';
    return pos + '\n\n' + neg;
  }

  window.AIPrompt = function (project, opts) {
    opts = opts || {};
    if (opts.describe) { window.__aiDescribe = window.__aiDescribe || {}; window.__aiDescribe[project] = opts.describe; }
    var styleKey = 'photo';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '✦ AI RENDER PROMPT';
    var pos = opts.position || 'bottom-right';
    var anchor = pos === 'bottom-left' ? 'left:18px;bottom:18px;' : pos === 'top-right' ? 'right:18px;top:12px;' : 'right:18px;bottom:18px;';
    btn.style.cssText = 'position:fixed;' + anchor + 'z-index:2147482000;padding:9px 14px;border:1px solid #8a5a2b;' +
      'background:#8a5a2b;color:#fbfaf7;cursor:pointer;border-radius:2px;font:600 9px/1 \'IBM Plex Mono\',ui-monospace,monospace;letter-spacing:0.1em;';
    document.body.appendChild(btn);

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:2147483200;display:none;align-items:center;justify-content:center;background:rgba(35,35,31,0.45);';
    modal.innerHTML =
      '<div style="background:#faf9f5;border:1px solid #23231f;border-radius:3px;width:560px;max-width:92vw;max-height:86vh;overflow:auto;box-shadow:0 18px 60px rgba(0,0,0,0.3);font-family:\'IBM Plex Mono\',ui-monospace,monospace;color:#23231f">' +
      '<div style="padding:16px 18px 12px;border-bottom:1px solid rgba(35,35,31,0.16)">' +
      '<div style="font:600 8.5px/1 inherit;letter-spacing:0.18em;color:#8a5a2b;text-transform:uppercase">AI Render Prompt · for an outside engine</div>' +
      '<div style="font:600 15px/1.2 Archivo,sans-serif;margin-top:7px">' + (project.charAt(0).toUpperCase() + project.slice(1)) + ' — render prompt</div>' +
      '<div style="font-size:9.5px;color:rgba(35,35,31,0.6);margin-top:4px">Built from the live measured design + your Look Book pick. Paste into Midjourney, Stable Diffusion, DALL·E, Krea, etc.</div>' +
      '<div id="aip-styles" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px"></div></div>' +
      '<div style="padding:14px 18px 18px">' +
      '<textarea id="aip-text" readonly style="width:100%;height:250px;font:inherit;font-size:11px;line-height:1.5;padding:11px;border:1px solid rgba(35,35,31,0.3);border-radius:2px;background:#fff;resize:vertical"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:11px"><button id="aip-copy" style="flex:1;padding:9px 0;border:1px solid #23231f;background:#23231f;color:#fbfaf7;cursor:pointer;font:600 9px/1 inherit;letter-spacing:0.1em;border-radius:2px">COPY PROMPT</button>' +
      '<button id="aip-close" style="padding:9px 14px;border:1px solid rgba(35,35,31,0.3);background:transparent;color:#23231f;cursor:pointer;font:600 9px/1 inherit;letter-spacing:0.1em;border-radius:2px">Close</button></div>' +
      '<div id="aip-copied" style="font-size:9px;color:#8a5a2b;margin-top:8px;min-height:12px"></div>' +
      '<div style="font-size:9px;color:rgba(35,35,31,0.55);margin-top:10px;line-height:1.6">Tip: for measured accuracy, also attach a 3D view (the 3D pages’ “Export view + spec” gives a plate image + camera JSON) as an image reference alongside this prompt.</div>' +
      '</div></div>';
    document.body.appendChild(modal);

    var textEl = modal.querySelector('#aip-text');
    var stylesEl = modal.querySelector('#aip-styles');
    Object.keys(STYLES).forEach(function (k) {
      var b = document.createElement('button');
      b.textContent = STYLES[k].label;
      b.setAttribute('data-k', k);
      b.style.cssText = 'padding:6px 9px;border:1px solid rgba(35,35,31,0.3);background:' + (k === styleKey ? '#23231f' : 'transparent') +
        ';color:' + (k === styleKey ? '#fbfaf7' : '#23231f') + ';cursor:pointer;font:600 8.5px/1 inherit;letter-spacing:0.06em;border-radius:2px';
      stylesEl.appendChild(b);
    });
    function refresh() {
      textEl.value = buildPrompt(project, styleKey);
      Array.prototype.forEach.call(stylesEl.children, function (b) {
        var on = b.getAttribute('data-k') === styleKey;
        b.style.background = on ? '#23231f' : 'transparent'; b.style.color = on ? '#fbfaf7' : '#23231f';
      });
    }
    stylesEl.addEventListener('click', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (!k) return;
      styleKey = k; refresh();
    });
    btn.addEventListener('click', function () { refresh(); modal.style.display = 'flex'; });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
    modal.querySelector('#aip-close').addEventListener('click', function () { modal.style.display = 'none'; });
    modal.querySelector('#aip-copy').addEventListener('click', function () {
      var done = function () { modal.querySelector('#aip-copied').textContent = 'Copied — paste it into your render engine.'; };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(textEl.value).then(done, function () { textEl.select(); document.execCommand('copy'); done(); });
        else { textEl.select(); document.execCommand('copy'); done(); }
      } catch (e) { textEl.select(); modal.querySelector('#aip-copied').textContent = 'Selected — press Cmd/Ctrl+C.'; }
    });
  };
})();
