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

  /* video s kavom se ne vrti u krug: krene 8 s prije kraja, odsvira do
     zadnjeg kadra (gotov latte art) i tu ostane kao fotografija —
     loop atributa u HTML-u više nema, pa "ended" jednostavno stane */
  var video = section.querySelector('video.daynight-pane-media');
  if (video) {
    var TAIL_SECONDS = 8;
    var seekToTail = function(){
      if (isFinite(video.duration) && video.duration > TAIL_SECONDS) {
        try { video.currentTime = video.duration - TAIL_SECONDS; } catch (e) {}
      }
    };
    if (video.readyState >= 1) seekToTail();
    else video.addEventListener('loadedmetadata', seekToTail, { once: true });
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
