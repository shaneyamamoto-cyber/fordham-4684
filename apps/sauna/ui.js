// ---------- Sidebar shell: tabs + open/close ----------
function uiToggleSidebar(){
  const open = document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('menuToggle').classList.toggle('open', open);
  if(open) uiCloseMarkupBar();
}
function uiOpenSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('menuToggle').classList.add('open');
  uiCloseMarkupBar();
}
function uiCloseSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menuToggle').classList.remove('open');
}
function uiCloseMarkupBar(){
  document.getElementById('markupBar').classList.remove('open');
  document.getElementById('markupToggle').classList.remove('open');
}
function uiToggleMarkupBar(){
  const open = document.getElementById('markupBar').classList.toggle('open');
  document.getElementById('markupToggle').classList.toggle('open', open);
  if(open) uiCloseSidebar(); else { uiSetTool('orbit'); }
}
function uiSwitchTab(name){
  document.querySelectorAll('.sbTab').forEach(b=> b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.tabPane').forEach(p=> p.classList.toggle('active', p.id==='tab-'+name));
  if(name==='budget') uiRefreshBudget();
}

// ---------- Budget tab: recompute-on-open, rendered from window.Budget (design_core.js) ----------
function uiRefreshBudget(){
  if(!window.computeBudget || !window.Budget) return;
  window.computeBudget();
  const total = window.Budget.getTotal();
  const breakdown = window.Budget.getBreakdown();
  const totalEl = document.getElementById('budgetTotal');
  if(totalEl) totalEl.textContent = 'Estimated total: $' + total.toLocaleString(undefined,{maximumFractionDigits:0}) + (window.Budget.hasPlaceholders() ? '  (includes placeholder pricing)' : '');
  const host = document.getElementById('budgetBreakdown');
  if(!host) return;
  host.innerHTML = '';
  window.Budget.CATEGORIES.forEach(function(cat){
    const b = breakdown[cat];
    if(!b || !b.items.length) return;
    const det = document.createElement('details');
    det.className = 'spec';
    const sum = document.createElement('summary');
    sum.textContent = cat + ' — $' + b.total.toLocaleString(undefined,{maximumFractionDigits:0});
    det.appendChild(sum);
    const body = document.createElement('div');
    body.className = 'body';
    b.items.forEach(function(it){
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;';
      const left = document.createElement('span');
      left.textContent = it.name + ' (' + it.qty + ' ' + it.unit + ' @ $' + (Number(it.unitCost)||0).toFixed(2) + ')' + (it.placeholder ? '  ⚠ placeholder' : '');
      const right = document.createElement('span');
      right.style.whiteSpace = 'nowrap';
      right.textContent = '$' + window.Budget.lineTotal(it).toLocaleString(undefined,{maximumFractionDigits:0});
      row.appendChild(left); row.appendChild(right);
      body.appendChild(row);
    });
    det.appendChild(body);
    host.appendChild(det);
  });
}
window.uiDownloadBudgetCSV = function(){
  if(!window.computeBudget || !window.Budget) return;
  window.computeBudget();
  const csv = window.Budget.toCSV();
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'budget_estimate.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

function syncSchemeUI(i){
  document.querySelectorAll('.swatch').forEach((s,idx)=>s.classList.toggle('active', idx===i));
  const sel = document.getElementById('schemeSelect');
  if(sel) sel.value = String(i);
  // Picking a scheme sets new colors on every fixture (including stars/downlights) under the
  // hood — pull them back so the pickers themselves don't sit there showing a stale default.
  if(window.getDesignState){
    const s = window.getDesignState();
    const led = document.getElementById('ledColorPicker'); if(led && s.ledColor) led.value = s.ledColor;
    const amb = document.getElementById('ambColorPicker'); if(amb && s.ambientColor) amb.value = s.ambientColor;
    const star = document.getElementById('starsColorPicker'); if(star && s.starsColor) star.value = s.starsColor;
    const down = document.getElementById('downColorPicker'); if(down && s.downColor) down.value = s.downColor;
  }
}
function uiSetScheme(i, el){ window.setScheme(i); syncSchemeUI(i); }
function uiSetSchemeFromSelect(v){ const i = parseInt(v,10); window.setScheme(i); syncSchemeUI(i); }
function uiToggleView(){ window.toggleView(); }
function uiToggleTopView(){ window.toggleTopView(); }
let measureOn = false;
function uiToggleMeasurements(){
  measureOn = !measureOn;
  window.toggleMeasurements(measureOn);
  document.getElementById('measureBtn').classList.toggle('active', measureOn);
}
let wallLabelsOn = false;
function uiToggleWallLabels(){
  wallLabelsOn = !wallLabelsOn;
  window.toggleWallLabels(wallLabelsOn);
  document.getElementById('wallLabelBtn').classList.toggle('active', wallLabelsOn);
}
function uiSetLedColor(hex){ window.setLedColor(hex); }
function uiSetValanceColor(hex){ window.setValanceLedColor(hex); }
function uiSetAmbientColor(hex){ window.setAmbientColor(hex); }
function uiSetStarsColor(hex){ window.setStarsColor(hex); }
function uiSetDownColor(hex){ window.setDownColor(hex); }
function uiToggleStars(on){ window.toggleStars(on); }
function uiToggleDownlights(on){ window.toggleDownlights(on); }
function uiToggleValanceLed(on){ window.toggleValanceLed(on); }
function uiToggleLedStrips(on){ window.toggleLedStrips(on); }
function uiSetStarsLevel(v){ window.setStarsLevel(v); }
function uiSetDownLevel(v){ window.setDownLevel(v); }
function uiSetLedLevel(v){ window.setLedLevel(v); }
function uiSetValanceLevel(v){ window.setValanceLedLevel(v); }
function uiSetHeaterLevel(v){ window.setHeaterLevel(v); }
function uiSetAmbientLevel(v){ window.setAmbientLevel(v); }

// ---------- Feet-and-inches type-in boxes ----------
// Alongside every real-world position/length/height/width/depth slider (marked data-ftin="1" on
// the <input> itself), so a measurement can be typed exactly — "4'6"", "54in", or a plain decimal
// (read as feet) — instead of only dragged. Purely a UI layer on top of the slider's own existing
// oninput handler: it sets the slider's value and fires a real 'input' event, so it can never
// bypass whatever clamping that handler already does.
(function(){
  function parseFeetInches(str){
    if(str == null) return null;
    str = String(str).trim().toLowerCase();
    if(!str) return null;
    let m = str.match(/^(-?\d+(?:\.\d+)?)\s*(?:'|ft)\s*(\d+(?:\.\d+)?)?\s*(?:"|in)?\s*$/);
    if(m){
      const ft = parseFloat(m[1]);
      const inches = m[2] ? parseFloat(m[2]) : 0;
      return ft + (ft < 0 ? -inches : inches) / 12;
    }
    m = str.match(/^(-?\d+(?:\.\d+)?)\s*(?:"|in)\s*$/);
    if(m) return parseFloat(m[1]) / 12;
    m = str.match(/^-?\d+(?:\.\d+)?$/);
    if(m) return parseFloat(str);
    return null;
  }
  function formatFeetInches(decFt){
    if(decFt == null || Number.isNaN(decFt)) return '';
    const neg = decFt < 0;
    const abs = Math.abs(decFt);
    let ft = Math.floor(abs + 1e-9);
    let inches = Math.round((abs - ft) * 12);
    if(inches >= 12){ inches -= 12; ft += 1; }
    return (neg ? '-' : '') + ft + "'" + inches + '"';
  }
  window.decorateFtIn = function(container){
    if(!container) return;
    container.querySelectorAll('input[type="range"][data-ftin="1"]').forEach(range=>{
      if(range.dataset.ftinDecorated) return;
      range.dataset.ftinDecorated = '1';
      const box = document.createElement('input');
      box.type = 'text';
      box.className = 'ftInBox';
      box.value = formatFeetInches(parseFloat(range.value));
      box.placeholder = "4'6\"";
      box.title = 'Type an exact measurement: feet\'inches", inches alone, or a plain decimal (feet)';
      function commit(){
        const parsed = parseFeetInches(box.value);
        if(parsed == null){ box.value = formatFeetInches(parseFloat(range.value)); return; }
        const min = parseFloat(range.min), max = parseFloat(range.max);
        const clamped = Math.min(max, Math.max(min, parsed));
        range.value = clamped;
        range.dispatchEvent(new Event('input', {bubbles:true}));
        range.dispatchEvent(new Event('change', {bubbles:true})); // structural toolbar fields refresh on 'change' (cross-field clamps like door/heater vs. bench wall)
        box.value = formatFeetInches(clamped);
      }
      box.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ commit(); box.blur(); } });
      box.addEventListener('blur', commit);
      range.addEventListener('input', ()=>{ if(document.activeElement !== box) box.value = formatFeetInches(parseFloat(range.value)); });
      range.insertAdjacentElement('afterend', box);
    });
  };
})();

// ---------- Focused edit body — shared by the numbered Elements list AND clicking an object
// directly in the 3D view (sauna_app.js calls window.onEditableClick(entry) either way). ----------
(function(){
  const WOOD_TONES = [
    {name:'Natural Cedar', hex:'#d9ac76'},
    {name:'Honey Pine',    hex:'#e0b978'},
    {name:'Thermo Aspen',  hex:'#e8dcc4'},
    {name:'Smoked Walnut', hex:'#5c3d24'},
    {name:'Black Locust',  hex:'#2e2016'},
  ];
  // Delete is only offered for genuinely optional accessories — never for spec'd structural
  // pieces (walls, bench, door, heater, windows), where removing them would leave the design no
  // longer buildable as drawn. The actual button now lives in the global toolbar (Copy/Delete are
  // generic, non-element-specific actions — see the toolbar IIFE below), so this per-element panel
  // no longer duplicates it; DELETABLE_TYPES is kept only as the source of truth for which types
  // still get notes-summary/list treatment consistent with being a "real optional piece."
  const DELETABLE_TYPES = ['bucket', 'thermo', 'accent', 'down', 'stool'];
  function deleteRowFor(entry){
    return ''; // superseded by the global toolbar's Delete button
  }
  window.uiDeleteEditable = function(index){
    if(!window.deleteEditable) return;
    if(window.deleteEditable(index)){
      document.getElementById('elementEditArea').innerHTML = '';
      renderElementsList();
      renderNotesSummary();
    }
  };

  function bodyFor(entry){
    // Generic copies (2026-07-30 — global Copy button) are a frozen visual snapshot of whatever
    // the ONE real element of this type looked like at copy time, not a second live instance — so
    // the type-specific controls below (which all act on that one real element's shared materials/
    // parametric setters) don't apply to it and would be actively misleading if shown here (e.g.
    // "Glass style" on a door copy would silently restyle the REAL door, not the copy). Toolbar
    // above still gives it full move/rotate/resize/rename/delete.
    const isCopy = !!(entry.objects && entry.objects[0] && entry.objects[0].userData && entry.objects[0].userData.isGenericCopy);
    if(isCopy){
      return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">This is a copy — a frozen, independent duplicate of whatever the real '+entry.type+' looked like when you copied it (material/finish included). Move, rotate, resize, rename or delete it from the toolbar above; its look isn\'t linked to the real element anymore, so restyling the original elsewhere won\'t change this copy (and there\'s no separate restyle control for the copy itself yet — ask if you need that).</div>';
    }
    switch(entry.type){
      case 'walls':
      case 'floor':
      case 'bench': {
        const setter = 'window.setSurfaceTone';
        let extra = '';
        if(entry.type === 'walls'){
          extra = '<div class="epRow"><div class="epLabel">LW1 (door wall) transparency in default outside view</div><input type="range" min="0" max="1" step="0.02" value="0" oninput="window.setWallTransparency(this.value)"></div>'
            + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Defaults to fully open (0) — the same look as before, so the interior stays visible in the default outside cutaway view. Drag this up if you want LW1 to read as a faint translucent wall instead of being fully invisible; same idea as the door\'s own transparency slider below it. Forced fully solid the moment you step inside either way. The other 3 walls stay solid always — only the door wall does this.</div>';
        }
        if(entry.type === 'bench'){
          extra = '<div class="epRow" style="font-size:11px;color:#c7b6a2;">All bench wood shares one finish (so it always matches across every run, including the landing platform). Bench depth/height profile is locked to the YamaZina Mark 2 Rev. B spec (foot bench + top bench heights) so it does not drift out of spec. This build\'s foot bench uses the 20" width option (18/20/22/24" are all valid per the design rules) &mdash; ask for a different width and it ships as a new version. Position/length/wall are real, working controls &mdash; up in the toolbar above, not down here.</div>';
          if(entry.label.indexOf('Back Bench') === 0){
            extra += '<div class="epRow" style="font-size:11px;color:#c7b6a2;">LW2 is the only long wall not already claimed by the door, heater and landing platform on LW1, so its toolbar controls don\'t include a wall picker &mdash; trim it short (2ft min) for a straight single-wall "stadium" layout instead of an L, per the more usable-in-practice bench shape (corner L-benches waste the corner and cause knee interference &mdash; see saunatimes.com\'s bench design writeup).</div>';
          } else if(entry.label.indexOf('Return Bench') === 0 || entry.label.indexOf('Left Bench') === 0){
            extra += '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Moving this to SW2 (toolbar above) automatically re-clamps the door and heater positions to stay clear of it (and vice versa) &mdash; LW1 itself isn\'t offered since the door/heater/landing already live there. The window stays on SW1 either way (it\'s cut into that wall\'s own structure), so moving the return leg to SW2 leaves the window without a bench underneath it.</div>';
          } else if(entry.label.indexOf('Exterior Steps') === 0){
            extra += '<div class="epRow" style="font-size:11px;color:#c7b6a2;">This is a real existing full-width deck the shed backs onto &mdash; only the notch cut into it for the door threshold changes shape/direction/size, always following the door\'s live position. Direction, landing size and every stair number (deck height, riser height, tread depth, start offset) are in the toolbar above. The number of steps is derived from the actual vertical drop (deck height minus the door\'s 10" sill float) divided by the target riser height, evenly split so the top step always lands flush with the deck. "Turned" keeps a flush landing right at the door (code minimum), then doglegs sideways instead of continuing straight out. First pass on this specific geometry &mdash; please sanity-check it against the actual site/deck framing and local stair code before treating it as buildable.</div>';
          }
        }
        return '<div class="epRow"><div class="epLabel">Finish tone</div><div class="swatchRow">'
          + WOOD_TONES.map(t=> '<button class="toneSwatch" style="background:'+t.hex+'" title="'+t.name+'" onclick="'+setter+'(\''+entry.type+'\',\''+t.hex+'\')"></button>').join('')
          + '</div></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Have a specific product swatch? Send it over and we can match it exactly.</div>'
          + extra;
      }
      case 'door':
        return '<div class="epRow"><div class="epLabel">Glass style</div>'
          + '<select onchange="window.setDoorStyle(this.value)"><option value="half">Top half (5in wood margins)</option><option value="twoThirds">Top two-thirds</option><option value="solid">Solid wood, no glass</option></select></div>'
          + '<div class="epRow"><div class="epLabel">Wood tone</div><div class="swatchRow">'
          + WOOD_TONES.map(t=> '<button class="toneSwatch" style="background:'+t.hex+'" title="'+t.name+'" onclick="window.setDoorTone(\''+t.hex+'\')"></button>').join('')
          + '</div></div>'
          + '<div class="epRow"><div class="epLabel">Transparency in default outside view</div><input type="range" min="0" max="1" step="0.02" value="0.22" oninput="window.setDoorTransparency(this.value)"></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Fixed at the design spec\'s 24" wide x 72" tall cedar door — size is locked to the real dimension so this build stays buildable as drawn. Position and height off the floor are real, working controls in the toolbar above. The exterior deck\'s stair/landing notch (Elements list) follows this position automatically. Position is clamped clear of whichever wall the return-leg bench is currently on — drag past the legal range and it snaps back to the nearest legal spot. The landing platform below it is a separate fixed piece, so raising/lowering the door past its 10in default may not line up with it perfectly. Transparency only applies in the default outside view; it always goes fully solid once you step inside.</div>';
      case 'heater':
        return '<div class="epRow"><div class="epLabel">Heater model</div>'
          + '<select onchange="window.setHeaterModel(this.value)"><option value="mini9">HUUM Hive Mini (9kW)</option><option value="hive11">HUUM Hive (11kW)</option></select></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Both share the same ~18.1" drum and 30" top-of-rock reference height, so this only locks in the exact model for ordering &amp; the render spec — it does not resize anything shown here.</div>'
          + '<div class="epRow"><div class="epLabel">Guard rail tone</div><div class="swatchRow">'
          + WOOD_TONES.map(t=> '<button class="toneSwatch" style="background:'+t.hex+'" title="'+t.name+'" onclick="window.setHeaterGuardTone(\''+t.hex+'\')"></button>').join('')
          + '</div></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Position along the wall and standoff distance are real, working controls in the toolbar above — travel is clamped to the clear span between the landing platform and whichever wall currently carries the return-leg bench.</div>'
          + '<div class="epRow" style="font-weight:600;color:#f5c98a;margin-top:16px;">Guard rail</div>'
          + '<div class="epRow"><div class="epLabel">Height (max stays under the 24in ceiling rule)</div><input type="range" min="1.0" max="1.96" step="0.02" value="1.92" oninput="window.setHeaterGuardGeometry(\'h\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Slat thickness</div><input type="range" min="0.02" max="0.09" step="0.005" value="0.045" oninput="window.setHeaterGuardGeometry(\'thick\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Slat spacing (gap)</div><input type="range" min="0.015" max="0.12" step="0.005" value="0.05" oninput="window.setHeaterGuardGeometry(\'gap\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Number of slats</div><input type="range" min="2" max="24" step="1" value="20" oninput="window.setHeaterGuardGeometry(\'count\', this.value)"></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Slat count is capped to however many actually fit inside the current height at the current thickness/spacing — raise the height or shrink thickness/spacing to fit more.</div>';
      case 'window':
        return '<div class="epRow"><div class="epLabel">Glass type</div>'
          + '<select onchange="window.setWindowGlass(this.value)"><option value="clear">Clear</option><option value="frosted">Frosted</option><option value="tint">Ocean Tint</option><option value="block">Glass Block</option></select></div>'
          + '<div class="epRow"><div class="epLabel">Glass-block frame/spacer wood (real PBR sets, when Glass Block is selected)</div>'
          + '<select onchange="window.setGlassBlockFrameWood(this.value)"><option value="wood1">Wood 1</option><option value="wood8">Wood 8</option></select></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Position, height off floor, width and height are all real, working controls in the toolbar above.</div>';
      case 'led':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">All LED strips share one dimmer/color circuit — this changes every strip at once, the same as the Lighting tab.</div>'
          + '<div class="epRow"><div class="epLabel">Strip color</div><input type="color" value="#ffb066" oninput="window.setLedColor(this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Intensity</div><input type="range" min="0" max="2" step="0.05" value="1" oninput="window.setLedLevel(this.value)"></div>';
      case 'valanceled':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">The middle rail of the 3-rail wall wrap, at ear height (60in off the floor) — same board-on-standoff-blocks construction as the two plain backrest rails above/below it (shares their standoff and block spacing — change either here or on a backrest rail panel, both move together). Bulbs mount on the BACK of the board, in the gap the standoff blocks create, so light spills both up and down around the board — no fascia lip/channel boxing it in. Half as many bulbs as the first pass, each twice as bright. Defaults to LW2/SW1/SW2; LW1 (door wall) is off by default — enable it below if you want the light rail to also wrap the door wall (it\'ll split around the door and follow it live).</div>'
          + '<div class="epRow"><div class="epLabel">Wrap color</div><input type="color" value="#ffcf9e" oninput="window.setValanceLedColor(this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Intensity</div><input type="range" min="0" max="2" step="0.05" value="1" oninput="window.setValanceLedLevel(this.value)"></div>'
          + '<div class="epRow"><label><input type="checkbox" onchange="window.setValanceAutoRotate(this.checked)"> Auto color-rotate (cycles hue continuously instead of a fixed color)</label></div>'
          + '<div class="epRow"><div class="epLabel">Which walls get the rail wrap (all 3 rails share this)</div>'
          + '<label style="margin-right:10px;"><input type="checkbox" onchange="window.toggleRailWall(\'LW2\', this.checked)" checked> LW2 (back)</label>'
          + '<label style="margin-right:10px;"><input type="checkbox" onchange="window.toggleRailWall(\'SW1\', this.checked)" checked> SW1 (window)</label>'
          + '<label style="margin-right:10px;"><input type="checkbox" onchange="window.toggleRailWall(\'SW2\', this.checked)" checked> SW2</label>'
          + '<label><input type="checkbox" onchange="window.toggleRailWall(\'LW1\', this.checked)"> LW1 (door)</label></div>'
          + '<div class="epRow"><div class="epLabel">Standoff off wall (shared by all 3 rails)</div><input type="range" min="0.06" max="0.5" step="0.01" value="0.0833" oninput="window.setRailGeometry(\'standoff\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Block spacing (shared by all 3 rails)</div><input type="range" min="0.5" max="3" step="0.05" value="1.167" oninput="window.setRailGeometry(\'blockPitch\', this.value)"></div>';
      case 'fakevalance':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Two slim rails above and below the LED light rail, same board-on-standoff-blocks construction — no lights, so they read as a lighter architectural echo of the middle rail. The LOWER rail is anchored directly off the tall (50in) bench\'s own seat height, with real clearance, so it can\'t collide with the bench — the upper rail automatically mirrors the same gap on the other side of the light rail, so the light rail always stays exactly centered between the two. Standoff, block spacing and which walls are on are SHARED with the light rail (all 3 rails move together) — adjust those from the "Wall Valance" panel; this panel just has what\'s unique to these two.</div>'
          + '<div class="epRow"><div class="epLabel">Run length (trims each run evenly from both ends)</div><input type="range" min="0.25" max="1" step="0.02" value="1" oninput="window.setFakeValanceGeometry(\'length\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Lower rail — clearance above the bench seat (backrest rise)</div><input type="range" min="0.167" max="0.83" step="0.02" value="0.333" oninput="window.setFakeValanceGeometry(\'lowerOffset\', this.value)"></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Backrest height is a first-pass estimate — flag it once there\'s someone to actually sit against it and check.</div>';
      case 'extslats':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Vertical open-joint battens on 3 of the 4 OUTSIDE wall faces — real rainscreen-style cladding, not the heater\'s safety guard (that spacing is code-driven; these gaps are deliberately much wider, since there\'s no fall-safety requirement on a wall board). Mounted on a small standoff air gap off the wall. SW1 leaves a gap around the window; LW2 and SW2 run uninterrupted. LW1 (the door wall) is deliberately left bare — that\'s the same wall the app cuts away by default so you can see into the room, and a full run of slats there just turned into a fence of bars across that view. Say the word if you want a lighter, sparser pass added back on that one wall specifically.</div>'
          + '<div class="epRow"><div class="epLabel">Board width</div><input type="range" min="0.04" max="0.35" step="0.01" value="0.0917" oninput="window.setExtSlatGeometry(\'width\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Gap between boards</div><input type="range" min="0.08" max="0.7" step="0.01" value="0.2667" oninput="window.setExtSlatGeometry(\'gap\', this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Standoff (rainscreen air gap)</div><input type="range" min="0" max="0.35" step="0.01" value="0.0833" oninput="window.setExtSlatGeometry(\'standoff\', this.value)"></div>';
      case 'down':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">All downlights share one circuit — this changes every fixture at once, the same as the Lighting tab. This individual fixture repositions/copies/deletes from the toolbar above (it stays flush-mounted to the ceiling as you drag it — height isn\'t manual).</div>'
          + '<div class="epRow"><div class="epLabel">Downlight color</div><input type="color" value="#ffd9a8" oninput="window.setDownColor(this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Intensity</div><input type="range" min="0" max="2" step="0.05" value="1" oninput="window.setDownLevel(this.value)"></div>';
      case 'stars':
        return '<div class="epRow"><div class="epLabel">Star color</div><input type="color" value="#fff3e0" oninput="window.setStarsColor(this.value)"></div>'
          + '<div class="epRow"><div class="epLabel">Intensity</div><input type="range" min="0" max="2" step="0.05" value="1" oninput="window.setStarsLevel(this.value)"></div>';
      case 'landing':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Bridges the gap under the floating door — height stays fixed at 4-1/4in per spec. Finish tone matches the bench run (edit from any bench panel). Width and depth are real, working controls in the toolbar above.</div>';
      case 'floordeck':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Modular 4&times;3 (48"&times;36") deck tiles at the same 4-1/4in reveal as the entry landing, covering the whole interior floor &mdash; shares the bench finish (change tone from any bench panel). One rectangle of tiles is always left out over the heater; reposition or resize that opening from the "Heater Floor Cutout" element (Structure &amp; Envelope group below, or click the trimmed opening directly in the 3D view). Want an extra deck section elsewhere &mdash; a landing pad, a step, an outdoor platform? Use Copy in the toolbar above: it duplicates the whole 4&times;3 tile grid as one independent piece you can drag, rotate, and rescale anywhere, tiles and all.</div>';
      case 'floorhole':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">The precut opening in the deck tiling that lets the heater sit directly on the bare concrete slab instead of on combustible decking &mdash; keeps the heater\'s own height, and the ceiling clearance above it, from growing by the deck\'s thickness. Position and size are real, working controls in the toolbar above; whichever deck tiles it overlaps are the ones left out.</div>';
      case 'bucket':
        return '<div class="epRow"><div class="epLabel">Wood tone</div><div class="swatchRow">'
          + WOOD_TONES.map(t=> '<button class="toneSwatch" style="background:'+t.hex+'" title="'+t.name+'" onclick="window.setFreeformTone('+entry.index+',\''+t.hex+'\')"></button>').join('')
          + '</div></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">The l&ouml;yly water bucket &amp; ladle — real cedar. This tone only changes THIS bucket (copies get their own independent swatch, unlike the shared-material color pickers elsewhere). Move it anywhere in the room (including up onto the bench), rotate, resize, rename or copy it with the toolbar above.</div>';
      case 'stool':
        return '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Loose cedar footstool — not fixed to any wall, so it moves, rotates, resizes, renames and copies freely from the toolbar above. Shares the bench finish (change tone from any bench panel).</div>';
      case 'accent':
        return '<div class="epRow"><div class="epLabel">Accent light color</div><input type="color" value="#3fd18a" oninput="window.setAccentColor(this.value)"></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">A small glow-through glass accent panel. It follows the active lighting scheme by default (Lighting tab) — this swatch lets you override just this fixture (heads up: this color picker currently changes EVERY accent light at once, not just this one — ask if you need independent per-fixture color and we\'ll wire that up). Reposition/rotate/resize/rename/copy it from the toolbar above — it stays facing the wall it was mounted on (moving it to a different wall isn\'t wired up yet; ask if you want that).</div>';
      case 'thermo':
        return '<div class="epRow"><div class="epLabel">Dial tone</div><div class="swatchRow">'
          + WOOD_TONES.map(t=> '<button class="toneSwatch" style="background:'+t.hex+'" title="'+t.name+'" onclick="window.setThermoTone(\''+t.hex+'\')"></button>').join('')
          + '</div></div>'
          + '<div class="epRow" style="font-size:11px;color:#c7b6a2;">Wall-mounted sauna thermometer (heads up: this tone currently changes EVERY thermometer at once, not just this one — ask if you need independent per-fixture tone). Reposition/rotate/resize/rename/copy it from the toolbar above — it stays facing the wall it was mounted on (moving it to a different wall isn\'t wired up yet; ask if you want that).</div>';
      default:
        return '';
    }
  }

  function escapeHtml(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  // Every element gets this box, regardless of type — a plain, working way to leave written
  // notes/change-requests right on the piece they're about, instead of needing a separate
  // control per element. Persists through save/load (see getDesignState's `notes` map).
  //
  // A note used to just sit here as saved text with no real effect once written — a real, fair
  // complaint, since typing "move this 6 inches" did nothing on its own. This app can't safely
  // have an AI parse arbitrary free text and auto-edit the 3D geometry from it (that's a much
  // bigger, riskier feature — a typo or an ambiguous note could silently rewrite the design). The
  // honest fix that's actually safe to ship: every note is now a real open/resolved to-do. Marking
  // it resolved is the "execute" action — it's a genuine state change you make once you've actually
  // gone and made the edit yourself (with the toolbar/sliders) or otherwise handled the request, and
  // it's what drives the open-count badge and the punch list below so nothing gets silently lost.
  // Still auto-saves the text as you type — no separate "publish" step, editing the same box just
  // keeps overwriting the one note for this element. Saving an actual checkpoint/version is a
  // separate, deliberate action taken from the Versions tab.
  function notesBoxFor(entry){
    const val = (window.getElementNote ? window.getElementNote(entry.index) : '');
    const done = (window.isElementNoteDone ? window.isElementNoteDone(entry.index) : false);
    return '<div class="epRow epNotesRow"><div class="epLabel">Reminder note (does NOT auto-apply)</div>'
      + '<div class="epRow" style="font-size:11px;color:#c7b6a2;margin-top:-4px;">This is a written-down reminder only — typing here does not move, resize, or recolor anything by itself. For an actual change, use the real controls above/below, or just describe it in the chat with Claude and it\'ll come back as an updated file.</div>'
      + '<textarea class="epNotes" id="noteBox'+entry.index+'" rows="3" placeholder="e.g. \'ask Claude to widen this by 4 inches\' — a reminder for next time, not a live command" '
      + 'oninput="window.setElementNote('+entry.index+', this.value); uiRefreshNotesSummary(); '
      + 'this.parentElement.querySelector(\'.epResolvedCb\').disabled = !this.value; '
      + 'if(!this.value){ this.parentElement.querySelector(\'.epResolvedCb\').checked = false; }" '
      + 'onblur="uiRefreshNotesSummary()">'+escapeHtml(val)+'</textarea>'
      + '<div class="epNotesBtnRow"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11.5px;color:#e6d8c4;">'
      + '<input type="checkbox" class="epResolvedCb" '+(done?'checked':'')+' '+(val?'':'disabled')+' onchange="window.setElementNoteDone('+entry.index+', this.checked); uiRefreshNotesSummary();"> Resolved / handled</label>'
      + '<span class="epSavedFlash show">Saves automatically</span></div></div>';
  }
  window.uiRefreshNotesSummary = function(){ renderNotesSummary(); };
  window.uiToggleNoteDone = function(index, checked){
    if(window.setElementNoteDone) window.setElementNoteDone(index, checked);
    renderNotesSummary();
    // If that element's own panel happens to be open, keep its checkbox in sync too.
    const box = document.getElementById('noteBox'+index);
    if(box){
      const cb = box.parentElement.querySelector('.epNotesBtnRow input[type="checkbox"]');
      if(cb) cb.checked = checked;
    }
  };
  function renderNotesSummary(){
    const el = document.getElementById('notesSummary');
    if(!el || !window.getEditablesList) return;
    const list = window.getEditablesList();
    const withNotes = list.filter(e => window.getElementNote && window.getElementNote(e.index));
    if(!withNotes.length){ el.innerHTML = ''; return; }
    const open = withNotes.filter(e => !window.isElementNoteDone(e.index));
    const resolved = withNotes.filter(e => window.isElementNoteDone(e.index));
    // Open items first (the actual punch list), resolved ones after — still visible/reviewable,
    // just visually checked off, rather than disappearing once handled.
    const ordered = open.concat(resolved);
    el.innerHTML = '<div class="epLabel" style="margin-top:14px;">Notes to-do list ('+open.length+' open'+(resolved.length?', '+resolved.length+' resolved':'')+')</div>'
      + ordered.map(e => {
        const isDone = window.isElementNoteDone(e.index);
        return '<div class="noteItem'+(isDone?' noteDone':'')+'">'
          + '<label style="cursor:pointer;flex-shrink:0;margin-top:1px;" onclick="event.stopPropagation();">'
          + '<input type="checkbox" '+(isDone?'checked':'')+' onchange="window.uiToggleNoteDone('+e.index+', this.checked)"></label>'
          + '<div onclick="uiFocusElement('+e.index+')" style="cursor:pointer;flex:1;min-width:0;">'
          + '<div class="noteLabel">'+e.label+'</div><div class="noteText">'+escapeHtml(window.getElementNote(e.index))+'</div></div></div>';
      }).join('');
  }

  function renderEdit(entry){
    const area = document.getElementById('elementEditArea');
    if(!entry){ area.innerHTML = ''; return; }
    area.innerHTML = '<h5 style="margin-top:18px;">Editing</h5>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<span style="color:#f5c98a;font-weight:600;font-size:13.5px;">'+entry.label+'</span>'
      + '<span style="cursor:pointer;color:#c7b6a2;font-size:16px;padding:0 4px;" onclick="window.uiCloseElementEdit()">&times;</span>'
      + '</div>' + bodyFor(entry) + deleteRowFor(entry) + notesBoxFor(entry);
    if(window.decorateFtIn) window.decorateFtIn(area);
    document.querySelectorAll('.elItem').forEach(el=>{
      const isActive = parseInt(el.dataset.index,10)===entry.index;
      el.classList.toggle('active', isActive);
      if(isActive){
        const grp = el.closest('details.elGroup');
        if(grp && !grp.open) grp.open = true; // auto-expand its group so the highlight is actually visible
      }
    });
  }

  window.onEditableClick = function(entry){
    if(!entry){ renderEdit(null); return; }
    uiOpenSidebar();
    uiSwitchTab('elements');
    renderEdit(entry);
  };
  window.uiCloseElementEdit = function(){
    document.getElementById('elementEditArea').innerHTML = '';
    if(window.uiCloseToolbar) window.uiCloseToolbar();
    if(window.hideContextualMeasurements) window.hideContextualMeasurements();
  };

  // Grouped/nested instead of one long flat list, per the explicit request to cut down on
  // screen clutter. "Exterior Steps & Landing" is internally registered under the 'bench' type
  // (a naming leftover from when stairs were added alongside the bench system) but reads much
  // more sensibly grouped with Structure & Envelope than with the actual bench runs, so it's
  // special-cased by label rather than by its raw type.
  const ELEMENT_GROUPS = [
    {title:'Bench', match:e=> e.type==='bench' && e.label.indexOf('Exterior Steps')!==0},
    {title:'Lighting', match:e=> ['led','down','stars','valanceled'].indexOf(e.type)!==-1},
    {title:'Door & Heater', match:e=> e.type==='door' || e.type==='heater'},
    {title:'Fixtures', match:e=> ['bucket','thermo','accent','stool'].indexOf(e.type)!==-1},
    {title:'Structure & Envelope', match:e=> ['walls','floor','window','landing','floordeck','floorhole','fakevalance','extslats'].indexOf(e.type)!==-1 || (e.type==='bench' && e.label.indexOf('Exterior Steps')===0)},
  ];
  function renderElementsList(){
    const list = window.getEditablesList ? window.getEditablesList() : [];
    const container = document.getElementById('elementsList');
    const numbered = list.map((e,i)=> Object.assign({num:i+1}, e));
    const itemHtml = e => '<button class="elItem" data-index="'+e.index+'" onclick="uiFocusElement('+e.index+')"><span class="elNum">'+e.num+'</span><span>'+e.label+'</span></button>';
    const claimed = new Set();
    let html = ELEMENT_GROUPS.map(g=>{
      const items = numbered.filter(e=> !claimed.has(e.index) && g.match(e));
      items.forEach(e=> claimed.add(e.index));
      if(!items.length) return '';
      return '<details class="spec elGroup"><summary>'+g.title+'<span class="elGroupCount">'+items.length+'</span></summary>'
        + '<div class="body elGroupBody">' + items.map(itemHtml).join('') + '</div></details>';
    }).join('');
    // Safety net: anything not matched by a group above (e.g. a future new type) still shows up,
    // open by default, rather than silently disappearing from the list.
    const leftover = numbered.filter(e=> !claimed.has(e.index));
    if(leftover.length){
      html += '<details class="spec elGroup" open><summary>Other<span class="elGroupCount">'+leftover.length+'</span></summary>'
        + '<div class="body elGroupBody">' + leftover.map(itemHtml).join('') + '</div></details>';
    }
    container.innerHTML = html;
  }
  window.uiRenderElementsList = renderElementsList;
  window.uiFocusElement = function(i){
    window.focusEditableByIndex(i);
  };
  window.uiRenderNotesSummary = renderNotesSummary;

  // ---------- Add mode: point-and-click placement (currently: downlights, click the ceiling) ----------
  window.uiStartAddDownlight = function(){
    if(window.startAddMode) window.startAddMode('downlight');
  };
  window.onAddModeChange = function(kind){
    const banner = document.getElementById('addModeBanner');
    const btn = document.getElementById('addDownlightBtn');
    if(btn) btn.classList.toggle('active', kind === 'downlight');
    if(!banner) return;
    if(kind === 'downlight'){
      banner.innerHTML = '<div class="addModeBanner"><span>Click anywhere on the ceiling to place the new downlight.</span>'
        + '<button class="cancelAdd" onclick="window.cancelAddMode()">Cancel</button></div>';
    } else {
      banner.innerHTML = '';
    }
  };
  window.onAddModeMiss = function(msg){
    const banner = document.getElementById('addModeBanner');
    if(!banner) return;
    banner.innerHTML = '<div class="addModeBanner" style="background:rgba(224,110,90,0.14);border-color:rgba(224,110,90,0.4);color:#f0c4bd;">'+msg+'</div>';
    setTimeout(()=>{ if(banner) banner.innerHTML = ''; }, 2200);
  };
  window.onEditableAdded = function(entry){
    renderElementsList();
    if(entry) renderEdit(entry);
  };

  renderElementsList();
  renderNotesSummary();
})();

// ---------- Global element toolbar: move (all axes) / rotate (free or 10-degree snap) / resize
// (H+V) / copy / delete — one place for every generic, non-element-specific action, instead of
// scattering movement controls across every individual per-element panel. Wraps window.onEditable
// Click (defined just above) rather than touching it, so it works from BOTH the numbered Elements
// list and clicking an object directly in the 3D view, exactly like the per-element panel does. ----
(function(){
  let currentEntry = null;
  let snapMode = false; // false = free rotate (1-degree steps), true = 10-degree increments
  const prevOnEditableClick = window.onEditableClick;
  window.onEditableClick = function(entry){
    if(prevOnEditableClick) prevOnEditableClick(entry);
    currentEntry = entry;
    renderToolbar(entry);
  };

  function fmt(n){ return (Math.round(n*100)/100).toString(); }

  // ---------- Structural (spec-governed) move/size fields, rendered INTO the same global toolbar
  // instead of a "go look in the panel below" redirect. These are the exact same real setters and
  // ranges the per-element panel used to hard-code inline — moved here, not duplicated, per the
  // instruction to make navigation/positioning fully global rather than scattered per element.
  // Deliberately NOT copyable/rotatable/freely resizable: there's exactly one door, one heater,
  // one bench run per side — "resize" for these already means something else (a real dimension
  // like window width, not a multiplier), so it's just another field in the list below, not the
  // freeform Resize H/V sliders.
  function sRow(label, min, max, step, val, onInputCall, opts){
    opts = opts || {};
    const unit = opts.unit || 'ft';
    const ftin = opts.ftin !== false && unit === 'ft';
    return '<div class="tbRow"><div class="tbRowLabel">'+label+'<span class="tbVal">'+fmt(val)+unit+'</span></div>'
      + '<input type="range" '+(ftin?'data-ftin="1" ':'')+'min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'" '
      + 'oninput="'+onInputCall+'" onchange="window.uiRefreshStructuralToolbar()"></div>';
  }
  function sSelect(label, options, val, onChangeCall){
    return '<div class="tbRow"><div class="tbRowLabel">'+label+'</div>'
      + '<select onchange="'+onChangeCall+'; window.uiRefreshStructuralToolbar()">'
      + options.map(o=> '<option value="'+o.value+'"'+(o.value===val?' selected':'')+'>'+o.text+'</option>').join('')
      + '</select></div>';
  }
  window.uiRefreshStructuralToolbar = function(){ renderToolbar(currentEntry); };
  function structuralFieldsFor(entry){
    const ds = window.getDesignState ? window.getDesignState() : null;
    if(!ds) return '';
    if(entry.type === 'door'){
      // BUG FIX (2026-07-30, direct report: "the reigns taken off of width/height/place on the
      // wall/height off floor - set to weird settings that make it so you cannot move it where you
      // want"): these min/max now come straight from the same live JS that actually clamps
      // (DOOR_W_MIN/MAX, DOOR_H_MIN/MAX, getDoorHeightRangeIn — all defined in sauna_app.js, in the
      // same global scope this function runs in) instead of a second, independently-hardcoded set
      // of numbers here that could drift out of sync with the real logic. Width/height are real,
      // working sliders now too — used to be locked to one fixed spec size with no-op setters.
      const doorHRange = window.getDoorHeightRangeIn ? window.getDoorHeightRangeIn() : {min:4.25, max:20};
      return sRow('Position on LW1 (toward/away from SW1)', 0.3, 9.7, 0.02, ds.door.posX, 'window.setDoorPosition(this.value)')
        + sRow('Height off the floor', doorHRange.min, doorHRange.max, 0.25, ds.door.heightIn, 'window.setDoorHeightAboveFloor(this.value)', {unit:'in', ftin:false})
        + sRow('Width', DOOR_W_MIN, DOOR_W_MAX, 0.02, ds.door.widthFt, 'window.setDoorWidth(this.value)')
        + sRow('Height (panel)', DOOR_H_MIN, DOOR_H_MAX, 0.02, ds.door.panelHeightFt, 'window.setDoorHeight(this.value)')
        + '<div class="tbNote" style="margin-top:2px;">Height off the floor\'s own max moves with the panel height above it — a taller door leaves less roofline headroom, so that slider re-derives its real max every time you change this one.</div>';
    }
    if(entry.type === 'heater'){
      return sRow('Position along the front wall (LW1)', 0.3, 9.7, 0.05, ds.heater.posX, 'window.setHeaterPosition(\'x\', this.value)')
        + sRow('Standoff from wall (6"-12", per spec)', 0.5, 1.0, 0.02, ds.heater.posZ, 'window.setHeaterPosition(\'z\', -this.value)');
    }
    if(entry.type === 'window'){
      // Same fix as the door above — bounds come from window.getWindowRanges(), the exact same
      // live logic setWindowGeometry uses to clamp, computed fresh from the CURRENT window size/
      // position every render instead of a static guess.
      const winR = window.getWindowRanges ? window.getWindowRanges() : {w:{min:1,max:5}, h:{min:0.6,max:4}, z:{min:0.3,max:5.5}, y:{min:1,max:7}};
      return sRow('Position along wall', winR.z.min, winR.z.max, 0.05, ds.window.z, 'window.setWindowGeometry(\'z\', this.value)')
        + sRow('Height off floor', winR.y.min, winR.y.max, 0.05, ds.window.y, 'window.setWindowGeometry(\'y\', this.value)')
        + sRow('Width', winR.w.min, winR.w.max, 0.05, ds.window.w, 'window.setWindowGeometry(\'w\', this.value)')
        + sRow('Height', winR.h.min, winR.h.max, 0.05, ds.window.h, 'window.setWindowGeometry(\'h\', this.value)');
    }
    if(entry.type === 'landing'){
      return sRow('Width along LW1 (24in-40in)', 2.0, 3.34, 0.02, ds.landing.w, 'window.setLandingSize(\'w\', this.value)')
        + sRow('Depth into the room (36in-54in)', 3.0, 4.5, 0.02, ds.landing.d, 'window.setLandingSize(\'d\', this.value)');
    }
    if(entry.type === 'bench'){
      if(entry.label.indexOf('Back Bench') === 0){
        return sRow('Position along LW2', 0, 9.7, 0.05, ds.bench.runA.offset, 'window.setBenchRun(\'A\',\'offset\',this.value)')
          + sRow('Length', 2, 10.08, 0.05, ds.bench.runA.length, 'window.setBenchRun(\'A\',\'length\',this.value)');
      }
      if(entry.label.indexOf('Return Bench') === 0 || entry.label.indexOf('Left Bench') === 0){
        return sSelect('Wall', [{value:'SW1',text:'SW1 — window wall (default)'},{value:'SW2',text:'SW2 — opposite wall'}], ds.bench.runB.wall, 'window.setBenchRun(\'B\',\'wall\',this.value); if(window.uiRefreshLShapeLabel) window.uiRefreshLShapeLabel()')
          + sRow('Position along the wall', 0, 5.7, 0.05, ds.bench.runB.offset, 'window.setBenchRun(\'B\',\'offset\',this.value)')
          + sRow('Length', 2, 6.08, 0.05, ds.bench.runB.length, 'window.setBenchRun(\'B\',\'length\',this.value)');
      }
      if(entry.label.indexOf('Exterior Steps') === 0){
        return sSelect('Orientation', [{value:'along',text:'Turned to run along LW1 (default)'},{value:'out',text:'Straight out from the door'}], ds.deckStair.orientation, 'window.setDeckStairOrientation(this.value)')
          + sSelect('Turn direction (when running along LW1)', [{value:'right',text:'Toward SW1'},{value:'left',text:'Toward SW2'}], ds.deckStair.dir, 'window.setDeckStairSide(this.value)')
          + sRow('Deck height above the slab', 1.0, 3.0, 0.05, ds.deckStair.deckH, 'window.setStairGeometry(\'deckH\', this.value)')
          + sRow('Target riser height', 0.33, 0.67, 0.01, ds.deckStair.riserH, 'window.setStairGeometry(\'riserH\', this.value)')
          + sRow('Tread depth', 0.75, 1.5, 0.02, ds.deckStair.treadDepth, 'window.setStairGeometry(\'treadDepth\', this.value)')
          + sRow('Landing depth (24" code minimum)', 2.0, 4.0, 0.05, ds.deckStair.landingDepth, 'window.setStairGeometry(\'landingDepth\', this.value)')
          + sRow('Landing / stair width', 2.5, 6.0, 0.05, ds.deckStair.landingWidth, 'window.setStairGeometry(\'landingWidth\', this.value)')
          + sRow('Start offset (off the door\'s centerline)', -3.0, 3.0, 0.05, ds.deckStair.startOffset, 'window.setStairGeometry(\'startOffset\', this.value)');
      }
    }
    if(entry.type === 'floorhole'){
      return sRow('Position along the wall (X)', 0, 8.5, 0.05, ds.floorHole.x, 'window.setFloorHoleGeometry(\'x\', this.value)')
        + sRow('Distance out from the wall (Z)', 0, 4.5, 0.05, ds.floorHole.z, 'window.setFloorHoleGeometry(\'z\', this.value)')
        + sRow('Opening width', 1.5, 4.0, 0.05, ds.floorHole.w, 'window.setFloorHoleGeometry(\'w\', this.value)')
        + sRow('Opening depth', 1.5, 4.0, 0.05, ds.floorHole.d, 'window.setFloorHoleGeometry(\'d\', this.value)');
    }
    return ''; // walls/floor/floordeck: no positional fields — nothing to move
  }

  function renderToolbar(entry){
    const bar = document.getElementById('elementToolbar');
    if(!bar) return;
    const hint = document.getElementById('selectHint');
    if(hint) hint.style.display = entry ? 'none' : '';
    if(!entry){ bar.classList.remove('open'); bar.innerHTML = ''; return; }
    const freeform = window.isFreeform ? window.isFreeform(entry.index) : false;
    if(!freeform){
      const fields = structuralFieldsFor(entry);
      // BUG FIX (2026-07-30, direct report: "we really need a copy and paste function that is
      // global to all elements"): structural/spec-governed elements (door, heater, window, bench
      // runs, stairs, landing, floor cutout, rails) now get a real Copy button here too — it makes
      // an independent, freeform-movable DUPLICATE (see window.copyEditable's genericCopyEntry),
      // not a second live instance wired into this element's real position/size controls above.
      // The one real door/heater/window/etc keeps governing the actual build; the copy is something
      // you can pose anywhere. window.isCopyable excludes only the true whole-envelope groupings
      // (walls/floor) where "copy" wouldn't mean anything sensible. UPDATE (2026-07-30, direct
      // report: "why cant i copy and paste or move or make more of the sauna floor boards?"):
      // floordeck was wrongly lumped in with walls/floor at first pass — it's a modular tiled
      // surface (same category as a bench run or rail wrap), not the building envelope, so it's
      // copyable now too. The one real deck still fills the room and follows the heater cutout;
      // Copy gives you an independent, freely posable extra deck.
      const copyable = window.isCopyable ? window.isCopyable(entry.index) : false;
      const copyRow = copyable
        ? '<div class="tbActionRow"><button class="tbBtn" onclick="window.uiToolbarCopy('+entry.index+')">&#10697; Copy</button></div>'
        : '';
      bar.innerHTML = '<div class="tbHead"><span class="tbLabel">'+entry.label+'</span>'
        + '<span class="tbClose" onclick="window.uiCloseElementEdit()">&times;</span></div>'
        + (fields
            ? fields + '<div class="tbNote">Structural, spec-governed element — real position/size controls, intentionally bounded so the design stays buildable as drawn (they\'ll snap back if you drag past the legal range). There\'s still exactly one of these governing the actual build, but Copy below makes an independent, freely movable/rotatable/resizable duplicate you can pose anywhere. Finish/tone/style controls are still in the panel below.</div>'
            : (copyable
                ? '<div class="tbNote">This one stays fixed to the room\'s own dimensions, so there\'s no position control here for the original. Copy below makes an independent, freely movable/rotatable/resizable duplicate — use it to pose an extra copy anywhere, on the floor or elsewhere. Finish tone is in the panel below.</div>'
                : '<div class="tbNote">Fixed building envelope — no position to move here. Finish tone is in the panel below.</div>'))
        + copyRow;
      bar.classList.add('open');
      if(window.decorateFtIn) window.decorateFtIn(bar);
      return;
    }
    const t = window.getEditableTransform(entry.index);
    if(!t){ bar.classList.remove('open'); bar.innerHTML = ''; return; }
    const rotStep = snapMode ? 10 : 1;
    let html = '<div class="tbHead"><span class="tbLabel">'+entry.label+'</span>'
      + '<span class="tbClose" onclick="window.uiCloseElementEdit()">&times;</span></div>';
    html += '<div class="tbGrid">'
      + moveSlider(entry.index, 'x', 'X — across room (LW)', t.x, 0, 12)
      + (t.yLocked
          ? '<div class="tbRow"><div class="tbRowLabel">Y — height<span class="tbVal">flush to ceiling</span></div><div style="font-size:10.5px;color:#8a7c6c;">Follows the ceiling automatically as you move it</div></div>'
          : moveSlider(entry.index, 'y', 'Y — height (layer)', t.y, 0, 8))
      + moveSlider(entry.index, 'z', 'Z — into room (SW)', t.z, 0, 10)
      + '</div>';
    html += '<div class="tbRow"><div class="tbRowLabel">Rotate<span class="tbVal">'+Math.round(t.rotYDeg)+'&deg;</span></div>'
      + '<input type="range" min="0" max="350" step="'+rotStep+'" value="'+Math.round(t.rotYDeg)+'" '
      + 'oninput="window.uiToolbarMove('+entry.index+',\'rotYDeg\',this.value)">'
      + '<div class="tbBtnRow">'
      + '<button class="tbBtn" onclick="window.uiToolbarRotateNudge('+entry.index+',-10)">&#8634; 10&deg;</button>'
      + '<button class="tbBtn" onclick="window.uiToolbarRotateNudge('+entry.index+',10)">10&deg; &#8635;</button>'
      + '<label class="tbSnap"><input type="checkbox" '+(snapMode?'checked':'')+' onchange="window.uiToggleRotSnap(this.checked)"> Snap to 10&deg;</label>'
      + '</div></div>';
    html += '<div class="tbGrid" style="grid-template-columns:1fr 1fr;">'
      + resizeSlider(entry.index, 'scaleH', 'Resize — horizontal', t.scaleH)
      + resizeSlider(entry.index, 'scaleV', 'Resize — vertical', t.scaleV)
      + '</div>';
    html += '<div class="tbActionRow">'
      + '<button class="tbBtn" onclick="window.uiToolbarRename('+entry.index+')">&#9998; Rename</button>'
      + '<button class="tbBtn" onclick="window.uiToolbarCopy('+entry.index+')">&#10697; Copy</button>'
      + '<button class="tbDeleteBtn" onclick="window.uiToolbarDelete('+entry.index+')">Delete</button>'
      + '</div>'
      + '<div class="tbNote">Freeform fixture — move it anywhere in the room (including up onto a shelf or bench height), rotate, resize, rename, copy, or delete. Anything not generic to every fixture (like its color or finish) is still in the panel below.</div>';
    bar.innerHTML = html;
    if(window.decorateFtIn) window.decorateFtIn(bar);
    bar.classList.add('open');
  }

  function moveSlider(index, field, label, val, min, max){
    return '<div class="tbRow"><div class="tbRowLabel">'+label+'<span class="tbVal">'+fmt(val)+'ft</span></div>'
      + '<input type="range" data-ftin="1" min="'+min+'" max="'+max+'" step="0.05" value="'+val+'" '
      + 'oninput="window.uiToolbarMove('+index+',\''+field+'\',this.value)"></div>';
  }
  function resizeSlider(index, field, label, val){
    return '<div class="tbRow"><div class="tbRowLabel">'+label+'<span class="tbVal">'+fmt(val)+'&times;</span></div>'
      + '<input type="range" min="0.4" max="2.5" step="0.05" value="'+val+'" '
      + 'oninput="window.uiToolbarMove('+index+',\''+field+'\',this.value)"></div>';
  }

  window.uiToolbarMove = function(index, field, value){
    if(!window.setEditableTransform) return;
    window.setEditableTransform(index, field, value);
    // Refresh the numeric readouts in place without a full re-render (keeps sliders from jumping
    // under the user's finger mid-drag).
    const t = window.getEditableTransform(index);
    if(!t) return;
    renderToolbarValuesOnly(t);
  };
  function renderToolbarValuesOnly(t){
    const bar = document.getElementById('elementToolbar');
    if(!bar) return;
    const labels = bar.querySelectorAll('.tbRowLabel');
    // Order matches renderToolbar's markup: X, Y (or locked note), Z, Rotate, ResizeH, ResizeV.
    if(labels[0]) labels[0].querySelector('.tbVal') && (labels[0].querySelector('.tbVal').textContent = fmt(t.x)+'ft');
    if(!t.yLocked && labels[1]) labels[1].querySelector('.tbVal') && (labels[1].querySelector('.tbVal').textContent = fmt(t.y)+'ft');
    const zIdx = t.yLocked ? 1 : 2;
    if(labels[zIdx]) labels[zIdx].querySelector('.tbVal') && (labels[zIdx].querySelector('.tbVal').textContent = fmt(t.z)+'ft');
    const rotIdx = zIdx+1;
    if(labels[rotIdx]) labels[rotIdx].querySelector('.tbVal') && (labels[rotIdx].querySelector('.tbVal').textContent = Math.round(t.rotYDeg)+String.fromCharCode(176));
    const hIdx = rotIdx+1, vIdx = rotIdx+2;
    if(labels[hIdx]) labels[hIdx].querySelector('.tbVal') && (labels[hIdx].querySelector('.tbVal').textContent = fmt(t.scaleH)+'×');
    if(labels[vIdx]) labels[vIdx].querySelector('.tbVal') && (labels[vIdx].querySelector('.tbVal').textContent = fmt(t.scaleV)+'×');
  }
  window.uiToolbarRotateNudge = function(index, deg){
    if(!window.nudgeEditableRotation) return;
    window.nudgeEditableRotation(index, deg);
    renderToolbar(currentEntry);
  };
  window.uiToggleRotSnap = function(checked){
    snapMode = !!checked;
    renderToolbar(currentEntry);
  };
  window.uiToolbarCopy = function(index){
    if(!window.copyEditable) return;
    const newIdx = window.copyEditable(index);
    if(newIdx == null) return;
    if(window.uiRenderNotesSummary) window.uiRenderNotesSummary();
    // Rebuild the numbered/grouped sidebar list too, so the new copy actually shows up in it —
    // reuses the same grouped renderer as everywhere else instead of a second flat-list copy.
    if(window.uiRenderElementsList) window.uiRenderElementsList();
    const list = window.getEditablesList();
    const entry = list.find(e=>e.index===newIdx);
    if(entry && window.onEditableClick) window.onEditableClick(entry); // select the new copy immediately
  };
  window.uiToolbarDelete = function(index){
    if(window.uiDeleteEditable) window.uiDeleteEditable(index); // already clears the edit panel + refreshes the list
    currentEntry = null;
    renderToolbar(null);
  };
  window.uiToolbarRename = function(index){
    const t = window.getEditableTransform ? window.getEditableTransform(index) : null;
    const current = t ? t.label : '';
    const name = window.prompt('Rename this piece:', current);
    if(name == null) return; // cancelled
    if(!window.renameEditable || !window.renameEditable(index, name)) return;
    if(window.uiRenderElementsList) window.uiRenderElementsList();
    const list = window.getEditablesList ? window.getEditablesList() : [];
    const entry = list.find(e=>e.index===index);
    // Re-selecting through the normal click path refreshes BOTH the toolbar header and the edit
    // panel below (title + notes box) in one call, so the new name shows up everywhere at once.
    if(entry && window.onEditableClick) window.onEditableClick(entry);
  };
  window.uiCloseToolbar = function(){
    currentEntry = null;
    renderToolbar(null);
  };
})();

// ---------- L-Shape Left/Right quick buttons + Layout presets — REMOVED (2026-07-29) ----------
// window.setLShapeLeft/setLShapeRight/uiRefreshLShapeLabel and the window.applyLayoutPreset wrapper
// are intentionally gone, per direct instruction to delete the "quick swap" buttons — see the
// matching removal note in sauna_app.js (window.applyLayoutPreset/window.flipReturnWall). The
// per-object Return Bench edit panel's own "Wall" dropdown (bodyFor's 'bench' case, further down)
// still calls window.setBenchRun('B','wall',...) directly and guards its optional
// uiRefreshLShapeLabel() call with `if(window.uiRefreshLShapeLabel)`, so it keeps working fine now
// that function no longer exists.

// ---------- Markup overlay: magic lasso (freeform select) / pencil / note, on an SVG layer ----------
// Every mark left here is actionable, not decorative: it drops a small pin that, on tap, opens
// the SAME real edit panel used by the numbered Elements list / click-to-edit — so a note or a
// pencil circle around something is a shortcut into a working control, not a dead sketch.
(function(){
  const svg = document.getElementById('annoSvg');
  const NS = 'http://www.w3.org/2000/svg';
  let tool = 'orbit', drawing = false, curEl = null, pts = [];
  const groups = []; // each entry is an array of DOM nodes that undo together (mark + its pin)

  function pt(e){
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function strokeColor(){ return document.getElementById('annoColor').value; }

  window.uiSetTool = function(t){
    tool = t;
    document.querySelectorAll('.annoBtn[id^="tool-"]').forEach(b=> b.classList.toggle('active', b.id === 'tool-'+t));
    svg.classList.toggle('active', t !== 'orbit');
  };

  // Drops a small "open the real control" pin at (x,y) [SVG-local]. Looks up what's under the
  // mark via a raycast (clientX/clientY, screen coords) so the pin knows exactly which numbered
  // element to jump to; if nothing 3D is under the mark, it still opens the Elements tab so the
  // person can pick the right piece themselves rather than the mark going nowhere.
  function addEditPin(x, y, clientX, clientY){
    const entry = (window.__findEditableAt && clientX != null) ? window.__findEditableAt(clientX, clientY) : null;
    const g = document.createElementNS(NS,'g');
    g.setAttribute('class','annoEditPin');
    const dot = document.createElementNS(NS,'circle');
    dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('r','10');
    dot.setAttribute('fill', entry ? '#4ade80' : '#c7b6a2');
    dot.setAttribute('stroke', '#1a1410'); dot.setAttribute('stroke-width','1.5');
    g.appendChild(dot);
    const glyph = document.createElementNS(NS,'text');
    glyph.setAttribute('x', x); glyph.setAttribute('y', y+3.5);
    glyph.setAttribute('text-anchor','middle'); glyph.setAttribute('font-size','10');
    glyph.setAttribute('fill', '#1a1410'); glyph.setAttribute('font-family','-apple-system,sans-serif');
    glyph.textContent = '✎';
    g.appendChild(glyph);
    const title = document.createElementNS(NS,'title');
    title.textContent = entry ? ('Open control: '+entry.label) : 'Pick which piece this is about';
    g.appendChild(title);
    g.addEventListener('pointerdown', (e)=> e.stopPropagation());
    g.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(entry && window.onEditableClick){ window.onEditableClick(entry); }
      else { window.uiOpenSidebar(); window.uiSwitchTab('elements'); }
    });
    svg.appendChild(g);
    return g;
  }

  function addNoteAt(x,y,clientX,clientY){
    const color = strokeColor();
    const text = window.prompt('Note text:');
    if(text === null || text.trim() === '') return;
    const g = document.createElementNS(NS,'g');
    const dot = document.createElementNS(NS,'circle');
    dot.setAttribute('cx',x); dot.setAttribute('cy',y); dot.setAttribute('r','5');
    dot.setAttribute('fill', color);
    g.appendChild(dot);
    const bg = document.createElementNS(NS,'rect');
    const label = document.createElementNS(NS,'text');
    label.setAttribute('x', x+12); label.setAttribute('y', y+4);
    label.setAttribute('font-size','13'); label.setAttribute('font-family','-apple-system,sans-serif');
    label.setAttribute('fill', '#fff');
    label.textContent = text;
    g.appendChild(label);
    svg.appendChild(g);
    const bbox = label.getBBox();
    bg.setAttribute('x', bbox.x-5); bg.setAttribute('y', bbox.y-3);
    bg.setAttribute('width', bbox.width+10); bg.setAttribute('height', bbox.height+6);
    bg.setAttribute('rx','4'); bg.setAttribute('fill', 'rgba(20,15,10,0.82)');
    bg.setAttribute('stroke', color); bg.setAttribute('stroke-width','1');
    g.insertBefore(bg, label);
    svg.appendChild(g);
    const pin = addEditPin(x, y, clientX, clientY);
    groups.push([g, pin]);
  }

  svg.addEventListener('pointerdown', (e)=>{
    if(tool === 'orbit') return;
    const p = pt(e);
    if(tool === 'note'){ addNoteAt(p.x, p.y, e.clientX, e.clientY); return; }
    drawing = true;
    svg.setPointerCapture(e.pointerId);
    const color = strokeColor();
    if(tool === 'pencil'){
      pts = [p.x+','+p.y];
      curEl = document.createElementNS(NS,'polyline');
      curEl.setAttribute('points', pts.join(' '));
      curEl.setAttribute('fill','none');
      curEl.setAttribute('stroke', color);
      curEl.setAttribute('stroke-width','3');
      curEl.setAttribute('stroke-linecap','round');
      curEl.setAttribute('stroke-linejoin','round');
    } else if(tool === 'lasso'){
      pts = [p.x+','+p.y];
      curEl = document.createElementNS(NS,'polygon');
      curEl.setAttribute('points', pts.join(' '));
      curEl.setAttribute('fill', color);
      curEl.setAttribute('fill-opacity', '0.16');
      curEl.setAttribute('stroke', color);
      curEl.setAttribute('stroke-width','2.5');
      curEl.setAttribute('stroke-dasharray','6,4');
      curEl.setAttribute('stroke-linejoin','round');
    }
    if(curEl) svg.appendChild(curEl);
  });

  svg.addEventListener('pointermove', (e)=>{
    if(!drawing || !curEl) return;
    const p = pt(e);
    pts.push(p.x+','+p.y);
    curEl.setAttribute('points', pts.join(' '));
  });

  function finish(e){
    if(!drawing) return;
    drawing = false;
    if(curEl){
      const grp = [curEl];
      if(e && e.clientX != null){
        const p = pt(e);
        grp.push(addEditPin(p.x, p.y, e.clientX, e.clientY));
      }
      groups.push(grp);
    }
    curEl = null;
  }
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);

  window.uiAnnoUndo = function(){
    const grp = groups.pop();
    if(!grp) return;
    grp.forEach(el=>{ if(el && el.parentNode) el.parentNode.removeChild(el); });
  };
  window.uiAnnoClear = function(){
    groups.length = 0;
    while(svg.firstChild) svg.removeChild(svg.firstChild);
  };
})();

// ---------- Versions: save/load/export/import (localStorage, this browser + this file only) ----------
(function(){
  // Storage now goes through the shared platform store (namespaced keys +
  // legacy sauna3d_versions_v1 migration) instead of a file-private key.
  const store = window.PlatformStore('sauna');
  function loadVersions(){ return store.loadVersions(); }
  function saveVersions(v){ return store.saveVersions(v); }
  function renderVersions(){
    const list = loadVersions();
    const el = document.getElementById('versionsList');
    if(!el) return;
    if(!list.length){ el.innerHTML = '<div style="font-size:11.5px;color:#c7b6a2;margin-top:6px;">No saved versions yet.</div>'; return; }
    el.innerHTML = list.map((v,i)=>
      '<div class="versionRow"><span class="vName">'+v.name+'</span><span class="vBtns">'
      + '<button onclick="window.uiLoadVersion('+i+')">Load</button>'
      + '<button class="danger" onclick="window.uiDeleteVersion('+i+')">Delete</button>'
      + '</span></div>'
    ).join('');
  }
  window.uiSaveVersion = function(){
    if(!window.getDesignState){ alert('Not ready yet — try again in a moment.'); return; }
    const name = window.prompt('Name this version:', 'Version '+(loadVersions().length+1));
    if(name===null || name.trim()==='') return;
    const list = loadVersions();
    list.push({name: name.trim(), state: window.getDesignState(), savedAt: new Date().toISOString()});
    if(saveVersions(list)){ renderVersions(); }
    else { alert('Could not save to this browser\'s local storage. Use Export instead to save a .json file.'); }
  };
  window.uiLoadVersion = function(i){
    const list = loadVersions();
    if(!list[i]) return;
    window.applyDesignState(list[i].state);
    if(window.uiRenderNotesSummary) window.uiRenderNotesSummary();
  };
  window.uiDeleteVersion = function(i){
    const list = loadVersions();
    list.splice(i,1);
    saveVersions(list);
    renderVersions();
  };
  window.uiExportVersions = function(){
    const list = loadVersions();
    if(!list.length){ alert('No saved versions yet — save one first.'); return; }
    const blob = new Blob([JSON.stringify(list,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sauna-versions.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  window.uiImportVersionsFile = function(input){
    const file = input.files && input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      try{
        const imported = JSON.parse(reader.result);
        if(!Array.isArray(imported)) throw new Error('not an array');
        saveVersions(loadVersions().concat(imported));
        renderVersions();
      } catch(e){ alert('Could not read that file as a versions export.'); }
    };
    reader.readAsText(file);
    input.value = '';
  };
  renderVersions();
})();
