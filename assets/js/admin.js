/* =====================================================================
   ADMIN — uređivanje sadržaja (/admin.html)
   Birač stranice gore odlučuje što se uređuje:
   - Slike        → all images (upload + metadata)
   - Nazivi       → page titles, headings, nav text
   - Cjenik       → kategorije/grupe/stavke, katalog bez cijena (+ uvodni tekst)
   - Početna      → glavni tekstovi + događaji (sekcija "Novosti")
   - Zapošljavanje→ tekstovi + oglasi za posao
   Sve se čita s /api/cjenik, /api/tekstovi, /api/oglasi, /api/dogadjaji,
   /api/slike, /api/nazivi, a sprema preko /api/admin (lozinka u headeru x-admin-key).
===================================================================== */
(function(){
  var API = '/api/admin';
  var IMAGE_UPLOAD_API = '/api/image-upload';

  var state = { cjenik: null, tekstovi: null, oglasi: null, dogadjaji: null, slike: null, nazivi: null };
  var dirty = { cjenik: false, tekstovi: false, oglasi: false, dogadjaji: false, slike: false, nazivi: false };

  var loginView = document.getElementById('login-view');
  var appView = document.getElementById('app-view');
  var catsEl = document.getElementById('cjenik-cats');
  var oglasiEl = document.getElementById('oglasi');
  var dogadjajiEl = document.getElementById('dogadjaji');
  var slikeEl = document.getElementById('slike');
  var saveBtn = document.getElementById('save');
  var statusEl = document.getElementById('save-status');

  /* koje tekst-polje pripada kojoj stranici: [ključ, oznaka, vrsta polja] */
  var TEKST_POLJA = {
    nazivi: [
      ['index.title', 'Naslov početne stranice', 'input'],
      ['index.meta-desc', 'Opis početne stranice (SEO)', 'textarea'],
      ['cjenik.title', 'Naslov cjenik stranice', 'input'],
      ['cjenik.meta-desc', 'Opis cjenik stranice (SEO)', 'textarea'],
      ['zaposlenje.title', 'Naslov zapošljavanje stranice', 'input'],
      ['zaposlenje.meta-desc', 'Opis zapošljavanje stranice (SEO)', 'textarea'],
      ['lokacija.title', 'Naslov lokacija stranice', 'input'],
      ['nav.zaposlenje', 'Tekst — Zapošljavanje (nav)', 'input'],
      ['nav.lokacija', 'Tekst — Lokacija (nav)', 'input']
    ],
    cjenik: [
      ['cjenik.uvod', 'Uvodni tekst na vrhu stranice', 'textarea']
    ],
    pocetna: [
      ['pocetna.filozofija-citat', 'Citat (sekcija Misija – vizija)', 'input'],
      ['pocetna.filozofija', 'Tekst — Misija – vizija', 'textarea'],
      ['pocetna.cjenik-napomena', 'Tekst — Cjenik', 'textarea'],
      ['pocetna.podanu', 'Tekst — Po danu', 'textarea'],
      ['pocetna.atmosfera', 'Tekst — Atmosfera', 'textarea']
    ],
    zaposlenje: [
      ['zaposlenje.uvod', 'Uvodni tekst na vrhu stranice', 'textarea'],
      ['zaposlenje.napomena', 'Napomena ispod obrasca', 'textarea']
    ]
  };

  var PAGE_URLS = { cjenik: '/cjenik.html', pocetna: '/', zaposlenje: '/zaposlenje.html' };

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

  function anyDirty(){ return dirty.cjenik || dirty.tekstovi || dirty.oglasi || dirty.dogadjaji || dirty.slike || dirty.nazivi; }

  function markDirty(vrsta){
    dirty[vrsta] = true;
    saveBtn.disabled = false;
    setStatus('Imaš nespremljene promjene', 'is-dirty');
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ================= VIŠEJEZIČNA POLJA (HR / EN / DE) =================
     Svako prevedivo polje (naziv, opis, tekst) čuva se kao { hr, en, de }.
     toLangObj normalizira stari plain-string oblik (rezerva) u taj obrazac. */
  var LANGS = ['hr', 'en', 'de'];
  var LANG_LABELS = { hr: 'HR', en: 'EN', de: 'DE' };
  function toLangObj(v){
    if (v && typeof v === 'object') return { hr: v.hr || '', en: v.en || '', de: v.de || '' };
    return { hr: v || '', en: '', de: '' };
  }
  function langHr(v){
    if (v && typeof v === 'object') return v.hr || '';
    return v || '';
  }
  /* iscrtaj HR/EN/DE retke za jedno polje; tag je 'input' ili 'textarea' */
  function langFieldHtml(obj, tag, dataAttr, extra){
    obj = toLangObj(obj);
    return '<div class="lang-field">' + LANGS.map(function(l){
      var val = esc(obj[l]);
      var ph = l === 'hr' ? '' : ' placeholder="(nije prevedeno — ostaje HR na stranici)"';
      var field = tag === 'textarea'
        ? '<textarea ' + dataAttr + ' data-lang="' + l + '"' + ph + (extra||'') + '>' + val + '</textarea>'
        : '<input ' + dataAttr + ' data-lang="' + l + '" value="' + val + '"' + ph + (extra||'') + '>';
      return '<div class="lang-row"><span class="lang-tag">' + LANG_LABELS[l] + '</span>' + field + '</div>';
    }).join('') + '</div>';
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
    ['slike', 'nazivi', 'cjenik', 'pocetna', 'zaposlenje'].forEach(function(p){
      document.getElementById('panel-' + p).hidden = p !== page;
    });
    viewLink.href = PAGE_URLS[page] || '/';
  }
  pagePick.addEventListener('change', showPanel);

  /* ================= TEKSTOVI ================= */
  function renderTexts(){
    document.querySelectorAll('.text-fields').forEach(function(box){
      var page = box.getAttribute('data-texts');
      var store = state[PAGE_TO_STORE[page] || 'tekstovi'];
      box.innerHTML = TEKST_POLJA[page].map(function(f){
        var field = langFieldHtml(store[f[0]], f[2], 'data-tkey="' + f[0] + '"');
        return '<div class="field"><label>' + esc(f[1]) + '</label>' + field + '</div>';
      }).join('');
    });
  }
  /* svi "text-fields" paneli (nazivi/cjenik/pocetna/zaposlenje) spremaju se
     preko dva stvarna CMS spremišta: nazivi ide u state.nazivi, sve ostalo
     (cjenik.uvod, pocetna.*, zaposlenje.*) ide u state.tekstovi */
  var PAGE_TO_STORE = { nazivi: 'nazivi', cjenik: 'tekstovi', pocetna: 'tekstovi', zaposlenje: 'tekstovi' };
  document.addEventListener('input', function(e){
    var k = e.target.getAttribute && e.target.getAttribute('data-tkey');
    if (!k) return;
    var lang = e.target.getAttribute('data-lang') || 'hr';
    var target = e.target.closest('[data-texts]');
    var page = target ? target.getAttribute('data-texts') : 'tekstovi';
    var store = PAGE_TO_STORE[page] || 'tekstovi';
    state[store][k] = toLangObj(state[store][k]);
    state[store][k][lang] = e.target.value;
    markDirty(store);
  });

  /* ================= SLIKE ================= */
  function renderSlike(){
    slikeEl.innerHTML = state.slike.slike.map(function(s, i){
      return '<article class="slika-card" data-i="' + i + '">' +
        '<div class="field-grid">' +
          '<div class="field field-wide"><label>ID slike</label><input data-f="id" value="' + esc(s.id) + '" placeholder="npr. hero-index"></div>' +
          '<div class="field field-wide"><label>URL (spremi sliku gore, ili zalijepi Blob URL)</label><input data-f="url" value="' + esc(s.url) + '" placeholder="https://..."></div>' +
          '<div class="field field-wide"><label>Alt tekst</label><input data-f="alt" value="' + esc(s.alt) + '" placeholder="Opis slike"></div>' +
          '<div class="field field-wide"><label>Stranica</label><input data-f="stranica" value="' + esc(s.stranica) + '" placeholder="npr. index, cjenik"></div>' +
        '</div>' +
        (s.url ? '<div class="slika-preview"><img src="' + esc(s.url) + '?w=200" alt="' + esc(s.alt) + '" style="max-width:100%;height:auto;"></div>' : '') +
        '<button type="button" class="artist-del" data-del-slika="' + i + '">Obriši sliku</button>' +
      '</article>';
    }).join('') || '<p class="hint">Nema slika — dodaj prvu gumbom ispod.</p>';
  }

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  document.getElementById('add-slika').addEventListener('click', function(){
    fileInput.value = '';
    fileInput.onchange = function(){
      if (!fileInput.files[0]) return;
      var file = fileInput.files[0];
      var reader = new FileReader();
      reader.onload = function(e){
        var formData = new FormData();
        formData.append('file', file);
        fetch(IMAGE_UPLOAD_API, {
          method: 'POST',
          headers: { 'x-admin-key': key(), 'x-filename': 'img-' + Date.now() + '-' + file.name },
          body: e.target.result
        }).then(function(r){ if (!r.ok) throw new Error('upload'); return r.json(); })
          .then(function(res){
            state.slike.slike.push({ id: 'img-' + Date.now(), url: res.url, alt: '', stranica: '' });
            markDirty('slike');
            renderSlike();
            var cards = slikeEl.querySelectorAll('.slika-card');
            if (cards.length) {
              cards[cards.length - 1].scrollIntoView({ block: 'center' });
              var first = cards[cards.length - 1].querySelector('input[data-f="id"]');
              if (first) first.focus();
            }
          })
          .catch(function(){ alert('Upload neuspješan'); });
      };
      reader.readAsArrayBuffer(file);
    };
    fileInput.click();
  });

  slikeEl.addEventListener('input', function(e){
    var card = e.target.closest('.slika-card');
    var f = e.target.getAttribute && e.target.getAttribute('data-f');
    if (!card || !f) return;
    var s = state.slike.slike[Number(card.getAttribute('data-i'))];
    s[f] = e.target.value;
    markDirty('slike');
    if (f === 'url') renderSlike();
  });

  slikeEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-slika]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-slika'));
    if (!confirm('Obrisati sliku "' + (state.slike.slike[i].id || 'bez ID-a') + '"?')) return;
    state.slike.slike.splice(i, 1);
    markDirty('slike');
    renderSlike();
  });

  /* ================= NAZIVI STRANICA ================= */
  /* renderTexts() already handles nazivi via data-texts="nazivi" */

  /* ================= ZAPOŠLJAVANJE: OGLASI ================= */
  var VRSTE_OGLASA = ['Stalno', 'Studentski'];

  function renderOglasi(){
    oglasiEl.innerHTML = state.oglasi.pozicije.map(function(p, i){
      var vrstaOpts = VRSTE_OGLASA.map(function(t){
        return '<option' + (t === p.vrsta ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
      return '<article class="oglas-card' + (p.aktivno ? '' : ' is-inactive') + '" data-i="' + i + '">' +
        '<div class="field-grid">' +
          '<div class="field field-wide"><label>Naslov</label>' + langFieldHtml(p.naslov, 'input', 'data-f="naslov"', ' placeholder="npr. Tražimo konobara/icu — studentski posao"') + '</div>' +
          '<div class="field"><label>Vrsta</label><select data-f="vrsta">' + vrstaOpts + '</select></div>' +
          '<div class="field"><label>Satnica (€/h, nije obavezno)</label><input data-f="satnica" value="' + esc(p.satnica) + '" placeholder="7,50"></div>' +
          '<div class="field field-wide"><label>Opis</label>' + langFieldHtml(p.opis, 'textarea', 'data-f="opis"') + '</div>' +
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
    if (f === 'naslov' || f === 'opis') {
      var lang = e.target.getAttribute('data-lang') || 'hr';
      p[f] = toLangObj(p[f]);
      p[f][lang] = e.target.value;
    } else {
      p[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    }
    if (f === 'aktivno') card.classList.toggle('is-inactive', !p.aktivno);
    markDirty('oglasi');
  });

  oglasiEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-oglas]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-oglas'));
    if (!confirm('Obrisati oglas "' + (langHr(state.oglasi.pozicije[i].naslov) || 'bez naslova') + '"?')) return;
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

  /* ================= POČETNA: DOGAĐAJI (sekcija "Novosti") ================= */
  function renderDogadjaji(){
    dogadjajiEl.innerHTML = state.dogadjaji.dogadjaji.map(function(d, i){
      return '<article class="oglas-card' + (d.aktivno ? '' : ' is-inactive') + '" data-i="' + i + '">' +
        '<div class="field-grid">' +
          '<div class="field"><label>Dan</label><input data-f="dan" value="' + esc(d.dan) + '" placeholder="npr. Petak"></div>' +
          '<div class="field"><label>Naziv</label>' + langFieldHtml(d.naziv, 'input', 'data-f="naziv"', ' placeholder="npr. Music Night"') + '</div>' +
          '<div class="field field-wide"><label>Opis (podnaslov)</label>' + langFieldHtml(d.opis, 'input', 'data-f="opis"', ' placeholder="npr. Ex-Yu glazba cijelu večer"') + '</div>' +
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
    if (f === 'naziv' || f === 'opis') {
      var lang = e.target.getAttribute('data-lang') || 'hr';
      d[f] = toLangObj(d[f]);
      d[f][lang] = e.target.value;
    } else {
      d[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    }
    if (f === 'aktivno') card.classList.toggle('is-inactive', !d.aktivno);
    markDirty('dogadjaji');
  });

  dogadjajiEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-dogadjaj]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-dogadjaj'));
    if (!confirm('Obrisati događaj "' + (langHr(state.dogadjaji.dogadjaji[i].naziv) || 'bez naziva') + '"?')) return;
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
            langFieldHtml(s.naziv, 'input', 'data-if="naziv"', ' placeholder="Naziv pića"') +
            langFieldHtml(s.opis, 'input', 'data-if="opis"', ' placeholder="Sastojci / napomena (nije obavezno)"') +
            '<button type="button" class="row-x itm-del" aria-label="Obriši stavku">✕</button>' +
          '</div>';
        }).join('');
        return '<div class="grp" data-g="' + gi + '">' +
          '<div class="grp-head">' +
            langFieldHtml(g.naziv, 'input', 'data-gf="naziv"', ' placeholder="Naziv grupe (npr. Kave)"') +
            '<select data-gf="ikona">' + ikonaOpts + '</select>' +
            '<button type="button" class="row-x grp-del" aria-label="Obriši grupu">✕</button>' +
          '</div>' +
          '<div class="itms">' + items + '</div>' +
          '<button type="button" class="btn-mini itm-add">+ stavka</button>' +
        '</div>';
      }).join('');
      var cNaziv = toLangObj(c.naziv);
      return '<details class="cat" data-c="' + ci + '"' + (ci === openIndex ? ' open' : '') + '>' +
        '<summary><span class="cat-sum-name">' + esc(cNaziv.hr || 'Nova kategorija') + '</span>' +
        '<span class="cat-sum-count">' + catCount(c) + '</span></summary>' +
        '<div class="cat-body">' +
          '<div class="field"><label>Naziv kategorije</label>' + langFieldHtml(c.naziv, 'input', 'data-cf="naziv"') + '</div>' +
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
    var lang = t.getAttribute('data-lang') || 'hr';
    if (t.hasAttribute('data-cf')) {
      ctx.c.naziv = toLangObj(ctx.c.naziv);
      ctx.c.naziv[lang] = t.value;
      if (lang === 'hr') ctx.catEl.querySelector('.cat-sum-name').textContent = t.value || 'Nova kategorija';
    } else if (t.hasAttribute('data-gf')) {
      var gf = t.getAttribute('data-gf');
      if (gf === 'ikona') {
        ctx.c.grupe[ctx.gi].ikona = t.value;
      } else {
        ctx.c.grupe[ctx.gi][gf] = toLangObj(ctx.c.grupe[ctx.gi][gf]);
        ctx.c.grupe[ctx.gi][gf][lang] = t.value;
      }
    } else if (t.hasAttribute('data-if')) {
      var iff = t.getAttribute('data-if');
      var stavka = ctx.c.grupe[ctx.gi].stavke[ctx.si];
      stavka[iff] = toLangObj(stavka[iff]);
      stavka[iff][lang] = t.value;
    } else {
      return;
    }
    markDirty('cjenik');
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
      ctx2.c.grupe[ctx2.gi].stavke.push({ naziv: '', opis: '' });
      markDirty('cjenik');
      renderCjenik(ctx2.ci);
      var grp = catsEl.querySelector('.cat[data-c="' + ctx2.ci + '"] .grp[data-g="' + ctx2.gi + '"]');
      var last = grp && grp.querySelector('.itm:last-child input[data-if="naziv"]');
      if (last) { last.focus(); last.scrollIntoView({ block: 'center' }); }
    } else if (t.closest('.grp-del')) {
      var ctx3 = cjenikCtx(t);
      var g = ctx3.c.grupe[ctx3.gi];
      if (g.stavke.length && !confirm('Obrisati grupu "' + (langHr(g.naziv) || 'bez naziva') + '" i njenih ' + g.stavke.length + ' stavki?')) return;
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
      if (!confirm('Obrisati kategoriju "' + (langHr(ctx5.c.naziv) || 'bez naziva') + '"' + (total ? ' i njenih ' + total + ' stavki' : '') + '?')) return;
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
    if (dirty.slike && state.slike.slike.some(function(s){ return !String(s.id).trim() || !String(s.url).trim(); })) {
      return 'Svaka slika mora imati ID i URL.';
    }
    if (dirty.oglasi && state.oglasi.pozicije.some(function(p){ return !langHr(p.naslov).trim(); })) {
      return 'Svaki oglas mora imati naslov (barem na hrvatskom).';
    }
    if (dirty.dogadjaji && state.dogadjaji.dogadjaji.some(function(d){ return !langHr(d.naziv).trim(); })) {
      return 'Svaki događaj mora imati naziv (barem na hrvatskom).';
    }
    if (dirty.cjenik) {
      for (var i = 0; i < state.cjenik.kategorije.length; i++) {
        var c = state.cjenik.kategorije[i];
        if (!langHr(c.naziv).trim()) return 'Svaka kategorija cjenika mora imati naziv (barem na hrvatskom).';
        for (var j = 0; j < c.grupe.length; j++) {
          for (var k = 0; k < c.grupe[j].stavke.length; k++) {
            var s = c.grupe[j].stavke[k];
            if (!langHr(s.naziv).trim()) return 'U kategoriji "' + langHr(c.naziv) + '" postoji stavka bez naziva (barem na hrvatskom).';
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
    if (dirty.slike) queue.push('slike');
    if (dirty.nazivi) queue.push('nazivi');
    if (dirty.cjenik) queue.push('cjenik');
    if (dirty.tekstovi) queue.push('tekstovi');
    if (dirty.oglasi) queue.push('oglasi');
    if (dirty.dogadjaji) queue.push('dogadjaji');
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

  /* ================= PRIJAVA, START ================= */
  document.getElementById('logout').addEventListener('click', function(){
    if (anyDirty() && !confirm('Imaš nespremljene promjene — svejedno se odjaviti?')) return;
    dirty = { cjenik: false, tekstovi: false, oglasi: false, dogadjaji: false, slike: false, nazivi: false };
    sessionStorage.removeItem('hedonistAdminKey');
    location.reload();
  });

  function getJSON(url, fallback){
    return fetch(url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .catch(function(){ return fallback; });
  }

  /* dok vlasnik ne otvori i ne spremi barem jednom, admin prikazuje ova dva
     unaprijed upisana predloška (stalno i studentski) — oba su isključena
     (aktivno: false) dok se stvarno ne otvara pozicija, pa se ništa od
     ovoga ne prikazuje na stranici dok vlasnik sam ne uključi prekidač
     "Aktivno" na onome koji odgovara i ne klikne "Spremi promjene" */
  var SEED_OGLASI = { pozicije: [
    {
      id: 'oglas-seed-stalno',
      naslov: 'Tražimo konobara/icu — stalno zaposlenje',
      vrsta: 'Stalno',
      satnica: '',
      opis: 'Tražimo pouzdanu i nasmijanu osobu za rad na šanku i terasi, na stalno radno vrijeme. Prijašnje iskustvo je plus, ali nije nužno.',
      datum: todayStr(),
      aktivno: false
    },
    {
      id: 'oglas-seed-student',
      naslov: 'Tražimo konobara/icu — studentski posao',
      vrsta: 'Studentski',
      satnica: '7,50',
      opis: 'Tražimo pouzdanu i nasmijanu osobu za rad na šanku i terasi, uglavnom navečer i vikendom. Prijašnje iskustvo je plus, ali nije nužno.',
      datum: todayStr(),
      aktivno: false
    }
  ] };

  /* dok vlasnik ne otvori i ne spremi barem jednom, admin prikazuje ove
     unaprijed upisane događaje — jedan klik na "Spremi promjene" ih stavi u CMS */
  var SEED_DOGADJAJI = { dogadjaji: [
    { id: 'dogadjaj-seed-petak', dan: 'Petak', naziv: 'Music Night', opis: 'Ex-Yu glazba cijelu večer', aktivno: true },
    { id: 'dogadjaj-seed-subota', dan: 'Subota', naziv: 'Party Night', opis: 'House zvuk do kasno u noć', aktivno: true }
  ] };

  var SEED_SLIKE = { slike: [] };
  var SEED_NAZIVI = {};

  function loadAndShow(){
    return Promise.all([
      getJSON('/api/slike', SEED_SLIKE),
      getJSON('/api/nazivi', SEED_NAZIVI),
      getJSON('/api/cjenik', { kategorije: [] }),
      getJSON('/api/tekstovi', {}),
      getJSON('/api/oglasi', SEED_OGLASI),
      getJSON('/api/dogadjaji', SEED_DOGADJAJI)
    ]).then(function(res){
      state.slike = res[0] && res[0].slike ? res[0] : SEED_SLIKE;
      state.nazivi = res[1] && typeof res[1] === 'object' ? res[1] : SEED_NAZIVI;
      state.cjenik = { kategorije: res[2].kategorije || [] };
      state.tekstovi = res[3] && typeof res[3] === 'object' ? res[3] : {};
      state.oglasi = { pozicije: (res[4] && res[4].pozicije) || [] };
      state.dogadjaji = { dogadjaji: (res[5] && res[5].dogadjaji) || [] };
      renderSlike();
      renderTexts();
      renderCjenik(-1);
      renderOglasi();
      renderDogadjaji();
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
