// NANNO slide deck: locked pagination, scoped to whichever page loaded
// this script — each real page (index/work/process/studio/start-a-
// project) has its own small deck of [data-slide] sections and its own
// dot rail. One scroll gesture (wheel notch, swipe, arrow key) snaps
// straight to the next or previous slide within that page.
// The Work slide's horizontal gallery is a separate thing entirely: it
// isn't driven by the wheel at all, but by a floating hint that follows
// the mouse — the cursor's position across the strip sets a target
// scroll position that the strip eases smoothly toward, rather than
// jumping straight to it.
(function () {
  'use strict';

  var TRANSITION_MS = 700;      // matches the .slide opacity transition
  var TRANSITION_LOCK_MS = TRANSITION_MS + 80;
  var MIN_SWIPE = 40;           // px of vertical touch movement to count as a swipe

  var slides = Array.prototype.slice.call(document.querySelectorAll('[data-slide]'));
  var index = 0;
  var locked = false;
  var rail = null;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function slideId(i) { return slides[i].id; }

  function indexForId(id) {
    for (var i = 0; i < slides.length; i++) if (slides[i].id === id) return i;
    return -1;
  }

  function isFormField(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function updateRail() {
    if (!rail) return;
    Array.prototype.forEach.call(rail.children, function (item, i) {
      item.querySelector('button').classList.toggle('is-active', i === index);
    });
  }

  // Each dot sits in a wrapper with its own label pill, revealed on hover
  // (or keyboard focus) so the rail stays a minimal row of dots until you
  // actually want to see what each position is.
  function buildRail() {
    rail = document.createElement('div');
    rail.className = 'deck-rail';
    slides.forEach(function (s, i) {
      var item = document.createElement('div');
      item.className = 'rail-item';
      var label = document.createElement('span');
      label.className = 'rail-label';
      label.textContent = s.dataset.label || s.id || 'Slide ' + (i + 1);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Go to ' + (s.dataset.label || s.id || 'slide ' + (i + 1)));
      btn.addEventListener('click', function () { goTo(i); });
      item.appendChild(label);
      item.appendChild(btn);
      rail.appendChild(item);
    });
    document.body.appendChild(rail);
  }

  function activate(i) {
    slides[i].classList.add('is-active');
    var gallery = slides[i].querySelector('[data-work-gallery]');
    if (gallery) updateGalleryFill(gallery);
    if (window.NANNO && window.NANNO.activateSlide) window.NANNO.activateSlide(slides[i]);
  }

  // Direct, immediate jump — used by nav links, the dot rail, keyboard,
  // wheel, and touch swipes alike. Locked briefly after each jump so a
  // single gesture (a burst of wheel ticks, a long swipe) only fires once.
  function goTo(target) {
    var next = typeof target === 'number' ? target : indexForId(target);
    if (next < 0 || next >= slides.length || next === index || locked) return;
    locked = true;
    // A hovered project's pointerleave never fires when the slide fades
    // out from under a motionless cursor, so clear any lingering hover
    // state by hand rather than leaving it stuck on top of the next slide.
    if (window.NANNO && window.NANNO.resetHoverCursor) window.NANNO.resetHoverCursor();
    slides[index].classList.remove('is-active');
    index = next;
    activate(index);
    updateRail();
    try { history.replaceState(null, '', '#' + slideId(index)); } catch (e) { }
    window.setTimeout(function () { locked = false; }, TRANSITION_LOCK_MS);
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  // -- wheel: always paginates vertically, even while hovering the gallery --
  window.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (e.deltaY > 0) next();
    else if (e.deltaY < 0) prev();
  }, { passive: false });

  // -- touch: natural drag inside the gallery; elsewhere, a swipe past
  //    MIN_SWIPE snaps a slide --
  var touchStartY = null;
  var touchGallery = null;
  window.addEventListener('touchstart', function (e) {
    touchStartY = e.touches[0].clientY;
    touchGallery = e.target.closest ? e.target.closest('[data-work-gallery]') : null;
  }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (touchGallery) return; // native horizontal drag inside the gallery
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    var wasGallery = touchGallery;
    var startY = touchStartY;
    touchStartY = null; touchGallery = null;
    if (wasGallery || startY == null) return;
    var endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : startY;
    var delta = startY - endY;
    if (Math.abs(delta) < MIN_SWIPE) return;
    if (delta > 0) next(); else prev();
  }, { passive: true });

  // -- keyboard (skipped while typing in a form field) --
  window.addEventListener('keydown', function (e) {
    if (isFormField(document.activeElement)) return;
    var gallery = slides[index].querySelector('[data-work-gallery]');
    if (gallery && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      gallery.scrollBy({ left: e.key === 'ArrowRight' ? 280 : -280, behavior: 'smooth' });
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    }
  });

  // -- nav links / in-content links with data-goto — direct snap --
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    goTo(a.dataset.goto);
  });

  // -- mobile hamburger menu (nav-links are hidden below 700px) --
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  function closeMobileMenu() {
    if (!mobileMenu || !mobileMenu.classList.contains('is-open')) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      var open = mobileMenu.classList.toggle('is-open');
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMobileMenu);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMenu();
    });
  }

  // The Work slide holds its 7 projects as a horizontally-scrolling strip.
  // Hovering it shows a floating "scroll" hint that follows the cursor;
  // the cursor's position across the strip's width sets a target scroll
  // position, and the strip eases smoothly toward that target every
  // frame rather than jumping straight to it. The [data-fill-scroll]
  // heading fills in as soon as you've moved away from the very start.
  var GALLERY_EASE = 0.14;

  function updateGalleryFill(g) {
    var slide = g.closest('.slide');
    var fillEl = slide && slide.querySelector('[data-fill-scroll]');
    if (!fillEl) return;
    var progress = clamp(g.scrollLeft / 220, 0, 1);
    fillEl.style.setProperty('--fill', (progress * 100) + '%');
  }

  function easeGalleryTo(g) {
    if (g._easing) return;
    g._easing = true;
    function tick() {
      var diff = g._targetLeft - g.scrollLeft;
      if (Math.abs(diff) > 1) {
        // scrollLeft rounds to whole pixels, so once the eased step itself
        // drops below 1px it would round away to nothing and freeze just
        // short of the target — floor it to at least 1px of real progress.
        var step = diff * GALLERY_EASE;
        if (Math.abs(step) < 1) step = diff > 0 ? 1 : -1;
        g.scrollLeft += step;
        requestAnimationFrame(tick);
      } else {
        g.scrollLeft = g._targetLeft;
        g._easing = false;
      }
    }
    requestAnimationFrame(tick);
  }

  var scrubHint = document.createElement('div');
  scrubHint.className = 'nn-scrub';
  scrubHint.innerHTML = '<span>&#8249;</span> scroll <span>&#8250;</span>';
  document.body.appendChild(scrubHint);

  Array.prototype.forEach.call(document.querySelectorAll('[data-work-gallery]'), function (g) {
    g.addEventListener('scroll', function () { updateGalleryFill(g); }, { passive: true });

    g.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      scrubHint.classList.add('is-active');
    });
    g.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      scrubHint.classList.remove('is-active');
    });
    g.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      scrubHint.style.left = e.clientX + 'px';
      scrubHint.style.top = e.clientY + 'px';
      var rect = g.getBoundingClientRect();
      var progress = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      g._targetLeft = progress * (g.scrollWidth - g.clientWidth);
      easeGalleryTo(g);
    });
  });

  // -- init: jump straight to the slide named in the URL hash, if any.
  //    Deferred to DOMContentLoaded so main.js's character-splitting (which
  //    scatter/fill entrances on the very first slide depend on) has run. --
  document.addEventListener('DOMContentLoaded', function () {
    buildRail();
    var startId = location.hash ? location.hash.slice(1) : '';
    var startIndex = startId ? indexForId(startId) : -1;
    index = startIndex >= 0 ? startIndex : 0;
    activate(index);
    updateRail();
    try { history.replaceState(null, '', '#' + slideId(index)); } catch (e) { }
  });
})();
