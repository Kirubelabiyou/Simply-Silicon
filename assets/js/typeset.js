/* Keeps the last two words of headings, paragraphs and table cells together, so no line ends with one word alone. */
(function () {
  var SEL = 'h1, h2, h3, p, li, dd, td, figcaption, .lede';
  function fix(root) {
    root.querySelectorAll(SEL).forEach(function (el) {
      if (el.closest('svg')) return;
      // the last space may sit in an earlier text node, e.g. before <span class="stop">.</span> or a link
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, nodes = [];
      while ((n = w.nextNode())) nodes.push(n);
      var tail = 0;
      for (var k = nodes.length - 1; k >= 0; k--) {
        var v = nodes[k].nodeValue, t = v.replace(/\s+$/, ''), i = t.lastIndexOf(' ');
        if (k === nodes.length - 1) v = t;
        if (i >= 0) {
          if (i > 0 || k > 0) { if (tail + t.length - i <= 16) nodes[k].nodeValue = t.slice(0, i) + '\u00a0' + t.slice(i + 1) + nodes[k].nodeValue.slice(t.length); }
          return;
        }
        tail += v.length; if (tail > 16) return;
      }
    });
  }
  fix(document);
  // the header, footer and careers list are written by scripts after load: watch only those
  var mo = new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.target.nodeType === 1) fix(m.target); }); });
  ['site-header', 'site-footer', 'jobList'].forEach(function (id) { var el = document.getElementById(id); if (el) mo.observe(el, { childList: true }); });
})();
