import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { viewBox, original, morph } = JSON.parse(readFileSync(join(root, 'paths-morph.json'), 'utf8'));

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
writeFileSync(join(root, 'dist', 'logo-animato.js'), js);
copyFileSync(
  join(root, 'node_modules', 'flubber', 'build', 'flubber.min.js'),
  join(root, 'dist', 'flubber.min.js')
);

const bundle = [
  readFileSync(join(root, 'node_modules', 'flubber', 'build', 'flubber.min.js'), 'utf8'),
  js,
].join('\n');
writeFileSync(join(root, 'dist', 'ml-logo.bundle.js'), bundle);

const elementorHtml = `<style>
.ml-logo-anim{display:block;width:100%;max-width:450px;margin:0 auto;line-height:0}
.ml-logo-anim svg{display:block;width:100%;height:auto}
.ml-logo-anim path{fill:#1a1a1a!important}
</style>
<div class="ml-logo-anim" id="ml-logo-anim" aria-hidden="true"></div>
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

writeFileSync(join(root, 'embed', 'elementor.html'), elementorHtml);

const bundleJs = readFileSync(join(root, 'dist', 'ml-logo.bundle.js'), 'utf8');
const inlineHtml = `<style>
.ml-logo-anim{display:block;width:100%;max-width:450px;margin:0 auto;line-height:0}
.ml-logo-anim svg{display:block;width:100%;height:auto}
.ml-logo-anim path{fill:#1a1a1a!important}
</style>
<div class="ml-logo-anim" id="ml-logo-anim" aria-hidden="true"></div>
<script>
${bundleJs}
</script>
`;
writeFileSync(join(root, 'embed', 'elementor-incolla.html'), inlineHtml);

console.log('Built dist/logo-animato.js, dist/flubber.min.js, dist/ml-logo.bundle.js');
console.log('Snippet (incolla in Elementor): embed/elementor-incolla.html');
