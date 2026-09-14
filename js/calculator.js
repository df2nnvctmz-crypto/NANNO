// Start-a-project page: live price calculator + mailto submission.
// Pricing is an illustrative ballpark, not a real quoting engine.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var form = document.getElementById('start-form');
    if (!form) return;

    var PROJECT_TYPES = {
      illustration: { label: 'Scientific illustration', base: 450, perFigure: 180 },
      abstract: { label: 'Graphical abstract', base: 650, perFigure: 220 },
      mechanism: { label: 'Mechanism & pathway', base: 750, perFigure: 260 },
      publication: { label: 'Publication artwork', base: 550, perFigure: 200 },
      direction: { label: 'Visual science direction', base: 900, perFigure: 300 }
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
    var MIN_FIGURES = 1;
    var MAX_FIGURES = 12;

    var figuresValueEl = document.getElementById('figures-value');
    var figuresInputEl = document.getElementById('figures-input');
    var figuresDecBtn = document.getElementById('figures-dec');
    var figuresIncBtn = document.getElementById('figures-inc');
    var lowEl = document.getElementById('estimate-low');
    var highEl = document.getElementById('estimate-high');
    var breakdownEl = document.getElementById('estimate-breakdown');

    var figures = parseInt(figuresInputEl.value, 10) || 1;
    var currentLow = 0;
    var currentHigh = 0;

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
      var type = PROJECT_TYPES[selectedValue('project-type')] || PROJECT_TYPES.illustration;
      var complexity = COMPLEXITY[selectedValue('complexity')] || COMPLEXITY.standard;
      var timeline = TIMELINE[selectedValue('timeline')] || TIMELINE.standard;

      var subtotal = type.base + (figures - 1) * type.perFigure;
      var adjusted = subtotal * complexity.mult * timeline.mult;
      var low = round10(adjusted * 0.9);
      var high = round10(adjusted * 1.15);

      renderBreakdown(type, complexity, timeline);
      animatePrice(low, high);
    }

    function renderBreakdown(type, complexity, timeline) {
      var figureLabel = figures === 1 ? '1 figure' : figures + ' figures';
      var rows = [
        [type.label, figureLabel],
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

      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        lowEl.textContent = money(fromLow + (newLow - fromLow) * eased);
        highEl.textContent = money(fromHigh + (newHigh - fromHigh) * eased);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          currentLow = newLow;
          currentHigh = newHigh;
        }
      }
      requestAnimationFrame(step);
    }

    function setFigures(n) {
      figures = Math.max(MIN_FIGURES, Math.min(MAX_FIGURES, n));
      figuresValueEl.textContent = String(figures);
      figuresInputEl.value = String(figures);
      figuresDecBtn.disabled = figures <= MIN_FIGURES;
      figuresIncBtn.disabled = figures >= MAX_FIGURES;
      compute();
    }

    figuresDecBtn.addEventListener('click', function () { setFigures(figures - 1); });
    figuresIncBtn.addEventListener('click', function () { setFigures(figures + 1); });

    form.querySelectorAll('input[type="radio"]').forEach(function (el) {
      el.addEventListener('change', compute);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var type = PROJECT_TYPES[selectedValue('project-type')] || PROJECT_TYPES.illustration;
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
        'Figures: ' + figures,
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

    setFigures(figures);
  }
})();
