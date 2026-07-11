/* =====================================================================
   ADMIN — logika uređivanja programa (/admin.html)
   Podaci se čitaju s /api/glazba, a spremaju preko /api/admin
   (lozinka se šalje u headeru x-admin-key).
===================================================================== */
(function(){
  var API = '/api/admin';
  var state = null;      /* { izvodjaci: [], raspored: [] } */
  var dirty = false;

  var loginView = document.getElementById('login-view');
  var appView = document.getElementById('app-view');
  var gigsEl = document.getElementById('gigs');
  var artistsEl = document.getElementById('artists');
  var saveBtn = document.getElementById('save');
  var statusEl = document.getElementById('save-status');

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

  function markDirty(){
    dirty = true;
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

  /* ================= RASPORED ================= */
  /* NAPOMENA: raspored se namjerno NE sortira dok se uređuje — red ne smije
     skočiti na drugo mjesto usred upisivanja. Server ga sortira pri spremanju. */
  function renderGigs(){
    var today = todayStr();
    gigsEl.innerHTML = state.raspored.map(function(r, i){
      var isPast = r.datum && r.datum < today;
      var options = state.izvodjaci.map(function(a){
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
    var r = state.raspored[Number(row.getAttribute('data-i'))];
    r[e.target.getAttribute('data-f')] = e.target.value;
    markDirty();
  });
  gigsEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del]');
    if (!del) return;
    state.raspored.splice(Number(del.getAttribute('data-del')), 1);
    markDirty();
    renderGigs();
  });
  document.getElementById('add-gig').addEventListener('click', function(){
    if (!state.izvodjaci.length) { alert('Prvo dodaj barem jednog izvođača.'); return; }
    state.raspored.push({ datum: todayStr(), vrijeme: '21:00', izvodjac: state.izvodjaci[0].id });
    markDirty();
    renderGigs();
    var rows = gigsEl.querySelectorAll('.gig-row');
    if (rows.length) rows[rows.length - 1].scrollIntoView({ block: 'center' });
  });

  /* ================= IZVOĐAČI ================= */
  var TIPOVI = ['DJ', 'Akustika', 'Bend', 'Ostalo'];

  function fotoHTML(a){
    if (a.foto) return '<img class="artist-foto" src="' + esc(a.foto) + '" alt="">';
    return '<span class="artist-foto-ph">' + esc(initials(a.ime)) + '</span>';
  }

  function renderArtists(){
    artistsEl.innerHTML = state.izvodjaci.map(function(a, i){
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
    var a = state.izvodjaci[Number(card.getAttribute('data-i'))];
    a[e.target.getAttribute('data-f')] = e.target.value;
    markDirty();
  });

  artistsEl.addEventListener('click', function(e){
    var del = e.target.closest('[data-del-artist]');
    if (!del) return;
    var i = Number(del.getAttribute('data-del-artist'));
    var a = state.izvodjaci[i];
    var used = state.raspored.some(function(r){ return r.izvodjac === a.id; });
    if (used) { alert('"' + a.ime + '" ima svirke u rasporedu — prvo ih obriši, pa onda izvođača.'); return; }
    if (!confirm('Obrisati izvođača "' + a.ime + '"?')) return;
    if (/\.public\.blob\.vercel-storage\.com\/cms\/foto\//.test(a.foto || '')) {
      api({ action: 'delete-foto', url: a.foto }); /* čišćenje u pozadini */
    }
    state.izvodjaci.splice(i, 1);
    markDirty();
    renderArtists();
    renderGigs();
  });

  document.getElementById('add-artist').addEventListener('click', function(){
    state.izvodjaci.push({ id: 'izv-' + Date.now(), ime: '', tip: 'DJ', zanr: '', opis: '', foto: '', instagram: '' });
    markDirty();
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
    var a = state.izvodjaci[i];
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
        markDirty();
      }).catch(function(){
        slot.style.opacity = '';
        alert('Slanje slike nije uspjelo — provjeri internet pa pokušaj ponovno.');
      });
    };
    img.onerror = function(){ slot.style.opacity = ''; alert('Ovu sliku nije moguće otvoriti.'); };
    img.src = URL.createObjectURL(file);
    input.value = '';
  });

  /* ================= SPREMANJE ================= */
  saveBtn.addEventListener('click', function(){
    var bezImena = state.izvodjaci.filter(function(a){ return !String(a.ime).trim(); });
    if (bezImena.length) { alert('Svaki izvođač mora imati ime.'); return; }
    saveBtn.disabled = true;
    setStatus('Spremam…');
    api({ action: 'save', data: state }).then(function(res){
      if (res.ok) {
        dirty = false;
        setStatus('Spremljeno ✓ (na stranici vidljivo unutar pola minute)', 'is-ok');
      } else {
        saveBtn.disabled = false;
        setStatus(res.data.error || 'Greška pri spremanju.', 'is-err');
      }
    }).catch(function(){
      saveBtn.disabled = false;
      setStatus('Nema veze s poslužiteljem — pokušaj ponovno.', 'is-err');
    });
  });

  window.addEventListener('beforeunload', function(e){
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= TABOVI, PRIJAVA, START ================= */
  document.querySelectorAll('.tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('is-active', b === btn); });
      document.getElementById('tab-raspored').hidden = btn.getAttribute('data-tab') !== 'raspored';
      document.getElementById('tab-izvodjaci').hidden = btn.getAttribute('data-tab') !== 'izvodjaci';
    });
  });

  document.getElementById('logout').addEventListener('click', function(){
    if (dirty && !confirm('Imaš nespremljene promjene — svejedno se odjaviti?')) return;
    dirty = false;
    sessionStorage.removeItem('hedonistAdminKey');
    location.reload();
  });

  function loadAndShow(){
    return fetch('/api/glazba?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .then(function(data){
        state = { izvodjaci: data.izvodjaci || [], raspored: data.raspored || [] };
        renderGigs();
        renderArtists();
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
