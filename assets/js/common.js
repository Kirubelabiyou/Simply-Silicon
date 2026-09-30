/* Shared header, phone menu and footer for every page */
(function () {
  'use strict';
  var PAGES = [
    { href: './', key: 'home', name: 'Home', note: 'What we do' },
    { href: 'foundation.html', key: 'foundation', name: 'Foundation', note: 'Calgary site' },
    { href: 'network.html', key: 'network', name: 'Network', note: 'Global map' },
    { href: 'workloads.html', key: 'workloads', name: 'Workloads', note: 'Who it serves' },
    { href: 'platform.html', key: 'platform', name: 'Platform', note: 'The vision' }
  ];
  var LINKEDIN = 'https://www.linkedin.com/company/simply-silicon/';
  var current = document.body.getAttribute('data-page') || 'home';
  var MARK = '<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26" rx="7" fill="#4fb3f0"/><rect x="7" y="7.5" width="14" height="3" rx="1.5" fill="#fff"/><rect x="7" y="12.5" width="14" height="3" rx="1.5" fill="#fff"/><rect x="7" y="17.5" width="8" height="3" rx="1.5" fill="#0b1b2e"/></svg>';
  var LI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.44 0h4.37v1.92h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v7.45h-4.56v-6.6c0-1.58-.03-3.6-2.2-3.6-2.2 0-2.53 1.72-2.53 3.49V22H7.66V8z"/></svg>';

  function cur(p) { return p.key === current ? ' aria-current="page"' : ''; }

  // Header
  var hdr = document.getElementById('site-header');
  if (hdr) {
    hdr.className = 'hdr';
    hdr.innerHTML =
      '<div class="wrap">' +
      '<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-drawer"><span></span></button>' +
      '<a class="brand" href="./" aria-label="Simply Silicon home">' + MARK + '<span>Simply <b>Silicon</b></span></a>' +
      '<nav class="menu" aria-label="Main">' + PAGES.map(function (p) { return '<a href="' + p.href + '"' + cur(p) + '>' + p.name + '</a>'; }).join('') + '</nav>' +
      '<a class="btn btn--primary btn--sm hdr-cta" href="' + LINKEDIN + '" target="_blank" rel="noopener">Connect</a>' +
      '</div>';
  }

  // Phone drawer
  var drawer = document.createElement('div');
  drawer.className = 'drawer'; drawer.id = 'site-drawer'; drawer.hidden = true;
  drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Menu');
  drawer.innerHTML =
    '<div class="drawer-scrim"></div>' +
    '<div class="drawer-panel">' +
    '<div class="drawer-top"><a class="brand" href="./">' + MARK + '<span>Simply <b>Silicon</b></span></a><button class="drawer-close" type="button" aria-label="Close menu">×</button></div>' +
    '<nav aria-label="Main">' + PAGES.map(function (p) { return '<a href="' + p.href + '"' + cur(p) + '>' + p.name + '<small>' + p.note + '</small></a>'; }).join('') + '</nav>' +
    '<div class="drawer-foot"><a class="btn btn--primary" href="' + LINKEDIN + '" target="_blank" rel="noopener">Connect on LinkedIn</a><span>435 9 Ave SE · Calgary, Alberta</span></div>' +
    '</div>';
  document.body.appendChild(drawer);
  var burger = hdr && hdr.querySelector('.burger');
  function openMenu() { drawer.hidden = false; burger.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; drawer.querySelector('.drawer-close').focus(); }
  function closeMenu() { drawer.hidden = true; burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; burger.focus({ preventScroll: true }); }
  if (burger) burger.addEventListener('click', openMenu);
  drawer.querySelector('.drawer-close').addEventListener('click', closeMenu);
  drawer.querySelector('.drawer-scrim').addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) closeMenu(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 900 && !drawer.hidden) closeMenu(); });

  // Footer
  var ftr = document.getElementById('site-footer');
  if (ftr) {
    ftr.className = 'ftr';
    ftr.innerHTML =
      '<div class="wrap">' +
      '<div class="ftr-top">' +
      '<div class="ftr-about"><a class="brand" href="./">' + MARK + '<span>Simply <b>Silicon</b></span></a>' +
      '<p>Air-gapped AI infrastructure in major cities. Secure, localized compute at scale.</p>' +
      '<div class="social"><a href="' + LINKEDIN + '" target="_blank" rel="noopener" aria-label="Simply Silicon on LinkedIn">' + LI + '</a></div></div>' +
      '<div><h4>Company</h4><ul><li><a href="./">Home</a></li><li><a href="platform.html">Platform</a></li><li><a href="workloads.html">Workloads</a></li></ul></div>' +
      '<div><h4>Infrastructure</h4><ul><li><a href="foundation.html">Foundation</a></li><li><a href="network.html">Network</a></li><li><a href="network.html#calgary">Calgary fiber</a></li></ul></div>' +
      '<div><h4>Contact</h4><address>Foundation<br>435 9 Ave SE<br>Calgary, Alberta<br>Canada</address><ul style="margin-top:12px"><li><a href="' + LINKEDIN + '" target="_blank" rel="noopener">LinkedIn</a></li></ul></div>' +
      '</div>' +
      '<div class="ftr-bottom"><span>© ' + new Date().getFullYear() + ' Simply Silicon. All rights reserved.</span><a href="#top">Back to top ↑</a></div>' +
      '</div>';
  }
})();
