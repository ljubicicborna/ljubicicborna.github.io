(function(){
  /* refresh always starts at the top — with CSS smooth scrolling the
     browser's scroll restoration animates down the page on reload,
     which reads as the page scrolling by itself */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---- provjera dobi: prikazuje se SAMO na cjenik.html (ne pri ulasku na
     naslovnicu) — tek kad posjetitelj otvori katalog s alkoholnim pićima,
     dok kolačići traže privolu svugdje, već pri ulasku na stranicu. "Ne" ne
     izbacuje posjetitelja s cjenika — upisuje '0' i dodaje .age-restricted
     na <html>, što CSS (styles.css) koristi da sakrije kategorije s
     alkoholom/duhanom u katalogu (assets/js/cjenik.js dodatno isključuje te
     kategorije i pokoju alkoholnu stavku izvan njih iz rezultata pretrage). ---- */
  (function ageGate(){
    if (!/\/cjenik(?:\.html)?$/.test(location.pathname)) return;
    var KEY = 'hedonistAgeVerified';
    var status = localStorage.getItem(KEY);
    if (status === '1') return;
    if (status === '0') { document.documentElement.classList.add('age-restricted'); return; }

    document.body.classList.add('age-gate-active');

    var gate = document.createElement('div');
    gate.className = 'age-gate';
    gate.setAttribute('role', 'alertdialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'age-gate-title');
    gate.innerHTML =
      '<div class="age-gate-card">' +
        '<img class="age-gate-mark" src="assets/images/monogram.png" alt="" aria-hidden="true" width="76" height="76">' +
        '<p class="age-gate-eyebrow"><span class="dot" aria-hidden="true"></span>Prije nego uđete</p>' +
        '<h2 class="age-gate-title" id="age-gate-title">Imate li 18 ili više godina?</h2>' +
        '<p class="age-gate-copy">Hedonist je bar koji toči alkoholna pića. Ako ste punoljetni, vidjet ćete cijelu ponudu; ako niste, alkohol i cigarete/cigare bit će skriveni iz kataloga.</p>' +
        '<div class="age-gate-actions">' +
          '<button type="button" class="btn btn-gold" data-age="yes">Da, imam 18 ili više godina</button>' +
          '<button type="button" class="btn btn-outline" data-age="no">Ne, nemam 18 godina</button>' +
        '</div>' +
        '<p class="age-gate-note">Pogledajte našu <a href="privatnost.html">politiku privatnosti</a>.</p>' +
      '</div>';
    document.body.appendChild(gate);
    requestAnimationFrame(function(){ gate.classList.add('is-visible'); });

    var yesBtn = gate.querySelector('[data-age="yes"]');
    if (yesBtn) yesBtn.focus();

    gate.addEventListener('click', function(e){
      var btn = e.target.closest('[data-age]');
      if (!btn) return;
      if (btn.getAttribute('data-age') === 'no') {
        localStorage.setItem(KEY, '0');
        document.documentElement.classList.add('age-restricted');
      } else {
        localStorage.setItem(KEY, '1');
      }
      gate.classList.remove('is-visible');
      document.body.classList.remove('age-gate-active');
      setTimeout(function(){ if (gate.parentNode) gate.parentNode.removeChild(gate); }, 350);
    });
  })();

  /* ---- kolačići: jedini kolačići na stranici dolaze od ugrađene Google
     karte na stranici Lokacija (njen iframe postavlja Googleove kolačiće).
     Banner traži privolu prije nego se ta karta učita; bez privole se
     prikazuje statična ilustracija karte, bez ijednog Googleovog zahtjeva.
     Nema analitike ni pratećih skripti. ---- */
  (function cookies(){
    var CONSENT_KEY = 'hedonistCookieConsent';

    /* ---- karta lokacije: ilustracija je default u HTML-u (radi bez
       ijednog Googleovog zahtjeva); tek uz privolu se zamijeni pravom
       interaktivnom Google kartom, jer njen iframe postavlja Googleove
       kolačiće. Povlačenjem privole iframe se ukloni iz DOM-a. ---- */
    var MAP_EMBED_URL = 'https://www.google.com/maps?q=Hedonist+bar+Osijek+Vukovarska+cesta+31&z=16&hl=hr&output=embed';

    function updateMaps(){
      var accepted = localStorage.getItem(CONSENT_KEY) === 'accepted';
      var statics = document.querySelectorAll('.map-static');
      for (var i = 0; i < statics.length; i++) {
        var link = statics[i];
        var embed = link.parentNode.querySelector('.map-embed');
        if (accepted) {
          if (!embed) {
            embed = document.createElement('div');
            embed.className = 'map-embed';
            var frame = document.createElement('iframe');
            frame.src = MAP_EMBED_URL;
            frame.title = 'Google karta — Hedonist bar, Vukovarska cesta 31, Osijek';
            frame.loading = 'lazy';
            frame.referrerPolicy = 'no-referrer-when-downgrade';
            frame.setAttribute('allowfullscreen', '');
            embed.appendChild(frame);
            link.parentNode.insertBefore(embed, link);
          }
          /* [hidden] ne bi nadjačao .map-static{display:block} */
          link.style.display = 'none';
        } else {
          if (embed) embed.parentNode.removeChild(embed);
          link.style.display = '';
        }
      }
    }

    var banner = null;

    function buildBanner(){
      if (banner) return banner;
      banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Postavke kolačića');
      banner.innerHTML =
        '<div class="cookie-card">' +
          '<span class="cookie-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r="1" fill="currentColor" stroke="none"/></svg></span>' +
          '<div class="cookie-body">' +
            '<p class="cookie-title">Kolačići</p>' +
            '<p class="cookie-text">Karta lokacije koristi Google Maps, koji postavlja svoje kolačiće. Prihvati da vidiš interaktivnu kartu ili nastavi bez nje — sve ostalo na stranici radi jednako. Detalji u <a href="privatnost.html" target="_blank" rel="noopener">politici privatnosti</a>.</p>' +
            '<div class="cookie-actions">' +
              '<button type="button" class="btn btn-gold" data-cookie="accept">Prihvaćam</button>' +
              '<button type="button" class="btn btn-outline" data-cookie="decline">Samo nužno</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(banner);
      banner.addEventListener('click', function(e){
        var btn = e.target.closest('[data-cookie]');
        if (!btn) return;
        var accepted = btn.getAttribute('data-cookie') === 'accept';
        localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined');
        hideBanner();
        updateMaps();
      });
      return banner;
    }

    function showBanner(){
      var b = buildBanner();
      requestAnimationFrame(function(){ b.classList.add('is-visible'); });
    }
    function hideBanner(){
      if (!banner) return;
      banner.classList.remove('is-visible');
    }

    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
      updateMaps();
    } else if (consent !== 'declined') {
      showBanner();
    }

    /* diskretan link u podnožju za promjenu odluke */
    var footerLinks = document.querySelector('.footer-links');
    if (footerLinks) {
      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'cookie-settings-link';
      link.textContent = 'Kolačići';
      link.addEventListener('click', showBanner);
      footerLinks.appendChild(link);
    }
  })();

  /* ---- marquee traka (naslovnica) ----
     STVARNI uzrok "trake koja se vrti ali stane pisati" / "krene
     dolaziti prazno": HTML nosi TOČNO dvije kopije sadržaja (~920px
     svaka), što je dovoljno za uski mobilni zaslon, ali na širokom
     desktop prozoru (npr. 1920px) dvije grupe zajedno (~1840px) NE
     pokrivaju cijelu vidljivu širinu -- traka klizne kroz kraj stvarnog
     sadržaja i otkrije prazninu prije nego se ciklus vrati na početak.
     Matematički zagarantirano na svakom dovoljno širokom prozoru, bez
     obzira na preglednik -- zato ga headless testiranje na uskim
     viewportima nikad nije uhvatilo.

     Rješenje: klonira prvu grupu koliko god puta treba da UKUPNA širina
     trake uvijek bude barem širina kontejnera + jedna širina grupe, na
     bilo kojoj širini prozora -- provjerava se i pri promjeni veličine
     prozora i svake sekunde (watchdog), pa čak ni naknadno maksimiziran
     ili prebačen na širi monitor prozor ne probije pokrivenost.

     I dalje "šteka" na slabijim mobitelima jer i sam ČIN pisanja
     style.transform 60x/sekundi s glavne niti sudjeluje u istoj utrci za
     glavnu nit kao touch-scroll -- nema mjerenja koje to popravi, jedini
     stvarni izlaz je maknuti pomak s glavne niti u potpunosti. Traka sad
     vozi pravu CSS @keyframes animaciju (assets/css/styles.css,
     .marquee-track), koju preglednikov compositor vrti sam za sebe, bez
     ijednog JS poziva po frameu -- JS ovdje samo klonira grupe za
     pokrivenost širine i upiše --marquee-w custom property (širinu jedne
     grupe u pikselima, cilj animacije). To vraća točno onu vrstu
     "zamrzavanja" koju je originalni rAF pristup izbjegavao (neki mobilni
     preglednici trajno pauziraju CSS infinite animaciju nakon što je tab
     bio u pozadini ili je traka dugo bila izvan ekrana, i sama se ne
     oporavlja) -- zato ispod postoji eksplicitan "restart" (ukloni pa
     odmah vrati animation, što silom pokrene iznova) okinut i na
     visibilitychange (povratak iz pozadine) i na IntersectionObserver
     (povratak u vidno polje nakon duljeg izbivanja). translateX (2D, ne
     translate3d) i bez will-change: transform u CSS-u -- izbjegava se
     forsiranje GPU compositing sloja koji je na nekim Windows/Chromium
     instalacijama gubio iscrtavanje teksta. ---- */
  (function marquee(){
    var container = document.querySelector('.marquee');
    var track = document.querySelector('.marquee-track');
    var firstGroup = track && track.querySelector('.marquee-group');
    if (!container || !track || !firstGroup) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function ensureCoverage(){
      var groupWidth = firstGroup.getBoundingClientRect().width;
      if (!groupWidth) return;
      var needed = container.getBoundingClientRect().width + groupWidth;
      var guard = 0;
      while (track.children.length * groupWidth < needed && guard < 30) {
        track.appendChild(firstGroup.cloneNode(true));
        guard++;
      }
      track.style.setProperty('--marquee-w', groupWidth + 'px');
    }

    function restart(){
      track.classList.add('marquee-restart');
      void track.offsetWidth; /* forsira reflow, tek onda uklanjanje ispod stvarno ponovno pokrene animaciju */
      track.classList.remove('marquee-restart');
    }

    ensureCoverage();
    window.addEventListener('resize', ensureCoverage);

    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) restart();
    });

    if ('IntersectionObserver' in window) {
      var wasVisible = true;
      new IntersectionObserver(function(entries){
        var isVisible = entries[0].isIntersecting;
        if (isVisible && !wasVisible) restart();
        wasVisible = isVisible;
      }).observe(container);
    }

    setInterval(ensureCoverage, 4000); /* watchdog: hvata širinu grupe ako se promijeni (font/slika kasno učitani) */
  })();

  /* ---- tajni pristup CMS-u: drži (7s) logo gore lijevo na naslovnoj
     da otvoriš /admin.html — nema vidljivog gumba za uređivanje na sajtu ---- */
  var navMark = document.querySelector('.nav-mark');
  if (navMark && navMark.getAttribute('href') === '#top') {
    var pressTimer = null;
    var longPressed = false;
    navMark.addEventListener('mousedown', function(){
      longPressed = false;
      pressTimer = setTimeout(function(){ longPressed = true; location.href = 'admin.html'; }, 7000);
    });
    navMark.addEventListener('touchstart', function(){
      longPressed = false;
      pressTimer = setTimeout(function(){ longPressed = true; location.href = 'admin.html'; }, 7000);
    }, { passive: true });
    ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(function(ev){
      navMark.addEventListener(ev, function(){ clearTimeout(pressTimer); });
    });
    navMark.addEventListener('click', function(e){
      if (longPressed) e.preventDefault();
    });
  }

  var nav = document.getElementById('site-nav');
  var toggle = document.getElementById('nav-toggle');
  if (toggle && nav) {
    var closeLabel = toggle.getAttribute('aria-label') === 'Otvori izbornik' ? 'Zatvori izbornik' : 'Close menu';
    var openLabel = toggle.getAttribute('aria-label');

    function setMenuOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? closeLabel : openLabel);
      if (open) document.body.classList.remove('nav-hidden');
    }

    toggle.addEventListener('click', function(){
      setMenuOpen(!nav.classList.contains('is-open'));
    });
    nav.querySelectorAll('.mobile-nav a').forEach(function(link){
      link.addEventListener('click', function(){
        setMenuOpen(false);
      });
    });
    nav.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenuOpen(false);
        toggle.focus();
      }
    });
  }

  /* ---- keep --nav-h in sync with the real header height, so anything
     that sticks below it (e.g. the price-list category bar) never
     guesses a stale pixel value ---- */
  if (nav) {
    function setNavHeightVar(){
      document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
    }
    setNavHeightVar();
    window.addEventListener('resize', setNavHeightVar);

    /* ---- hide header on scroll-down, reveal on scroll-up (mobile only,
       gated in CSS) — dead zone near the top so it never flickers ---- */
    var lastY = window.scrollY;
    var ticking = false;
    var DELTA = 8;

    function onScroll(){
      var y = window.scrollY;
      var diff = y - lastY;
      if (Math.abs(diff) > DELTA) {
        if (y <= nav.offsetHeight) {
          document.body.classList.remove('nav-hidden');
        } else if (diff > 0) {
          document.body.classList.add('nav-hidden');
        } else {
          document.body.classList.remove('nav-hidden');
        }
        lastY = y;
      }
      ticking = false;
    }

    window.addEventListener('scroll', function(){
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
  }

  document.querySelectorAll('.price-nav a').forEach(function(link){
    link.addEventListener('click', function(){
      var id = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target && target.tagName === 'DETAILS') target.open = true;
    });
  });
  if (location.hash) {
    var current = document.getElementById(location.hash.slice(1));
    if (current && current.tagName === 'DETAILS') current.open = true;
  }

  /* ---- live "open now / closed" status, computed from real hours ---- */
  var statusEl = document.getElementById('live-status');
  if (statusEl) {
    var HOURS = {
      0: { open: 480, close: 1380 },  // Ned 8–23
      1: { open: 420, close: 1380 },  // Pon 7–23
      2: { open: 420, close: 1380 },  // Uto 7–23
      3: { open: 420, close: 1380 },  // Sri 7–23
      4: { open: 420, close: 1440 },  // Čet 7–0
      5: { open: 420, close: 1440 },  // Pet 7–0
      6: { open: 480, close: 1440 }   // Sub 8–0
    };
    var DAY_NAMES = ['nedjelju', 'ponedjeljak', 'utorak', 'srijedu', 'četvrtak', 'petak', 'subotu'];

    function formatMinutes(min) {
      if (min % 1440 === 0) return 'ponoć';
      var h = Math.floor(min / 60) % 24, m = min % 60;
      return m === 0 ? h + 'h' : h + ':' + (m < 10 ? '0' + m : m) + 'h';
    }

    function renderStatus() {
      var now = new Date();
      var day = now.getDay();
      var minutes = now.getHours() * 60 + now.getMinutes();
      var today = HOURS[day];
      var isOpen = today && minutes >= today.open && minutes < today.close;
      var label, detail;

      if (isOpen) {
        detail = 'zatvaramo u ' + formatMinutes(today.close);
        label = 'Otvoreno sada';
      } else {
        var nextDay = day, nextOpen, when;
        if (today && minutes < today.open) {
          nextOpen = today.open; when = 'danas';
        } else {
          for (var i = 1; i <= 7; i++) {
            var d = (day + i) % 7;
            if (HOURS[d]) { nextDay = d; nextOpen = HOURS[d].open; when = i === 1 ? 'sutra' : ('u ' + DAY_NAMES[d]); break; }
          }
        }
        detail = 'otvaramo ' + when + ' u ' + formatMinutes(nextOpen);
        label = 'Zatvoreno';
      }

      statusEl.classList.toggle('is-open', !!isOpen);
      statusEl.innerHTML = '<span class="live-status-dot" aria-hidden="true"></span><span>' + label + ' <strong>· ' + detail + '</strong></span>';
    }

    renderStatus();
    setInterval(renderStatus, 60000);

    /* ---- highlight today's row in the hours list ---- */
    var todayNum = new Date().getDay();
    document.querySelectorAll('.hours-list > div[data-days]').forEach(function(row){
      var days = row.getAttribute('data-days').split(',').map(Number);
      if (days.indexOf(todayNum) !== -1) row.classList.add('is-today');
    });
  }

  /* ---- prijelaz među stranicama: zavjesa s monogramom prekrije ekran
     prije odlaska, a nova stranica se otvori već pokrivena pa se
     zavjesa digne — klasično "bijelo učitavanje" se nikad ne vidi ---- */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var veil = document.createElement('div');
  veil.className = 'page-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<img src="assets/images/monogram.png" alt="" width="76" height="76">';
  document.body.appendChild(veil);

  if (sessionStorage.getItem('veil') === '1') {
    sessionStorage.removeItem('veil');
    if (!reducedMotion) {
      document.body.classList.add('veil-out');
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          document.body.classList.add('veil-leave');
          setTimeout(function(){ document.body.classList.remove('veil-out', 'veil-leave'); }, 650);
        });
      });
    }
  }

  document.addEventListener('click', function(e){
    if (reducedMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    var url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return; /* sidrenje unutar stranice */
    e.preventDefault();
    sessionStorage.setItem('veil', '1');
    document.body.classList.add('veil-in');
    setTimeout(function(){ location.href = link.href; }, 430);
  }, true);

  window.addEventListener('pageshow', function(ev){
    if (ev.persisted) document.body.classList.remove('veil-in', 'veil-out', 'veil-leave');
  });

  document.querySelectorAll('.philosophy, .menu, .daytime, .home-gigs, .atmosphere, .visit, .reserve').forEach(function(el){
    el.classList.add('will-reveal');
  });

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- animated counters ---- */
  function setupCounters(){
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    if (prefersReduced || !('IntersectionObserver' in window)) {
      /* no JS-driven animation in this branch anyway -- HTML already
         shows the real (reserve or fetched) number at rest, so there's
         nothing to do here now */
    } else {
      var countObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count-to'), 10);
          el.textContent = '0';
          var start = performance.now();
          var duration = 1400;
          function tick(now){
            var progress = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          countObserver.unobserve(el);
        });
      }, { threshold: 0.5 });
      counters.forEach(function(el){ countObserver.observe(el); });
    }
  }
  }

  /* ---- brojač stavki: broj je statičan u HTML-u (data-count-to), pa ga
     samo animiramo ---- */
  setupCounters();

  /* ---- atmosphere carousel dots (mobile swipe indicator) ---- */
  var gallery = document.querySelector('.atmosphere-gallery');
  var dots = document.querySelectorAll('.atmosphere-dot');
  if (gallery && dots.length && 'IntersectionObserver' in window) {
    var galleryImages = gallery.querySelectorAll('img');
    var dotObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        var index = Array.prototype.indexOf.call(galleryImages, entry.target);
        if (index === -1) return;
        dots.forEach(function(d){ d.classList.remove('is-active'); });
        if (dots[index]) dots[index].classList.add('is-active');
      });
    }, { root: gallery, threshold: 0.6 });
    galleryImages.forEach(function(img){ dotObserver.observe(img); });
  }

  /* ---- atmosphere galerija: klik na fotku otvara je uvećano (ne
     preko cijelog zaslona, samo znatno veće) -- isti vizualni stil kao
     lightbox na /galerija.html (.gallery-lightbox u styles.css). ---- */
  (function atmosphereLightbox(){
    var overlay = document.getElementById('atmosphere-lightbox');
    if (!overlay || !gallery) return;
    var lbImg = overlay.querySelector('.gallery-lightbox-img');
    var lbClose = overlay.querySelector('.gallery-lightbox-close');
    var lastFocused = null;

    function open(img){
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || '';
      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('gallery-lightbox-open');
      lbClose.focus();
    }

    function close(){
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('gallery-lightbox-open');
      lbImg.src = '';
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    gallery.querySelectorAll('img').forEach(function(img){
      img.style.cursor = 'pointer';
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Otvori fotografiju uvećano');
      img.addEventListener('click', function(){ open(img); });
      img.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    lbClose.addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !overlay.hidden) close();
    });
  })();

  if (prefersReduced || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.will-reveal').forEach(function(el){ el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.will-reveal').forEach(function(el){ observer.observe(el); });
})();
