/* =====================================================================
   Dan / noć prekidač (početna, sekcija #dan) — sav vizualni prijelaz
   (fotografije, panel s tekstom, položaj klizača) vodi se preko jednog
   [data-mode] atributa na sekciji (vidi styles.css). Ova skripta:
   - postavi početno stanje prema zapamćenom odabiru (localStorage),
     inače prema stvarnom lokalnom vremenu (7–19 h = dan). To MORA biti
     ovdje, u vanjskoj datoteci: produkcijski CSP (vercel.json) nema
     'unsafe-inline' za skripte, pa se inline <script> u HTML-u na
     produkciji uopće ne izvrši — lokalno radi, live šuti. Sekcija je
     duboko ispod prvog ekrana, pa izvršavanje na kraju body-ja stigne
     davno prije nego što je posjetitelj može vidjeti.
   - drži aria-atribute u skladu s [data-mode],
   - omogući prebacivanje klikom, povlačenjem/swipeom i tipkovnicom.
===================================================================== */
(function(){
  var section = document.getElementById('dan');
  if (!section || !section.classList.contains('daytime')) return;

  var buttons = section.querySelectorAll('.daynight-btn');
  var panes = section.querySelectorAll('.daynight-pane');
  var track = section.querySelector('.daynight-track');
  var STORAGE_KEY = 'hedonistDayNight';

  /* video s kavom sada odigra cijeli isječak (27 s) od početka i stane
     na zadnjem kadru (gotov latte art) -- loop atributa u HTML-u nema,
     pa "ended" jednostavno stane tu.

     Dvije stvari su namjerno ODBAČENE nakon mjerenja na produkciji, ne
     samo lokalno:
     1) video.currentTime = duration - 8 postavljen nakon 'loadedmetadata'
        (skoči na rep umjesto reproduciranja od početka) -- Chromium je
        zbog toga povlačio ~12MB za 2.6MB fajl (višestruko preklopljeni
        Range zahtjevi) i video bi na kraju ostao zaustavljen
        NEreproduciran (play() nakon 'seeked' se pouzdano ne bi dogodio
        pod stvarnim mrežnim uvjetima).
     2) HTML5 Media Fragment u URL-u (#t=19.25) kao "native" alternativa
        istom cilju -- radilo je na Chromiumu, ali WebKit na TOČNO ovom
        fajlu baci 'error' i play() odbije s "The operation is not
        supported" ČIM je fragment prisutan u src-u; bez fragmenta isti
        video na WebKitu radi besprijekorno. Potvrđeno izoliranim testom
        (isti URL, s i bez #t=), nije nagađanje.
     Obično igranje od početka je jedina varijanta koja je i pouzdana na
     oba enginea I mrežno jeftinija od obje "pametnije" varijante (nema
     seeka, nema preklapajućih zahtjeva -- preglednik samo linearno
     strimira naprijed).

     <source> ipak nosi samo data-src (preload="none", video ostaje na
     poster slici) dok sekcija stvarno ne uđe u viewport -- tek tada se
     src postavi i video.load() pokrene, pa se mrežna cijena plaća
     najviše jednom, i samo za posjetitelje koji tu sekciju stvarno
     vide (prije ove izmjene taj fetch je krenuo NA SVAKOM posjetu
     početnoj, bez obzira je li se ikad doguralo scrollom dovde). */
  var video = section.querySelector('video.daynight-pane-media');
  if (video) {
    function loadVideo(){
      var source = video.querySelector('source[data-src]');
      if (!source) return;
      source.src = source.getAttribute('data-src');
      source.removeAttribute('data-src');
      video.load();
      video.play().catch(function(){});
    }
    if ('IntersectionObserver' in window) {
      var videoObserver = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (!entry.isIntersecting) return;
          loadVideo();
          videoObserver.disconnect();
        });
      }, { rootMargin: '200px 0px' });
      videoObserver.observe(section);
    } else {
      loadVideo();
    }
  }

  function applyAria(mode){
    buttons.forEach(function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
    /* panes reuse aria-pressed too, but to mean "this is the dominant
       (wide/bright) one" -- the CSS keys its dim/desaturate rule off the
       same attribute so JS only has to set it once here */
    panes.forEach(function(p){
      p.setAttribute('aria-pressed', p.getAttribute('data-pane') === mode ? 'true' : 'false');
    });
    if (track) track.setAttribute('aria-checked', mode === 'night' ? 'true' : 'false');
  }

  function setMode(mode){
    section.setAttribute('data-mode', mode);
    applyAria(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (e) { /* privatno pregledavanje i sl. */ }
  }

  /* početno stanje: zapamćeni odabir ako postoji, inače po satu */
  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  var hour = new Date().getHours();
  var initial = (saved === 'day' || saved === 'night') ? saved : ((hour >= 7 && hour < 19) ? 'day' : 'night');
  section.setAttribute('data-mode', initial);
  applyAria(initial);

  buttons.forEach(function(b){
    b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode')); });
  });
  panes.forEach(function(p){
    p.addEventListener('click', function(){ setMode(p.getAttribute('data-pane')); });
  });

  if (!track) return;

  var dragging = false, startX = 0, moved = false;

  function pointerX(e){ return e.touches ? e.touches[0].clientX : e.clientX; }

  function onMove(e){
    if (!dragging) return;
    if (Math.abs(pointerX(e) - startX) > 8) moved = true;
  }
  function onUp(e){
    if (!dragging) return;
    dragging = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchend', onUp);
    var endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var dx = endX - startX;
    if (!moved) {
      setMode(section.getAttribute('data-mode') === 'day' ? 'night' : 'day');
      return;
    }
    setMode(dx > 0 ? 'night' : 'day');
  }
  function onDown(e){
    /* bez ovoga: touchstart prekine se, ali preglednik nakon podignutog
       prsta ipak simulira mousedown/mouseup/click na isti track — onUp
       se tada odradi DVA puta za jedan dodir i prekidač se prebaci pa
       smjesta vrati natrag, pa dodir izgleda kao da ništa ne radi */
    if (e.cancelable) e.preventDefault();
    dragging = true; moved = false; startX = pointerX(e);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  track.addEventListener('mousedown', onDown);
  track.addEventListener('touchstart', onDown, { passive: false });

  track.addEventListener('keydown', function(e){
    if (e.key === 'ArrowLeft') setMode('day');
    else if (e.key === 'ArrowRight') setMode('night');
    else if (e.key === ' ' || e.key === 'Enter') setMode(section.getAttribute('data-mode') === 'day' ? 'night' : 'day');
    else return;
    e.preventDefault();
  });
})();
