/* Keeps the last two words of headings, paragraphs and table cells together, so no line ends with one word alone. */
(function () {
  var SEL = 'h1, h2, h3, p, li, dd, td, figcaption, .lede';
  function fix(root) {
    root.querySelectorAll(SEL).forEach(function (el) {
      if (el.closest('svg')) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, last = null;
      while ((n = w.nextNode())) if (/\S/.test(n.nodeValue)) last = n;
      if (!last) return;
      var v = last.nodeValue.replace(/\s+$/, ''), i = v.lastIndexOf(' ');
      if (i > 0 && v.length - i <= 14) last.nodeValue = v.slice(0, i) + ' ' + v.slice(i + 1) + last.nodeValue.slice(v.length);
    });
  }
  fix(document);
  // the header, footer and careers list are written by scripts after load
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(function (a) { if (a.nodeType === 1) fix(a.parentNode || a); }); }); })
    .observe(document.body, { childList: true, subtree: true });
})();
