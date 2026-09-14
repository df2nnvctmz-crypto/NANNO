// Start-a-project page: live price calculator + mailto submission.
// Pricing is an illustrative ballpark, not a real quoting engine.
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
      abstract: { label: 'Graphical abstract', base: 650, perUnit: 220 },
      poster: { label: 'Poster & conference design', base: 380, perUnit: 150 },
      dataviz: { label: 'Data visualization', base: 500, perUnit: 180 },
      landing: { label: 'Landing page', base: 1800, perUnit: 600 },
      website: { label: 'Product website', base: 3200, perUnit: 900 },
      illustration: { label: 'Scientific illustration', base: 450, perUnit: 180 }
    };
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

    var unitsValueEl = document.getElementById('figures-value');
    var unitsInputEl = document.getElementById('figures-input');
    var unitsDecBtn = document.getElementById('figures-dec');
    var unitsIncBtn = document.getElementById('figures-inc');
    var lowEl = document.getElementById('estimate-low');
    var highEl = document.getElementById('estimate-high');
    var breakdownEl = document.getElementById('estimate-breakdown');
    var stickyLowEl = document.getElementById('sticky-estimate-low');
    var stickyHighEl = document.getElementById('sticky-estimate-high');

    var units = parseInt(unitsInputEl.value, 10) || 1;
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

    function money(n) {
      return '$' + Math.round(n).toLocaleString('en-US');
    }

    function round10(n) {
      return Math.round(n / 10) * 10;
    }

    function compute() {
      var type = PROJECT_TYPES[selectedValue('project-type')] || PROJECT_TYPES.abstract;
      var complexity = COMPLEXITY[selectedValue('complexity')] || COMPLEXITY.standard;
      var timeline = TIMELINE[selectedValue('timeline')] || TIMELINE.standard;

      var subtotal = type.base + (units - 1) * type.perUnit;
      var adjusted = subtotal * complexity.mult * timeline.mult;
      var low = round10(adjusted * 0.9);
      var high = round10(adjusted * 1.15);

      renderBreakdown(type, complexity, timeline);
      animatePrice(low, high);
    }

    function renderBreakdown(type, complexity, timeline) {
      var unitLabel = units === 1 ? '1 deliverable' : units + ' deliverables';
      var rows = [
        [type.label, unitLabel],
        ['Complexity', complexity.label + ' (' + complexity.mult + '×)'],
        ['Timeline', timeline.label + ' (' + timeline.mult + '×)']
      ];
      breakdownEl.innerHTML = '';
      rows.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'estimate-row';
        var a = document.createElement('span');
        a.textContent = r[0];
        var b = document.createElement('span');
        b.textContent = r[1];
        row.appendChild(a);
        row.appendChild(b);
        breakdownEl.appendChild(row);
      });
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

    function setUnits(n) {
      var next = Math.max(MIN_UNITS, Math.min(MAX_UNITS, n));
      if (next !== units) pulse(unitsValueEl);
      units = next;
      unitsValueEl.textContent = String(units);
      unitsInputEl.value = String(units);
      unitsDecBtn.disabled = units <= MIN_UNITS;
      unitsIncBtn.disabled = units >= MAX_UNITS;
      compute();
    }

    unitsDecBtn.addEventListener('click', function () { setUnits(units - 1); });
    unitsIncBtn.addEventListener('click', function () { setUnits(units + 1); });

    form.querySelectorAll('input[type="radio"]').forEach(function (el) {
      el.addEventListener('change', compute);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var type = PROJECT_TYPES[selectedValue('project-type')] || PROJECT_TYPES.abstract;
      var complexity = COMPLEXITY[selectedValue('complexity')] || COMPLEXITY.standard;
      var timeline = TIMELINE[selectedValue('timeline')] || TIMELINE.standard;
      var name = document.getElementById('field-name').value.trim();
      var email = document.getElementById('field-email').value.trim();
      var message = document.getElementById('field-message').value.trim();

      var subject = 'New project inquiry: ' + type.label;
      var bodyLines = [
        'Name: ' + name,
        'Email: ' + email,
        'Project type: ' + type.label,
        'Deliverables: ' + units,
        'Complexity: ' + complexity.label,
        'Timeline: ' + timeline.label,
        'Estimated range: ' + lowEl.textContent + '–' + highEl.textContent,
        '',
        'Project details:',
        message || '(none provided)'
      ];
      var mailto = 'mailto:studio@nanno.co'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(bodyLines.join('\n'));
      window.location.href = mailto;
    });

    setUnits(units);
  }

  document.addEventListener('DOMContentLoaded', init);
  window.NANNO.initCalculator = init;
})();
