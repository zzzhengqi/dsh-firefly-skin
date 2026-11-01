'use strict';

// Browser half of the Firefly skin: palette, ambient stage, replay control and
// the boot film. Injected into the DSH web client as a client plugin.

var SKIN_ID = 'dsh-firefly-skin';
var STYLE_ID = 'ff-skin-style';
var AMBIENT_ID = 'ff-ambient';
var BOOT_ID = 'ff-boot';
var PLAYED_KEY = 'ff.boot.v1';
var AMBIENT_KEY = 'ff.ambient.v1';

function headStyle(css) {
  var tag = document.createElement('style');
  tag.id = STYLE_ID;
  tag.dataset.plugin = SKIN_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
  return tag;
}

function toast(text) {
  var node = document.getElementById('ff-toast');
  if (!node) {
    node = document.createElement('div');
    node.id = 'ff-toast';
    node.setAttribute('role', 'status');
    document.body.appendChild(node);
  }
  node.textContent = text;
  node.classList.add('on');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { node.classList.remove('on'); }, 1800);
}

function ambientEnabled() {
  try { return localStorage.getItem(AMBIENT_KEY) !== '0'; } catch (err) { return true; }
}

function setAmbientEnabled(on) {
  try { localStorage.setItem(AMBIENT_KEY, on ? '1' : '0'); } catch (err) {}
}

function mountAmbient() {
  var stale = document.getElementById(AMBIENT_ID);
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  var stage = document.createElement('div');
  stage.id = AMBIENT_ID;
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = [
    '<div class="ffa-aurora"></div>',
    '<div class="ffa-wisp"></div>',
    '<div class="ffa-wisp is-right"></div>',
    '<canvas class="ffa-fireflies"></canvas>',
    '<div class="ffa-vignette"></div>'
  ].join('');
  document.body.appendChild(stage);
  var canvas = stage.querySelector('canvas');
  if (canvas) stage._fireflies = createFireflies(canvas, { count: 46, streak: false, speed: 0.6 });
  stage.style.display = ambientEnabled() ? '' : 'none';
  return stage;
}

function mountReplay(onReplay, onToggleAmbient) {
  // Always build a fresh control: a hot-reloaded module must bind its own
  // closures instead of reusing a button still wired to the previous instance.
  var stale = document.getElementById('ff-replay');
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  var button = document.createElement('button');
  button.id = 'ff-replay';
  button.type = 'button';
  button.setAttribute('aria-label', '重播流萤载入动画');
  button.title = '重播流萤载入动画 · Alt+点击开关环境光效';
  button.innerHTML = '<span class="ffr-play" aria-hidden="true"></span>';
  button.addEventListener('click', function (event) {
    if (event.altKey) {
      event.preventDefault();
      onToggleAmbient();
      return;
    }
    if (button.classList.contains('is-playing')) return;
    onReplay();
  });
  document.body.appendChild(button);
  return button;
}

