/* =====================================================================
   ADMIN — uređivanje sadržaja (/admin.html), PRIJENOSNA verzija.
   ---------------------------------------------------------------------
   Sprema izmjene preko save.php (radi na svakom PHP hostingu). Ako hosting
   NEMA PHP (npr. GitHub Pages), automatski se prebaci na "način izvoza":
   uređuješ normalno, a spremanje preuzme gotove data/*.json datoteke koje
   onda uploadaš na hosting. Ništa ne ovisi o jednom konkretnom serveru —
   sve putuje s projektom.

   Javne stranice čitaju iz data/cjenik.json, data/tekstovi.json,
   data/dogadjaji.json (vidi assets/js/*.js).
===================================================================== */
(function(){
  var SAVE = 'save.php';
  var VRSTE = ['cjenik', 'tekstovi', 'dogadjaji', 'slike', 'galerija', 'faq'];

  var saveMode = 'export';       /* 'php' (izravno spremanje) ili 'export' (preuzimanje) */
  var adminPassword = '';

  var state = { cjenik: null, tekstovi: null, dogadjaji: null, slike: null, galerija: null, faq: null };
  var dirty = { cjenik: false, tekstovi: false, dogadjaji: false, slike: false, galerija: false, faq: false };

  var loginView = document.getElementById('login-view');
  var appView = document.getElementById('app-view');
  var catsEl = document.getElementById('cjenik-cats');
  var dogadjajiEl = document.getElementById('dogadjaji');
  var slikeEl = document.getElementById('slike-slots');
  var galerijaEl = document.getElementById('galerija-tiles');
  var faqEl = document.getElementById('faq-groups');
  var saveBtn = document.getElementById('save');
  var statusEl = document.getElementById('save-status');

  /* ljudski nazivi za slotove slika (data-cms-img) */
  var SLOT_LABELS = {
    'pocetna-hero': 'Početna — glavna (hero) fotka',
    'pocetna-noc': 'Početna — "Po noći" fotka',
    'atmosfera-1': 'Početna — Atmosfera 1', 'atmosfera-2': 'Početna — Atmosfera 2',
    'atmosfera-3': 'Početna — Atmosfera 3', 'atmosfera-4': 'Početna — Atmosfera 4',
    'atmosfera-5': 'Početna — Atmosfera 5', 'atmosfera-6': 'Početna — Atmosfera 6',
    'pocetna-posjeti': 'Početna — "Posjeti nas" fotka',
    'pocetna-rezervacija': 'Početna — "Rezervacija" fotka',
    'cjenik-hero': 'Katalog — hero fotka',
    'lokacija-hero': 'Lokacija — hero fotka',
    'lokacija-posjeti': 'Lokacija — donja fotka',
    'zaposlenje-hero': 'Zapošljavanje — hero fotka',
    'pitanja-hero': 'Pitanja — hero fotka'
  };

  var TEKST_POLJA = {
    cjenik: [
      ['cjenik.uvod', 'Uvodni tekst na vrhu stranice', 'textarea']
    ],
    pocetna: [
      ['pocetna.filozofija-citat', 'Citat (sekcija Misija – vizija)', 'input'],
      ['pocetna.filozofija', 'Tekst — Misija – vizija', 'textarea'],
      ['pocetna.cjenik-napomena', 'Tekst — Katalog', 'textarea'],
      ['pocetna.podanu', 'Tekst — Po danu', 'textarea'],
      ['pocetna.atmosfera', 'Tekst — Atmosfera', 'textarea']
    ],
    zaposlenje: [
      ['zaposlenje.uvod', 'Uvodni tekst na vrhu stranice', 'textarea'],
      ['zaposlenje.napomena', 'Napomena ispod obrasca', 'textarea']
    ]
  };

  var PAGE_URLS = { cjenik: 'cjenik.html', pocetna: 'index.html', zaposlenje: 'zaposlenje.html' };

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'save-status' + (cls ? ' ' + cls : '');
  }
  function anyDirty(){ return dirty.cjenik || dirty.tekstovi || dirty.dogadjaji || dirty.slike || dirty.galerija || dirty.faq; }
  function markDirty(vrsta){
    dirty[vrsta] = true;
    saveBtn.disabled = false;
    setStatus('Imaš nespremljene promjene', 'is-dirty');
  }

  /* ================= BIRAČ STRANICE ================= */
  var pagePick = document.getElementById('page-pick');
  var viewLink = document.getElementById('view-link');
  function showPanel(){
    var page = pagePick.value;
    ['cjenik', 'pocetna', 'zaposlenje', 'slike', 'galerija', 'faq'].forEach(function(p){
      var el = document.getElementById('panel-' + p);
      if (el) el.hidden = p !== page;
    });
    if (viewLink) viewLink.href = PAGE_URLS[page] || 'index.html';
  }
  pagePick.addEventListener('change', showPanel);

  /* ================= TEKSTOVI ================= */
  function renderTexts(){
    document.querySelectorAll('.text-fields').forEach(function(box){
      var page = box.getAttribute('data-texts');
      if (!TEKST_POLJA[page]) return;
      box.innerHTML = TEKST_POLJA[page].map(function(f){
        var val = esc(state.tekstovi[f[0]] || '');
        var field = f[2] === 'input'
          ? '<input data-tkey="' + f[0] + '" value="' + val + '">'
          : '<textarea data-tkey="' + f[0] + '">' + val + '</textarea>';
        return '<div class="field"><label>' + esc(f[1]) + '</label>' + field + '</div>';
      }).join('');
    });
  }
  document.addEventListener('input', function(e){
    var k = e.target.getAttribute && e.target.getAttribute('data-tkey');
    if (!k) return;
    state.tekstovi[k] = e.target.value;
    markDirty('tekstovi');
  });

  /* ================= DOGAĐAJI (sekcija "Novosti" na početnoj) ================= */
  function renderDogadjaji(){
    dogadjajiEl.innerHTML = state.dogadjaji.dogadjaji.map(function(d, i){
      return '<article class="oglas-card' + (d.aktivno ? '' : ' is-inactive') + '" data-i="' + i + '">' +
        '<div class="field-grid">' +
          '<div class="field"><label>Dan</label><input data-f="dan" value="' + esc(d.dan) + '" placeholder="npr. Petak"></div>' +
          '<div class="field"><label>Naziv</label><input data-f="naziv" value="' + esc(d.naziv) + '" placeholder="npr. Music Night"></div>' +
          '<div class="field field-wide"><label>Opis (podnaslov)</label><input data-f="opis" value="' + esc(d.opis) + '" placeholder="npr. Ex-Yu glazba cijelu večer"></div>' +
        '</div>' +
        '<label class="oglas-active"><input type="checkbox" data-f="aktivno"' + (d.aktivno ? ' checked' : '') + '> Aktivno (prikazano na početnoj)</label>' +
        '<button type="button" class="artist-del" data-del-dogadjaj="' + i + '">Obriši događaj</button>' +
      '</article>';
    }).join('') || '<p class="hint">Nema događaja — dodaj prvi gumbom ispod.</p>';
  }
  dogadjajiEl.addEventListener('input', function(e){
    var card = e.target.closest('.oglas-card');
    var f = e.target.getAttribute && e.target.getAttribute('data-f');
    if (!card || !f) return;
    var d = state.dogadjaji.dogadjaji[Number(card.getAttribute('data-i'))];
    d[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === 'aktivno') card.classList.toggle('is-inactive', !d.aktivno);
    markDirty('dogadjaji');
  });
  dogadjajiEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-dogadjaj]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-dogadjaj'));
    if (!confirm('Obrisati događaj "' + (state.dogadjaji.dogadjaji[i].naziv || 'bez naziva') + '"?')) return;
    state.dogadjaji.dogadjaji.splice(i, 1);
    markDirty('dogadjaji');
    renderDogadjaji();
  });
  document.getElementById('add-dogadjaj').addEventListener('click', function(){
    state.dogadjaji.dogadjaji.push({ id: 'dogadjaj-' + Date.now(), dan: '', naziv: '', opis: '', aktivno: true });
    markDirty('dogadjaji');
    renderDogadjaji();
    var cards = dogadjajiEl.querySelectorAll('.oglas-card');
    if (cards.length) {
      cards[cards.length - 1].scrollIntoView({ block: 'center' });
      var first = cards[cards.length - 1].querySelector('input[data-f="dan"]');
      if (first) first.focus();
    }
  });

  /* ================= SLIKE + GALERIJA ================= */
  function pickFile(cb){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function(){ if (inp.files[0]) cb(inp.files[0]); };
    inp.click();
  }
  function uploadImage(file, done){
    if (saveMode !== 'php') {
      alert('Na hostingu bez PHP-a ne mogu učitati sliku umjesto tebe.\n\nUploadaj sliku ručno u mapu assets/images/ na hostingu, pa upiši njenu putanju (npr. assets/images/moja-slika.jpg) u polje.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e){
      setStatus('Učitavam sliku…');
      fetch(SAVE, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload', filename: file.name, content: e.target.result, password: adminPassword }) })
        .then(function(r){ return r.json(); })
        .then(function(j){ if (j && j.ok && j.url) { setStatus('Slika učitana ✓', 'is-ok'); done(j.url); } else { alert('Upload nije uspio: ' + ((j && j.error) || '')); } })
        .catch(function(){ alert('Upload nije uspio (nema veze s poslužiteljem).'); });
    };
    reader.readAsDataURL(file);
  }

  function renderSlike(){
    slikeEl.innerHTML = Object.keys(state.slike).map(function(slot){
      var url = state.slike[slot];
      return '<article class="slika-card" data-slot="' + esc(slot) + '">' +
        '<div class="slika-head"><strong>' + esc(SLOT_LABELS[slot] || slot) + '</strong></div>' +
        (url ? '<div class="slika-preview"><img src="' + esc(url) + '" alt=""></div>' : '') +
        '<div class="field"><label>Putanja slike</label><input data-slot-url value="' + esc(url) + '" placeholder="assets/images/..."></div>' +
        '<button type="button" class="btn-mini slot-upload">Promijeni sliku (učitaj s računala)</button>' +
      '</article>';
    }).join('') || '<p class="hint">Nema definiranih slika.</p>';
  }
  slikeEl.addEventListener('input', function(e){
    var card = e.target.closest('.slika-card');
    if (!card || !e.target.hasAttribute('data-slot-url')) return;
    state.slike[card.getAttribute('data-slot')] = e.target.value;
    markDirty('slike');
  });
  slikeEl.addEventListener('click', function(e){
    var btn = e.target.closest('.slot-upload'); if (!btn) return;
    var slot = btn.closest('.slika-card').getAttribute('data-slot');
    pickFile(function(file){ uploadImage(file, function(url){ state.slike[slot] = url; markDirty('slike'); renderSlike(); }); });
  });

  function renderGalerija(){
    galerijaEl.innerHTML = state.galerija.ploce.map(function(t, i){
      var f = t.slike[0] || { src: '', alt: '' };
      var b = t.slike[1] || { src: '', alt: '' };
      return '<article class="slika-card" data-i="' + i + '">' +
        '<div class="slika-head"><strong>Pločica ' + (i + 1) + '</strong>' +
          '<button type="button" class="artist-del" data-del-tile="' + i + '">Obriši</button></div>' +
        '<div class="tile-two">' +
          '<div>' + (f.src ? '<div class="slika-preview"><img src="' + esc(f.src) + '" alt=""></div>' : '') +
            '<div class="field"><label>Fotka 1 — putanja</label><input data-t="0" data-tf="src" value="' + esc(f.src) + '" placeholder="assets/images/..."></div>' +
            '<div class="field"><label>Fotka 1 — opis (alt)</label><input data-t="0" data-tf="alt" value="' + esc(f.alt) + '"></div>' +
            '<button type="button" class="btn-mini tile-upload" data-t="0">Promijeni fotku 1</button></div>' +
          '<div>' + (b.src ? '<div class="slika-preview"><img src="' + esc(b.src) + '" alt=""></div>' : '') +
            '<div class="field"><label>Fotka 2 — putanja</label><input data-t="1" data-tf="src" value="' + esc(b.src) + '" placeholder="assets/images/..."></div>' +
            '<button type="button" class="btn-mini tile-upload" data-t="1">Promijeni fotku 2</button></div>' +
        '</div></article>';
    }).join('') || '<p class="hint">Nema pločica — dodaj prvu gumbom ispod.</p>';
  }
  galerijaEl.addEventListener('input', function(e){
    var card = e.target.closest('.slika-card');
    var tf = e.target.getAttribute('data-tf');
    if (!card || !tf) return;
    var i = Number(card.getAttribute('data-i')), ti = Number(e.target.getAttribute('data-t'));
    if (!state.galerija.ploce[i].slike[ti]) state.galerija.ploce[i].slike[ti] = { src: '', alt: '' };
    state.galerija.ploce[i].slike[ti][tf] = e.target.value;
    markDirty('galerija');
  });
  galerijaEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-tile]');
    if (del) {
      var di = Number(del.getAttribute('data-del-tile'));
      if (!confirm('Obrisati pločicu ' + (di + 1) + '?')) return;
      state.galerija.ploce.splice(di, 1); markDirty('galerija'); renderGalerija(); return;
    }
    var up = e.target.closest('.tile-upload'); if (!up) return;
    var card = up.closest('.slika-card');
    var i = Number(card.getAttribute('data-i')), ti = Number(up.getAttribute('data-t'));
    pickFile(function(file){ uploadImage(file, function(url){
      if (!state.galerija.ploce[i].slike[ti]) state.galerija.ploce[i].slike[ti] = { src: '', alt: '' };
      state.galerija.ploce[i].slike[ti].src = url; markDirty('galerija'); renderGalerija();
    }); });
  });
  document.getElementById('add-tile').addEventListener('click', function(){
    state.galerija.ploce.push({ slike: [{ src: '', alt: '' }, { src: '', alt: '' }] });
    markDirty('galerija'); renderGalerija();
    var cards = galerijaEl.querySelectorAll('.slika-card');
    if (cards.length) cards[cards.length - 1].scrollIntoView({ block: 'center' });
  });

  /* ================= PITANJA (FAQ) ================= */
  function renderFaq(openIndex){
    faqEl.innerHTML = state.faq.grupe.map(function(g, gi){
      var qs = g.pitanja.map(function(p, pi){
        var opts = IKONE.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === p.ikona ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
        return '<div class="itm faq-q" data-q="' + pi + '">' +
          '<div class="field"><label>Pitanje</label><input data-qf="pitanje" value="' + esc(p.pitanje) + '"></div>' +
          '<div class="field"><label>Odgovor</label><textarea data-qf="odgovor">' + esc(p.odgovor) + '</textarea></div>' +
          '<div class="field"><label>Ikona (nebavezno)</label><select data-qf="ikona">' + opts + '</select></div>' +
          '<button type="button" class="row-x faq-q-del" aria-label="Obriši pitanje">✕ pitanje</button>' +
        '</div>';
      }).join('');
      return '<details class="cat" data-g="' + gi + '"' + (gi === openIndex ? ' open' : '') + '>' +
        '<summary><span class="cat-sum-name">' + esc(g.naziv || 'Nova grupa') + '</span>' +
        '<span class="cat-sum-count">' + g.pitanja.length + ' pitanja</span></summary>' +
        '<div class="cat-body">' +
          '<div class="field"><label>Naziv grupe</label><input data-gf="naziv" value="' + esc(g.naziv) + '"></div>' +
          qs +
          '<div class="cat-actions"><button type="button" class="btn-mini faq-q-add">+ Dodaj pitanje</button>' +
          '<button type="button" class="cat-del faq-g-del">Obriši grupu</button></div>' +
        '</div></details>';
    }).join('') || '<p class="hint">Nema grupa — dodaj prvu gumbom ispod.</p>';
  }
  function faqCtx(el){
    var g = el.closest('.cat'); var gi = Number(g.getAttribute('data-g'));
    var q = el.closest('.faq-q'); var qi = q ? Number(q.getAttribute('data-q')) : -1;
    return { g: state.faq.grupe[gi], gi: gi, qi: qi, gEl: g };
  }
  faqEl.addEventListener('input', function(e){
    var t = e.target; if (!t.closest('.cat')) return;
    var ctx = faqCtx(t);
    if (t.hasAttribute('data-gf')) { ctx.g.naziv = t.value; ctx.gEl.querySelector('.cat-sum-name').textContent = t.value || 'Nova grupa'; }
    else if (t.hasAttribute('data-qf')) { ctx.g.pitanja[ctx.qi][t.getAttribute('data-qf')] = t.value; }
    else return;
    markDirty('faq');
  });
  faqEl.addEventListener('click', function(e){
    var t = e.target;
    if (t.closest('.faq-q-del')) {
      var c = faqCtx(t); c.g.pitanja.splice(c.qi, 1); markDirty('faq'); renderFaq(c.gi);
    } else if (t.closest('.faq-q-add')) {
      var c2 = faqCtx(t); c2.g.pitanja.push({ pitanje: '', odgovor: '', ikona: '' }); markDirty('faq'); renderFaq(c2.gi);
      var q = faqEl.querySelector('.cat[data-g="' + c2.gi + '"] .faq-q:last-child input[data-qf="pitanje"]');
      if (q) { q.focus(); q.scrollIntoView({ block: 'center' }); }
    } else if (t.closest('.faq-g-del')) {
      var c3 = faqCtx(t);
      if (c3.g.pitanja.length && !confirm('Obrisati grupu "' + (c3.g.naziv || 'bez naziva') + '" i njenih ' + c3.g.pitanja.length + ' pitanja?')) return;
      state.faq.grupe.splice(c3.gi, 1); markDirty('faq'); renderFaq(-1);
    }
  });
  document.getElementById('add-faq-group').addEventListener('click', function(){
    state.faq.grupe.push({ naziv: '', pitanja: [{ pitanje: '', odgovor: '', ikona: '' }] });
    markDirty('faq'); renderFaq(state.faq.grupe.length - 1);
    var inp = faqEl.querySelector('.cat[open] input[data-gf="naziv"]');
    if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center' }); }
  });

  /* ================= KATALOG (cjenik) ================= */
  var IKONE = [
    ['', 'bez ikone'], ['coffee', 'kava'], ['juice', 'sok'], ['beer', 'pivo'],
    ['cider', 'cider'], ['wine', 'vino'], ['spirit', 'žestica'],
    ['cocktail', 'koktel'], ['cigarette', 'cigarete'], ['cigar', 'cigare']
  ];
  function catCount(c){
    var n = c.grupe.reduce(function(m, g){ return m + g.stavke.length; }, 0);
    return n + (n === 1 ? ' stavka' : (n >= 2 && n <= 4 ? ' stavke' : ' stavki'));
  }
  function renderCjenik(openIndex){
    catsEl.innerHTML = state.cjenik.kategorije.map(function(c, ci){
      var groups = c.grupe.map(function(g, gi){
        var ikonaOpts = IKONE.map(function(o){
          return '<option value="' + o[0] + '"' + (o[0] === g.ikona ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('');
        var items = g.stavke.map(function(s, si){
          return '<div class="itm" data-it="' + si + '">' +
            '<input data-if="naziv" value="' + esc(s.naziv) + '" placeholder="Naziv pića">' +
            '<input data-if="opis" value="' + esc(s.opis) + '" placeholder="Sastojci / napomena (nije obavezno)">' +
            '<button type="button" class="row-x itm-del" aria-label="Obriši stavku">✕</button>' +
          '</div>';
        }).join('');
        return '<div class="grp" data-g="' + gi + '">' +
          '<div class="grp-head">' +
            '<input data-gf="naziv" value="' + esc(g.naziv) + '" placeholder="Naziv grupe (npr. Kave)">' +
            '<select data-gf="ikona">' + ikonaOpts + '</select>' +
            '<button type="button" class="row-x grp-del" aria-label="Obriši grupu">✕</button>' +
          '</div>' +
          '<div class="itms">' + items + '</div>' +
          '<button type="button" class="btn-mini itm-add">+ stavka</button>' +
        '</div>';
      }).join('');
      return '<details class="cat" data-c="' + ci + '"' + (ci === openIndex ? ' open' : '') + '>' +
        '<summary><span class="cat-sum-name">' + esc(c.naziv || 'Nova kategorija') + '</span>' +
        '<span class="cat-sum-count">' + catCount(c) + '</span></summary>' +
        '<div class="cat-body">' +
          '<div class="field"><label>Naziv kategorije</label><input data-cf="naziv" value="' + esc(c.naziv) + '"></div>' +
          groups +
          '<div class="cat-actions">' +
            '<button type="button" class="btn-mini grp-add">+ Dodaj grupu</button>' +
            '<button type="button" class="cat-del">Obriši kategoriju</button>' +
          '</div>' +
        '</div>' +
      '</details>';
    }).join('') || '<p class="hint">Nema kategorija — dodaj prvu gumbom ispod.</p>';
  }
  function cjenikCtx(el){
    var cat = el.closest('.cat');
    var ci = Number(cat.getAttribute('data-c'));
    var grpEl = el.closest('.grp');
    var gi = grpEl ? Number(grpEl.getAttribute('data-g')) : -1;
    var itmEl = el.closest('.itm');
    var si = itmEl ? Number(itmEl.getAttribute('data-it')) : -1;
    return { c: state.cjenik.kategorije[ci], ci: ci, gi: gi, si: si, catEl: cat };
  }
  catsEl.addEventListener('input', function(e){
    var t = e.target;
    if (!t.closest('.cat')) return;
    var ctx = cjenikCtx(t);
    if (t.hasAttribute('data-cf')) {
      ctx.c.naziv = t.value;
      ctx.catEl.querySelector('.cat-sum-name').textContent = t.value || 'Nova kategorija';
    } else if (t.hasAttribute('data-gf')) {
      ctx.c.grupe[ctx.gi][t.getAttribute('data-gf')] = t.value;
    } else if (t.hasAttribute('data-if')) {
      ctx.c.grupe[ctx.gi].stavke[ctx.si][t.getAttribute('data-if')] = t.value;
    } else { return; }
    markDirty('cjenik');
  });
  catsEl.addEventListener('click', function(e){
    var t = e.target;
    if (t.closest('.itm-del')) {
      var ctx = cjenikCtx(t);
      ctx.c.grupe[ctx.gi].stavke.splice(ctx.si, 1);
      markDirty('cjenik');
      renderCjenik(ctx.ci);
    } else if (t.closest('.itm-add')) {
      var ctx2 = cjenikCtx(t);
      ctx2.c.grupe[ctx2.gi].stavke.push({ naziv: '', opis: '' });
      markDirty('cjenik');
      renderCjenik(ctx2.ci);
      var grp = catsEl.querySelector('.cat[data-c="' + ctx2.ci + '"] .grp[data-g="' + ctx2.gi + '"]');
      var last = grp && grp.querySelector('.itm:last-child input[data-if="naziv"]');
      if (last) { last.focus(); last.scrollIntoView({ block: 'center' }); }
    } else if (t.closest('.grp-del')) {
      var ctx3 = cjenikCtx(t);
      var g = ctx3.c.grupe[ctx3.gi];
      if (g.stavke.length && !confirm('Obrisati grupu "' + (g.naziv || 'bez naziva') + '" i njenih ' + g.stavke.length + ' stavki?')) return;
      ctx3.c.grupe.splice(ctx3.gi, 1);
      markDirty('cjenik');
      renderCjenik(ctx3.ci);
    } else if (t.closest('.grp-add')) {
      var ctx4 = cjenikCtx(t);
      ctx4.c.grupe.push({ naziv: '', ikona: '', stavke: [] });
      markDirty('cjenik');
      renderCjenik(ctx4.ci);
    } else if (t.closest('.cat-del')) {
      var ctx5 = cjenikCtx(t);
      var total = ctx5.c.grupe.reduce(function(m, gr){ return m + gr.stavke.length; }, 0);
      if (!confirm('Obrisati kategoriju "' + (ctx5.c.naziv || 'bez naziva') + '"' + (total ? ' i njenih ' + total + ' stavki' : '') + '?')) return;
      state.cjenik.kategorije.splice(ctx5.ci, 1);
      markDirty('cjenik');
      renderCjenik(-1);
    }
  });
  document.getElementById('add-cat').addEventListener('click', function(){
    state.cjenik.kategorije.push({ id: 'kat-' + Date.now(), naziv: '', grupe: [{ naziv: '', ikona: '', stavke: [] }] });
    markDirty('cjenik');
    renderCjenik(state.cjenik.kategorije.length - 1);
    var inp = catsEl.querySelector('.cat[open] input[data-cf="naziv"]');
    if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center' }); }
  });

  /* ================= VALIDACIJA + ČIŠĆENJE ================= */
  function validateBeforeSave(){
    if (dirty.dogadjaji && state.dogadjaji.dogadjaji.some(function(d){ return !String(d.naziv).trim(); })) {
      return 'Svaki događaj mora imati naziv.';
    }
    if (dirty.cjenik) {
      for (var i = 0; i < state.cjenik.kategorije.length; i++) {
        var c = state.cjenik.kategorije[i];
        if (!String(c.naziv).trim()) return 'Svaka kategorija kataloga mora imati naziv.';
        for (var j = 0; j < c.grupe.length; j++) {
          for (var k = 0; k < c.grupe[j].stavke.length; k++) {
            if (!String(c.grupe[j].stavke[k].naziv).trim()) return 'U kategoriji "' + c.naziv + '" postoji stavka bez naziva.';
          }
        }
      }
    }
    return null;
  }
  function cleanData(vrsta){
    if (vrsta === 'cjenik') {
      return { kategorije: state.cjenik.kategorije.map(function(c){
        return { id: String(c.id || ('kat-' + Date.now())), naziv: String(c.naziv).trim(),
          grupe: c.grupe.map(function(g){
            return { naziv: String(g.naziv || '').trim(), ikona: String(g.ikona || '').trim(),
              stavke: g.stavke.map(function(s){ return { naziv: String(s.naziv).trim(), opis: String(s.opis || '').trim() }; }) };
          }) };
      }) };
    }
    if (vrsta === 'dogadjaji') {
      return { dogadjaji: state.dogadjaji.dogadjaji.map(function(d){
        return { id: String(d.id || ('dogadjaj-' + Date.now())), dan: String(d.dan || '').trim(),
          naziv: String(d.naziv || '').trim(), opis: String(d.opis || '').trim(), aktivno: !!d.aktivno };
      }) };
    }
    if (vrsta === 'slike') {
      var o = {};
      Object.keys(state.slike).forEach(function(k){ o[k] = String(state.slike[k] || '').trim(); });
      return o;
    }
    if (vrsta === 'galerija') {
      return { ploce: state.galerija.ploce.map(function(t){
        return { slike: (t.slike || []).map(function(im){
          return { src: String(im.src || '').trim(), alt: String(im.alt || '').trim() };
        }).filter(function(im){ return im.src; }) };
      }).filter(function(t){ return t.slike.length; }) };
    }
    if (vrsta === 'faq') {
      return { grupe: state.faq.grupe.map(function(g){
        return { naziv: String(g.naziv || '').trim(), pitanja: (g.pitanja || []).map(function(p){
          return { pitanje: String(p.pitanje || '').trim(), odgovor: String(p.odgovor || '').trim(), ikona: String(p.ikona || '').trim() };
        }).filter(function(p){ return p.pitanje; }) };
      }).filter(function(g){ return g.naziv || g.pitanja.length; }) };
    }
    /* tekstovi */
    var out = {};
    Object.keys(state.tekstovi).forEach(function(k){ out[k] = String(state.tekstovi[k]).trim(); });
    return out;
  }

  /* ================= SPREMANJE ================= */
  function download(filename, text){
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  saveBtn.addEventListener('click', function(){
    var err = validateBeforeSave();
    if (err) { alert(err); return; }
    var queue = VRSTE.filter(function(v){ return dirty[v]; });
    if (!queue.length) return;

    saveBtn.disabled = true;
    setStatus('Spremam…');

    if (saveMode === 'export') {
      /* hosting bez PHP-a: preuzmi datoteke, uputa za upload */
      queue.forEach(function(vrsta){
        download('data__' + vrsta + '.json', JSON.stringify(cleanData(vrsta), null, 2) + '\n');
        dirty[vrsta] = false;
      });
      setStatus('Preuzeto ' + queue.length + ' datoteka. Preimenuj svaku u <ime>.json bez "data__" i uploadaj u mapu data/ na hostingu.', 'is-ok');
      alert('Hosting nema PHP, pa su izmjene preuzete kao datoteke.\n\nZa svaku preuzetu datoteku:\n1. preimenuj "data__cjenik.json" → "cjenik.json" (makni "data__")\n2. uploadaj je u mapu data/ na hostingu (zamijeni postojeću).\n\nStranica se osvježi čim datoteke zamijeniš.');
      return;
    }

    /* PHP hosting: spremi izravno */
    var chain = Promise.resolve();
    var failed = null;
    queue.forEach(function(vrsta){
      chain = chain.then(function(){
        if (failed) return;
        return fetch(SAVE, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', vrsta: vrsta, data: cleanData(vrsta), password: adminPassword }) })
          .then(function(r){ return r.text().then(function(txt){ var j; try { j = JSON.parse(txt); } catch(e) { j = null; }
            if (r.ok && j && j.ok) { dirty[vrsta] = false; }
            else { failed = (j && j.error) || 'Greška pri spremanju.'; } }); });
      });
    });
    chain.then(function(){
      if (failed) { saveBtn.disabled = false; setStatus(failed, 'is-err'); }
      else { setStatus('Spremljeno ✓ (osvježi stranicu da vidiš promjene)', 'is-ok'); }
    }).catch(function(){
      saveBtn.disabled = false;
      setStatus('Nema veze s poslužiteljem — pokušaj ponovno.', 'is-err');
    });
  });

  window.addEventListener('beforeunload', function(e){
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= UČITAVANJE ================= */
  function getJSON(url, fallback){
    return fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .catch(function(){ return fallback; });
  }
  function loadAndShow(){
    return Promise.all([
      getJSON('data/cjenik.json', { kategorije: [] }),
      getJSON('data/tekstovi.json', {}),
      getJSON('data/dogadjaji.json', { dogadjaji: [] }),
      getJSON('data/slike.json', {}),
      getJSON('data/galerija.json', { ploce: [] }),
      getJSON('data/faq.json', { grupe: [] })
    ]).then(function(res){
      state.cjenik = { kategorije: (res[0] && res[0].kategorije) || [] };
      state.tekstovi = (res[1] && typeof res[1] === 'object') ? res[1] : {};
      state.dogadjaji = { dogadjaji: (res[2] && res[2].dogadjaji) || [] };
      state.slike = (res[3] && typeof res[3] === 'object') ? res[3] : {};
      state.galerija = { ploce: (res[4] && res[4].ploce) || [] };
      state.faq = { grupe: (res[5] && res[5].grupe) || [] };
      renderCjenik(-1);
      renderTexts();
      renderDogadjaji();
      renderSlike();
      renderGalerija();
      renderFaq(-1);
      showPanel();
      loginView.hidden = true;
      appView.hidden = false;
      setStatus(saveMode === 'export'
        ? 'Način izvoza (hosting bez PHP-a): spremanje preuzima datoteke za upload.'
        : '');
      saveBtn.disabled = true;
    });
  }

  /* ================= PRIJAVA ================= */
  document.getElementById('logout').addEventListener('click', function(){
    if (anyDirty() && !confirm('Imaš nespremljene promjene — svejedno se odjaviti?')) return;
    dirty = { cjenik: false, tekstovi: false, dogadjaji: false, slike: false, galerija: false, faq: false };
    adminPassword = '';
    location.reload();
  });

  var loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    var pass = document.getElementById('login-pass').value;
    var errEl = document.getElementById('login-err');
    errEl.hidden = true;
    setStatus('');

    fetch(SAVE, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password: pass }) })
      .then(function(r){ return r.text().then(function(txt){ var j; try { j = JSON.parse(txt); } catch(e) { j = null; }
        return { status: r.status, json: j }; }); })
      .then(function(res){
        if (res.json && res.json.ok) {
          /* PHP radi i lozinka je točna → izravno spremanje */
          saveMode = 'php';
          adminPassword = pass;
          return loadAndShow();
        }
        if (res.json && res.status === 401) {
          /* PHP radi, kriva lozinka */
          errEl.textContent = 'Pogrešna lozinka, pokušaj ponovno.';
          errEl.hidden = false;
          return;
        }
        /* nema PHP-a (statični hosting) → način izvoza */
        saveMode = 'export';
        adminPassword = '';
        return loadAndShow();
      })
      .catch(function(){
        /* mrežna greška / nema save.php → način izvoza */
        saveMode = 'export';
        adminPassword = '';
        loadAndShow();
      });
  });

  loginView.hidden = false;
})();
