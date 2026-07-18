(function(){
  /* refresh always starts at the top — with CSS smooth scrolling the
     browser's scroll restoration animates down the page on reload,
     which reads as the page scrolling by itself */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---- kolačići: banner traži privolu prije nego se učita Google Analytics.
     Vercel Analytics (script tag u <head>) je bez kolačića pa radi uvijek;
     GA4 se učita tek nakon "Prihvaćam", i samo ako je GA_MEASUREMENT_ID
     postavljen na Vercelu (vidi /api/ga.js) — dok nije, gumb i dalje radi,
     samo se ništa ne učita. ---- */
  (function cookies(){
    var CONSENT_KEY = 'hedonistCookieConsent';

    function t(key, fallback){ return window.HedonistI18n ? window.HedonistI18n.t(key, fallback) : fallback; }

    function loadGA(){
      fetch('/api/ga').then(function(r){ return r.json(); }).then(function(d){
        if (!d.id || document.getElementById('ga4-script')) return;
        var s = document.createElement('script');
        s.id = 'ga4-script';
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(d.id);
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', d.id, { anonymize_ip: true });
      }).catch(function(){ /* GA nije kritičan */ });
    }

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

    /* prijevodi za banner dohvaćaju se tek kod (ponovnog) iscrtavanja, ne
       jednom pri učitavanju skripte, jer se jezik može promijeniti nakon
       što je banner već izgrađen (vidi hedonist:langchange niže) */
    function bannerStrings(){
      return {
        title: t('cookie.title', 'Kolačići'),
        textHtml: t('cookie.text_html', 'Koristimo analitičke kolačiće da vidimo koje stranice ljudi posjećuju — ništa se ne dijeli s oglašivačima. Možeš prihvatiti ili nastaviti bez njih. Detalji u <a href="privatnost.html" target="_blank" rel="noopener">politici privatnosti</a>.'),
        accept: t('cookie.accept', 'Prihvaćam'),
        decline: t('cookie.decline', 'Samo nužno'),
        ariaLabel: t('cookie.aria_label', 'Postavke kolačića')
      };
    }

    function buildBanner(){
      if (banner) return banner;
      var s = bannerStrings();
      banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', s.ariaLabel);
      banner.innerHTML =
        '<div class="cookie-card">' +
          '<span class="cookie-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r="1" fill="currentColor" stroke="none"/></svg></span>' +
          '<div class="cookie-body">' +
            '<p class="cookie-title">' + s.title + '</p>' +
            '<p class="cookie-text">' + s.textHtml + '</p>' +
            '<div class="cookie-actions">' +
              '<button type="button" class="btn btn-gold" data-cookie="accept">' + s.accept + '</button>' +
              '<button type="button" class="btn btn-outline" data-cookie="decline">' + s.decline + '</button>' +
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
        if (accepted) loadGA();
        updateMaps();
      });
      return banner;
    }

    function refreshBannerText(){
      if (!banner) return;
      var s = bannerStrings();
      banner.setAttribute('aria-label', s.ariaLabel);
      banner.querySelector('.cookie-title').textContent = s.title;
      banner.querySelector('.cookie-text').innerHTML = s.textHtml;
      banner.querySelector('[data-cookie="accept"]').textContent = s.accept;
      banner.querySelector('[data-cookie="decline"]').textContent = s.decline;
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
      loadGA();
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
      link.textContent = t('cookie.title', 'Kolačići');
      link.addEventListener('click', showBanner);
      footerLinks.appendChild(link);
    }

    document.addEventListener('hedonist:langchange', function(){
      refreshBannerText();
      var settingsLink = document.querySelector('.cookie-settings-link');
      if (settingsLink) settingsLink.textContent = t('cookie.title', 'Kolačići');
    });
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

  /* ---- CMS tekstovi: elementi s data-cms="ključ" dobiju sadržaj
     uređen na /admin.html; polja su {hr,en,de} (ili plain string za staru
     rezervu), pa se biraju po trenutnom jeziku i ponovno iscrtaju kad se
     jezik promijeni. Ako API ne radi, ostaje tekst iz HTML-a.
     renderCms se uvijek vješa na ISTI fetch-promise (ne na varijablu koju
     jedan poziv slučajno postavi) — ako korisnik promijeni jezik prije nego
     što je prvi fetch stigao, taj klik ipak čeka na podatke i ispravno ih
     iscrta čim stignu, umjesto da ostane "zaglavljen" na hrvatskom dok se
     ne dogodi neki idući, nepovezan render. ---- */
  var cmsEls = document.querySelectorAll('[data-cms]');
  if (cmsEls.length) {
    var tekstoviPromise = fetch('/api/tekstovi')
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .catch(function(){ return null; /* rezerva: statični tekst */ });
    var renderCms = function(){
      tekstoviPromise.then(function(t){
        if (!t) return;
        var pick = window.HedonistI18n ? window.HedonistI18n.pick : function(f){ return typeof f === 'string' ? f : ''; };
        cmsEls.forEach(function(el){
          var v = pick(t[el.getAttribute('data-cms')]);
          if (v) el.textContent = v;
        });
      });
    };
    renderCms();
    document.addEventListener('hedonist:langchange', renderCms);
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

  /* ---- prije animacije, dohvati stvarni broj stavki iz cjenika (ako
     brojač postoji na stranici) — u HTML-u ostaje rezervni broj dok API
     ne odgovori, pa se brojač nikad ne "zaglavi" na 0 ---- */
  var menuCounter = document.querySelector('.menu-counter-num');
  var cjenikLinkCount = document.querySelector('.cjenik-link-count');
  if (menuCounter) {
    fetch('/api/cjenik').then(function(r){ if (!r.ok) throw 0; return r.json(); }).then(function(data){
      var total = (data.kategorije || []).reduce(function(sum, c){
        return sum + (c.grupe || []).reduce(function(s, g){ return s + (g.stavke ? g.stavke.length : 0); }, 0);
      }, 0);
      if (total > 0) {
        menuCounter.setAttribute('data-count-to', total);
        if (cjenikLinkCount) cjenikLinkCount.textContent = 'Kave, kokteli, pivo, vino i žestica — ' + total + ' stavki';
      }
    }).catch(function(){ /* ostaje rezervni broj iz HTML-a */ }).then(setupCounters);
  } else {
    setupCounters();
  }

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
