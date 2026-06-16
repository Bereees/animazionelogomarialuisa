import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pathsData = JSON.parse(readFileSync(join(root, 'paths-morph.json'), 'utf8'));
const { viewBox, original, morph, rings, originalRing } = pathsData;

function flatToBase64(flat) {
  const f32 = new Float32Array(flat);
  return Buffer.from(f32.buffer).toString('base64');
}

const ringsB64 = {
  logomarialuisa: flatToBase64(rings.logomarialuisa),
  tondo: flatToBase64(rings.tondo),
  squadrato: flatToBase64(rings.squadrato),
};
const settleToB64 = flatToBase64(originalRing);

const jsLite = `/**
 * Logo Maria Luisa — morph leggero (senza flubber, path allineati)
 */
(function () {
  'use strict';

  var VIEW_BOX = '${viewBox}';
  var LOGO_COLOR = '#1a1a1a';
  var HOLDS = ${JSON.stringify(original)};
  var RINGS_B64 = ${JSON.stringify(ringsB64)};
  var SETTLE_TO_B64 = '${settleToB64}';

  var TIMELINE = [
    { kind: 'hold', key: 'logomarialuisa', duration: 1500 },
    { kind: 'morph', from: 'logomarialuisa', to: 'tondo', duration: 1200 },
    { kind: 'hold', key: 'tondo', duration: 500 },
    { kind: 'morph', from: 'tondo', to: 'squadrato', duration: 1200 },
    { kind: 'hold', key: 'squadrato', duration: 500 },
    { kind: 'morph', from: 'squadrato', to: 'logomarialuisa', duration: 1400, settle: true },
    { kind: 'hold', key: 'logomarialuisa', duration: 500 }
  ];

  var TOTAL = TIMELINE.reduce(function (sum, step) {
    return sum + step.duration;
  }, 0);

  var SETTLE_SPLIT = 0.7;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * Math.pow(t, 4) : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function b64ToF32(b64) {
    var bin = atob(b64);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Float32Array(u8.buffer);
  }

  function ringToPath(f32) {
    var d = 'M' + f32[0].toFixed(2) + ',' + f32[1].toFixed(2);
    for (var i = 2; i < f32.length; i += 2) {
      d += 'L' + f32[i].toFixed(2) + ',' + f32[i + 1].toFixed(2);
    }
    return d + 'Z';
  }

  function makeMorph(from, to) {
    return function (t) {
      var out = new Float32Array(from.length);
      for (var i = 0; i < from.length; i++) {
        out[i] = from[i] + t * (to[i] - from[i]);
      }
      return ringToPath(out);
    };
  }

  function buildMorphs(rings) {
    return TIMELINE
      .filter(function (step) { return step.kind === 'morph'; })
      .map(function (step) {
        return makeMorph(rings[step.from], rings[step.to]);
      });
  }

  function mount(container) {
    if (container.dataset.mlLogoMounted) return;
    container.dataset.mlLogoMounted = '1';

    var rings = {
      logomarialuisa: b64ToF32(RINGS_B64.logomarialuisa),
      tondo: b64ToF32(RINGS_B64.tondo),
      squadrato: b64ToF32(RINGS_B64.squadrato)
    };
    var settleTo = b64ToF32(SETTLE_TO_B64);
    var morphFns = buildMorphs(rings);
    var settleMorph = makeMorph(rings.logomarialuisa, settleTo);

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', VIEW_BOX);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Logo Maria Luisa');
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';

    var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('fill', LOGO_COLOR);
    pathEl.style.fill = LOGO_COLOR;
    pathEl.setAttribute('d', HOLDS.logomarialuisa);
    svg.appendChild(pathEl);
    container.innerHTML = '';
    container.appendChild(svg);

    var startTime = null;

    function frame(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = (timestamp - startTime) % TOTAL;
      var t = elapsed;
      var morphIdx = 0;

      for (var i = 0; i < TIMELINE.length; i++) {
        var step = TIMELINE[i];
        if (t < step.duration) {
          if (step.kind === 'hold') {
            pathEl.setAttribute('d', HOLDS[step.key]);
          } else if (step.settle) {
            var p = t / step.duration;
            if (p < SETTLE_SPLIT) {
              var morphProgress = easeInOutQuart(p / SETTLE_SPLIT);
              pathEl.setAttribute('d', morphFns[morphIdx](morphProgress));
            } else {
              var settleProgress = easeOutQuint((p - SETTLE_SPLIT) / (1 - SETTLE_SPLIT));
              if (settleProgress >= 1) {
                pathEl.setAttribute('d', HOLDS.logomarialuisa);
              } else {
                pathEl.setAttribute('d', settleMorph(settleProgress));
              }
            }
          } else {
            var eased = easeInOutQuart(t / step.duration);
            pathEl.setAttribute('d', morphFns[morphIdx](eased));
          }
          requestAnimationFrame(frame);
          return;
        }
        if (step.kind === 'morph') morphIdx++;
        t -= step.duration;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function init() {
    var nodes = document.querySelectorAll('.ml-logo-anim, #ml-logo-anim');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

const js = `/**
 * Logo Maria Luisa — morphing flubber (path allineati, senza rotazione)
 */
