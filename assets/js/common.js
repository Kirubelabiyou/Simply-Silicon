/* Shared header, phone menu, contact form and footer for every page */
(function () {
  'use strict';
  // Set this to Simply Silicon's contact address. Until it is set, the form offers to copy the message instead.
  var CONTACT_EMAIL = '';
  var LINKEDIN = 'https://www.linkedin.com/company/simply-silicon/';
  var PAGES = [
    { href: './', key: 'home', name: 'Home' },
    { href: 'foundation.html', key: 'foundation', name: 'Foundation' },
    { href: 'workloads.html', key: 'workloads', name: 'Workloads' },
    { href: 'platform.html', key: 'platform', name: 'Platform' }
  ];
  var current = document.body.getAttribute('data-page') || 'home';

  /* ---------- open every page at the top when arriving from a link ---------- */
  // Some browsers and previews carry the old scroll position over to the next page. Back and forward keep theirs.
  (function () {
    var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (location.hash || (nav && nav.type === 'back_forward')) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var top = function () { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); };
    top();
    document.addEventListener('DOMContentLoaded', top);
    window.addEventListener('load', function () { if (window.scrollY > 0 && !userScrolled) top(); setTimeout(function () { if ('scrollRestoration' in history) history.scrollRestoration = 'auto'; }, 0); });
    var userScrolled = false;
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { userScrolled = true; }, { once: true, passive: true }); });
  })();
  var LOGO = 'simply silicon.';
  var LI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.22 8h4.56v14H.22V8zm7.44 0h4.37v1.92h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 7v7.45h-4.56v-6.6c0-1.58-.03-3.6-2.2-3.6-2.2 0-2.53 1.72-2.53 3.49V22H7.66V8z"/></svg>';
  function cur(p) { return p.key === current ? ' aria-current="page"' : ''; }
  function links() { return PAGES.map(function (p) { return '<a href="' + p.href + '"' + cur(p) + '>' + p.name + '</a>'; }).join(''); }

  /* ---------- header ---------- */
  var hdr = document.getElementById('site-header');
  if (hdr) {
    hdr.className = 'hdr';
    hdr.innerHTML =
      '<div class="wrap">' +
      '<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-drawer"><span></span></button>' +
      '<a class="logo" href="./" aria-label="Simply Silicon home">' + LOGO + '</a>' +
      '<nav class="menu" aria-label="Main">' + links() + '</nav>' +
      '<button class="btn btn--primary btn--sm hdr-cta" type="button" data-contact>Connect</button>' +
      '</div>';
  }

  /* ---------- phone drawer ---------- */
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
  window.addEventListener('resize', function () { if (window.innerWidth > 900 && !drawer.hidden) closeMenu(); });

  /* ---------- contact form ---------- */
  var modal = document.createElement('div');
  modal.className = 'modal'; modal.hidden = true;
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'cf-title');
  modal.innerHTML =
    '<div class="modal-scrim"></div>' +
    '<div class="modal-panel">' +
    '<button class="modal-x" type="button" aria-label="Close">×</button>' +
    '<h2 id="cf-title">Contact Simply Silicon</h2>' +
    '<p class="modal-sub">Tell us about your workload, site or partnership. We reply by email.</p>' +
    '<form id="cf" novalidate>' +
    '<div class="f-row"><label for="cf-name">Full name</label><input id="cf-name" name="name" autocomplete="name" required></div>' +
    '<div class="f-row"><label for="cf-email">Work email</label><input id="cf-email" name="email" type="email" autocomplete="email" required></div>' +
    '<div class="f-row"><label for="cf-org">Company</label><input id="cf-org" name="org" autocomplete="organization"></div>' +
    '<div class="f-row"><label for="cf-topic">Topic</label><select id="cf-topic" name="topic">' +
    '<option>Compute capacity</option><option>Site partnership</option><option>Investment</option><option>Media</option><option>Other</option></select></div>' +
    '<div class="f-row f-full"><label for="cf-subject">Subject</label><input id="cf-subject" name="subject" required></div>' +
    '<div class="f-row f-full"><label for="cf-msg">Message</label><textarea id="cf-msg" name="message" rows="5" required></textarea></div>' +
    '<p class="f-err" id="cf-err" hidden></p>' +
    '<div class="f-actions"><button class="btn btn--primary" type="submit">Prepare email</button></div>' +
    '</form>' +
    '<div class="cf-done" id="cf-done" hidden></div>' +
    '</div>';
  document.body.appendChild(modal);
  var form = modal.querySelector('#cf'), done = modal.querySelector('#cf-done'), err = modal.querySelector('#cf-err'), lastFocus = null;
  function openForm() { lastFocus = document.activeElement; if (!drawer.hidden) closeMenu(); modal.hidden = false; document.body.style.overflow = 'hidden'; form.hidden = false; done.hidden = true; modal.querySelector('#cf-name').focus(); }
  function closeForm() { modal.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  modal.querySelector('.modal-x').addEventListener('click', closeForm);
  modal.querySelector('.modal-scrim').addEventListener('click', closeForm);
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-contact]'); if (t) { e.preventDefault(); openForm(); } });
  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (!modal.hidden) closeForm(); else if (!drawer.hidden) closeMenu(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements, missing = [];
    if (!f.name.value.trim()) missing.push('your name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) missing.push('a valid email');
    if (!f.subject.value.trim()) missing.push('a subject');
    if (!f.message.value.trim()) missing.push('a message');
    if (missing.length) { err.textContent = 'Please add ' + missing.join(', ') + '.'; err.hidden = false; return; }
    err.hidden = true;
    var subject = '[' + f.topic.value + '] ' + f.subject.value.trim();
    var body = f.message.value.trim() + '\n\n' + f.name.value.trim() + (f.org.value.trim() ? '\n' + f.org.value.trim() : '') + '\n' + f.email.value.trim();
    var full = 'Subject: ' + subject + '\n\n' + body;
    done.innerHTML =
      '<h3>Your email is ready</h3>' +
      (CONTACT_EMAIL
        ? '<p>Open it in your email app to send it to <span class="sel">' + CONTACT_EMAIL + '</span>. If nothing opens, copy it below.</p><div class="f-actions"><a class="btn btn--primary" href="mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) + '">Open in email app</a><button class="btn" type="button" data-copy>Copy message</button></div>'
        : '<p>Copy your message and send it to Simply Silicon on LinkedIn.</p><div class="f-actions"><button class="btn btn--primary" type="button" data-copy>Copy message</button><a class="btn" href="' + LINKEDIN + '" target="_blank" rel="noopener">Open LinkedIn</a></div>') +
      '<pre class="cf-preview" tabindex="0"></pre><button class="btn btn--sm" type="button" data-back>Edit message</button>';
    done.querySelector('.cf-preview').textContent = full;
    done.querySelector('[data-copy]').addEventListener('click', function () {
      var b = this, pre = done.querySelector('.cf-preview');
      function ok() { b.textContent = 'Copied'; }
      function sel() { var r = document.createRange(); r.selectNodeContents(pre); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Selected, press copy'; }
      try { navigator.clipboard.writeText(full).then(ok, sel); } catch (x) { sel(); }
    });
    done.querySelector('[data-back]').addEventListener('click', function () { done.hidden = true; form.hidden = false; });
    form.hidden = true; done.hidden = false;
  });

  /* ---------- footer ---------- */
  var ftr = document.getElementById('site-footer');
  if (ftr) {
    ftr.className = 'ftr';
    ftr.innerHTML =
      '<div class="wrap">' +
      '<div class="ftr-top">' +
      '<div class="ftr-brand"><a class="logo" href="./">' + LOGO + '</a><p>Air-gapped AI infrastructure in major cities. Secure, localized compute at scale.</p>' +
      '<div class="social"><a href="' + LINKEDIN + '" target="_blank" rel="noopener" aria-label="Simply Silicon on LinkedIn">' + LI + '</a></div></div>' +
      '<div class="ftr-cols">' +
      '<div><h4>Company</h4><ul><li><a href="./">Home</a></li><li><a href="./#how">How it works</a></li><li><a href="platform.html">Our vision</a></li></ul></div>' +
      '<div><h4>Product</h4><ul><li><a href="foundation.html">Foundation</a></li><li><a href="workloads.html">Workloads</a></li><li><a href="platform.html">Platform</a></li></ul></div>' +
      '<div><h4>Contact</h4><ul><li><button class="ftr-link" type="button" data-contact>Get in touch</button></li><li><address>435 9 Ave SE<br>Calgary, Alberta, Canada</address></li></ul></div>' +
      '</div>' +
      '</div>' +
      '<div class="ftr-bottom"><span>© ' + new Date().getFullYear() + ' Simply Silicon. All rights reserved.</span><a href="#top">Back to top ↑</a></div>' +
      '</div>';
  }
})();

/* Scroll reveals: anything marked data-rv drifts up and fades in once, slowly. data-rv="2" delays it a little. */
(function () {
  'use strict';
  var els = [].slice.call(document.querySelectorAll('[data-rv]'));
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { document.documentElement.classList.add('no-motion'); return; }
  els.forEach(function (el) { var d = el.getAttribute('data-rv'); if (d) el.style.setProperty('--d', d); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach(function (el) { io.observe(el); });
})();
