'use strict';

// Firefly portrait engine — adapted from Firefly-UI-animation v1.2.0 (Qoder skin).
// Assets arrive as data URIs in ASSETS so the bundle is self-contained.

var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
var EYE_REVEAL_MS = 2200;
var LINE_SRC = ASSETS.line;
var PORTRAIT_SRC = { open: ASSETS.open, atlas: ASSETS.atlas, flow: ASSETS.flow };
var BLINK_EVERY_MS = 20000;

  function createFireflies(canvas, options) {
    var opts = options || {};
    var noop = { stop: function () {} };
    if (!canvas) return noop;
    var ctx = canvas.getContext('2d');
    if (!ctx) return noop;

    var count = reduceMotion ? Math.min(24, opts.count || 20) : (opts.count || 20);
    var flow = opts.speed || 1;
    var dpr = 1;
    var w = 0;
    var h = 0;
    var raf = 0;
    var running = true;
    var last = performance.now();
    var parts = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.7,
          vx: (Math.random() - 0.5) * 0.16 * flow,
          vy: -(0.05 + Math.random() * 0.20) * flow,
          phase: Math.random() * Math.PI * 2,
          speed: 0.45 + Math.random() * 0.9,
          magenta: Math.random() < 0.16,
          alpha: 0.22 + Math.random() * 0.55
        });
      }
    }

    function draw(now) {
      if (!running) return;
      if (!canvas.isConnected) { running = false; return; }
      var dt = Math.min(48, now - last) / 16.67;
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.phase += 0.012 * p.speed * dt * flow;
        p.x += (p.vx + Math.sin(p.phase) * 0.07 * flow) * dt;
        p.y += p.vy * dt;
        if (p.y < -24) {
          p.y = h + 16;
          p.x = Math.random() * w;
        }
        if (p.x < -24) p.x = w + 16;
        else if (p.x > w + 24) p.x = -16;

        var twinkle = 0.55 + 0.45 * Math.sin(p.phase * 1.7);
        var alpha = p.alpha * twinkle;
        var color = p.magenta
          ? 'rgba(255, 150, 230, ' + alpha.toFixed(3) + ')'
          : 'rgba(190, 244, 255, ' + alpha.toFixed(3) + ')';

        ctx.shadowBlur = 10;
        ctx.shadowColor = p.magenta ? 'rgba(255, 122, 217, 0.85)' : 'rgba(127, 231, 255, 0.9)';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        if (opts.streak && p.r > 1.7) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(127, 231, 255, ' + (alpha * 0.3).toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 9, p.y + 12);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }

    function onResize() {
      resize();
      seed();
      if (reduceMotion) draw(performance.now());
    }

    resize();
    seed();
    if (reduceMotion) draw(performance.now());
    else raf = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);

    return {
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
      }
    };
  }

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Draws the line art outward from the eyes with a soft, noisy light front.
  function createLineReveal(canvas) {
    var noop = {
      start: function (opts) { if (opts && opts.onDone) opts.onDone(); },
      finish: function () {},
      stop: function () {}
    };
    if (!canvas || !canvas.getContext) return noop;
    var ctx = canvas.getContext('2d');
    if (!ctx) return noop;

    var W = canvas.width;
    var H = canvas.height;
    var mask = document.createElement('canvas');
    mask.width = W;
    mask.height = H;
    var mctx = mask.getContext('2d');
    var cx = W * 0.704;
    var cy = H * 0.324;
    var maxR = Math.sqrt(W * W + H * H) * 0.62;
    var img = new Image();
    var loaded = false;
    var running = false;
    var raf = 0;
    var startedAt = 0;
    var duration = 1;
    var lastPaint = 0;
    var opts = {};
    var phase = 0;

    img.onload = function () { loaded = true; };
    img.src = LINE_SRC;

    function paint(r) {
      phase += 0.08;
      var rr = Math.max(6, r);
      var coreR = Math.max(6, rr * 0.74);
      var core = mctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, 'rgba(255,255,255,1)');
      core.addColorStop(0.58, 'rgba(255,255,255,0.96)');
      core.addColorStop(1, 'rgba(255,255,255,0)');
      mctx.fillStyle = core;
      mctx.beginPath();
      mctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      mctx.fill();

      var n = 44;
      for (var i = 0; i < n; i++) {
        var ang = (i / n) * Math.PI * 2;
        var wob = 1 + Math.sin(ang * 3 + phase * 0.9) * 0.05 + Math.sin(ang * 7 - phase * 0.6) * 0.032;
        var rad = rr * wob;
        var x = cx + Math.cos(ang) * rad;
        var y = cy + Math.sin(ang) * rad;
        var br = Math.max(10, rr * 0.32);
        var g = mctx.createRadialGradient(x, y, 0, x, y, br);
        g.addColorStop(0, 'rgba(255,255,255,0.98)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.92)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        mctx.fillStyle = g;
        mctx.beginPath();
        mctx.arc(x, y, br, 0, Math.PI * 2);
        mctx.fill();
      }

      ctx.clearRect(0, 0, W, H);
      if (!loaded) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, 0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(127, 231, 255, 0.11)';
      ctx.lineWidth = Math.max(2, rr * 0.022);
      ctx.shadowColor = 'rgba(127, 231, 255, 0.8)';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(cx, cy, rr * 0.985, 0, Math.PI * 2);
      ctx.stroke();

      for (var s = 0; s < 7; s++) {
        var sa = phase * 1.7 + s * 0.897;
        var sx = cx + Math.cos(sa) * rr * (1.0 + 0.04 * Math.sin(phase + s));
        var sy = cy + Math.sin(sa) * rr * (1.0 + 0.04 * Math.cos(phase + s));
        var sr = 1.4 + (s % 3) * 0.8;
        ctx.fillStyle = 'rgba(226, 252, 255, ' + (0.35 + 0.2 * Math.sin(phase + s)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    }

    function frame(now) {
      if (!running) return;
      if (!startedAt) startedAt = now;
      var t = Math.min(1, (now - startedAt) / duration);
      if (now - lastPaint < 32 && t < 1) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastPaint = now;

      var p = easeInOut(t);
      paint(maxR * (0.035 + p * 0.985));
      if (opts.onProgress) opts.onProgress(p);

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
        if (opts.onDone) opts.onDone();
      }
    }

    return {
      start: function (options) {
        opts = options || {};
        if (reduceMotion) {
          paint(maxR);
          if (opts.onProgress) opts.onProgress(1);
          if (opts.onDone) opts.onDone();
          return;
        }
        running = true;
        startedAt = 0;
        lastPaint = 0;
        duration = opts.duration || 4000;
        raf = requestAnimationFrame(frame);
      },
      finish: function () {
        running = false;
        cancelAnimationFrame(raf);
        paint(maxR);
      },
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
  }

  // DOM fallback blinker (used only when the WebGL portrait is unavailable).
  function createBlinker(setBlink) {
    var timer = 0;
    var offTimer = 0;
    var stopped = false;

    function runBlink() {
      if (stopped) return;
      setBlink(true);
      offTimer = setTimeout(function () {
        setBlink(false);
        schedule();
      }, 62 + Math.random() * 36);
    }

    function schedule() {
      if (stopped) return;
      timer = setTimeout(runBlink, BLINK_EVERY_MS + (Math.random() - 0.5) * 2400);
    }

    return {
      start: function () {
        if (reduceMotion) return;
        stopped = false;
        schedule();
      },
      stop: function () {
        stopped = true;
        clearTimeout(timer);
        clearTimeout(offTimer);
        setBlink(false);
      }
    };
  }

  function createEyeReveal(lids) {
    var raf = 0;
    var start = 0;
    var running = false;
    var onDone = null;

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function paint(t) {
      var open = ease(t);
      var q = Math.max(0, (open - 0.55) / 0.45);
      lids.style.setProperty('--ff-eye-open', open.toFixed(4));
      lids.style.setProperty('--ff-eye-drop', (q * q).toFixed(4));
    }

    function step(now) {
      if (!running) return;
      var t = Math.min(1, (now - start) / EYE_REVEAL_MS);
      paint(t);
      if (t < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      raf = 0;
      running = false;
      lids.style.setProperty('--ff-eye-open', '1');
      lids.style.setProperty('--ff-eye-drop', '1');
      var done = onDone;
      onDone = null;
      if (done) done();
    }

    return {
      run: function (done) {
        if (!lids) { done(); return; }
        onDone = done;
        if (reduceMotion) {
          lids.style.setProperty('--ff-eye-open', '1');
          lids.style.setProperty('--ff-eye-drop', '1');
          done();
          return;
        }
        lids.style.setProperty('--ff-eye-open', '0');
        lids.style.setProperty('--ff-eye-drop', '0');
        start = performance.now();
        running = true;
        raf = requestAnimationFrame(step);
      },
      stop: function () {
        running = false;
        onDone = null;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    };
  }

  // WebGL portrait ------------------------------------------------------------
  // One shader renders the whole portrait: eyelids that slide over the eyeball (closed lid art is
  // compressed upward while the open lash band rides the lid edge), irises that move inside the
  // opening, breathing (chest rises more than the head) and hair drifting along a flow-weight map.
  // Geometry comes from tools/build_portrait_assets.py; DOM <img> layers stay as the fallback.

  var PORTRAIT_GEO = /* @geo */{"img":[1792,1024],"tileW":344,"eyes":[{"box":[926,168,1262,376],"tileY":0,"dom":[970.0,1206.0],"iris":[1092,272,50,50],"U":[264.2,264.6,265.0,265.5,265.9,266.3,266.7,267.1,267.6,268.0,268.5,269.0,269.5,270.0,270.6,271.2,271.9,272.6,272.4,270.5,268.7,266.9,265.3,263.7,262.3,261.0,259.9,258.9,258.0,257.2,256.5,255.8,255.2,254.6,254.0,253.4,252.9,252.4,252.0,251.5,251.1,250.8,250.4,250.2,249.9,249.6,249.4,249.2,249.1,248.9,248.8,248.7,248.5,248.4,248.4,248.3,248.2,248.2,248.1,248.1,248.1,248.0,248.0,248.0,248.0,248.0,248.0,248.0,248.0,248.1,248.1,248.2,248.2,248.3,248.4,248.6,248.8,249.0,249.2,249.5,249.8,250.1,250.5,250.9,251.4,251.9,252.4,253.0,253.6,254.2,254.9,255.6,256.4,257.2,258.0,258.9,259.8,260.7,261.6,262.6,263.6,264.7,265.7,266.8,267.9,269.1,270.3,271.5,272.8,274.1,275.5,276.9,278.4,280.0,281.6,283.4,285.1,287.0,288.8,290.8,293.1,297.8,303.9,310.4,316.5,322.3,326.9,329.3],"C":[264.2,264.6,265.0,265.5,265.9,266.3,266.7,267.1,267.6,268.0,268.5,269.0,269.5,270.0,270.6,271.2,271.9,272.6,273.4,274.1,274.9,275.8,276.6,277.5,278.4,279.2,280.1,280.9,281.8,282.5,283.3,284.0,284.7,285.4,286.0,286.6,287.2,287.8,288.4,288.9,289.4,289.9,290.5,291.0,291.5,292.0,292.5,293.0,293.5,293.9,294.4,294.9,295.3,295.7,296.1,296.5,296.8,297.2,297.4,297.7,298.0,298.2,298.4,298.6,298.9,299.0,299.2,299.4,299.6,299.8,300.0,300.2,300.4,300.7,300.9,301.1,301.4,301.6,301.9,302.2,302.4,302.7,302.9,303.2,303.5,303.7,304.0,304.2,304.5,304.7,305.0,305.2,305.5,305.7,306.0,306.3,306.6,306.9,307.3,307.6,308.0,308.4,308.9,309.4,309.9,310.4,311.0,311.6,312.2,312.9,313.6,314.4,315.2,316.0,316.9,317.8,318.7,319.6,320.6,321.6,322.5,323.5,324.5,325.4,326.4,327.4,328.3,329.3],"L":[276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,276.0,277.7,279.7,281.7,283.7,285.7,287.7,289.6,291.6,293.5,295.4,297.2,299.0,300.8,302.4,304.1,305.6,307.0,308.4,309.6,310.8,311.9,312.9,313.8,314.7,315.5,316.3,317.0,317.6,318.2,318.8,319.3,319.8,320.2,320.6,321.0,321.3,321.6,321.9,322.2,322.4,322.6,322.8,323.0,323.1,323.3,323.4,323.5,323.6,323.7,323.7,323.8,323.8,323.7,323.7,323.6,323.5,323.4,323.2,323.1,322.9,322.6,322.3,322.0,321.7,321.3,320.9,320.5,320.1,319.6,319.1,318.6,318.0,317.5,316.9,316.3,315.7,315.0,314.4,313.7,313.1,312.4,311.7,311.0,310.3,309.6,308.9,308.3,307.6,307.0,306.3,305.7,305.1,304.5,303.9,303.4,302.9,302.3,301.8,301.3,300.9,300.4,300.0,299.5,299.1,298.7,303.9,310.4,316.5,322.3,326.9,329.3]},{"box":[1262,256,1606,500],"tileY":208,"dom":[1352.0,1588.0],"iris":[1446,371,46,42],"U":[369.8,370.3,370.8,371.3,371.8,372.1,372.1,372.0,372.0,372.0,372.0,372.0,372.0,372.0,372.0,369.6,367.2,364.9,362.8,360.7,358.8,357.1,355.6,354.2,353.1,352.0,351.1,350.2,349.4,348.6,347.9,347.2,346.6,345.9,345.4,344.8,344.3,343.8,343.4,343.0,342.6,342.3,342.0,341.8,341.5,341.3,341.2,341.0,340.9,340.9,340.8,340.8,340.8,340.8,340.8,340.8,340.9,340.9,341.0,341.1,341.2,341.3,341.4,341.5,341.7,341.9,342.1,342.4,342.7,343.0,343.4,343.9,344.3,344.8,345.4,345.9,346.6,347.2,347.9,348.6,349.3,350.0,350.7,351.5,352.3,353.1,354.0,354.9,355.7,356.7,357.6,358.6,359.6,360.6,361.7,362.7,363.8,365.0,366.1,367.3,368.5,369.8,371.1,372.4,373.7,375.0,376.3,377.6,379.0,380.3,381.6,382.8,384.1,385.3,386.5,387.6,388.8,389.9,391.0,392.1,392.8,392.4,392.1,391.8,391.5,391.1,390.8,390.5],"C":[369.8,370.3,370.8,371.3,371.8,372.4,372.9,373.4,373.9,374.4,375.0,375.5,376.1,376.7,377.3,378.0,378.6,379.3,380.0,380.7,381.5,382.2,383.0,383.8,384.6,385.3,386.1,386.9,387.7,388.5,389.3,390.1,390.8,391.5,392.3,392.9,393.6,394.3,394.9,395.4,396.0,396.5,397.0,397.5,397.9,398.3,398.7,399.1,399.4,399.7,400.0,400.2,400.5,400.7,400.9,401.1,401.3,401.4,401.5,401.6,401.8,401.8,401.9,402.0,402.0,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.1,402.0,402.0,402.0,402.0,401.9,401.9,401.9,401.9,401.8,401.7,401.7,401.6,401.5,401.3,401.2,401.0,400.8,400.6,400.4,400.1,399.8,399.5,399.2,398.9,398.6,398.3,397.9,397.6,397.3,397.0,396.7,396.3,396.0,395.7,395.4,395.0,394.7,394.4,394.1,393.7,393.4,393.1,392.8,392.4,392.1,391.8,391.5,391.1,390.8,390.5],"L":[372.0,372.0,372.0,372.0,372.0,372.1,372.1,372.0,372.0,372.0,372.0,372.0,372.0,372.0,372.0,373.7,375.3,377.0,378.6,380.2,381.7,383.2,384.7,386.1,387.4,388.7,390.0,391.2,392.4,393.5,394.6,395.8,396.9,398.0,399.0,400.1,401.1,402.0,402.9,403.8,404.6,405.3,406.0,406.6,407.1,407.6,408.0,408.3,408.6,408.8,408.9,409.0,409.0,409.0,408.9,408.8,408.7,408.5,408.3,408.1,407.9,407.6,407.4,407.1,406.9,406.6,406.4,406.2,406.0,405.8,405.6,405.4,405.3,405.1,405.0,404.9,404.8,404.8,404.7,404.6,404.6,404.5,404.5,404.5,404.4,404.4,404.3,404.3,404.2,404.1,404.0,403.9,403.8,403.7,403.5,403.4,403.2,403.1,402.9,402.7,402.6,402.4,402.3,402.1,402.0,401.9,401.7,401.6,401.5,401.3,401.2,401.0,400.8,400.5,400.2,399.9,399.5,399.0,398.6,398.0,397.5,396.9,396.4,396.0,396.0,396.0,396.0,396.0]}],"atlas":[1032,452]}/* @end */;
  var PORTRAIT_VS = [
    '#version 300 es',
    'out vec2 vUv;',
    'void main() {',
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));',
    '  vUv = vec2(p.x, 1.0 - p.y);',
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var PORTRAIT_FS = [
    '#version 300 es',
    'precision highp float;',
    'precision highp sampler2D;',
    'in vec2 vUv;',
    'out vec4 outColor;',
    'uniform sampler2D uOpen, uAtlas, uFlow, uCurve;',
    'uniform vec2 uImg, uAtlasPx;',
    'uniform float uTileW, uCurveN;',
    'uniform vec4 uBox[2];',
    'uniform vec2 uDom[2];',
    'uniform float uTileY[2];',
    'uniform vec4 uIris[2];',
    'uniform vec2 uGaze[2];',
    'uniform float uLid[2];',
    'uniform float uBreath, uSway, uTime, uSpark;',
    'uniform vec3 uGrade;',
    'const float LASH_T = 30.0;',
    'const float HANG_H = 30.0;',
    'const float LID_REACH = 80.0;',
    '',
    'float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }',
    'vec3 openAt(vec2 p) { return texture(uOpen, p / uImg).rgb; }',
    'vec3 tileAt(int e, float k, vec2 p) {',
    '  vec4 b = uBox[e];',
    '  vec2 l = clamp(p - b.xy, vec2(0.75), b.zw - b.xy - 0.75);',
    '  return texture(uAtlas, (vec2(k * uTileW, uTileY[e]) + l) / uAtlasPx).rgb;',
    '}',
    'vec3 curveAt(int e, float x) {',
    '  float f = clamp((x - uDom[e].x) / (uDom[e].y - uDom[e].x), 0.0, 1.0) * (uCurveN - 1.0);',
    '  float i = floor(f);',
    '  vec3 a = texelFetch(uCurve, ivec2(int(i), e), 0).rgb;',
    '  vec3 b = texelFetch(uCurve, ivec2(int(min(i + 1.0, uCurveN - 1.0)), e), 0).rgb;',
    '  return mix(a, b, f - i);',
    '}',
    '',
    // Sclera base (iris inpainted) with the iris layer slid by the gaze offset.
    'vec3 eyeball(int e, vec2 p) {',
    '  vec2 g = uGaze[e];',
    '  vec4 ir = uIris[e];',
    '  float r = length((p - g - ir.xy) / ir.zw);',
    '  float a = 1.0 - smoothstep(1.0 + 0.6 / ir.z, 1.0 + 2.6 / ir.z, r);',
    '  a = max(a, 1.0 - smoothstep(0.0, 0.6, length(g)));',
    '  vec3 iris = tileAt(e, 2.0, p - g);',
    '  float glint = smoothstep(0.60, 0.92, luma(iris)) * (1.0 - smoothstep(0.92, 1.0, r));',
    '  iris += glint * uSpark * vec3(0.10, 0.15, 0.17);',
    '  return mix(tileAt(e, 1.0, p), iris, a);',
    '}',
    '',
    'vec3 eyeComposite(int e, vec2 p, vec3 base) {',
    // fL: lashes flip from the closed (hanging) art to the open lash band early;
    // fS: lid skin and crease cross over later; k: eyeball shows as soon as the lid parts.
    '  float s = uLid[e];',
    '  float fL = smoothstep(0.10, 0.32, s);',
    '  float fS = smoothstep(0.25, 0.95, s);',
    '  float k = smoothstep(0.0, 0.08, s);',
    '  vec3 cl = tileAt(e, 0.0, p);',
    '  vec3 flat_ = mix(cl, base, fS);',
    '  vec2 dom = uDom[e];',
    '  float inDom = smoothstep(dom.x, dom.x + 1.0, p.x) * (1.0 - smoothstep(dom.y - 1.0, dom.y, p.x));',
    '  if (inDom <= 0.0) return flat_;',
    '  vec3 cu = curveAt(e, p.x);',
    '  float U = cu.x, C = cu.y, L = cu.z;',
    '  float E = mix(C, U, s);',
    '  float B = min(U, C) - LID_REACH;',
    '  vec3 lid = flat_;',
    '  if (p.y >= B) {',
    '    float yc = B + (p.y - B) * (C - B) / max(E - B, 1.0);',
    '    float yo = p.y > E - LASH_T ? p.y - E + U : B + (p.y - B) * (U - LASH_T - B) / max(E - LASH_T - B, 1.0);',
    '    float w = mix(fS, fL, smoothstep(E - LASH_T - 12.0, E - LASH_T + 6.0, p.y));',
    '    lid = mix(tileAt(e, 0.0, vec2(p.x, yc)), openAt(vec2(p.x, yo)), w);',
    '  }',
    '  float inOpen = 1.0 - smoothstep(L - 0.7, L + 0.7, p.y);',
    '  vec3 ball = eyeball(e, p);',
    '  ball *= 1.0 - (1.0 - s) * 0.5 * exp(-max(p.y - E, 0.0) / 6.0);',
    '  vec3 below = mix(cl, mix(base, ball, inOpen), k);',
    '  float yh = p.y + (C - E);',
    '  vec3 hl = tileAt(e, 0.0, vec2(p.x, yh));',
    '  float ha = smoothstep(0.50, 0.24, luma(hl)) * (1.0 - fL) * (1.0 - smoothstep(C + HANG_H - 8.0, C + HANG_H, yh));',
    '  below = mix(below, hl, ha);',
    '  vec3 res = mix(lid, below, smoothstep(E - 0.75, E + 0.75, p.y));',
    '  return mix(flat_, res, inDom);',
    '}',
    '',
    'void main() {',
    '  vec2 p = vUv * uImg;',
    '  float chest = smoothstep(0.40, 1.0, p.y / uImg.y);',
    // breathing: head lifts a little, shoulders/chest lift and widen more
    '  vec2 d = vec2((p.x - 1180.0) * 0.008 * chest, -(3.2 + 11.5 * chest)) * uBreath;',
    // hair: slow waves travelling down the strands, gusting, with a finer flutter at the tips
    '  float w = texture(uFlow, vUv).r * uSway;',
    '  if (w > 0.002) {',
    '    float gust = 0.68 + 0.32 * sin(uTime * 0.29) * sin(uTime * 0.17 + 1.3);',
    '    float ph = uTime * 1.15 - p.y * 0.0085 + p.x * 0.0026;',
    '    d.x += w * gust * (8.5 * sin(ph) + 3.0 * sin(ph * 2.1 + 1.7 + p.y * 0.004));',
    '    d.y += w * gust * 2.2 * sin(ph * 0.83 + 0.6);',
    '    d.x += w * w * 1.6 * sin(uTime * 3.4 - p.y * 0.03 + p.x * 0.01);',
    '  }',
    '  vec2 q = p - d;',
    '  vec3 col = openAt(q);',
    '  for (int e = 0; e < 2; e++) {',
    '    vec4 b = uBox[e];',
    '    if (q.x >= b.x && q.x < b.z && q.y >= b.y && q.y < b.w) col = eyeComposite(e, q, col);',
    '  }',
    '  col = mix(vec3(luma(col)), col, uGrade.x);',
    '  col = ((col - 0.5) * uGrade.y + 0.5) * uGrade.z;',
    '  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n');

  var portraitImages = null;
  var portraitWaiters = [];

  function loadImageSet(src, done) {
    var keys = Object.keys(src);
    var out = {};
    var left = keys.length;
    var failed = false;
    keys.forEach(function (k) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        out[k] = img;
        if (--left === 0 && !failed) done(out);
      };
      img.onerror = function () {
        if (!failed) { failed = true; done(null); }
      };
      img.src = src[k];
    });
  }

  function requestPortraitImages(useData, cb) {
    if (portraitImages) { cb(portraitImages); return; }
    portraitWaiters.push(cb);
    if (portraitWaiters.length > 1) return;
    loadImageSet(PORTRAIT_SRC, function (imgs) {
      portraitImages = imgs;
      var list = portraitWaiters;
      portraitWaiters = [];
      list.forEach(function (fn) { fn(imgs); });
    });
  }

  // Pointer / typing attention shared by every portrait.
  var attention = { x: 0, y: 0, pointerAt: -1e9, typeAt: -1e9 };
  window.addEventListener('pointermove', function (event) {
    attention.x = event.clientX;
    attention.y = event.clientY;
    attention.pointerAt = performance.now();
  }, { passive: true, capture: true });
  window.addEventListener('keydown', function (event) {
    if (event.key && event.key.length === 1) attention.typeAt = performance.now();
  }, { passive: true, capture: true });

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function smooth01(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  // Critically damped spring, exact step.
  function springStep(st, target, w, dt) {
    var d = st.x - target;
    var e = Math.exp(-w * dt);
    var c = st.v + w * d;
    st.x = target + (d + c * dt) * e;
    st.v = (st.v - c * w * dt) * e;
  }

  // Lid keyframes for waking up: a stir, a heavy half-open, a short droop, then fully open.
  var AWAKEN_KEYS = [
    [0, 0], [260, 0.07], [470, 0.025], [1250, 0.46], [1520, 0.39], [2450, 1]
  ];
  var AWAKEN_MS = 2450;

  function awakenLid(ms) {
    if (ms <= 0) return 0;
    for (var i = 1; i < AWAKEN_KEYS.length; i++) {
      var a = AWAKEN_KEYS[i - 1];
      var b = AWAKEN_KEYS[i];
      if (ms <= b[0]) {
        var t = (ms - a[0]) / (b[0] - a[0]);
        var e = i === AWAKEN_KEYS.length - 1 ? 1 - Math.pow(1 - t, 3) : easeInOut(t);
        return a[1] + (b[1] - a[1]) * e;
      }
    }
    return 1;
  }

  // 1 = open. Fast close, short hold, softer open.
  function blinkLid(ms) {
    if (ms < 0) return 1;
    if (ms < 78) { var c = ms / 78; return 1 - c * c; }
    if (ms < 122) return 0;
    if (ms < 330) return 1 - Math.pow(1 - (ms - 122) / 208, 3);
    return 1;
  }

  function createPortrait(host, options) {
    var opts = options || {};
    if (reduceMotion || !PORTRAIT_GEO || !host || !window.WebGL2RenderingContext) return null;
    var canvas = document.createElement('canvas');
    canvas.className = 'ff-gl';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power'
      });
    } catch (err) {}
    if (!gl) return null;

    function shader(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        if (window.console) console.warn('[firefly] shader', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }
    var vs = shader(gl.VERTEX_SHADER, PORTRAIT_VS);
    var fs = shader(gl.FRAGMENT_SHADER, PORTRAIT_FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    var U = {};
    ['uOpen', 'uAtlas', 'uFlow', 'uCurve', 'uImg', 'uAtlasPx', 'uTileW', 'uCurveN', 'uBox', 'uDom', 'uTileY',
      'uIris', 'uGaze', 'uLid', 'uBreath', 'uSway', 'uTime', 'uSpark', 'uGrade'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n) || gl.getUniformLocation(prog, n + '[0]');
    });

    var G = PORTRAIT_GEO;
    var eyes = G.eyes;
    var curveN = eyes[0].U.length;
    var curveData = new Float32Array(curveN * 2 * 4);
    eyes.forEach(function (eye, e) {
      for (var i = 0; i < curveN; i++) {
        var o = (e * curveN + i) * 4;
        curveData[o] = eye.U[i];
        curveData[o + 1] = eye.C[i];
        curveData[o + 2] = eye.L[i];
      }
    });
    gl.uniform2f(U.uImg, G.img[0], G.img[1]);
    gl.uniform2f(U.uAtlasPx, G.atlas[0], G.atlas[1]);
    gl.uniform1f(U.uTileW, G.tileW);
    gl.uniform1f(U.uCurveN, curveN);
    gl.uniform4fv(U.uBox, [].concat(eyes[0].box, eyes[1].box));
    gl.uniform2fv(U.uDom, [].concat(eyes[0].dom, eyes[1].dom));
    gl.uniform1fv(U.uTileY, [eyes[0].tileY, eyes[1].tileY]);
    gl.uniform4fv(U.uIris, [].concat(eyes[0].iris, eyes[1].iris));
    gl.uniform3fv(U.uGrade, opts.grade || [1, 1, 1]);
    gl.uniform1i(U.uOpen, 0);
    gl.uniform1i(U.uAtlas, 1);
    gl.uniform1i(U.uFlow, 2);
    gl.uniform1i(U.uCurve, 3);
    gl.bindVertexArray(gl.createVertexArray());

    var textures = [];
    function makeTexture(unit, img, mip) {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures.push(tex);
    }

    var curveTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, curveTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, curveN, 2, 0, gl.RGBA, gl.FLOAT, curveData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    textures.push(curveTex);

    var ready = false;
    var dead = false;
    var paused = false;
    var raf = 0;
    var lastDraw = 0;
    var clock = 0;
    var hotUntil = 0;
    var mirrors = [];
    var rect = null;
    var rectAt = 0;

    // Animation state
    var lidBase = 0;
    var awakenAt = -1;
    var awakenDone = null;
    var blinkAt = -1e9;
    var nextBlinkAt = Infinity;
    var idle = false;
    var breath = { amp: 0, target: 0, phase: 0, period: 4.8 };
    var sway = { x: 0, target: 0 };
    var gaze = [{ x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }, { x: 0, v: 0 }];
    var look = { x: 0, y: 0, w: 30, mode: 'contact', until: 0, jx: 0, jy: 0, jitterAt: 0 };
    var GAZE_MAX_X = 6.5;
    var GAZE_MAX_Y = 3.6;
    var pose = null;

    canvas.style.opacity = '0';
    host.insertBefore(canvas, host.querySelector('.ff-lids'));

    function resize() {
      var w = host.clientWidth || window.innerWidth;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var bw = Math.max(2, Math.min(Math.round(w * dpr), 2304));
      var bh = Math.max(2, Math.round(bw * G.img[1] / G.img[0]));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        mirrors.forEach(function (m) {
          m.width = Math.round(bw / 2);
          m.height = Math.round(bh / 2);
        });
      }
      rect = null;
    }

    function onResize() {
      resize();
      if (ready && !raf) draw();
    }

    function eyeClient(e) {
      var now = performance.now();
      if (!rect || now - rectAt > 700) {
        rect = canvas.getBoundingClientRect();
        rectAt = now;
      }
      var ir = eyes[e].iris;
      return {
        x: rect.left + ir[0] / G.img[0] * rect.width,
        y: rect.top + ir[1] / G.img[1] * rect.height,
        scale: rect.width / G.img[0]
      };
    }

    function updateLook(now) {
      if (!idle) return;
      if (now > look.until) {
        if (look.mode === 'contact' && Math.random() < 0.8) {
          look.mode = 'glance';
          var side = Math.random() < 0.5 ? -1 : 1;
          look.x = side * rand(2.8, 5.8);
          look.y = rand(-1.6, 2.6);
          look.until = now + rand(520, 1350);
        } else {
          look.mode = 'contact';
          look.x = 0;
          look.y = 0;
          look.until = now + rand(2800, 6400);
        }
        look.w = 34;
        hotUntil = now + 500;
      }
      if (now > look.jitterAt) {
        look.jx = rand(-0.55, 0.55);
        look.jy = rand(-0.35, 0.35);
        look.jitterAt = now + rand(450, 1300);
        hotUntil = Math.max(hotUntil, now + 240);
      }
    }

    function gazeTarget(e, now) {
      if (awakenAt >= 0) {
        var ms = now - awakenAt;
        return ms < 1600 ? { x: e ? 0.4 : -0.3, y: 3.3, w: 6 } : { x: 0, y: 0, w: 8 };
      }
      if (!idle) return { x: 0, y: 0, w: 20 };
      var tx = look.x + look.jx;
      var ty = look.y + look.jy;
      if (now - attention.pointerAt < 2600 && attention.pointerAt > 0) {
        var c = eyeClient(e);
        var dx = attention.x - c.x;
        var dy = attention.y - c.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var reach = dist / (dist + 320);
        tx = dx / dist * reach * GAZE_MAX_X + look.jx * 0.5;
        ty = dy / dist * reach * GAZE_MAX_Y * 1.25 + look.jy * 0.5;
        hotUntil = Math.max(hotUntil, now + 200);
      } else if (now - attention.typeAt < 1500) {
        var ce = eyeClient(e);
        var kx = window.innerWidth * 0.55 - ce.x;
        var ky = window.innerHeight * 0.88 - ce.y;
        var kd = Math.sqrt(kx * kx + ky * ky) || 1;
        tx = kx / kd * GAZE_MAX_X * 0.7;
        ty = ky / kd * GAZE_MAX_Y;
      }
      return {
        x: Math.max(-GAZE_MAX_X, Math.min(GAZE_MAX_X, tx)),
        y: Math.max(-GAZE_MAX_Y, Math.min(GAZE_MAX_Y, ty)),
        w: look.w
      };
    }

    function breathValue(dt) {
      breath.phase += dt / breath.period;
      if (breath.phase >= 1) {
        breath.phase -= 1;
        breath.period = rand(4.4, 5.3);
      }
      var p = breath.phase;
      // inhale 0..0.42, exhale 0.42..0.92, short rest
      if (p < 0.42) return 0.5 - 0.5 * Math.cos(Math.PI * p / 0.42);
      if (p < 0.92) return 0.5 + 0.5 * Math.cos(Math.PI * (p - 0.42) / 0.5);
      return 0;
    }

    function update(now, dt) {
      clock += dt;
      // lids
      var lid = lidBase;
      if (awakenAt >= 0) {
        var ms = now - awakenAt;
        lid = awakenLid(ms);
        hotUntil = now + 300;
        if (ms >= AWAKEN_MS) {
          lidBase = 1;
          awakenAt = -1;
          blinkAt = now + 520;
          var done = awakenDone;
          awakenDone = null;
          if (done) done();
        }
      }
      if (idle && now >= nextBlinkAt) {
        blinkAt = now;
        nextBlinkAt = now + BLINK_EVERY_MS + rand(-1200, 1200);
      }
      var bms = now - blinkAt;
      if (bms > -40 && bms < 380) hotUntil = now + 120;

      // gaze springs (x, y per eye)
      for (var e = 0; e < 2; e++) {
        var tg = gazeTarget(e, now);
        springStep(gaze[e * 2], tg.x, tg.w, dt);
        springStep(gaze[e * 2 + 1], tg.y, tg.w, dt);
        if (Math.abs(gaze[e * 2].v) + Math.abs(gaze[e * 2 + 1].v) > 1.2) hotUntil = now + 100;
      }
      updateLook(now);

      var lids = [0, 0];
      for (var k = 0; k < 2; k++) {
        var gy = gaze[k * 2 + 1].x;
        var droop = 1 - 0.09 * Math.max(0, Math.min(1, gy / GAZE_MAX_Y));
        lids[k] = Math.max(0, Math.min(1, lid * blinkLid(bms - k * 12) * droop));
      }

      // breathing + hair intensity ease in
      breath.amp += (breath.target - breath.amp) * Math.min(1, dt / 1.4);
      sway.x += (sway.target - sway.x) * Math.min(1, dt / 2.2);
      var b = breathValue(dt) * breath.amp;

      var gz = [gaze[0].x, gaze[1].x, gaze[2].x, gaze[3].x];
      if (pose) {
        lids = [pose.lid, pose.lid];
        gz = [pose.gx, pose.gy, pose.gx, pose.gy];
        b = pose.breath;
      }
      gl.uniform1fv(U.uLid, lids);
      gl.uniform2fv(U.uGaze, gz);
      gl.uniform1f(U.uBreath, b);
      gl.uniform1f(U.uSway, sway.x);
      gl.uniform1f(U.uTime, clock);
      gl.uniform1f(U.uSpark, (0.55 + 0.45 * Math.sin(clock * 2.3)) * breath.amp);
    }

    function draw() {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      for (var i = 0; i < mirrors.length; i++) {
        var m = mirrors[i];
        var ctx = m.getContext('2d');
        if (ctx) ctx.drawImage(canvas, 0, 0, m.width, m.height);
      }
    }

    function frame(now) {
      raf = 0;
      if (dead || paused) return;
      raf = requestAnimationFrame(frame);
      var gap = now - lastDraw;
      if (now > hotUntil && gap < 31) return;
      var dt = Math.min(0.05, gap / 1000);
      lastDraw = now;
      update(now, dt);
      draw();
    }

    function start() {
      if (!raf && !dead && !paused) {
        lastDraw = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function activate() {
      ready = true;
      resize();
      update(performance.now(), 0);
      draw();
      canvas.style.opacity = '1';
      host.classList.add('ff-gl-on');
      if (opts.onActive) opts.onActive(true);
      start();
    }

    function fail() {
      api.destroy();
    }

    function upload(imgs, viaData) {
      if (dead) return;
      if (!imgs) { fail(); return; }
      try {
        makeTexture(0, imgs.open, true);
        makeTexture(1, imgs.atlas, false);
        makeTexture(2, imgs.flow, false);
      } catch (err) {
        // file:// images taint WebGL; retry once with the data-URI bundle.
        if (!viaData) {
          textures.slice(0, -1).forEach(function (t) { gl.deleteTexture(t); });
          textures = [curveTex];
          requestPortraitImages(true, function (data) { upload(data, true); });
        } else {
          fail();
        }
        return;
      }
      activate();
    }

    canvas.addEventListener('webglcontextlost', function (event) {
      event.preventDefault();
      api.destroy();
    });
    window.addEventListener('resize', onResize);
    requestPortraitImages(false, function (imgs) { upload(imgs, false); });

    var api = {
      ready: function () { return ready && !dead; },
      awaken: function (done) {
        if (!ready || dead) { if (done) done(); return; }
        awakenAt = performance.now();
        awakenDone = done || null;
        breath.target = 1;
        sway.target = 1;
        start();
      },
      setOpen: function (v) {
        lidBase = v;
        awakenAt = -1;
        if (ready && !raf) draw();
      },
      setIdle: function (on) {
        idle = !!on;
        breath.target = on ? 1 : breath.target;
        sway.target = on ? 1 : sway.target;
        nextBlinkAt = on ? performance.now() + BLINK_EVERY_MS * rand(0.55, 0.8) : Infinity;
        look.until = performance.now() + rand(1800, 3400);
      },
      blink: function () {
        blinkAt = performance.now();
      },
      // Freeze lids / gaze / breath for calibration (null releases).
      pose: function (p) {
        pose = p ? { lid: +p.lid || 0, gx: +p.gx || 0, gy: +p.gy || 0, breath: +p.breath || 0 } : null;
        if (p && p.sway !== undefined) sway.x = sway.target = +p.sway;
        if (p && p.time !== undefined) clock = +p.time;
        if (ready) { update(performance.now(), 0); draw(); }
      },
      addMirror: function (m) {
        if (!m || dead) return;
        mirrors.push(m);
        m.width = Math.round(canvas.width / 2);
        m.height = Math.round(canvas.height / 2);
        if (ready) draw();
      },
      pause: function () {
        paused = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      },
      resume: function () {
        paused = false;
        start();
      },
      destroy: function () {
        if (dead) return;
        dead = true;
        ready = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        window.removeEventListener('resize', onResize);
        host.classList.remove('ff-gl-on');
        if (opts.onActive) opts.onActive(false);
        var done = awakenDone;
        awakenDone = null;
        try {
          var lose = gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        } catch (err) {}
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        mirrors = [];
        if (done) done();
      }
    };
    return api;
  }

  function applyColorMask(el, radius) {
    var cx = 70.4;
    var cy = 32.4;
    var value = 'radial-gradient(circle ' + Math.round(radius) + 'px at ' + cx + '% ' + cy + '%, ' +
      '#000 0 58%, rgba(0,0,0,0.92) 72%, rgba(0,0,0,0.40) 84%, transparent 92%)';
    el.style.maskImage = value;
    el.style.webkitMaskImage = value;
  }

  function clearColorMask(el) {
    el.style.maskImage = 'none';
    el.style.webkitMaskImage = 'none';
  }

  function bootSequence(el, replay, onFinish) {
    var fast = !replay;
    var face = el.querySelector('#ffb-face');
    var lids = face.querySelector('.ff-lids');
    var color = face.querySelector('.ffb-color');
    var line = el.querySelector('#ffb-line');
    var lineReveal = createLineReveal(line);
    var eyeReveal = createEyeReveal(lids);
    var pctEl = el.querySelector('#ffb-pct');
    var fillEl = el.querySelector('#ffb-bar-fill');
    var phaseEl = el.querySelector('#ffb-phase');
    var log4 = el.querySelector('#ffb-log-4');
    var logs = el.querySelectorAll('.ffb-logs li');
    var skipBtn = el.querySelector('.ffb-skip');
    var particles = createFireflies(el.querySelector('#ffb-canvas'), { count: 130, streak: true, speed: 1.5 });
    var minHold = reduceMotion ? 0 : (replay ? 9000 : 5400);
    var MAX = 20000;
    var start = performance.now();
    var ready = false;
    var exited = false;
    var openDone = false;
    var openDoneAt = 0;
    var raf = 0;
    var checkQueued = false;
    var timers = [];
    var blinker = createBlinker(function (on) {
      face.classList.toggle('is-blink', on);
    });
    var portrait = createPortrait(color, {
      grade: [1.02, 1.03, 0.92],
      onActive: function (on) { face.classList.toggle('is-gl', on); }
    });

    var logTimers = [
      setTimeout(function () { if (logs[0]) logs[0].classList.add('on'); }, 260),
      setTimeout(function () { if (logs[1]) logs[1].classList.add('on'); }, 900),
      setTimeout(function () { if (logs[2]) logs[2].classList.add('on'); }, 1650)
    ];

    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }

    function setPhase(text) {
      if (phaseEl) phaseEl.textContent = text;
    }

    function setLog4(text, waiting) {
      if (!log4) return;
      log4.classList.toggle('ffb-wait', !!waiting);
      log4.classList.add('on');
      var b = log4.querySelector('b');
      if (b) b.textContent = text;
      var tag = log4.querySelector('.tag');
      if (tag) tag.textContent = '00:0' + Math.min(9, Math.floor((performance.now() - start) / 1000)) + '.--';
    }

    function scheduleCheck() {
      if (checkQueued || exited) return;
      checkQueued = true;
      requestAnimationFrame(function () {
        checkQueued = false;
        var rootEl = document.getElementById('root');
        if (rootEl && rootEl.childElementCount > 0 && document.readyState === 'complete') {
          ready = true;
        }
      });
    }

    var watcher = null;
    var poll = 0;
    if (replay) {
      ready = true;
    } else {
      watcher = new MutationObserver(scheduleCheck);
      watcher.observe(document.body, { childList: true, subtree: true });
      poll = setInterval(scheduleCheck, 250);
    }

    function paint(pct) {
      var v = Math.max(0, Math.min(100, Math.floor(pct)));
      if (pctEl) pctEl.textContent = (v < 10 ? '0' : '') + v;
      if (fillEl) fillEl.style.width = v + '%';
    }

    function completeOpening() {
      if (exited || openDone) return;
      openDone = true;
      openDoneAt = performance.now();
      face.classList.add('is-eyed', 'is-awake');
      requestAnimationFrame(function () {
        face.classList.remove('is-opening');
        if (lids) lids.classList.remove('is-on');
      });
      if (portrait && portrait.ready()) portrait.setIdle(true);
      else blinker.start();
      setPhase('Signal Locked');
      setLog4('OPEN', false);
      paint(100);
    }

    function openEyes() {
      if (exited) return;
      setPhase('Optical Sync');
      setLog4('SYNCING', true);
      face.classList.add('is-opening');
      line.style.opacity = '0';
      paint(97);
      if (portrait && portrait.ready()) {
        portrait.awaken(completeOpening);
        return;
      }
      if (portrait) portrait.destroy();
      portrait = null;
      if (lids) lids.classList.add('is-on');
      eyeReveal.run(completeOpening);
    }

    function runColor() {
      if (exited) return;
      setPhase('Ink Bleed');
      setLog4('COLORIZING', true);
      color.classList.add('is-on');
      var t0 = performance.now();
      var duration = reduceMotion ? 1 : (fast ? 1500 : 2200);
      var maxR = Math.sqrt(face.clientWidth * face.clientWidth + face.clientHeight * face.clientHeight) * 0.62;

      function step(now) {
        if (exited) return;
        var t = Math.min(1, (now - t0) / duration);
        var r = maxR * easeOut(t);
        applyColorMask(color, Math.max(2, r));
        paint(84 + 11 * t);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          clearColorMask(color);
          later(openEyes, 260);
        }
      }
      requestAnimationFrame(step);
    }

    function runDraw() {
      if (exited) return;
      line.style.opacity = '0.96';
      setPhase('Line Synthesis');
      lineReveal.start({
        duration: fast ? 2600 : 4000,
        onProgress: function (p) {
          paint(8 + 76 * p);
          if (p > 0.52 && p < 0.54) setPhase('Contour Trace');
        },
        onDone: function () {
          later(runColor, 180);
        }
      });
    }

    function finish(skipped) {
      if (exited) return;
      exited = true;
      cancelAnimationFrame(raf);
      if (watcher) watcher.disconnect();
      if (poll) clearInterval(poll);
      logTimers.forEach(clearTimeout);
      timers.forEach(clearTimeout);
      lineReveal.stop();
      eyeReveal.stop();
      blinker.stop();
      window.removeEventListener('keydown', onKey, true);

      paint(100);
      setPhase('Signal Locked');
      if (log4) {
        log4.classList.remove('ffb-wait');
        log4.classList.add('on');
        var b = log4.querySelector('b');
        if (b) b.textContent = ready ? 'READY' : (skipped ? 'SKIPPED' : 'TIMEOUT');
      }

      el.classList.add('is-done');
      if (onFinish) onFinish(!!skipped);

      setTimeout(function () {
        el.classList.add('is-out');
      }, reduceMotion ? 60 : 420);

      setTimeout(function () {
        particles.stop();
        if (portrait) portrait.destroy();
        if (el.parentNode) el.parentNode.removeChild(el);
      }, reduceMotion ? 300 : 1600);
    }

    function frame(now) {
      if (exited) return;
      if (!el.isConnected) { finish(true); return; }
      var elapsed = now - start;
      if (ready && elapsed >= minHold && openDoneAt && now - openDoneAt >= (reduceMotion ? 0 : 900)) {
        finish(false);
        return;
      }
      if (elapsed >= MAX) {
        finish(false);
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        finish(true);
      });
    }

    function onKey(event) {
      if (event.key === 'Escape' && !exited) {
        event.preventDefault();
        finish(true);
      }
    }
    window.addEventListener('keydown', onKey, true);

    paint(6);
    if (reduceMotion) {
      color.classList.add('is-on');
      clearColorMask(color);
      face.classList.add('is-eyed', 'is-awake');
      openDoneAt = performance.now();
      line.style.opacity = '0';
      setPhase('Signal Locked');
      setLog4('OPEN', false);
      paint(100);
    } else {
      later(runDraw, 420);
    }
    raf = requestAnimationFrame(frame);
    scheduleCheck();
  }

