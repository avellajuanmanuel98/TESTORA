"""JS injected into the recorded page by apps.automation.tasks.record_session.

Re-run on every poll tick (idempotent via the window.__assuriaRecording
guard) because a full page navigation — the normal result of clicking a
link or submitting a form — wipes the page's JS state entirely, listeners
included. Polling re-attaches them within one tick of the new page loading,
so nothing before the very next click is ever missed.

Selectors are generated with a plain #id-first, then a short structural
CSS path — the same approach real recorders (Selenium IDE, Katalon) use.
They're a starting point, not guaranteed stable against a heavily
JS-rehydrated SPA; a human reviewing the recorded steps can always replace
one with something more resilient.
"""

INJECT_JS = r"""
if (!window.__assuriaRecording) {
  window.__assuriaRecording = true;
  window.__assuriaEvents = [];

  function assuriaSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var path = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      var part = node.tagName.toLowerCase();
      if (typeof node.className === 'string' && node.className.trim()) {
        var cls = node.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (cls.length) part += '.' + cls.map(function (c) { return CSS.escape(c); }).join('.');
      }
      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.prototype.filter.call(parent.children, function (c) {
          return c.tagName === node.tagName;
        });
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
      }
      path.unshift(part);
      node = parent;
    }
    return path.join(' > ');
  }

  function assuriaIsTextInput(el) {
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName !== 'INPUT') return false;
    var textTypes = ['text', 'email', 'password', 'number', 'tel', 'url', 'search',
      'date', 'datetime-local', 'month', 'week', 'time'];
    return textTypes.indexOf((el.type || 'text').toLowerCase()) !== -1;
  }

  document.addEventListener('click', function (e) {
    var el = e.target;
    // A click that focuses a text field or opens a <select> isn't the
    // meaningful action — the change event that follows is. Recording
    // both would produce a redundant "click" step ahead of every typed
    // value or picked option.
    if (assuriaIsTextInput(el) || el.tagName === 'SELECT') return;
    window.__assuriaEvents.push({
      type: 'click',
      selector: assuriaSelector(el),
      text: (el.innerText || el.value || '').trim().slice(0, 40),
    });
  }, true);

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.tagName === 'SELECT') {
      var opt = el.options[el.selectedIndex];
      window.__assuriaEvents.push({ type: 'select', selector: assuriaSelector(el), value: opt ? opt.text : '' });
    } else if (assuriaIsTextInput(el)) {
      window.__assuriaEvents.push({ type: 'input_text', selector: assuriaSelector(el), value: el.value });
    }
  }, true);
}
"""

DRAIN_JS = "return (window.__assuriaEvents || []).splice(0, (window.__assuriaEvents || []).length);"