function buildBootMarkup() {
  return [
    '<div id="ff-boot" role="status" aria-label="流萤皮肤正在启动 DeepSeek Harness">',
    '  <div class="ffb-stage">',
    '    <div class="ffb-aura" aria-hidden="true"></div>',
    '    <div class="ffb-face" id="ffb-face">',
    '      <div class="ffb-color">',
    '        <img class="face-open" src="' + ASSETS.open + '" alt="" />',
    '        <img class="face-closed" src="' + ASSETS.closed + '" alt="" />',
    '        <div class="ff-lids" aria-hidden="true">',
    '          <div class="ff-lid ff-lid-l"><span></span></div>',
    '          <div class="ff-lid ff-lid-r"><span></span></div>',
    '        </div>',
    '      </div>',
    '      <canvas class="ffb-line" id="ffb-line" width="1400" height="800" aria-hidden="true"></canvas>',
    '      <div class="ffb-eyeglow" aria-hidden="true"></div>',
    '    </div>',
    '    <div class="ffb-scrim" aria-hidden="true"></div>',
    '    <div class="ffb-grid" aria-hidden="true"></div>',
    '    <canvas id="ffb-canvas" aria-hidden="true"></canvas>',
    '    <div class="ffb-scanlines" aria-hidden="true"></div>',
    '    <div class="ffb-scanbar" aria-hidden="true"></div>',
    '    <div class="ffb-vignette" aria-hidden="true"></div>',
    '    <div class="ffb-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
    '  </div>',
    '  <header class="ffb-top">',
    '    <div class="ffb-brand">',
    '      <span class="ffb-brand-mark" aria-hidden="true"></span>',
    '      <span class="ffb-brand-word">DeepSeek Harness</span>',
    '      <span class="ffb-brand-sep" aria-hidden="true"></span>',
    '      <span class="ffb-brand-tag">Firefly <b>//</b> Custom Shell</span>',
    '    </div>',
    '    <div class="ffb-top-right">',
    '      <span><i class="ffb-live" aria-hidden="true"></i>Memory Zone</span>',
    '      <span>Desktop · Electron</span>',
    '      <span>FF-Skin 1.0</span>',
    '    </div>',
    '  </header>',
    '  <main class="ffb-left">',
    '    <div class="ffb-kicker">DeepSeek Harness / Desktop Shell</div>',
    '    <div class="ffb-title">',
    '      <h1>流萤</h1>',
    '      <div class="ffb-latin">FIREFLY<small>SAM UNIT · 0F-04</small></div>',
    '    </div>',
    '    <div class="ffb-rule" aria-hidden="true"><i></i></div>',
    '    <div class="ffb-hud">',
    '      <div class="ffb-hud-head"><span id="ffb-phase">Line Synthesis</span><span>Kernel Handshake</span></div>',
    '      <div class="ffb-pct"><span id="ffb-pct">06</span><small>%</small></div>',
    '      <div class="ffb-bar" aria-hidden="true"><i id="ffb-bar-fill"></i></div>',
    '      <ul class="ffb-logs" aria-hidden="true">',
    '        <li><span class="tag">00:00.14</span><span>SYS / SHELL LINK <b>ESTABLISHED</b></span></li>',
    '        <li><span class="tag">00:00.73</span><span>SESSION STORE <b>SYNCED</b></span></li>',
    '        <li><span class="tag">00:01.24</span><span>LINE SYNTHESIS <b>ONLINE</b></span></li>',
    '        <li id="ffb-log-4" class="ffb-wait"><span class="tag">--:--.--</span><span>OPTICAL SYNC <b>WAITING</b></span></li>',
    '      </ul>',
    '    </div>',
    '  </main>',
    '  <footer class="ffb-bottom">',
    '    <div class="ffb-status">',
    '      <span><i></i>Kernel</span>',
    '      <span><i></i>Session</span>',
    '      <span><i></i>Renderer</span>',
    '      <span><i></i>Memory</span>',
    '    </div>',
    '    <button class="ffb-skip" type="button">跳过 / Skip</button>',
    '  </footer>',
    '  <div class="ffb-flash" aria-hidden="true"></div>',
    '</div>'
  ].join('\n');
}

function inspectUrl() {
  try {
    var params = new URLSearchParams(window.location.search);
    var flag = params.get('ffboot');
    if (flag === '1' || flag === '0') return flag;
  } catch (err) {}
  return null;
}

function shouldAutoPlay() {
  var forced = inspectUrl();
  if (forced === '1') return true;
  if (forced === '0') return false;
  try {
    if (sessionStorage.getItem(PLAYED_KEY) === '1') return false;
  } catch (err) {}
  return document.visibilityState === 'visible';
}

function markPlayed() {
  try { sessionStorage.setItem(PLAYED_KEY, '1'); } catch (err) {}
}

function resetSkinDom() {
  ['ff-ambient', 'ff-app-stage', 'ffa-canvas', 'ff-replay', 'ff-boot', 'ff-toast'].forEach(function (id) {
    var node = document.getElementById(id);
    if (node && node.parentNode) node.parentNode.removeChild(node);
  });
  var styles = document.querySelectorAll('style[data-plugin="' + SKIN_ID + '"]');
  for (var i = styles.length - 1; i >= 0; i--) {
    if (styles[i].parentNode) styles[i].parentNode.removeChild(styles[i]);
  }
}

