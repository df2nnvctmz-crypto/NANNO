// Start-a-project page: live price calculator + mailto submission.
// Pricing is an illustrative ballpark, not a real quoting engine.
//
// Project types are multi-select: each type you pick gets its own
// deliverables count + complexity level (perType), summed together and
// then adjusted by one shared timeline multiplier.
//
// Exposed as window.NANNO.initCalculator() so js/transitions.js can re-run
// this after a soft-navigation into this page swaps in a fresh #start-form.
(function () {
  'use strict';

  window.NANNO = window.NANNO || {};

  function init() {
    var form = document.getElementById('start-form');
    if (!form) return;

    var PROJECT_TYPES = {
      abstract: { num: '01', label: 'Graphical abstract', base: 650, perUnit: 220 },
      poster: { num: '02', label: 'Poster & conference design', base: 380, perUnit: 150 },
      dataviz: { num: '03', label: 'Data visualization', base: 500, perUnit: 180 },
      landing: { num: '04', label: 'Landing page', base: 1800, perUnit: 600 },
      website: { num: '05', label: 'Product website', base: 3200, perUnit: 900 },
      illustration: { num: '06', label: 'Scientific illustration', base: 450, perUnit: 180 }
    };
    var COMPLEXITY_ORDER = ['simple', 'standard', 'detailed'];
    var COMPLEXITY = {
      simple: { label: 'Simple', mult: 0.85 },
      standard: { label: 'Standard', mult: 1 },
      detailed: { label: 'Detailed', mult: 1.3 }
    };
    var TIMELINE = {
      flexible: { label: 'Flexible', mult: 0.9 },
      standard: { label: 'Standard', mult: 1 },
      rush: { label: 'Rush', mult: 1.4 }
    };
    var MIN_UNITS = 1;
    var MAX_UNITS = 12;

    var typeCheckboxes = form.querySelectorAll('input[name="project-type"]');
    var scopeListEl = document.getElementById('type-scope-list');
    var lowEl = document.getElementById('estimate-low');
    var highEl = document.getElementById('estimate-high');
    var breakdownEl = document.getElementById('estimate-breakdown');
    var stickyLowEl = document.getElementById('sticky-estimate-low');
    var stickyHighEl = document.getElementById('sticky-estimate-high');
    var stickyBreakdownEl = document.getElementById('sticky-breakdown');
    var priceStickyEl = document.getElementById('price-sticky');

    // Per-type scope, keyed by PROJECT_TYPES key. Kept even while a type is
    // deselected, so re-checking it restores what you'd set before.
    var perType = {};
    Object.keys(PROJECT_TYPES).forEach(function (k) {
      perType[k] = { units: 1, complexity: 'standard' };
    });

    var currentLow = 0;
    var currentHigh = 0;
    var hasComputedOnce = false;
    var estimatePriceEl = document.querySelector('.estimate-price');
    var stickyValueEl = document.querySelector('.price-sticky-value');

    // Restart a CSS animation on an element by forcing a reflow between
    // removing and re-adding the class — used for the little "pop" pulse
    // that confirms a number just changed.
    function pulse(el) {
      if (!el) return;
      el.classList.remove('is-updating');
      void el.offsetWidth;
      el.classList.add('is-updating');
    }

    function selectedValue(name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : null;
    }

    function getSelectedKeys() {
      return Array.prototype.filter.call(typeCheckboxes, function (cb) { return cb.checked; })
        .map(function (cb) { return cb.value; });
    }

    function money(n) {
      return Math.round(n).toLocaleString('de-DE') + ' €';
    }

    function round10(n) {
      return Math.round(n / 10) * 10;
    }

    function scopeRowHTML(key) {
      var type = PROJECT_TYPES[key];
      var state = perType[key];
      var complexityBtns = COMPLEXITY_ORDER.map(function (ck) {
        var active = state.complexity === ck;
        return '<button type="button" data-action="complexity" data-value="' + ck + '" ' +
          'aria-pressed="' + active + '" class="' + (active ? 'is-active' : '') + '">' +
          COMPLEXITY[ck].label + '</button>';
      }).join('');
      return (
        '<div class="type-scope-row" data-type="' + key + '">' +
          '<div class="type-scope-head">' +
            '<span class="type-scope-num">' + type.num + '</span>' +
            '<span class="type-scope-name">' + type.label + '</span>' +
          '</div>' +
          '<div class="type-scope-controls">' +
            '<div class="stepper stepper--compact">' +
              '<button type="button" data-action="dec" aria-label="Fewer ' + type.label + ' deliverables"' + (state.units <= MIN_UNITS ? ' disabled' : '') + '>−</button>' +
              '<output>' + state.units + '</output>' +
              '<button type="button" data-action="inc" aria-label="More ' + type.label + ' deliverables"' + (state.units >= MAX_UNITS ? ' disabled' : '') + '>+</button>' +
            '</div>' +
            '<div class="seg seg--compact" role="group" aria-label="' + type.label + ' complexity">' + complexityBtns + '</div>' +
          '</div>' +
        '</div>'
      );
    }

    function renderScopeRows() {
      var keys = getSelectedKeys();
      scopeListEl.innerHTML = keys.map(scopeRowHTML).join('');
    }

    scopeListEl.addEventListener('click', function (e) {
      var row = e.target.closest('.type-scope-row');
      if (!row) return;
      var key = row.dataset.type;
      var state = perType[key];

      var stepBtn = e.target.closest('[data-action="dec"], [data-action="inc"]');
      if (stepBtn) {
        var dir = stepBtn.dataset.action === 'inc' ? 1 : -1;
        var next = Math.max(MIN_UNITS, Math.min(MAX_UNITS, state.units + dir));
        if (next === state.units) return;
        state.units = next;
        var output = row.querySelector('output');
        output.textContent = String(state.units);
        pulse(output);
        row.querySelector('[data-action="dec"]').disabled = state.units <= MIN_UNITS;
        row.querySelector('[data-action="inc"]').disabled = state.units >= MAX_UNITS;
        compute();
        return;
      }

      var complexityBtn = e.target.closest('[data-action="complexity"]');
      if (complexityBtn) {
        var value = complexityBtn.dataset.value;
        if (state.complexity === value) return;
        state.complexity = value;
        row.querySelectorAll('[data-action="complexity"]').forEach(function (b) {
          var active = b.dataset.value === value;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        pulse(row.querySelector('.seg--compact'));
        compute();
      }
    });

    function buildRow(pair, className) {
      var row = document.createElement('div');
      row.className = className;
      var a = document.createElement('span');
      a.textContent = pair[0];
      var b = document.createElement('span');
      b.textContent = pair[1];
      row.appendChild(a);
      row.appendChild(b);
      return row;
    }

    function renderBreakdown(rows) {
      breakdownEl.innerHTML = '';
      stickyBreakdownEl.innerHTML = '';
      rows.forEach(function (r) {
        breakdownEl.appendChild(buildRow(r, 'estimate-row'));
        stickyBreakdownEl.appendChild(buildRow(r, 'price-sticky-row'));
      });
    }

    function compute() {
      var keys = getSelectedKeys();
      var timeline = TIMELINE[selectedValue('timeline')] || TIMELINE.standard;

      var total = 0;
      var rows = [];
      keys.forEach(function (key) {
        var type = PROJECT_TYPES[key];
        var state = perType[key];
        var complexity = COMPLEXITY[state.complexity];
        var subtotal = type.base + (state.units - 1) * type.perUnit;
        total += subtotal * complexity.mult;
        rows.push([type.label, state.units + '× ' + complexity.label]);
      });
      rows.push(['Timeline', timeline.label + ' (' + timeline.mult + '×)']);

      var adjusted = total * timeline.mult;
      var low = round10(adjusted * 0.9);
      var high = round10(adjusted * 1.15);

      renderBreakdown(rows);
      animatePrice(low, high);
    }

    function animatePrice(newLow, newHigh) {
      var fromLow = currentLow;
      var fromHigh = currentHigh;
      var start = null;
      var duration = 380;

      if (hasComputedOnce && (newLow !== fromLow || newHigh !== fromHigh)) {
        pulse(estimatePriceEl);
        pulse(stickyValueEl);
      }
      hasComputedOnce = true;

      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        lowEl.textContent = money(fromLow + (newLow - fromLow) * eased);
        highEl.textContent = money(fromHigh + (newHigh - fromHigh) * eased);
        if (stickyLowEl) stickyLowEl.textContent = money(fromLow + (newLow - fromLow) * eased);
        if (stickyHighEl) stickyHighEl.textContent = money(fromHigh + (newHigh - fromHigh) * eased);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          currentLow = newLow;
          currentHigh = newHigh;
        }
      }
      requestAnimationFrame(step);
    }

    // A type checkbox can't be unchecked down to zero — the estimate always
    // needs at least one project type to price against.
    typeCheckboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (getSelectedKeys().length === 0) {
          cb.checked = true;
          return;
        }
        renderScopeRows();
        compute();
      });
    });

    form.querySelectorAll('input[type="radio"]').forEach(function (el) {
      el.addEventListener('change', compute);
    });

    // Sticky estimate pill: hover/focus already expands it via CSS; a click
    // (tap, on touch) toggles it explicitly, and clicking elsewhere closes it.
    if (priceStickyEl) {
      priceStickyEl.addEventListener('click', function () {
        var expanded = !priceStickyEl.classList.contains('is-expanded');
        priceStickyEl.classList.toggle('is-expanded', expanded);
        priceStickyEl.setAttribute('aria-expanded', String(expanded));
      });
      document.addEventListener('click', function (e) {
        if (priceStickyEl.classList.contains('is-expanded') && !priceStickyEl.contains(e.target)) {
          priceStickyEl.classList.remove('is-expanded');
          priceStickyEl.setAttribute('aria-expanded', 'false');
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var keys = getSelectedKeys();
      var timeline = TIMELINE[selectedValue('timeline')] || TIMELINE.standard;
      var name = document.getElementById('field-name').value.trim();
      var email = document.getElementById('field-email').value.trim();
      var message = document.getElementById('field-message').value.trim();

      var typeLines = keys.map(function (key) {
        var type = PROJECT_TYPES[key];
        var state = perType[key];
        var unitLabel = state.units === 1 ? '1 deliverable' : state.units + ' deliverables';
        return '- ' + type.label + ': ' + unitLabel + ', ' + COMPLEXITY[state.complexity].label + ' complexity';
      });

      var subject = 'New project inquiry: ' + keys.map(function (key) { return PROJECT_TYPES[key].label; }).join(', ');
      var bodyLines = ['Name: ' + name, 'Email: ' + email, '', 'Project types:']
        .concat(typeLines)
        .concat([
          '',
          'Timeline: ' + timeline.label,
          'Estimated range: ' + lowEl.textContent + '–' + highEl.textContent,
          '',
          'Project details:',
          message || '(none provided)'
        ]);
      var mailto = 'mailto:studio@nanno.co'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(bodyLines.join('\n'));
      window.location.href = mailto;
    });

    renderScopeRows();
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
  window.NANNO.initCalculator = init;
})();
