/* Shared header, phone menu and footer for every page */
(function () {
  'use strict';
  var PAGES = [
    { href: './', key: 'home', name: 'Home' },
    { href: 'foundation.html', key: 'foundation', name: 'Foundation' },
    { href: 'workloads.html', key: 'workloads', name: 'Workloads' },
    { href: 'platform.html', key: 'platform', name: 'Platform' }
  ];
  var LINKEDIN = 'https://www.linkedin.com/company/simply-silicon/';
  var current = document.body.getAttribute('data-page') || 'home';
  var LOGO = 'simply silicon.';
  var LI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.44 0h4.37v1.92h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v7.45h-4.56v-6.6c0-1.58-.03-3.6-2.2-3.6-2.2 0-2.53 1.72-2.53 3.49V22H7.66V8z"/></svg>';
  function cur(p) { return p.key === current ? ' aria-current="page"' : ''; }
  function links() { return PAGES.map(function (p) { return '<a href="' + p.href + '"' + cur(p) + '>' + p.name + '</a>'; }).join(''); }

  var hdr = document.getElementById('site-header');
  if (hdr) {
    hdr.className = 'hdr';
    hdr.innerHTML =
      '<div class="wrap">' +
      '<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-drawer"><span></span></button>' +
      '<a class="logo" href="./" aria-label="Simply Silicon home">' + LOGO + '</a>' +
      '<nav class="menu" aria-label="Main">' + links() + '</nav>' +
      '<a class="btn btn--primary btn--sm hdr-cta" href="' + LINKEDIN + '" target="_blank" rel="noopener">Connect</a>' +
      '</div>';
  }

  var drawer = document.createElement('div');
  drawer.className = 'drawer'; drawer.id = 'site-drawer'; drawer.hidden = true;
  drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Menu');
  drawer.innerHTML =
    '<div class="drawer-scrim"></div>' +
    '<div class="drawer-panel">' +
    '<div class="drawer-top"><a class="logo" href="./">' + LOGO + '</a><button class="drawer-close" type="button" aria-label="Close menu">×</button></div>' +
    '<nav aria-label="Main">' + links() + '</nav>' +
    '<div class="drawer-foot"><span class="logo">' + LOGO + '</span><span>435 9 Ave SE<br>Calgary, Alberta, Canada</span></div>' +
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

  var ftr = document.getElementById('site-footer');
  if (ftr) {
    ftr.className = 'ftr';
    ftr.innerHTML =
      '<div class="wrap">' +
      '<div class="ftr-top">' +
      '<div class="ftr-brand"><a class="logo" href="./">' + LOGO + '</a><p>Secure, localized compute at scale.</p>' +
      '<div class="social"><a href="' + LINKEDIN + '" target="_blank" rel="noopener" aria-label="Simply Silicon on LinkedIn">' + LI + '</a></div></div>' +
      '<ul class="ftr-nav">' + PAGES.map(function (p) { return '<li><a href="' + p.href + '">' + p.name + '</a></li>'; }).join('') + '</ul>' +
      '</div>' +
      '<div class="ftr-bottom"><span>© ' + new Date().getFullYear() + ' Simply Silicon. All rights reserved.</span><a href="#top">Back to top ↑</a></div>' +
      '</div>';
  }
})();