// Living portrait behind the workbench: the same WebGL face from the boot film,
// kept awake so breathing, blinking, gaze and hair keep running in the UI.
function mountCompanion() {
  var stage = document.createElement('div');
  stage.id = 'ff-app-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.style.setProperty('--ff-face-open', 'url("' + ASSETS.open + '")');
  stage.innerHTML = [
    '<div class="ffa-facewrap">',
    '  <div class="ffa-color">',
    '    <img class="face-open" src="' + ASSETS.open + '" alt="" />',
    '    <img class="face-closed" src="' + ASSETS.closed + '" alt="" />',
    '    <div class="ff-lids" aria-hidden="true">',
    '      <div class="ff-lid ff-lid-l"><span></span></div>',
    '      <div class="ff-lid ff-lid-r"><span></span></div>',
    '    </div>',
    '  </div>',
    '  <div class="ffa-eyeglow" aria-hidden="true"></div>',
    '</div>'
  ].join('');
  document.body.appendChild(stage);

  var root = document.documentElement;
  var color = stage.querySelector('.ffa-color');
  var lids = stage.querySelector('.ff-lids');
  color.style.opacity = '1';
  root.classList.add('ff-eyed', 'ff-awake');

  var blinker = createBlinker(function (on) {
    root.classList.toggle('ff-blink', on);
  });
  var portrait = null;
  try {
    portrait = createPortrait(color, {
      grade: [1.06, 1.05, 0.80],
      onActive: function (on) {
        root.classList.toggle('ff-gl', on);
        if (on) {
          blinker.stop();
          if (portrait) {
            portrait.setOpen(1);
            portrait.setIdle(true);
          }
          if (lids) lids.classList.remove('is-on');
        }
      }
    });
  } catch (err) {
    portrait = null;
  }
  if (!portrait) blinker.start();

  return { stage: stage, portrait: portrait, blinker: blinker };
}

// Workbench fireflies, exactly the layer the Qoder skin floated above its UI.
function mountParticles() {
  var canvas = document.createElement('canvas');
  canvas.id = 'ffa-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var fireflies = createFireflies(canvas, { count: 65, streak: false, speed: 1.5 });
  return { canvas: canvas, fireflies: fireflies };
}

