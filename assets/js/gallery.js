/* =====================================================================
   Galerija (galerija.html) — mreža pločica, svaka krije 2 fotke u
   okomitoj vrpci (.gallery-tile-strip) iza overflow:hidden okvira.
   Svaka pločica posebno, pri SVAKOJ izmjeni, nasumično bira sljedeću
   fotku (kod parova to je uvijek ta druga, ali kod duljih vrpci bi bio
   nasumičan izbor) i pomiče vrpcu na nju. Ritam (4.4 s drži, 0.6 s
   klizi ≈ 5 s ciklus) je isti za sve pločice — samo je taj ritam ono
   što drži prizor "skladnim" dok se svaka pločica giba neovisno i u
   svom vlastitom trenutku. ---- */
(function(){
  var strips = document.querySelectorAll('.gallery-tile-strip');
  if (!strips.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var HOLD_MS = 4400;
  var SLIDE_MS = 600;

  strips.forEach(function(strip){
    var frames = strip.children.length;
    if (frames < 2) return;
    var current = 0;

    function tick(){
      var next;
      do { next = Math.floor(Math.random() * frames); } while (next === current);
      current = next;
      strip.style.transform = 'translateY(-' + (current * 100 / frames) + '%)';
      setTimeout(tick, HOLD_MS + SLIDE_MS);
    }

    setTimeout(tick, Math.random() * HOLD_MS);
  });
})();
