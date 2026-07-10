(function(){
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
      1: null,                        // Pon zatvoreno
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
  }

  document.querySelectorAll('.philosophy, .menu, .daytime, .atmosphere, .visit, .reserve').forEach(function(el){
    el.classList.add('will-reveal');
  });

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- animated counters ---- */
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    if (prefersReduced || !('IntersectionObserver' in window)) {
      counters.forEach(function(el){ el.textContent = el.getAttribute('data-count-to'); });
    } else {
      var countObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseInt(el.getAttribute('data-count-to'), 10);
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
