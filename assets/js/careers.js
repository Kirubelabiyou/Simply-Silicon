/* Careers: open positions with filters, plus a small editor-only panel to add, edit, close and delete roles.
   Where it lives:
   - In the claude.ai preview, positions are stored in the artifact's shared database (collection "positions").
     Everyone can read them; only the owner and editors can change them (rule declared at publish).
   - Anywhere else (e.g. GitHub Pages), positions are read from assets/data/positions.json. */
(function () {
  'use strict';
  var view = document.getElementById('careersMain'), home = document.getElementById('homeMain');
  if (!view || !home) return;

  /* ---------- route: index.html#careers ---------- */
  var baseTitle = document.title;
  function route() {
    var on = location.hash === '#careers';
    view.hidden = !on; home.hidden = on;
    document.title = on ? 'Careers · Simply Silicon' : baseTitle;
    document.body.setAttribute('data-page', on ? 'careers' : 'home');
    if (on) { window.scrollTo(0, 0); start(); }
  }
  window.addEventListener('hashchange', route);

  /* ---------- state ---------- */
  var TEAMS = ['Engineering', 'Operations', 'Infrastructure', 'Business', 'Finance'];
  var TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  var all = [], db = null, canManage = false, started = false, editing = null;
  var $ = function (id) { return document.getElementById(id); };
  var list = $('jobList'), empty = $('jobEmpty'), count = $('jobCount');
  var fq = $('fQuery'), ft = $('fTeam'), fl = $('fLocation'), fy = $('fType');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function opts(sel, values, label) {
    var keep = sel.value;
    sel.innerHTML = '<option value="">' + label + '</option>' + values.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
    if (values.indexOf(keep) >= 0) sel.value = keep;
  }
  function uniq(a) { return a.filter(function (v, i) { return v && a.indexOf(v) === i; }).sort(); }

  function render() {
    var open = all.filter(function (p) { return p.open !== false; });
    opts(ft, uniq(TEAMS.concat(open.map(function (p) { return p.team; }))), 'All teams');
    opts(fl, uniq(['Calgary, Alberta'].concat(open.map(function (p) { return p.location; }))), 'All locations');
    opts(fy, uniq(TYPES.concat(open.map(function (p) { return p.type; }))), 'All types');
    var q = fq.value.trim().toLowerCase();
    var shown = open.filter(function (p) {
      return (!ft.value || p.team === ft.value) && (!fl.value || p.location === fl.value) && (!fy.value || p.type === fy.value) &&
        (!q || [p.title, p.team, p.location, p.type, p.description].join(' ').toLowerCase().indexOf(q) >= 0);
    });
    count.textContent = open.length ? shown.length + ' of ' + open.length + ' open position' + (open.length === 1 ? '' : 's') : '';
    list.innerHTML = shown.map(function (p) {
      var apply = p.apply ? (/^[^@\s]+@[^@\s]+$/.test(p.apply) ? 'mailto:' + p.apply + '?subject=' + encodeURIComponent('Application: ' + p.title) : p.apply) : '';
      return '<li class="job"><details><summary><span class="job-title">' + esc(p.title) + '</span><span class="job-meta">' +
        [p.team, p.location, p.type].filter(Boolean).map(esc).join(' · ') + '</span><span class="job-open" aria-hidden="true">+</span></summary>' +
        '<div class="job-body">' + (p.description ? '<p>' + esc(p.description).replace(/\n+/g, '</p><p>') + '</p>' : '') +
        (apply ? '<a class="btn btn--primary btn--sm" href="' + esc(apply) + '" target="_blank" rel="noopener">Apply <span class="arrow" aria-hidden="true">→</span></a>'
               : '<button class="btn btn--primary btn--sm" type="button" data-contact>Apply <span class="arrow" aria-hidden="true">→</span></button>') +
        '</div></details></li>';
    }).join('');
    empty.hidden = shown.length > 0;
    $('emptyNone').hidden = open.length > 0;
    $('emptyFilter').hidden = open.length === 0;
    if (canManage) renderAdmin();
  }
  [fq, ft, fl, fy].forEach(function (el) { el.addEventListener(el === fq ? 'input' : 'change', render); });
  $('fClear').addEventListener('click', function () { fq.value = ft.value = fl.value = fy.value = ''; render(); });

  /* ---------- load ---------- */
  function sortAll() { all.sort(function (a, b) { return String(b.created || '').localeCompare(String(a.created || '')); }); }
  function fromFile() {
    fetch('assets/data/positions.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { if (!db) { all = Array.isArray(rows) ? rows : []; sortAll(); render(); } }).catch(function () { render(); });
  }
  function start() {
    if (started) return; started = true;
    render(); fromFile();
    waitForClaude(function () { window.claude.use('db').then(function (d) {
      if (!d) return;
      db = d;
      db.collection('positions').onSnapshot(function (snap) {
        all = snap.docs.map(function (doc) { var v = doc.data() || {}; v.id = doc.id; return v; }); sortAll(); render();
      }, function () { db = null; fromFile(); });
      return window.claude.use('user').then(function (u) { return u ? u.canEdit() : false; }).then(function (ok) {
        canManage = !!ok; $('jobAdmin').hidden = !canManage; if (canManage) renderAdmin();
      });
    }).catch(function () {}); });
  }
  // the preview's runtime may attach a moment after the page script runs
  function waitForClaude(go) { var n = 0; (function check() { if (window.claude && window.claude.use) return go(); if (++n < 40) setTimeout(check, 150); })(); }

  /* ---------- editor panel ---------- */
  var form = $('jobForm'), msg = $('jobMsg');
  function renderAdmin() {
    var rows = all.map(function (p) {
      return '<li><div><b>' + esc(p.title) + '</b><span>' + [p.team, p.location, p.type].filter(Boolean).map(esc).join(' · ') + (p.open === false ? ' · <em>Closed</em>' : '') + '</span></div>' +
        '<div class="ja-actions"><button type="button" class="btn btn--sm" data-edit="' + esc(p.id) + '">Edit</button>' +
        '<button type="button" class="btn btn--sm" data-toggle="' + esc(p.id) + '">' + (p.open === false ? 'Reopen' : 'Close') + '</button>' +
        '<button type="button" class="btn btn--sm" data-del="' + esc(p.id) + '">Delete</button></div></li>';
    }).join('');
    $('adminList').innerHTML = rows || '<li class="ja-empty">No positions yet. Add the first one above.</li>';
  }
  function fill(p) {
    editing = p ? p.id : null;
    form.title.value = p ? p.title || '' : ''; form.team.value = p ? p.team || '' : ''; form.location.value = p ? p.location || '' : 'Calgary, Alberta';
    form.type.value = p ? p.type || 'Full-time' : 'Full-time'; form.description.value = p ? p.description || '' : ''; form.apply.value = p ? p.apply || '' : '';
    form.open.checked = p ? p.open !== false : true;
    $('jobSave').textContent = p ? 'Save changes' : 'Add position'; $('jobCancel').hidden = !p;
  }
  function say(t, bad) { msg.textContent = t; msg.classList.toggle('bad', !!bad); }
  form.addEventListener('submit', function (e) {
    e.preventDefault(); if (!db) return;
    var title = form.title.value.trim(); if (!title) { say('Add a title first.', true); return; }
    var data = { title: title, team: form.team.value.trim(), location: form.location.value.trim(), type: form.type.value,
      description: form.description.value.trim(), apply: form.apply.value.trim(), open: form.open.checked };
    var ref = editing ? db.collection('positions').doc(editing) : db.collection('positions').doc();
    var prev = editing ? all.filter(function (p) { return p.id === editing; })[0] : null;
    data.created = prev && prev.created ? prev.created : new Date().toISOString();
    $('jobSave').disabled = true;
    ref.set(data).then(function () { say(editing ? 'Saved.' : 'Position added.'); fill(null); })
      .catch(function (err) { say('Could not save: ' + (err && err.message ? err.message : 'try again'), true); })
      .then(function () { $('jobSave').disabled = false; });
  });
  $('jobCancel').addEventListener('click', function () { fill(null); say(''); });
  $('adminList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || !db) return;
    var id = b.getAttribute('data-edit') || b.getAttribute('data-toggle') || b.getAttribute('data-del');
    var p = all.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    if (b.hasAttribute('data-edit')) { fill(p); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (b.hasAttribute('data-toggle')) { db.collection('positions').doc(id).update({ open: p.open === false }).catch(function () { say('Could not update.', true); }); return; }
    if (b.hasAttribute('data-del') && window.confirm('Delete "' + p.title + '"? This cannot be undone.')) db.collection('positions').doc(id).delete().catch(function () { say('Could not delete.', true); });
  });
  fill(null);

  route();
})();
