// NANNO slide-deck interactions:
// one-time setup (character splitting, project-hover cursor/lens, continuous
// mouse-reactive "magnetic" text) plus per-slide entrance animations
// (outline-to-fill headings, reveal-on-enter, scatter-to-settled text) fired
// by js/deck.js via window.NANNO.activateSlide() whenever a slide becomes
// the active one.
(function () {
  'use strict';

  window.NANNO = window.NANNO || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var root = document.body;

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

    // -- magnifying lens over project art --
    var blob = document.createElement('div');
    blob.className = 'nn-lens';
    var lensInner = document.createElement('div');
    lensInner.className = 'nn-lens-inner';
    var lensClone = document.createElement('div');
    lensClone.className = 'nn-lens-clone';
    lensInner.appendChild(lensClone);
    blob.appendChild(lensInner);
    document.body.appendChild(blob);
    var lens = { target: null, zoom: 1.75 };

    // Called by deck.js on every slide change, since a hovered project's
    // pointerleave never fires when the slide fades out from under a
    // motionless cursor (e.g. leaving via wheel/keyboard rather than by
    // actually moving the mouse off it) — without this the lens would
    // linger on top of whatever slide comes next.
    window.NANNO.resetHoverCursor = function () {
      lens.target = null;
      lensClone.innerHTML = '';
      lensInner.style.background = 'transparent';
      blob.style.opacity = '0';
    };

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

    root.querySelectorAll('[data-project]').forEach(function (p) {
      var img = p.querySelector('[data-img]');
      var huge = p.querySelector('[data-hugetitle]');
      if (huge) huge.style.transform = 'translateY(18px)';
      p.addEventListener('pointerenter', function () {
        if (huge) { huge.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.16,1,.3,1)'; huge.style.opacity = '1'; huge.style.transform = 'translateY(0)'; }
        if (img) { img.style.transition = 'filter .6s ease'; img.style.filter = 'contrast(1.06)'; }
      });
      p.addEventListener('pointerleave', function () {
        if (huge) { huge.style.opacity = '0'; huge.style.transform = 'translateY(18px)'; }
        if (img) img.style.filter = 'none';
      });
    });

    if (reduced) return;

    // -- continuous mouse-reactive "magnetic" text, active slide only --
    var magItems = Array.prototype.slice.call(root.querySelectorAll('[data-mag]')).map(function (el) {
      return {
        el: el,
        mag: parseFloat(el.dataset.mag) || 0,
        chars: Array.prototype.slice.call(el.querySelectorAll('[data-ch]')),
        base: el.style.transform && el.style.transform !== 'none' ? el.style.transform : ''
      };
    });
    magItems.forEach(function (it) { it.el.style.willChange = 'transform'; });

    var M = { mx: 0, my: 0, tmx: 0, tmy: 0, cx: -200, cy: -200, tcx: -200, tcy: -200 };
    window.addEventListener('pointermove', function (e) {
      M.tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      M.tmy = (e.clientY / window.innerHeight - 0.5) * 2;
      M.tcx = e.clientX; M.tcy = e.clientY;
      blob.style.opacity = '1';
    }, { passive: true });

    function rnd(i) { return Math.sin(i * 12.9898) * 43758.5453 % 1; }

    function loop() {
      M.mx += (M.tmx - M.mx) * 0.055;
      M.my += (M.tmy - M.my) * 0.055;
      M.cx += (M.tcx - M.cx) * 0.16;
      M.cy += (M.tcy - M.cy) * 0.16;
      blob.style.left = M.cx + 'px'; blob.style.top = M.cy + 'px';

      if (lens.target) {
        var r0 = lens.target.getBoundingClientRect();
        var z = lens.zoom, R = blob.offsetWidth / 2;
        lensClone.style.width = r0.width + 'px';
        lensClone.style.height = r0.height + 'px';
        lensClone.style.transform = 'translate(' + (R - (M.cx - r0.left) * z) + 'px,' + (R - (M.cy - r0.top) * z) + 'px) scale(' + z + ')';
      }

      magItems.forEach(function (it) {
        var slide = it.el.closest('.slide');
        if (slide && !slide.classList.contains('is-active')) return;
        var dx = it.mag * M.mx * 0.5;
        var dy = it.mag * M.my * 0.22;
        it.el.style.transform = it.base + ' translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
        it.chars.forEach(function (ch, i) {
          var rr = rnd(i + 1);
          var px = it.mag * M.mx * (0.35 + Math.abs(rr) * 0.9);
          var py = it.mag * M.my * (0.12 + Math.abs(rr) * 0.3);
          ch.style.transform = 'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0)';
        });
      });

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // -- per-slide entrance animations, called by deck.js on slide activate --
  function activateSlide(slideEl) {
    // outline-to-fill headings
    slideEl.querySelectorAll('[data-fill]:not([data-fill-scroll])').forEach(function (el) {
      el.style.setProperty('--fill', '0%');
      if (reduced) { el.style.setProperty('--fill', '100%'); return; }
      var start = null;
      var duration = 900;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.style.setProperty('--fill', (eased * 100).toFixed(1) + '%');
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });

    // reveal-on-enter (mask + lift)
    var revealEls = slideEl.querySelectorAll('[data-reveal]');
    if (reduced) {
      revealEls.forEach(function (el) { el.style.opacity = '1'; el.style.clipPath = 'inset(0 0 0 0)'; el.style.transform = 'none'; });
    } else {
      revealEls.forEach(function (el, i) {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.clipPath = 'inset(0 0 18% 0)';
        el.style.transform = 'translateY(26px)';
        // eslint-disable-next-line no-unused-expressions
        el.getBoundingClientRect();
        window.setTimeout(function () {
          el.style.transition = 'opacity .8s cubic-bezier(.16,1,.3,1), clip-path 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)';
          el.style.opacity = '1';
          el.style.clipPath = 'inset(0 0 0 0)';
          el.style.transform = 'translateY(0px)';
        }, 60 + i * 90);
      });
    }

    // scatter-to-settled character entrance
    slideEl.querySelectorAll('[data-scatter]').forEach(function (el) {
      var chars = el.querySelectorAll('[data-ch]');
      if (reduced) { chars.forEach(function (ch) { ch.style.transform = 'none'; }); return; }
      function rnd(i) { return Math.sin(i * 12.9898) * 43758.5453 % 1; }
      var start = null;
      var duration = 900;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        chars.forEach(function (ch, i) {
          var rr = rnd(i + 1);
          var jx = rr * 70 * (1 - eased);
          var jy = (rr > 0 ? 1 : -1) * 40 * (1 - eased);
          ch.style.transform = 'translate3d(' + jx.toFixed(2) + 'px,' + jy.toFixed(2) + 'px,0)';
        });
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  window.NANNO.activateSlide = activateSlide;
})();
