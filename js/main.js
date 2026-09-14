// NANNO landing page interactions:
// staggered character splitting + scroll/mouse parallax, reveal-on-scroll,
// and a custom cursor that shows a magnified lens over hovered project art.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var root = document.body;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // -- staggered editorial offsets on portfolio items --
    root.querySelectorAll('[data-offset]').forEach(function (el) {
      var v = parseFloat(el.dataset.offset) || 0;
      el.style.transform = window.innerWidth > 900 ? 'translateY(' + (v * 0.5) + 'px)' : 'none';
    });

    // -- character splitting (do this before anything reads [data-ch]) --
    // Each word's characters are grouped in a nowrap wrapper so the browser
    // can still break lines between words, never in the middle of a word.
    root.querySelectorAll('[data-split]').forEach(function (el) {
      if (el.querySelector('[data-ch]')) return;
      var frag = document.createDocumentFragment();
      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType !== 3) { frag.appendChild(node.cloneNode(true)); return; }
        var wordWrap = null;
        Array.from(node.textContent).forEach(function (ch) {
          if (ch === ' ') {
            wordWrap = null;
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          if (!wordWrap) {
            wordWrap = document.createElement('span');
            wordWrap.style.display = 'inline-block';
            wordWrap.style.whiteSpace = 'nowrap';
            frag.appendChild(wordWrap);
          }
          var s = document.createElement('span');
          s.setAttribute('data-ch', '1');
          s.textContent = ch;
          s.style.display = 'inline-block';
          s.style.willChange = 'transform';
          wordWrap.appendChild(s);
        });
      });
      el.textContent = '';
      el.appendChild(frag);
    });

    // -- reveal on enter (mask + lift) --
    var revealEls = Array.prototype.slice.call(root.querySelectorAll('[data-reveal]'));
    if (!reduced) {
      revealEls.forEach(function (el) {
        el.style.opacity = '0';
        el.style.clipPath = 'inset(0 0 18% 0)';
        el.style.transform = (el.style.transform && el.style.transform !== 'none' ? el.style.transform + ' ' : '') + 'translateY(26px)';
        el.style.transition = 'opacity .9s cubic-bezier(.16,1,.3,1), clip-path 1.1s cubic-bezier(.16,1,.3,1), transform 1.1s cubic-bezier(.16,1,.3,1)';
      });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          el.style.opacity = '1';
          el.style.clipPath = 'inset(0 0 0 0)';
          el.style.transform = el.style.transform.replace('translateY(26px)', 'translateY(0px)');
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      revealEls.forEach(function (el) { io.observe(el); });
    }

    // -- custom cursor + magnifying lens over project art --
    var cursor = document.createElement('div');
    cursor.className = 'nn-cursor';
    document.body.appendChild(cursor);

    var blob = document.createElement('div');
    blob.className = 'nn-lens';
    document.body.appendChild(blob);

    var lensInner = document.createElement('div');
    lensInner.className = 'nn-lens-inner';
    var lensClone = document.createElement('div');
    lensClone.className = 'nn-lens-clone';
    lensInner.appendChild(lensClone);
    blob.appendChild(lensInner);
    var lens = { target: null, zoom: 1.75 };

    root.querySelectorAll('[data-img]').forEach(function (el) {
      el.addEventListener('pointerenter', function () {
        lens.target = el;
        lensClone.innerHTML = el.innerHTML;
        lensInner.style.background = 'var(--color-surface)';
      });
      el.addEventListener('pointerleave', function () {
        lens.target = null;
        lensClone.innerHTML = '';
        lensInner.style.background = 'transparent';
      });
    });

    var projects = Array.prototype.slice.call(root.querySelectorAll('[data-project]'));
    projects.forEach(function (p) {
      var img = p.querySelector('[data-img]');
      var huge = p.querySelector('[data-hugetitle]');
      if (huge) huge.style.transform = 'translateY(18px)';
      p.addEventListener('pointerenter', function () {
        if (huge) { huge.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.16,1,.3,1)'; huge.style.opacity = '1'; huge.style.transform = 'translateY(0)'; }
        if (img) { img.style.transition = 'filter .6s ease'; img.style.filter = 'contrast(1.06)'; }
        cursor.textContent = p.dataset.cursor || 'View';
        cursor.classList.add('is-active');
      });
      p.addEventListener('pointerleave', function () {
        if (huge) { huge.style.opacity = '0'; huge.style.transform = 'translateY(18px)'; }
        if (img) img.style.filter = 'none';
        cursor.classList.remove('is-active');
      });
    });

    if (reduced) return;

    // -- measured animation targets for the scroll/mouse parallax loop --
    var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-px],[data-py],[data-mag],[data-scale],[data-scatter]'));
    var items = nodes.map(function (el) {
      return {
        el: el,
        px: parseFloat(el.dataset.px) || 0,
        py: parseFloat(el.dataset.py) || 0,
        mag: parseFloat(el.dataset.mag) || 0,
        sc: parseFloat(el.dataset.scale) || 0,
        chars: (el.hasAttribute('data-scatter') || el.hasAttribute('data-mag')) ? Array.prototype.slice.call(el.querySelectorAll('[data-ch]')) : [],
        scatter: el.hasAttribute('data-scatter'),
        base: el.style.transform && el.style.transform !== 'none' ? el.style.transform : '',
        top: 0, h: 0
      };
    });
    items.forEach(function (it) { it.el.style.willChange = 'transform'; });

    function measure() {
      var sy = window.scrollY;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        it.top = r.top + sy; it.h = r.height;
      });
    }
    measure();
    window.addEventListener('resize', measure);
    setTimeout(measure, 600);
    setTimeout(measure, 1800);

    var S = { sy: window.scrollY, ty: window.scrollY, mx: 0, my: 0, tmx: 0, tmy: 0, cx: -200, cy: -200, tcx: -200, tcy: -200 };
    window.addEventListener('scroll', function () { S.ty = window.scrollY; }, { passive: true });
    window.addEventListener('pointermove', function (e) {
      S.tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      S.tmy = (e.clientY / window.innerHeight - 0.5) * 2;
      S.tcx = e.clientX; S.tcy = e.clientY;
      blob.style.opacity = '1';
    }, { passive: true });

    function rnd(i) { return Math.sin(i * 12.9898) * 43758.5453 % 1; }
    function vh() { return window.innerHeight; }

    function loop() {
      S.sy += (S.ty - S.sy) * 0.1;
      S.mx += (S.tmx - S.mx) * 0.055;
      S.my += (S.tmy - S.my) * 0.055;
      S.cx += (S.tcx - S.cx) * 0.16;
      S.cy += (S.tcy - S.cy) * 0.16;
      cursor.style.left = S.cx + 'px'; cursor.style.top = S.cy + 'px';
      blob.style.left = S.cx + 'px'; blob.style.top = S.cy + 'px';

      if (lens.target) {
        var r0 = lens.target.getBoundingClientRect();
        var z = lens.zoom, R = blob.offsetWidth / 2;
        lensClone.style.width = r0.width + 'px';
        lensClone.style.height = r0.height + 'px';
        lensClone.style.transform = 'translate(' + (R - (S.cx - r0.left) * z) + 'px,' + (R - (S.cy - r0.top) * z) + 'px) scale(' + z + ')';
      }

      items.forEach(function (it) {
        var center = it.top + it.h / 2 - S.sy;
        var c = Math.max(-1.4, Math.min(1.4, (center - vh() / 2) / (vh() / 2 + it.h / 2)));
        var visible = Math.abs(center) < vh() * 1.6;
        if (!visible) return;
        var dx = it.px * c * 140 + it.mag * S.mx * 0.5;
        var dy = it.py * c * 120 + it.mag * S.my * 0.22;
        var sc = it.sc ? 1 + it.sc * Math.max(0, 1 - Math.abs(c)) : 1;
        it.el.style.transform = it.base + ' translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)' + (sc !== 1 ? ' scale(' + sc.toFixed(4) + ')' : '');
        if (it.chars.length) {
          var enterP = Math.max(0, Math.min(1, (1 - Math.abs(c)) * 1.6));
          it.chars.forEach(function (ch, i) {
            var rr = rnd(i + 1);
            var jx = it.scatter ? rr * 70 * (1 - enterP) : 0;
            var jy = it.scatter ? (rr > 0 ? 1 : -1) * 40 * (1 - enterP) : 0;
            var px = it.mag ? it.mag * S.mx * (0.35 + Math.abs(rr) * 0.9) : 0;
            var py = it.mag ? it.mag * S.my * (0.12 + Math.abs(rr) * 0.3) : 0;
            ch.style.transform = 'translate3d(' + (jx + px).toFixed(2) + 'px,' + (jy + py).toFixed(2) + 'px,0)';
          });
        }
      });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
})();
