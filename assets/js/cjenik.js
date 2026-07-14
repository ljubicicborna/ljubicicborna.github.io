/* =====================================================================
   CJENIK — prikaz i interakcije
   ---------------------------------------------------------------------
   Cijene se uređuju na admin stranici (/admin.html); ova skripta ih
   dohvaća s /api/cjenik i izgradi popis. Statični HTML u cjenik.html
   ostaje kao rezerva ako API ne radi.
===================================================================== */
(function(){
  var sectionInner = document.querySelector('.price-categories .section-inner');
  var navInner = document.querySelector('.price-nav-inner');
  if (!sectionInner) return;

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ---- izgradnja popisa iz CMS podataka ---- */
  function build(data){
    if (navInner) {
      navInner.innerHTML = data.kategorije.map(function(c){
        return '<a href="#' + esc(c.id) + '">' + esc(c.naziv) + '</a>';
      }).join('');
      /* klik na pilulu mora otvoriti kategoriju (main.js je to vezao na
         stare linkove koji su upravo zamijenjeni) */
      navInner.querySelectorAll('a').forEach(function(link){
        link.addEventListener('click', function(){
          var target = document.getElementById(link.getAttribute('href').slice(1));
          if (target && target.tagName === 'DETAILS') target.open = true;
        });
      });
    }
    sectionInner.innerHTML = data.kategorije.map(function(c, i){
      return '<details class="price-category" id="' + esc(c.id) + '"' + (i === 0 ? ' open' : '') + '>' +
        '<summary><span class="price-category-title">' + esc(c.naziv) + '</span>' +
        '<svg class="price-category-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></summary>' +
        '<div class="price-category-body">' +
        c.grupe.map(function(g){
          return '<div class="price-group">' +
            (g.naziv ? '<h3 class="price-group-title">' + esc(g.naziv) + '</h3>' : '') +
            '<div class="price-items"' + (g.ikona ? ' data-icon="' + esc(g.ikona) + '"' : '') + '>' +
            g.stavke.map(function(s){
              return '<div class="price-item"><div class="price-item-name"><strong>' + esc(s.naziv) + '</strong>' +
                (s.opis ? '<em>' + esc(s.opis) + '</em>' : '') +
                '</div><div class="price-item-price is-locked" data-price="' + esc(s.cijena) + '">Vidljivo na našoj lokaciji</div></div>';
            }).join('') +
            '</div></div>';
        }).join('') +
        '</div></details>';
    }).join('');
    if (location.hash) {
      var current = document.getElementById(location.hash.slice(1));
      if (current && current.tagName === 'DETAILS') current.open = true;
    }

    /* ---- Menu structured data za tražilice (samo naslovi kategorija —
       stavke se ne ponavljaju ovdje da JSON ne naraste na stotine redaka).
       Cijene se namjerno ne stavljaju ovdje: vidljive su samo posjetiteljima
       na lokaciji, pa bi ih tražilice inače indeksirale kao "cloaking"
       (sadržaj koji bot vidi, a korisnik ne). ---- */
    var oldLd = document.getElementById('ld-menu');
    if (oldLd) oldLd.remove();
    if (data.kategorije.length) {
      var ld = {
        '@context': 'https://schema.org',
        '@type': 'Menu',
        name: 'Cjenik — Hedonist Bar Osijek',
        url: 'https://hedonist-bar.vercel.app/cjenik.html',
        hasMenuSection: data.kategorije.map(function(c){
          return {
            '@type': 'MenuSection',
            name: c.naziv,
            hasMenuItem: c.grupe.reduce(function(items, g){
              return items.concat(g.stavke.map(function(s){
                return { '@type': 'MenuItem', name: s.naziv };
              }));
            }, [])
          };
        })
      };
      var ldScript = document.createElement('script');
      ldScript.type = 'application/ld+json';
      ldScript.id = 'ld-menu';
      ldScript.textContent = JSON.stringify(ld);
      document.head.appendChild(ldScript);
    }
  }

  /* ---- interakcije nad trenutnim DOM-om (CMS ili statična rezerva) ---- */
  function enhance(){
    var categories = document.querySelectorAll('.price-category');
    var navLinks = document.querySelectorAll('.price-nav-inner a');
    if (!categories.length) return;

    /* svaka stavka sa sastojcima postaje klikabilni red s detaljem */
    document.querySelectorAll('.price-item').forEach(function(item){
      var em = item.querySelector('.price-item-name em');
      var nameEl = item.querySelector('.price-item-name');
      var priceEl = item.querySelector('.price-item-price');
      if (!nameEl || !priceEl) return;

      var row = document.createElement('div');
      row.className = 'price-item-row';
      item.appendChild(row);
      row.appendChild(nameEl);
      row.appendChild(priceEl);

      if (!em) return;

      item.classList.add('has-detail');
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-expanded', 'false');

      var raw = em.textContent.trim();
      var note = '';
      var dashMatch = raw.match(/^(.*?)\s+[—-]\s+(.*)$/);
      if (dashMatch) { note = dashMatch[1]; raw = dashMatch[2]; }
      var parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);

      var wrap = document.createElement('div');
      wrap.className = 'price-item-detail-wrap';
      var inner = document.createElement('div');
      inner.className = 'price-item-detail-inner';
      var detail = document.createElement('div');
      detail.className = 'price-item-detail';

      var icon = document.createElement('span');
      icon.className = 'price-item-detail-icon';
      icon.setAttribute('aria-hidden', 'true');
      detail.appendChild(icon);

      var content = document.createElement('div');
      if (note) {
        var noteEl = document.createElement('p');
        noteEl.className = 'price-item-note';
        noteEl.textContent = note;
        content.appendChild(noteEl);
      }
      var list = document.createElement('ul');
      list.className = 'price-item-ingredients';
      parts.forEach(function(p){
        var li = document.createElement('li');
        li.textContent = p;
        list.appendChild(li);
      });
      content.appendChild(list);
      detail.appendChild(content);

      inner.appendChild(detail);
      wrap.appendChild(inner);
      item.appendChild(wrap);

      function toggle(){
        var open = item.classList.toggle('is-open');
        row.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    /* blaga animacija pri svakom otvaranju kategorije */
    categories.forEach(function(details){
      details.addEventListener('toggle', function(){
        if (!details.open) return;
        var body = details.querySelector('.price-category-body');
        if (!body) return;
        body.classList.remove('just-opened');
        void body.offsetWidth;
        body.classList.add('just-opened');
      });
    });

    /* scrollspy: istakni aktivnu pilulu u ljepljivoj navigaciji */
    if ('IntersectionObserver' in window && navLinks.length) {
      var linkByHash = {};
      navLinks.forEach(function(a){ linkByHash[a.getAttribute('href')] = a; });

      var nav = document.querySelector('.price-nav-inner');

      function scrollPillIntoView(link){
        if (!nav) return;
        var linkLeft = link.offsetLeft;
        var linkRight = linkLeft + link.offsetWidth;
        var viewLeft = nav.scrollLeft;
        var viewRight = viewLeft + nav.clientWidth;
        if (linkLeft < viewLeft) {
          nav.scrollTo({ left: linkLeft - 16, behavior: 'smooth' });
        } else if (linkRight > viewRight) {
          nav.scrollTo({ left: linkRight - nav.clientWidth + 16, behavior: 'smooth' });
        }
      }

      var spy = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          var link = linkByHash['#' + entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function(a){ a.classList.remove('is-active'); });
            link.classList.add('is-active');
            scrollPillIntoView(link);
          }
        });
      }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });

      categories.forEach(function(details){ spy.observe(details); });
    }
  }

  /* ---- cijene vidljive samo na lokaciji ----
     Popis pića i sastojaka ostaje vidljiv svima; sami brojevi cijena se
     otključavaju tek kad geolokacija potvrdi da je posjetitelj unutar
     ~200 m od Hedonista (Vukovarska cesta 31). Stanje se pamti samo za
     trenutnu karticu preglednika (sessionStorage), ne trajno. ---- */
  var BAR_LAT = 45.5552976;
  var BAR_LON = 18.6948989;
  var UNLOCK_RADIUS_M = 200;
  var UNLOCK_KEY = 'hedonistPricesUnlocked';

  function distanceMeters(lat1, lon1, lat2, lon2){
    var R = 6371000;
    var toRad = function(d){ return d * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function revealPrices(){
    document.querySelectorAll('.price-item-price.is-locked').forEach(function(el){
      el.textContent = el.getAttribute('data-price') + '€';
      el.classList.remove('is-locked');
    });
    var lock = document.getElementById('price-lock');
    var btn = document.getElementById('price-lock-btn');
    var text = document.getElementById('price-lock-text');
    if (lock) lock.classList.add('is-unlocked');
    if (btn) btn.classList.add('price-lock-btn-hidden');
    if (text) text.innerHTML = '<span class="price-lock-icon" aria-hidden="true">✓</span>Cijene su otključane — u Hedonistu ste.';
  }

  function applyLockState(){
    if (sessionStorage.getItem(UNLOCK_KEY) === '1') revealPrices();
  }

  function wireLockButton(){
    var btn = document.getElementById('price-lock-btn');
    var text = document.getElementById('price-lock-text');
    if (!btn) return;
    btn.addEventListener('click', function(){
      if (!('geolocation' in navigator)) {
        if (text) text.textContent = 'Preglednik ne podržava provjeru lokacije.';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Provjeravam…';
      navigator.geolocation.getCurrentPosition(function(pos){
        var d = distanceMeters(pos.coords.latitude, pos.coords.longitude, BAR_LAT, BAR_LON);
        if (d <= UNLOCK_RADIUS_M) {
          sessionStorage.setItem(UNLOCK_KEY, '1');
          revealPrices();
        } else {
          btn.disabled = false;
          btn.textContent = 'Provjeri jesam li na lokaciji';
          if (text) text.innerHTML = '<span class="price-lock-icon" aria-hidden="true">🔒</span>Cijene su vidljive samo u Hedonistu — nisi na lokaciji.';
        }
      }, function(){
        btn.disabled = false;
        btn.textContent = 'Provjeri jesam li na lokaciji';
        if (text) text.innerHTML = '<span class="price-lock-icon" aria-hidden="true">🔒</span>Nismo uspjeli dohvatiti lokaciju — provjeri dopuštenje u pregledniku.';
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    });
  }

  wireLockButton();

  fetch('/api/cjenik')
    .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
    .then(function(data){
      if (data && Array.isArray(data.kategorije) && data.kategorije.length) build(data);
      enhance();
      applyLockState();
    })
    .catch(function(){ enhance(); applyLockState(); });
})();
