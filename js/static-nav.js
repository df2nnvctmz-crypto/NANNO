// Hamburger menu wiring for plain static pages (Impressum, Datenschutz)
// that don't load deck.js, since those have no [data-slide] content for
// the deck controller to run against.
(function () {
  'use strict';
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  if (!menuToggle || !mobileMenu) return;

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  menuToggle.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('is-open');
    mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeMenu);
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
})();