(function () {
  'use strict';

  var VIEW_BOX = '${viewBox}';
  var LOGO_COLOR = '#1a1a1a';
  var PATHS_ORIGINAL = ${JSON.stringify(original)};
  var PATHS_MORPH = ${JSON.stringify(morph)};
  var MORPH_OPTS = { maxSegmentLength: 5, string: true };

  var TIMELINE = [
    { kind: 'hold', key: 'logomarialuisa', duration: 1500 },
    { kind: 'morph', from: 'logomarialuisa', to: 'tondo', duration: 1200 },
    { kind: 'hold', key: 'tondo', duration: 500 },
    { kind: 'morph', from: 'tondo', to: 'squadrato', duration: 1200 },
    { kind: 'hold', key: 'squadrato', duration: 500 },
    { kind: 'morph', from: 'squadrato', to: 'logomarialuisa', duration: 1400, settle: true },
    { kind: 'hold', key: 'logomarialuisa', duration: 500 }
  ];

  var TOTAL = TIMELINE.reduce(function (sum, step) {
    return sum + step.duration;
  }, 0);

  var SETTLE_SPLIT = 0.7;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * Math.pow(t, 4) : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function getFlubber() {
    if (typeof flubber !== 'undefined' && flubber.interpolate) return flubber;
    if (typeof window !== 'undefined' && window.flubber) return window.flubber;
    return null;
  }

  function buildMorphs(flub) {
    return TIMELINE
      .filter(function (step) { return step.kind === 'morph'; })
      .map(function (step) {
        return flub.interpolate(PATHS_MORPH[step.from], PATHS_MORPH[step.to], MORPH_OPTS);
      });
  }

  function mount(container) {
    if (container.dataset.mlLogoMounted) return;
    container.dataset.mlLogoMounted = '1';

    var flub = getFlubber();
    if (!flub) {
      console.error('[ml-logo] flubber non trovato. Includi dist/flubber.min.js prima di logo-animato.js');
      return;
    }

    var morphFns = buildMorphs(flub);
    var settleToOriginal = flub.interpolate(
      PATHS_MORPH.logomarialuisa,
      PATHS_ORIGINAL.logomarialuisa,
      MORPH_OPTS
    );

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', VIEW_BOX);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Logo Maria Luisa');
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';

    var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('fill', LOGO_COLOR);
    pathEl.style.fill = LOGO_COLOR;
    pathEl.setAttribute('d', PATHS_ORIGINAL.logomarialuisa);
    svg.appendChild(pathEl);
    container.innerHTML = '';
    container.appendChild(svg);

    var startTime = null;

    function frame(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = (timestamp - startTime) % TOTAL;
      var t = elapsed;
      var morphIdx = 0;

      for (var i = 0; i < TIMELINE.length; i++) {
        var step = TIMELINE[i];
        if (t < step.duration) {
          if (step.kind === 'hold') {
            pathEl.setAttribute('d', PATHS_ORIGINAL[step.key]);
          } else if (step.settle) {
            var p = t / step.duration;
            if (p < SETTLE_SPLIT) {
              var morphProgress = easeInOutQuart(p / SETTLE_SPLIT);
              pathEl.setAttribute('d', morphFns[morphIdx](morphProgress));
            } else {
              var settleProgress = easeOutQuint((p - SETTLE_SPLIT) / (1 - SETTLE_SPLIT));
              pathEl.setAttribute('d', settleToOriginal(settleProgress));
            }
          } else {
            var eased = easeInOutQuart(t / step.duration);
            pathEl.setAttribute('d', morphFns[morphIdx](eased));
          }
          requestAnimationFrame(frame);
          return;
        }
        if (step.kind === 'morph') morphIdx++;
        t -= step.duration;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function init() {
    var nodes = document.querySelectorAll('.ml-logo-anim, #ml-logo-anim');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'logo-animato-lite.js'), jsLite);
writeFileSync(join(root, 'dist', 'logo-animato.js'), js);
copyFileSync(
  join(root, 'node_modules', 'flubber', 'build', 'flubber.min.js'),
  join(root, 'dist', 'flubber.min.js')
);

const bundleFlubber = [
  readFileSync(join(root, 'node_modules', 'flubber', 'build', 'flubber.min.js'), 'utf8'),
  js,
].join('\n');
writeFileSync(join(root, 'dist', 'ml-logo.bundle.js'), jsLite);
writeFileSync(join(root, 'dist', 'ml-logo.bundle.flubber.js'), bundleFlubber);

const elementorLazyHtml = `<style>
.ml-logo-anim{display:block;width:100%;max-width:450px;margin:0 auto;line-height:0}
.ml-logo-anim svg{display:block;width:100%;height:auto}
.ml-logo-anim path{fill:#1a1a1a!important}
</style>
<div class="ml-logo-anim" id="ml-logo-anim" aria-hidden="true">
  <svg viewBox="${viewBox}" role="img" aria-label="Logo Maria Luisa" style="display:block;width:100%;height:auto">
    <path fill="#1a1a1a" d="${original.logomarialuisa}"/>
  </svg>
</div>
<script>
(function (w, d, base) {
  var el = d.getElementById('ml-logo-anim');
  if (!el || el.dataset.mlLogoQueued) return;
  el.dataset.mlLogoQueued = '1';

  function loadBundle() {
    if (d.getElementById('ml-logo-bundle')) return;
    var s = d.createElement('script');
    s.id = 'ml-logo-bundle';
    s.src = base + 'ml-logo.bundle.js';
    s.defer = true;
    d.body.appendChild(s);
  }

  function scheduleLoad() {
    if (w.requestIdleCallback) {
      w.requestIdleCallback(loadBundle, { timeout: 2500 });
    } else {
      w.addEventListener('load', function () { setTimeout(loadBundle, 120); });
    }
  }

  if ('IntersectionObserver' in w) {
    var io = new w.IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        scheduleLoad();
      }
    }, { rootMargin: '120px', threshold: 0.01 });
    io.observe(el);
  } else {
    scheduleLoad();
  }
})(window, document, 'SOSTITUISCI_URL_CARTELLA/');
</script>
`;

writeFileSync(join(root, 'embed', 'elementor.html'), elementorLazyHtml);
writeFileSync(join(root, 'embed', 'elementor-snippet.html'), `<!-- Logo Maria Luisa — versione leggera (consigliata per WordPress) -->
<!-- 1) Carica dist/ml-logo.bundle.js sul sito (Media o tema) -->
<!-- 2) Sostituisci SOSTITUISCI_URL_CARTELLA con l'URL della cartella, con / finale -->
${elementorLazyHtml}`);

const inlineHtml = `<style>
.ml-logo-anim{display:block;width:100%;max-width:450px;margin:0 auto;line-height:0}
.ml-logo-anim svg{display:block;width:100%;height:auto}
.ml-logo-anim path{fill:#1a1a1a!important}
</style>
<div class="ml-logo-anim" id="ml-logo-anim" aria-hidden="true"></div>
<script>
${jsLite}
</script>
`;
writeFileSync(join(root, 'embed', 'elementor-incolla.html'), inlineHtml);

const inlineKb = (inlineHtml.length / 1024).toFixed(1);
console.log('Built dist/logo-animato-lite.js, dist/logo-animato.js, dist/ml-logo.bundle.js');
console.log('Snippet inline Elementor (~' + inlineKb + ' KB): embed/elementor-incolla.html');
console.log('Snippet esterno: embed/elementor-snippet.html');
