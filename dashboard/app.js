/* Token Radar dashboard: renders window.RADAR, no network, no framework. */
(function () {
  var R = window.RADAR;
  if (!R) { document.body.textContent = 'No radar data.'; return; }
  var rows = R.rows, live = R.live;
  var watchSet = {};
  rows.forEach(function (r) { if (r.watchlist) watchSet[r.slug] = true; });

  function $(id) { return document.getElementById(id); }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n === null || n === undefined) return '<span class="na">—</span>';
    var c = n >= 0 ? 'up' : 'down';
    return '<span class="' + c + '">' + (n >= 0 ? '+' : '') + n.toFixed(1) + '%</span>';
  }
  function age(n) {
    if (n === null || n === undefined) return '<span class="na">—</span>';
    return n < 365 ? n + 'd' : (n / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Header */
  $('asof').textContent = R.as_of;
  $('source').textContent = R.source;
  $('overallMult').textContent = R.overall_multiple.toFixed(3) + '×';
  var top = rows[0];
  $('stats').innerHTML =
    '<div><dt>Protocols scanned</dt><dd>' + rows.length + ' <small>ranked</small></dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + R.watchlist_size + ' <small>covered</small></dd></div>' +
    '<div><dt>Early finds</dt><dd>' + R.early_size + ' <small>below the $50M floor</small></dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(top.implied_value_usd) + ' <small>' + esc(top.name) + '</small></dd></div>' +
    '<div><dt>Live tokens set aside</dt><dd>' + R.live_size + ' <small>already trading</small></dd></div>';

  /* Calibration table */
  $('calib').innerHTML = '<tr><th>Category</th><th>Multiple</th><th>Comparables</th></tr>' +
    R.calibration.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td>' + c.multiple.toFixed(3) + '×</td><td>' + c.comps + ' live protocols</td></tr>';
    }).join('') +
    '<tr><td>Overall fallback (fewer than 3 comparables)</td><td>' + R.overall_multiple.toFixed(3) + '×</td><td>whole snapshot</td></tr>';

  /* Filters */
  var cats = {}, chains = {};
  rows.forEach(function (r) {
    if (r.category) cats[r.category] = 1;
    r.chains.forEach(function (c) { chains[c] = 1; });
  });
  Object.keys(cats).sort().forEach(function (c) {
    $('cat').appendChild(new Option(c, c));
  });
  Object.keys(chains).sort().forEach(function (c) {
    $('chain').appendChild(new Option(c, c));
  });

  var state = { q: '', cat: '', chain: '', sort: 'implied', watchOnly: false, view: 'board', detail: null };

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.watchOnly && !watchSet[r.slug]) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var k = state.sort;
    list.sort(function (a, b) {
      if (k === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (k === 'growth') return (b.change_7d || 0) - (a.change_7d || 0);
      if (k === 'age') return (b.age_days || 0) - (a.age_days || 0);
      if (k === 'name') return a.name < b.name ? -1 : 1;
      return b.implied_value_usd - a.implied_value_usd;
    });
    return list;
  }

  function renderBoard() {
    var list = filtered();
    var max = rows[0].implied_value_usd;
    $('rows').innerHTML = list.map(function (r) {
      var w = Math.max(4, Math.round(r.implied_value_usd / max * 100));
      return '<tr data-slug="' + esc(r.slug) + '" class="' + (state.detail === r.slug ? 'sel' : '') + '">' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><div class="pname">' + esc(r.name) + (watchSet[r.slug] ? '<span class="tag">WATCHLIST</span>' : '') + '</div>' +
        '<div class="sub">' + esc(r.slug) + '</div></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num"><span class="implied">' + money(r.implied_value_usd) +
        '<span class="bar"><i style="width:' + w + '%"></i></span></span></td></tr>';
    }).join('');
    $('count').textContent = list.length + ' of ' + rows.length + ' ranked protocols' +
      (state.watchOnly ? ' · watchlist only' : '') + (state.cat ? ' · ' + state.cat : '') +
      (state.chain ? ' · ' + state.chain : '') + (state.q ? ' · matching “' + state.q + '”' : '');
  }

  function renderLive() {
    $('liveRows').innerHTML = live.map(function (r) {
      return '<tr><td><div class="pname">' + esc(r.name) + '</div><div class="sub">' + esc(r.slug) + '</div></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + (r.mcap_usd ? money(r.mcap_usd) : '<span class="na">—</span>') + '</td>' +
        '<td class="num">' + (r.multiple !== null ? r.multiple.toFixed(2) + '×' : '<span class="na">—</span>') + '</td></tr>';
    }).join('');
  }

  function renderDetail() {
    var d = $('detail');
    if (!state.detail) { d.classList.add('hidden'); d.innerHTML = ''; return; }
    var r = null;
    rows.forEach(function (x) { if (x.slug === state.detail) r = x; });
    if (!r) { d.classList.add('hidden'); return; }
    var base = r.tvl_usd * r.category_multiple * r.distribution_multiplier;
    var compNote = r.category_comps > 0
      ? 'median of the ' + r.category_comps + ' live protocols in that category'
      : 'the whole-snapshot median (fewer than 3 live comparables in this category)';
    d.innerHTML = '<button class="dclose" id="dclose">Close ✕</button>' +
      '<h3>#' + r.rank + ' · ' + esc(r.name) + '</h3>' +
      '<p class="dsub">' + esc(r.category || 'No category') + ' · ' + esc(r.chains.join(', ')) +
      ' · TVL ' + money(r.tvl_usd) + ' · 7d ' + (r.change_7d === null ? '—' : (r.change_7d >= 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') +
      ' · tracked ' + (r.age_days === null ? '—' : r.age_days + ' days') +
      (watchSet[r.slug] ? ' · on the snapshot watchlist' : ' · early find below the $50M floor') + '</p>' +
      '<div class="math">' +
      '<div class="cell"><span>TVL × multiple × reach</span><b>' + money(base) + '</b></div>' +
      '<div class="cell"><span>Category multiple</span><b>' + r.category_multiple.toFixed(3) + '×</b></div>' +
      '<div class="cell"><span>Growth</span><b>×' + r.growth_multiplier.toFixed(3) + '</b></div>' +
      '<div class="cell"><span>Maturity</span><b>×' + r.maturity_multiplier.toFixed(3) + '</b></div>' +
      '<div class="cell eq"><span>Implied value</span><b>' + money(r.implied_value_usd) + '</b></div>' +
      '</div>' +
      '<p class="dsub">Base is TVL × the ' + esc(r.category || 'overall') + ' multiple of ' + r.category_multiple.toFixed(3) +
      '× (' + compNote + '; the whole-snapshot median is ' + R.overall_multiple.toFixed(3) +
      '×), times distribution ×' + r.distribution_multiplier.toFixed(2) + ' for ' + r.chains.length + ' chain' +
      (r.chains.length === 1 ? '' : 's') + '. Base × growth × maturity = implied value. The implied value is this entry&rsquo;s model output, not a price target.</p>' +
      '<div class="farm"><h4>Farm plan — six steps</h4><ol>' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol></div>';
    d.classList.remove('hidden');
    $('dclose').onclick = function () { state.detail = null; renderBoard(); renderDetail(); };
  }

  function setView(v) {
    state.view = v;
    $('tabBoard').classList.toggle('active', v === 'board');
    $('tabLive').classList.toggle('active', v === 'live');
    $('tabBoard').setAttribute('aria-selected', v === 'board');
    $('tabLive').setAttribute('aria-selected', v === 'live');
    $('boardView').classList.toggle('hidden', v !== 'board');
    $('filters').classList.toggle('hidden', v !== 'board');
    $('liveView').classList.toggle('hidden', v !== 'live');
    if (v === 'live') renderLive();
  }

  $('tabBoard').onclick = function () { setView('board'); };
  $('tabLive').onclick = function () { setView('live'); };
  $('q').addEventListener('input', function () { state.q = this.value; renderBoard(); });
  $('cat').addEventListener('change', function () { state.cat = this.value; renderBoard(); });
  $('chain').addEventListener('change', function () { state.chain = this.value; renderBoard(); });
  $('sort').addEventListener('change', function () { state.sort = this.value; renderBoard(); });
  $('watchOnly').addEventListener('change', function () { state.watchOnly = this.checked; renderBoard(); });
  $('board').addEventListener('click', function (e) {
    var th = e.target.closest('th');
    if (th) {
      var k = th.getAttribute('data-k');
      if (k === 'tvl') state.sort = 'tvl';
      else if (k === 'growth') state.sort = 'growth';
      else if (k === 'age') state.sort = 'age';
      else if (k === 'name') state.sort = 'name';
      else if (k === 'implied') state.sort = 'implied';
      else return;
      $('sort').value = state.sort;
      renderBoard();
      return;
    }
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    state.detail = state.detail === tr.getAttribute('data-slug') ? null : tr.getAttribute('data-slug');
    renderBoard();
    renderDetail();
    if (state.detail) $('detail').focus();
  });

  /* Deep links for screenshots and sharing: #detail=<slug>, #cat=<category>, #watch=1, #sort=<key> */
  var h = (location.hash || '').replace(/^#/, '');
  if (h) {
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = decodeURIComponent(kv[0] || ''), v = decodeURIComponent(kv[1] || '');
      if (k === 'detail') state.detail = v;
      if (k === 'cat') { state.cat = v; $('cat').value = v; }
      if (k === 'chain') { state.chain = v; $('chain').value = v; }
      if (k === 'watch' && v === '1') { state.watchOnly = true; $('watchOnly').checked = true; }
      if (k === 'sort') { state.sort = v; $('sort').value = v; }
      if (k === 'q') { state.q = v; $('q').value = v; }
      if (k === 'view' && v === 'live') setView('live');
    });
  }

  renderBoard();
  renderDetail();
})();