function installSkin() {
  var root = document.documentElement;
  var body = document.body;
  if (!body) {
    // The client entry may materialize while the parser is still inside <head>.
    var inner = null;
    var onReady = function () { inner = installSkin(); };
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
    return function () {
      document.removeEventListener('DOMContentLoaded', onReady);
      if (typeof inner === 'function') inner();
    };
  }
  resetSkinDom();
  var hadDark = body.hasAttribute('data-ds-dark-theme');
  var previousScheme = root.style.colorScheme;
  var alive = true;
  var observer = null;
  var styleTag = null;

  function reportFailure(where, err) {
    var message = String((err && err.message) || err);
    try { if (window.console) console.error('[firefly] ' + where, err); } catch (e) {}
    try { root.setAttribute('data-ff-error', where + ': ' + message); } catch (e) {}
  }

  root.classList.add('ff-skin');
  root.style.colorScheme = 'dark';
  body.setAttribute('data-ds-dark-theme', '');
  try {
    styleTag = headStyle(CSS);
  } catch (err) {
    reportFailure('styles', err);
  }

  // The stock theme presenter writes the palette attribute on theme changes;
  // the skin owns the dark palette while it is installed.
  try {
    observer = new MutationObserver(function () {
      if (alive && !body.hasAttribute('data-ds-dark-theme')) body.setAttribute('data-ds-dark-theme', '');
    });
    observer.observe(body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
  } catch (err) {
    reportFailure('observer', err);
  }

  var ambient = null;
  var companion = null;
  var particles = null;
  var replayButton = null;
  var playFilm = function () {};

  try {
    ambient = mountAmbient();
  } catch (err) {
    reportFailure('ambient', err);
  }

  try {
    companion = mountCompanion();
  } catch (err) {
    reportFailure('companion', err);
  }

  try {
    particles = mountParticles();
  } catch (err) {
    reportFailure('particles', err);
  }

  try {
    replayButton = mountReplay(function () {
      if (document.getElementById(BOOT_ID)) return;
      replayButton.classList.add('is-playing');
      playFilm(true);
    }, function () {
      var next = !ambientEnabled();
      setAmbientEnabled(next);
      if (ambient) ambient.style.display = next ? '' : 'none';
      toast(next ? 'Firefly ambient // online' : 'Firefly ambient // offline');
    });
  } catch (err) {
    reportFailure('replay button', err);
  }

  playFilm = function (replay) {
    if (!alive || document.getElementById(BOOT_ID)) return;
    try {
      document.body.insertAdjacentHTML('beforeend', buildBootMarkup());
      var host = document.getElementById(BOOT_ID);
      if (!host) return;
      host.style.setProperty('--ff-face-open', 'url("' + ASSETS.open + '")');
      void host.offsetWidth;
      host.classList.add('is-live');
      bootSequence(host, replay, function () {
        markPlayed();
        if (replayButton) replayButton.classList.remove('is-playing');
      });
    } catch (err) {
      reportFailure('boot film', err);
      var failed = document.getElementById(BOOT_ID);
      if (failed) {
        failed.classList.remove('is-live');
        setTimeout(function () { if (failed.parentNode) failed.parentNode.removeChild(failed); }, 60);
      }
      if (replayButton) replayButton.classList.remove('is-playing');
      markPlayed();
    }
  };

  try {
    if (shouldAutoPlay()) {
      requestAnimationFrame(function () { playFilm(false); });
    }
  } catch (err) {
    reportFailure('autoplay', err);
  }

  window.__ffSkin = {
    version: '1.0.1',
    replay: function () { playFilm(true); },
    toggleAmbient: function () {
      var next = !ambientEnabled();
      setAmbientEnabled(next);
      if (ambient) ambient.style.display = next ? '' : 'none';
      toast(next ? 'Firefly ambient // online' : 'Firefly ambient // offline');
    }
  };

  return function dispose() {
    alive = false;
    if (observer) observer.disconnect();
    if (ambient) {
      if (ambient._fireflies) ambient._fireflies.stop();
      if (ambient.parentNode) ambient.parentNode.removeChild(ambient);
    }
    if (companion) {
      if (companion.portrait) companion.portrait.destroy();
      if (companion.blinker) companion.blinker.stop();
      if (companion.stage.parentNode) companion.stage.parentNode.removeChild(companion.stage);
    }
    if (particles) {
      if (particles.fireflies) particles.fireflies.stop();
      if (particles.canvas.parentNode) particles.canvas.parentNode.removeChild(particles.canvas);
    }
    var button = document.getElementById('ff-replay');
    if (button && button.parentNode) button.parentNode.removeChild(button);
    var boot = document.getElementById(BOOT_ID);
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    var toastNode = document.getElementById('ff-toast');
    if (toastNode && toastNode.parentNode) toastNode.parentNode.removeChild(toastNode);
    if (styleTag && styleTag.parentNode) styleTag.parentNode.removeChild(styleTag);
    root.classList.remove('ff-skin');
    root.classList.remove('ff-gl', 'ff-eyed', 'ff-awake', 'ff-blink');
    root.style.colorScheme = previousScheme;
    if (!hadDark) body.removeAttribute('data-ds-dark-theme');
    try { delete window.__ffSkin; } catch (err) { window.__ffSkin = undefined; }
  };
}

var inject = [];

function apply(ctx) {
  if (typeof document === 'undefined') return;
  ctx.effect(installSkin, 'firefly-skin: theme, ambient stage and boot film');
}

module.exports = { apply: apply, inject: inject };
