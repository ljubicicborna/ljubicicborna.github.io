/* =====================================================================
   ADMIN — uređivanje sadržaja (/admin.html)
   Birač stranice gore odlučuje što se uređuje:
   - Živa glazba  → raspored + izvođači (+ uvodni tekst)
   - Cjenik       → kategorije/grupe/stavke s cijenama (+ uvodni tekst)
   - Početna      → glavni tekstovi
   - Zapošljavanje→ tekstovi
   Sve se čita s /api/glazba, /api/cjenik, /api/tekstovi, a sprema preko
   /api/admin (lozinka u headeru x-admin-key).
===================================================================== */
(function(){
  var API = '/api/admin';

  var state = { glazba: null, cjenik: null, tekstovi: null, oglasi: null };
  var dirty = { glazba: false, cjenik: false, tekstovi: false, oglasi: false };

  var loginView = document.getElementById('login-view');
  var appView = document.getElementById('app-view');
  var gigsEl = document.getElementById('gigs');
  var artistsEl = document.getElementById('artists');
  var catsEl = document.getElementById('cjenik-cats');
  var oglasiEl = document.getElementById('oglasi');
  var saveBtn = document.getElementById('save');
  var statusEl = document.getElementById('save-status');

  /* koje tekst-polje pripada kojoj stranici: [ključ, oznaka, vrsta polja] */
  var TEKST_POLJA = {
    glazba: [
      ['glazba.uvod', 'Uvodni tekst na vrhu stranice', 'textarea']
    ],
    cjenik: [
      ['cjenik.uvod', 'Uvodni tekst na vrhu stranice', 'textarea']
    ],
    pocetna: [
      ['pocetna.filozofija-citat', 'Citat (sekcija Filozofija)', 'input'],
      ['pocetna.filozofija', 'Tekst — Filozofija', 'textarea'],
      ['pocetna.cjenik-napomena', 'Tekst — Cjenik', 'textarea'],
      ['pocetna.podanu', 'Tekst — Po danu', 'textarea'],
      ['pocetna.atmosfera', 'Tekst — Atmosfera', 'textarea']
    ],
    zaposlenje: [
      ['zaposlenje.uvod', 'Uvodni tekst na vrhu stranice', 'textarea'],
      ['zaposlenje.napomena', 'Napomena ispod obrasca', 'textarea']
    ]
  };

  var PAGE_URLS = { glazba: '/glazba.html', cjenik: '/cjenik.html', pocetna: '/', zaposlenje: '/zaposlenje.html' };

  function key(){ return sessionStorage.getItem('hedonistAdminKey') || ''; }

  function api(body){
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key() },
      body: JSON.stringify(body)
    }).then(function(r){
      return r.json().then(function(j){ return { ok: r.ok, status: r.status, data: j }; });
    });
  }

  function setStatus(text, cls){
    statusEl.textContent = text;
    statusEl.className = 'save-status' + (cls ? ' ' + cls : '');
  }

  function anyDirty(){ return dirty.glazba || dirty.cjenik || dirty.tekstovi || dirty.oglasi; }

  function markDirty(vrsta){
    dirty[vrsta] = true;
    saveBtn.disabled = false;
    setStatus('Imaš nespremljene promjene', 'is-dirty');
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function initials(name){
    var parts = String(name || '?').replace(/^DJ\s+/i, '').split(/[\s—-]+/).filter(Boolean);
    var out = parts[0] ? parts[0][0] : '?';
    if (parts[1]) out += parts[1][0];
    return out.toUpperCase();
  }

  function todayStr(){
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0') + '-' + String(n.getDate()).padStart(2,'0');
  }

  /* ================= BIRAČ STRANICE ================= */
  var pagePick = document.getElementById('page-pick');
  var viewLink = document.getElementById('view-link');
  function showPanel(){
    var page = pagePick.value;
    ['glazba', 'cjenik', 'pocetna', 'zaposlenje'].forEach(function(p){
      document.getElementById('panel-' + p).hidden = p !== page;
    });
    viewLink.href = PAGE_URLS[page];
  }
  pagePick.addEventListener('change', showPanel);

  /* ================= TEKSTOVI ================= */
  function renderTexts(){
    document.querySelectorAll('.text-fields').forEach(function(box){
      var page = box.getAttribute('data-texts');
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

  /* ================= GLAZBA: RASPORED ================= */
  /* NAPOMENA: raspored se namjerno NE sortira dok se uređuje — red ne smije
     skočiti na drugo mjesto usred upisivanja. Server ga sortira pri spremanju. */
  function renderGigs(){
    var today = todayStr();
    gigsEl.innerHTML = state.glazba.raspored.map(function(r, i){
      var isPast = r.datum && r.datum < today;
      var options = state.glazba.izvodjaci.map(function(a){
        return '<option value="' + esc(a.id) + '"' + (a.id === r.izvodjac ? ' selected' : '') + '>' + esc(a.ime) + '</option>';
      }).join('');
      return '<div class="gig-row' + (isPast ? ' is-past' : '') + '" data-i="' + i + '">' +
        (isPast ? '<span class="gig-past-tag">odsvirano</span>' : '') +
        '<input type="date" data-f="datum" value="' + esc(r.datum) + '">' +
        '<input type="time" data-f="vrijeme" value="' + esc(r.vrijeme) + '">' +
        '<select data-f="izvodjac">' + options + '</select>' +
        '<button type="button" class="row-x" data-del="' + i + '" aria-label="Obriši svirku">✕</button>' +
      '</div>';
    }).join('') || '<p class="hint">Nema unesenih svirki — dodaj prvu gumbom ispod.</p>';
  }

  gigsEl.addEventListener('input', function(e){
    var row = e.target.closest('.gig-row');
    if (!row) return;
    var r = state.glazba.raspored[Number(row.getAttribute('data-i'))];
    r[e.target.getAttribute('data-f')] = e.target.value;
    markDirty('glazba');
  });
  gigsEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del]');
    if (!del) return;
    state.glazba.raspored.splice(Number(del.getAttribute('data-del')), 1);
    markDirty('glazba');
    renderGigs();
  });
  document.getElementById('add-gig').addEventListener('click', function(){
    if (!state.glazba.izvodjaci.length) { alert('Prvo dodaj barem jednog izvođača.'); return; }
    state.glazba.raspored.push({ datum: todayStr(), vrijeme: '21:00', izvodjac: state.glazba.izvodjaci[0].id });
    markDirty('glazba');
    renderGigs();
    var rows = gigsEl.querySelectorAll('.gig-row');
    if (rows.length) rows[rows.length - 1].scrollIntoView({ block: 'center' });
  });

  /* ================= GLAZBA: IZVOĐAČI ================= */
  var TIPOVI = ['DJ', 'Akustika', 'Bend', 'Ostalo'];

  function fotoHTML(a){
    if (a.foto) return '<img class="artist-foto" src="' + esc(a.foto) + '" alt="">';
    return '<span class="artist-foto-ph">' + esc(initials(a.ime)) + '</span>';
  }

  function renderArtists(){
    artistsEl.innerHTML = state.glazba.izvodjaci.map(function(a, i){
      var tipOpts = TIPOVI.map(function(t){
        return '<option' + (t === a.tip ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
      return '<article class="artist-card" data-i="' + i + '">' +
        '<div class="artist-top">' +
          '<span class="foto-slot">' + fotoHTML(a) + '</span>' +
          '<div class="foto-btns">' +
            '<label class="btn-foto">Promijeni sliku<input type="file" accept="image/*" data-foto="' + i + '"></label>' +
            '<span class="foto-note">Sama se izreže na kvadrat</span>' +
          '</div>' +
        '</div>' +
        '<div class="field-grid">' +
          '<div class="field"><label>Ime / naziv</label><input data-f="ime" value="' + esc(a.ime) + '"></div>' +
          '<div class="field"><label>Tip</label><select data-f="tip">' + tipOpts + '</select></div>' +
          '<div class="field"><label>Žanr</label><input data-f="zanr" value="' + esc(a.zanr) + '" placeholder="npr. House · Disco"></div>' +
          '<div class="field"><label>Instagram (link, nije obavezno)</label><input data-f="instagram" value="' + esc(a.instagram) + '" placeholder="https://instagram.com/..."></div>' +
          '<div class="field field-wide"><label>Opis</label><textarea data-f="opis">' + esc(a.opis) + '</textarea></div>' +
        '</div>' +
        '<button type="button" class="artist-del" data-del-artist="' + i + '">Obriši izvođača</button>' +
      '</article>';
    }).join('') || '<p class="hint">Nema izvođača — dodaj prvog gumbom ispod.</p>';
  }

  artistsEl.addEventListener('input', function(e){
    var card = e.target.closest('.artist-card');
    if (!card || !e.target.getAttribute('data-f')) return;
    var a = state.glazba.izvodjaci[Number(card.getAttribute('data-i'))];
    a[e.target.getAttribute('data-f')] = e.target.value;
    markDirty('glazba');
  });

  artistsEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-artist]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-artist'));
    var a = state.glazba.izvodjaci[i];
    var used = state.glazba.raspored.some(function(r){ return r.izvodjac === a.id; });
    if (used) { alert('"' + a.ime + '" ima svirke u rasporedu — prvo ih obriši, pa onda izvođača.'); return; }
    if (!confirm('Obrisati izvođača "' + a.ime + '"?')) return;
    if (/\.public\.blob\.vercel-storage\.com\/cms\/foto\//.test(a.foto || '')) {
      api({ action: 'delete-foto', url: a.foto }); /* čišćenje u pozadini */
    }
    state.glazba.izvodjaci.splice(i, 1);
    markDirty('glazba');
    renderArtists();
    renderGigs();
  });

  document.getElementById('add-artist').addEventListener('click', function(){
    state.glazba.izvodjaci.push({ id: 'izv-' + Date.now(), ime: '', tip: 'DJ', zanr: '', opis: '', foto: '', instagram: '' });
    markDirty('glazba');
    renderArtists();
    renderGigs();
    var cards = artistsEl.querySelectorAll('.artist-card');
    if (cards.length) {
      cards[cards.length - 1].scrollIntoView({ block: 'center' });
      var first = cards[cards.length - 1].querySelector('input[data-f="ime"]');
      if (first) first.focus();
    }
  });

  /* slika: smanji + izreži na kvadrat 800×800 pa pošalji odmah */
  artistsEl.addEventListener('change', function(e){
    var input = e.target.closest('input[data-foto]');
    if (!input || !input.files || !input.files[0]) return;
    var i = Number(input.getAttribute('data-foto'));
    var a = state.glazba.izvodjaci[i];
    var file = input.files[0];
    var card = input.closest('.artist-card');
    var slot = card.querySelector('.foto-slot');
    slot.style.opacity = '0.4';

    var img = new Image();
    img.onload = function(){
      URL.revokeObjectURL(img.src);
      var S = 800;
      var c = document.createElement('canvas');
      c.width = S; c.height = S;
      var ctx = c.getContext('2d');
      var side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
      var dataUrl = c.toDataURL('image/webp', 0.85);
      if (dataUrl.indexOf('data:image/webp') !== 0) dataUrl = c.toDataURL('image/jpeg', 0.85);

      var old = a.foto;
      api({ action: 'upload-foto', ime: a.ime || 'izvodjac', dataUrl: dataUrl }).then(function(res){
        slot.style.opacity = '';
        if (!res.ok) { alert(res.data.error || 'Slanje slike nije uspjelo.'); return; }
        a.foto = res.data.url;
        if (/\.public\.blob\.vercel-storage\.com\/cms\/foto\//.test(old || '')) {
          api({ action: 'delete-foto', url: old });
        }
        slot.innerHTML = fotoHTML(a);
        markDirty('glazba');
      }).catch(function(){
        slot.style.opacity = '';
        alert('Slanje slike nije uspjelo — provjeri internet pa pokušaj ponovno.');
      });
    };
    img.onerror = function(){ slot.style.opacity = ''; alert('Ovu sliku nije moguće otvoriti.'); };
    img.src = URL.createObjectURL(file);
    input.value = '';
  });

  /* ================= ZAPOŠLJAVANJE: OGLASI ================= */
  var VRSTE_OGLASA = ['Stalno', 'Studentski'];

  function renderOglasi(){
    oglasiEl.innerHTML = state.oglasi.pozicije.map(function(p, i){
      var vrstaOpts = VRSTE_OGLASA.map(function(t){
        return '<option' + (t === p.vrsta ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
      return '<article class="oglas-card' + (p.aktivno ? '' : ' is-inactive') + '" data-i="' + i + '">' +
        '<div class="field-grid">' +
          '<div class="field field-wide"><label>Naslov</label><input data-f="naslov" value="' + esc(p.naslov) + '" placeholder="npr. Tražimo konobara/icu — studentski posao"></div>' +
          '<div class="field"><label>Vrsta</label><select data-f="vrsta">' + vrstaOpts + '</select></div>' +
          '<div class="field"><label>Satnica (€/h, nije obavezno)</label><input data-f="satnica" value="' + esc(p.satnica) + '" placeholder="7,50"></div>' +
          '<div class="field field-wide"><label>Opis</label><textarea data-f="opis">' + esc(p.opis) + '</textarea></div>' +
        '</div>' +
        '<label class="oglas-active"><input type="checkbox" data-f="aktivno"' + (p.aktivno ? ' checked' : '') + '> Aktivno (prikazano na stranici)</label>' +
        '<button type="button" class="artist-del" data-del-oglas="' + i + '">Obriši oglas</button>' +
      '</article>';
    }).join('') || '<p class="hint">Nema oglasa — dodaj prvi gumbom ispod.</p>';
  }

  oglasiEl.addEventListener('input', function(e){
    var card = e.target.closest('.oglas-card');
    var f = e.target.getAttribute && e.target.getAttribute('data-f');
    if (!card || !f) return;
    var p = state.oglasi.pozicije[Number(card.getAttribute('data-i'))];
    p[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === 'aktivno') card.classList.toggle('is-inactive', !p.aktivno);
    markDirty('oglasi');
  });

  oglasiEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-oglas]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-oglas'));
    if (!confirm('Obrisati oglas "' + (state.oglasi.pozicije[i].naslov || 'bez naslova') + '"?')) return;
    state.oglasi.pozicije.splice(i, 1);
    markDirty('oglasi');
    renderOglasi();
  });

  document.getElementById('add-oglas').addEventListener('click', function(){
    state.oglasi.pozicije.push({ id: 'oglas-' + Date.now(), naslov: '', vrsta: 'Stalno', satnica: '', opis: '', datum: todayStr(), aktivno: true });
    markDirty('oglasi');
    renderOglasi();
    var cards = oglasiEl.querySelectorAll('.oglas-card');
    if (cards.length) {
      cards[cards.length - 1].scrollIntoView({ block: 'center' });
      var first = cards[cards.length - 1].querySelector('input[data-f="naslov"]');
      if (first) first.focus();
    }
  });

  /* ================= CJENIK ================= */
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
            '<input data-if="cijena" class="cij" inputmode="decimal" value="' + esc(s.cijena) + '" placeholder="0,00">' +
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
    } else {
      return;
    }
    markDirty('cjenik');
  });

  /* "3" → "3,00", "3.5" → "3,50" kad korisnik izađe iz polja cijene */
  catsEl.addEventListener('focusout', function(e){
    var t = e.target;
    if (!t.matches || !t.matches('input[data-if="cijena"]')) return;
    var v = t.value.trim().replace(/€/g, '').replace(/\./g, ',');
    if (/^\d{1,3}$/.test(v)) v += ',00';
    var m = /^(\d{1,3}),(\d{1,2})$/.exec(v);
    if (m) v = m[1] + ',' + (m[2].length === 1 ? m[2] + '0' : m[2]);
    if (v !== t.value) {
      t.value = v;
      var ctx = cjenikCtx(t);
      ctx.c.grupe[ctx.gi].stavke[ctx.si].cijena = v;
      markDirty('cjenik');
    }
  });

  catsEl.addEventListener('click', function(e){
    var t = e.target;
    var openIndex = -1;
    var openCat = catsEl.querySelector('.cat[open]');
    if (openCat) openIndex = Number(openCat.getAttribute('data-c'));

    if (t.closest('.itm-del')) {
      var ctx = cjenikCtx(t);
      ctx.c.grupe[ctx.gi].stavke.splice(ctx.si, 1);
      markDirty('cjenik');
      renderCjenik(ctx.ci);
    } else if (t.closest('.itm-add')) {
      var ctx2 = cjenikCtx(t);
      ctx2.c.grupe[ctx2.gi].stavke.push({ naziv: '', opis: '', cijena: '' });
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

  /* ================= SPREMANJE ================= */
  function validateBeforeSave(){
    if (dirty.glazba && state.glazba.izvodjaci.some(function(a){ return !String(a.ime).trim(); })) {
      return 'Svaki izvođač mora imati ime.';
    }
    if (dirty.oglasi && state.oglasi.pozicije.some(function(p){ return !String(p.naslov).trim(); })) {
      return 'Svaki oglas mora imati naslov.';
    }
    if (dirty.cjenik) {
      for (var i = 0; i < state.cjenik.kategorije.length; i++) {
        var c = state.cjenik.kategorije[i];
        if (!String(c.naziv).trim()) return 'Svaka kategorija cjenika mora imati naziv.';
        for (var j = 0; j < c.grupe.length; j++) {
          for (var k = 0; k < c.grupe[j].stavke.length; k++) {
            var s = c.grupe[j].stavke[k];
            if (!String(s.naziv).trim()) return 'U kategoriji "' + c.naziv + '" postoji stavka bez naziva.';
            if (!/^\d{1,3},\d{2}$/.test(s.cijena || '')) {
              return 'Cijena za "' + s.naziv + '" mora biti u obliku 2,20.';
            }
          }
        }
      }
    }
    return null;
  }

  saveBtn.addEventListener('click', function(){
    var err = validateBeforeSave();
    if (err) { alert(err); return; }

    var queue = [];
    if (dirty.glazba) queue.push('glazba');
    if (dirty.cjenik) queue.push('cjenik');
    if (dirty.tekstovi) queue.push('tekstovi');
    if (dirty.oglasi) queue.push('oglasi');
    if (!queue.length) return;

    saveBtn.disabled = true;
    setStatus('Spremam…');

    var chain = Promise.resolve();
    var failed = null;
    queue.forEach(function(vrsta){
      chain = chain.then(function(){
        if (failed) return;
        return api({ action: 'save', vrsta: vrsta, data: state[vrsta] }).then(function(res){
          if (res.ok) { dirty[vrsta] = false; }
          else { failed = res.data.error || 'Greška pri spremanju.'; }
        });
      });
    });
    chain.then(function(){
      if (failed) {
        saveBtn.disabled = false;
        setStatus(failed, 'is-err');
      } else {
        setStatus('Spremljeno ✓ (na stranici vidljivo unutar pola minute)', 'is-ok');
      }
    }).catch(function(){
      saveBtn.disabled = false;
      setStatus('Nema veze s poslužiteljem — pokušaj ponovno.', 'is-err');
    });
  });

  window.addEventListener('beforeunload', function(e){
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= TABOVI (glazba), PRIJAVA, START ================= */
  document.querySelectorAll('.tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('is-active', b === btn); });
      document.getElementById('tab-raspored').hidden = btn.getAttribute('data-tab') !== 'raspored';
      document.getElementById('tab-izvodjaci').hidden = btn.getAttribute('data-tab') !== 'izvodjaci';
    });
  });

  document.getElementById('logout').addEventListener('click', function(){
    if (anyDirty() && !confirm('Imaš nespremljene promjene — svejedno se odjaviti?')) return;
    dirty = { glazba: false, cjenik: false, tekstovi: false, oglasi: false };
    sessionStorage.removeItem('hedonistAdminKey');
    location.reload();
  });

  function getJSON(url, fallback){
    return fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .catch(function(){ return fallback; });
  }

  /* dok vlasnik ne otvori i ne spremi barem jednom, admin prikazuje ovaj
     unaprijed upisan oglas — jedan klik na "Spremi promjene" ga stavi u CMS */
  var SEED_OGLASI = { pozicije: [{
    id: 'oglas-seed-student',
    naslov: 'Tražimo konobara/icu — studentski posao',
    vrsta: 'Studentski',
    satnica: '7,50',
    opis: 'Tražimo pouzdanu i nasmijanu osobu za rad na šanku i terasi, uglavnom navečer i vikendom. Prijašnje iskustvo je plus, ali nije nužno.',
    datum: todayStr(),
    aktivno: true
  }] };

  function loadAndShow(){
    return Promise.all([
      getJSON('/api/glazba', { izvodjaci: [], raspored: [] }),
      getJSON('/api/cjenik', { kategorije: [] }),
      getJSON('/api/tekstovi', {}),
      getJSON('/api/oglasi', SEED_OGLASI)
    ]).then(function(res){
      state.glazba = { izvodjaci: res[0].izvodjaci || [], raspored: res[0].raspored || [] };
      state.cjenik = { kategorije: res[1].kategorije || [] };
      state.tekstovi = res[2] && typeof res[2] === 'object' ? res[2] : {};
      state.oglasi = { pozicije: (res[3] && res[3].pozicije) || [] };
      renderGigs();
      renderArtists();
      renderCjenik(-1);
      renderTexts();
      renderOglasi();
      showPanel();
      loginView.hidden = true;
      appView.hidden = false;
      setStatus('');
      saveBtn.disabled = true;
    });
  }

  var loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    var pass = document.getElementById('login-pass').value;
    var errEl = document.getElementById('login-err');
    errEl.hidden = true;
    sessionStorage.setItem('hedonistAdminKey', pass);
    api({ action: 'login' }).then(function(res){
      if (res.ok) return loadAndShow();
      sessionStorage.removeItem('hedonistAdminKey');
      errEl.hidden = false;
    }).catch(function(){
      errEl.textContent = 'Nema veze s poslužiteljem — pokušaj ponovno.';
      errEl.hidden = false;
    });
  });

  if (key()) {
    api({ action: 'login' }).then(function(res){
      if (res.ok) return loadAndShow();
      sessionStorage.removeItem('hedonistAdminKey');
      loginView.hidden = false;
    }).catch(function(){ loginView.hidden = false; });
  } else {
    loginView.hidden = false;
  }
})();
