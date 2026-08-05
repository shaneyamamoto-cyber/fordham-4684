// Hardware icon library — flat, gradient-free SVG silhouettes (safe for data-URI export).
// Each entry: { id, category, name, svg(metalHex) -> full <svg> markup string }.
// Reserved for a future picker/pop-up (fitting swap menu); not wired into any UI yet.
// Shade helpers keep every icon two-tone (dark base + light highlight) from ONE hex input.
(function (global) {
  function shades(hex) {
    var q = String(hex).replace('#', '');
    var r = parseInt(q.slice(0, 2), 16), g = parseInt(q.slice(2, 4), 16), b = parseInt(q.slice(4, 6), 16);
    var dk = 'rgb(' + Math.round(r * 0.62) + ',' + Math.round(g * 0.62) + ',' + Math.round(b * 0.62) + ')';
    var lt = 'rgb(' + Math.min(255, Math.round(r * 1.28 + 20)) + ',' + Math.min(255, Math.round(g * 1.28 + 20)) + ',' + Math.min(255, Math.round(b * 1.28 + 20)) + ')';
    return { dk: dk, lt: lt };
  }
  function svg(body) {
    return "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" + body + "</svg>";
  }
  function icon(id, category, name, bodyFn) {
    return { id: id, category: category, name: name, svg: function (hex) { var s = shades(hex); return svg(bodyFn(s.dk, s.lt)); } };
  }

  var LIB = [
    // --- TAPS / SPOUTS (6) ---
    icon('tap-gooseneck', 'tap', 'Gooseneck spout', function (dk, lt) {
      return "<circle cx='50' cy='14' r='13' fill='" + dk + "'/><circle cx='50' cy='14' r='9' fill='" + lt + "'/>" +
        "<path d='M42,18 L42,55 Q42,74 60,78 L78,82' fill='none' stroke='" + lt + "' stroke-width='15' stroke-linecap='round'/>";
    }),
    icon('tap-wall-flange', 'tap', 'Wall flange spout', function (dk, lt) {
      return "<circle cx='20' cy='50' r='16' fill='" + dk + "'/><circle cx='20' cy='50' r='11' fill='" + lt + "'/>" +
        "<rect x='20' y='42' width='60' height='16' rx='8' fill='" + lt + "'/>";
    }),
    icon('tap-widespread-post', 'tap', 'Widespread post', function (dk, lt) {
      return "<rect x='42' y='4' width='16' height='70' rx='8' fill='" + lt + "'/><rect x='38' y='74' width='24' height='10' rx='2' fill='" + dk + "'/>";
    }),
    icon('tap-bridge', 'tap', 'Bridge faucet', function (dk, lt) {
      return "<rect x='16' y='60' width='10' height='30' rx='4' fill='" + dk + "'/><rect x='74' y='60' width='10' height='30' rx='4' fill='" + dk + "'/>" +
        "<path d='M21,62 Q21,20 50,20 Q79,20 79,62' fill='none' stroke='" + lt + "' stroke-width='11'/>";
    }),
    icon('tap-pot-filler', 'tap', 'Wall pot-filler (folding)', function (dk, lt) {
      return "<circle cx='50' cy='10' r='11' fill='" + dk + "'/><rect x='44' y='14' width='12' height='30' fill='" + lt + "'/>" +
        "<rect x='44' y='44' width='40' height='11' rx='5' fill='" + lt + "' transform='rotate(0 50 50)'/>" +
        "<rect x='74' y='44' width='11' height='40' rx='5' fill='" + lt + "'/>";
    }),
    icon('tap-deck-single', 'tap', 'Deck-mount single hole', function (dk, lt) {
      return "<rect x='40' y='30' width='20' height='60' rx='8' fill='" + dk + "'/><rect x='44' y='36' width='12' height='48' rx='6' fill='" + lt + "'/>" +
        "<rect x='30' y='20' width='40' height='10' rx='5' fill='" + lt + "'/>";
    }),

    // --- HANDLES (6) ---
    icon('handle-cross', 'handle', 'Cross handle', function (dk, lt) {
      return "<circle cx='50' cy='50' r='46' fill='" + dk + "'/><circle cx='50' cy='50' r='38' fill='" + lt + "'/>" +
        "<g fill='" + lt + "' stroke='" + dk + "' stroke-width='2'><rect x='40' y='10' width='20' height='80' rx='6'/><rect x='10' y='40' width='80' height='20' rx='6'/></g>" +
        "<circle cx='50' cy='50' r='9' fill='" + dk + "'/>";
    }),
    icon('handle-lever', 'handle', 'Single lever', function (dk, lt) {
      return "<rect x='20' y='20' width='60' height='60' rx='10' fill='" + dk + "'/><circle cx='50' cy='50' r='22' fill='" + lt + "'/>" +
        "<rect x='47' y='6' width='6' height='40' rx='3' fill='" + lt + "' transform='rotate(35 50 50)'/>";
    }),
    icon('handle-wheel', 'handle', 'Wheel handle', function (dk, lt) {
      return "<circle cx='50' cy='50' r='42' fill='none' stroke='" + dk + "' stroke-width='10'/>" +
        "<circle cx='50' cy='50' r='42' fill='none' stroke='" + lt + "' stroke-width='4'/>" +
        "<circle cx='50' cy='50' r='12' fill='" + dk + "'/>" +
        "<g stroke='" + dk + "' stroke-width='6'><line x1='50' y1='14' x2='50' y2='30'/><line x1='50' y1='70' x2='50' y2='86'/><line x1='14' y1='50' x2='30' y2='50'/><line x1='70' y1='50' x2='86' y2='50'/></g>";
    }),
    icon('handle-knurled-knob', 'handle', 'Knurled knob', function (dk, lt) {
      return "<circle cx='50' cy='50' r='34' fill='" + lt + "'/>" +
        "<circle cx='50' cy='50' r='34' fill='none' stroke='" + dk + "' stroke-width='3' stroke-dasharray='4 4'/>" +
        "<circle cx='50' cy='50' r='10' fill='" + dk + "'/>";
    }),
    icon('handle-paddle', 'handle', 'Paddle (ADA) handle', function (dk, lt) {
      return "<circle cx='22' cy='50' r='16' fill='" + dk + "'/><circle cx='22' cy='50' r='10' fill='" + lt + "'/>" +
        "<rect x='22' y='40' width='60' height='20' rx='9' fill='" + lt + "'/>";
    }),
    icon('handle-disc', 'handle', 'Ceramic disc handle', function (dk, lt) {
      return "<circle cx='50' cy='50' r='40' fill='" + dk + "'/><circle cx='50' cy='50' r='30' fill='" + lt + "'/>" +
        "<rect x='46' y='10' width='8' height='30' rx='4' fill='" + dk + "'/>";
    }),

    // --- SHOWERHEADS / TUB SPOUTS (4) ---
    icon('shower-round-rain', 'shower', 'Round rainhead', function (dk, lt) {
      return "<rect x='4' y='42' width='40' height='16' rx='8' fill='" + lt + "'/>" +
        "<ellipse cx='70' cy='50' rx='28' ry='40' fill='" + dk + "'/><ellipse cx='70' cy='50' rx='22' ry='34' fill='" + lt + "'/>" +
        "<ellipse cx='70' cy='50' rx='22' ry='34' fill='none' stroke='" + dk + "' stroke-width='2' stroke-dasharray='3 5'/>";
    }),
    icon('shower-square-rain', 'shower', 'Square rainhead', function (dk, lt) {
      return "<rect x='4' y='42' width='30' height='16' rx='8' fill='" + lt + "'/>" +
        "<rect x='34' y='16' width='62' height='68' rx='6' fill='" + dk + "'/><rect x='40' y='22' width='50' height='56' rx='4' fill='" + lt + "'/>";
    }),
    icon('shower-handheld-slide', 'shower', 'Handheld on slide bar', function (dk, lt) {
      return "<rect x='70' y='6' width='8' height='88' rx='4' fill='" + dk + "'/>" +
        "<rect x='58' y='40' width='24' height='16' rx='6' fill='" + lt + "'/>" +
        "<path d='M30,70 Q20,80 26,90' fill='none' stroke='" + dk + "' stroke-width='6' stroke-linecap='round'/>" +
        "<ellipse cx='26' cy='60' rx='16' ry='12' fill='" + lt + "' transform='rotate(-25 26 60)'/>";
    }),
    icon('spout-ball-joint', 'shower', 'Traditional ball-joint spout', function (dk, lt) {
      return "<circle cx='50' cy='16' r='14' fill='" + dk + "'/><circle cx='50' cy='16' r='9' fill='" + lt + "'/>" +
        "<path d='M50,24 L50,90' stroke='" + lt + "' stroke-width='9'/>" +
        "<ellipse cx='50' cy='90' rx='22' ry='7' fill='" + dk + "'/>";
    }),

    // --- TOWEL / RING / HOOK (7) ---
    icon('towel-bar-straight', 'towel', 'Straight towel bar', function (dk, lt) {
      return "<rect x='2' y='38' width='14' height='24' rx='4' fill='" + dk + "'/><rect x='84' y='38' width='14' height='24' rx='4' fill='" + dk + "'/>" +
        "<rect x='10' y='44' width='80' height='12' rx='6' fill='" + lt + "'/>";
    }),
    icon('towel-bar-ladder', 'towel', 'Ladder (multi-bar)', function (dk, lt) {
      return "<rect x='4' y='4' width='10' height='92' rx='4' fill='" + dk + "'/><rect x='86' y='4' width='10' height='92' rx='4' fill='" + dk + "'/>" +
        "<g fill='" + lt + "'><rect x='12' y='14' width='76' height='9' rx='4'/><rect x='12' y='45' width='76' height='9' rx='4'/><rect x='12' y='76' width='76' height='9' rx='4'/></g>";
    }),
    icon('towel-ring', 'towel', 'Towel ring', function (dk, lt) {
      return "<rect x='2' y='40' width='16' height='20' rx='4' fill='" + dk + "'/>" +
        "<circle cx='58' cy='50' r='38' fill='none' stroke='" + lt + "' stroke-width='13'/>" +
        "<circle cx='58' cy='50' r='38' fill='none' stroke='" + dk + "' stroke-width='2'/>";
    }),
    icon('towel-ring-double', 'towel', 'Double towel ring', function (dk, lt) {
      return "<rect x='2' y='34' width='14' height='16' rx='3' fill='" + dk + "'/><rect x='2' y='58' width='14' height='16' rx='3' fill='" + dk + "'/>" +
        "<circle cx='55' cy='42' r='30' fill='none' stroke='" + lt + "' stroke-width='9'/>" +
        "<circle cx='55' cy='66' r='30' fill='none' stroke='" + lt + "' stroke-width='9'/>";
    }),
    icon('hook-single', 'towel', 'Single robe hook', function (dk, lt) {
      return "<rect x='38' y='4' width='24' height='16' rx='4' fill='" + dk + "'/>" +
        "<path d='M50,20 L50,60 Q50,78 68,78' fill='none' stroke='" + lt + "' stroke-width='11' stroke-linecap='round'/>";
    }),
    icon('hook-double', 'towel', 'Double hook', function (dk, lt) {
      return "<rect x='38' y='4' width='24' height='16' rx='4' fill='" + dk + "'/>" +
        "<path d='M44,20 L44,54 Q44,68 30,70' fill='none' stroke='" + lt + "' stroke-width='9' stroke-linecap='round'/>" +
        "<path d='M56,20 L56,66 Q56,82 74,84' fill='none' stroke='" + lt + "' stroke-width='9' stroke-linecap='round'/>";
    }),
    icon('hook-ball-end', 'towel', 'Ball-end hook', function (dk, lt) {
      return "<circle cx='50' cy='12' r='12' fill='" + dk + "'/>" +
        "<path d='M50,22 L50,64 Q50,84 74,84' fill='none' stroke='" + lt + "' stroke-width='10' stroke-linecap='round'/>" +
        "<circle cx='74' cy='84' r='7' fill='" + dk + "'/>";
    }),

    // --- SCONCES / LIGHTS (5) ---
    icon('sconce-cylinder', 'light', 'Cylinder sconce', function (dk, lt) {
      return "<rect x='30' y='2' width='40' height='96' rx='18' fill='" + dk + "'/><rect x='36' y='8' width='28' height='84' rx='14' fill='" + lt + "'/>" +
        "<ellipse cx='50' cy='50' rx='11' ry='34' fill='#f5e6b8' opacity='0.85'/>";
    }),
    icon('sconce-globe', 'light', 'Globe sconce', function (dk, lt) {
      return "<rect x='42' y='2' width='16' height='30' fill='" + dk + "'/><circle cx='50' cy='58' r='34' fill='" + lt + "'/>" +
        "<circle cx='50' cy='58' r='34' fill='none' stroke='" + dk + "' stroke-width='3'/>";
    }),
    icon('light-picture-bar', 'light', 'Picture / vanity light bar', function (dk, lt) {
      return "<rect x='2' y='40' width='96' height='16' rx='8' fill='" + dk + "'/><rect x='8' y='44' width='84' height='8' rx='4' fill='#f5e6b8'/>" +
        "<rect x='44' y='56' width='12' height='16' fill='" + dk + "'/>";
    }),
    icon('sconce-arm', 'light', 'Wall sconce with arm', function (dk, lt) {
      return "<rect x='2' y='42' width='14' height='16' rx='4' fill='" + dk + "'/>" +
        "<rect x='14' y='46' width='46' height='8' fill='" + lt + "'/>" +
        "<circle cx='72' cy='50' r='26' fill='" + lt + "'/><circle cx='72' cy='50' r='26' fill='none' stroke='" + dk + "' stroke-width='3'/>";
    }),
    icon('light-flush-puck', 'light', 'Flush-mount puck', function (dk, lt) {
      return "<circle cx='50' cy='50' r='44' fill='" + dk + "'/><circle cx='50' cy='50' r='34' fill='" + lt + "'/>" +
        "<circle cx='50' cy='50' r='20' fill='#f5e6b8' opacity='0.85'/>";
    }),

    // --- MIRROR FRAME STYLES (4) ---
    icon('mirror-arch', 'mirror', 'Arched top', function (dk, lt) {
      return "<path d='M6,100 L6,40 Q6,4 50,4 Q94,4 94,40 L94,100 Z' fill='" + dk + "'/>" +
        "<path d='M14,100 L14,42 Q14,12 50,12 Q86,12 86,42 L86,100 Z' fill='" + lt + "'/>";
    }),
    icon('mirror-rounded-rect', 'mirror', 'Rounded rectangle', function (dk, lt) {
      return "<rect x='4' y='4' width='92' height='92' rx='16' fill='" + dk + "'/><rect x='12' y='12' width='76' height='76' rx='10' fill='" + lt + "'/>";
    }),
    icon('mirror-oval', 'mirror', 'Oval', function (dk, lt) {
      return "<ellipse cx='50' cy='50' rx='48' ry='46' fill='" + dk + "'/><ellipse cx='50' cy='50' rx='40' ry='38' fill='" + lt + "'/>";
    }),
    icon('mirror-pill', 'mirror', 'Pill / stadium', function (dk, lt) {
      return "<rect x='2' y='2' width='96' height='96' rx='48' fill='" + dk + "'/><rect x='10' y='10' width='80' height='80' rx='40' fill='" + lt + "'/>";
    }),

    // --- CABINET PULLS (4) ---
    icon('pull-bar', 'pull', 'Bar pull', function (dk, lt) {
      return "<rect x='4' y='42' width='16' height='16' rx='4' fill='" + dk + "'/><rect x='80' y='42' width='16' height='16' rx='4' fill='" + dk + "'/>" +
        "<rect x='12' y='46' width='76' height='8' rx='4' fill='" + lt + "'/>";
    }),
    icon('pull-cup', 'pull', 'Cup pull', function (dk, lt) {
      return "<path d='M20,20 Q20,80 50,80 Q80,80 80,20' fill='none' stroke='" + dk + "' stroke-width='14'/>" +
        "<path d='M20,20 Q20,80 50,80 Q80,80 80,20' fill='none' stroke='" + lt + "' stroke-width='6'/>";
    }),
    icon('pull-knob', 'pull', 'Round knob', function (dk, lt) {
      return "<circle cx='50' cy='50' r='30' fill='" + dk + "'/><circle cx='50' cy='50' r='22' fill='" + lt + "'/>";
    }),
    icon('pull-ring', 'pull', 'Ring pull (backplate)', function (dk, lt) {
      return "<rect x='30' y='6' width='40' height='40' rx='6' fill='" + dk + "'/>" +
        "<circle cx='50' cy='66' r='24' fill='none' stroke='" + lt + "' stroke-width='9'/>";
    }),

    // --- ACCESSORIES (4) ---
    icon('acc-soap-dish', 'accessory', 'Soap dish', function (dk, lt) {
      return "<rect x='4' y='40' width='92' height='14' rx='7' fill='" + dk + "'/><ellipse cx='50' cy='40' rx='40' ry='10' fill='" + lt + "'/>";
    }),
    icon('acc-tumbler', 'accessory', 'Tumbler holder', function (dk, lt) {
      return "<rect x='40' y='4' width='20' height='14' rx='4' fill='" + dk + "'/><rect x='44' y='16' width='12' height='30' fill='" + dk + "'/>" +
        "<path d='M30,46 L70,46 L64,90 L36,90 Z' fill='none' stroke='" + lt + "' stroke-width='6'/>";
    }),
    icon('acc-tp-holder', 'accessory', 'Toilet paper holder', function (dk, lt) {
      return "<rect x='2' y='40' width='14' height='20' rx='4' fill='" + dk + "'/>" +
        "<circle cx='55' cy='50' r='34' fill='none' stroke='" + lt + "' stroke-width='10'/>" +
        "<circle cx='55' cy='50' r='10' fill='" + dk + "'/>";
    }),
    icon('acc-tank-lever', 'accessory', 'Tank flush lever', function (dk, lt) {
      return "<rect x='10' y='44' width='50' height='12' rx='6' fill='" + lt + "'/><circle cx='60' cy='50' r='10' fill='" + dk + "'/>";
    })
  ];

  global.HARDWARE_ICON_LIBRARY = LIB;
})(typeof window !== 'undefined' ? window : this);
